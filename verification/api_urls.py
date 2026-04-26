from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

router = DefaultRouter()
router.register(
    r"agents", api_views.VerificationAgentViewSet, basename="verification-agent"
)
router.register(
    r"visits", api_views.VerificationVisitViewSet, basename="verification-visit"
)
router.register(
    r"reports", api_views.VerificationReportViewSet, basename="verification-report"
)
router.register(
    r"onboarding",
    api_views.FieldVisitRequestViewSet,
    basename="verihome-id-onboarding",
)

urlpatterns = [
    path("", include(router.urls)),
]
