"""
URLs para la aplicación de usuarios de VeriHome.
Incluye perfiles, registro y gestión de usuarios.
"""

from django.urls import path
from . import views
from .debug_view import DebugLandlordRegistrationView

app_name = 'users'

urlpatterns = [
    # Registro por tipo de usuario
    path('registro/', views.UserTypeSelectionView.as_view(), name='register_select'),
    path('registro/arrendador/', views.LandlordRegistrationView.as_view(), name='register_landlord'),
    path('registro/arrendatario/', views.TenantRegistrationView.as_view(), name='register_tenant'),
    path('registro/prestador-servicios/', views.ServiceProviderRegistrationView.as_view(), name='register_service_provider'),
    path('debug-registro/', DebugLandlordRegistrationView.as_view(), name='debug_register'),
    
    # Perfil del usuario
    path('perfil/', views.ProfileView.as_view(), name='profile'),
    path('perfil/editar/', views.EditProfileView.as_view(), name='edit_profile'),
    path('perfil/<uuid:pk>/', views.PublicProfileView.as_view(), name='public_profile'),
    
    # Verificación de usuario
    path('verificacion/', views.VerificationView.as_view(), name='verification'),
    path('verificacion/documentos/', views.DocumentVerificationView.as_view(), name='document_verification'),
    path('verificacion/identidad/', views.IdentityVerificationView.as_view(), name='identity_verification'),
    
    # Configuración de cuenta
    path('configuracion/', views.AccountSettingsView.as_view(), name='settings'),
    path('configuracion/privacidad/', views.PrivacySettingsView.as_view(), name='privacy_settings'),
    path('configuracion/notificaciones/', views.NotificationSettingsView.as_view(), name='notification_settings'),
    path('configuracion/seguridad/', views.SecuritySettingsView.as_view(), name='security_settings'),
    
    # Portafolio (para prestadores de servicios)
    path('portafolio/', views.PortfolioView.as_view(), name='portfolio'),
    path('portafolio/agregar/', views.AddPortfolioItemView.as_view(), name='add_portfolio_item'),
    path('portafolio/<int:pk>/editar/', views.EditPortfolioItemView.as_view(), name='edit_portfolio_item'),
    path('portafolio/<int:pk>/eliminar/', views.DeletePortfolioItemView.as_view(), name='delete_portfolio_item'),
    
    # Listados de usuarios
    path('arrendadores/', views.LandlordListView.as_view(), name='landlord_list'),
    path('prestadores-servicios/', views.ServiceProviderListView.as_view(), name='service_provider_list'),
    
    # Búsqueda de usuarios
    path('buscar-prestadores/', views.ServiceProviderSearchView.as_view(), name='search_service_providers'),
    
    # Actividad del usuario
    path('actividad/', views.UserActivityView.as_view(), name='activity'),
    
    # Favoritos
    path('favoritos/', views.FavoritesView.as_view(), name='favorites'),
]
