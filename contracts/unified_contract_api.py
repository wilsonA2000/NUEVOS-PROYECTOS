"""
API Unificada para Workflow de Contratos Limpio
Endpoints para arrendadores y arrendatarios con flujo claro y sincronizado
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError, PermissionDenied
import logging

from .models import Contract, ContractObjection, BiometricAuthentication
from .serializers import ContractSerializer
from users.models import User

logger = logging.getLogger(__name__)


class UnifiedContractViewSet(viewsets.ModelViewSet):
    """
    ViewSet unificado para contratos - Maneja workflow para ambos roles
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ContractSerializer
    
    def get_queryset(self):
        """Retorna contratos según el rol del usuario."""
        user = self.request.user
        
        # Arrendadores ven sus contratos creados
        if user.user_type == 'landlord':
            return Contract.objects.filter(primary_party=user)
        
        # Arrendatarios ven contratos donde son secondary_party
        elif user.user_type == 'tenant':
            return Contract.objects.filter(secondary_party=user)
        
        # Otros usuarios no tienen acceso
        return Contract.objects.none()
    
    # =====================================================
    # ENDPOINTS PARA ARRENDATARIO
    # =====================================================
    
    @action(detail=True, methods=['post'], url_path='tenant-approve')
    def tenant_approve(self, request, pk=None):
        """
        ✅ ARRENDATARIO APRUEBA EL CONTRATO
        Transición: tenant_review → tenant_approved
        """
        contract = self.get_object()
        
        # Validaciones
        if contract.secondary_party != request.user:
            raise PermissionDenied("Solo el arrendatario puede aprobar el contrato")
        
        if not contract.can_tenant_approve():
            return Response(
                {'error': f'El contrato no puede ser aprobado en estado {contract.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Aprobar contrato
        with transaction.atomic():
            contract.tenant_approved = True
            contract.tenant_approved_at = timezone.now()
            contract.status = 'tenant_approved'
            contract.save()
            
            logger.info(f"✅ Contrato {contract.contract_number} aprobado por arrendatario {request.user.email}")
        
        return Response({
            'success': True,
            'message': 'Contrato aprobado exitosamente',
            'contract': ContractSerializer(contract).data,
            'next_step': 'biometric_authentication'
        })
    
    @action(detail=True, methods=['post'], url_path='tenant-object')
    def tenant_object(self, request, pk=None):
        """
        ⚠️ ARRENDATARIO PRESENTA OBJECIONES
        Transición: tenant_review → objections_pending
        """
        contract = self.get_object()
        
        # Validaciones
        if contract.secondary_party != request.user:
            raise PermissionDenied("Solo el arrendatario puede objetar el contrato")
        
        if not contract.can_tenant_object():
            return Response(
                {'error': 'El contrato no puede ser objetado en este momento'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        objections_data = request.data.get('objections', [])
        if not objections_data:
            return Response(
                {'error': 'Debe proporcionar al menos una objeción'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear objeciones
        with transaction.atomic():
            for objection in objections_data:
                ContractObjection.objects.create(
                    contract=contract,
                    objection_text=objection.get('text', ''),
                    proposed_modification=objection.get('proposed_modification', ''),
                    field_reference=objection.get('field_reference', '')
                )
            
            contract.has_objections = True
            contract.status = 'objections_pending'
            contract.save()
            
            logger.info(f"⚠️ Contrato {contract.contract_number} tiene {len(objections_data)} objeciones")
        
        return Response({
            'success': True,
            'message': f'{len(objections_data)} objeción(es) registrada(s)',
            'contract': ContractSerializer(contract).data,
            'objections_count': len(objections_data)
        })
    
    # =====================================================
    # ENDPOINTS PARA ARRENDADOR
    # =====================================================
    
    @action(detail=True, methods=['post'], url_path='send-to-tenant-review')
    def send_to_tenant_review(self, request, pk=None):
        """
        📤 ARRENDADOR ENVÍA CONTRATO A REVISIÓN DEL ARRENDATARIO
        Transición: draft → tenant_review
        """
        contract = self.get_object()
        
        # Validaciones
        if contract.primary_party != request.user:
            raise PermissionDenied("Solo el arrendador puede enviar el contrato a revisión")
        
        if contract.status != 'draft':
            return Response(
                {'error': f'Solo contratos en borrador pueden enviarse a revisión'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Enviar a revisión
        with transaction.atomic():
            contract.status = 'tenant_review'
            contract.save()
            
            logger.info(f"📤 Contrato {contract.contract_number} enviado a revisión del arrendatario")
        
        return Response({
            'success': True,
            'message': 'Contrato enviado a revisión del arrendatario',
            'contract': ContractSerializer(contract).data
        })
    
    @action(detail=True, methods=['post'], url_path='respond-objections')
    def respond_objections(self, request, pk=None):
        """
        💬 ARRENDADOR RESPONDE A OBJECIONES DEL ARRENDATARIO
        """
        contract = self.get_object()
        
        # Validaciones
        if contract.primary_party != request.user:
            raise PermissionDenied("Solo el arrendador puede responder objeciones")
        
        if contract.status != 'objections_pending':
            return Response(
                {'error': 'No hay objeciones pendientes'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        responses = request.data.get('responses', [])
        modifications_made = False
        
        # Procesar respuestas
        with transaction.atomic():
            for response in responses:
                objection = ContractObjection.objects.get(
                    id=response['objection_id'],
                    contract=contract
                )
                
                if response['action'] == 'accept':
                    objection.status = 'ACCEPTED'
                    objection.landlord_response = response.get('response', '')
                    modifications_made = True
                elif response['action'] == 'reject':
                    objection.status = 'REJECTED'
                    objection.landlord_response = response.get('response', '')
                
                objection.resolved_at = timezone.now()
                objection.save()
            
            # Verificar si todas las objeciones están resueltas
            pending_objections = contract.objections.filter(status='PENDING').count()
            
            if pending_objections == 0:
                contract.objections_resolved = True
                
                if modifications_made:
                    # Volver a revisión si hubo cambios
                    contract.status = 'tenant_review'
                    contract.has_objections = False
                else:
                    # Sin cambios aceptados - contrato rechazado
                    contract.status = 'cancelled'
                
                contract.save()
        
        return Response({
            'success': True,
            'message': 'Respuestas a objeciones procesadas',
            'contract': ContractSerializer(contract).data,
            'modifications_made': modifications_made
        })
    
    # =====================================================
    # ENDPOINTS DE AUTENTICACIÓN BIOMÉTRICA
    # =====================================================
    
    @action(detail=True, methods=['post'], url_path='start-biometric')
    def start_biometric(self, request, pk=None):
        """
        🔐 INICIAR AUTENTICACIÓN BIOMÉTRICA SECUENCIAL
        Solo disponible cuando tenant_approved = True
        """
        contract = self.get_object()
        
        if not contract.can_start_biometric():
            return Response(
                {'error': 'El contrato no está listo para autenticación biométrica'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Determinar quién debe autenticarse primero
        next_step = contract.get_next_biometric_step()
        
        if next_step == 'tenant':
            contract.status = 'tenant_biometric'
        elif next_step == 'guarantor':
            contract.status = 'guarantor_biometric'
        elif next_step == 'landlord':
            contract.status = 'landlord_biometric'
        
        contract.save()
        
        return Response({
            'success': True,
            'next_biometric_step': next_step,
            'contract': ContractSerializer(contract).data
        })
    
    @action(detail=True, methods=['get'], url_path='workflow-status')
    def workflow_status(self, request, pk=None):
        """
        📊 OBTENER ESTADO COMPLETO DEL WORKFLOW
        Disponible para ambos roles
        """
        contract = self.get_object()
        
        return Response({
            'contract_number': contract.contract_number,
            'current_status': contract.status,
            'current_phase': contract.get_current_phase(),
            'workflow_progress': contract.get_workflow_progress(),
            'tenant_approved': contract.tenant_approved,
            'has_objections': contract.has_objections,
            'objections_resolved': contract.objections_resolved,
            'landlord_auth_completed': contract.landlord_auth_completed,
            'tenant_auth_completed': contract.tenant_auth_completed,
            'next_biometric_step': contract.get_next_biometric_step(),
            'can_tenant_approve': contract.can_tenant_approve(),
            'can_tenant_object': contract.can_tenant_object(),
            'can_start_biometric': contract.can_start_biometric(),
        })
