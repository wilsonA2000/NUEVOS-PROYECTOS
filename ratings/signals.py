"""
Señales para el sistema de calificaciones de VeriHome.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Rating, RatingResponse, RatingReport, UserRatingProfile


@receiver(post_save, sender=Rating)
def update_rating_profile_on_rating_save(sender, instance, created, **kwargs):
    """
    Actualiza el perfil de calificaciones cuando se crea o actualiza una calificación.
    """
    # Obtener o crear el perfil de calificaciones del usuario calificado
    profile, created = UserRatingProfile.objects.get_or_create(user=instance.reviewee)
    
    # Actualizar estadísticas
    profile.update_statistics()


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
def update_rating_on_response(sender, instance, created, **kwargs):
    """
    Actualiza la calificación cuando se añade una respuesta.
    """
    if created:
        # Marcar la calificación como respondida
        rating = instance.rating
        # Aquí se podrían realizar acciones adicionales si es necesario
        rating.save(update_fields=['updated_at'])


@receiver(post_save, sender=RatingReport)
def handle_rating_report(sender, instance, created, **kwargs):
    """
    Maneja los reportes de calificaciones.
    """
    if created:
        # Marcar la calificación como reportada
        rating = instance.rating
        rating.is_flagged = True
        rating.save(update_fields=['is_flagged', 'updated_at'])