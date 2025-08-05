"""
Serializers para la aplicación core de VeriHome.
"""

from rest_framework import serializers
from .models import Notification, ActivityLog, SystemAlert


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