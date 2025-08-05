"""
URLs para la aplicación core de VeriHome.
Incluye la página principal y rutas comunes.
"""

from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    # Página principal
    path('', views.HomeView.as_view(), name='home'),
    
    # Dashboard personalizado por tipo de usuario
    # path('dashboard/', views.DashboardView.as_view(), name='dashboard'),  # Comentado para usar solo React
    
    # Páginas informativas
    path('acerca-de/', views.AboutView.as_view(), name='about'),
    path('contacto/', views.ContactView.as_view(), name='contact'),
    path('preguntas-frecuentes/', views.FAQView.as_view(), name='faq'),
    path('terminos-y-condiciones/', views.TermsView.as_view(), name='terms'),
    path('politica-de-privacidad/', views.PrivacyView.as_view(), name='privacy'),
    
    # Soporte
    path('soporte/', views.SupportView.as_view(), name='support'),
    path('soporte/nuevo-ticket/', views.CreateTicketView.as_view(), name='create_ticket'),
    path('soporte/ticket/<uuid:pk>/', views.TicketDetailView.as_view(), name='ticket_detail'),
    
    # Notificaciones
    # path('notificaciones/', views.NotificationListView.as_view(), name='notifications'),  # Comentado para usar solo React
    # path('notificaciones/<uuid:pk>/marcar-leida/', views.MarkNotificationReadView.as_view(), name='mark_notification_read'),  # Comentado para usar solo React
    # path('notificaciones/marcar-todas-leidas/', views.MarkAllNotificationsReadView.as_view(), name='mark_all_notifications_read'),  # Comentado para usar solo React
    
    # Búsqueda global
    path('buscar/', views.GlobalSearchView.as_view(), name='global_search'),
    
    # Analytics y métricas (para usuarios premium/administradores)
    path('analytics/', views.AnalyticsView.as_view(), name='analytics'),
    
    # Estado del sistema
    path('estado/', views.SystemStatusView.as_view(), name='system_status'),
]
