"""
URLs para la aplicación de usuarios de VeriHome.
"""

from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    # Registro y autenticación
    path('registro/seleccionar/', views.RegisterSelectView.as_view(), name='register_select'),
    path('registro/entrevista/', views.InterviewCodeVerificationView.as_view(), name='interview_verification'),
    path('registro/', views.UserRegistrationView.as_view(), name='register'),
    
    # Perfiles
    path('perfil/', views.ProfileView.as_view(), name='profile'),
    path('perfil/editar/', views.ProfileEditView.as_view(), name='profile_edit'),
    path('configuracion/', views.SettingsView.as_view(), name='settings'),
    
    # Proveedores de servicios
    path('proveedores-servicios/', views.ServiceProviderListView.as_view(), name='service_provider_list'),
]