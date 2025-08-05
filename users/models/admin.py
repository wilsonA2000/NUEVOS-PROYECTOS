"""
Admin-related models for VeriHome.
Contains models for admin impersonation, action logging, and notifications.
"""

from django.db import models
from django.utils import timezone
from .user import User


class AdminImpersonationSession(models.Model):
    """Modelo para registrar sesiones de suplantación de administrador."""
    
    admin_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='admin_sessions',
        limit_choices_to={'is_staff': True}
    )
    impersonated_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='impersonation_sessions'
    )
    reason = models.TextField('Razón de suplantación')
    start_time = models.DateTimeField('Hora de inicio', auto_now_add=True, null=True)
    end_time = models.DateTimeField('Hora de fin', null=True, blank=True)
    ip_address = models.GenericIPAddressField('Dirección IP')
    user_agent = models.CharField('User Agent', max_length=255)
    
    class Meta:
        verbose_name = 'Sesión de Suplantación'
        verbose_name_plural = 'Sesiones de Suplantación'
        ordering = ['-start_time']
        
    def __str__(self):
        return f"{self.admin_user} suplantando a {self.impersonated_user}"
    
    def end_session(self):
        """Finaliza la sesión de suplantación."""
        self.end_time = timezone.now()
        self.save()
    
    @property
    def duration(self):
        """Calcula la duración de la sesión."""
        if self.end_time:
            return self.end_time - self.start_time
        return timezone.now() - self.start_time
    
    @property
    def is_active(self):
        """Verifica si la sesión está activa."""
        return self.end_time is None


class AdminActionLog(models.Model):
    """Modelo para registrar todas las acciones administrativas."""
    
    ACTION_TYPES = [
        ('create', 'Crear'),
        ('update', 'Actualizar'),
        ('delete', 'Eliminar'),
        ('view', 'Ver'),
        ('export', 'Exportar'),
        ('impersonate', 'Suplantar'),
        ('login', 'Iniciar sesión'),
        ('logout', 'Cerrar sesión'),
        ('password_reset', 'Restablecer contraseña'),
        ('permission_change', 'Cambiar permisos'),
        ('bulk_action', 'Acción masiva'),
        ('system_config', 'Configuración del sistema'),
        ('data_migration', 'Migración de datos'),
        ('security_action', 'Acción de seguridad'),
        ('other', 'Otro'),
    ]
    
    admin_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='admin_actions'
    )
    impersonation_session = models.ForeignKey(
        AdminImpersonationSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='actions'
    )
    action_type = models.CharField('Tipo de acción', max_length=20, choices=ACTION_TYPES)
    model_name = models.CharField('Modelo', max_length=100, blank=True)
    object_id = models.CharField('ID del objeto', max_length=255, blank=True)
    object_repr = models.CharField('Representación del objeto', max_length=255, blank=True)
    description = models.TextField('Descripción', blank=True, default='')
    changes = models.JSONField('Cambios', default=dict, blank=True)
    ip_address = models.GenericIPAddressField('Dirección IP', null=True, blank=True)
    user_agent = models.CharField('User Agent', max_length=255, blank=True)
    timestamp = models.DateTimeField('Fecha y hora', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Registro de Acción Administrativa'
        verbose_name_plural = 'Registros de Acciones Administrativas'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['admin_user', '-timestamp']),
            models.Index(fields=['action_type', '-timestamp']),
        ]
        
    def __str__(self):
        return f"{self.admin_user} - {self.get_action_type_display()} - {self.timestamp}"


class UserActionNotification(models.Model):
    """Modelo para notificaciones de acciones de usuario."""
    
    NOTIFICATION_TYPES = [
        ('admin_action', 'Acción administrativa'),
        ('security_alert', 'Alerta de seguridad'),
        ('account_change', 'Cambio en la cuenta'),
        ('data_access', 'Acceso a datos'),
        ('system_notification', 'Notificación del sistema'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='action_notifications'
    )
    notification_type = models.CharField(
        'Tipo de notificación',
        max_length=20,
        choices=NOTIFICATION_TYPES
    )
    title = models.CharField('Título', max_length=200)
    message = models.TextField('Mensaje')
    action_log = models.ForeignKey(
        AdminActionLog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    is_read = models.BooleanField('Leída', default=False)
    is_important = models.BooleanField('Importante', default=False)
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    read_at = models.DateTimeField('Fecha de lectura', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Notificación de Acción'
        verbose_name_plural = 'Notificaciones de Acciones'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.title} - {self.user}"
    
    def mark_as_read(self):
        """Marca la notificación como leída."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()


class AdminSessionSummary(models.Model):
    """Modelo para resumir la actividad de las sesiones de administrador."""
    
    admin_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='session_summaries'
    )
    date = models.DateField('Fecha')
    total_actions = models.PositiveIntegerField('Total de acciones', default=0)
    actions_by_type = models.JSONField('Acciones por tipo', default=dict)
    impersonation_time = models.DurationField('Tiempo de suplantación', default=timezone.timedelta)
    unique_users_affected = models.PositiveIntegerField('Usuarios únicos afectados', default=0)
    models_accessed = models.JSONField('Modelos accedidos', default=list)
    critical_actions = models.PositiveIntegerField('Acciones críticas', default=0)
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Resumen de Sesión Administrativa'
        verbose_name_plural = 'Resúmenes de Sesiones Administrativas'
        unique_together = [['admin_user', 'date']]
        ordering = ['-date']
        
    def __str__(self):
        return f"{self.admin_user} - {self.date} - {self.total_actions} acciones"