from rest_framework import serializers
from .models import (
    Conversation, Message, MessageThread, MessageFolder, MessageTemplate,
    MessageAttachment, MessageReaction, ThreadParticipant, ConversationAnalytics
)
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']

class ConversationSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'created_at']

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    recipient = UserSerializer(read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'thread', 'sender', 'recipient', 'message_type', 'content',
            'status', 'is_read', 'is_starred', 'sent_at', 'read_at'
        ]
        read_only_fields = ['id', 'sent_at', 'read_at']
    
    def create(self, validated_data):
        # Set the sender to the current user
        validated_data['sender'] = self.context['request'].user
        
        # Get the thread and find the other participant as recipient
        thread = validated_data['thread']
        recipient = thread.participants.exclude(id=self.context['request'].user.id).first()
        
        if recipient:
            validated_data['recipient'] = recipient
        else:
            # If no other participant found, set recipient to sender (self-message)
            validated_data['recipient'] = self.context['request'].user
        
        return super().create(validated_data)

class MessageThreadSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    last_message = MessageSerializer(read_only=True)
    
    class Meta:
        model = MessageThread
        fields = [
            'id', 'subject', 'thread_type', 'participants', 'status',
            'is_priority', 'created_at', 'last_message_at', 'last_message'
        ]
        read_only_fields = ['id', 'created_at', 'last_message_at']
    
    def create(self, validated_data):
        # Get participants from context
        participants_data = self.context.get('participants', [])
        
        # Create the thread
        thread = MessageThread.objects.create(
            **validated_data,
            created_by=self.context['request'].user
        )
        
        # Add the creator as a participant
        thread.participants.add(self.context['request'].user)
        
        # Add other participants
        for participant_id in participants_data:
            try:
                participant = User.objects.get(id=participant_id)
                thread.participants.add(participant)
            except User.DoesNotExist:
                pass
        
        return thread

class MessageFolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageFolder
        fields = ['id', 'name', 'description', 'color', 'is_default', 'created_at']
        read_only_fields = ['id', 'created_at']

class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = [
            'id', 'name', 'category', 'subject', 'content', 'variables',
            'is_public', 'is_active', 'usage_count', 'created_at'
        ]
        read_only_fields = ['id', 'usage_count', 'created_at']


class MessageAttachmentSerializer(serializers.ModelSerializer):
    """Serializer para archivos adjuntos de mensajes."""
    
    file_url = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()
    
    class Meta:
        model = MessageAttachment
        fields = [
            'id', 'file', 'file_url', 'original_filename', 'file_size',
            'file_size_display', 'mime_type', 'attachment_type', 'description',
            'is_image', 'uploaded_at'
        ]
        read_only_fields = ['id', 'uploaded_at', 'attachment_type', 'is_image']
    
    def get_file_url(self, obj):
        """Devuelve la URL del archivo."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_file_size_display(self, obj):
        """Devuelve el tamaño del archivo en formato legible."""
        size = obj.file_size
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        else:
            return f"{size / (1024 * 1024):.1f} MB"


class MessageReactionSerializer(serializers.ModelSerializer):
    """Serializer para reacciones a mensajes."""
    
    user = UserSerializer(read_only=True)
    emoji = serializers.SerializerMethodField()
    
    class Meta:
        model = MessageReaction
        fields = ['id', 'user', 'reaction_type', 'emoji', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_emoji(self, obj):
        """Devuelve el emoji de la reacción."""
        return dict(MessageReaction.REACTION_TYPES).get(obj.reaction_type, '')


class ThreadParticipantSerializer(serializers.ModelSerializer):
    """Serializer para participantes de conversaciones."""
    
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = ThreadParticipant
        fields = [
            'id', 'user', 'is_active', 'is_archived', 'is_muted', 'is_starred',
            'joined_at', 'last_read_at', 'archived_at'
        ]
        read_only_fields = ['id', 'joined_at']


class AdvancedMessageSerializer(MessageSerializer):
    """Serializer avanzado para mensajes con funcionalidades extendidas."""
    
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    reactions = MessageReactionSerializer(many=True, read_only=True)
    reply_to = serializers.SerializerMethodField()
    reactions_summary = serializers.SerializerMethodField()
    
    class Meta(MessageSerializer.Meta):
        fields = MessageSerializer.Meta.fields + [
            'attachments', 'reactions', 'reply_to', 'reactions_summary',
            'is_flagged', 'is_deleted_by_sender', 'is_deleted_by_recipient',
            'delivered_at', 'ip_address'
        ]
        read_only_fields = MessageSerializer.Meta.read_only_fields + [
            'delivered_at', 'ip_address'
        ]
    
    def get_reply_to(self, obj):
        """Devuelve información del mensaje al que se responde."""
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'content': obj.reply_to.content[:100] + '...' if len(obj.reply_to.content) > 100 else obj.reply_to.content,
                'sender_name': obj.reply_to.sender.get_full_name(),
                'sent_at': obj.reply_to.sent_at
            }
        return None
    
    def get_reactions_summary(self, obj):
        """Devuelve resumen de reacciones agrupadas."""
        reactions = obj.reactions.all()
        summary = {}
        
        for reaction in reactions:
            reaction_type = reaction.reaction_type
            if reaction_type not in summary:
                summary[reaction_type] = {
                    'count': 0,
                    'emoji': dict(MessageReaction.REACTION_TYPES)[reaction_type],
                    'users': []
                }
            summary[reaction_type]['count'] += 1
            summary[reaction_type]['users'].append(reaction.user.get_full_name())
        
        return summary


class AdvancedMessageThreadSerializer(MessageThreadSerializer):
    """Serializer avanzado para hilos de conversación."""
    
    thread_participants = ThreadParticipantSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    latest_messages = serializers.SerializerMethodField()
    
    class Meta(MessageThreadSerializer.Meta):
        fields = MessageThreadSerializer.Meta.fields + [
            'thread_participants', 'message_count', 'unread_count',
            'latest_messages', 'property', 'contract'
        ]
    
    def get_message_count(self, obj):
        """Devuelve el total de mensajes en la conversación."""
        return obj.messages.count()
    
    def get_unread_count(self, obj):
        """Devuelve mensajes no leídos para el usuario actual."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.get_unread_count(request.user)
        return 0
    
    def get_latest_messages(self, obj):
        """Devuelve los últimos 3 mensajes de la conversación."""
        latest_messages = obj.messages.order_by('-sent_at')[:3]
        return AdvancedMessageSerializer(
            latest_messages,
            many=True,
            context=self.context
        ).data


class ConversationAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer para analíticas de conversaciones."""
    
    thread_subject = serializers.CharField(source='thread.subject', read_only=True)
    
    class Meta:
        model = ConversationAnalytics
        fields = [
            'id', 'thread_subject', 'total_messages', 'average_response_time',
            'first_response_time', 'messages_by_initiator', 'messages_by_responder',
            'first_message_at', 'last_activity_at', 'is_resolved',
            'resolution_time', 'satisfaction_rating', 'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']


class MessageSearchSerializer(serializers.Serializer):
    """Serializer para búsqueda de mensajes."""
    
    query = serializers.CharField(max_length=200, required=False, allow_blank=True)
    thread_type = serializers.ChoiceField(
        choices=MessageThread.THREAD_TYPES,
        required=False,
        allow_blank=True
    )
    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)
    sender_id = serializers.IntegerField(required=False)
    has_attachments = serializers.BooleanField(required=False)
    is_read = serializers.BooleanField(required=False)
    
    def validate(self, data):
        """Validar parámetros de búsqueda."""
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError(
                "La fecha 'desde' no puede ser posterior a la fecha 'hasta'"
            )
        
        return data


class MessageCreateSerializer(serializers.ModelSerializer):
    """Serializer específico para crear mensajes."""
    
    attachments = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = Message
        fields = [
            'thread', 'content', 'message_type', 'reply_to', 'attachments'
        ]
    
    def validate_content(self, value):
        """Validar contenido del mensaje."""
        if not value or not value.strip():
            raise serializers.ValidationError("El contenido no puede estar vacío")
        
        if len(value) > 5000:
            raise serializers.ValidationError(
                "El mensaje es demasiado largo (máximo 5000 caracteres)"
            )
        
        return value.strip()
    
    def validate_thread(self, value):
        """Validar que el usuario puede participar en la conversación."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if not value.can_participate(request.user):
                raise serializers.ValidationError(
                    "No tienes permisos para participar en esta conversación"
                )
        return value


class ConversationCreateSerializer(serializers.Serializer):
    """Serializer para crear nuevas conversaciones."""
    
    recipient_id = serializers.IntegerField()
    subject = serializers.CharField(max_length=200)
    initial_message = serializers.CharField(max_length=5000)
    thread_type = serializers.ChoiceField(
        choices=MessageThread.THREAD_TYPES,
        default='general'
    )
    property_id = serializers.UUIDField(required=False, allow_null=True)
    contract_id = serializers.UUIDField(required=False, allow_null=True)
    attachments = serializers.ListField(
        child=serializers.FileField(),
        required=False
    )
    
    def validate_recipient_id(self, value):
        """Validar que el destinatario existe y es válido."""
        try:
            recipient = User.objects.get(id=value)
            
            # Verificar que no sea el mismo usuario
            request = self.context.get('request')
            if request and request.user.id == value:
                raise serializers.ValidationError(
                    "No puedes crear una conversación contigo mismo"
                )
            
            if not recipient.is_active:
                raise serializers.ValidationError(
                    "El usuario destinatario no está activo"
                )
            
            return value
            
        except User.DoesNotExist:
            raise serializers.ValidationError("Usuario destinatario no encontrado")
    
    def validate_subject(self, value):
        """Validar asunto de la conversación."""
        if not value or not value.strip():
            raise serializers.ValidationError("El asunto no puede estar vacío")
        return value.strip()
    
    def validate_initial_message(self, value):
        """Validar mensaje inicial."""
        if not value or not value.strip():
            raise serializers.ValidationError("El mensaje inicial no puede estar vacío")
        return value.strip()


class BulkMessageActionSerializer(serializers.Serializer):
    """Serializer para acciones masivas en mensajes."""
    
    message_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=100
    )
    action = serializers.ChoiceField(
        choices=[
            ('mark_read', 'Marcar como leído'),
            ('mark_unread', 'Marcar como no leído'),
            ('star', 'Destacar'),
            ('unstar', 'Quitar destacado'),
            ('delete', 'Eliminar'),
            ('archive', 'Archivar')
        ]
    )
    
    def validate_message_ids(self, value):
        """Validar que los mensajes existen y pertenecen al usuario."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Usuario no autenticado")
        
        # Verificar que todos los mensajes existen y pertenecen al usuario
        user_message_ids = Message.objects.filter(
            id__in=value,
            recipient=request.user
        ).values_list('id', flat=True)
        
        if len(user_message_ids) != len(value):
            raise serializers.ValidationError(
                "Algunos mensajes no existen o no te pertenecen"
            )
        
        return value