"""
Sistema de mensajería avanzada para VeriHome.
Incluye chat interno tipo Gmail con restricciones de comunicación.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()


class MessageThread(models.Model):
    """Hilo de conversación entre usuarios."""
    
    THREAD_TYPES = [
        ('inquiry', 'Consulta de Propiedad'),
        ('contract', 'Relacionado a Contrato'),
        ('service', 'Servicios'),
        ('support', 'Soporte'),
        ('general', 'General'),
    ]
    
    THREAD_STATUS = [
        ('active', 'Activa'),
        ('archived', 'Archivada'),
        ('blocked', 'Bloqueada'),
        ('closed', 'Cerrada'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.CharField('Asunto', max_length=200)
    thread_type = models.CharField('Tipo de conversación', max_length=20, choices=THREAD_TYPES)
    
    # Participantes (máximo 2 para conversaciones directas)
    participants = models.ManyToManyField(
        User,
        related_name='message_threads',
        through='ThreadParticipant'
    )
    
    # Referencias relacionadas
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='message_threads'
    )
    contract = models.ForeignKey(
        'contracts.Contract',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='message_threads'
    )
    
    # Estado y metadatos
    status = models.CharField('Estado', max_length=20, choices=THREAD_STATUS, default='active')
    is_priority = models.BooleanField('Prioridad alta', default=False)
    
    # Información de seguimiento
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='initiated_threads'
    )
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última actualización', auto_now=True)
    last_message_at = models.DateTimeField('Último mensaje', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Hilo de Conversación'
        verbose_name_plural = 'Hilos de Conversación'
        ordering = ['-last_message_at', '-updated_at']
        
    def __str__(self):
        return f"{self.subject} - {self.get_thread_type_display()}"
    
    def get_other_participant(self, user):
        """Obtiene el otro participante en una conversación directa."""
        participants = self.participants.exclude(id=user.id)
        return participants.first() if participants.exists() else None
    
    def mark_as_read(self, user):
        """Marca todos los mensajes como leídos para un usuario."""
        self.messages.filter(recipient=user, is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
    
    def get_unread_count(self, user):
        """Obtiene el número de mensajes no leídos para un usuario."""
        return self.messages.filter(recipient=user, is_read=False).count()
    
    def can_participate(self, user):
        """Verifica si un usuario puede participar en esta conversación."""
        # Verificar si el usuario ya es participante
        if self.participants.filter(id=user.id).exists():
            return True
        
        # Verificar relaciones contractuales según las reglas de negocio
        if self.thread_type == 'contract' and self.contract:
            return user in [self.contract.primary_party, self.contract.secondary_party]
        
        if self.thread_type == 'inquiry' and self.property:
            return user == self.property.landlord or user == self.created_by
        
        # Para servicios, verificar si hay una relación establecida
        if self.thread_type == 'service':
            # Aquí se pueden agregar más validaciones específicas
            return True
        
        return False


class ThreadParticipant(models.Model):
    """Información de participación en hilos de conversación."""
    
    thread = models.ForeignKey(
        MessageThread,
        on_delete=models.CASCADE,
        related_name='thread_participants'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='thread_participations'
    )
    
    # Estado de participación
    is_active = models.BooleanField('Participación activa', default=True)
    is_archived = models.BooleanField('Conversación archivada', default=False)
    is_muted = models.BooleanField('Notificaciones silenciadas', default=False)
    is_starred = models.BooleanField('Conversación destacada', default=False)
    
    # Fechas
    joined_at = models.DateTimeField('Fecha de unión', auto_now_add=True)
    last_read_at = models.DateTimeField('Última lectura', null=True, blank=True)
    archived_at = models.DateTimeField('Fecha de archivo', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Participante de Conversación'
        verbose_name_plural = 'Participantes de Conversaciones'
        unique_together = ['thread', 'user']
        
    def __str__(self):
        return f"{self.user.get_full_name()} en {self.thread.subject}"


class Message(models.Model):
    """Mensajes individuales dentro de las conversaciones."""
    
    MESSAGE_TYPES = [
        ('text', 'Texto'),
        ('image', 'Imagen'),
        ('file', 'Archivo'),
        ('system', 'Sistema'),
        ('audio', 'Audio'),
    ]
    
    MESSAGE_STATUS = [
        ('sent', 'Enviado'),
        ('delivered', 'Entregado'),
        ('read', 'Leído'),
        ('failed', 'Fallido'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(
        MessageThread,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    
    # Remitente y destinatario
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='received_messages'
    )
    
    # Contenido del mensaje
    message_type = models.CharField('Tipo de mensaje', max_length=20, choices=MESSAGE_TYPES, default='text')
    content = models.TextField('Contenido', max_length=5000, blank=True)
    
    # Mensaje al que se responde
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies'
    )
    
    # Estado del mensaje
    status = models.CharField('Estado', max_length=20, choices=MESSAGE_STATUS, default='sent')
    is_read = models.BooleanField('Leído', default=False)
    is_starred = models.BooleanField('Destacado', default=False)
    is_flagged = models.BooleanField('Marcado', default=False)
    is_deleted_by_sender = models.BooleanField('Eliminado por remitente', default=False)
    is_deleted_by_recipient = models.BooleanField('Eliminado por destinatario', default=False)
    
    # Fechas importantes
    sent_at = models.DateTimeField('Fecha de envío', auto_now_add=True)
    delivered_at = models.DateTimeField('Fecha de entrega', null=True, blank=True)
    read_at = models.DateTimeField('Fecha de lectura', null=True, blank=True)
    
    # Metadatos
    ip_address = models.GenericIPAddressField('Dirección IP', null=True, blank=True)
    user_agent = models.TextField('User Agent', blank=True)
    
    class Meta:
        verbose_name = 'Mensaje'
        verbose_name_plural = 'Mensajes'
        ordering = ['sent_at']
        
    def __str__(self):
        return f"Mensaje de {self.sender.get_full_name()} a {self.recipient.get_full_name()}"
    
    def mark_as_read(self):
        """Marca el mensaje como leído."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.status = 'read'
            self.save(update_fields=['is_read', 'read_at', 'status'])
    
    def mark_as_delivered(self):
        """Marca el mensaje como entregado."""
        if self.status == 'sent':
            self.delivered_at = timezone.now()
            self.status = 'delivered'
            self.save(update_fields=['delivered_at', 'status'])
    
    def get_read_status_display_class(self):
        """Devuelve la clase CSS para el estado de lectura."""
        if self.is_read:
            return 'text-green-600'  # Verde para leído
        else:
            return 'text-amber-600'  # Marrón/Ámbar para no leído


