"""
URLs para el sistema de matching de VeriHome.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    MatchRequestViewSet, MatchCriteriaViewSet, MatchNotificationViewSet,
    PotentialMatchesAPIView, LandlordRecommendationsAPIView,
    MatchStatisticsAPIView, AutoApplyMatchesAPIView, MatchDashboardAPIView,
    MatchPreferencesAPIView, MatchAnalyticsAPIView, SmartMatchingAPIView,
    FindMatchRequestAPIView, CheckExistingMatchRequestAPIView
)

# Importar vistas de contratos si existen
try:
    from .contract_api_views import MatchContractViewSet
    CONTRACTS_AVAILABLE = True
except ImportError:
    CONTRACTS_AVAILABLE = False

app_name = 'matching'

# Router para ViewSets
router = DefaultRouter()
router.register(r'requests', MatchRequestViewSet, basename='match-requests')
router.register(r'criteria', MatchCriteriaViewSet, basename='match-criteria')
router.register(r'notifications', MatchNotificationViewSet, basename='match-notifications')

# Registrar contratos si están disponibles
if CONTRACTS_AVAILABLE:
    router.register(r'contracts', MatchContractViewSet, basename='match-contracts')

urlpatterns = [
    # ViewSets (sin prefijo /api/ porque ya está en /api/v1/matching/)
    path('', include(router.urls)),
    
    # Vistas específicas
    path('potential-matches/', PotentialMatchesAPIView.as_view(), name='potential-matches'),
    path('landlord-recommendations/', LandlordRecommendationsAPIView.as_view(), name='landlord-recommendations'),
    path('statistics/', MatchStatisticsAPIView.as_view(), name='match-statistics'),
    path('auto-apply/', AutoApplyMatchesAPIView.as_view(), name='auto-apply-matches'),
    path('dashboard/', MatchDashboardAPIView.as_view(), name='match-dashboard'),
    
    # Nuevos endpoints avanzados
    path('preferences/', MatchPreferencesAPIView.as_view(), name='match-preferences'),
    path('analytics/', MatchAnalyticsAPIView.as_view(), name='match-analytics'),
    path('smart-matching/', SmartMatchingAPIView.as_view(), name='smart-matching'),
    path('find-match-request/', FindMatchRequestAPIView.as_view(), name='find-match-request'),
    path('check-existing/', CheckExistingMatchRequestAPIView.as_view(), name='check-existing-request'),
]

# Agregar URLs específicas de contratos si están disponibles
if CONTRACTS_AVAILABLE:
    contract_urls = [
        # Validación de match para contrato
        path('requests/<uuid:match_id>/validate-contract/', 
             MatchContractViewSet.as_view({'post': 'validate_match_for_contract'}), 
             name='validate-match-contract'),
        
        # Crear contrato desde match
        path('requests/<uuid:match_id>/create-contract/', 
             MatchContractViewSet.as_view({'post': 'create_contract_from_match'}), 
             name='create-contract-from-match'),
        
        # Verificación de identidad para contrato
        path('contracts/<uuid:contract_id>/verify-identity/', 
             MatchContractViewSet.as_view({'post': 'verify_identity'}), 
             name='verify-identity-contract'),
        
        # Endpoints específicos de contratos
        path('contracts/<uuid:contract_id>/generate-clauses/', 
             MatchContractViewSet.as_view({'post': 'generate_legal_clauses'}), 
             name='generate-contract-clauses'),
        
        path('contracts/<uuid:contract_id>/sign/', 
             MatchContractViewSet.as_view({'post': 'sign_contract'}), 
             name='sign-contract'),
        
        path('contracts/<uuid:contract_id>/download-pdf/', 
             MatchContractViewSet.as_view({'get': 'download_pdf'}), 
             name='download-contract-pdf'),
        
        path('contracts/<uuid:contract_id>/milestones/', 
             MatchContractViewSet.as_view({'get': 'get_milestones'}), 
             name='contract-milestones'),
    ]
    
    urlpatterns.extend(contract_urls)