"""
Vistas para la aplicación de contratos de VeriHome.
"""

from django.shortcuts import render, get_object_or_404
from django.views.generic import TemplateView, ListView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db import models
from django.http import HttpResponse
from django.template.loader import render_to_string

from .models import Contract
from .clause_manager import clause_manager


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
    """Vista de detalle de contrato con formato profesional."""
    model = Contract
    template_name = 'contracts/professional_contract_template.html'
    context_object_name = 'contract'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        contract = self.get_object()
        
        # Datos del contrato formateados para la plantilla profesional
        context.update({
            # Información básica del contrato
            'contract_title': f"Contrato de {contract.get_contract_type_display()}",
            'contract_type_display': contract.get_contract_type_display(),
            'contract_number': contract.contract_number,
            
            # Datos del arrendador (auto-poblados)
            'landlord_name': contract.primary_party.get_full_name(),
            'landlord_email': contract.primary_party.email,
            'landlord_phone': getattr(contract.primary_party, 'phone', ''),
            'landlord_id': getattr(contract.primary_party, 'identification_number', ''),
            
            # Datos del arrendatario (auto-poblados)  
            'tenant_name': contract.secondary_party.get_full_name(),
            'tenant_email': contract.secondary_party.email,
            'tenant_phone': getattr(contract.secondary_party, 'phone', ''),
            'tenant_id': getattr(contract.secondary_party, 'identification_number', ''),
            'tenant_occupation': getattr(contract.secondary_party, 'job_title', ''),
            'tenant_income': getattr(contract.secondary_party, 'monthly_income', ''),
            
            # Datos de la propiedad (auto-poblados)
            'property_title': contract.property.title if contract.property else 'N/A',
            'property_address': contract.property.address if contract.property else 'N/A',
            'property_city': contract.property.city if contract.property else 'N/A',
            'property_type': contract.property.get_property_type_display() if contract.property else 'N/A',
            'property_bedrooms': contract.property.bedrooms if contract.property else 0,
            'property_bathrooms': contract.property.bathrooms if contract.property else 0,
            'property_area': contract.property.total_area if contract.property else 0,
            'property_furnished': 'amueblada' if (contract.property and contract.property.furnished) else 'sin amoblar',
            'pets_allowed': 'permitidas' if (contract.property and contract.property.pets_allowed) else 'no permitidas',
            
            # Datos financieros
            'monthly_rent': contract.monthly_rent,
            'security_deposit': contract.security_deposit,
            'maintenance_fee': getattr(contract.property, 'maintenance_fee', 0) if contract.property else 0,
            'minimum_lease_term': getattr(contract.property, 'minimum_lease_term', 12) if contract.property else 12,
            
            # Fechas
            'start_date': contract.start_date,
            'end_date': contract.end_date,
            'today': contract.created_at.date(),
            'contract_year': contract.created_at.year,
            
            # Servicios y amenidades
            'utilities_included': ', '.join(contract.property.utilities_included) if (contract.property and contract.property.utilities_included) else 'Ninguno incluido',
            'property_features': ', '.join(contract.property.property_features) if (contract.property and contract.property.property_features) else '',
            'nearby_amenities': ', '.join(contract.property.nearby_amenities) if (contract.property and contract.property.nearby_amenities) else '',
        })
        
        # Generar cláusulas dinámicas según el tipo de contrato
        contract_clauses = self._generate_dynamic_clauses(contract, context)
        context['contract_clauses'] = contract_clauses
        
        return context
    
    def _generate_dynamic_clauses(self, contract, template_context):
        """Genera cláusulas dinámicas según el tipo de contrato."""
        # Obtener cláusulas para el tipo de contrato
        clauses = clause_manager.get_clauses_for_contract_type(
            contract.contract_type,
            selected_optional_clauses=[]  # TODO: Obtener de la configuración del contrato
        )
        
        # Contexto para formatear las cláusulas
        clause_context = {
            'property_address': template_context.get('property_address', ''),
            'property_city': template_context.get('property_city', ''),
            'property_destination': self._get_property_destination(contract),
            'monthly_rent_text': self._format_monthly_rent(contract.monthly_rent),
            'commercial_activity': 'actividades comerciales permitidas',
            'rural_use': 'uso agrícola y ganadero',
            'pets_permission': 'podrá' if (contract.property and contract.property.pets_allowed) else 'no podrá',
            'pet_deposit': '$500,000',
            'parking_spaces': str(getattr(contract.property, 'parking_spaces', 0)) if contract.property else '0',
            'parking_numbers': 'por asignar',
            'furniture_status': 'amueblado' if (contract.property and contract.property.furnished) else 'sin amoblar',
            'improvements_permission': 'podrá',
        }
        
        # Formatear el contenido de cada cláusula
        for clause in clauses:
            if 'content' in clause:
                clause['formatted_content'] = clause_manager.format_clause_content(
                    clause['content'], clause_context
                )
        
        return clauses
    
    def _get_property_destination(self, contract):
        """Obtiene la destinación del inmueble según el tipo de contrato."""
        destinations = clause_manager.get_contract_destinations(contract.contract_type)
        
        # Mapear tipos de propiedad a destinaciones
        property_type_mapping = {
            'apartment': 'vivienda',
            'house': 'vivienda',
            'studio': 'vivienda',
            'room': 'habitacion',
            'commercial': 'local_comercial',
            'office': 'oficina',
            'warehouse': 'almacen',
            'land': 'agricultura'
        }
        
        if contract.property:
            property_type = contract.property.property_type
            destination_key = property_type_mapping.get(property_type, 'vivienda')
            return destinations.get(destination_key, 'vivienda familiar')
        
        return 'vivienda familiar'
    
    def _format_monthly_rent(self, monthly_rent):
        """Formatea el valor de la renta mensual en texto."""
        if not monthly_rent:
            return '[MONTO POR DEFINIR]'
        
        # Convertir número a texto (simplificado)
        amount = int(monthly_rent)
        return f'${amount:,} PESOS M/CTE (${amount:,})'


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


