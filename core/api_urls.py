"""
URLs de la API REST para la aplicación core de VeriHome.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

# Router para ViewSets
router = DefaultRouter()
router.register(r'notifications', api_views.NotificationViewSet, basename='notification')
router.register(r'activity-logs', api_views.ActivityLogViewSet, basename='activity-log')
router.register(r'system-alerts', api_views.SystemAlertViewSet, basename='system-alert')

urlpatterns = [
    # Incluir rutas del router
    path('', include(router.urls)),
    
    # Endpoints de prueba
    path('health/', api_views.health_check, name='health_check'),
    path('test/', api_views.test_connection, name='test_connection'),
    
    # Notificaciones
    path('notifications/mark-all-read/', api_views.MarkAllNotificationsReadAPIView.as_view(), name='api_mark_all_notifications_read'),
    
    # Estadísticas generales
    path('stats/dashboard/', api_views.DashboardStatsAPIView.as_view(), name='api_dashboard_stats'),
    path('stats/overview/', api_views.SystemOverviewAPIView.as_view(), name='api_system_overview'),
] 