class MessageAttachment(models.Model):
    """Archivos adjuntos en mensajes."""
    
    ATTACHMENT_TYPES = [
        ('image', 'Imagen'),
        ('document', 'Documento'),
        ('audio', 'Audio'),
        ('video', 'Video'),
        ('other', 'Otro'),
    ]
    
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    
    # Información del archivo
    file = models.FileField('Archivo', upload_to='message_attachments/')
    original_filename = models.CharField('Nombre original', max_length=255)
    file_size = models.PositiveIntegerField('Tamaño (bytes)')
    mime_type = models.CharField('Tipo MIME', max_length=100)
    attachment_type = models.CharField('Tipo de archivo', max_length=20, choices=ATTACHMENT_TYPES)
    
    # Metadatos
    description = models.CharField('Descripción', max_length=300, blank=True)
    is_image = models.BooleanField('Es imagen', default=False)
    
    # Información de subida
    uploaded_at = models.DateTimeField('Fecha de subida', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Archivo Adjunto'
        verbose_name_plural = 'Archivos Adjuntos'
        ordering = ['uploaded_at']
        
    def __str__(self):
        return f"Adjunto: {self.original_filename}"
    
    def save(self, *args, **kwargs):
        # Determinar si es una imagen
        if self.mime_type and self.mime_type.startswith('image/'):
            self.is_image = True
            self.attachment_type = 'image'
        elif self.mime_type and self.mime_type.startswith('audio/'):
            self.attachment_type = 'audio'
        elif self.mime_type and self.mime_type.startswith('video/'):
            self.attachment_type = 'video'
        elif self.mime_type and 'document' in self.mime_type:
            self.attachment_type = 'document'
        else:
            self.attachment_type = 'other'
        
        super().save(*args, **kwargs)


class MessageReaction(models.Model):
    """Reacciones a mensajes (emojis, likes, etc.)."""
    
    REACTION_TYPES = [
        ('like', '👍'),
        ('love', '❤️'),
        ('laugh', '😂'),
        ('surprised', '😮'),
        ('sad', '😢'),
        ('angry', '😠'),
    ]
    
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='reactions'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='message_reactions'
    )
    reaction_type = models.CharField('Tipo de reacción', max_length=20, choices=REACTION_TYPES)
    created_at = models.DateTimeField('Fecha de reacción', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Reacción a Mensaje'
        verbose_name_plural = 'Reacciones a Mensajes'
        unique_together = ['message', 'user']
        ordering = ['created_at']
        
    def __str__(self):
        return f"{self.get_reaction_type_display()} por {self.user.get_full_name()}"


class MessageFolder(models.Model):
    """Carpetas personalizadas para organizar mensajes."""
    
    FOLDER_TYPES = [
        ('custom', 'Personalizada'),
        ('system', 'Sistema'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='message_folders'
    )
    name = models.CharField('Nombre de la carpeta', max_length=100)
    description = models.TextField('Descripción', max_length=300, blank=True)
    folder_type = models.CharField('Tipo', max_length=20, choices=FOLDER_TYPES, default='custom')
    color = models.CharField('Color', max_length=7, default='#3B82F6')  # Color hex
    
    # Configuración
    is_default = models.BooleanField('Carpeta por defecto', default=False)
    is_visible = models.BooleanField('Visible', default=True)
    order = models.PositiveIntegerField('Orden', default=0)
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Carpeta de Mensajes'
        verbose_name_plural = 'Carpetas de Mensajes'
        unique_together = ['user', 'name']
        ordering = ['order', 'name']
        
    def __str__(self):
        return f"{self.name} - {self.user.get_full_name()}"


class MessageFolderItem(models.Model):
    """Relación entre mensajes y carpetas."""
    
    folder = models.ForeignKey(
        MessageFolder,
        on_delete=models.CASCADE,
        related_name='folder_items'
    )
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='folder_items'
    )
    added_at = models.DateTimeField('Fecha de adición', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Elemento de Carpeta'
        verbose_name_plural = 'Elementos de Carpetas'
        unique_together = ['folder', 'message']
        
    def __str__(self):
        return f"{self.message} en {self.folder.name}"


class MessageTemplate(models.Model):
    """Plantillas de mensajes para respuestas rápidas."""
    
    TEMPLATE_CATEGORIES = [
        ('greeting', 'Saludo'),
        ('inquiry_response', 'Respuesta a Consulta'),
        ('appointment', 'Cita'),
        ('follow_up', 'Seguimiento'),
        ('closing', 'Cierre'),
        ('custom', 'Personalizada'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='message_templates'
    )
    name = models.CharField('Nombre de la plantilla', max_length=100)
    category = models.CharField('Categoría', max_length=20, choices=TEMPLATE_CATEGORIES)
    subject = models.CharField('Asunto', max_length=200, blank=True)
    content = models.TextField('Contenido', max_length=2000)
    
    # Variables disponibles
    variables = models.JSONField(
        'Variables disponibles',
        default=list,
        help_text='Variables que se pueden usar en la plantilla'
    )
    
    # Configuración
    is_public = models.BooleanField('Plantilla pública', default=False)
    is_active = models.BooleanField('Activa', default=True)
    usage_count = models.PositiveIntegerField('Veces utilizada', default=0)
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Plantilla de Mensaje'
        verbose_name_plural = 'Plantillas de Mensajes'
        ordering = ['category', 'name']
        
    def __str__(self):
        return f"{self.name} - {self.user.get_full_name()}"


class ConversationAnalytics(models.Model):
    """Analíticas de conversaciones para métricas."""
    
    thread = models.OneToOneField(
        MessageThread,
        on_delete=models.CASCADE,
        related_name='analytics'
    )
    
    # Métricas de actividad
    total_messages = models.PositiveIntegerField('Total de mensajes', default=0)
    average_response_time = models.DurationField('Tiempo promedio de respuesta', null=True, blank=True)
    first_response_time = models.DurationField('Tiempo de primera respuesta', null=True, blank=True)
    
    # Métricas de participación
    messages_by_initiator = models.PositiveIntegerField('Mensajes del iniciador', default=0)
    messages_by_responder = models.PositiveIntegerField('Mensajes del respondedor', default=0)
    
    # Fechas importantes
    first_message_at = models.DateTimeField('Primer mensaje', null=True, blank=True)
    last_activity_at = models.DateTimeField('Última actividad', null=True, blank=True)
    
    # Estado de la conversación
    is_resolved = models.BooleanField('Resuelta', default=False)
    resolution_time = models.DurationField('Tiempo de resolución', null=True, blank=True)
    satisfaction_rating = models.PositiveIntegerField(
        'Calificación de satisfacción',
        null=True,
        blank=True,
        help_text='Escala de 1 a 5'
    )
    
    updated_at = models.DateTimeField('Última actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Analítica de Conversación'
        verbose_name_plural = 'Analíticas de Conversaciones'
        
    def __str__(self):
        return f"Analíticas - {self.thread.subject}"
