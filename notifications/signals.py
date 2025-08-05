"""
Señales para el sistema de notificaciones de VeriHome.
Maneja eventos automáticos y triggers de notificaciones.
"""

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import NotificationPreference, Notification, NotificationDelivery
from .notification_service import notification_service
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def create_notification_preferences(sender, instance, created, **kwargs):
    """Crea preferencias de notificación por defecto para nuevos usuarios."""
    if created:
        try:
            NotificationPreference.objects.create(
                user=instance,
                is_enabled=True,
                allow_email=True,
                allow_push=True,
                allow_in_app=True,
                allow_sms=False,
                system_notifications=True,
                security_notifications=True,
                property_notifications=True,
                contract_notifications=True,
                payment_notifications=True,
                message_notifications=True,
                rating_notifications=True,
                marketing_notifications=False,
                email_frequency='immediate',
                digest_enabled=True,
                digest_frequency='daily'
            )
            
            # Enviar notificación de bienvenida
            notification_service.create_notification(
                recipient=instance,
                title="¡Bienvenido a VeriHome!",
                message="Tu cuenta ha sido creada exitosamente. Explora todas las funcionalidades de nuestra plataforma inmobiliaria.",
                template_name="welcome",
                priority="normal",
                channels=['in_app', 'email'],
                action_url="/dashboard",
                context={
                    'user_name': instance.get_full_name(),
                    'platform_name': 'VeriHome'
                }
            )
            
            logger.info(f"Notification preferences created for user {instance.id}")
            
        except Exception as e:
            logger.error(f"Error creating notification preferences for user {instance.id}: {str(e)}")


@receiver(post_save, sender=Notification)
def handle_notification_created(sender, instance, created, **kwargs):
    """Maneja eventos cuando se crea una notificación."""
    if created:
        try:
            # Log de creación
            logger.info(f"Notification created: {instance.id} for user {instance.recipient.id}")
            
            # Actualizar estadísticas del usuario si es necesario
            # (esto se puede usar para gamificación, badges, etc.)
            
        except Exception as e:
            logger.error(f"Error handling notification creation: {str(e)}")


@receiver(pre_save, sender=Notification)
def handle_notification_status_change(sender, instance, **kwargs):
    """Maneja cambios en el estado de las notificaciones."""
    if instance.pk:  # Solo para notificaciones existentes
        try:
            old_instance = Notification.objects.get(pk=instance.pk)
            
            # Detectar cambio de estado a 'read'
            if not old_instance.is_read and instance.is_read:
                # Actualizar fecha de lectura si no está establecida
                if not instance.read_at:
                    instance.read_at = timezone.now()
                
                # Log de lectura
                logger.info(f"Notification {instance.id} marked as read by user {instance.recipient.id}")
            
            # Detectar cambio de estado de entrega
            if old_instance.status != instance.status:
                logger.info(f"Notification {instance.id} status changed from {old_instance.status} to {instance.status}")
                
        except Notification.DoesNotExist:
            pass
        except Exception as e:
            logger.error(f"Error handling notification status change: {str(e)}")


@receiver(post_save, sender=NotificationDelivery)
def handle_delivery_status_change(sender, instance, created, **kwargs):
    """Maneja cambios en el estado de las entregas."""
    try:
        if not created:  # Solo para actualizaciones
            # Actualizar estado de la notificación principal si es necesario
            notification = instance.notification
            
            # Si todas las entregas fallaron, marcar notificación como fallida
            deliveries = notification.deliveries.all()
            all_failed = all(delivery.status == 'failed' for delivery in deliveries)
            
            if all_failed and notification.status != 'failed':
                notification.mark_as_failed('All delivery attempts failed')
            
            # Si al menos una entrega fue exitosa, marcar como enviada
            any_sent = any(delivery.status in ['sent', 'delivered'] for delivery in deliveries)
            
            if any_sent and notification.status == 'pending':
                notification.mark_as_sent()
        
        logger.debug(f"Delivery {instance.id} status: {instance.status}")
        
    except Exception as e:
        logger.error(f"Error handling delivery status change: {str(e)}")


# Señales para otros módulos que activan notificaciones

@receiver(post_save, sender='properties.Property')
def property_created_notification(sender, instance, created, **kwargs):
    """Notificación cuando se crea una nueva propiedad."""
    if created:
        try:
            # Notificar al propietario
            notification_service.create_notification(
                recipient=instance.landlord,
                title="Propiedad publicada exitosamente",
                message=f"Tu propiedad '{instance.title}' ha sido publicada en VeriHome y ya está visible para potenciales inquilinos.",
                template_name="property_published",
                priority="normal",
                channels=['in_app', 'email'],
                action_url=f"/properties/{instance.id}",
                content_object=instance,
                context={
                    'property_title': instance.title,
                    'property_type': instance.get_property_type_display(),
                    'property_url': f"/properties/{instance.id}",
                    'landlord_name': instance.landlord.get_full_name()
                }
            )
            
        except Exception as e:
            logger.error(f"Error sending property created notification: {str(e)}")


