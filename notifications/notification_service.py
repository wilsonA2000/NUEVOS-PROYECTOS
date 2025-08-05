"""
Servicio principal del sistema de notificaciones para VeriHome.
Maneja el envío, procesamiento y gestión integral de notificaciones.
"""

from django.db import transaction
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from django.conf import settings
from datetime import timedelta, datetime
from typing import Dict, List, Any, Optional, Union
import logging
import json

from .models import (
    Notification, NotificationTemplate, NotificationChannel,
    NotificationDelivery, NotificationPreference, NotificationDigest,
    NotificationAnalytics
)
from .channels import NotificationChannelManager

User = get_user_model()
logger = logging.getLogger(__name__)


class NotificationService:
    """Servicio principal para manejo de notificaciones."""
    
    def __init__(self):
        self.channel_manager = NotificationChannelManager()
    
    @transaction.atomic
    def create_notification(
        self,
        recipient: User,
        title: str,
        message: str,
        template_name: Optional[str] = None,
        priority: str = 'normal',
        channels: List[str] = None,
        action_url: str = '',
        deep_link: str = '',
        data: Dict[str, Any] = None,
        content_object: Any = None,
        scheduled_at: Optional[datetime] = None,
        expires_at: Optional[datetime] = None,
        context: Dict[str, Any] = None
    ) -> Notification:
        """
        Crea una nueva notificación.
        
        Args:
            recipient: Usuario destinatario
            title: Título de la notificación
            message: Mensaje de la notificación
            template_name: Nombre de la plantilla a usar
            priority: Prioridad de la notificación
            channels: Lista de canales a usar
            action_url: URL de acción
            deep_link: Deep link para aplicaciones móviles
            data: Datos adicionales
            content_object: Objeto relacionado
            scheduled_at: Fecha de envío programado
            expires_at: Fecha de expiración
            context: Contexto para renderizar plantilla
        
        Returns:
            Notification: Notificación creada
        """
        try:
            # Verificar preferencias del usuario
            if not self._should_send_notification(recipient, template_name):
                logger.info(f"Notification skipped for user {recipient.id} due to preferences")
                return None
            
            # Obtener plantilla si se especifica
            template = None
            if template_name:
                try:
                    template = NotificationTemplate.objects.get(
                        name=template_name,
                        is_active=True
                    )
                    
                    # Renderizar contenido con contexto
                    if context:
                        rendered = template.render_content(context)
                        title = rendered['title'] or title
                        message = rendered['content_text'] or message
                    
                except NotificationTemplate.DoesNotExist:
                    logger.warning(f"Template '{template_name}' not found")
            
            # Crear la notificación
            notification = Notification.objects.create(
                recipient=recipient,
                template=template,
                title=title,
                message=message,
                priority=priority,
                action_url=action_url,
                deep_link=deep_link,
                data=data or {},
                scheduled_at=scheduled_at,
                expires_at=expires_at,
                content_object=content_object
            )
            
            # Programar envío
            if channels:
                self._schedule_delivery(notification, channels)
            elif template:
                # Usar canales de la plantilla
                template_channels = template.channels.filter(status='active')
                channel_names = [ch.channel_type for ch in template_channels]
                self._schedule_delivery(notification, channel_names)
            else:
                # Usar canales por defecto
                self._schedule_delivery(notification, ['in_app'])
            
            # Enviar inmediatamente si no está programado
            if not scheduled_at:
                self.send_notification(notification)
            
            logger.info(f"Notification created: {notification.id}")
            return notification
            
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            raise
    
    def send_notification(self, notification: Notification) -> Dict[str, Any]:
        """
        Envía una notificación a través de todos sus canales configurados.
        
        Args:
            notification: Notificación a enviar
        
        Returns:
            Dict con resultado del envío
        """
        if not notification.should_send_now():
            return {'success': False, 'reason': 'Notification not ready to send'}
        
        results = []
        notification.status = 'processing'
        notification.save(update_fields=['status'])
        
        try:
            # Obtener entregas pendientes
            deliveries = notification.deliveries.filter(status='pending')
            
            for delivery in deliveries:
                try:
                    # Verificar límites de velocidad
                    if not self._check_rate_limits(delivery.channel, notification.recipient):
                        delivery.status = 'failed'
                        delivery.error_message = 'Rate limit exceeded'
                        delivery.save()
                        continue
                    
                    # Enviar por el canal específico
                    result = self.channel_manager.send_notification(
                        delivery.channel,
                        notification,
                        delivery
                    )
                    
                    results.append(result)
                    
                    # Actualizar estado de la entrega
                    if result['success']:
                        delivery.status = 'sent'
                        delivery.sent_at = timezone.now()
                        delivery.external_id = result.get('external_id', '')
                        delivery.sent_to = result.get('sent_to', '')
                        delivery.response_data = result.get('response_data', {})
                    else:
                        delivery.status = 'failed'
                        delivery.error_message = result.get('error', '')
                        # Programar reintento si es posible
                        if delivery.can_retry():
                            delivery.schedule_retry()
                    
                    delivery.save()
                    
                except Exception as e:
                    logger.error(f"Error sending via {delivery.channel.name}: {str(e)}")
                    delivery.status = 'failed'
                    delivery.error_message = str(e)
                    delivery.save()
                    
                    results.append({
                        'success': False,
                        'channel': delivery.channel.name,
                        'error': str(e)
                    })
            
            # Actualizar estado general de la notificación
            successful_deliveries = notification.deliveries.filter(status__in=['sent', 'delivered'])
            if successful_deliveries.exists():
                notification.mark_as_sent()
            else:
                notification.mark_as_failed('All delivery attempts failed')
            
            # Registrar analíticas
            self._record_analytics(notification, results)
            
            return {
                'success': any(r['success'] for r in results),
                'notification_id': notification.id,
                'deliveries': results
            }
            
        except Exception as e:
            logger.error(f"Error sending notification {notification.id}: {str(e)}")
            notification.mark_as_failed(str(e))
            return {'success': False, 'error': str(e)}
    
    def send_bulk_notifications(
        self,
        recipients: List[User],
        title: str,
        message: str,
        template_name: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Envía notificaciones masivas a múltiples usuarios.
        
        Args:
            recipients: Lista de usuarios destinatarios
            title: Título de la notificación
            message: Mensaje de la notificación
            template_name: Nombre de la plantilla
            **kwargs: Argumentos adicionales
        
        Returns:
            Dict con estadísticas del envío masivo
        """
        results = {
            'total_recipients': len(recipients),
            'sent': 0,
            'failed': 0,
            'skipped': 0,
            'errors': []
        }
        
        for recipient in recipients:
            try:
                notification = self.create_notification(
                    recipient=recipient,
                    title=title,
                    message=message,
                    template_name=template_name,
                    **kwargs
                )
                
                if notification:
                    results['sent'] += 1
                else:
                    results['skipped'] += 1
                    
            except Exception as e:
                results['failed'] += 1
                results['errors'].append({
                    'recipient_id': recipient.id,
                    'error': str(e)
                })
                logger.error(f"Error sending bulk notification to user {recipient.id}: {str(e)}")
        
        logger.info(f"Bulk notification sent: {results}")
        return results
    
    def process_scheduled_notifications(self) -> Dict[str, int]:
        """
        Procesa notificaciones programadas que están listas para envío.
        
        Returns:
            Dict con estadísticas del procesamiento
        """
        stats = {'processed': 0, 'sent': 0, 'failed': 0, 'expired': 0}
        
        # Buscar notificaciones pendientes y programadas
        now = timezone.now()
        scheduled_notifications = Notification.objects.filter(
            status='pending',
            scheduled_at__lte=now
        ).exclude(expires_at__lt=now)
        
        for notification in scheduled_notifications:
            stats['processed'] += 1
            
            try:
                if notification.is_expired():
                    notification.status = 'cancelled'
                    notification.save()
                    stats['expired'] += 1
                    continue
                
                result = self.send_notification(notification)
                if result['success']:
                    stats['sent'] += 1
                else:
                    stats['failed'] += 1
                    
            except Exception as e:
                logger.error(f"Error processing scheduled notification {notification.id}: {str(e)}")
                stats['failed'] += 1
        
        return stats
    
    def retry_failed_deliveries(self) -> Dict[str, int]:
        """
        Reintenta entregas fallidas que están listas para reintento.
        
        Returns:
            Dict con estadísticas de los reintentos
        """
        stats = {'retried': 0, 'successful': 0, 'failed': 0}
        
        # Buscar entregas fallidas listas para reintento
        failed_deliveries = NotificationDelivery.objects.filter(
            status='failed'
        ).select_related('notification', 'channel')
        
        for delivery in failed_deliveries:
            if delivery.can_retry():
                stats['retried'] += 1
                
                try:
                    delivery.status = 'pending'
                    delivery.save()
                    
                    result = self.channel_manager.send_notification(
                        delivery.channel,
                        delivery.notification,
                        delivery
                    )
                    
                    if result['success']:
                        delivery.status = 'sent'
                        delivery.sent_at = timezone.now()
                        stats['successful'] += 1
                    else:
                        delivery.schedule_retry()
                        stats['failed'] += 1
                    
                    delivery.save()
                    
                except Exception as e:
                    logger.error(f"Error retrying delivery {delivery.id}: {str(e)}")
                    delivery.schedule_retry()
                    stats['failed'] += 1
        
        return stats
    
    def create_digest(
        self,
        user: User,
        digest_type: str = 'daily',
        force: bool = False
    ) -> Optional[NotificationDigest]:
        """
        Crea un resumen de notificaciones para un usuario.
        
        Args:
            user: Usuario para el resumen
            digest_type: Tipo de resumen (daily, weekly, monthly)
            force: Forzar creación aunque ya exista
        
        Returns:
            NotificationDigest creado o None
        """
        try:
            # Verificar preferencias del usuario
            prefs = self._get_user_preferences(user)
            if not prefs.digest_enabled or prefs.digest_frequency != digest_type:
                return None
            
            # Calcular período
            now = timezone.now()
            if digest_type == 'daily':
                period_start = now - timedelta(days=1)
            elif digest_type == 'weekly':
                period_start = now - timedelta(weeks=1)
            elif digest_type == 'monthly':
                period_start = now - timedelta(days=30)
            else:
                return None
            
            # Verificar si ya existe un resumen para este período
            if not force:
                existing = NotificationDigest.objects.filter(
                    user=user,
                    digest_type=digest_type,
                    period_start__date=period_start.date()
                ).exists()
                
                if existing:
                    return None
            
            # Obtener notificaciones del período
            notifications = Notification.objects.filter(
                recipient=user,
                created_at__gte=period_start,
                created_at__lt=now,
                status__in=['sent', 'delivered', 'read']
            ).order_by('-created_at')
            
            if not notifications.exists():
                return None
            
            # Crear resumen de datos
            summary_data = self._create_digest_summary(notifications)
            
            # Crear el resumen
            digest = NotificationDigest.objects.create(
                user=user,
                digest_type=digest_type,
                period_start=period_start,
                period_end=now,
                notification_count=notifications.count(),
                summary_data=summary_data
            )
            
            # Enviar resumen por email
            self._send_digest_email(digest)
            
            logger.info(f"Digest created for user {user.id}: {digest.id}")
            return digest
            
        except Exception as e:
            logger.error(f"Error creating digest for user {user.id}: {str(e)}")
            return None
    
    def get_user_notifications(
        self,
        user: User,
        limit: int = 20,
        offset: int = 0,
        unread_only: bool = False,
        priority: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Obtiene notificaciones para un usuario con paginación.
        
        Args:
            user: Usuario
            limit: Límite de resultados
            offset: Offset para paginación
            unread_only: Solo notificaciones no leídas
            priority: Filtrar por prioridad
        
        Returns:
            Dict con notificaciones y metadatos
        """
        queryset = Notification.objects.filter(
            recipient=user,
            status__in=['sent', 'delivered', 'read']
        )
        
        if unread_only:
            queryset = queryset.filter(is_read=False)
        
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Obtener total y aplicar paginación
        total = queryset.count()
        notifications = queryset.order_by('-created_at')[offset:offset + limit]
        
        # Contar no leídas
        unread_count = Notification.objects.filter(
            recipient=user,
            is_read=False,
            status__in=['sent', 'delivered']
        ).count()
        
        return {
            'notifications': list(notifications),
            'total': total,
            'unread_count': unread_count,
            'has_more': total > (offset + limit)
        }
    
    def mark_notification_as_read(self, notification_id: str, user: User) -> bool:
        """
        Marca una notificación como leída.
        
        Args:
            notification_id: ID de la notificación
            user: Usuario que marca como leída
        
        Returns:
            bool: True si se marcó correctamente
        """
        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient=user
            )
            notification.mark_as_read()
            
            # Registrar analíticas
            self._record_read_analytics(notification)
            
            return True
            
        except Notification.DoesNotExist:
            return False
        except Exception as e:
            logger.error(f"Error marking notification as read: {str(e)}")
            return False
    
    def mark_all_as_read(self, user: User) -> int:
        """
        Marca todas las notificaciones no leídas como leídas.
        
        Args:
            user: Usuario
        
        Returns:
            int: Número de notificaciones marcadas
        """
        try:
            count = Notification.objects.filter(
                recipient=user,
                is_read=False
            ).update(
                is_read=True,
                read_at=timezone.now(),
                status='read'
            )
            
            logger.info(f"Marked {count} notifications as read for user {user.id}")
            return count
            
        except Exception as e:
            logger.error(f"Error marking all notifications as read: {str(e)}")
            return 0
    
    def get_notification_stats(self, user: User) -> Dict[str, Any]:
        """
        Obtiene estadísticas de notificaciones para un usuario.
        
        Args:
            user: Usuario
        
        Returns:
            Dict con estadísticas
        """
        try:
            # Estadísticas básicas
            total_notifications = Notification.objects.filter(recipient=user).count()
            unread_notifications = Notification.objects.filter(
                recipient=user,
                is_read=False
            ).count()
            
            # Estadísticas por prioridad
            priority_stats = {}
            for priority, _ in Notification.PRIORITY_LEVELS:
                count = Notification.objects.filter(
                    recipient=user,
                    priority=priority
                ).count()
                priority_stats[priority] = count
            
            # Actividad reciente (últimos 7 días)
            week_ago = timezone.now() - timedelta(days=7)
            recent_notifications = Notification.objects.filter(
                recipient=user,
                created_at__gte=week_ago
            ).count()
            
            # Tasa de lectura
            read_notifications = Notification.objects.filter(
                recipient=user,
                is_read=True
            ).count()
            
            read_rate = 0
            if total_notifications > 0:
                read_rate = (read_notifications / total_notifications) * 100
            
            return {
                'total_notifications': total_notifications,
                'unread_notifications': unread_notifications,
                'read_notifications': read_notifications,
                'recent_notifications': recent_notifications,
                'read_rate': round(read_rate, 2),
                'priority_breakdown': priority_stats
            }
            
        except Exception as e:
            logger.error(f"Error getting notification stats: {str(e)}")
            return {}
    
    # Métodos auxiliares privados
    
    def _should_send_notification(self, user: User, template_name: Optional[str]) -> bool:
        """Verifica si se debe enviar una notificación al usuario."""
        try:
            prefs = self._get_user_preferences(user)
            
            if not prefs.is_enabled:
                return False
            
            # Verificar horas silenciosas
            if prefs.is_in_quiet_hours():
                return False
            
            # Verificar tipo de notificación
            if template_name:
                template_type = self._get_template_type(template_name)
                if not prefs.allows_notification_type(template_type):
                    return False
            
            # Verificar límites de frecuencia
            if template_name:
                template = NotificationTemplate.objects.get(name=template_name)
                today = timezone.now().date()
                today_count = Notification.objects.filter(
                    recipient=user,
                    template=template,
                    created_at__date=today
                ).count()
                
                if today_count >= template.max_frequency_per_user_per_day:
                    return False
            
            return True
            
        except Exception:
            return True  # En caso de error, permitir envío
    
    def _get_user_preferences(self, user: User) -> NotificationPreference:
        """Obtiene o crea las preferencias de notificación del usuario."""
        prefs, created = NotificationPreference.objects.get_or_create(
            user=user,
            defaults={
                'is_enabled': True,
                'allow_email': True,
                'allow_push': True,
                'allow_in_app': True,
            }
        )
        return prefs
    
    def _get_template_type(self, template_name: str) -> str:
        """Obtiene el tipo de una plantilla basado en su nombre."""
        try:
            template = NotificationTemplate.objects.get(name=template_name)
            return template.template_type
        except NotificationTemplate.DoesNotExist:
            return 'system'
    
    def _schedule_delivery(self, notification: Notification, channels: List[str]):
        """Programa la entrega de una notificación por los canales especificados."""
        user_prefs = self._get_user_preferences(notification.recipient)
        
        for channel_type in channels:
            # Verificar si el usuario permite este canal
            if not user_prefs.allows_channel(channel_type):
                continue
            
            try:
                channel = NotificationChannel.objects.get(
                    channel_type=channel_type,
                    status='active'
                )
                
                NotificationDelivery.objects.create(
                    notification=notification,
                    channel=channel,
                    status='pending'
                )
                
            except NotificationChannel.DoesNotExist:
                logger.warning(f"Channel {channel_type} not found or inactive")
    
    def _check_rate_limits(self, channel: NotificationChannel, user: User) -> bool:
        """Verifica los límites de velocidad para un canal y usuario."""
        now = timezone.now()
        
        # Verificar límite por minuto
        minute_ago = now - timedelta(minutes=1)
        recent_deliveries = NotificationDelivery.objects.filter(
            channel=channel,
            notification__recipient=user,
            sent_at__gte=minute_ago
        ).count()
        
        if recent_deliveries >= channel.rate_limit_per_minute:
            return False
        
        # Verificar límite por hora
        hour_ago = now - timedelta(hours=1)
        hour_deliveries = NotificationDelivery.objects.filter(
            channel=channel,
            notification__recipient=user,
            sent_at__gte=hour_ago
        ).count()
        
        return hour_deliveries < channel.rate_limit_per_hour
    
    def _record_analytics(self, notification: Notification, results: List[Dict]):
        """Registra analíticas del envío de notificación."""
        today = timezone.now().date()
        
        for result in results:
            if 'channel' in result:
                try:
                    channel = NotificationChannel.objects.get(name=result['channel'])
                    analytics, created = NotificationAnalytics.objects.get_or_create(
                        date=today,
                        channel=channel,
                        defaults={
                            'notifications_sent': 0,
                            'notifications_delivered': 0,
                            'notifications_failed': 0
                        }
                    )
                    
                    analytics.notifications_sent += 1
                    if result['success']:
                        analytics.notifications_delivered += 1
                    else:
                        analytics.notifications_failed += 1
                    
                    analytics.calculate_rates()
                    
                except NotificationChannel.DoesNotExist:
                    pass
    
    def _record_read_analytics(self, notification: Notification):
        """Registra analíticas de lectura de notificación."""
        today = timezone.now().date()
        
        for delivery in notification.deliveries.all():
            try:
                analytics, created = NotificationAnalytics.objects.get_or_create(
                    date=today,
                    channel=delivery.channel,
                    defaults={'notifications_read': 0}
                )
                
                analytics.notifications_read += 1
                analytics.calculate_rates()
                
            except Exception:
                pass
    
    def _create_digest_summary(self, notifications) -> Dict[str, Any]:
        """Crea un resumen de datos para el digest."""
        summary = {
            'total_count': notifications.count(),
            'by_priority': {},
            'by_type': {},
            'recent_notifications': []
        }
        
        # Agrupar por prioridad
        for priority, _ in Notification.PRIORITY_LEVELS:
            count = notifications.filter(priority=priority).count()
            if count > 0:
                summary['by_priority'][priority] = count
        
        # Agrupar por tipo de template
        for notification in notifications:
            if notification.template:
                template_type = notification.template.template_type
                summary['by_type'][template_type] = summary['by_type'].get(template_type, 0) + 1
        
        # Notificaciones recientes destacadas
        recent = notifications[:5]
        for notif in recent:
            summary['recent_notifications'].append({
                'title': notif.title,
                'message': notif.message[:100],
                'created_at': notif.created_at.isoformat(),
                'priority': notif.priority
            })
        
        return summary
    
    def _send_digest_email(self, digest: NotificationDigest):
        """Envía el resumen por email."""
        try:
            # Aquí se integraría con el sistema de emails
            # Por ahora, solo marcamos como enviado
            digest.email_sent = True
            digest.sent_at = timezone.now()
            digest.status = 'sent'
            digest.save()
            
        except Exception as e:
            logger.error(f"Error sending digest email: {str(e)}")
            digest.status = 'failed'
            digest.save()


# Instancia global del servicio
notification_service = NotificationService()