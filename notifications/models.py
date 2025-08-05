"""
Modelos del sistema de notificaciones para VeriHome.
Sistema integral de notificaciones con soporte para múltiples canales.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.utils import timezone
from django.core.validators import RegexValidator
import uuid
import json

User = get_user_model()


class NotificationChannel(models.Model):
    """Canales de notificación disponibles."""
    
    CHANNEL_TYPES = [
        ('in_app', 'Notificación en Aplicación'),
        ('email', 'Correo Electrónico'),
        ('sms', 'SMS'),
        ('push', 'Push Notification'),
        ('webhook', 'Webhook'),
        ('slack', 'Slack'),
        ('whatsapp', 'WhatsApp'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Activo'),
        ('inactive', 'Inactivo'),
        ('maintenance', 'Mantenimiento'),
        ('deprecated', 'Obsoleto'),
    ]
    
    name = models.CharField('Nombre del Canal', max_length=100, unique=True)
    channel_type = models.CharField('Tipo de Canal', max_length=20, choices=CHANNEL_TYPES)
    description = models.TextField('Descripción', blank=True)
    
    # Configuración del canal
    configuration = models.JSONField(
        'Configuración',
        default=dict,
        help_text='Configuración específica del canal (API keys, URLs, etc.)'
    )
    
    # Estado y control
    status = models.CharField('Estado', max_length=20, choices=STATUS_CHOICES, default='active')
    is_default = models.BooleanField('Canal por defecto', default=False)
    priority = models.PositiveIntegerField('Prioridad', default=1, help_text='1 = Alta, 10 = Baja')
    
    # Límites y configuración
    rate_limit_per_minute = models.PositiveIntegerField('Límite por minuto', default=60)
    rate_limit_per_hour = models.PositiveIntegerField('Límite por hora', default=1000)
    retry_attempts = models.PositiveIntegerField('Intentos de reenvío', default=3)
    retry_delay_seconds = models.PositiveIntegerField('Delay entre reintentos (seg)', default=300)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Canal de Notificación'
        verbose_name_plural = 'Canales de Notificación'
        ordering = ['priority', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_channel_type_display()})"
    
    def is_available(self):
        """Verifica si el canal está disponible para envío."""
        return self.status == 'active'


class NotificationTemplate(models.Model):
    """Plantillas para notificaciones."""
    
    TEMPLATE_TYPES = [
        ('welcome', 'Bienvenida'),
        ('verification', 'Verificación'),
        ('password_reset', 'Restablecimiento de Contraseña'),
        ('property_inquiry', 'Consulta de Propiedad'),
        ('contract_created', 'Contrato Creado'),
        ('contract_signed', 'Contrato Firmado'),
        ('payment_received', 'Pago Recibido'),
        ('payment_overdue', 'Pago Vencido'),
        ('rating_received', 'Calificación Recibida'),
        ('message_received', 'Mensaje Recibido'),
        ('maintenance_request', 'Solicitud de Mantenimiento'),
        ('system_alert', 'Alerta del Sistema'),
        ('custom', 'Personalizada'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Baja'),
        ('normal', 'Normal'),
        ('high', 'Alta'),
        ('urgent', 'Urgente'),
        ('critical', 'Crítica'),
    ]
    
    name = models.CharField('Nombre de la Plantilla', max_length=100, unique=True)
    template_type = models.CharField('Tipo de Plantilla', max_length=30, choices=TEMPLATE_TYPES)
    
    # Contenido de la plantilla
    title = models.CharField('Título', max_length=200)
    subject = models.CharField('Asunto (Email)', max_length=200, blank=True)
    content_text = models.TextField('Contenido (Texto plano)')
    content_html = models.TextField('Contenido (HTML)', blank=True)
    
    # Configuración
    channels = models.ManyToManyField(
        NotificationChannel,
        related_name='templates',
        verbose_name='Canales compatibles'
    )
    priority = models.CharField('Prioridad', max_length=20, choices=PRIORITY_LEVELS, default='normal')
    
    # Variables disponibles
    variables = models.JSONField(
        'Variables disponibles',
        default=list,
        help_text='Lista de variables que se pueden usar en la plantilla'
    )
    
    # Control de frecuencia
    max_frequency_per_user_per_day = models.PositiveIntegerField(
        'Máximo por usuario por día',
        default=5,
        help_text='Máximo número de notificaciones de este tipo por usuario por día'
    )
    
    # Estado
    is_active = models.BooleanField('Activa', default=True)
    is_system_template = models.BooleanField('Plantilla del sistema', default=False)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última actualización', auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_templates'
    )
    
    class Meta:
        verbose_name = 'Plantilla de Notificación'
        verbose_name_plural = 'Plantillas de Notificación'
        ordering = ['template_type', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_template_type_display()})"
    
    def render_content(self, context):
        """Renderiza el contenido de la plantilla con el contexto dado."""
        try:
            from django.template import Template, Context
            
            # Renderizar texto plano
            text_template = Template(self.content_text)
            rendered_text = text_template.render(Context(context))
            
            # Renderizar HTML si existe
            rendered_html = None
            if self.content_html:
                html_template = Template(self.content_html)
                rendered_html = html_template.render(Context(context))
            
            # Renderizar título y asunto
            title_template = Template(self.title)
            rendered_title = title_template.render(Context(context))
            
            subject_template = Template(self.subject)
            rendered_subject = subject_template.render(Context(context))
            
            return {
                'title': rendered_title,
                'subject': rendered_subject,
                'content_text': rendered_text,
                'content_html': rendered_html,
            }
            
        except Exception as e:
            return {
                'title': self.title,
                'subject': self.subject,
                'content_text': f"Error renderizando plantilla: {str(e)}",
                'content_html': None,
            }


class Notification(models.Model):
    """Notificación individual."""
    
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('processing', 'Procesando'),
        ('sent', 'Enviada'),
        ('delivered', 'Entregada'),
        ('read', 'Leída'),
        ('failed', 'Fallida'),
        ('cancelled', 'Cancelada'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Baja'),
        ('normal', 'Normal'),
        ('high', 'Alta'),
        ('urgent', 'Urgente'),
        ('critical', 'Crítica'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Destinatario
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='received_notifications'
    )
    
    # Plantilla utilizada
    template = models.ForeignKey(
        NotificationTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    
    # Contenido de la notificación
    title = models.CharField('Título', max_length=200)
    message = models.TextField('Mensaje')
    
    # Objeto relacionado (genérico)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Configuración
    priority = models.CharField('Prioridad', max_length=20, choices=PRIORITY_LEVELS, default='normal')
    
    # Estado de la notificación
    status = models.CharField('Estado', max_length=20, choices=STATUS_CHOICES, default='pending')
    is_read = models.BooleanField('Leída', default=False)
    
    # Datos adicionales
    data = models.JSONField(
        'Datos adicionales',
        default=dict,
        help_text='Datos específicos de la notificación'
    )
    
    # URLs de acción
    action_url = models.URLField('URL de acción', blank=True)
    deep_link = models.CharField('Deep link', max_length=500, blank=True)
    
    # Fechas importantes
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    scheduled_at = models.DateTimeField('Programada para', null=True, blank=True)
    sent_at = models.DateTimeField('Fecha de envío', null=True, blank=True)
    delivered_at = models.DateTimeField('Fecha de entrega', null=True, blank=True)
    read_at = models.DateTimeField('Fecha de lectura', null=True, blank=True)
    expires_at = models.DateTimeField('Fecha de expiración', null=True, blank=True)
    
    # Metadatos
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_notifications'
    )
    
    class Meta:
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['status', 'scheduled_at']),
            models.Index(fields=['priority', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.recipient.get_full_name()}"
    
    def mark_as_read(self):
        """Marca la notificación como leída."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.status = 'read'
            self.save(update_fields=['is_read', 'read_at', 'status'])
    
    def mark_as_sent(self):
        """Marca la notificación como enviada."""
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at'])
    
    def mark_as_delivered(self):
        """Marca la notificación como entregada."""
        self.status = 'delivered'
        self.delivered_at = timezone.now()
        self.save(update_fields=['status', 'delivered_at'])
    
    def mark_as_failed(self, error_message=None):
        """Marca la notificación como fallida."""
        self.status = 'failed'
        if error_message:
            self.data = self.data or {}
            self.data['error_message'] = error_message
        self.save(update_fields=['status', 'data'])
    
    def is_expired(self):
        """Verifica si la notificación ha expirado."""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    def should_send_now(self):
        """Verifica si la notificación debe enviarse ahora."""
        if self.status != 'pending':
            return False
        
        if self.is_expired():
            return False
        
        if self.scheduled_at:
            return timezone.now() >= self.scheduled_at
        
        return True


