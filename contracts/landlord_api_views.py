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
    ContractWorkflowHistory
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
    ContractWorkflowHistorySerializer
)
from .pdf_generator import generate_contract_pdf

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