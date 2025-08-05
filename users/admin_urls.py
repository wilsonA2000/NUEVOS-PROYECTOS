"""
URLs para el sistema de administración avanzada.
"""

from django.urls import path
from . import admin_views

app_name = 'admin'

urlpatterns = [
    # Dashboard principal
    path('dashboard/', admin_views.admin_dashboard, name='dashboard'),
    
    # Gestión de usuarios
    path('users/', admin_views.user_management, name='user_management'),
    
    # Impersonación
    path('impersonate/<int:user_id>/', admin_views.start_impersonation, name='start_impersonation'),
    path('stop-impersonation/', admin_views.stop_impersonation, name='stop_impersonation'),
    path('impersonation-sessions/', admin_views.impersonation_sessions, name='impersonation_sessions'),
    
    # Registros y auditoría
    path('action-logs/', admin_views.admin_action_logs, name='action_logs'),
    path('permissions/', admin_views.admin_permissions, name='permissions'),
    
    # APIs
    path('api/impersonate/', admin_views.api_start_impersonation, name='api_start_impersonation'),
    path('api/stop-impersonation/', admin_views.api_stop_impersonation, name='api_stop_impersonation'),
    path('api/stats/', admin_views.api_admin_stats, name='api_admin_stats'),
] 