"""
Serializers para el sistema de notificaciones de VeriHome.
Maneja la serialización de datos para las APIs REST.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from .models import (
    NotificationChannel, NotificationTemplate, Notification,
    NotificationDelivery, NotificationPreference, NotificationDigest,
    NotificationAnalytics
)

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para usuarios."""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'get_full_name']
        
    def get_full_name(self, obj):
        return obj.get_full_name()


class NotificationChannelSerializer(serializers.ModelSerializer):
    """Serializer para canales de notificación."""
    
    channel_type_display = serializers.CharField(source='get_channel_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = NotificationChannel
        fields = [
            'id', 'name', 'channel_type', 'channel_type_display',
            'description', 'status', 'status_display', 'is_default',
            'priority', 'is_available', 'rate_limit_per_minute',
            'rate_limit_per_hour', 'retry_attempts', 'retry_delay_seconds',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'is_available']


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """Serializer para plantillas de notificación."""
    
    template_type_display = serializers.CharField(source='get_template_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    channels = NotificationChannelSerializer(many=True, read_only=True)
    channel_ids = serializers.PrimaryKeyRelatedField(
        queryset=NotificationChannel.objects.all(),
        many=True,
        write_only=True,
        source='channels'
    )
    created_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = NotificationTemplate
        fields = [
            'id', 'name', 'template_type', 'template_type_display',
            'title', 'subject', 'content_text', 'content_html',
            'channels', 'channel_ids', 'priority', 'priority_display',
            'variables', 'max_frequency_per_user_per_day',
            'is_active', 'is_system_template', 'created_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer para notificaciones."""
    
    recipient = UserBasicSerializer(read_only=True)
    template = NotificationTemplateSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    created_by = UserBasicSerializer(read_only=True)
    
    # Campos calculados
    is_expired = serializers.BooleanField(read_only=True)
    should_send_now = serializers.BooleanField(read_only=True)
    time_since_created = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'template', 'title', 'message',
            'priority', 'priority_display', 'status', 'status_display',
            'is_read', 'action_url', 'deep_link', 'data',
            'created_at', 'scheduled_at', 'sent_at', 'delivered_at',
            'read_at', 'expires_at', 'created_by', 'is_expired',
            'should_send_now', 'time_since_created'
        ]
        read_only_fields = [
            'id', 'sent_at', 'delivered_at', 'read_at', 'created_at',
            'is_expired', 'should_send_now'
        ]
    
    def get_time_since_created(self, obj):
        """Calcula el tiempo transcurrido desde la creación."""
        from django.utils import timezone
        
        if obj.created_at:
            delta = timezone.now() - obj.created_at
            
            if delta.days > 0:
                return f"{delta.days} día{'s' if delta.days != 1 else ''}"
            elif delta.seconds > 3600:
                hours = delta.seconds // 3600
                return f"{hours} hora{'s' if hours != 1 else ''}"
            elif delta.seconds > 60:
                minutes = delta.seconds // 60
                return f"{minutes} minuto{'s' if minutes != 1 else ''}"
            else:
                return "Hace un momento"
        
        return None


class NotificationCreateSerializer(serializers.Serializer):
    """Serializer para crear notificaciones."""
    
    recipient_id = serializers.IntegerField()
    title = serializers.CharField(max_length=200)
    message = serializers.CharField()
    template_name = serializers.CharField(required=False, allow_blank=True)
    priority = serializers.ChoiceField(
        choices=Notification.PRIORITY_LEVELS,
        default='normal'
    )
    channels = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
    action_url = serializers.URLField(required=False, allow_blank=True)
    deep_link = serializers.CharField(required=False, allow_blank=True)
    data = serializers.JSONField(required=False, default=dict)
    scheduled_at = serializers.DateTimeField(required=False, allow_null=True)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    context = serializers.JSONField(required=False, default=dict)
    
    def validate_recipient_id(self, value):
        """Valida que el destinatario exista."""
        try:
            User.objects.get(id=value)
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Usuario destinatario no encontrado.")
    
    def validate_channels(self, value):
        """Valida que los canales existan y estén activos."""
        if value:
            valid_channels = NotificationChannel.objects.filter(
                channel_type__in=value,
                status='active'
            ).values_list('channel_type', flat=True)
            
            invalid_channels = set(value) - set(valid_channels)
            if invalid_channels:
                raise serializers.ValidationError(
                    f"Canales inválidos o inactivos: {', '.join(invalid_channels)}"
                )
        
        return value
    
    def validate(self, data):
        """Validaciones adicionales."""
        scheduled_at = data.get('scheduled_at')
        expires_at = data.get('expires_at')
        
        if scheduled_at and expires_at and scheduled_at >= expires_at:
            raise serializers.ValidationError(
                "La fecha de expiración debe ser posterior a la fecha programada."
            )
        
        return data


class BulkNotificationSerializer(serializers.Serializer):
    """Serializer para notificaciones masivas."""
    
    recipient_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=1000
    )
    title = serializers.CharField(max_length=200)
    message = serializers.CharField()
    template_name = serializers.CharField(required=False, allow_blank=True)
    priority = serializers.ChoiceField(
        choices=Notification.PRIORITY_LEVELS,
        default='normal'
    )
    channels = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
    action_url = serializers.URLField(required=False, allow_blank=True)
    data = serializers.JSONField(required=False, default=dict)
    
    def validate_recipient_ids(self, value):
        """Valida que todos los destinatarios existan."""
        existing_ids = set(User.objects.filter(id__in=value).values_list('id', flat=True))
        invalid_ids = set(value) - existing_ids
        
        if invalid_ids:
            raise serializers.ValidationError(
                f"IDs de usuario inválidos: {', '.join(map(str, invalid_ids))}"
            )
        
        return value


class NotificationDeliverySerializer(serializers.ModelSerializer):
    """Serializer para entregas de notificaciones."""
    
    notification = NotificationSerializer(read_only=True)
    channel = NotificationChannelSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    can_retry = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = NotificationDelivery
        fields = [
            'id', 'notification', 'channel', 'status', 'status_display',
            'sent_to', 'external_id', 'tracking_id', 'response_data',
            'error_code', 'error_message', 'retry_count', 'can_retry',
            'created_at', 'sent_at', 'delivered_at', 'clicked_at',
            'next_retry_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'sent_at', 'delivered_at',
            'clicked_at', 'can_retry'
        ]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer para preferencias de notificación."""
    
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'user', 'is_enabled', 'allow_email', 'allow_sms',
            'allow_push', 'allow_in_app', 'marketing_notifications',
            'system_notifications', 'security_notifications',
            'property_notifications', 'contract_notifications',
            'payment_notifications', 'message_notifications',
            'rating_notifications', 'quiet_hours_start',
            'quiet_hours_end', 'timezone', 'email_frequency',
            'digest_enabled', 'digest_frequency', 'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class NotificationDigestSerializer(serializers.ModelSerializer):
    """Serializer para resúmenes de notificaciones."""
    
    user = UserBasicSerializer(read_only=True)
    digest_type_display = serializers.CharField(source='get_digest_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = NotificationDigest
        fields = [
            'id', 'user', 'digest_type', 'digest_type_display',
            'status', 'status_display', 'period_start', 'period_end',
            'notification_count', 'summary_data', 'sent_at',
            'email_sent', 'created_at'
        ]
        read_only_fields = [
            'id', 'user', 'sent_at', 'email_sent', 'created_at'
        ]


class NotificationAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer para analíticas de notificaciones."""
    
    channel = NotificationChannelSerializer(read_only=True)
    
    class Meta:
        model = NotificationAnalytics
        fields = [
            'id', 'date', 'channel', 'notifications_sent',
            'notifications_delivered', 'notifications_failed',
            'notifications_clicked', 'notifications_read',
            'avg_delivery_time_seconds', 'avg_read_time_seconds',
            'delivery_rate', 'click_rate', 'read_rate',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'delivery_rate',
            'click_rate', 'read_rate'
        ]


class NotificationStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de notificaciones."""
    
    total_notifications = serializers.IntegerField()
    unread_notifications = serializers.IntegerField()
    read_notifications = serializers.IntegerField()
    recent_notifications = serializers.IntegerField()
    read_rate = serializers.FloatField()
    priority_breakdown = serializers.DictField()


class MarkAsReadSerializer(serializers.Serializer):
    """Serializer para marcar notificaciones como leídas."""
    
    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True
    )
    mark_all = serializers.BooleanField(default=False)
    
    def validate(self, data):
        """Valida que se proporcione al menos una opción."""
        if not data.get('mark_all') and not data.get('notification_ids'):
            raise serializers.ValidationError(
                "Debe especificar 'mark_all' o proporcionar 'notification_ids'."
            )
        
        return data


class NotificationTestSerializer(serializers.Serializer):
    """Serializer para probar envío de notificaciones."""
    
    channel_type = serializers.ChoiceField(
        choices=[
            ('email', 'Email'),
            ('sms', 'SMS'),
            ('push', 'Push'),
            ('in_app', 'In-App'),
            ('webhook', 'Webhook'),
        ]
    )
    recipient_id = serializers.IntegerField(required=False)
    test_message = serializers.CharField(
        default="Esta es una notificación de prueba desde VeriHome."
    )
    
    def validate_recipient_id(self, value):
        """Valida que el destinatario exista si se proporciona."""
        if value:
            try:
                User.objects.get(id=value)
                return value
            except User.DoesNotExist:
                raise serializers.ValidationError("Usuario no encontrado.")
        return value


class NotificationSearchSerializer(serializers.Serializer):
    """Serializer para búsqueda de notificaciones."""
    
    query = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=Notification.STATUS_CHOICES,
        required=False,
        allow_blank=True
    )
    priority = serializers.ChoiceField(
        choices=Notification.PRIORITY_LEVELS,
        required=False,
        allow_blank=True
    )
    template_type = serializers.ChoiceField(
        choices=NotificationTemplate.TEMPLATE_TYPES,
        required=False,
        allow_blank=True
    )
    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)
    is_read = serializers.BooleanField(required=False)
    page = serializers.IntegerField(default=1, min_value=1)
    page_size = serializers.IntegerField(default=20, min_value=1, max_value=100)
    
    def validate(self, data):
        """Validaciones adicionales."""
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError(
                "La fecha 'desde' no puede ser posterior a la fecha 'hasta'."
            )
        
        return data