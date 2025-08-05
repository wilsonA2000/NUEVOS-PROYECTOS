"""
Vistas de API REST para la aplicación core de VeriHome.
"""

from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from django.http import JsonResponse
from rest_framework.permissions import AllowAny

from .models import Notification, ActivityLog, SystemAlert
from .serializers import NotificationSerializer, ActivityLogSerializer, SystemAlertSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet para notificaciones."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Marca todas las notificaciones como leídas."""
        updated = self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        # Log actividad (comentado temporalmente)
        # audit_service.log_user_activity(
        #     user=request.user,
        #     action_type='update',
        #     description=f'Marked {updated} notifications as read',
        #     details={'notifications_marked': updated},
        #     ip_address=get_client_ip(request),
        #     user_agent=request.META.get('HTTP_USER_AGENT', '')
        # )
        
        return Response({'message': f'Marked {updated} notifications as read'})
    
    def perform_create(self, serializer):
        notification = serializer.save(user=self.request.user)
        
        # Log actividad (comentado temporalmente)
        # audit_service.log_user_activity(
        #     user=self.request.user,
        #     action_type='create',
        #     description=f'Created notification: {notification.title}',
        #     target_object=notification,
        #     ip_address=get_client_ip(self.request),
        #     user_agent=self.request.META.get('HTTP_USER_AGENT', '')
        # )


class ActivityLogViewSet(viewsets.ModelViewSet):
    """ViewSet para logs de actividad."""
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ActivityLog.objects.filter(user=self.request.user).order_by('-created_at')
    
    def perform_create(self, serializer):
        """Asegura que el log se asigne al usuario actual."""
        serializer.save(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Override create para manejar errores silenciosamente."""
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            # Los logs de actividad pueden fallar silenciosamente
            return Response({
                'message': 'Activity log creation failed but application continues',
                'error': str(e)
            }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def bulk(self, request):
        """Endpoint para crear múltiples logs de actividad en lote."""
        try:
            logs_data = request.data.get('logs', [])
            if not logs_data:
                return Response({'message': 'No logs provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            created_logs = []
            for log_data in logs_data:
                # Agregar el usuario actual a cada log
                log_data['user'] = request.user.id
                serializer = ActivityLogSerializer(data=log_data)
                if serializer.is_valid():
                    created_logs.append(serializer.save())
            
            return Response({
                'message': f'Created {len(created_logs)} activity logs',
                'count': len(created_logs)
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            # Log de actividad puede fallar silenciosamente para no interrumpir la app
            return Response({
                'message': 'Activity logs creation failed but application continues',
                'error': str(e)
            }, status=status.HTTP_200_OK)


class SystemAlertViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para alertas del sistema."""
    serializer_class = SystemAlertSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = SystemAlert.objects.filter(is_active=True).order_by('-created_at')


class UnreadNotificationCountAPIView(APIView):
    """Vista para obtener el conteo de notificaciones no leídas."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        
        return Response({'count': count})


class MarkAllNotificationsReadAPIView(APIView):
    """Vista para marcar todas las notificaciones como leídas."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        
        return Response({'message': 'Todas las notificaciones han sido marcadas como leídas'})


class DashboardStatsAPIView(APIView):
    """Vista para estadísticas del dashboard."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Notificaciones no leídas
        unread_notifications = Notification.objects.filter(
            user=user,
            is_read=False
        ).count()
        
        # Actividad reciente
        recent_activity = ActivityLog.objects.filter(
            user=user
        ).count()
        
        # Estadísticas según el tipo de usuario
        stats = {
            'unread_notifications': unread_notifications,
            'recent_activity': recent_activity,
        }
        
        if user.user_type == 'landlord':
            from properties.models import Property
            stats.update({
                'total_properties': Property.objects.filter(landlord=user).count(),
                'active_properties': Property.objects.filter(landlord=user, is_active=True).count(),
            })
        elif user.user_type == 'tenant':
            from contracts.models import Contract
            stats.update({
                'active_contracts': Contract.objects.filter(tenant=user, status='active').count(),
                'pending_contracts': Contract.objects.filter(tenant=user, status='pending').count(),
            })
        
        return Response(stats)


class SystemOverviewAPIView(APIView):
    """Vista para estadísticas generales del sistema."""
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        from django.contrib.auth import get_user_model
        from properties.models import Property
        from contracts.models import Contract
        
        User = get_user_model()
        
        # Estadísticas de usuarios
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        verified_users = User.objects.filter(is_verified=True).count()
        
        # Estadísticas de propiedades
        total_properties = Property.objects.count()
        active_properties = Property.objects.filter(is_active=True).count()
        
        # Estadísticas de contratos
        total_contracts = Contract.objects.count()
        active_contracts = Contract.objects.filter(status='active').count()
        
        # Alertas del sistema
        active_alerts = SystemAlert.objects.filter(is_active=True).count()
        critical_alerts = SystemAlert.objects.filter(is_active=True, level='critical').count()
        
        return Response({
            'users': {
                'total': total_users,
                'active': active_users,
                'verified': verified_users,
            },
            'properties': {
                'total': total_properties,
                'active': active_properties,
            },
            'contracts': {
                'total': total_contracts,
                'active': active_contracts,
            },
            'alerts': {
                'active': active_alerts,
                'critical': critical_alerts,
            },
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Endpoint de prueba para verificar la conexión al backend"""
    return Response({
        'status': 'ok',
        'message': 'Backend is running',
        'timestamp': '2024-01-01T00:00:00Z'
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def test_connection(request):
    """Endpoint de prueba para verificar CORS y conexión"""
    return Response({
        'status': 'success',
        'message': 'Connection test successful',
        'cors_enabled': True,
        'api_version': 'v1'
    })


class AuditReportAPIView(APIView):
    """Vista para generar reportes de auditoría."""
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request):
        """Genera un reporte de auditoría personalizado."""
        try:
            start_date_str = request.data.get('start_date')
            end_date_str = request.data.get('end_date')
            sections = request.data.get('sections', [
                'general_stats', 'user_activities', 'admin_actions',
                'security_events', 'system_alerts', 'performance_metrics'
            ])
            
            if not start_date_str or not end_date_str:
                return Response(
                    {'error': 'start_date and end_date are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            
            report = audit_service.generate_audit_report(
                start_date=start_date,
                end_date=end_date,
                include_sections=sections
            )
            
            # Log de la generación del reporte
            audit_service.log_user_activity(
                user=request.user,
                action_type='generate_report',
                description='Generated audit report',
                details={
                    'report_id': report['report_id'],
                    'period_days': report['period']['days'],
                    'sections': sections
                },
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response(report)
            
        except Exception as e:
            logger.error(f"Failed to generate audit report: {str(e)}")
            return Response(
                {'error': 'Failed to generate audit report'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SecurityAnalysisAPIView(APIView):
    """Vista para análisis de eventos de seguridad."""
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Obtiene análisis de seguridad."""
        try:
            hours = int(getattr(request, "query_params", request.GET).get('hours', 24))
            time_period = timedelta(hours=hours)
            
            analysis = audit_service.analyze_security_events(time_period)
            
            return Response(analysis)
            
        except Exception as e:
            logger.error(f"Failed to analyze security events: {str(e)}")
            return Response(
                {'error': 'Failed to analyze security events'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LogCleanupAPIView(APIView):
    """Vista para limpieza de logs antiguos."""
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request):
        """Ejecuta limpieza de logs antiguos."""
        try:
            retention_days = int(request.data.get('retention_days', 90))
            dry_run = request.data.get('dry_run', True)
            
            stats = audit_service.cleanup_old_logs(
                retention_days=retention_days,
                dry_run=dry_run
            )
            
            # Log de la acción de limpieza
            audit_service.log_user_activity(
                user=request.user,
                action_type='cleanup',
                description=f'Log cleanup {"simulated" if dry_run else "executed"}',
                details={
                    'retention_days': retention_days,
                    'dry_run': dry_run,
                    'stats': stats
                },
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({
                'message': f'Log cleanup {"simulated" if dry_run else "completed"} successfully',
                'stats': stats
            })
            
        except Exception as e:
            logger.error(f"Failed to cleanup logs: {str(e)}")
            return Response(
                {'error': 'Failed to cleanup logs'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DashboardStatsAPIView(APIView):
    """Vista para estadísticas del dashboard de auditoría."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtiene estadísticas para el dashboard."""
        try:
            # Estadísticas básicas para usuarios normales
            if not request.user.is_staff:
                summary = audit_service.get_user_activity_summary(
                    user=request.user,
                    days=30
                )
                return Response({
                    'user_stats': summary,
                    'is_admin': False
                })
            
            # Estadísticas completas para administradores
            days = int(getattr(request, "query_params", request.GET).get('days', 7))
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)
            
            # Estadísticas generales
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
            
            active_alerts = SystemAlert.objects.filter(
                is_active=True,
                is_resolved=False
            ).count()
            
            # Análisis de seguridad rápido
            security_analysis = audit_service.analyze_security_events(
                timedelta(hours=24)
            )
            
            stats = {
                'period_days': days,
                'total_activities': total_activities,
                'unique_users': unique_users,
                'failed_activities': failed_activities,
                'success_rate': ((total_activities - failed_activities) / total_activities * 100) if total_activities > 0 else 100,
                'active_alerts': active_alerts,
                'security_risk_score': security_analysis.get('risk_score', 0),
                'recent_security_events': {
                    'failed_logins': security_analysis.get('failed_logins', {}).get('total', 0),
                    'suspicious_ips': len(security_analysis.get('suspicious_ips', [])),
                    'active_impersonations': security_analysis.get('active_impersonations', 0)
                },
                'is_admin': True
            }
            
            return Response(stats)
            
        except Exception as e:
            logger.error(f"Failed to get dashboard stats: {str(e)}")
            return Response(
                {'error': 'Failed to get dashboard stats'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ExportLogsAPIView(APIView):
    """Vista para exportar logs de auditoría."""
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request):
        """Exporta logs en formato CSV o JSON."""
        try:
            start_date_str = request.data.get('start_date')
            end_date_str = request.data.get('end_date')
            format_type = request.data.get('format', 'csv')
            log_types = request.data.get('log_types', ['activity', 'user_activity', 'admin_action'])
            
            if not start_date_str or not end_date_str:
                return Response(
                    {'error': 'start_date and end_date are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            
            # Recopilar logs según los tipos solicitados
            export_data = []
            
            if 'activity' in log_types:
                activities = ActivityLog.objects.filter(
                    timestamp__range=[start_date, end_date]
                ).values(
                    'id', 'user__email', 'action_type', 'description',
                    'timestamp', 'ip_address', 'success'
                )
                export_data.extend([{**activity, 'log_type': 'activity'} for activity in activities])
            
            if format_type == 'json':
                response = HttpResponse(
                    json.dumps(list(export_data), indent=2, default=str),
                    content_type='application/json'
                )
                response['Content-Disposition'] = f'attachment; filename="audit_logs_{start_date.date()}_{end_date.date()}.json"'
            else:
                # Formato CSV
                import csv
                from io import StringIO
                
                output = StringIO()
                writer = csv.writer(output)
                
                if export_data:
                    # Escribir headers
                    headers = list(export_data[0].keys())
                    writer.writerow(headers)
                    
                    # Escribir datos
                    for row in export_data:
                        writer.writerow([str(row.get(header, '')) for header in headers])
                
                response = HttpResponse(output.getvalue(), content_type='text/csv')
                response['Content-Disposition'] = f'attachment; filename="audit_logs_{start_date.date()}_{end_date.date()}.csv"'
            
            # Log de la exportación
            audit_service.log_user_activity(
                user=request.user,
                action_type='export',
                description=f'Exported {len(export_data)} log entries',
                details={
                    'format': format_type,
                    'log_types': log_types,
                    'period_start': start_date.isoformat(),
                    'period_end': end_date.isoformat(),
                    'records_exported': len(export_data)
                },
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Failed to export logs: {str(e)}")
            return Response(
                {'error': 'Failed to export logs'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 