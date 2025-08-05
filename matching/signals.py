"""
Señales para el sistema de matching.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import MatchRequest
from .services import MatchingMessagingService


@receiver(post_save, sender=MatchRequest)
def handle_match_request_created(sender, instance, created, **kwargs):
    """
    Maneja acciones cuando se crea una nueva solicitud de match.
    """
    if created and instance.status == 'pending':
        # Notificar al arrendador sobre la nueva solicitud
        MatchingMessagingService.notify_new_match_request(instance)


@receiver(post_save, sender=MatchRequest)
def handle_match_request_status_change(sender, instance, created, **kwargs):
    """
    Maneja cambios en el estado de las solicitudes de match.
    """
    if not created:
        # Si el match fue aceptado, ya se maneja en el método accept_match
        # Si fue rechazado, ya se maneja en el método reject_match
        
        # Marcar como visto si cambió a 'viewed'
        if instance.status == 'viewed' and not instance.viewed_at:
            instance.viewed_at = timezone.now()
            instance.save(update_fields=['viewed_at'])
        
        # Manejar expiración automática
        elif instance.status == 'expired':
            from .services import MatchNotificationService
            MatchNotificationService.create_notification(
                user=instance.tenant,
                notification_type='match_expired',
                title='Solicitud de Match Expirada',
                message=f'Su solicitud para {instance.property.title} ha expirado sin respuesta.',
                match_request=instance
            )