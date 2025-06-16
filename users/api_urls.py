"""
URLs de la API REST para la aplicación de usuarios de VeriHome.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

# Router para ViewSets
router = DefaultRouter()
router.register(r'users', api_views.UserViewSet)
router.register(r'landlord-profiles', api_views.LandlordProfileViewSet, basename='landlord-profile')
router.register(r'tenant-profiles', api_views.TenantProfileViewSet, basename='tenant-profile')
router.register(r'service-provider-profiles', api_views.ServiceProviderProfileViewSet, basename='service-provider-profile')
router.register(r'portfolio-items', api_views.PortfolioItemViewSet, basename='portfolio-item')

urlpatterns = [
    # Incluir rutas del router
    path('', include(router.urls)),
    
    # Endpoints personalizados
    path('auth/register/', api_views.UserRegistrationAPIView.as_view(), name='api_register'),
    path('auth/profile/', api_views.UserProfileAPIView.as_view(), name='api_profile'),
    path('auth/change-password/', api_views.ChangePasswordAPIView.as_view(), name='api_change_password'),
    
    # Verificación
    path('verification/request/', api_views.RequestVerificationAPIView.as_view(), name='api_request_verification'),
    path('verification/upload-documents/', api_views.UploadVerificationDocumentsAPIView.as_view(), name='api_upload_documents'),
    path('verification/status/', api_views.VerificationStatusAPIView.as_view(), name='api_verification_status'),
    
    # Búsqueda de usuarios
    path('search/', api_views.UserSearchAPIView.as_view(), name='api_user_search'),
    path('search/service-providers/', api_views.ServiceProviderSearchAPIView.as_view(), name='api_service_provider_search'),
    
    # Estadísticas
    path('stats/dashboard/', api_views.UserDashboardStatsAPIView.as_view(), name='api_dashboard_stats'),
]
