"""
API Views para operaciones de arrendatarios en el sistema de contratos.
Implementa el lado del arrendatario en el workflow paso a paso.
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
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from .landlord_contract_models import (
    LandlordControlledContract,
    ContractObjection,
    LandlordContractGuarantee,
    ContractWorkflowHistory
)
from .landlord_contract_service import LandlordContractService
from .tenant_serializers import (
    TenantContractListSerializer,
    TenantContractDetailSerializer,
    TenantDataSerializer,
    TenantContractObjectionCreateSerializer,
    TenantContractApprovalSerializer,
    TenantContractSignatureSerializer,
    InvitationAcceptanceSerializer,
    TenantContractStatsSerializer
)

logger = logging.getLogger(__name__)


class IsTenantPermission(permissions.BasePermission):
    """Permiso para verificar que el usuario es arrendatario."""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Verificar que el usuario sea arrendatario o que tenga contratos como tenant
        return (
            (hasattr(request.user, 'profile') and 
             request.user.profile.user_type == 'tenant') or
            LandlordControlledContract.objects.filter(tenant=request.user).exists()
        )


class TenantContractViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para operaciones de contratos desde la perspectiva del arrendatario.
    Los arrendatarios no pueden crear contratos, solo participar en el workflow.
    """
    
    permission_classes = [IsAuthenticated, IsTenantPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['current_state', 'published', 'tenant_approved']
    search_fields = ['contract_number', 'landlord__email', 'property__title']
    ordering_fields = ['created_at', 'updated_at', 'monthly_rent']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filtrar contratos donde el usuario es arrendatario o fue invitado."""
        return LandlordControlledContract.objects.filter(
            Q(tenant=self.request.user) | Q(tenant_email=self.request.user.email)
        ).select_related(
            'landlord', 'tenant', 'property'
        ).prefetch_related(
            'objections', 'guarantees', 'history_entries'
        )
    
    def get_serializer_class(self):
        """Seleccionar serializer según la acción."""
        if self.action == 'list':
            return TenantContractListSerializer
        else:
            return TenantContractDetailSerializer
    
    @action(detail=False, methods=['post'])
    def accept_invitation(self, request):
        """
        Aceptar invitación de contrato usando token (Paso 4 del workflow).
        """
        serializer = InvitationAcceptanceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = LandlordContractService()
            contract = service.accept_tenant_invitation(
                invitation_token=serializer.validated_data['invitation_token'],
                tenant=request.user
            )
            
            return Response(
                TenantContractDetailSerializer(contract).data,
                status=status.HTTP_200_OK
            )
            
        except (ValidationError, PermissionDenied) as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def complete_tenant_data(self, request, pk=None):
        """
        Completar datos del arrendatario (Paso 5 del workflow).
        """
        contract = self.get_object()
        
        # Verificar que el usuario sea el arrendatario
        if contract.tenant != request.user:
            return Response(
                {'error': 'No tienes permisos para completar datos en este contrato'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if contract.current_state != 'TENANT_REVIEWING':
            return Response(
                {'error': f'No se pueden completar datos en estado {contract.current_state}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = TenantDataSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = LandlordContractService()
            updated_contract = service.complete_tenant_data(
                contract_id=contract.id,
                tenant=request.user,
                tenant_data=serializer.validated_data
            )
            
            return Response(
                TenantContractDetailSerializer(updated_contract).data,
                status=status.HTTP_200_OK
            )
            
        except (ValidationError, PermissionDenied) as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def create_objection(self, request, pk=None):
        """
        Crear objeción a algún término del contrato como arrendatario.
        """
        contract = self.get_object()
        
        if contract.tenant != request.user:
            return Response(
                {'error': 'No tienes permisos para objetar en este contrato'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if contract.current_state not in ['LANDLORD_REVIEWING', 'TENANT_REVIEWING', 'OBJECTIONS_PENDING']:
            return Response(
                {'error': 'No se pueden crear objeciones en el estado actual'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = TenantContractObjectionCreateSerializer(data=request.data)
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
            
            from .landlord_contract_serializers import ContractObjectionSerializer
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
        Responder a una objeción presentada por el arrendador.
        """
        contract = self.get_object()
        
        if contract.tenant != request.user:
            return Response(
                {'error': 'No tienes permisos para responder objeciones en este contrato'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        objection_id = request.data.get('objection_id')
        if not objection_id:
            return Response(
                {'error': 'objection_id es requerido'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from .landlord_contract_serializers import ContractObjectionResponseSerializer
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
            
            from .landlord_contract_serializers import ContractObjectionSerializer
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
        Aprobar el contrato final por parte del arrendatario.
        """
        contract = self.get_object()
        
        if contract.tenant != request.user:
            return Response(
                {'error': 'No tienes permisos para aprobar este contrato'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if contract.current_state != 'BOTH_REVIEWING':
            return Response(
                {'error': 'El contrato no está listo para aprobación'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = TenantContractApprovalSerializer(data=request.data)
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
            
            return Response(
                TenantContractDetailSerializer(updated_contract).data, 
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
        Firmar digitalmente el contrato por parte del arrendatario.
        """
        contract = self.get_object()
        
        if contract.tenant != request.user:
            return Response(
                {'error': 'No tienes permisos para firmar este contrato'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if contract.current_state != 'READY_TO_SIGN':
            return Response(
                {'error': 'El contrato no está listo para firmar'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = TenantContractSignatureSerializer(data=request.data)
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
                TenantContractDetailSerializer(updated_contract).data, 
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
        Listar todas las objeciones del contrato (vista del arrendatario).
        """
        contract = self.get_object()
        
        if contract.tenant != request.user:
            return Response(
                {'error': 'No tienes permisos para ver objeciones de este contrato'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        objections = contract.objections.order_by('-submitted_at')
        
        # Filtros opcionales
        status_filter = request.query_params.get('status')
        if status_filter:
            objections = objections.filter(status=status_filter)
        
        priority_filter = request.query_params.get('priority')
        if priority_filter:
            objections = objections.filter(priority=priority_filter)
        
        from .landlord_contract_serializers import ContractObjectionSerializer
        serializer = ContractObjectionSerializer(objections, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Obtener historial del workflow del contrato (vista del arrendatario).
        """
        contract = self.get_object()
        
        if contract.tenant != request.user:
            return Response(
                {'error': 'No tienes permisos para ver el historial de este contrato'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        history = contract.history_entries.order_by('-timestamp')
        
        # Paginación simple
        limit = int(request.query_params.get('limit', 50))
        offset = int(request.query_params.get('offset', 0))
        
        history_page = history[offset:offset + limit]
        
        from .landlord_contract_serializers import ContractWorkflowHistorySerializer
        serializer = ContractWorkflowHistorySerializer(history_page, many=True)
        
        return Response({
            'count': history.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Estadísticas de contratos del arrendatario.
        """
        queryset = self.get_queryset()
        
        # Estadísticas básicas del arrendatario
        total_contracts = queryset.count()
        active_contracts = queryset.filter(
            published=True, 
            current_state='PUBLISHED'
        ).count()
        
        completed_contracts = queryset.filter(
            current_state__in=['TERMINATED', 'EXPIRED']
        ).count()
        
        pending_approval = queryset.filter(
            current_state='BOTH_REVIEWING',
            tenant_approved=False
        ).count()
        
        pending_signature = queryset.filter(
            current_state='READY_TO_SIGN',
            tenant_signed=False
        ).count()
        
        waiting_for_landlord = queryset.filter(
            current_state__in=[
                'LANDLORD_REVIEWING', 
                'OBJECTIONS_PENDING'
            ]
        ).count()
        
        # Gastos mensuales en rentas
        monthly_rent_expenses = queryset.filter(
            published=True
        ).aggregate(
            total=models.Sum('monthly_rent')
        )['total'] or Decimal('0.00')
        
        # Promedio de tiempo desde invitación hasta firma
        signed_contracts = queryset.filter(
            tenant_signed_at__isnull=False,
            invitation_expires_at__isnull=False
        ).annotate(
            days_to_sign=models.ExpressionWrapper(
                models.F('tenant_signed_at') - models.F('created_at'),
                output_field=models.DurationField()
            )
        )
        
        avg_days_to_sign = signed_contracts.aggregate(
            avg_days=Avg('days_to_sign')
        )['avg_days']
        
        avg_signing_days = (
            avg_days_to_sign.days if avg_days_to_sign else 0
        )
        
        # Objeciones del arrendatario
        tenant_objections = ContractObjection.objects.filter(
            contract__tenant=request.user,
            objected_by=request.user
        )
        
        total_objections_made = tenant_objections.count()
        accepted_objections = tenant_objections.filter(status='ACCEPTED').count()
        rejected_objections = tenant_objections.filter(status='REJECTED').count()
        
        # Desglose por estado
        state_breakdown = dict(
            queryset.values('current_state').annotate(
                count=Count('id')
            ).values_list('current_state', 'count')
        )
        
        # Contratos por tipo de propiedad
        property_types = dict(
            queryset.filter(
                property__isnull=False
            ).values('property__property_type').annotate(
                count=Count('id')
            ).values_list('property__property_type', 'count')
        )
        
        stats_data = {
            'total_contracts': total_contracts,
            'active_contracts': active_contracts,
            'completed_contracts': completed_contracts,
            'pending_approval': pending_approval,
            'pending_signature': pending_signature,
            'waiting_for_landlord': waiting_for_landlord,
            'monthly_rent_expenses': monthly_rent_expenses,
            'average_signing_days': avg_signing_days,
            'total_objections_made': total_objections_made,
            'accepted_objections': accepted_objections,
            'rejected_objections': rejected_objections,
            'objection_success_rate': (
                (accepted_objections / total_objections_made * 100) 
                if total_objections_made > 0 else 0
            ),
            'state_breakdown': state_breakdown,
            'property_types': property_types
        }
        
        serializer = TenantContractStatsSerializer(stats_data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def contract_preview(self, request, pk=None):
        """
        Vista previa del contrato generado con todos los datos.
        Solo disponible cuando ambas partes han completado sus datos.
        """
        contract = self.get_object()
        
        if contract.tenant != request.user:
            return Response(
                {'error': 'No tienes permisos para ver este contrato'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if contract.current_state not in [
            'BOTH_REVIEWING', 'READY_TO_SIGN', 'FULLY_SIGNED', 'PUBLISHED'
        ]:
            return Response(
                {'error': 'El contrato no está listo para vista previa'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = LandlordContractService()
            contract_content = service.generate_contract_content(contract)
            
            return Response({
                'contract_content': contract_content,
                'contract_data': TenantContractDetailSerializer(contract).data,
                'can_sign': contract.current_state == 'READY_TO_SIGN',
                'is_published': contract.published
            })
            
        except Exception as e:
            logger.error(f"Error generating contract preview: {e}")
            return Response(
                {'error': 'Error generando vista previa del contrato'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def pending_invitations(self, request):
        """
        Listar invitaciones pendientes para el arrendatario.
        """
        pending_contracts = LandlordControlledContract.objects.filter(
            tenant_email=request.user.email,
            current_state='TENANT_INVITED',
            invitation_expires_at__gt=timezone.now()
        ).select_related('landlord', 'property')
        
        serializer = TenantContractListSerializer(pending_contracts, many=True)
        return Response(serializer.data)


class TenantDashboardView(viewsets.GenericViewSet):
    """
    ViewSet específico para el dashboard del arrendatario.
    Proporciona vistas agregadas y resúmenes.
    """
    
    permission_classes = [IsAuthenticated, IsTenantPermission]
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """
        Vista general del dashboard del arrendatario.
        """
        user_contracts = LandlordControlledContract.objects.filter(
            Q(tenant=request.user) | Q(tenant_email=request.user.email)
        )
        
        # Contratos activos
        active_contracts = user_contracts.filter(
            published=True,
            current_state='PUBLISHED'
        ).select_related('property', 'landlord')
        
        # Acciones pendientes
        pending_actions = []
        
        # Invitaciones pendientes
        pending_invitations = user_contracts.filter(
            current_state='TENANT_INVITED',
            invitation_expires_at__gt=timezone.now()
        ).count()
        if pending_invitations > 0:
            pending_actions.append({
                'type': 'invitation',
                'count': pending_invitations,
                'message': f'{pending_invitations} invitación(es) pendiente(s)',
                'action_url': '/tenant/contracts/pending-invitations/'
            })
        
        # Datos por completar
        pending_data = user_contracts.filter(
            current_state='TENANT_REVIEWING',
            tenant=request.user
        ).count()
        if pending_data > 0:
            pending_actions.append({
                'type': 'complete_data',
                'count': pending_data,
                'message': f'{pending_data} contrato(s) esperando tus datos',
                'action_url': '/tenant/contracts/?current_state=TENANT_REVIEWING'
            })
        
        # Aprobaciones pendientes
        pending_approvals = user_contracts.filter(
            current_state='BOTH_REVIEWING',
            tenant_approved=False,
            tenant=request.user
        ).count()
        if pending_approvals > 0:
            pending_actions.append({
                'type': 'approval',
                'count': pending_approvals,
                'message': f'{pending_approvals} contrato(s) esperando tu aprobación',
                'action_url': '/tenant/contracts/?current_state=BOTH_REVIEWING'
            })
        
        # Firmas pendientes
        pending_signatures = user_contracts.filter(
            current_state='READY_TO_SIGN',
            tenant_signed=False,
            tenant=request.user
        ).count()
        if pending_signatures > 0:
            pending_actions.append({
                'type': 'signature',
                'count': pending_signatures,
                'message': f'{pending_signatures} contrato(s) esperando tu firma',
                'action_url': '/tenant/contracts/?current_state=READY_TO_SIGN'
            })
        
        # Próximos vencimientos
        upcoming_expirations = active_contracts.filter(
            end_date__lte=timezone.now().date() + timedelta(days=60),
            end_date__gte=timezone.now().date()
        )
        
        return Response({
            'active_contracts_count': active_contracts.count(),
            'total_monthly_rent': active_contracts.aggregate(
                total=models.Sum('monthly_rent')
            )['total'] or 0,
            'pending_actions': pending_actions,
            'upcoming_expirations': TenantContractListSerializer(
                upcoming_expirations, many=True
            ).data,
            'recent_activity': self._get_recent_activity(request.user)
        })
    
    def _get_recent_activity(self, user):
        """Obtener actividad reciente del arrendatario."""
        recent_history = ContractWorkflowHistory.objects.filter(
            Q(contract__tenant=user) | Q(performed_by=user)
        ).select_related(
            'contract', 'performed_by'
        ).order_by('-timestamp')[:10]
        
        from .landlord_contract_serializers import ContractWorkflowHistorySerializer
        return ContractWorkflowHistorySerializer(recent_history, many=True).data