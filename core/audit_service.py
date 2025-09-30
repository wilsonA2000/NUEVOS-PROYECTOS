"""
Servicio avanzado de auditoría para VeriHome.
Se integra con los modelos existentes y proporciona funcionalidades adicionales.
"""

import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Count, Q, F
from django.utils import timezone
from django.conf import settings
import json
import uuid

from .models import ActivityLog, SystemAlert, SystemMetrics
from users.models import UserActivityLog, AdminActionLog, AdminImpersonationSession
from users.services import AdminActionLogger

User = get_user_model()
logger = logging.getLogger('verihome.audit')


class AuditService:
    """Servicio centralizado de auditoría para VeriHome."""
    
    def __init__(self):
        self.admin_logger = AdminActionLogger()
    
    def log_user_activity(
        self,
        user: User,
        action_type: str,
        description: str,
        target_object: Optional[Any] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = '',
        session_key: Optional[str] = '',
        success: bool = True,
        error_message: str = ''
    ) -> ActivityLog:
        """
        Registra actividad de usuario en el sistema de auditoría.
        
        Args:
            user: Usuario que realiza la acción
            action_type: Tipo de acción (create, update, delete, etc.)
            description: Descripción de la acción
            target_object: Objeto afectado por la acción
            details: Detalles adicionales de la acción
            ip_address: Dirección IP del usuario
            user_agent: User agent del navegador
            session_key: Clave de sesión
            success: Si la acción fue exitosa
            error_message: Mensaje de error si la acción falló
        
        Returns:
            Instancia de ActivityLog creada
        """
        try:
            # Obtener ContentType si hay objeto target
            content_type = None
            object_id = None
            
            if target_object:
                content_type = ContentType.objects.get_for_model(target_object)
                object_id = str(target_object.pk)
            
            # Crear registro de actividad principal
            activity_log = ActivityLog.objects.create(
                user=user,
                action_type=action_type,
                description=description,
                details=details or {},
                content_type=content_type,
                object_id=object_id,
                ip_address=ip_address,
                user_agent=user_agent,
                session_key=session_key,
                success=success,
                error_message=error_message
            )
            
            # Crear registro específico de usuario también
            UserActivityLog.objects.create(
                user=user,
                activity_type=action_type,
                description=description,
                metadata={
                    **(details or {}),
                    'activity_log_id': str(activity_log.id),
                    'target_object_type': content_type.model if content_type else None,
                    'target_object_id': object_id,
                    'success': success,
                    'error_message': error_message
                },
                ip_address=ip_address,
                user_agent=user_agent[:255] if user_agent else ''
            )
            
            # Log estructurado
            logger.info(
                f"User activity logged: {action_type}",
                extra={
                    'user_id': str(user.id),
                    'action_type': action_type,
                    'description': description,
                    'target_object': f"{content_type.model}:{object_id}" if content_type else None,
                    'success': success,
                    'ip_address': ip_address
                }
            )
            
            # Actualizar métricas
            self._update_activity_metrics(action_type, success)
            
            return activity_log
            
        except Exception as e:
            logger.error(
                f"Failed to log user activity: {str(e)}",
                extra={
                    'user_id': str(user.id),
                    'action_type': action_type,
                    'error': str(e)
                }
            )
            raise
    
    def log_bulk_activities(
        self,
        activities: List[Dict[str, Any]],
        session_id: Optional[str] = None
    ) -> List[ActivityLog]:
        """
        Registra múltiples actividades en lote desde el frontend.
        
        Args:
            activities: Lista de actividades a registrar
            session_id: ID de sesión del frontend
        
        Returns:
            Lista de ActivityLog creados
        """
        created_logs = []
        
        with transaction.atomic():
            for activity_data in activities:
                try:
                    # Extraer datos del log del frontend
                    user_id = activity_data.get('userId')
                    if not user_id:
                        continue
                    
                    user = User.objects.get(id=user_id)
                    
                    activity_log = self.log_user_activity(
                        user=user,
                        action_type=activity_data.get('category', 'ui'),
                        description=activity_data.get('message', ''),
                        details={
                            'frontend_log_id': activity_data.get('id'),
                            'level': activity_data.get('level'),
                            'category': activity_data.get('category'),
                            'component': activity_data.get('component'),
                            'session_id': session_id,
                            'url': activity_data.get('url'),
                            'metadata': activity_data.get('metadata', {}),
                            'details': activity_data.get('details', {})
                        },
                        ip_address=activity_data.get('metadata', {}).get('ip_address'),
                        user_agent=activity_data.get('userAgent', ''),
                        success=activity_data.get('details', {}).get('success', True)
                    )
                    
                    created_logs.append(activity_log)
                    
                except Exception as e:
                    logger.error(f"Failed to process bulk activity: {str(e)}")
                    continue
        
        logger.info(f"Processed {len(created_logs)} bulk activities from frontend")
        return created_logs
    
    def create_system_alert(
        self,
        title: str,
        description: str,
        level: str = 'info',
        category: str = 'system',
        metadata: Optional[Dict[str, Any]] = None,
        auto_resolve_after: Optional[timedelta] = None
    ) -> SystemAlert:
        """
        Crea una alerta del sistema.
        
        Args:
            title: Título de la alerta
            description: Descripción detallada
            level: Nivel de severidad (info, warning, error, critical)
            category: Categoría (security, performance, business, system)
            metadata: Metadatos adicionales
            auto_resolve_after: Tiempo después del cual se resuelve automáticamente
        
        Returns:
            Instancia de SystemAlert creada
        """
        alert = SystemAlert.objects.create(
            title=title,
            description=description,
            level=level,
            category=category,
            metadata=metadata or {},
            auto_resolve_at=timezone.now() + auto_resolve_after if auto_resolve_after else None
        )
        
        logger.warning(
            f"System alert created: {title}",
            extra={
                'alert_id': str(alert.id),
                'level': level,
                'category': category,
                'metadata': metadata
            }
        )
        
        return alert
    
    def analyze_security_events(
        self,
        time_period: timedelta = timedelta(hours=24)
    ) -> Dict[str, Any]:
        """
        Analiza eventos de seguridad en un período de tiempo.
        
        Args:
            time_period: Período de tiempo a analizar
        
        Returns:
            Dict con análisis de seguridad
        """
        cutoff_time = timezone.now() - time_period
        
        # Intentos de login fallidos
        failed_logins = ActivityLog.objects.filter(
            timestamp__gte=cutoff_time,
            action_type='login',
            success=False
        ).values('ip_address').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Actividades sospechosas por IP
        suspicious_ips = ActivityLog.objects.filter(
            timestamp__gte=cutoff_time,
            success=False
        ).values('ip_address').annotate(
            failed_count=Count('id')
        ).filter(failed_count__gte=5)
        
        # Accesos de diferentes ubicaciones para el mismo usuario
        user_locations = ActivityLog.objects.filter(
            timestamp__gte=cutoff_time,
            user__isnull=False
        ).values('user_id', 'ip_address').distinct().count()
        
        # Sesiones de impersonación activas
        active_impersonations = AdminImpersonationSession.objects.filter(
            is_active=True,
            started_at__gte=cutoff_time
        ).count()
        
        # Alertas de seguridad recientes
        security_alerts = SystemAlert.objects.filter(
            created_at__gte=cutoff_time,
            category='security',
            is_resolved=False
        ).count()
        
        analysis = {
            'period_hours': time_period.total_seconds() / 3600,
            'failed_logins': {
                'total': sum(item['count'] for item in failed_logins),
                'by_ip': list(failed_logins[:10])
            },
            'suspicious_ips': list(suspicious_ips),
            'user_location_changes': user_locations,
            'active_impersonations': active_impersonations,
            'security_alerts': security_alerts,
            'risk_score': self._calculate_risk_score(
                len(suspicious_ips),
                sum(item['count'] for item in failed_logins),
                active_impersonations,
                security_alerts
            )
        }
        
        logger.info(
            f"Security analysis completed",
            extra={
                'analysis': analysis,
                'period_hours': analysis['period_hours']
            }
        )
        
        return analysis
    
    def get_user_activity_summary(
        self,
        user: User,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Obtiene resumen de actividad de un usuario.
        
        Args:
            user: Usuario a analizar
            days: Número de días hacia atrás
        
        Returns:
            Dict con resumen de actividad
        """
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Actividades por tipo
        activities_by_type = ActivityLog.objects.filter(
            user=user,
            timestamp__gte=cutoff_date
        ).values('action_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Actividades por día
        activities_by_day = ActivityLog.objects.filter(
            user=user,
            timestamp__gte=cutoff_date
        ).extra(
            select={'day': 'date(timestamp)'}
        ).values('day').annotate(
            count=Count('id')
        ).order_by('day')
        
        # Actividades fallidas
        failed_activities = ActivityLog.objects.filter(
            user=user,
            timestamp__gte=cutoff_date,
            success=False
        ).count()
        
        # IPs utilizadas
        ips_used = ActivityLog.objects.filter(
            user=user,
            timestamp__gte=cutoff_date
        ).values_list('ip_address', flat=True).distinct().count()
        
        # Actividades de admin (si las hay)
        admin_activities = UserActivityLog.objects.filter(
            user=user,
            timestamp__gte=cutoff_date,
            metadata__performed_by_admin=True
        ).count()
        
        summary = {
            'user_id': str(user.id),
            'period_days': days,
            'total_activities': sum(item['count'] for item in activities_by_type),
            'activities_by_type': list(activities_by_type),
            'activities_by_day': list(activities_by_day),
            'failed_activities': failed_activities,
            'unique_ips': ips_used,
            'admin_activities': admin_activities,
            'most_active_day': max(activities_by_day, key=lambda x: x['count'])['day'] if activities_by_day else None
        }
        
        return summary
    
    def generate_audit_report(
        self,
        start_date: datetime,
        end_date: datetime,
        include_sections: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Genera un reporte completo de auditoría.
        
        Args:
            start_date: Fecha de inicio del reporte
            end_date: Fecha de fin del reporte
            include_sections: Secciones a incluir en el reporte
        
        Returns:
            Dict con el reporte completo
        """
        if include_sections is None:
            include_sections = [
                'general_stats', 'user_activities', 'admin_actions',
                'security_events', 'system_alerts', 'performance_metrics'
            ]
        
        report = {
            'report_id': str(uuid.uuid4()),
            'generated_at': timezone.now().isoformat(),
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': (end_date - start_date).days
            },
            'sections': {}
        }
        
        # Estadísticas generales
        if 'general_stats' in include_sections:
            report['sections']['general_stats'] = self._get_general_stats(start_date, end_date)
        
        # Actividades de usuarios
        if 'user_activities' in include_sections:
            report['sections']['user_activities'] = self._get_user_activities_stats(start_date, end_date)
        
        # Acciones de administrador
        if 'admin_actions' in include_sections:
            report['sections']['admin_actions'] = self._get_admin_actions_stats(start_date, end_date)
        
        # Eventos de seguridad
        if 'security_events' in include_sections:
            report['sections']['security_events'] = self._get_security_events_stats(start_date, end_date)
        
        # Alertas del sistema
        if 'system_alerts' in include_sections:
            report['sections']['system_alerts'] = self._get_system_alerts_stats(start_date, end_date)
        
        # Métricas de rendimiento
        if 'performance_metrics' in include_sections:
            report['sections']['performance_metrics'] = self._get_performance_stats(start_date, end_date)
        
        logger.info(
            f"Audit report generated",
            extra={
                'report_id': report['report_id'],
                'period_days': report['period']['days'],
                'sections': include_sections
            }
        )
        
        return report
    
    def cleanup_old_logs(
        self,
        retention_days: int = 90,
        dry_run: bool = False
    ) -> Dict[str, int]:
        """
        Limpia logs antiguos basado en política de retención.
        
        Args:
            retention_days: Días de retención
            dry_run: Si es True, solo cuenta sin eliminar
        
        Returns:
            Dict con estadísticas de limpieza
        """
        cutoff_date = timezone.now() - timedelta(days=retention_days)
        
        # Contar registros a eliminar
        activity_logs_count = ActivityLog.objects.filter(
            timestamp__lt=cutoff_date
        ).count()
        
        user_activity_logs_count = UserActivityLog.objects.filter(
            timestamp__lt=cutoff_date
        ).count()
        
        admin_action_logs_count = AdminActionLog.objects.filter(
            timestamp__lt=cutoff_date
        ).count()
        
        stats = {
            'activity_logs': activity_logs_count,
            'user_activity_logs': user_activity_logs_count,
            'admin_action_logs': admin_action_logs_count,
            'total': activity_logs_count + user_activity_logs_count + admin_action_logs_count
        }
        
        if not dry_run and stats['total'] > 0:
            with transaction.atomic():
                ActivityLog.objects.filter(timestamp__lt=cutoff_date).delete()
                UserActivityLog.objects.filter(timestamp__lt=cutoff_date).delete()
                AdminActionLog.objects.filter(timestamp__lt=cutoff_date).delete()
            
            logger.info(
                f"Cleaned up {stats['total']} old log entries",
                extra={
                    'retention_days': retention_days,
                    'cutoff_date': cutoff_date.isoformat(),
                    'stats': stats
                }
            )
        
        return stats
    
    # Métodos privados
    
    def _update_activity_metrics(self, action_type: str, success: bool):
        """Actualiza métricas de actividad."""
        try:
            today = timezone.now().date()
            
            # Métrica de actividad general
            SystemMetrics.objects.update_or_create(
                metric_type='user_activity',
                date=today,
                defaults={'count': F('count') + 1}
            )
            
            # Métrica por tipo de acción
            SystemMetrics.objects.update_or_create(
                metric_type=f'activity_{action_type}',
                date=today,
                defaults={'count': F('count') + 1}
            )
            
            # Métrica de errores si la acción falló
            if not success:
                SystemMetrics.objects.update_or_create(
                    metric_type='activity_errors',
                    date=today,
                    defaults={'count': F('count') + 1}
                )
        except Exception as e:
            logger.error(f"Failed to update activity metrics: {str(e)}")
    
    def _calculate_risk_score(
        self,
        suspicious_ips: int,
        failed_logins: int,
        active_impersonations: int,
        security_alerts: int
    ) -> int:
        """Calcula un score de riesgo basado en métricas de seguridad."""
        score = 0
        
        # IPs sospechosas
        score += min(suspicious_ips * 15, 50)
        
        # Logins fallidos
        score += min(failed_logins * 2, 30)
        
        # Impersonaciones activas
        score += min(active_impersonations * 10, 20)
        
        # Alertas de seguridad
        score += min(security_alerts * 5, 25)
        
        return min(score, 100)
    
    def _get_general_stats(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Obtiene estadísticas generales para el reporte."""
        total_activities = ActivityLog.objects.filter(
            timestamp__range=[start_date, end_date]
        ).count()
        
        unique_users = ActivityLog.objects.filter(
            timestamp__range=[start_date, end_date],
            user__isnull=False
        ).values('user').distinct().count()
        
        failed_activities = ActivityLog.objects.filter(
            timestamp__range=[start_date, end_date],
            success=False
        ).count()
        
        return {
            'total_activities': total_activities,
            'unique_users': unique_users,
            'failed_activities': failed_activities,
            'success_rate': ((total_activities - failed_activities) / total_activities * 100) if total_activities > 0 else 100
        }
    
    def _get_user_activities_stats(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Obtiene estadísticas de actividades de usuarios."""
        return {
            'activities_by_type': list(
                ActivityLog.objects.filter(
                    timestamp__range=[start_date, end_date]
                ).values('action_type').annotate(
                    count=Count('id')
                ).order_by('-count')[:10]
            ),
            'top_active_users': list(
                ActivityLog.objects.filter(
                    timestamp__range=[start_date, end_date],
                    user__isnull=False
                ).values('user__email').annotate(
                    count=Count('id')
                ).order_by('-count')[:10]
            )
        }
    
    def _get_admin_actions_stats(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Obtiene estadísticas de acciones administrativas."""
        return {
            'total_admin_actions': AdminActionLog.objects.filter(
                timestamp__range=[start_date, end_date]
            ).count(),
            'impersonation_sessions': AdminImpersonationSession.objects.filter(
                started_at__range=[start_date, end_date]
            ).count(),
            'actions_by_type': list(
                AdminActionLog.objects.filter(
                    timestamp__range=[start_date, end_date]
                ).values('action_type').annotate(
                    count=Count('id')
                ).order_by('-count')[:10]
            )
        }
    
    def _get_security_events_stats(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Obtiene estadísticas de eventos de seguridad."""
        return self.analyze_security_events(end_date - start_date)
    
    def _get_system_alerts_stats(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Obtiene estadísticas de alertas del sistema."""
        return {
            'total_alerts': SystemAlert.objects.filter(
                created_at__range=[start_date, end_date]
            ).count(),
            'alerts_by_level': list(
                SystemAlert.objects.filter(
                    created_at__range=[start_date, end_date]
                ).values('level').annotate(
                    count=Count('id')
                ).order_by('-count')
            ),
            'unresolved_alerts': SystemAlert.objects.filter(
                created_at__range=[start_date, end_date],
                is_resolved=False
            ).count()
        }
    
    def _get_performance_stats(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Obtiene estadísticas de rendimiento."""
        return {
            'metrics_available': SystemMetrics.objects.filter(
                date__range=[start_date.date(), end_date.date()]
            ).exists(),
            'total_metrics': SystemMetrics.objects.filter(
                date__range=[start_date.date(), end_date.date()]
            ).count()
        }


# Instancia singleton del servicio
audit_service = AuditService()