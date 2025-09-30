"""
API Views para integración Matching-Contratos
"""

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from matching.models import MatchRequest
from matching.contract_integration import (
    MatchContractIntegrationService,
    ContractVerificationService
)
from contracts.colombian_contracts import ColombianContract
from contracts.serializers import ColombianContractSerializer


class MatchContractViewSet(ModelViewSet):
    """ViewSet para gestión de contratos desde matches"""
    permission_classes = [IsAuthenticated]
    queryset = ColombianContract.objects.all()
    serializer_class = ColombianContractSerializer
    
    def validate_match_for_contract(self, request, match_id=None):
        """Valida si un match puede convertirse en contrato"""
        match_request = get_object_or_404(MatchRequest, id=match_id)
        
        # Verificar permisos
        if request.user not in [match_request.tenant, match_request.property.landlord]:
            return Response(
                {"error": "No tienes permisos para esta operación"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        validation_result = MatchContractIntegrationService.validate_match_for_contract(match_request)
        return Response(validation_result)
    
    @transaction.atomic
    def create_contract_from_match(self, request, match_id=None):
        """Crea un contrato desde un match aceptado"""
        match_request = get_object_or_404(MatchRequest, id=match_id)
        
        # Verificar permisos - solo el arrendador puede crear el contrato
        if request.user != match_request.property.landlord:
            return Response(
                {"error": "Solo el arrendador puede crear el contrato"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            contract = MatchContractIntegrationService.create_contract_from_match(
                match_request=match_request,
                contract_type=request.data.get('contract_type', 'ARR_VIV_URB'),
                additional_data=request.data.get('additional_data', {})
            )
            
            serializer = self.get_serializer(contract)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except ValidationError as e:
            return Response(
                {"errors": e.messages},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], url_path='verify-identity')
    async def verify_identity(self, request):
        """Verifica la identidad de un usuario para firmar contratos"""
        user_type = request.data.get('user_type')  # 'tenant' o 'landlord'
        
        if not user_type:
            return Response(
                {"error": "Debe especificar user_type"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        documents = {
            'id_document': request.FILES.get('id_document'),
            'selfie': request.FILES.get('selfie'),
            'request_background_check': request.data.get('background_check', False)
        }
        
        verification_result = await ContractVerificationService.verify_identity_for_contract(
            user=request.user,
            documents=documents
        )
        
        # Actualizar estado de verificación del usuario
        if verification_result['verified']:
            request.user.is_verified = True
            request.user.verification_date = timezone.now()
            request.user.save()
        
        return Response(verification_result)
    
    @action(detail=True, methods=['get'])
    def legal_clauses(self, request, pk=None):
        """Obtiene las cláusulas legales del contrato"""
        contract = self.get_object()
        clauses = contract.generate_legal_clauses()
        
        clauses_data = [
            {
                'clause_number': clause.clause_number,
                'title': clause.title,
                'content': clause.content,
                'legal_reference': clause.legal_reference,
                'is_mandatory': clause.is_mandatory
            }
            for clause in clauses
        ]
        
        return Response(clauses_data)
    
    @action(detail=True, methods=['post'])
    def add_guarantee(self, request, pk=None):
        """Agrega una garantía al contrato"""
        contract = self.get_object()
        
        # Solo el arrendador puede agregar garantías
        if request.user != contract.match_request.property.landlord:
            return Response(
                {"error": "Solo el arrendador puede agregar garantías"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        guarantee_data = request.data
        # Crear garantía...
        
        return Response({"message": "Garantía agregada exitosamente"})
    
    @action(detail=True, methods=['post'])
    def sign_contract(self, request, pk=None):
        """Firma digital del contrato"""
        contract = self.get_object()
        
        if not contract.can_be_signed():
            return Response(
                {"error": "El contrato no está listo para ser firmado"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        signature_data = request.data.get('signature')
        signature_type = request.data.get('signature_type')  # 'landlord' o 'tenant'
        
        # Validar que el usuario puede firmar
        if signature_type == 'landlord' and request.user != contract.match_request.property.landlord:
            return Response({"error": "No autorizado"}, status=status.HTTP_403_FORBIDDEN)
        elif signature_type == 'tenant' and request.user != contract.match_request.tenant:
            return Response({"error": "No autorizado"}, status=status.HTTP_403_FORBIDDEN)
        
        # Guardar firma
        if signature_type == 'landlord':
            contract.landlord_signature = signature_data
        else:
            contract.tenant_signature = signature_data
        
        # Actualizar estado si ambos firmaron
        if contract.landlord_signature and contract.tenant_signature:
            contract.status = 'SIGNED'
        else:
            contract.status = 'PARTIAL_SIG'
        
        contract.save()
        
        return Response({
            "message": "Contrato firmado exitosamente",
            "contract_status": contract.status
        })
    
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Genera y descarga el PDF del contrato"""
        contract = self.get_object()
        
        # Verificar permisos
        allowed_users = [
            contract.match_request.tenant,
            contract.match_request.property.landlord
        ]
        if request.user not in allowed_users:
            return Response(
                {"error": "No autorizado"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generar PDF (implementar con ReportLab o similar)
        pdf_url = f"/media/contracts/{contract.id}.pdf"
        
        return Response({"pdf_url": pdf_url})
    
    @action(detail=True, methods=['get'])
    def payment_schedule(self, request, pk=None):
        """Obtiene el calendario de pagos del contrato"""
        contract = self.get_object()
        milestones = contract.milestones.filter(
            milestone_type='PAGO_MENSUAL'
        ).order_by('due_date')
        
        schedule_data = [
            {
                'id': milestone.id,
                'month': milestone.description,
                'due_date': milestone.due_date,
                'amount': milestone.amount,
                'status': milestone.status
            }
            for milestone in milestones
        ]
        
        return Response(schedule_data)