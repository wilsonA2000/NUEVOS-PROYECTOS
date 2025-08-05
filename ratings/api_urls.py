"""
URLs para la API de calificaciones de VeriHome.
Incluye funcionalidades básicas y avanzadas.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views, advanced_views

# Router para ViewSets
router = DefaultRouter()
router.register(r'advanced', advanced_views.AdvancedRatingViewSet, basename='advanced_rating')

app_name = 'ratings_api'

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # API básica existente
    path('ratings/', views.RatingListCreateView.as_view(), name='rating_list_create'),
    path('ratings/<uuid:pk>/', views.RatingDetailView.as_view(), name='rating_detail'),
    path('ratings/<uuid:rating_id>/response/', views.RatingResponseCreateView.as_view(), name='rating_response_create'),
    path('ratings/<uuid:rating_id>/report/', views.RatingReportCreateView.as_view(), name='rating_report_create'),
    path('users/<uuid:user_id>/ratings/', views.UserRatingsView.as_view(), name='user_ratings'),
    path('users/<uuid:user_id>/rating-profile/', views.UserRatingProfileView.as_view(), name='user_rating_profile'),
    path('contracts/<uuid:contract_id>/ratings/', views.ContractRatingsView.as_view(), name='contract_ratings'),
    path('ratings/categories/', views.RatingCategoryListCreateView.as_view(), name='rating_category_list_create'),
    
    # API avanzada
    path('analytics/', advanced_views.RatingAnalyticsAPIView.as_view(), name='analytics'),
    path('moderation/', advanced_views.RatingModerationAPIView.as_view(), name='moderation'),
    path('invitations/', advanced_views.RatingInvitationAPIView.as_view(), name='invitations'),
    path('invite/<str:token>/', advanced_views.RatingFromInvitationAPIView.as_view(), name='rating_from_invitation'),
    path('stats/', advanced_views.RatingStatsAPIView.as_view(), name='quick_stats'),
]