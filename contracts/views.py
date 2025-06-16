"""
Vistas para la aplicación de contratos de VeriHome.
"""

from django.shortcuts import render
from django.views.generic import TemplateView, ListView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db import models

from .models import Contract


class ContractListView(LoginRequiredMixin, ListView):
    """Vista de lista de contratos."""
    model = Contract
    template_name = 'contracts/list.html'
    context_object_name = 'contracts'
    
    def get_queryset(self):
        user = self.request.user
        return Contract.objects.filter(
            models.Q(primary_party=user) | models.Q(secondary_party=user)
        )


class CreateContractView(LoginRequiredMixin, TemplateView):
    """Vista para crear contrato."""
    template_name = 'contracts/create.html'


class ContractDetailView(LoginRequiredMixin, DetailView):
    """Vista de detalle de contrato."""
    model = Contract
    template_name = 'contracts/detail.html'
    context_object_name = 'contract'


class EditContractView(LoginRequiredMixin, TemplateView):
    """Vista para editar contrato."""
    template_name = 'contracts/edit.html'


class DeleteContractView(LoginRequiredMixin, TemplateView):
    """Vista para eliminar contrato."""
    template_name = 'contracts/delete.html'


class ActivateContractView(LoginRequiredMixin, TemplateView):
    """Vista para activar contrato."""
    template_name = 'contracts/activate.html'


class SuspendContractView(LoginRequiredMixin, TemplateView):
    """Vista para suspender contrato."""
    template_name = 'contracts/suspend.html'


class SignContractView(LoginRequiredMixin, TemplateView):
    """Vista para firmar contrato."""
    template_name = 'contracts/sign.html'


class ContractSignaturesView(LoginRequiredMixin, TemplateView):
    """Vista de firmas de contrato."""
    template_name = 'contracts/signatures.html'


class VerifySignaturesView(LoginRequiredMixin, TemplateView):
    """Vista para verificar firmas."""
    template_name = 'contracts/verify_signatures.html'


class CreateAmendmentView(LoginRequiredMixin, TemplateView):
    """Vista para crear enmienda."""
    template_name = 'contracts/create_amendment.html'


class AmendmentListView(LoginRequiredMixin, TemplateView):
    """Vista de lista de enmiendas."""
    template_name = 'contracts/amendments.html'


class AmendmentDetailView(LoginRequiredMixin, TemplateView):
    """Vista de detalle de enmienda."""
    template_name = 'contracts/amendment_detail.html'


class ApproveAmendmentView(LoginRequiredMixin, TemplateView):
    """Vista para aprobar enmienda."""
    template_name = 'contracts/approve_amendment.html'


class RejectAmendmentView(LoginRequiredMixin, TemplateView):
    """Vista para rechazar enmienda."""
    template_name = 'contracts/reject_amendment.html'


class RenewContractView(LoginRequiredMixin, TemplateView):
    """Vista para renovar contrato."""
    template_name = 'contracts/renew.html'


class RenewalListView(LoginRequiredMixin, TemplateView):
    """Vista de lista de renovaciones."""
    template_name = 'contracts/renewals.html'


class RenewalDetailView(LoginRequiredMixin, TemplateView):
    """Vista de detalle de renovación."""
    template_name = 'contracts/renewal_detail.html'


class ApproveRenewalView(LoginRequiredMixin, TemplateView):
    """Vista para aprobar renovación."""
    template_name = 'contracts/approve_renewal.html'


class RejectRenewalView(LoginRequiredMixin, TemplateView):
    """Vista para rechazar renovación."""
    template_name = 'contracts/reject_renewal.html'


class TerminateContractView(LoginRequiredMixin, TemplateView):
    """Vista para terminar contrato."""
    template_name = 'contracts/terminate.html'


class TerminationDetailView(LoginRequiredMixin, TemplateView):
    """Vista de detalle de terminación."""
    template_name = 'contracts/termination_detail.html'


class ApproveTerminationView(LoginRequiredMixin, TemplateView):
    """Vista para aprobar terminación."""
    template_name = 'contracts/approve_termination.html'


class ContractDocumentsView(LoginRequiredMixin, TemplateView):
    """Vista de documentos de contrato."""
    template_name = 'contracts/documents.html'


class UploadDocumentView(LoginRequiredMixin, TemplateView):
    """Vista para subir documento."""
    template_name = 'contracts/upload_document.html'


class DocumentDetailView(LoginRequiredMixin, TemplateView):
    """Vista de detalle de documento."""
    template_name = 'contracts/document_detail.html'


class DeleteDocumentView(LoginRequiredMixin, TemplateView):
    """Vista para eliminar documento."""
    template_name = 'contracts/delete_document.html'


class ContractTemplateListView(TemplateView):
    """Vista de lista de plantillas."""
    template_name = 'contracts/templates.html'


class TemplateDetailView(TemplateView):
    """Vista de detalle de plantilla."""
    template_name = 'contracts/template_detail.html'


class CreateTemplateView(LoginRequiredMixin, TemplateView):
    """Vista para crear plantilla."""
    template_name = 'contracts/create_template.html'


class EditTemplateView(LoginRequiredMixin, TemplateView):
    """Vista para editar plantilla."""
    template_name = 'contracts/edit_template.html'


class DownloadContractPDFView(LoginRequiredMixin, TemplateView):
    """Vista para descargar PDF."""
    template_name = 'contracts/download_pdf.html'


class ExportContractView(LoginRequiredMixin, TemplateView):
    """Vista para exportar contrato."""
    template_name = 'contracts/export.html'


class ContractHistoryView(LoginRequiredMixin, TemplateView):
    """Vista de historial de contrato."""
    template_name = 'contracts/history.html'


class ContractTimelineView(LoginRequiredMixin, TemplateView):
    """Vista de timeline de contrato."""
    template_name = 'contracts/timeline.html'


class ContractRemindersView(LoginRequiredMixin, TemplateView):
    """Vista de recordatorios."""
    template_name = 'contracts/reminders.html'


class ContractNotificationsView(LoginRequiredMixin, TemplateView):
    """Vista de notificaciones."""
    template_name = 'contracts/notifications.html'


class ContractReportsView(LoginRequiredMixin, TemplateView):
    """Vista de reportes."""
    template_name = 'contracts/reports.html'


class ExpiringContractsReportView(LoginRequiredMixin, TemplateView):
    """Vista de reporte de contratos por vencer."""
    template_name = 'contracts/expiring_contracts.html'


class PendingSignatureReportView(LoginRequiredMixin, TemplateView):
    """Vista de reporte de firmas pendientes."""
    template_name = 'contracts/pending_signatures.html'


class ContractCalendarView(LoginRequiredMixin, TemplateView):
    """Vista de calendario de contratos."""
    template_name = 'contracts/calendar.html'


class SearchContractsView(LoginRequiredMixin, TemplateView):
    """Vista de búsqueda de contratos."""
    template_name = 'contracts/search.html'
