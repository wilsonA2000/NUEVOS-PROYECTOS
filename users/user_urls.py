"""
URLs para las vistas de actividad del usuario y notificaciones.
"""

from django.urls import path
from . import user_views

app_name = 'user'

urlpatterns = [
    # Dashboard de actividad
    path('activity/', user_views.user_activity_dashboard, name='activity_dashboard'),
    path('activity/history/', user_views.user_activity_history, name='activity_history'),
    path('activity/<int:activity_id>/', user_views.activity_detail, name='activity_detail'),
    
    # Acciones administrativas
    path('admin-actions/', user_views.admin_actions_on_user, name='admin_actions'),
    path('admin-actions/<int:action_id>/', user_views.admin_action_detail, name='admin_action_detail'),
    
    # Notificaciones
    path('notifications/', user_views.user_notifications, name='notifications'),
    path('notifications/<int:notification_id>/read/', user_views.mark_notification_read, name='mark_notification_read'),
    path('notifications/read-all/', user_views.mark_all_notifications_read, name='mark_all_notifications_read'),
    
    # Historial de impersonación
    path('impersonation-history/', user_views.impersonation_history, name='impersonation_history'),
    
    # APIs
    path('api/activity-summary/', user_views.api_user_activity_summary, name='api_activity_summary'),
    path('api/notifications/', user_views.api_user_notifications, name='api_notifications'),
    path('api/admin-actions/', user_views.api_admin_actions_on_user, name='api_admin_actions'),
    path('api/notifications/<int:notification_id>/read/', user_views.api_mark_notification_read, name='api_mark_notification_read'),
] 