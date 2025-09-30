"""
URLs para la aplicación de contratos de VeriHome.
Incluye gestión de contratos, firmas digitales y seguimiento.
"""

from django.urls import path
from . import views

app_name = 'contracts'

urlpatterns = [
    # Listado y gestión de contratos
    path('', views.ContractListView.as_view(), name='list'),
    path('crear/', views.CreateContractView.as_view(), name='create'),
    path('<uuid:pk>/', views.ContractDetailView.as_view(), name='detail'),
    path('<uuid:pk>/editar/', views.EditContractView.as_view(), name='edit'),
    path('<uuid:pk>/eliminar/', views.DeleteContractView.as_view(), name='delete'),
    
    # Estados del contrato
    path('<uuid:pk>/activar/', views.ActivateContractView.as_view(), name='activate'),
    path('<uuid:pk>/suspender/', views.SuspendContractView.as_view(), name='suspend'),
    
    # Firmas digitales
    path('<uuid:pk>/firmar/', views.SignContractView.as_view(), name='sign'),
    path('<uuid:pk>/firmas/', views.ContractSignaturesView.as_view(), name='signatures'),
    path('<uuid:pk>/verificar-firmas/', views.VerifySignaturesView.as_view(), name='verify_signatures'),
    
    # Enmiendas y modificaciones
    path('<uuid:pk>/enmienda/', views.CreateAmendmentView.as_view(), name='create_amendment'),
    path('<uuid:pk>/enmiendas/', views.AmendmentListView.as_view(), name='amendments'),
    path('enmienda/<int:amendment_pk>/', views.AmendmentDetailView.as_view(), name='amendment_detail'),
    path('enmienda/<int:amendment_pk>/aprobar/', views.ApproveAmendmentView.as_view(), name='approve_amendment'),
    path('enmienda/<int:amendment_pk>/rechazar/', views.RejectAmendmentView.as_view(), name='reject_amendment'),
    
    # Renovaciones
    path('<uuid:pk>/renovar/', views.RenewContractView.as_view(), name='renew'),
    path('<uuid:pk>/renovaciones/', views.RenewalListView.as_view(), name='renewals'),
    path('renovacion/<int:renewal_pk>/', views.RenewalDetailView.as_view(), name='renewal_detail'),
    path('renovacion/<int:renewal_pk>/aprobar/', views.ApproveRenewalView.as_view(), name='approve_renewal'),
    path('renovacion/<int:renewal_pk>/rechazar/', views.RejectRenewalView.as_view(), name='reject_renewal'),
    
    # Terminación de contratos
    path('<uuid:pk>/terminar/', views.TerminateContractView.as_view(), name='terminate'),
    path('<uuid:pk>/terminacion/', views.TerminationDetailView.as_view(), name='termination_detail'),
    path('terminacion/<int:termination_pk>/aprobar/', views.ApproveTerminationView.as_view(), name='approve_termination'),
    
    # Documentos del contrato
    path('<uuid:pk>/documentos/', views.ContractDocumentsView.as_view(), name='documents'),
    path('<uuid:pk>/documentos/subir/', views.UploadDocumentView.as_view(), name='upload_document'),
    path('documento/<int:document_pk>/', views.DocumentDetailView.as_view(), name='document_detail'),
    path('documento/<int:document_pk>/eliminar/', views.DeleteDocumentView.as_view(), name='delete_document'),
    
    # Plantillas de contratos
    path('plantillas/', views.ContractTemplateListView.as_view(), name='templates'),
    path('plantilla/<int:template_pk>/', views.TemplateDetailView.as_view(), name='template_detail'),
    path('plantilla/crear/', views.CreateTemplateView.as_view(), name='create_template'),
    path('plantilla/<int:template_pk>/editar/', views.EditTemplateView.as_view(), name='edit_template'),
    
    # Exportar y descargar
    path('<uuid:pk>/preview-pdf/', views.DownloadContractPDFView.as_view(), name='preview_pdf'),
    path('<uuid:pk>/descargar-pdf/', views.DownloadContractPDFView.as_view(), name='download_pdf'),
    path('<uuid:pk>/exportar/', views.ExportContractView.as_view(), name='export'),
    
    # Historial y seguimiento
    path('<uuid:pk>/historial/', views.ContractHistoryView.as_view(), name='history'),
    path('<uuid:pk>/timeline/', views.ContractTimelineView.as_view(), name='timeline'),
    
    # Recordatorios y notificaciones
    path('<uuid:pk>/recordatorios/', views.ContractRemindersView.as_view(), name='reminders'),
    path('<uuid:pk>/notificaciones/', views.ContractNotificationsView.as_view(), name='notifications'),
    
    # Reportes
    path('reportes/', views.ContractReportsView.as_view(), name='reports'),
    path('reportes/vencimientos/', views.ExpiringContractsReportView.as_view(), name='expiring_contracts'),
    path('reportes/pendientes-firma/', views.PendingSignatureReportView.as_view(), name='pending_signatures'),
    
    # Calendario de contratos
    path('calendario/', views.ContractCalendarView.as_view(), name='calendar'),
    
    # Búsqueda y filtros
    path('buscar/', views.SearchContractsView.as_view(), name='search'),
]
