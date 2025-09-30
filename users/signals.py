"""
Signals para la aplicación de usuarios.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, LandlordProfile, TenantProfile, ServiceProviderProfile, UserSettings
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Crear el perfil correspondiente cuando se crea un usuario."""
    if created:
        # Crear configuración de usuario
        UserSettings.objects.get_or_create(user=instance)
        
        # Crear perfil según el tipo de usuario
        if instance.user_type == 'landlord':
            LandlordProfile.objects.get_or_create(
                user=instance,
                defaults={
                    'bio': f'Soy {instance.get_full_name()}, un arrendador en VeriHome.',
                    'years_experience': 1,
                }
            )
        elif instance.user_type == 'tenant':
            TenantProfile.objects.get_or_create(
                user=instance,
                defaults={
                    'bio': f'Soy {instance.get_full_name()}, busco propiedades en VeriHome.',
                }
            )
        elif instance.user_type == 'service_provider':
            ServiceProviderProfile.objects.get_or_create(
                user=instance,
                defaults={
                    'company_name': f'{instance.get_full_name()} Services',
                    'bio': f'Proveedor de servicios profesionales en VeriHome.',
                }
            )
        
        # Enviar notificación de bienvenida
        try:
            from core.notification_service import notification_service
            notification_service.notify_welcome(instance)
        except Exception as e:
            logger.error(f"Error enviando notificación de bienvenida: {str(e)}")


@receiver(post_save, sender=User)
def update_user_profile(sender, instance, created, **kwargs):
    """Actualizar el perfil cuando se actualiza el usuario."""
    if not created:
        # Actualizar información básica en el perfil
        if instance.user_type == 'landlord' and hasattr(instance, 'landlord_profile'):
            profile = instance.landlord_profile
            # Actualizar campos relevantes si es necesario
            profile.save()
        elif instance.user_type == 'tenant' and hasattr(instance, 'tenant_profile'):
            profile = instance.tenant_profile
            # Actualizar campos relevantes si es necesario
            profile.save()
        elif instance.user_type == 'service_provider' and hasattr(instance, 'service_provider_profile'):
            profile = instance.service_provider_profile
            # Actualizar campos relevantes si es necesario
            profile.save()