"""
URLs de la API REST para la aplicación de contratos de VeriHome.
"""

app_name = 'contracts_api'

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
    
    # ===================================================================
    # SISTEMA DE CONTRATOS CONTROLADO POR ARRENDADOR (NUEVO)
    # ===================================================================
    path('', include('contracts.landlord_api_urls')),
    
    # ===================================================================
    # SISTEMA DE CONTRATOS DESDE PERSPECTIVA DEL ARRENDATARIO (NUEVO)
    # ===================================================================
    path('', include('contracts.tenant_api_urls')),
    
    # ===================================================================
    # FLUJO BIOMÉTRICO COMPLETO - NUEVAS APIS ESPECIALIZADAS
    # ===================================================================
    
    # Generación y edición de PDF
    path('<uuid:contract_id>/generate-pdf/', api_views.GenerateContractPDFAPIView.as_view(), name='api_generate_contract_pdf'),
    path('<uuid:contract_id>/preview-pdf/', api_views.ContractPreviewPDFAPIView.as_view(), name='api_contract_preview_pdf'),
    path('<uuid:contract_id>/preview-with-clauses/', api_views.ContractPreviewWithClausesAPIView.as_view(), name='api_contract_preview_with_clauses'),
    path('<uuid:contract_id>/edit-before-auth/', api_views.EditContractBeforeAuthAPIView.as_view(), name='api_edit_contract_before_auth'),
    
    # Gestión de cláusulas adicionales
    path('<uuid:contract_id>/additional-clauses/', api_views.ContractAdditionalClausesAPIView.as_view(), name='api_contract_additional_clauses'),
    path('<uuid:contract_id>/additional-clauses/<uuid:clause_id>/', api_views.ContractAdditionalClausesAPIView.as_view(), name='api_contract_additional_clause_detail'),
    
    # Autenticación biométrica completa
    path('<uuid:contract_id>/start-biometric-authentication/', api_views.StartBiometricAuthenticationAPIView.as_view(), name='api_start_biometric_auth'),
    path('<uuid:contract_id>/auth/face-capture/', api_views.FaceCaptureAPIView.as_view(), name='api_face_capture'),
    path('<uuid:contract_id>/auth/document-capture/', api_views.DocumentCaptureAPIView.as_view(), name='api_document_capture'),
    path('<uuid:contract_id>/auth/combined-capture/', api_views.CombinedCaptureAPIView.as_view(), name='api_combined_capture'),
    path('<uuid:contract_id>/auth/voice-capture/', api_views.VoiceCaptureAPIView.as_view(), name='api_voice_capture'),
    path('<uuid:contract_id>/complete-auth/', api_views.CompleteAuthenticationAPIView.as_view(), name='api_complete_authentication'),
    
    # Consulta de estado biométrico
    path('<uuid:contract_id>/auth/status/', api_views.BiometricAuthenticationStatusAPIView.as_view(), name='api_biometric_auth_status'),
    
    # ===================================================================
    # SISTEMA DE WORKFLOW DE MATCHES APROBADOS (NUEVO)
    # ===================================================================
    
    # Candidatos aprobados y workflow de 3 etapas
    path('matched-candidates/', api_views.MatchedCandidatesAPIView.as_view(), name='api_matched_candidates'),
    path('workflow-action/', api_views.WorkflowActionAPIView.as_view(), name='api_workflow_action'),
    
    # Vista para inquilinos: seguimiento de procesos
    path('tenant-processes/', api_views.TenantProcessesAPIView.as_view(), name='api_tenant_processes'),
    
    # Sistema de revisión de contratos por arrendatarios
    path('tenant-review/', api_views.TenantContractReviewAPIView.as_view(), name='api_tenant_contract_review'),
    
    # ===================================================================
    # APIS EXISTENTES (MANTENIDAS PARA COMPATIBILIDAD)
    # ===================================================================
    
    # Firmas digitales
    path('<uuid:contract_pk>/sign/', api_views.SignContractAPIView.as_view(), name='api_sign_contract'),
    path('<uuid:contract_pk>/digital-signature/', api_views.DigitalSignatureAPIView.as_view(), name='api_digital_signature'),
    path('<uuid:contract_pk>/verify-signature/', api_views.VerifySignatureAPIView.as_view(), name='api_verify_signature'),
    path('signatures/<uuid:signature_id>/verify/', api_views.SignatureVerificationAPIView.as_view(), name='api_signature_verification'),
    
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
