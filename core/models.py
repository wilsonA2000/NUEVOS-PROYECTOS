"""
Modelos centrales y utilitarios para VeriHome.
Incluye configuraciones, notificaciones, logs y funcionalidades transversales.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.utils import timezone
import uuid

User = get_user_model()


class SiteConfiguration(models.Model):
    """Configuración general del sitio."""
    
    # Información general
    site_name = models.CharField('Nombre del sitio', max_length=100, default='VeriHome')
    site_description = models.TextField('Descripción del sitio', max_length=500)
    contact_email = models.EmailField('Email de contacto')
    support_phone = models.CharField('Teléfono de soporte', max_length=20, blank=True)
    
    # Configuraciones de negocio
    platform_commission_percentage = models.DecimalField(
        'Porcentaje de comisión de plataforma',
        max_digits=5,
        decimal_places=2,
        default=5.00
    )
    minimum_contract_duration = models.PositiveIntegerField('Duración mínima de contrato (días)', default=30)
    maximum_contract_duration = models.PositiveIntegerField('Duración máxima de contrato (días)', default=3650)
    
    # Configuraciones de verificación
    require_identity_verification = models.BooleanField('Requerir verificación de identidad', default=True)
    require_income_verification = models.BooleanField('Requerir verificación de ingresos', default=True)
    auto_approve_verified_users = models.BooleanField('Aprobar automáticamente usuarios verificados', default=False)
    
    # Configuraciones de mensajería
    max_messages_per_day = models.PositiveIntegerField('Máximo de mensajes por día', default=100)
    message_retention_days = models.PositiveIntegerField('Días de retención de mensajes', default=365)
    
    # Configuraciones de calificaciones
    rating_scale_max = models.PositiveIntegerField('Escala máxima de calificación', default=10)
    minimum_ratings_for_badge = models.PositiveIntegerField('Mínimo de calificaciones para badge', default=5)
    
    # Configuraciones de SEO
    meta_title = models.CharField('Título meta', max_length=60, blank=True)
    meta_description = models.CharField('Descripción meta', max_length=160, blank=True)
    meta_keywords = models.CharField('Palabras clave meta', max_length=255, blank=True)
    
    # Configuraciones de analytics
    google_analytics_id = models.CharField('ID de Google Analytics', max_length=20, blank=True)
    facebook_pixel_id = models.CharField('ID de Facebook Pixel', max_length=20, blank=True)
    
    # Estado del sitio
    is_maintenance_mode = models.BooleanField('Modo de mantenimiento', default=False)
    maintenance_message = models.TextField('Mensaje de mantenimiento', blank=True)
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Configuración del Sitio'
        verbose_name_plural = 'Configuraciones del Sitio'
        
    def __str__(self):
        return f"Configuración - {self.site_name}"
    
    def save(self, *args, **kwargs):
        # Asegurar que solo existe una configuración
        if not self.pk and SiteConfiguration.objects.exists():
            raise ValueError("Solo puede existir una configuración del sitio")
        super().save(*args, **kwargs)
    
    @classmethod
    def get_config(cls):
        """Obtiene la configuración actual del sitio."""
        config, created = cls.objects.get_or_create(
            pk=1,
            defaults={
                'site_description': 'Plataforma inmobiliaria revolucionaria',
                'contact_email': 'info@verihome.com'
            }
        )
        return config


class Notification(models.Model):
    """Sistema de notificaciones para usuarios."""
    
    NOTIFICATION_TYPES = [
        ('message', 'Nuevo Mensaje'),
        ('contract', 'Actualización de Contrato'),
        ('payment', 'Notificación de Pago'),
        ('property', 'Actualización de Propiedad'),
        ('rating', 'Nueva Calificación'),
        ('inquiry', 'Nueva Consulta'),
        ('system', 'Notificación del Sistema'),
        ('reminder', 'Recordatorio'),
        ('welcome', 'Bienvenida'),
        ('verification', 'Verificación'),
    ]
    
    NOTIFICATION_PRIORITY = [
        ('low', 'Baja'),
        ('normal', 'Normal'),
        ('high', 'Alta'),
        ('urgent', 'Urgente'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Destinatario
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    
    # Contenido de la notificación
    notification_type = models.CharField('Tipo', max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField('Título', max_length=200)
    message = models.TextField('Mensaje', max_length=1000)
    
    # Configuración
    priority = models.CharField('Prioridad', max_length=10, choices=NOTIFICATION_PRIORITY, default='normal')
    is_read = models.BooleanField('Leída', default=False)
    is_email_sent = models.BooleanField('Email enviado', default=False)
    is_push_sent = models.BooleanField('Push enviado', default=False)
    
    # Referencia genérica al objeto relacionado
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.CharField(max_length=255, null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # URL de acción
    action_url = models.URLField('URL de acción', blank=True)
    action_label = models.CharField('Etiqueta de acción', max_length=50, blank=True)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    read_at = models.DateTimeField('Fecha de lectura', null=True, blank=True)
    expires_at = models.DateTimeField('Fecha de expiración', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['created_at']),
        ]
        
    def __str__(self):
        return f"{self.title} - {self.user.get_full_name()}"
    
    def mark_as_read(self):
        """Marca la notificación como leída."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    def is_expired(self):
        """Verifica si la notificación ha expirado."""
        return self.expires_at and self.expires_at < timezone.now()


class ActivityLog(models.Model):
    """Registro de actividades del sistema."""
    
    ACTION_TYPES = [
        ('create', 'Crear'),
        ('update', 'Actualizar'),
        ('delete', 'Eliminar'),
        ('login', 'Iniciar Sesión'),
        ('logout', 'Cerrar Sesión'),
        ('view', 'Ver'),
        ('download', 'Descargar'),
        ('upload', 'Subir'),
        ('send', 'Enviar'),
        ('approve', 'Aprobar'),
        ('reject', 'Rechazar'),
        ('verify', 'Verificar'),
    ]
    
    # Usuario que realizó la acción
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='core_activity_logs'
    )
    
    # Información de la acción
    action_type = models.CharField('Tipo de acción', max_length=20, choices=ACTION_TYPES)
    description = models.CharField('Descripción', max_length=300)
    details = models.JSONField('Detalles adicionales', default=dict, blank=True)
    
    # Referencia al objeto afectado
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.CharField(max_length=255, null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Información de la sesión
    ip_address = models.GenericIPAddressField('Dirección IP', null=True, blank=True)
    user_agent = models.TextField('User Agent', blank=True)
    session_key = models.CharField('Clave de sesión', max_length=40, blank=True)
    
    # Metadatos
    success = models.BooleanField('Exitosa', default=True)
    error_message = models.TextField('Mensaje de error', blank=True)
    
    created_at = models.DateTimeField('Fecha de actividad', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Registro de Actividad'
        verbose_name_plural = 'Registros de Actividades'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['action_type']),
            models.Index(fields=['created_at']),
        ]
        
    def __str__(self):
        user_name = self.user.get_full_name() if self.user else 'Usuario anónimo'
        return f"{user_name} - {self.get_action_type_display()}: {self.description}"


