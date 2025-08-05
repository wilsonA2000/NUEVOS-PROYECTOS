"""
User settings model for VeriHome.
Stores user preferences and notification settings.
"""

from django.db import models
from .user import User


class UserSettings(models.Model):
    """Modelo para configuraciones del usuario."""
    
    NOTIFICATION_FREQUENCIES = [
        ('instant', 'Instantáneo'),
        ('daily', 'Diario'),
        ('weekly', 'Semanal'),
        ('monthly', 'Mensual'),
        ('never', 'Nunca'),
    ]
    
    LANGUAGES = [
        ('es', 'Español'),
        ('en', 'Inglés'),
        ('pt', 'Portugués'),
    ]
    
    THEMES = [
        ('light', 'Claro'),
        ('dark', 'Oscuro'),
        ('auto', 'Automático'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='settings'
    )
    
    # Preferencias de notificación
    email_notifications = models.BooleanField(
        'Notificaciones por email',
        default=True
    )
    push_notifications = models.BooleanField(
        'Notificaciones push',
        default=True
    )
    sms_notifications = models.BooleanField(
        'Notificaciones SMS',
        default=False
    )
    whatsapp_notifications = models.BooleanField(
        'Notificaciones WhatsApp',
        default=False
    )
    
    # Tipos de notificaciones específicas
    notify_new_messages = models.BooleanField(
        'Notificar nuevos mensajes',
        default=True
    )
    notify_property_updates = models.BooleanField(
        'Notificar actualizaciones de propiedades',
        default=True
    )
    notify_contract_updates = models.BooleanField(
        'Notificar actualizaciones de contratos',
        default=True
    )
    notify_payment_reminders = models.BooleanField(
        'Notificar recordatorios de pago',
        default=True
    )
    notify_new_ratings = models.BooleanField(
        'Notificar nuevas calificaciones',
        default=True
    )
    notify_marketing = models.BooleanField(
        'Notificaciones de marketing',
        default=False
    )
    notify_system_updates = models.BooleanField(
        'Notificaciones del sistema',
        default=True
    )
    
    # Frecuencia de notificaciones
    notification_frequency = models.CharField(
        'Frecuencia de notificaciones',
        max_length=10,
        choices=NOTIFICATION_FREQUENCIES,
        default='instant'
    )
    
    # Preferencias de idioma y tema
    language = models.CharField(
        'Idioma',
        max_length=2,
        choices=LANGUAGES,
        default='es'
    )
    theme = models.CharField(
        'Tema',
        max_length=10,
        choices=THEMES,
        default='light'
    )
    
    # Privacidad
    profile_visibility = models.CharField(
        'Visibilidad del perfil',
        max_length=20,
        choices=[
            ('public', 'Público'),
            ('registered', 'Solo usuarios registrados'),
            ('contacts', 'Solo contactos'),
            ('private', 'Privado'),
        ],
        default='registered'
    )
    show_email = models.BooleanField(
        'Mostrar email en perfil',
        default=False
    )
    show_phone = models.BooleanField(
        'Mostrar teléfono en perfil',
        default=False
    )
    show_location = models.BooleanField(
        'Mostrar ubicación en perfil',
        default=True
    )
    
    # Configuraciones de búsqueda
    default_search_radius_km = models.PositiveIntegerField(
        'Radio de búsqueda por defecto (km)',
        default=10
    )
    save_search_history = models.BooleanField(
        'Guardar historial de búsquedas',
        default=True
    )
    
    # Configuraciones de sesión
    auto_logout_minutes = models.PositiveIntegerField(
        'Auto cerrar sesión (minutos)',
        default=0,  # 0 = deshabilitado
        help_text='0 para deshabilitar'
    )
    remember_me_days = models.PositiveIntegerField(
        'Recordar sesión (días)',
        default=30
    )
    
    # Configuraciones adicionales
    currency = models.CharField(
        'Moneda preferida',
        max_length=3,
        choices=[
            ('COP', 'Pesos Colombianos'),
            ('USD', 'Dólares Americanos'),
        ],
        default='COP'
    )
    measurement_unit = models.CharField(
        'Unidad de medida',
        max_length=10,
        choices=[
            ('metric', 'Métrico (m²)'),
            ('imperial', 'Imperial (ft²)'),
        ],
        default='metric'
    )
    
    # Metadatos
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Configuración de Usuario'
        verbose_name_plural = 'Configuraciones de Usuario'
        
    def __str__(self):
        return f"Configuración de {self.user.get_full_name()}"