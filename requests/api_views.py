"""
Vistas API para el sistema de solicitudes de VeriHome.
"""

from rest_framework import viewsets, generics, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count
from django.utils import timezone

from .models import (
    BaseRequest, PropertyInterestRequest, ServiceRequest,
    ContractSignatureRequest, MaintenanceRequest,
    RequestAttachment, RequestComment, RequestNotification
)
from .serializers import (
    BaseRequestSerializer, CreateBaseRequestSerializer,
    PropertyInterestRequestSerializer, CreatePropertyInterestRequestSerializer,
    ServiceRequestSerializer, CreateServiceRequestSerializer,
    ContractSignatureRequestSerializer, MaintenanceRequestSerializer,
    CreateMaintenanceRequestSerializer, RequestAttachmentSerializer,
    RequestCommentSerializer, RequestNotificationSerializer,
    RequestStatsSerializer, RequestActionSerializer
)


class BaseRequestViewSet(viewsets.ModelViewSet):
    """ViewSet base para todas las solicitudes."""
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['request_type', 'status', 'priority']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at', 'due_date']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateBaseRequestSerializer
        return BaseRequestSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = BaseRequest.objects.select_related('requester', 'assignee')
        
        # Filtrar según el rol del usuario
        if user.user_type == 'landlord':
            # Los arrendadores ven solicitudes que les han enviado y las que han creado
            queryset = queryset.filter(Q(assignee=user) | Q(requester=user))
        elif user.user_type == 'tenant':
            # Los arrendatarios ven sus solicitudes enviadas y recibidas
            queryset = queryset.filter(Q(requester=user) | Q(assignee=user))
        elif user.user_type == 'service_provider':
            # Los prestadores de servicio ven solicitudes de servicio
            queryset = queryset.filter(Q(assignee=user) | Q(requester=user))
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def perform_action(self, request, pk=None):
        """Realiza acciones en una solicitud."""
        request_obj = self.get_object()
        serializer = RequestActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action_type = serializer.validated_data['action']
        message = serializer.validated_data.get('message', '')
        
        # Verificar permisos
        if action_type in ['accept', 'reject', 'complete'] and request.user != request_obj.assignee:
            return Response(
                {'error': 'Solo el asignado puede realizar esta acción'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Realizar la acción
        if action_type == 'accept':
            request_obj.status = 'in_progress'
            request_obj.response_message = message
            request_obj.response_date = timezone.now()
        elif action_type == 'reject':
            request_obj.status = 'rejected'
            request_obj.response_message = message
            request_obj.response_date = timezone.now()
        elif action_type == 'complete':
            request_obj.status = 'completed'
            request_obj.completed_at = timezone.now()
            request_obj.response_message = message
        elif action_type == 'cancel':
            request_obj.status = 'cancelled'
        
        request_obj.save()
        
        # Crear comentario si hay mensaje
        if message:
            RequestComment.objects.create(
                request=request_obj,
                author=request.user,
                content=message
            )
        
        return Response({
            'message': f'Solicitud {action_type} exitosamente',
            'status': request_obj.status
        })
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Estadísticas para el dashboard."""
        user = request.user
        queryset = self.get_queryset()
        
        stats = {
            'total_requests': queryset.count(),
            'pending_requests': queryset.filter(status='pending').count(),
            'in_progress_requests': queryset.filter(status='in_progress').count(),
            'completed_requests': queryset.filter(status='completed').count(),
            'overdue_requests': queryset.filter(
                due_date__lt=timezone.now(),
                status__in=['pending', 'in_progress']
            ).count(),
        }
        
        # Estadísticas por tipo
        by_type = queryset.values('request_type').annotate(count=Count('id'))
        stats['by_type'] = {item['request_type']: item['count'] for item in by_type}
        
        # Estadísticas por prioridad
        by_priority = queryset.values('priority').annotate(count=Count('id'))
        stats['by_priority'] = {item['priority']: item['count'] for item in by_priority}
        
        # Actividad reciente
        recent_activity = queryset.order_by('-updated_at')[:5]
        stats['recent_activity'] = BaseRequestSerializer(recent_activity, many=True).data
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def my_sent_requests(self, request):
        """Solicitudes enviadas por el usuario."""
        queryset = self.get_queryset().filter(requester=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_received_requests(self, request):
        """Solicitudes recibidas por el usuario."""
        queryset = self.get_queryset().filter(assignee=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class PropertyInterestRequestViewSet(viewsets.ModelViewSet):
    """ViewSet para solicitudes de interés en propiedades."""
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'property', 'has_pets', 'employment_type']
    search_fields = ['title', 'description', 'property__title']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreatePropertyInterestRequestSerializer
        return PropertyInterestRequestSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = PropertyInterestRequest.objects.select_related(
            'requester', 'assignee', 'property'
        )
        
        if user.user_type == 'landlord':
            # Arrendadores ven intereses en sus propiedades
            queryset = queryset.filter(property__landlord=user)
        elif user.user_type == 'tenant':
            # Arrendatarios ven sus intereses enviados
            queryset = queryset.filter(requester=user)
        
        return queryset


class ServiceRequestViewSet(viewsets.ModelViewSet):
    """ViewSet para solicitudes de servicio."""
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'service_category', 'urgency_level', 'property']
    search_fields = ['title', 'description', 'service_category']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateServiceRequestSerializer
        return ServiceRequestSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = ServiceRequest.objects.select_related(
            'requester', 'assignee', 'property'
        )
        
        if user.user_type == 'landlord':
            # Arrendadores ven servicios de sus propiedades y los que han solicitado
            queryset = queryset.filter(Q(property__landlord=user) | Q(requester=user))
        elif user.user_type == 'service_provider':
            # Prestadores ven servicios asignados a ellos
            queryset = queryset.filter(assignee=user)
        elif user.user_type == 'tenant':
            # Arrendatarios ven servicios que han solicitado
            queryset = queryset.filter(requester=user)
        
        return queryset


class ContractSignatureRequestViewSet(viewsets.ModelViewSet):
    """ViewSet para solicitudes de firma de contrato."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ContractSignatureRequestSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'landlord_signed', 'tenant_signed']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        queryset = ContractSignatureRequest.objects.select_related(
            'requester', 'assignee', 'contract'
        )
        
        # Usuarios ven solicitudes donde están involucrados
        return queryset.filter(Q(requester=user) | Q(assignee=user))
    
    @action(detail=True, methods=['post'])
    def sign_contract(self, request, pk=None):
        """Firmar un contrato."""
        contract_request = self.get_object()
        user = request.user
        
        if user.user_type == 'landlord' and not contract_request.landlord_signed:
            contract_request.landlord_signed = True
            contract_request.landlord_signature_date = timezone.now()
        elif user.user_type == 'tenant' and not contract_request.tenant_signed:
            contract_request.tenant_signed = True
            contract_request.tenant_signature_date = timezone.now()
        else:
            return Response(
                {'error': 'No tienes permisos para firmar o ya has firmado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Si ambos han firmado, completar la solicitud
        if contract_request.landlord_signed and contract_request.tenant_signed:
            contract_request.status = 'completed'
            contract_request.completed_at = timezone.now()
        
        contract_request.save()
        
        return Response({
            'message': 'Contrato firmado exitosamente',
            'landlord_signed': contract_request.landlord_signed,
            'tenant_signed': contract_request.tenant_signed,
            'status': contract_request.status
        })


class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    """ViewSet para solicitudes de mantenimiento."""
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'maintenance_type', 'priority', 'property']
    search_fields = ['title', 'affected_area', 'issue_description']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateMaintenanceRequestSerializer
        return MaintenanceRequestSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = MaintenanceRequest.objects.select_related(
            'requester', 'assignee', 'property'
        )
        
        if user.user_type == 'landlord':
            # Arrendadores ven mantenimiento de sus propiedades
            queryset = queryset.filter(Q(property__landlord=user) | Q(requester=user))
        elif user.user_type == 'tenant':
            # Arrendatarios ven mantenimiento que han solicitado
            queryset = queryset.filter(requester=user)
        elif user.user_type == 'service_provider':
            # Prestadores ven mantenimiento asignado a ellos
            queryset = queryset.filter(assignee=user)
        
        return queryset


class RequestNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para notificaciones de solicitudes."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RequestNotificationSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['notification_type', 'is_read']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return RequestNotification.objects.filter(recipient=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Marcar notificación como leída."""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'message': 'Notificación marcada como leída'})
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Marcar todas las notificaciones como leídas."""
        notifications = self.get_queryset().filter(is_read=False)
        count = notifications.count()
        notifications.update(is_read=True, read_at=timezone.now())
        return Response({'message': f'{count} notificaciones marcadas como leídas'})


class RequestCommentViewSet(viewsets.ModelViewSet):
    """ViewSet para comentarios de solicitudes."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RequestCommentSerializer
    
    def get_queryset(self):
        request_id = self.kwargs.get('request_pk')
        return RequestComment.objects.filter(
            request_id=request_id
        ).select_related('author')
    
    def perform_create(self, serializer):
        request_id = self.kwargs.get('request_pk')
        serializer.save(
            author=self.request.user,
            request_id=request_id
        )