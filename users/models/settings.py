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
    
    # Tipos de notificaciones específicas (usando campos existentes en DB)
    message_notifications = models.BooleanField(
        'Notificar nuevos mensajes',
        default=True
    )
    property_alerts = models.BooleanField(
        'Notificar actualizaciones de propiedades',
        default=True
    )
    payment_reminders = models.BooleanField(
        'Notificar recordatorios de pago',
        default=True
    )
    newsletter = models.BooleanField(
        'Notificaciones de marketing',
        default=False
    )
    
    # Preferencias de idioma y tema (usando campos existentes)
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
    
    # Privacidad (usando campos existentes)
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
    show_contact_info = models.BooleanField(
        'Mostrar información de contacto',
        default=False
    )
    show_property_history = models.BooleanField(
        'Mostrar historial de propiedades',
        default=True
    )
    allow_messages = models.BooleanField(
        'Permitir mensajes',
        default=True
    )
    
    # Configuraciones adicionales (usando campos existentes)
    currency = models.CharField(
        'Moneda preferida',
        max_length=3,
        choices=[
            ('COP', 'Pesos Colombianos'),
            ('USD', 'Dólares Americanos'),
        ],
        default='COP'
    )
    
    # Configuraciones existentes en DB
    timezone = models.CharField(
        'Zona horaria',
        max_length=50,
        default='America/Bogota'
    )
    date_format = models.CharField(
        'Formato de fecha',
        max_length=20,
        default='DD/MM/YYYY'
    )
    two_factor_enabled = models.BooleanField(
        'Autenticación de dos factores',
        default=False
    )
    login_notifications = models.BooleanField(
        'Notificaciones de inicio de sesión',
        default=True
    )
    session_timeout = models.PositiveIntegerField(
        'Tiempo de sesión (minutos)',
        default=30
    )
    
    # Metadatos
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Configuración de Usuario'
        verbose_name_plural = 'Configuraciones de Usuario'
        
    def __str__(self):
        return f"Configuración de {self.user.get_full_name()}"