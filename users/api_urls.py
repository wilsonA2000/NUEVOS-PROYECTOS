"""
URLs de la API REST para la aplicación de usuarios de VeriHome.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import api_views
from .api_views import CustomTokenObtainPairView
from .api_interview import ValidateInterviewCodeView, RegisterWithCodeView, ContactRequestView

# Router para ViewSets
router = DefaultRouter()
router.register(r'users', api_views.UserViewSet)
router.register(r'landlord-profiles', api_views.LandlordProfileViewSet, basename='landlord-profile')
router.register(r'tenant-profiles', api_views.TenantProfileViewSet, basename='tenant-profile')
router.register(r'service-provider-profiles', api_views.ServiceProviderProfileViewSet, basename='service-provider-profile')
router.register(r'portfolio-items', api_views.PortfolioItemViewSet, basename='portfolio-item')
router.register(r'activity-logs', api_views.UserActivityLogViewSet, basename='activity-log')

urlpatterns = [
    # Incluir rutas del router
    path('', include(router.urls)),
    
    # Autenticación JWT
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', api_views.UserProfileView.as_view(), name='api_profile'),
    path('auth/logout/', api_views.LogoutAPIView.as_view(), name='api_logout'),
    path('auth/confirm-email/<path:key>/', api_views.EmailConfirmationView.as_view(), name='api_confirm_email'),
    path('auth/resend-confirmation/', api_views.ResendEmailConfirmationView.as_view(), name='api_resend_confirmation'),
    
    # Sistema de códigos de entrevista
    path('interview/', include('users.urls_interview')),
    
    # Endpoints personalizados
    path('auth/register/', api_views.SimpleRegistrationView.as_view(), name='api_register'),
    path('auth/register-with-interview/', api_views.UserRegistrationView.as_view(), name='api_register_with_interview'),
    path('auth/register-with-code/', RegisterWithCodeView.as_view(), name='api_register_with_code'),
    path('auth/validate-interview-code/', ValidateInterviewCodeView.as_view(), name='api_validate_interview_code'),
    path('auth/change-password/', api_views.ChangePasswordAPIView.as_view(), name='api_change_password'),
    path('auth/forgot-password/', api_views.ForgotPasswordView.as_view(), name='api_forgot_password'),
    path('auth/reset-password/', api_views.ResetPasswordView.as_view(), name='api_reset_password'),
    
    # Contacto público
    path('contact/', ContactRequestView.as_view(), name='api_contact'),
    
    # Verificación
    path('verification/request/', api_views.RequestVerificationAPIView.as_view(), name='api_request_verification'),
    path('verification/upload-documents/', api_views.UploadVerificationDocumentsAPIView.as_view(), name='api_upload_documents'),
    path('verification/status/', api_views.VerificationStatusAPIView.as_view(), name='api_verification_status'),
    
    # Búsqueda de usuarios
    path('search/', api_views.UserSearchAPIView.as_view(), name='api_user_search'),
    path('search/service-providers/', api_views.ServiceProviderSearchAPIView.as_view(), name='api_service_provider_search'),
    
    # Estadísticas
    path('stats/dashboard/', api_views.UserDashboardStatsAPIView.as_view(), name='api_dashboard_stats'),
    
    # Perfil de usuario
    path('profile/', api_views.ProfileView.as_view(), name='profile'),
    path('avatar/', api_views.AvatarUploadView.as_view(), name='avatar_upload'),
    
    # Hoja de vida
    path('resume/', api_views.ResumeView.as_view(), name='resume'),
    
    # Ajustes
    path('settings/', api_views.SettingsView.as_view(), name='settings'),
    
    # Códigos de entrevista
    path('verify-interview-code/', api_views.InterviewCodeVerificationView.as_view(), name='verify_interview_code'),
    path('create-interview-code/', api_views.create_interview_code, name='create_interview_code'),
    
    # Dashboard y estadísticas
    path('dashboard/', api_views.UserDashboardStatsAPIView.as_view(), name='dashboard'),
    
    # Notificaciones
    path('notifications/', api_views.UserNotificationsAPIView.as_view(), name='api_user_notifications'),
    path('notifications/<int:notification_id>/mark-read/', api_views.MarkNotificationReadAPIView.as_view(), name='api_mark_notification_read'),
    path('notifications/mark-all-read/', api_views.MarkAllNotificationsReadAPIView.as_view(), name='api_mark_all_notifications_read'),
    
    # Activity Logs
    path('activity-logs/stats/', api_views.UserActivityStatsAPIView.as_view(), name='api_activity_stats'),
    path('activity-logs/create/', api_views.CreateActivityLogAPIView.as_view(), name='api_create_activity_log'),
    path('activity-logs/types/', api_views.ActivityTypesAPIView.as_view(), name='api_activity_types'),
    
    # Public Profile
    path('<str:user_id>/profile/', api_views.PublicProfileView.as_view(), name='public_profile'),
    
    # Public Resume (Hoja de Vida)
    path('<str:user_id>/resume/', api_views.PublicResumeView.as_view(), name='public_resume'),
    
    # Candidate Evaluation (Nueva vista unificada)
    path('<str:user_id>/evaluation/', api_views.CandidateEvaluationView.as_view(), name='candidate_evaluation'),
]