class DownloadContractPDFView(LoginRequiredMixin, DetailView):
    """Vista para generar PDF profesional del contrato."""
    model = Contract
    
    def get(self, request, *args, **kwargs):
        contract = self.get_object()
        
        # Verificar permisos
        if not contract.can_be_viewed_by(request.user):
            return HttpResponse("No tienes permisos para ver este contrato", status=403)
        
        # Preparar contexto igual que en ContractDetailView
        context = {
            # Información básica del contrato
            'contract_title': f"Contrato de {contract.get_contract_type_display()}",
            'contract_type_display': contract.get_contract_type_display(),
            'contract_number': contract.contract_number,
            
            # Datos del arrendador (auto-poblados)
            'landlord_name': contract.primary_party.get_full_name(),
            'landlord_email': contract.primary_party.email,
            'landlord_phone': getattr(contract.primary_party, 'phone', ''),
            'landlord_id': getattr(contract.primary_party, 'identification_number', ''),
            
            # Datos del arrendatario (auto-poblados)  
            'tenant_name': contract.secondary_party.get_full_name(),
            'tenant_email': contract.secondary_party.email,
            'tenant_phone': getattr(contract.secondary_party, 'phone', ''),
            'tenant_id': getattr(contract.secondary_party, 'identification_number', ''),
            'tenant_occupation': getattr(contract.secondary_party, 'job_title', ''),
            'tenant_income': getattr(contract.secondary_party, 'monthly_income', ''),
            
            # Datos de la propiedad (auto-poblados)
            'property_title': contract.property.title if contract.property else 'N/A',
            'property_address': contract.property.address if contract.property else 'N/A',
            'property_city': contract.property.city if contract.property else 'N/A',
            'property_type': contract.property.get_property_type_display() if contract.property else 'N/A',
            'property_bedrooms': contract.property.bedrooms if contract.property else 0,
            'property_bathrooms': contract.property.bathrooms if contract.property else 0,
            'property_area': contract.property.total_area if contract.property else 0,
            'property_furnished': 'amueblada' if (contract.property and contract.property.furnished) else 'sin amoblar',
            'pets_allowed': 'permitidas' if (contract.property and contract.property.pets_allowed) else 'no permitidas',
            
            # Datos financieros
            'monthly_rent': contract.monthly_rent,
            'security_deposit': contract.security_deposit,
            'maintenance_fee': getattr(contract.property, 'maintenance_fee', 0) if contract.property else 0,
            'minimum_lease_term': getattr(contract.property, 'minimum_lease_term', 12) if contract.property else 12,
            
            # Fechas
            'start_date': contract.start_date,
            'end_date': contract.end_date,
            'today': contract.created_at.date(),
            'contract_year': contract.created_at.year,
            
            # Servicios y amenidades
            'utilities_included': ', '.join(contract.property.utilities_included) if (contract.property and contract.property.utilities_included) else 'Ninguno incluido',
            'property_features': ', '.join(contract.property.property_features) if (contract.property and contract.property.property_features) else '',
            'nearby_amenities': ', '.join(contract.property.nearby_amenities) if (contract.property and contract.property.nearby_amenities) else '',
        }
        
        # Generar cláusulas dinámicas según el tipo de contrato
        contract_clauses = self._generate_dynamic_clauses(contract, context)
        context['contract_clauses'] = contract_clauses
        
        # Renderizar la plantilla HTML profesional
        html_content = render_to_string('contracts/professional_contract_template.html', context)
        
        # Retornar como HTML para previsualización (para PDF usar weasyprint o similar)
        response = HttpResponse(html_content, content_type='text/html')
        response['Content-Disposition'] = f'inline; filename="contrato_{contract.contract_number}.html"'
        
        return response
    
    def _generate_dynamic_clauses(self, contract, template_context):
        """Genera cláusulas dinámicas según el tipo de contrato."""
        from .clause_manager import clause_manager
        
        # Obtener cláusulas para el tipo de contrato
        clauses = clause_manager.get_clauses_for_contract_type(
            contract.contract_type,
            selected_optional_clauses=[]  # TODO: Obtener de la configuración del contrato
        )
        
        # Contexto para formatear las cláusulas
        clause_context = {
            'property_address': template_context.get('property_address', ''),
            'property_city': template_context.get('property_city', ''),
            'property_destination': self._get_property_destination(contract),
            'monthly_rent_text': self._format_monthly_rent(contract.monthly_rent),
            'commercial_activity': 'actividades comerciales permitidas',
            'rural_use': 'uso agrícola y ganadero',
            'pets_permission': 'podrá' if (contract.property and contract.property.pets_allowed) else 'no podrá',
            'pet_deposit': '$500,000',
            'parking_spaces': str(getattr(contract.property, 'parking_spaces', 0)) if contract.property else '0',
            'parking_numbers': 'por asignar',
            'furniture_status': 'amueblado' if (contract.property and contract.property.furnished) else 'sin amoblar',
            'improvements_permission': 'podrá',
        }
        
        # Formatear el contenido de cada cláusula
        for clause in clauses:
            if 'content' in clause:
                clause['formatted_content'] = clause_manager.format_clause_content(
                    clause['content'], clause_context
                )
        
        return clauses
    
    def _get_property_destination(self, contract):
        """Obtiene la destinación del inmueble según el tipo de contrato."""
        from .clause_manager import clause_manager
        
        destinations = clause_manager.get_contract_destinations(contract.contract_type)
        
        # Mapear tipos de propiedad a destinaciones
        property_type_mapping = {
            'apartment': 'vivienda',
            'house': 'vivienda',
            'studio': 'vivienda',
            'room': 'habitacion',
            'commercial': 'local_comercial',
            'office': 'oficina',
            'warehouse': 'almacen',
            'land': 'agricultura'
        }
        
        if contract.property:
            property_type = contract.property.property_type
            destination_key = property_type_mapping.get(property_type, 'vivienda')
            return destinations.get(destination_key, 'vivienda familiar')
        
        return 'vivienda familiar'
    
    def _format_monthly_rent(self, monthly_rent):
        """Formatea el valor de la renta mensual en texto."""
        if not monthly_rent:
            return '[MONTO POR DEFINIR]'
        
        # Convertir número a texto (simplificado)
        amount = int(monthly_rent)
        return f'${amount:,} PESOS M/CTE (${amount:,})'


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
