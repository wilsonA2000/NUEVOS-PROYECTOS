"""
URLs para el sistema de matching de VeriHome.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    MatchRequestViewSet,
    MatchCriteriaViewSet,
    MatchNotificationViewSet,
    PotentialMatchesAPIView,
    LandlordRecommendationsAPIView,
    MatchStatisticsAPIView,
    AutoApplyMatchesAPIView,
    MatchDashboardAPIView,
    MatchPreferencesAPIView,
    MatchAnalyticsAPIView,
    SmartMatchingAPIView,
    FindMatchRequestAPIView,
    CheckExistingMatchRequestAPIView,
)

try:
    from .contract_api_views import (
        ValidateMatchForContractAPIView,
        CreateContractFromMatchAPIView,
    )

    CONTRACTS_AVAILABLE = True
except ImportError:
    CONTRACTS_AVAILABLE = False

app_name = "matching"

router = DefaultRouter()
router.register(r"requests", MatchRequestViewSet, basename="match-requests")
router.register(r"criteria", MatchCriteriaViewSet, basename="match-criteria")
router.register(
    r"notifications", MatchNotificationViewSet, basename="match-notifications"
)

urlpatterns = [
    # ViewSets (sin prefijo /api/ porque ya está en /api/v1/matching/)
    path("", include(router.urls)),
    # Vistas específicas
    path(
        "potential-matches/",
        PotentialMatchesAPIView.as_view(),
        name="potential-matches",
    ),
    path(
        "landlord-recommendations/",
        LandlordRecommendationsAPIView.as_view(),
        name="landlord-recommendations",
    ),
    path("statistics/", MatchStatisticsAPIView.as_view(), name="match-statistics"),
    path("auto-apply/", AutoApplyMatchesAPIView.as_view(), name="auto-apply-matches"),
    path("dashboard/", MatchDashboardAPIView.as_view(), name="match-dashboard"),
    # Nuevos endpoints avanzados
    path("preferences/", MatchPreferencesAPIView.as_view(), name="match-preferences"),
    path("analytics/", MatchAnalyticsAPIView.as_view(), name="match-analytics"),
    path("smart-matching/", SmartMatchingAPIView.as_view(), name="smart-matching"),
    path(
        "find-match-request/",
        FindMatchRequestAPIView.as_view(),
        name="find-match-request",
    ),
    path(
        "check-existing/",
        CheckExistingMatchRequestAPIView.as_view(),
        name="check-existing-request",
    ),
]

if CONTRACTS_AVAILABLE:
    urlpatterns.extend(
        [
            path(
                "requests/<uuid:match_id>/validate-contract/",
                ValidateMatchForContractAPIView.as_view(),
                name="validate-match-contract",
            ),
            path(
                "requests/<uuid:match_id>/create-contract/",
                CreateContractFromMatchAPIView.as_view(),
                name="create-contract-from-match",
            ),
        ]
    )
