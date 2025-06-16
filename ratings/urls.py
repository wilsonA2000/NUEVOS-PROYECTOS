"""
URLs simplificadas para la aplicación de calificaciones de VeriHome.
"""

from django.urls import path
from . import views

app_name = 'ratings'

urlpatterns = [
    # Dashboard principal
    path('', views.RatingDashboardView.as_view(), name='dashboard'),
    
    # Mis calificaciones
    path('mis-calificaciones/', views.MyRatingsView.as_view(), name='my_ratings'),
    
    # Mis calificaciones recibidas
    path('recibidas/', views.ReceivedRatingsView.as_view(), name='received'),
    path('recibidas/<int:pk>/', views.RatingDetailView.as_view(), name='rating_detail'),
    
    # Mis calificaciones dadas
    path('dadas/', views.GivenRatingsView.as_view(), name='given'),
    path('dada/<int:pk>/', views.RatingDetailView.as_view(), name='given_rating_detail'),
    
    # Crear calificaciones
    path('calificar/<int:user_pk>/', views.CreateRatingView.as_view(), name='create_rating'),
    path('calificar-usuario/<int:user_pk>/', views.RateUserView.as_view(), name='rate_user'),
    path('calificar-propiedad/<int:property_pk>/', views.RatePropertyView.as_view(), name='rate_property'),
    path('calificar-servicio/<int:service_pk>/', views.RateServiceView.as_view(), name='rate_service'),
    
    # Invitaciones
    path('invitaciones/', views.RatingInvitationListView.as_view(), name='invitations'),
    
    # Estadísticas básicas
    path('estadisticas/', views.RatingStatsView.as_view(), name='stats'),
    
    # Configuración
    path('configuracion/', views.RatingSettingsView.as_view(), name='settings'),
]
