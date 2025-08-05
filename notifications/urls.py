"""
URLs para el sistema de notificaciones de VeriHome.
Define rutas para APIs REST y vistas de notificaciones.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    NotificationChannelViewSet, NotificationTemplateViewSet,
    NotificationViewSet, NotificationDigestViewSet,
    NotificationAnalyticsViewSet, BulkNotificationAPIView,
    NotificationPreferenceAPIView, NotificationTestAPIView,
    NotificationProcessAPIView
)

# Configurar router para ViewSets
router = DefaultRouter()
router.register('channels', NotificationChannelViewSet, basename='notification-channels')
router.register('templates', NotificationTemplateViewSet, basename='notification-templates')
router.register('notifications', NotificationViewSet, basename='notifications')
router.register('digests', NotificationDigestViewSet, basename='notification-digests')
router.register('analytics', NotificationAnalyticsViewSet, basename='notification-analytics')

app_name = 'notifications'

urlpatterns = [
    # API REST endpoints
    path('api/', include(router.urls)),
    
    # Endpoints específicos
    path('api/bulk/', BulkNotificationAPIView.as_view(), name='bulk-notifications'),
    path('api/preferences/', NotificationPreferenceAPIView.as_view(), name='user-preferences'),
    path('api/test/', NotificationTestAPIView.as_view(), name='test-notification'),
    path('api/process/', NotificationProcessAPIView.as_view(), name='process-notifications'),
]