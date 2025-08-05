"""
Sistema de notificaciones para mensajería de VeriHome.
Maneja notificaciones en tiempo real, email y push.
"""

from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from typing import Dict, List, Any, Optional
import logging
import json

from .models import MessageThread, Message, ThreadParticipant
from users.models import User

logger = logging.getLogger(__name__)


class MessageNotificationManager:
    """Gestor de notificaciones para el sistema de mensajería."""
    
    def __init__(self):
        self.base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    
    def send_new_message_notification(self, message: Message) -> bool:
        """Envía notificación de nuevo mensaje."""
        try:
            recipient = message.recipient
            
            # Verificar si el usuario tiene notificaciones habilitadas
            if not self._should_send_notification(recipient, 'new_message'):
                return False
            
            # Enviar notificación en tiempo real (WebSocket)
            self._send_realtime_notification(message)
            
            # Enviar notificación por email si corresponde
            if self._should_send_email_notification(recipient, message):
                self._send_email_notification(message)
            
            # Enviar notificación push si está configurada
            if self._should_send_push_notification(recipient):
                self._send_push_notification(message)
            
            # Registrar la notificación
            self._log_notification('new_message', recipient, {
                'message_id': str(message.id),
                'sender_id': message.sender.id,
                'thread_id': str(message.thread.id)
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending new message notification: {str(e)}")
            return False
    
    def send_new_conversation_notification(
        self, 
        thread: MessageThread, 
        initiator: User, 
        recipient: User
    ) -> bool:
        """Envía notificación de nueva conversación."""
        try:
            if not self._should_send_notification(recipient, 'new_conversation'):
                return False
            
            context = {
                'recipient_name': recipient.get_full_name(),
                'initiator_name': initiator.get_full_name(),
                'thread_subject': thread.subject,
                'thread_type_display': thread.get_thread_type_display(),
                'conversation_url': f"{self.base_url}/messages/thread/{thread.id}",
                'platform_name': 'VeriHome'
            }
            
            # Enviar email
            success = self._send_email(
                recipient=recipient,
                subject=f"Nueva conversación en {context['platform_name']}",
                template_name='messaging/email/new_conversation.html',
                context=context
            )
            
            if success:
                self._log_notification('new_conversation', recipient, {
                    'thread_id': str(thread.id),
                    'initiator_id': initiator.id
                })
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending new conversation notification: {str(e)}")
            return False
    
    def send_unread_messages_digest(self, user: User, frequency: str = 'daily') -> bool:
        """Envía resumen de mensajes no leídos."""
        try:
            # Obtener mensajes no leídos
            unread_messages = Message.objects.filter(
                recipient=user,
                is_read=False,
                sent_at__gte=self._get_digest_timeframe(frequency)
            ).select_related('sender', 'thread')
            
            if not unread_messages.exists():
                return False
            
            # Agrupar por conversación
            conversations = {}
            for message in unread_messages:
                thread_id = str(message.thread.id)
                if thread_id not in conversations:
                    conversations[thread_id] = {
                        'thread': message.thread,
                        'messages': [],
                        'sender_names': set()
                    }
                conversations[thread_id]['messages'].append(message)
                conversations[thread_id]['sender_names'].add(message.sender.get_full_name())
            
            context = {
                'user_name': user.get_full_name(),
                'total_unread': unread_messages.count(),
                'conversations': conversations,
                'frequency': frequency,
                'messages_url': f"{self.base_url}/messages",
                'platform_name': 'VeriHome'
            }
            
            subject = f"Tienes {unread_messages.count()} mensajes sin leer - VeriHome"
            
            success = self._send_email(
                recipient=user,
                subject=subject,
                template_name='messaging/email/unread_digest.html',
                context=context
            )
            
            if success:
                self._log_notification('unread_digest', user, {
                    'frequency': frequency,
                    'unread_count': unread_messages.count(),
                    'conversations_count': len(conversations)
                })
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending unread digest: {str(e)}")
            return False
    
    def send_conversation_timeout_warning(self, thread: MessageThread) -> bool:
        """Envía alerta de conversación sin actividad."""
        try:
            if not thread.last_message_at:
                return False
            
            # Verificar si han pasado 7 días sin actividad
            days_inactive = (timezone.now() - thread.last_message_at).days
            if days_inactive < 7:
                return False
            
            # Notificar al iniciador de la conversación
            initiator = thread.created_by
            
            context = {
                'user_name': initiator.get_full_name(),
                'thread_subject': thread.subject,
                'days_inactive': days_inactive,
                'other_participant': thread.get_other_participant(initiator).get_full_name(),
                'conversation_url': f"{self.base_url}/messages/thread/{thread.id}",
                'platform_name': 'VeriHome'
            }
            
            success = self._send_email(
                recipient=initiator,
                subject=f"Conversación sin actividad - {context['platform_name']}",
                template_name='messaging/email/conversation_timeout.html',
                context=context
            )
            
            if success:
                self._log_notification('conversation_timeout', initiator, {
                    'thread_id': str(thread.id),
                    'days_inactive': days_inactive
                })
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending timeout warning: {str(e)}")
            return False
    
    def send_message_delivery_notification(self, message: Message) -> bool:
        """Envía confirmación de entrega al remitente."""
        try:
            # Solo para mensajes importantes o cuando se solicite
            if message.thread.is_priority:
                self._send_realtime_notification(
                    message,
                    notification_type='delivery_confirmation',
                    recipient=message.sender
                )
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending delivery notification: {str(e)}")
            return False
    
    def send_bulk_notifications(self, notification_type: str, users: List[User], context: Dict[str, Any]) -> Dict[str, int]:
        """Envía notificaciones masivas."""
        try:
            results = {
                'sent': 0,
                'failed': 0,
                'skipped': 0
            }
            
            for user in users:
                try:
                    if not self._should_send_notification(user, notification_type):
                        results['skipped'] += 1
                        continue
                    
                    # Personalizar contexto para cada usuario
                    user_context = context.copy()
                    user_context['user_name'] = user.get_full_name()
                    
                    success = self._send_email(
                        recipient=user,
                        subject=context.get('subject', 'Notificación de VeriHome'),
                        template_name=context.get('template', 'messaging/email/generic.html'),
                        context=user_context
                    )
                    
                    if success:
                        results['sent'] += 1
                    else:
                        results['failed'] += 1
                        
                except Exception as e:
                    logger.error(f"Error sending bulk notification to user {user.id}: {str(e)}")
                    results['failed'] += 1
            
            return results
            
        except Exception as e:
            logger.error(f"Error sending bulk notifications: {str(e)}")
            return {'sent': 0, 'failed': 0, 'skipped': 0}
    
    def _send_realtime_notification(
        self, 
        message: Message, 
        notification_type: str = 'new_message',
        recipient: Optional[User] = None
    ):
        """Envía notificación en tiempo real via WebSocket."""
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            if not channel_layer:
                return
            
            target_user = recipient or message.recipient
            
            notification_data = {
                'type': 'message_notification',
                'notification_type': notification_type,
                'message_id': str(message.id),
                'thread_id': str(message.thread.id),
                'sender_id': message.sender.id,
                'sender_name': message.sender.get_full_name(),
                'sender_initials': message.sender.get_initials(),
                'thread_subject': message.thread.subject,
                'content_preview': message.content[:100] + '...' if len(message.content) > 100 else message.content,
                'sent_at': message.sent_at.isoformat(),
                'thread_type': message.thread.thread_type,
                'is_priority': message.thread.is_priority
            }
            
            # Enviar a través del canal del usuario
            async_to_sync(channel_layer.group_send)(
                f"user_{target_user.id}",
                notification_data
            )
            
        except Exception as e:
            logger.error(f"Error sending realtime notification: {str(e)}")
    
    def _send_email_notification(self, message: Message) -> bool:
        """Envía notificación por email."""
        try:
            context = {
                'recipient_name': message.recipient.get_full_name(),
                'sender_name': message.sender.get_full_name(),
                'thread_subject': message.thread.subject,
                'message_content': message.content,
                'message_url': f"{self.base_url}/messages/thread/{message.thread.id}",
                'sender_initials': message.sender.get_initials(),
                'platform_name': 'VeriHome'
            }
            
            return self._send_email(
                recipient=message.recipient,
                subject=f"Nuevo mensaje de {message.sender.get_full_name()} - VeriHome",
                template_name='messaging/email/new_message.html',
                context=context
            )
            
        except Exception as e:
            logger.error(f"Error sending email notification: {str(e)}")
            return False
    
    def _send_push_notification(self, message: Message) -> bool:
        """Envía notificación push."""
        try:
            # Implementar integración con servicio de push notifications
            # Por ejemplo: Firebase Cloud Messaging, OneSignal, etc.
            
            notification_data = {
                'title': f"Nuevo mensaje de {message.sender.get_full_name()}",
                'body': message.content[:100] + '...' if len(message.content) > 100 else message.content,
                'data': {
                    'message_id': str(message.id),
                    'thread_id': str(message.thread.id),
                    'type': 'new_message'
                }
            }
            
            # Aquí iría la implementación específica del servicio
            # Por ahora, solo registramos que se habría enviado
            logger.info(f"Push notification would be sent to user {message.recipient.id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending push notification: {str(e)}")
            return False
    
    def _send_email(self, recipient: User, subject: str, template_name: str, context: Dict[str, Any]) -> bool:
        """Envía email usando plantilla."""
        try:
            # Renderizar contenido HTML
            html_content = render_to_string(template_name, context)
            
            # Renderizar contenido de texto plano
            text_template = template_name.replace('.html', '.txt')
            try:
                text_content = render_to_string(text_template, context)
            except:
                text_content = f"Mensaje de {context.get('platform_name', 'VeriHome')}"
            
            # Enviar email
            send_mail(
                subject=subject,
                message=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient.email],
                html_message=html_content,
                fail_silently=False
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending email to {recipient.email}: {str(e)}")
            return False
    
    def _should_send_notification(self, user: User, notification_type: str) -> bool:
        """Verifica si se debe enviar notificación al usuario."""
        # Verificar configuraciones de usuario (implementar según sea necesario)
        
        # Por ahora, verificaciones básicas
        if not user.is_active:
            return False
        
        if not user.email:
            return False
        
        # Verificar si el usuario ha deshabilitado este tipo de notificación
        # Esto se podría implementar con un modelo de configuraciones de usuario
        
        return True
    
    def _should_send_email_notification(self, user: User, message: Message) -> bool:
        """Verifica si se debe enviar notificación por email."""
        # Verificar si el usuario está conectado (no enviar email si está activo)
        participant = ThreadParticipant.objects.filter(
            thread=message.thread,
            user=user
        ).first()
        
        if participant and participant.last_read_at:
            # Si leyó mensajes recientemente, probablemente está activo
            if (timezone.now() - participant.last_read_at).total_seconds() < 300:  # 5 minutos
                return False
        
        # Verificar frecuencia de emails (no spam)
        recent_emails = self._count_recent_email_notifications(user)
        if recent_emails > 5:  # Máximo 5 emails por hora
            return False
        
        return True
    
    def _should_send_push_notification(self, user: User) -> bool:
        """Verifica si se debe enviar notificación push."""
        # Verificar si el usuario tiene dispositivos registrados
        # y ha dado permisos para notificaciones push
        return False  # Por ahora deshabilitado hasta implementar el servicio
    
    def _get_digest_timeframe(self, frequency: str) -> timezone.datetime:
        """Obtiene el marco temporal para el resumen."""
        now = timezone.now()
        
        if frequency == 'hourly':
            return now - timedelta(hours=1)
        elif frequency == 'daily':
            return now - timedelta(days=1)
        elif frequency == 'weekly':
            return now - timedelta(weeks=1)
        else:
            return now - timedelta(days=1)
    
    def _count_recent_email_notifications(self, user: User) -> int:
        """Cuenta notificaciones por email recientes."""
        try:
            from users.models import UserActivityLog
            
            one_hour_ago = timezone.now() - timedelta(hours=1)
            
            return UserActivityLog.objects.filter(
                user=user,
                activity_type__startswith='notification_',
                created_at__gte=one_hour_ago
            ).count()
            
        except Exception:
            return 0
    
    def _log_notification(self, notification_type: str, user: User, data: Dict[str, Any]):
        """Registra la notificación en el log de actividades."""
        try:
            from users.models import UserActivityLog
            
            UserActivityLog.objects.create(
                user=user,
                activity_type=f'notification_{notification_type}',
                description=f'Notification sent: {notification_type}',
                details=data,
                performed_by_admin=False
            )
        except Exception as e:
            logger.error(f"Error logging notification: {str(e)}")


class MessageNotificationScheduler:
    """Programador de notificaciones para el sistema de mensajería."""
    
    def __init__(self):
        self.manager = MessageNotificationManager()
    
    def process_unread_digests(self, frequency: str = 'daily') -> Dict[str, int]:
        """Procesa resúmenes de mensajes no leídos."""
        try:
            results = {'sent': 0, 'failed': 0, 'skipped': 0}
            
            # Obtener usuarios con mensajes no leídos
            users_with_unread = User.objects.filter(
                received_messages__is_read=False,
                received_messages__sent_at__gte=self.manager._get_digest_timeframe(frequency)
            ).distinct()
            
            for user in users_with_unread:
                try:
                    success = self.manager.send_unread_messages_digest(user, frequency)
                    if success:
                        results['sent'] += 1
                    else:
                        results['skipped'] += 1
                except Exception as e:
                    logger.error(f"Error sending digest to user {user.id}: {str(e)}")
                    results['failed'] += 1
            
            logger.info(f"Unread digests processed: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Error processing unread digests: {str(e)}")
            return {'sent': 0, 'failed': 0, 'skipped': 0}
    
    def check_conversation_timeouts(self) -> Dict[str, int]:
        """Verifica conversaciones sin actividad."""
        try:
            results = {'warnings_sent': 0, 'conversations_checked': 0}
            
            # Buscar conversaciones sin actividad reciente
            timeout_threshold = timezone.now() - timedelta(days=7)
            
            inactive_threads = MessageThread.objects.filter(
                status='active',
                last_message_at__lt=timeout_threshold
            )
            
            results['conversations_checked'] = inactive_threads.count()
            
            for thread in inactive_threads:
                try:
                    success = self.manager.send_conversation_timeout_warning(thread)
                    if success:
                        results['warnings_sent'] += 1
                except Exception as e:
                    logger.error(f"Error sending timeout warning for thread {thread.id}: {str(e)}")
            
            logger.info(f"Conversation timeouts checked: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Error checking conversation timeouts: {str(e)}")
            return {'warnings_sent': 0, 'conversations_checked': 0}
    
    def cleanup_old_notifications(self, days_old: int = 30) -> int:
        """Limpia notificaciones antiguas."""
        try:
            from users.models import UserActivityLog
            
            cutoff_date = timezone.now() - timedelta(days=days_old)
            
            deleted_count = UserActivityLog.objects.filter(
                activity_type__startswith='notification_',
                created_at__lt=cutoff_date
            ).delete()[0]
            
            logger.info(f"Cleaned up {deleted_count} old notifications")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up old notifications: {str(e)}")
            return 0