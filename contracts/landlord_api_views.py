"""
API Views para operaciones de contratos controlados por arrendador.
Implementa todas las operaciones del workflow paso a paso.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q, Count, Avg, Sum, F, ExpressionWrapper, DurationField
from django.db import models
from django.db import transaction
from django.core.exceptions import ValidationError, PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.http import HttpResponse, Http404
from decimal import Decimal
from datetime import datetime, timedelta
import logging
import os

from .landlord_contract_models import (
    LandlordControlledContract,
    ContractObjection,
    LandlordContractGuarantee,
    ContractWorkflowHistory,
    ContractModificationRequest,
    CodeudorAuthToken
)
from .landlord_contract_service import LandlordContractService
from .landlord_contract_serializers import (
    LandlordControlledContractListSerializer,
    LandlordControlledContractDetailSerializer,
    ContractCreateSerializer,
    LandlordDataSerializer,
    TenantInvitationSerializer,
    ContractObjectionSerializer,
    ContractObjectionCreateSerializer,
    ContractObjectionResponseSerializer,
    ContractApprovalSerializer,
    ContractSignatureSerializer,
    ContractStatsSerializer,
    LandlordContractGuaranteeSerializer,
    ContractWorkflowHistorySerializer,
    ContractModificationRequestSerializer,
    ContractModificationRequestCreateSerializer,
    ContractModificationRequestResponseSerializer
)
from .pdf_generator import generate_contract_pdf
from .modification_notification_service import ModificationNotificationService

logger = logging.getLogger(__name__)


class IsLandlordPermission(permissions.BasePermission):
    """Permiso para verificar que el usuario es arrendador."""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Verificar que el usuario sea arrendador
        # El campo user_type está directamente en el modelo User
        return request.user.user_type == 'landlord'


class LandlordContractViewSet(viewsets.ModelViewSet):
    """
    ViewSet principal para operaciones de contratos por parte del arrendador.
    Implementa el workflow completo paso a paso.
    """
    
    permission_classes = [IsAuthenticated, IsLandlordPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['current_state', 'published', 'landlord_approved', 'tenant_approved']
    search_fields = ['contract_number', 'tenant__email', 'tenant__first_name', 'tenant__last_name']
    ordering_fields = ['created_at', 'updated_at', 'monthly_rent']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filtrar contratos del arrendador autenticado."""
        return LandlordControlledContract.objects.filter(
            landlord=self.request.user
        ).select_related(
            'landlord', 'tenant', 'property'
        ).prefetch_related(
            'objections', 'guarantees', 'history_entries'
        )
    
    def get_serializer_class(self):
        """Seleccionar serializer según la acción."""
        if self.action == 'list':
            return LandlordControlledContractListSerializer
        elif self.action == 'create':
            return ContractCreateSerializer
        else:
            return LandlordControlledContractDetailSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Crear nuevo contrato con datos completos del formulario.
        Procesa todos los datos: propiedad, arrendador, términos, garantías y codeudor.
        """
        print(f"🏠 Contract creation request from user: {request.user.email}")
        print(f"📝 Request data keys: {list(request.data.keys())}")
        print(f"📝 Request data: {request.data}")

        serializer = self.get_serializer(data=request.data)

        if not serializer.is_valid():
            print(f"❌ Serializer validation failed: {serializer.errors}")

        serializer.is_valid(raise_exception=True)

        try:
            # El serializer ya procesó y validó todos los datos
            # Simplemente crear el contrato con los datos validados
            contract = serializer.save()

            # Registrar en historial detallado
            self._record_contract_creation_history(contract, request.user, serializer.validated_data)

            # Respuesta detallada con información del contrato creado
            response_data = {
                'id': str(contract.id),
                'contract_number': contract.contract_number,
                'current_state': contract.current_state,
                'created_at': contract.created_at.isoformat() if contract.created_at else None,
                'has_property_data': bool(contract.property_data),
                'has_landlord_data': bool(contract.landlord_data),
                'has_guarantee_terms': bool(contract.contract_terms.get('guarantor_required')),
                'has_codeudor_data': bool(contract.contract_terms.get('codeudor_data')),
                'monthly_rent': contract.economic_terms.get('monthly_rent', 0),
                'security_deposit': contract.economic_terms.get('security_deposit', 0),
                'contract_duration_months': contract.contract_terms.get('contract_duration_months', 12)
            }
            return Response(response_data, status=status.HTTP_201_CREATED)

        except (ValidationError, PermissionDenied) as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import traceback
            logger.error(f"Error creating contract: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': 'Error interno al crear el contrato'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _record_contract_creation_history(self, contract, user, validated_data):
        """Registrar historial detallado de la creación del contrato"""
        try:
            from .landlord_contract_models import ContractWorkflowHistory

            # Preparar resumen de datos para el historial
            data_summary = {
                'has_property_data': bool(contract.property_data),
                'has_landlord_data': bool(contract.landlord_data),
                'has_guarantee_terms': bool(contract.contract_terms.get('guarantor_required')),
                'has_special_clauses': bool(contract.special_clauses),
                'economic_terms_count': len(contract.economic_terms),
                'contract_terms_count': len(contract.contract_terms)
            }

            ContractWorkflowHistory.objects.create(
                contract=contract,
                performed_by=user,
                action_type='CONTRACT_CREATED_COMPLETE',
                action_description=f"Contrato creado con datos completos del formulario",
                old_state='',
                new_state='DRAFT',
                changes_made=data_summary,
                user_role='landlord'
            )
        except Exception as e:
            logger.warning(f"No se pudo registrar historial: {e}")
            # No fallar la creación del contrato por problemas de historial

    def update(self, request, *args, **kwargs):
        """
        Actualizar contrato - PROTECCIÓN PARA CONTRATOS ACTIVOS.
        Solo administradores pueden modificar contratos activos.
        """
        instance = self.get_object()

        # Validar si el contrato está activo (usando current_state ya que is_active no existe en este modelo)
        is_active = instance.current_state == 'ACTIVE'
        if is_active and not request.user.is_staff:
            return Response({
                'error': 'Contrato activo no puede ser modificado',
                'message': 'Los contratos activos solo pueden ser modificados por administradores de VeriHome',
                'contract_status': 'active',
                'is_active': True
            }, status=status.HTTP_403_FORBIDDEN)

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """
        Actualización parcial - PROTECCIÓN PARA CONTRATOS ACTIVOS.
        Solo administradores pueden modificar contratos activos.
        """
        instance = self.get_object()

        # Validar si el contrato está activo (usando current_state ya que is_active no existe en este modelo)
        is_active = instance.current_state == 'ACTIVE'
        if is_active and not request.user.is_staff:
            return Response({
                'error': 'Contrato activo no puede ser modificado',
                'message': 'Los contratos activos solo pueden ser modificados por administradores de VeriHome',
                'contract_status': 'active',
                'is_active': True
            }, status=status.HTTP_403_FORBIDDEN)

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """
        Eliminar contrato - PROTECCIÓN PARA CONTRATOS ACTIVOS.
        Solo administradores pueden eliminar contratos activos.
        """
        instance = self.get_object()

        # Validar si el contrato está activo (usando current_state ya que is_active no existe en este modelo)
        is_active = instance.current_state == 'ACTIVE'
        if is_active and not request.user.is_staff:
            return Response({
                'error': 'Contrato activo no puede ser eliminado',
                'message': 'Los contratos activos solo pueden ser eliminados por administradores de VeriHome',
                'contract_status': 'active',
                'is_active': True
            }, status=status.HTTP_403_FORBIDDEN)

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def complete_landlord_data(self, request, pk=None):
        """
        Completar datos del arrendador (Paso 2 del workflow).
        Después de esto se genera token para invitar al arrendatario.
        """
        contract = self.get_object()
        
        if contract.current_state != 'DRAFT':
            return Response(
                {'error': f'No se pueden completar datos en estado {contract.current_state}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = LandlordDataSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = LandlordContractService()
            updated_contract, invitation_token = service.complete_landlord_data(
                contract_id=contract.id,
                landlord=request.user,
                landlord_data=serializer.validated_data
            )
            
            response_data = LandlordControlledContractDetailSerializer(updated_contract).data
            response_data['invitation_token'] = invitation_token
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except (ValidationError, PermissionDenied) as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def send_tenant_invitation(self, request, pk=None):
        """
        Enviar invitación por email al arrendatario (Paso 3 del workflow).
        """
        contract = self.get_object()
        
        if contract.current_state != 'TENANT_INVITED':
            return Response(
                {'error': 'El contrato no está en estado de invitación'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = TenantInvitationSerializer(
            data=request.data, 
            context={'request': request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = LandlordContractService()
            success = service.send_tenant_invitation(
                contract_id=contract.id,
                landlord=request.user,
                tenant_email=serializer.validated_data['tenant_email'],
                personal_message=serializer.validated_data.get('personal_message', '')
            )
            
            if success:
                # Refrescar el contrato
                contract.refresh_from_db()
                response_data = LandlordControlledContractDetailSerializer(contract).data
                return Response(response_data, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': 'Error enviando la invitación por email'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except (ValidationError, PermissionDenied) as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def create_objection(self, request, pk=None):
        """
        Crear objeción a algún término del contrato.
        """
        contract = self.get_object()
        
        if contract.current_state not in ['LANDLORD_REVIEWING', 'TENANT_REVIEWING', 'OBJECTIONS_PENDING']:
            return Response(
                {'error': 'No se pueden crear objeciones en el estado actual'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ContractObjectionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = LandlordContractService()
            objection = service.submit_objection(
                contract_id=contract.id,
                user=request.user,
                field_name=serializer.validated_data['field_name'],
                current_value=serializer.validated_data['current_value'],
                proposed_value=serializer.validated_data['proposed_value'],
                justification=serializer.validated_data['justification'],
                priority=serializer.validated_data.get('priority', 'MEDIUM')
            )
            
            return Response(
                ContractObjectionSerializer(objection).data, 
                status=status.HTTP_201_CREATED
            )
            
        except (ValidationError, PermissionDenied) as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def respond_to_objection(self, request, pk=None):
        """
        Responder a una objeción presentada por la otra parte.
        """
        contract = self.get_object()
        objection_id = request.data.get('objection_id')
        
        if not objection_id:
            return Response(
                {'error': 'objection_id es requerido'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ContractObjectionResponseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = LandlordContractService()
            objection = service.respond_to_objection(
                objection_id=objection_id,
                user=request.user,
                response=serializer.validated_data['response'],
                response_note=serializer.validated_data.get('response_note', '')
            )
            
            return Response(
                ContractObjectionSerializer(objection).data, 
                status=status.HTTP_200_OK
            )
            
        except (ValidationError, PermissionDenied) as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def approve_contract(self, request, pk=None):
        """
        Aprobar el contrato final por parte del arrendador.
        """
        contract = self.get_object()
        
        if contract.current_state != 'BOTH_REVIEWING':
            return Response(
                {'error': 'El contrato no está listo para aprobación'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ContractApprovalSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        if not serializer.validated_data['approved']:
            return Response(
                {'error': 'Para rechazar el contrato use la acción reject_contract'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = LandlordContractService()
            updated_contract = service.approve_contract(
                contract_id=contract.id,
                user=request.user
            )

            # CRÍTICO: Sincronizar Contract OLD para sistema biométrico
            try:
                from .models import Contract
                old_contract = Contract.objects.filter(id=updated_contract.id).first()
                if old_contract:
                    # Mapear estados del sistema NEW al OLD
                    if updated_contract.current_state == 'BOTH_REVIEWING':
                        old_contract.status = 'ready_for_authentication'
                    elif updated_contract.current_state == 'READY_TO_SIGN':
                        old_contract.status = 'pending_biometric'

                    old_contract.save()
                    logger.info(f"✅ Contract OLD {old_contract.id} synchronized with state: {old_contract.status}")
                else:
                    logger.warning(f"⚠️ No Contract OLD found for ID {updated_contract.id}")

            except Exception as e:
                logger.warning(f"⚠️ Error synchronizing Contract OLD: {e}")
                # No fallar el proceso principal si hay error en la sincronización

            return Response(
                LandlordControlledContractDetailSerializer(updated_contract).data, 
                status=status.HTTP_200_OK
            )
            
        except (ValidationError, PermissionDenied) as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def sign_contract(self, request, pk=None):
        """
        Firmar digitalmente el contrato por parte del arrendador.
        """
        contract = self.get_object()
        
        if contract.current_state != 'READY_TO_SIGN':
            return Response(
                {'error': 'El contrato no está listo para firmar'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ContractSignatureSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = LandlordContractService()
            updated_contract = service.record_digital_signature(
                contract_id=contract.id,
                user=request.user,
                signature_data=serializer.validated_data
            )
            
            return Response(
                LandlordControlledContractDetailSerializer(updated_contract).data, 
                status=status.HTTP_200_OK
            )
            
        except (ValidationError, PermissionDenied) as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def publish_contract(self, request, pk=None):
        """
        Publicar el contrato (darle vida jurídica) - solo arrendador.
        Este es el paso final que activa el contrato.
        """
        contract = self.get_object()
        
        if contract.current_state != 'FULLY_SIGNED':
            return Response(
                {'error': 'Solo se pueden publicar contratos completamente firmados'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = LandlordContractService()
            published_contract = service.publish_contract(
                contract_id=contract.id,
                landlord=request.user
            )
            
            return Response(
                LandlordControlledContractDetailSerializer(published_contract).data, 
                status=status.HTTP_200_OK
            )
            
        except (ValidationError, PermissionDenied) as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def objections(self, request, pk=None):
        """
        Listar todas las objeciones del contrato.
        """
        contract = self.get_object()
        objections = contract.objections.order_by('-submitted_at')
        
        # Filtros opcionales
        status_filter = request.query_params.get('status')
        if status_filter:
            objections = objections.filter(status=status_filter)
        
        priority_filter = request.query_params.get('priority')
        if priority_filter:
            objections = objections.filter(priority=priority_filter)
        
        serializer = ContractObjectionSerializer(objections, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Obtener historial completo del workflow del contrato.
        """
        contract = self.get_object()
        history = contract.history_entries.order_by('-timestamp')
        
        # Paginación simple
        limit = int(request.query_params.get('limit', 50))
        offset = int(request.query_params.get('offset', 0))
        
        history_page = history[offset:offset + limit]
        serializer = ContractWorkflowHistorySerializer(history_page, many=True)
        
        return Response({
            'count': history.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Estadísticas de contratos del arrendador.
        """
        queryset = self.get_queryset()
        
        # Estadísticas básicas
        total_contracts = queryset.count()
        draft_contracts = queryset.filter(current_state='DRAFT').count()
        active_contracts = queryset.filter(published=True, current_state='PUBLISHED').count()
        completed_contracts = queryset.filter(
            current_state__in=['TERMINATED', 'EXPIRED']
        ).count()
        
        contracts_with_objections = queryset.filter(
            objections__isnull=False
        ).distinct().count()
        
        pending_signatures = queryset.filter(
            current_state='READY_TO_SIGN'
        ).count()
        
        # Ingresos mensuales
        monthly_revenue = queryset.filter(
            published=True
        ).aggregate(
            total=models.Sum('monthly_rent')
        )['total'] or Decimal('0.00')
        
        # Promedio de días para completar
        completed_contracts_qs = queryset.filter(
            published_at__isnull=False
        ).annotate(
            completion_days=models.ExpressionWrapper(
                models.F('published_at') - models.F('created_at'),
                output_field=models.DurationField()
            )
        )
        
        avg_completion = completed_contracts_qs.aggregate(
            avg_days=Avg('completion_days')
        )['avg_days']
        
        avg_completion_days = (
            avg_completion.days if avg_completion else 0
        )
        
        # Desglose por estado
        state_breakdown = dict(
            queryset.values('current_state').annotate(
                count=Count('id')
            ).values_list('current_state', 'count')
        )
        
        # Tendencias mensuales (últimos 12 meses)
        twelve_months_ago = timezone.now() - timedelta(days=365)
        monthly_trends = []
        
        for i in range(12):
            month_start = twelve_months_ago + timedelta(days=i*30)
            month_end = month_start + timedelta(days=30)
            
            month_contracts = queryset.filter(
                created_at__gte=month_start,
                created_at__lt=month_end
            ).count()
            
            monthly_trends.append({
                'month': month_start.strftime('%Y-%m'),
                'contracts_created': month_contracts
            })
        
        stats_data = {
            'total_contracts': total_contracts,
            'draft_contracts': draft_contracts,
            'active_contracts': active_contracts,
            'completed_contracts': completed_contracts,
            'contracts_with_objections': contracts_with_objections,
            'average_completion_days': avg_completion_days,
            'monthly_revenue': monthly_revenue,
            'pending_signatures': pending_signatures,
            'state_breakdown': state_breakdown,
            'monthly_trends': monthly_trends
        }
        
        serializer = ContractStatsSerializer(stats_data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_guarantee(self, request, pk=None):
        """
        Agregar garantía al contrato (depósito, codeudor, etc.).
        """
        contract = self.get_object()

        serializer = LandlordContractGuaranteeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            guarantee = serializer.save(contract=contract)
            return Response(
                LandlordContractGuaranteeSerializer(guarantee).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], url_path='invite-codeudor')
    def invite_codeudor(self, request, pk=None):
        """
        Invitar a un codeudor para que complete su autenticación biométrica vía email.

        Este endpoint genera un token único y envía un email al codeudor
        con un link para completar su verificación biométrica sin necesidad
        de registrarse en VeriHome.

        POST /api/v1/contracts/landlord/contracts/{id}/invite-codeudor/

        Body:
        {
            "codeudor_name": "Juan Pérez",
            "codeudor_email": "juan@example.com",
            "codeudor_phone": "+57 300 1234567",
            "codeudor_document_type": "CC",
            "codeudor_document_number": "12345678",
            "codeudor_type": "codeudor_salario",
            "personal_message": "Mensaje opcional del arrendador",
            "guarantee_id": "uuid_opcional_de_garantia"
        }

        Response:
        - token_id: ID del token creado
        - auth_url: URL que el codeudor debe visitar
        - expires_at: Fecha de expiración del token
        """
        contract = self.get_object()

        # Validar datos requeridos
        required_fields = ['codeudor_name', 'codeudor_email', 'codeudor_document_type', 'codeudor_document_number']
        for field in required_fields:
            if not request.data.get(field):
                return Response(
                    {'error': f'El campo {field} es requerido'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        try:
            # Obtener garantía si se especifica
            guarantee = None
            guarantee_id = request.data.get('guarantee_id')
            if guarantee_id:
                try:
                    guarantee = LandlordContractGuarantee.objects.get(
                        id=guarantee_id,
                        contract=contract
                    )
                except LandlordContractGuarantee.DoesNotExist:
                    pass

            # Crear token de autenticación
            auth_token = CodeudorAuthToken.objects.create(
                contract=contract,
                guarantee=guarantee,
                codeudor_name=request.data.get('codeudor_name'),
                codeudor_email=request.data.get('codeudor_email'),
                codeudor_phone=request.data.get('codeudor_phone', ''),
                codeudor_document_type=request.data.get('codeudor_document_type', 'CC'),
                codeudor_document_number=request.data.get('codeudor_document_number'),
                codeudor_type=request.data.get('codeudor_type', 'codeudor_salario'),
                personal_message=request.data.get('personal_message', ''),
                created_by=request.user,
            )

            # Generar URL de autenticación
            # En producción usar settings.FRONTEND_URL
            from django.conf import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            auth_url = auth_token.get_auth_url(frontend_url)

            # Enviar email al codeudor
            email_sent = self._send_codeudor_invitation_email(auth_token, auth_url)

            if email_sent:
                auth_token.mark_as_sent()

            # Registrar en historial
            ContractWorkflowHistory.log_action(
                contract=contract,
                action_type='SYSTEM_ACTION',
                performed_by=request.user,
                description=f'Invitación enviada a codeudor: {auth_token.codeudor_name}',
                metadata={
                    'codeudor_email': auth_token.codeudor_email,
                    'token_id': str(auth_token.id),
                    'email_sent': email_sent,
                }
            )

            return Response({
                'success': True,
                'token_id': str(auth_token.id),
                'codeudor_name': auth_token.codeudor_name,
                'codeudor_email': auth_token.codeudor_email,
                'auth_url': auth_url,
                'expires_at': auth_token.expires_at.isoformat(),
                'email_sent': email_sent,
                'message': f'Invitación enviada a {auth_token.codeudor_name}. El codeudor recibirá un email con instrucciones.',
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error inviting codeudor: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _send_codeudor_invitation_email(self, auth_token, auth_url):
        """
        Envía el email de invitación al codeudor.
        Retorna True si el email se envió exitosamente.
        """
        try:
            from django.core.mail import send_mail
            from django.template.loader import render_to_string
            from django.conf import settings

            # Preparar contexto para el template
            context = {
                'codeudor_name': auth_token.codeudor_name,
                'contract_number': auth_token.contract.contract_number,
                'landlord_name': auth_token.created_by.get_full_name() or auth_token.created_by.email,
                'property_address': auth_token.contract.property_data.get('address', 'No disponible'),
                'auth_url': auth_url,
                'expires_at': auth_token.expires_at.strftime('%d/%m/%Y %H:%M'),
                'personal_message': auth_token.personal_message,
                'codeudor_type_display': 'Codeudor con Salario' if auth_token.codeudor_type == 'codeudor_salario' else 'Codeudor con Finca Raíz',
            }

            # Intentar usar template HTML, si no existe usar texto plano
            try:
                html_message = render_to_string('emails/codeudor_invitation.html', context)
            except Exception:
                html_message = None

            # Mensaje de texto plano
            plain_message = f"""
Hola {auth_token.codeudor_name},

{auth_token.created_by.get_full_name() or 'Un arrendador'} te ha invitado a actuar como codeudor
en el contrato de arrendamiento #{auth_token.contract.contract_number}.

Para completar tu verificación biométrica, por favor accede al siguiente enlace:
{auth_url}

Este enlace expira el {auth_token.expires_at.strftime('%d/%m/%Y a las %H:%M')}.

{f'Mensaje del arrendador: {auth_token.personal_message}' if auth_token.personal_message else ''}

Si tienes alguna pregunta, contacta directamente al arrendador.

Atentamente,
VeriHome - Plataforma de Gestión Inmobiliaria
            """

            # Enviar email
            send_mail(
                subject=f'Invitación para ser Codeudor - Contrato #{auth_token.contract.contract_number}',
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[auth_token.codeudor_email],
                html_message=html_message,
                fail_silently=False,
            )

            logger.info(f"Email de invitación enviado a codeudor: {auth_token.codeudor_email}")
            return True

        except Exception as e:
            logger.error(f"Error enviando email a codeudor: {str(e)}")
            return False

    @action(detail=True, methods=['get'], url_path='codeudor-tokens')
    def list_codeudor_tokens(self, request, pk=None):
        """
        Lista todos los tokens de codeudor para un contrato.

        GET /api/v1/contracts/landlord/contracts/{id}/codeudor-tokens/
        """
        contract = self.get_object()

        tokens = CodeudorAuthToken.objects.filter(contract=contract).order_by('-created_at')

        return Response({
            'count': tokens.count(),
            'tokens': [
                {
                    'id': str(t.id),
                    'codeudor_name': t.codeudor_name,
                    'codeudor_email': t.codeudor_email,
                    'codeudor_type': t.codeudor_type,
                    'status': t.status,
                    'status_display': dict(CodeudorAuthToken.STATUS_CHOICES).get(t.status, t.status),
                    'is_valid': t.is_valid,
                    'is_expired': t.is_expired,
                    'created_at': t.created_at.isoformat(),
                    'sent_at': t.sent_at.isoformat() if t.sent_at else None,
                    'completed_at': t.completed_at.isoformat() if t.completed_at else None,
                    'expires_at': t.expires_at.isoformat() if t.expires_at else None,
                }
                for t in tokens
            ]
        })

    @action(detail=True, methods=['post'], url_path='resend-codeudor-invitation/(?P<token_id>[^/.]+)')
    def resend_codeudor_invitation(self, request, pk=None, token_id=None):
        """
        Reenvía la invitación a un codeudor.

        POST /api/v1/contracts/landlord/contracts/{id}/resend-codeudor-invitation/{token_id}/
        """
        contract = self.get_object()

        try:
            auth_token = CodeudorAuthToken.objects.get(id=token_id, contract=contract)
        except CodeudorAuthToken.DoesNotExist:
            return Response(
                {'error': 'Token no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        if auth_token.status == 'completed':
            return Response(
                {'error': 'El codeudor ya completó su autenticación'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Regenerar token si ha expirado
        if auth_token.is_expired:
            auth_token.expires_at = timezone.now() + timedelta(days=7)
            auth_token.status = 'pending'
            auth_token.save()

        # Generar nueva URL
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        auth_url = auth_token.get_auth_url(frontend_url)

        # Reenviar email
        email_sent = self._send_codeudor_invitation_email(auth_token, auth_url)

        if email_sent:
            auth_token.mark_as_sent()

        return Response({
            'success': True,
            'message': f'Invitación reenviada a {auth_token.codeudor_email}',
            'email_sent': email_sent,
            'new_expires_at': auth_token.expires_at.isoformat(),
        })

    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        """
        Generar PDF del contrato con firmas digitales.
        Parámetros de query:
        - include_signatures: incluir imágenes de firmas (default: true)
        - include_biometric: incluir información biométrica (default: true)
        - download: descargar directamente (default: false)
        """
        contract = self.get_object()
        
        # Verificar que el contrato esté en estado válido para generar PDF
        if contract.current_state == 'DRAFT':
            return Response(
                {'error': 'No se puede generar PDF de un contrato en borrador'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Parámetros de query
            include_signatures = request.query_params.get('include_signatures', 'true').lower() == 'true'
            include_biometric = request.query_params.get('include_biometric', 'true').lower() == 'true'
            download = request.query_params.get('download', 'false').lower() == 'true'
            
            # Generar PDF
            pdf_file = generate_contract_pdf(
                contract,
                include_signatures=include_signatures,
                include_biometric=include_biometric
            )
            
            if download:
                # Respuesta para descarga directa
                response = HttpResponse(pdf_file.read(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="contrato_{contract.contract_number}.pdf"'
                return response
            else:
                # Respuesta con información del PDF generado
                return Response({
                    'contract_id': contract.id,
                    'contract_number': contract.contract_number,
                    'pdf_generated': True,
                    'file_size': len(pdf_file.read()),
                    'generated_at': timezone.now().isoformat(),
                    'includes_signatures': include_signatures,
                    'includes_biometric': include_biometric,
                    'download_url': f"{request.build_absolute_uri()}?download=true"
                })
                
        except Exception as e:
            logger.error(f"Error generando PDF para contrato {contract.id}: {str(e)}")
            return Response(
                {'error': f'Error al generar PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """
        Descargar PDF del contrato firmado.
        Solo disponible para contratos completamente firmados.
        """
        contract = self.get_object()
        
        # Verificar que el contrato esté firmado
        if not (contract.landlord_signed and contract.tenant_signed):
            return Response(
                {'error': 'El contrato debe estar firmado por ambas partes para descargar el PDF'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Generar PDF con todas las firmas
            pdf_file = generate_contract_pdf(
                contract,
                include_signatures=True,
                include_biometric=True
            )
            
            # Crear respuesta de descarga
            response = HttpResponse(pdf_file.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="contrato_firmado_{contract.contract_number}.pdf"'
            response['Content-Length'] = pdf_file.size if hasattr(pdf_file, 'size') else len(pdf_file.read())
            
            # Headers adicionales para mejor experiencia
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            
            return response
            
        except Exception as e:
            logger.error(f"Error descargando PDF para contrato {contract.id}: {str(e)}")
            return Response(
                {'error': f'Error al descargar PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def preview_pdf(self, request, pk=None):
        """
        Generar vista previa del PDF sin firmas para revisión.
        Útil para mostrar cómo se verá el contrato antes de firmar.
        """
        contract = self.get_object()

        try:
            # Generar PDF sin firmas para vista previa
            pdf_file = generate_contract_pdf(
                contract,
                include_signatures=False,
                include_biometric=False
            )

            # Respuesta para visualización en línea
            response = HttpResponse(pdf_file.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="preview_contrato_{contract.contract_number}.pdf"'

            return response

        except Exception as e:
            logger.error(f"Error generando preview PDF para contrato {contract.id}: {str(e)}")
            return Response(
                {'error': f'Error al generar vista previa: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # =======================================================================
    # 🔄 FLUJO CIRCULAR: Corrección y re-envío a admin (Plan Maestro V2.0)
    # =======================================================================

    @action(detail=True, methods=['post'], url_path='start_correction')
    def start_correction(self, request, pk=None):
        """
        🔄 FLUJO CIRCULAR: Arrendador inicia corrección del contrato devuelto por arrendatario.

        Este endpoint permite al arrendador comenzar a corregir un contrato que
        fue devuelto por el arrendatario. El contrato pasa al estado LANDLORD_CORRECTING.

        Estados permitidos: TENANT_RETURNED
        Estado resultante: LANDLORD_CORRECTING

        Returns:
            - 200: Corrección iniciada exitosamente
            - 400: Estado no permite iniciar corrección
            - 403: Usuario no es el arrendador del contrato
            - 404: Contrato no encontrado
        """
        contract = self.get_object()

        # Verificar que el contrato no esté bloqueado
        if contract.is_locked:
            return Response(
                {
                    'error': '🔒 El contrato está bloqueado y no puede ser modificado',
                    'code': 'CONTRACT_LOCKED',
                    'locked_at': contract.locked_at.isoformat() if contract.locked_at else None,
                    'locked_reason': contract.locked_reason
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar estado actual
        if contract.current_state != 'TENANT_RETURNED':
            return Response(
                {
                    'error': f'No se puede iniciar corrección en estado {contract.current_state}',
                    'code': 'INVALID_STATE',
                    'current_state': contract.current_state,
                    'allowed_states': ['TENANT_RETURNED'],
                    'tenant_return_notes': contract.tenant_return_notes
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Ejecutar inicio de corrección usando el método del modelo
            success = contract.start_landlord_correction(landlord_user=request.user)

            if not success:
                return Response(
                    {
                        'error': 'No se pudo iniciar la corrección',
                        'code': 'START_CORRECTION_FAILED'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Refrescar contrato
            contract.refresh_from_db()

            return Response({
                'message': '✅ Corrección iniciada exitosamente',
                'contract_id': str(contract.id),
                'new_state': contract.current_state,
                'review_cycle': contract.review_cycle_count,
                'tenant_return_notes': contract.tenant_return_notes,
                'last_return_date': contract.last_return_date.isoformat() if contract.last_return_date else None,
                'is_editable': contract.is_editable(),
                'next_step': 'Realiza las correcciones solicitadas y luego re-envía el contrato para revisión del administrador'
            }, status=status.HTTP_200_OK)

        except ValidationError as e:
            return Response(
                {'error': str(e), 'code': 'VALIDATION_ERROR'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error starting landlord correction: {e}")
            return Response(
                {
                    'error': 'Error interno al iniciar corrección',
                    'code': 'INTERNAL_ERROR',
                    'details': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='resubmit_for_admin_review')
    def resubmit_for_admin_review(self, request, pk=None):
        """
        🔄 FLUJO CIRCULAR: Arrendador re-envía el contrato corregido al administrador.

        Este endpoint permite al arrendador re-enviar un contrato corregido para
        que el abogado/administrador lo revise nuevamente. Incrementa el contador
        de ciclos de revisión.

        Estados permitidos: LANDLORD_CORRECTING
        Estado resultante: RE_PENDING_ADMIN

        Request Body:
            {
                "changes_summary": "Resumen de los cambios realizados (obligatorio)",
                "changes_list": ["cambio1", "cambio2"]  // opcional, lista detallada
            }

        Returns:
            - 200: Contrato re-enviado exitosamente
            - 400: Estado no permite re-envío o resumen vacío
            - 403: Usuario no es el arrendador del contrato
            - 404: Contrato no encontrado
        """
        contract = self.get_object()

        # Verificar que el contrato no esté bloqueado
        if contract.is_locked:
            return Response(
                {
                    'error': '🔒 El contrato está bloqueado y no puede ser modificado',
                    'code': 'CONTRACT_LOCKED',
                    'locked_at': contract.locked_at.isoformat() if contract.locked_at else None,
                    'locked_reason': contract.locked_reason
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar estado actual
        if contract.current_state != 'LANDLORD_CORRECTING':
            return Response(
                {
                    'error': f'No se puede re-enviar en estado {contract.current_state}',
                    'code': 'INVALID_STATE',
                    'current_state': contract.current_state,
                    'allowed_states': ['LANDLORD_CORRECTING']
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar resumen de cambios (obligatorio)
        changes_summary = request.data.get('changes_summary', '').strip()
        if not changes_summary:
            return Response(
                {
                    'error': 'El resumen de cambios es obligatorio',
                    'code': 'CHANGES_SUMMARY_REQUIRED',
                    'hint': 'Proporciona un resumen de los cambios realizados para que el administrador los revise'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(changes_summary) < 10:
            return Response(
                {
                    'error': 'El resumen debe tener al menos 10 caracteres',
                    'code': 'CHANGES_SUMMARY_TOO_SHORT',
                    'min_length': 10,
                    'current_length': len(changes_summary)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Obtener lista detallada de cambios (opcional)
            changes_list = request.data.get('changes_list', [])

            # Ejecutar re-envío usando el método del modelo
            success = contract.resubmit_for_admin_review(
                landlord_user=request.user,
                changes_summary=changes_summary
            )

            if not success:
                return Response(
                    {
                        'error': 'No se pudo re-enviar el contrato',
                        'code': 'RESUBMIT_FAILED'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Agregar evento adicional si hay lista detallada de cambios
            if changes_list:
                contract.add_workflow_event(
                    event_type='DETAILED_CHANGES_ADDED',
                    user=request.user,
                    details={
                        'changes_list': changes_list,
                        'changes_count': len(changes_list)
                    }
                )

            # Sincronizar con MatchRequest si existe
            try:
                from matching.models import MatchRequest
                match_request = MatchRequest.objects.filter(
                    property=contract.property
                ).first()

                if match_request:
                    match_request.workflow_status = 'contract_resubmitted_for_review'
                    if 'contract_created' in match_request.workflow_data:
                        match_request.workflow_data['contract_created']['resubmitted_for_review'] = True
                        match_request.workflow_data['contract_created']['resubmit_date'] = timezone.now().isoformat()
                        match_request.workflow_data['contract_created']['changes_summary'] = changes_summary
                        match_request.workflow_data['contract_created']['review_cycle'] = contract.review_cycle_count
                    match_request.save()
                    logger.info(f"✅ MatchRequest {match_request.id} updated - contract resubmitted for admin review")
            except Exception as e:
                logger.warning(f"⚠️ Error updating MatchRequest: {e}")

            # Refrescar contrato
            contract.refresh_from_db()

            return Response({
                'message': f'✅ Contrato re-enviado para revisión (Ciclo #{contract.review_cycle_count})',
                'contract_id': str(contract.id),
                'new_state': contract.current_state,
                'review_cycle': contract.review_cycle_count,
                'changes_summary': changes_summary,
                'next_step': 'El administrador revisará los cambios y aprobará o solicitará más correcciones'
            }, status=status.HTTP_200_OK)

        except ValidationError as e:
            return Response(
                {'error': str(e), 'code': 'VALIDATION_ERROR'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error resubmitting contract for admin review: {e}")
            return Response(
                {
                    'error': 'Error interno al re-enviar el contrato',
                    'code': 'INTERNAL_ERROR',
                    'details': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='circular_workflow_status')
    def circular_workflow_status(self, request, pk=None):
        """
        🔄 FLUJO CIRCULAR: Obtener estado detallado del ciclo de revisiones.

        Este endpoint proporciona información completa sobre el estado actual
        del contrato en el flujo circular de revisiones.

        Returns:
            - Estado actual del contrato
            - Número de ciclos de revisión
            - Notas de devolución del arrendatario (si aplica)
            - Historial de ciclos
            - Información de bloqueo (si está bloqueado)
        """
        contract = self.get_object()

        # Obtener historial de eventos circulares
        circular_events = []
        workflow_history = contract.workflow_history or []

        for event in workflow_history:
            event_type = event.get('event_type', '')
            if event_type in [
                'TENANT_RETURN', 'LANDLORD_START_CORRECTION',
                'RESUBMIT_FOR_ADMIN_REVIEW', 'SPECIFIC_CONCERNS_ADDED',
                'DETAILED_CHANGES_ADDED'
            ]:
                circular_events.append(event)

        # Determinar siguiente acción recomendada
        next_action = None
        if contract.current_state == 'TENANT_RETURNED':
            next_action = {
                'action': 'start_correction',
                'description': 'Iniciar corrección del contrato',
                'endpoint': f'/api/v1/contracts/landlord/{contract.id}/start_correction/'
            }
        elif contract.current_state == 'LANDLORD_CORRECTING':
            next_action = {
                'action': 'resubmit_for_admin_review',
                'description': 'Re-enviar contrato corregido para revisión',
                'endpoint': f'/api/v1/contracts/landlord/{contract.id}/resubmit_for_admin_review/'
            }
        elif contract.current_state == 'RE_PENDING_ADMIN':
            next_action = {
                'action': 'wait_for_admin',
                'description': 'Esperando revisión del administrador'
            }

        return Response({
            'contract_id': str(contract.id),
            'contract_number': contract.contract_number,
            'current_state': contract.current_state,
            'review_cycle_count': contract.review_cycle_count,
            'is_locked': contract.is_locked,
            'is_editable': contract.is_editable(),
            'locked_info': {
                'locked_at': contract.locked_at.isoformat() if contract.locked_at else None,
                'locked_reason': contract.locked_reason,
                'locked_by': contract.locked_by.email if contract.locked_by else None
            } if contract.is_locked else None,
            'tenant_return_info': {
                'notes': contract.tenant_return_notes,
                'last_return_date': contract.last_return_date.isoformat() if contract.last_return_date else None
            } if contract.tenant_return_notes else None,
            'circular_events_count': len(circular_events),
            'circular_events': circular_events[-10:],  # Últimos 10 eventos
            'next_action': next_action,
            'workflow_flow': [
                'PENDING_ADMIN_REVIEW → Admin aprueba → DRAFT',
                'DRAFT → Tenant revisa → puede TENANT_RETURNED',
                'TENANT_RETURNED → Landlord corrige → LANDLORD_CORRECTING',
                'LANDLORD_CORRECTING → Re-envía → RE_PENDING_ADMIN',
                'RE_PENDING_ADMIN → Admin re-revisa → DRAFT (ciclo continúa)',
                'POST-BIOMÉTRICO → 🔒 INMUTABLE'
            ]
        }, status=status.HTTP_200_OK)


class ContractObjectionViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de objeciones de contratos."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = ContractObjectionSerializer
    
    def get_queryset(self):
        """Filtrar objeciones donde el usuario es parte del contrato."""
        return ContractObjection.objects.filter(
            Q(contract__landlord=self.request.user) | 
            Q(contract__tenant=self.request.user)
        ).select_related(
            'contract', 'objected_by', 'responded_by'
        )


class ContractGuaranteeViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de garantías de contratos."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = LandlordContractGuaranteeSerializer
    
    def get_queryset(self):
        """Filtrar garantías donde el usuario es parte del contrato."""
        return LandlordContractGuarantee.objects.filter(
            Q(contract__landlord=self.request.user) | 
            Q(contract__tenant=self.request.user)
        ).select_related('contract')


class ContractWorkflowHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para consultar historial de workflow."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = ContractWorkflowHistorySerializer
    
    def get_queryset(self):
        """Filtrar historial donde el usuario es parte del contrato."""
        return ContractWorkflowHistory.objects.filter(
            Q(contract__landlord=self.request.user) | 
            Q(contract__tenant=self.request.user)
        ).select_related(
            'contract', 'performed_by', 'related_objection', 'related_guarantee'
        ).order_by('-timestamp')


# ========================================
# VIEWSET: CONTRACT MODIFICATION REQUESTS
# ========================================

class ContractModificationRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet completo para gestión de solicitudes de modificación de contratos.

    Endpoints:
    - POST /contracts/{contract_id}/modification-requests/ - Crear solicitud (tenant)
    - GET /contracts/{contract_id}/modification-requests/ - Listar solicitudes del contrato
    - GET /modification-requests/ - Listar todas las solicitudes del usuario
    - GET /modification-requests/{id}/ - Detalles de una solicitud
    - POST /modification-requests/{id}/respond/ - Aprobar o rechazar (landlord)
    - POST /modification-requests/{id}/mark-implemented/ - Marcar como implementada (landlord)
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['reason', 'landlord_response']
    ordering_fields = ['created_at', 'updated_at', 'revision_number']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """Selecciona el serializer según la acción."""
        if self.action == 'create':
            return ContractModificationRequestCreateSerializer
        elif self.action == 'respond':
            return ContractModificationRequestResponseSerializer
        return ContractModificationRequestSerializer

    def get_queryset(self):
        """Filtrar solicitudes donde el usuario es parte del contrato."""
        queryset = ContractModificationRequest.objects.filter(
            Q(contract__landlord=self.request.user) |
            Q(contract__tenant=self.request.user)
        ).select_related(
            'contract', 'requested_by'
        ).prefetch_related(
            'contract__landlord', 'contract__tenant'
        )

        # Filtrar por contrato si se proporciona
        contract_id = self.request.query_params.get('contract_id')
        if contract_id:
            queryset = queryset.filter(contract__id=contract_id)

        # Filtrar por estado
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())

        return queryset

    def perform_create(self, serializer):
        """
        Sobrescribir perform_create para enviar email al arrendador
        cuando un arrendatario crea una solicitud de modificación.
        """
        # Guardar la solicitud de modificación
        modification_request = serializer.save()

        # Enviar notificación por email al arrendador
        try:
            landlord_email = modification_request.contract.landlord.email
            ModificationNotificationService.send_modification_request_notification(
                modification_request=modification_request,
                contract=modification_request.contract,
                landlord_email=landlord_email
            )
            logger.info(
                f"📧 Email de solicitud de modificación enviado a {landlord_email} "
                f"para contrato {modification_request.contract.contract_number}"
            )
        except Exception as e:
            # No fallar la creación si el email falla, solo loguear
            logger.error(
                f"❌ Error enviando email de solicitud de modificación: {str(e)}"
            )

    @action(detail=True, methods=['post'], url_path='respond')
    def respond(self, request, pk=None):
        """
        Endpoint para que el arrendador responda a una solicitud de modificación.

        Body:
        {
            "action": "approve" | "reject",
            "landlord_response": "Comentarios del arrendador"
        }
        """
        modification_request = self.get_object()

        # Verificar que el usuario sea el arrendador
        if modification_request.contract.landlord != request.user:
            return Response(
                {'detail': 'Solo el arrendador puede responder a solicitudes de modificación.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificar que la solicitud esté pendiente
        if modification_request.status != 'PENDING':
            return Response(
                {'detail': f'Esta solicitud ya fue {modification_request.get_status_display()}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Serializar y validar la respuesta
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Procesar la respuesta
        try:
            with transaction.atomic():
                serializer.save(modification_request)

                # Registrar en historial de workflow
                action_type = 'approve' if serializer.validated_data['action'] == 'approve' else 'reject'
                ContractWorkflowHistory.objects.create(
                    contract=modification_request.contract,
                    action=f'modification_request_{action_type}',
                    performed_by=request.user,
                    from_state=modification_request.contract.workflow_status,
                    to_state=modification_request.contract.workflow_status,
                    notes=serializer.validated_data.get('landlord_response', '')
                )

            # Enviar notificación por email al arrendatario
            try:
                tenant_email = modification_request.contract.tenant.email
                approved = (serializer.validated_data['action'] == 'approve')
                landlord_response = serializer.validated_data.get('landlord_response', '')

                ModificationNotificationService.send_modification_response_notification(
                    modification_request=modification_request,
                    contract=modification_request.contract,
                    tenant_email=tenant_email,
                    approved=approved,
                    landlord_response=landlord_response
                )
                logger.info(
                    f"📧 Email de respuesta de modificación enviado a {tenant_email} "
                    f"para contrato {modification_request.contract.contract_number} - "
                    f"Estado: {'Aprobada' if approved else 'Rechazada'}"
                )
            except Exception as e:
                # No fallar la operación si el email falla, solo loguear
                logger.error(
                    f"❌ Error enviando email de respuesta de modificación: {str(e)}"
                )

            # Retornar solicitud actualizada
            response_serializer = ContractModificationRequestSerializer(modification_request)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error al procesar respuesta de modificación: {str(e)}")
            return Response(
                {'detail': f'Error al procesar la respuesta: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='mark-implemented')
    def mark_implemented(self, request, pk=None):
        """
        Endpoint para que el arrendador marque la modificación como implementada.

        Esto ocurre cuando el arrendador termina de editar el contrato
        con los cambios solicitados.
        """
        modification_request = self.get_object()

        # Verificar que el usuario sea el arrendador
        if modification_request.contract.landlord != request.user:
            return Response(
                {'detail': 'Solo el arrendador puede marcar modificaciones como implementadas.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificar que la solicitud esté aceptada
        if modification_request.status != 'ACCEPTED':
            return Response(
                {'detail': 'Solo se pueden marcar como implementadas solicitudes aceptadas.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                modification_request.mark_as_implemented()

                # Registrar en historial
                ContractWorkflowHistory.objects.create(
                    contract=modification_request.contract,
                    action='modification_implemented',
                    performed_by=request.user,
                    from_state='UNDER_MODIFICATION',
                    to_state='TENANT_REVIEWING',
                    notes=f'Modificación #{modification_request.revision_number} implementada'
                )

            # Enviar notificación por email al arrendatario
            try:
                tenant_email = modification_request.contract.tenant.email

                ModificationNotificationService.send_modification_implemented_notification(
                    modification_request=modification_request,
                    contract=modification_request.contract,
                    tenant_email=tenant_email
                )
                logger.info(
                    f"📧 Email de modificación implementada enviado a {tenant_email} "
                    f"para contrato {modification_request.contract.contract_number}"
                )
            except Exception as e:
                # No fallar la operación si el email falla, solo loguear
                logger.error(
                    f"❌ Error enviando email de modificación implementada: {str(e)}"
                )

            response_serializer = ContractModificationRequestSerializer(modification_request)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error al marcar modificación como implementada: {str(e)}")
            return Response(
                {'detail': f'Error al marcar como implementada: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )