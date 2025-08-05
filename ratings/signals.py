"""
Señales mejoradas para el sistema de calificaciones de VeriHome.
Incluye automatización de notificaciones y actualizaciones.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from .models import Rating, RatingResponse, RatingReport, UserRatingProfile
from .notifications import RatingNotificationManager
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Rating)
def update_rating_profile_on_rating_save(sender, instance, created, **kwargs):
    """
    Actualiza el perfil de calificaciones y envía notificaciones cuando se crea o actualiza una calificación.
    """
    try:
        # Obtener o crear el perfil de calificaciones del usuario calificado
        profile, profile_created = UserRatingProfile.objects.get_or_create(user=instance.reviewee)
        
        # Solo procesar si la calificación está aprobada
        if instance.moderation_status == 'approved' and instance.is_active:
            # Actualizar estadísticas
            old_avg_rating = profile.average_rating
            old_total = profile.total_ratings_received
            
            profile.update_statistics()
            
            # Si es una nueva calificación aprobada, enviar notificaciones
            if created:
                notification_manager = RatingNotificationManager()
                
                # Notificar al usuario calificado
                notification_manager.send_rating_received_notification(instance)
                
                # Verificar si el usuario alcanzó nuevos hitos
                _check_and_notify_milestones(instance.reviewee, profile, old_avg_rating, old_total)
                
                # Enviar alerta si es una calificación baja
                if instance.overall_rating <= 4:
                    notification_manager.send_low_rating_alert(instance.reviewee, instance)
            
    except Exception as e:
        logger.error(f"Error updating rating profile: {str(e)}")


@receiver(post_delete, sender=Rating)
def update_rating_profile_on_rating_delete(sender, instance, **kwargs):
    """
    Actualiza el perfil de calificaciones cuando se elimina una calificación.
    """
    try:
        # Obtener el perfil de calificaciones del usuario calificado
        profile = UserRatingProfile.objects.get(user=instance.reviewee)
        
        # Actualizar estadísticas
        profile.update_statistics()
    except UserRatingProfile.DoesNotExist:
        pass  # No hay perfil que actualizar


@receiver(post_save, sender=RatingResponse)
def handle_rating_response(sender, instance, created, **kwargs):
    """
    Maneja las respuestas a calificaciones y envía notificaciones.
    """
    if created:
        try:
            # Marcar la calificación como respondida
            rating = instance.rating
            rating.save(update_fields=['updated_at'])
            
            # Enviar notificación al autor original de la calificación
            notification_manager = RatingNotificationManager()
            notification_manager.send_rating_response_notification(instance)
            
        except Exception as e:
            logger.error(f"Error handling rating response: {str(e)}")


@receiver(post_save, sender=RatingReport)
def handle_rating_report(sender, instance, created, **kwargs):
    """
    Maneja los reportes de calificaciones y notifica a moderadores.
    """
    if created:
        try:
            # Marcar la calificación como reportada
            rating = instance.rating
            rating.is_flagged = True
            rating.save(update_fields=['is_flagged', 'updated_at'])
            
            # Enviar alerta a moderadores
            notification_manager = RatingNotificationManager()
            notification_manager.send_moderation_alert(instance)
            
        except Exception as e:
            logger.error(f"Error handling rating report: {str(e)}")


def _check_and_notify_milestones(user, profile, old_avg_rating, old_total):
    """
    Verifica si el usuario alcanzó nuevos hitos y envía notificaciones.
    """
    try:
        notification_manager = RatingNotificationManager()
        
        # Verificar hito de primera calificación
        if old_total == 0 and profile.total_ratings_received == 1:
            notification_manager.send_milestone_achievement_notification(user, 'first_rating')
        
        # Verificar hito de excelencia (9+ promedio)
        if old_avg_rating < 9.0 and profile.average_rating >= 9.0:
            notification_manager.send_milestone_achievement_notification(user, 'excellent_rating')
        
        # Verificar hito de miembro confiable (10+ calificaciones)
        if old_total < 10 and profile.total_ratings_received >= 10:
            notification_manager.send_milestone_achievement_notification(user, 'trusted_member')
        
        # Verificar hito de nivel experto (50+ calificaciones con 8.5+ promedio)
        if (old_total < 50 and profile.total_ratings_received >= 50 and 
            profile.average_rating >= 8.5):
            notification_manager.send_milestone_achievement_notification(user, 'expert_level')
            
    except Exception as e:
        logger.error(f"Error checking milestones: {str(e)}")


# Signal para contratos completados
from django.apps import apps

def setup_contract_signals():
    """
    Configura signals para contratos completados (se ejecuta después de que las apps se cargan).
    """
    try:
        Contract = apps.get_model('contracts', 'Contract')
        
        @receiver(post_save, sender=Contract)
        def handle_contract_completion(sender, instance, created, **kwargs):
            """
            Maneja la finalización de contratos y crea invitaciones de calificación.
            """
            if not created and instance.status == 'completed':
                try:
                    from .models import RatingInvitation
                    
                    # Verificar si ya existen invitaciones para este contrato
                    existing_invitations = RatingInvitation.objects.filter(contract=instance)
                    
                    if not existing_invitations.exists():
                        # Crear invitaciones automáticas
                        notification_manager = RatingNotificationManager()
                        
                        # Invitación del primary al secondary
                        notification_manager.send_rating_invitation(
                            contract=instance,
                            inviter=instance.primary_party,
                            invitee=instance.secondary_party
                        )
                        
                        # Invitación del secondary al primary
                        notification_manager.send_rating_invitation(
                            contract=instance,
                            inviter=instance.secondary_party,
                            invitee=instance.primary_party
                        )
                        
                except Exception as e:
                    logger.error(f"Error creating rating invitations for contract {instance.id}: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error setting up contract signals: {str(e)}")


# Configurar signals de contratos cuando la app esté lista
from django.apps import AppConfig

class RatingsAppConfig(AppConfig):
    """Configuración de la app de calificaciones."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ratings'
    
    def ready(self):
        """Se ejecuta cuando la app está lista."""
        setup_contract_signals()