class SystemAlert(models.Model):
    """Alertas del sistema para administradores."""
    
    ALERT_LEVELS = [
        ('info', 'Información'),
        ('warning', 'Advertencia'),
        ('error', 'Error'),
        ('critical', 'Crítico'),
    ]
    
    ALERT_CATEGORIES = [
        ('security', 'Seguridad'),
        ('performance', 'Rendimiento'),
        ('business', 'Negocio'),
        ('technical', 'Técnico'),
        ('compliance', 'Cumplimiento'),
    ]
    
    # Información de la alerta
    title = models.CharField('Título', max_length=200)
    description = models.TextField('Descripción', max_length=1000)
    level = models.CharField('Nivel', max_length=10, choices=ALERT_LEVELS)
    category = models.CharField('Categoría', max_length=20, choices=ALERT_CATEGORIES)
    
    # Estado
    is_active = models.BooleanField('Activa', default=True)
    is_acknowledged = models.BooleanField('Reconocida', default=False)
    is_resolved = models.BooleanField('Resuelta', default=False)
    
    # Usuario responsable
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_alerts'
    )
    acknowledged_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='acknowledged_alerts'
    )
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_alerts'
    )
    
    # Datos adicionales
    metadata = models.JSONField('Metadatos', default=dict, blank=True)
    resolution_notes = models.TextField('Notas de resolución', blank=True)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    acknowledged_at = models.DateTimeField('Fecha de reconocimiento', null=True, blank=True)
    resolved_at = models.DateTimeField('Fecha de resolución', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Alerta del Sistema'
        verbose_name_plural = 'Alertas del Sistema'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"[{self.get_level_display()}] {self.title}"
    
    def acknowledge(self, user):
        """Marca la alerta como reconocida."""
        self.is_acknowledged = True
        self.acknowledged_by = user
        self.acknowledged_at = timezone.now()
        self.save()
    
    def resolve(self, user, notes=''):
        """Marca la alerta como resuelta."""
        self.is_resolved = True
        self.resolved_by = user
        self.resolved_at = timezone.now()
        self.resolution_notes = notes
        self.save()


class FAQ(models.Model):
    """Preguntas frecuentes."""
    
    CATEGORIES = [
        ('general', 'General'),
        ('landlords', 'Arrendadores'),
        ('tenants', 'Arrendatarios'),
        ('service_providers', 'Prestadores de Servicios'),
        ('payments', 'Pagos'),
        ('contracts', 'Contratos'),
        ('verification', 'Verificación'),
        ('technical', 'Técnico'),
    ]
    
    category = models.CharField('Categoría', max_length=20, choices=CATEGORIES)
    question = models.CharField('Pregunta', max_length=300)
    answer = models.TextField('Respuesta', max_length=2000)
    
    # Configuración
    is_published = models.BooleanField('Publicada', default=True)
    order = models.PositiveIntegerField('Orden', default=0)
    
    # Estadísticas
    view_count = models.PositiveIntegerField('Número de visualizaciones', default=0)
    helpful_count = models.PositiveIntegerField('Votos útiles', default=0)
    not_helpful_count = models.PositiveIntegerField('Votos no útiles', default=0)
    
    # Metadatos
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_faqs'
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Pregunta Frecuente'
        verbose_name_plural = 'Preguntas Frecuentes'
        ordering = ['category', 'order', 'question']
        
    def __str__(self):
        return f"[{self.get_category_display()}] {self.question}"


class SupportTicket(models.Model):
    """Sistema de tickets de soporte."""
    
    TICKET_STATUS = [
        ('open', 'Abierto'),
        ('in_progress', 'En Progreso'),
        ('waiting_customer', 'Esperando Cliente'),
        ('resolved', 'Resuelto'),
        ('closed', 'Cerrado'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Baja'),
        ('normal', 'Normal'),
        ('high', 'Alta'),
        ('urgent', 'Urgente'),
    ]
    
    CATEGORIES = [
        ('technical', 'Técnico'),
        ('billing', 'Facturación'),
        ('account', 'Cuenta'),
        ('property', 'Propiedad'),
        ('contract', 'Contrato'),
        ('verification', 'Verificación'),
        ('other', 'Otro'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket_number = models.CharField('Número de ticket', max_length=20, unique=True)
    
    # Usuario y asignación
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='support_tickets'
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets',
        limit_choices_to={'is_staff': True}
    )
    
    # Información del ticket
    subject = models.CharField('Asunto', max_length=200)
    description = models.TextField('Descripción', max_length=2000)
    category = models.CharField('Categoría', max_length=20, choices=CATEGORIES)
    priority = models.CharField('Prioridad', max_length=10, choices=PRIORITY_LEVELS, default='normal')
    status = models.CharField('Estado', max_length=20, choices=TICKET_STATUS, default='open')
    
    # Referencias relacionadas
    content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True)
    object_id = models.CharField(max_length=255, null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Información adicional
    user_agent = models.TextField('User Agent', blank=True)
    ip_address = models.GenericIPAddressField('Dirección IP', null=True, blank=True)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    resolved_at = models.DateTimeField('Fecha de resolución', null=True, blank=True)
    closed_at = models.DateTimeField('Fecha de cierre', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Ticket de Soporte'
        verbose_name_plural = 'Tickets de Soporte'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Ticket {self.ticket_number} - {self.subject}"
    
    def save(self, *args, **kwargs):
        # Generar número de ticket único si no existe
        if not self.ticket_number:
            year = timezone.now().year
            count = SupportTicket.objects.filter(
                created_at__year=year
            ).count() + 1
            self.ticket_number = f"SPT-{year}-{count:05d}"
        
        super().save(*args, **kwargs)


class TicketResponse(models.Model):
    """Respuestas a tickets de soporte."""
    
    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name='responses'
    )
    
    # Autor de la respuesta
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='ticket_responses'
    )
    
    # Contenido
    message = models.TextField('Mensaje', max_length=2000)
    is_internal = models.BooleanField('Nota interna', default=False)
    
    # Archivos adjuntos
    attachment = models.FileField('Archivo adjunto', upload_to='support_attachments/', null=True, blank=True)
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Respuesta de Ticket'
        verbose_name_plural = 'Respuestas de Tickets'
        ordering = ['created_at']
        
    def __str__(self):
        return f"Respuesta de {self.author.get_full_name()} - {self.ticket.ticket_number}"


class EmailTemplate(models.Model):
    """Plantillas de email para el sistema."""
    
    TEMPLATE_TYPES = [
        ('welcome', 'Bienvenida'),
        ('verification', 'Verificación'),
        ('password_reset', 'Restablecimiento de Contraseña'),
        ('contract_notification', 'Notificación de Contrato'),
        ('payment_notification', 'Notificación de Pago'),
        ('message_notification', 'Notificación de Mensaje'),
        ('rating_invitation', 'Invitación de Calificación'),
        ('support_response', 'Respuesta de Soporte'),
        ('newsletter', 'Newsletter'),
        ('reminder', 'Recordatorio'),
    ]
    
    name = models.CharField('Nombre', max_length=100)
    template_type = models.CharField('Tipo', max_length=30, choices=TEMPLATE_TYPES)
    subject = models.CharField('Asunto', max_length=200)
    html_content = models.TextField('Contenido HTML')
    text_content = models.TextField('Contenido de texto', blank=True)
    
    # Variables disponibles
    available_variables = models.JSONField(
        'Variables disponibles',
        default=list,
        help_text='Lista de variables que se pueden usar en la plantilla'
    )
    
    # Configuración
    is_active = models.BooleanField('Activa', default=True)
    is_default = models.BooleanField('Por defecto', default=False)
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Plantilla de Email'
        verbose_name_plural = 'Plantillas de Email'
        unique_together = ['template_type', 'is_default']
        
    def __str__(self):
        return f"{self.name} - {self.get_template_type_display()}"


class SystemMetrics(models.Model):
    """Métricas del sistema para análisis."""
    
    METRIC_TYPES = [
        ('user_registration', 'Registro de Usuarios'),
        ('property_listing', 'Publicación de Propiedades'),
        ('contract_creation', 'Creación de Contratos'),
        ('message_sent', 'Mensajes Enviados'),
        ('payment_processed', 'Pagos Procesados'),
        ('rating_submitted', 'Calificaciones Enviadas'),
        ('page_view', 'Visualizaciones de Página'),
        ('search_query', 'Consultas de Búsqueda'),
    ]
    
    metric_type = models.CharField('Tipo de métrica', max_length=30, choices=METRIC_TYPES)
    date = models.DateField('Fecha')
    count = models.PositiveIntegerField('Conteo', default=0)
    metadata = models.JSONField('Metadatos adicionales', default=dict, blank=True)
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Métrica del Sistema'
        verbose_name_plural = 'Métricas del Sistema'
        unique_together = ['metric_type', 'date']
        ordering = ['-date']
        
    def __str__(self):
        return f"{self.get_metric_type_display()} - {self.date}: {self.count}"
