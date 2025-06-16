"""
URLs de la API REST para la aplicación de contratos de VeriHome.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

# Router para ViewSets
router = DefaultRouter()
router.register(r'contracts', api_views.ContractViewSet, basename='contract')
router.register(r'templates', api_views.ContractTemplateViewSet, basename='contract-template')
router.register(r'signatures', api_views.ContractSignatureViewSet, basename='contract-signature')
router.register(r'amendments', api_views.ContractAmendmentViewSet, basename='contract-amendment')
router.register(r'renewals', api_views.ContractRenewalViewSet, basename='contract-renewal')
router.register(r'terminations', api_views.ContractTerminationViewSet, basename='contract-termination')
router.register(r'documents', api_views.ContractDocumentViewSet, basename='contract-document')

urlpatterns = [
    # Incluir rutas del router
    path('', include(router.urls)),
    
    # Firmas digitales
    path('<uuid:contract_pk>/sign/', api_views.SignContractAPIView.as_view(), name='api_sign_contract'),
    path('<uuid:contract_pk>/verify-signature/', api_views.VerifySignatureAPIView.as_view(), name='api_verify_signature'),
    
    # Estados del contrato
    path('<uuid:contract_pk>/activate/', api_views.ActivateContractAPIView.as_view(), name='api_activate_contract'),
    path('<uuid:contract_pk>/suspend/', api_views.SuspendContractAPIView.as_view(), name='api_suspend_contract'),
    
    # Documentos
    path('<uuid:contract_pk>/documents/upload/', api_views.UploadDocumentAPIView.as_view(), name='api_upload_document'),
    
    # Reportes
    path('reports/expiring/', api_views.ExpiringContractsAPIView.as_view(), name='api_expiring_contracts'),
    path('reports/pending-signatures/', api_views.PendingSignaturesAPIView.as_view(), name='api_pending_signatures'),
    
    # Estadísticas
    path('stats/', api_views.ContractStatsAPIView.as_view(), name='api_contract_stats'),
]
