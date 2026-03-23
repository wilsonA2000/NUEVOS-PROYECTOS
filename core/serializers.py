"""
Serializers para la aplicación core de VeriHome.
"""

from rest_framework import serializers
from .models import Notification, ActivityLog, SystemAlert, SupportTicket, TicketResponse


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer para notificaciones."""
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message', 'priority', 
            'is_read', 'created_at', 'action_url', 'action_label'
        ]
        read_only_fields = ['id', 'created_at']


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer para logs de actividad."""
    
    class Meta:
        model = ActivityLog
        fields = ['id', 'action_type', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class SystemAlertSerializer(serializers.ModelSerializer):
    """Serializer para alertas del sistema."""
    
    class Meta:
        model = SystemAlert
        fields = [
            'id', 'title', 'description', 'level', 'category', 
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class TicketResponseSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)

    class Meta:
        model = TicketResponse
        fields = ['id', 'ticket', 'author', 'author_name', 'message', 'is_internal', 'attachment', 'created_at']
        read_only_fields = ['id', 'created_at']


class SupportTicketSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, default='Visitante web')
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True, default='')
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True, default='Sin asignar')
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    department_display = serializers.CharField(source='get_department_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    responses = TicketResponseSerializer(many=True, read_only=True)
    responses_count = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = [
            'id', 'ticket_number', 'subject', 'description',
            'category', 'category_display', 'department', 'department_display',
            'priority', 'priority_display', 'status', 'status_display',
            'created_by', 'created_by_name', 'created_by_email',
            'assigned_to', 'assigned_to_name',
            'contact_message',
            'responses', 'responses_count',
            'created_at', 'updated_at', 'resolved_at', 'closed_at',
        ]
        read_only_fields = ['id', 'ticket_number', 'created_at', 'updated_at', 'resolved_at', 'closed_at']

    def get_responses_count(self, obj):
        return obj.responses.count()