class NotificationDelivery(models.Model):
    """Registro de entrega de notificaciones por canal."""
    
    DELIVERY_STATUS = [
        ('pending', 'Pendiente'),
        ('processing', 'Procesando'),
        ('sent', 'Enviada'),
        ('delivered', 'Entregada'),
        ('failed', 'Fallida'),
        ('bounced', 'Rebotada'),
        ('clicked', 'Clic realizado'),
    ]
    
    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name='deliveries'
    )
    channel = models.ForeignKey(
        NotificationChannel,
        on_delete=models.CASCADE,
        related_name='deliveries'
    )
    
    # Estado de la entrega
    status = models.CharField('Estado', max_length=20, choices=DELIVERY_STATUS, default='pending')
    
    # Identificadores externos
    external_id = models.CharField('ID Externo', max_length=200, blank=True)
    tracking_id = models.CharField('ID de Seguimiento', max_length=200, blank=True)
    
    # Detalles de la entrega
    sent_to = models.CharField('Enviado a', max_length=200, blank=True)
    response_data = models.JSONField(
        'Datos de respuesta',
        default=dict,
        help_text='Respuesta del proveedor de entrega'
    )
    
    # Errores
    error_code = models.CharField('Código de error', max_length=50, blank=True)
    error_message = models.TextField('Mensaje de error', blank=True)
    retry_count = models.PositiveIntegerField('Intentos de reenvío', default=0)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    sent_at = models.DateTimeField('Fecha de envío', null=True, blank=True)
    delivered_at = models.DateTimeField('Fecha de entrega', null=True, blank=True)
    clicked_at = models.DateTimeField('Fecha de clic', null=True, blank=True)
    next_retry_at = models.DateTimeField('Próximo intento', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Entrega de Notificación'
        verbose_name_plural = 'Entregas de Notificaciones'
        ordering = ['-created_at']
        unique_together = ['notification', 'channel']
    
    def __str__(self):
        return f"{self.notification.title} via {self.channel.name}"
    
    def can_retry(self):
        """Verifica si se puede reintentar el envío."""
        return (
            self.status == 'failed' and
            self.retry_count < self.channel.retry_attempts and
            (not self.next_retry_at or timezone.now() >= self.next_retry_at)
        )
    
    def schedule_retry(self):
        """Programa el próximo intento de envío."""
        if self.can_retry():
            self.retry_count += 1
            self.next_retry_at = timezone.now() + timezone.timedelta(
                seconds=self.channel.retry_delay_seconds * self.retry_count
            )
            self.status = 'pending'
            self.save(update_fields=['retry_count', 'next_retry_at', 'status'])


class NotificationPreference(models.Model):
    """Preferencias de notificación por usuario."""
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    
    # Configuración general
    is_enabled = models.BooleanField('Notificaciones habilitadas', default=True)
    
    # Configuración por canal
    allow_email = models.BooleanField('Permitir email', default=True)
    allow_sms = models.BooleanField('Permitir SMS', default=False)
    allow_push = models.BooleanField('Permitir push', default=True)
    allow_in_app = models.BooleanField('Permitir en aplicación', default=True)
    
    # Configuración por tipo de notificación
    marketing_notifications = models.BooleanField('Notificaciones de marketing', default=False)
    system_notifications = models.BooleanField('Notificaciones del sistema', default=True)
    security_notifications = models.BooleanField('Notificaciones de seguridad', default=True)
    property_notifications = models.BooleanField('Notificaciones de propiedades', default=True)
    contract_notifications = models.BooleanField('Notificaciones de contratos', default=True)
    payment_notifications = models.BooleanField('Notificaciones de pagos', default=True)
    message_notifications = models.BooleanField('Notificaciones de mensajes', default=True)
    rating_notifications = models.BooleanField('Notificaciones de calificaciones', default=True)
    
    # Configuración de horarios
    quiet_hours_start = models.TimeField('Inicio de horas silenciosas', null=True, blank=True)
    quiet_hours_end = models.TimeField('Fin de horas silenciosas', null=True, blank=True)
    timezone = models.CharField('Zona horaria', max_length=50, default='America/Bogota')
    
    # Configuración avanzada
    email_frequency = models.CharField(
        'Frecuencia de email',
        max_length=20,
        choices=[
            ('immediate', 'Inmediato'),
            ('hourly', 'Cada hora'),
            ('daily', 'Diario'),
            ('weekly', 'Semanal'),
            ('never', 'Nunca'),
        ],
        default='immediate'
    )
    
    digest_enabled = models.BooleanField('Resumen habilitado', default=True)
    digest_frequency = models.CharField(
        'Frecuencia del resumen',
        max_length=20,
        choices=[
            ('daily', 'Diario'),
            ('weekly', 'Semanal'),
            ('monthly', 'Mensual'),
        ],
        default='daily'
    )
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Preferencia de Notificación'
        verbose_name_plural = 'Preferencias de Notificación'
    
    def __str__(self):
        return f"Preferencias - {self.user.get_full_name()}"
    
    def allows_channel(self, channel_type):
        """Verifica si el usuario permite un tipo de canal específico."""
        channel_mapping = {
            'email': self.allow_email,
            'sms': self.allow_sms,
            'push': self.allow_push,
            'in_app': self.allow_in_app,
        }
        return channel_mapping.get(channel_type, False)
    
    def allows_notification_type(self, notification_type):
        """Verifica si el usuario permite un tipo de notificación específico."""
        type_mapping = {
            'marketing': self.marketing_notifications,
            'system': self.system_notifications,
            'security': self.security_notifications,
            'property': self.property_notifications,
            'contract': self.contract_notifications,
            'payment': self.payment_notifications,
            'message': self.message_notifications,
            'rating': self.rating_notifications,
        }
        return type_mapping.get(notification_type, True)
    
    def is_in_quiet_hours(self):
        """Verifica si actualmente están en horas silenciosas."""
        if not self.quiet_hours_start or not self.quiet_hours_end:
            return False
        
        import pytz
        from datetime import datetime
        
        try:
            tz = pytz.timezone(self.timezone)
            now = datetime.now(tz).time()
            
            if self.quiet_hours_start <= self.quiet_hours_end:
                # Mismo día
                return self.quiet_hours_start <= now <= self.quiet_hours_end
            else:
                # Cruza medianoche
                return now >= self.quiet_hours_start or now <= self.quiet_hours_end
        except:
            return False


class NotificationDigest(models.Model):
    """Resúmenes periódicos de notificaciones."""
    
    DIGEST_TYPES = [
        ('daily', 'Diario'),
        ('weekly', 'Semanal'),
        ('monthly', 'Mensual'),
    ]
    
    DIGEST_STATUS = [
        ('pending', 'Pendiente'),
        ('processing', 'Procesando'),
        ('sent', 'Enviado'),
        ('failed', 'Fallido'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notification_digests'
    )
    
    digest_type = models.CharField('Tipo de resumen', max_length=20, choices=DIGEST_TYPES)
    status = models.CharField('Estado', max_length=20, choices=DIGEST_STATUS, default='pending')
    
    # Período del resumen
    period_start = models.DateTimeField('Inicio del período')
    period_end = models.DateTimeField('Fin del período')
    
    # Contenido del resumen
    notification_count = models.PositiveIntegerField('Cantidad de notificaciones', default=0)
    summary_data = models.JSONField(
        'Datos del resumen',
        default=dict,
        help_text='Resumen de las notificaciones incluidas'
    )
    
    # Entrega
    sent_at = models.DateTimeField('Fecha de envío', null=True, blank=True)
    email_sent = models.BooleanField('Email enviado', default=False)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Resumen de Notificaciones'
        verbose_name_plural = 'Resúmenes de Notificaciones'
        ordering = ['-created_at']
        unique_together = ['user', 'digest_type', 'period_start']
    
    def __str__(self):
        return f"Resumen {self.get_digest_type_display()} - {self.user.get_full_name()}"


class NotificationAnalytics(models.Model):
    """Analíticas del sistema de notificaciones."""
    
    # Fecha del reporte
    date = models.DateField('Fecha')
    
    # Métricas por canal
    channel = models.ForeignKey(
        NotificationChannel,
        on_delete=models.CASCADE,
        related_name='analytics'
    )
    
    # Contadores
    notifications_sent = models.PositiveIntegerField('Notificaciones enviadas', default=0)
    notifications_delivered = models.PositiveIntegerField('Notificaciones entregadas', default=0)
    notifications_failed = models.PositiveIntegerField('Notificaciones fallidas', default=0)
    notifications_clicked = models.PositiveIntegerField('Notificaciones con clic', default=0)
    notifications_read = models.PositiveIntegerField('Notificaciones leídas', default=0)
    
    # Tiempos promedio
    avg_delivery_time_seconds = models.PositiveIntegerField('Tiempo promedio de entrega (seg)', default=0)
    avg_read_time_seconds = models.PositiveIntegerField('Tiempo promedio de lectura (seg)', default=0)
    
    # Tasas calculadas
    delivery_rate = models.FloatField('Tasa de entrega (%)', default=0.0)
    click_rate = models.FloatField('Tasa de clics (%)', default=0.0)
    read_rate = models.FloatField('Tasa de lectura (%)', default=0.0)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Analítica de Notificaciones'
        verbose_name_plural = 'Analíticas de Notificaciones'
        ordering = ['-date']
        unique_together = ['date', 'channel']
    
    def __str__(self):
        return f"Analíticas {self.date} - {self.channel.name}"
    
    def calculate_rates(self):
        """Calcula las tasas de entrega, clics y lectura."""
        if self.notifications_sent > 0:
            self.delivery_rate = (self.notifications_delivered / self.notifications_sent) * 100
            self.click_rate = (self.notifications_clicked / self.notifications_sent) * 100
            self.read_rate = (self.notifications_read / self.notifications_sent) * 100
        else:
            self.delivery_rate = 0.0
            self.click_rate = 0.0
            self.read_rate = 0.0
        
        self.save(update_fields=['delivery_rate', 'click_rate', 'read_rate'])