@receiver(post_save, sender='contracts.Contract')
def contract_created_notification(sender, instance, created, **kwargs):
    """Notificación cuando se crea un nuevo contrato."""
    if created:
        try:
            # Notificar a ambas partes
            for user in [instance.primary_party, instance.secondary_party]:
                if user:
                    notification_service.create_notification(
                        recipient=user,
                        title="Nuevo contrato creado",
                        message=f"Se ha creado un nuevo contrato. Revisa los términos y procede con la firma digital.",
                        template_name="contract_created",
                        priority="high",
                        channels=['in_app', 'email'],
                        action_url=f"/contracts/{instance.id}",
                        content_object=instance,
                        context={
                            'contract_id': str(instance.id),
                            'contract_type': instance.get_contract_type_display(),
                            'other_party': instance.secondary_party.get_full_name() if user == instance.primary_party else instance.primary_party.get_full_name(),
                            'recipient_name': user.get_full_name()
                        }
                    )
                    
        except Exception as e:
            logger.error(f"Error sending contract created notification: {str(e)}")


@receiver(post_save, sender='payments.Transaction')
def payment_notification(sender, instance, created, **kwargs):
    """Notificación cuando se procesa un pago."""
    if created:
        try:
            # Determinar tipo de notificación basado en estado del pago
            if instance.status == 'completed':
                title = "Pago procesado exitosamente"
                message = f"Tu pago de ${instance.amount} ha sido procesado correctamente."
                template_name = "payment_received"
                priority = "normal"
            elif instance.status == 'failed':
                title = "Error en el procesamiento del pago"
                message = f"Hubo un problema procesando tu pago de ${instance.amount}. Por favor, intenta nuevamente."
                template_name = "payment_failed"
                priority = "high"
            else:
                return  # No enviar notificación para otros estados
            
            # Notificar al usuario
            notification_service.create_notification(
                recipient=instance.user,
                title=title,
                message=message,
                template_name=template_name,
                priority=priority,
                channels=['in_app', 'email'],
                action_url=f"/payments/{instance.id}",
                content_object=instance,
                context={
                    'amount': str(instance.amount),
                    'transaction_id': str(instance.id),
                    'payment_method': instance.payment_method,
                    'user_name': instance.user.get_full_name()
                }
            )
            
        except Exception as e:
            logger.error(f"Error sending payment notification: {str(e)}")


@receiver(post_save, sender='ratings.Rating')
def rating_notification(sender, instance, created, **kwargs):
    """Notificación cuando se recibe una nueva calificación."""
    if created:
        try:
            # Notificar al usuario calificado
            notification_service.create_notification(
                recipient=instance.rated_user,
                title="Nueva calificación recibida",
                message=f"Has recibido una nueva calificación de {instance.rating_user.get_full_name()}. Tu puntuación promedio se ha actualizado.",
                template_name="rating_received",
                priority="normal",
                channels=['in_app', 'email'],
                action_url=f"/ratings/{instance.id}",
                content_object=instance,
                context={
                    'rating_score': instance.score,
                    'rating_comment': instance.comment[:100] if instance.comment else '',
                    'rating_user': instance.rating_user.get_full_name(),
                    'rated_user': instance.rated_user.get_full_name()
                }
            )
            
        except Exception as e:
            logger.error(f"Error sending rating notification: {str(e)}")


@receiver(post_save, sender='messaging.Message')
def message_notification(sender, instance, created, **kwargs):
    """Notificación cuando se recibe un nuevo mensaje."""
    if created:
        try:
            # Solo notificar si no es el remitente
            if instance.recipient != instance.sender:
                notification_service.create_notification(
                    recipient=instance.recipient,
                    title=f"Nuevo mensaje de {instance.sender.get_full_name()}",
                    message=instance.content[:100] + "..." if len(instance.content) > 100 else instance.content,
                    template_name="message_received",
                    priority="normal",
                    channels=['in_app', 'email'],
                    action_url=f"/messages/thread/{instance.thread.id}",
                    content_object=instance,
                    context={
                        'sender_name': instance.sender.get_full_name(),
                        'message_content': instance.content,
                        'thread_subject': instance.thread.subject,
                        'recipient_name': instance.recipient.get_full_name()
                    }
                )
                
        except Exception as e:
            logger.error(f"Error sending message notification: {str(e)}")


# Señales para sistema de alertas

@receiver(post_save, sender='core.SystemAlert')
def system_alert_notification(sender, instance, created, **kwargs):
    """Notificación para alertas del sistema."""
    if created and instance.is_active:
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            # Determinar destinatarios basado en el tipo de alerta
            if instance.alert_type == 'maintenance':
                # Notificar a todos los usuarios activos
                recipients = User.objects.filter(is_active=True)
            elif instance.alert_type == 'security':
                # Notificar solo a staff
                recipients = User.objects.filter(is_staff=True)
            else:
                # Por defecto, notificar a staff
                recipients = User.objects.filter(is_staff=True)
            
            # Enviar notificación masiva
            notification_service.send_bulk_notifications(
                recipients=list(recipients),
                title=f"Alerta del Sistema: {instance.title}",
                message=instance.message,
                template_name="system_alert",
                priority="urgent" if instance.is_critical else "high",
                channels=['in_app', 'email'],
                data={
                    'alert_type': instance.alert_type,
                    'is_critical': instance.is_critical,
                    'alert_id': str(instance.id)
                }
            )
            
        except Exception as e:
            logger.error(f"Error sending system alert notification: {str(e)}")


# Limpieza automática

@receiver(post_delete, sender=Notification)
def cleanup_notification_deliveries(sender, instance, **kwargs):
    """Limpia entregas asociadas cuando se elimina una notificación."""
    try:
        # Las entregas se eliminan automáticamente por CASCADE
        logger.info(f"Notification {instance.id} deleted")
        
    except Exception as e:
        logger.error(f"Error cleaning up notification deliveries: {str(e)}")