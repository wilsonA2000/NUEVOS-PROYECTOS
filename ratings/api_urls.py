"""
URLs de la API REST para la aplicación de calificaciones de VeriHome.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

# Router para ViewSets
router = DefaultRouter()
router.register(r'ratings', api_views.RatingViewSet)
router.register(r'rating-categories', api_views.RatingCategoryViewSet)
router.register(r'rating-responses', api_views.RatingResponseViewSet)
router.register(r'rating-reports', api_views.RatingReportViewSet)
router.register(r'rating-invitations', api_views.RatingInvitationViewSet)
router.register(r'user-rating-profiles', api_views.UserRatingProfileViewSet)

urlpatterns = [
    # Incluir rutas del router
    path('', include(router.urls)),
    
    # Crear calificaciones
    path('create/', api_views.CreateRatingAPIView.as_view(), name='api_create_rating'),
    path('quick-rate/', api_views.QuickRateAPIView.as_view(), name='api_quick_rate'),
    
    # Verificación de capacidad de calificar
    path('can-rate/<uuid:user_pk>/', api_views.CanRateAPIView.as_view(), name='api_can_rate'),
    
    # Invitaciones
    path('invite/<uuid:user_pk>/', api_views.InviteToRateAPIView.as_view(), name='api_invite_to_rate'),
    path('invitation/<str:token>/', api_views.RatingInvitationDetailAPIView.as_view(), name='api_rating_invitation'),
    
    # Perfiles de calificaciones
    path('profile/<uuid:user_pk>/', api_views.UserRatingProfileAPIView.as_view(), name='api_user_rating_profile'),
    path('profile/<uuid:user_pk>/summary/', api_views.RatingSummaryAPIView.as_view(), name='api_rating_summary'),
    path('profile/<uuid:user_pk>/update/', api_views.UpdateRatingProfileAPIView.as_view(), name='api_update_rating_profile'),
    
    # Rankings
    path('rankings/', api_views.RankingsAPIView.as_view(), name='api_rankings'),
    path('rankings/landlords/', api_views.LandlordRankingsAPIView.as_view(), name='api_landlord_rankings'),
    path('rankings/tenants/', api_views.TenantRankingsAPIView.as_view(), name='api_tenant_rankings'),
    path('rankings/service-providers/', api_views.ServiceProviderRankingsAPIView.as_view(), name='api_service_provider_rankings'),
    
    # Estadísticas
    path('stats/', api_views.RatingStatsAPIView.as_view(), name='api_rating_stats'),
    path('stats/<uuid:user_pk>/', api_views.UserRatingStatsAPIView.as_view(), name='api_user_rating_stats'),
    
    # Badges
    path('badges/', api_views.BadgesAPIView.as_view(), name='api_badges'),
    path('badges/<uuid:user_pk>/', api_views.UserBadgesAPIView.as_view(), name='api_user_badges'),
]
