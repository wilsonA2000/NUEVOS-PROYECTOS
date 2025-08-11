"""
URLs para las APIs de documentos de inquilinos.
"""

from django.urls import path
from . import document_api_views

app_name = 'documents_api'

urlpatterns = [
    # Subir documento
    path(
        'upload/', 
        document_api_views.TenantDocumentUploadAPIView.as_view(), 
        name='upload_document'
    ),
    
    # Listar documentos de un proceso
    path(
        'process/<uuid:process_id>/', 
        document_api_views.TenantDocumentListAPIView.as_view(), 
        name='list_documents'
    ),
    
    # Checklist completo de un proceso
    path(
        'process/<uuid:process_id>/checklist/', 
        document_api_views.DocumentChecklistAPIView.as_view(), 
        name='document_checklist'
    ),
    
    # Revisar documento (landlords)
    path(
        '<uuid:pk>/review/', 
        document_api_views.TenantDocumentReviewAPIView.as_view(), 
        name='review_document'
    ),
    
    # Eliminar documento
    path(
        '<uuid:document_id>/delete/', 
        document_api_views.delete_tenant_document, 
        name='delete_document'
    ),
    
    # Estadísticas para landlords
    path(
        'stats/', 
        document_api_views.document_stats_for_landlord, 
        name='document_stats'
    ),
]