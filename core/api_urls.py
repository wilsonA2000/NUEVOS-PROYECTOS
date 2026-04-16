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
router.register(r'tickets', api_views.SupportTicketViewSet, basename='support-ticket')

urlpatterns = [
    # Incluir rutas del router
    path('', include(router.urls)),

    # Formulario de contacto público
    path('contact/', api_views.ContactMessageAPIView.as_view(), name='api_contact_message'),

    # FAQ público
    path('faqs/', api_views.FAQListAPIView.as_view(), name='api_faqs'),

    # Endpoints de prueba
    path('health/', api_views.health_check, name='health_check'),
    path('test/', api_views.test_connection, name='test_connection'),
    
    # Notificaciones
    path('notifications/mark-all-read/', api_views.MarkAllNotificationsReadAPIView.as_view(), name='api_mark_all_notifications_read'),
    
    # Audit logs globales (admin). ADM-04.
    path('audit-logs/', api_views.GlobalAuditLogAPIView.as_view(), name='api_audit_logs'),

    # SLA dashboard (admin). ADM-02.
    path('admin/sla-dashboard/', api_views.SLADashboardAPIView.as_view(), name='api_sla_dashboard'),

    # Estadísticas generales
    path('stats/dashboard/', api_views.DashboardStatsAPIView.as_view(), name='api_dashboard_stats'),
    path('stats/overview/', api_views.SystemOverviewAPIView.as_view(), name='api_system_overview'),
    path('security/analysis/', api_views.SecurityAnalysisAPIView.as_view(), name='api_security_analysis'),

    # Mantenimiento del sistema (admin only)
    path('maintenance/health/', api_views.maintenance_health_check, name='maintenance_health'),
    path('maintenance/clear-logs/', api_views.maintenance_clear_logs, name='maintenance_clear_logs'),
    path('maintenance/clear-cache/', api_views.maintenance_clear_cache, name='maintenance_clear_cache'),
    path('maintenance/clear-sessions/', api_views.maintenance_clear_sessions, name='maintenance_clear_sessions'),
    path('maintenance/optimize-db/', api_views.maintenance_optimize_db, name='maintenance_optimize_db'),
]