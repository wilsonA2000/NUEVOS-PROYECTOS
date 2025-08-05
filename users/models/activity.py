"""
User activity logging model for VeriHome.
Tracks user actions and activity history.
"""

from django.db import models
from django.utils import timezone
from .user import User


class UserActivityLog(models.Model):
    """Modelo para registrar la actividad del usuario."""
    
    ACTIVITY_TYPES = [
        ('login', 'Inicio de sesión'),
        ('logout', 'Cierre de sesión'),
        ('password_change', 'Cambio de contraseña'),
        ('password_reset', 'Restablecimiento de contraseña'),
        ('profile_update', 'Actualización de perfil'),
        ('property_view', 'Vista de propiedad'),
        ('property_create', 'Creación de propiedad'),
        ('property_update', 'Actualización de propiedad'),
        ('property_delete', 'Eliminación de propiedad'),
        ('property_favorite', 'Propiedad favorita'),
        ('property_unfavorite', 'Propiedad no favorita'),
        ('property_inquiry', 'Consulta de propiedad'),
        ('contract_create', 'Creación de contrato'),
        ('contract_sign', 'Firma de contrato'),
        ('contract_update', 'Actualización de contrato'),
        ('contract_cancel', 'Cancelación de contrato'),
        ('payment_made', 'Pago realizado'),
        ('payment_received', 'Pago recibido'),
        ('message_sent', 'Mensaje enviado'),
        ('message_read', 'Mensaje leído'),
        ('rating_given', 'Calificación dada'),
        ('rating_received', 'Calificación recibida'),
        ('document_upload', 'Carga de documento'),
        ('document_download', 'Descarga de documento'),
        ('account_verify', 'Verificación de cuenta'),
        ('settings_change', 'Cambio de configuración'),
        ('support_ticket', 'Ticket de soporte'),
        ('api_access', 'Acceso API'),
        ('export_data', 'Exportación de datos'),
        ('import_data', 'Importación de datos'),
        ('search', 'Búsqueda'),
        ('filter_apply', 'Aplicación de filtros'),
        ('notification_read', 'Notificación leída'),
        ('other', 'Otro'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='activity_logs'
    )
    activity_type = models.CharField(
        'Tipo de actividad',
        max_length=30,
        choices=ACTIVITY_TYPES
    )
    description = models.TextField('Descripción', blank=True)
    
    # Información relacionada
    model_name = models.CharField('Modelo', max_length=100, blank=True)
    object_id = models.CharField('ID del objeto', max_length=255, blank=True)
    object_repr = models.CharField('Representación del objeto', max_length=255, blank=True)
    
    # Metadatos adicionales
    metadata = models.JSONField('Metadatos', default=dict, blank=True)
    
    # Información de la sesión
    ip_address = models.GenericIPAddressField('Dirección IP', null=True, blank=True)
    user_agent = models.CharField('User Agent', max_length=255, blank=True)
    session_key = models.CharField('Clave de sesión', max_length=40, blank=True)
    
    # Información de ubicación (opcional)
    latitude = models.DecimalField(
        'Latitud',
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )
    longitude = models.DecimalField(
        'Longitud',
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )
    location_city = models.CharField('Ciudad', max_length=100, blank=True)
    location_country = models.CharField('País', max_length=100, blank=True)
    
    # Rendimiento
    response_time_ms = models.PositiveIntegerField(
        'Tiempo de respuesta (ms)',
        null=True,
        blank=True
    )
    
    # Timestamps
    timestamp = models.DateTimeField('Fecha y hora', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Registro de Actividad'
        verbose_name_plural = 'Registros de Actividad'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['activity_type', '-timestamp']),
            models.Index(fields=['user', 'activity_type', '-timestamp']),
        ]
        
    def __str__(self):
        return f"{self.user} - {self.get_activity_type_display()} - {self.timestamp}"
    
    @classmethod
    def log_activity(cls, user, activity_type, **kwargs):
        """
        Método de conveniencia para registrar actividad.
        
        Args:
            user: Usuario que realiza la actividad
            activity_type: Tipo de actividad (de ACTIVITY_TYPES)
            **kwargs: Argumentos adicionales para el registro
        
        Returns:
            UserActivityLog: Instancia del registro creado
        """
        # Extraer request si está disponible
        request = kwargs.pop('request', None)
        
        # Preparar los datos del registro
        log_data = {
            'user': user,
            'activity_type': activity_type,
        }
        
        # Si hay request, extraer información
        if request:
            log_data['ip_address'] = cls.get_client_ip(request)
            log_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')[:255]
            if hasattr(request, 'session') and request.session.session_key:
                log_data['session_key'] = request.session.session_key
        
        # Agregar cualquier kwargs adicional
        log_data.update(kwargs)
        
        # Crear y retornar el registro
        return cls.objects.create(**log_data)
    
    @staticmethod
    def get_client_ip(request):
        """Obtiene la IP real del cliente considerando proxies."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @classmethod
    def get_user_stats(cls, user, days=30):
        """
        Obtiene estadísticas de actividad del usuario.
        
        Args:
            user: Usuario para obtener estadísticas
            days: Número de días hacia atrás para calcular
        
        Returns:
            dict: Diccionario con estadísticas
        """
        from django.db.models import Count, Avg
        from datetime import timedelta
        
        since = timezone.now() - timedelta(days=days)
        logs = cls.objects.filter(user=user, timestamp__gte=since)
        
        # Estadísticas básicas
        stats = logs.aggregate(
            total_activities=Count('id'),
            avg_response_time=Avg('response_time_ms')
        )
        
        # Actividades por tipo
        activities_by_type = logs.values('activity_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        stats['activities_by_type'] = list(activities_by_type)
        stats['most_common_activity'] = activities_by_type[0] if activities_by_type else None
        
        # Actividad por día
        stats['daily_activity'] = logs.extra(
            select={'day': 'date(timestamp)'}
        ).values('day').annotate(
            count=Count('id')
        ).order_by('day')
        
        return stats