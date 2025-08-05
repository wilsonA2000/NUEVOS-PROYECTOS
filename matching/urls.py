"""
URLs para el sistema de matching de VeriHome.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    MatchRequestViewSet, MatchCriteriaViewSet, MatchNotificationViewSet,
    PotentialMatchesAPIView, LandlordRecommendationsAPIView,
    MatchStatisticsAPIView, AutoApplyMatchesAPIView, MatchDashboardAPIView
)

app_name = 'matching'

# Router para ViewSets
router = DefaultRouter()
router.register(r'requests', MatchRequestViewSet, basename='match-requests')
router.register(r'criteria', MatchCriteriaViewSet, basename='match-criteria')
router.register(r'notifications', MatchNotificationViewSet, basename='match-notifications')

urlpatterns = [
    # ViewSets
    path('api/', include(router.urls)),
    
    # Vistas específicas
    path('api/potential-matches/', PotentialMatchesAPIView.as_view(), name='potential-matches'),
    path('api/landlord-recommendations/', LandlordRecommendationsAPIView.as_view(), name='landlord-recommendations'),
    path('api/statistics/', MatchStatisticsAPIView.as_view(), name='match-statistics'),
    path('api/auto-apply/', AutoApplyMatchesAPIView.as_view(), name='auto-apply-matches'),
    path('api/dashboard/', MatchDashboardAPIView.as_view(), name='match-dashboard'),
]