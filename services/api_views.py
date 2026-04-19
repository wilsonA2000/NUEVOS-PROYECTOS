"""
Vistas API para el sistema de servicios adicionales.
"""

from rest_framework import viewsets, generics, status, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from .models import ServiceCategory, Service, ServiceRequest, SubscriptionPlan, ServiceSubscription
from .models import ServiceOrder, ServicePayment
from .serializers import (
    ServiceCategorySerializer, ServiceListSerializer, ServiceDetailSerializer,
    CreateServiceRequestSerializer, ServiceRequestSerializer, ServiceStatsSerializer,
    SubscriptionPlanSerializer, ServiceSubscriptionSerializer,
    ServiceOrderSerializer, ServicePaymentSerializer,
)


class IsActiveSubscriberOrReadOnly(permissions.BasePermission):
    """
    SVC-02: service_providers con suscripción activa pueden crear/editar
    servicios propios. Staff tiene CRUD completo. El resto solo lectura.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff:
            return True
        if getattr(request.user, 'user_type', None) != 'service_provider':
            return False
        return ServiceSubscription.objects.filter(
            service_provider=request.user,
            status='active',
        ).exists()

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_staff:
            return True
        return obj.provider_id == request.user.id


class ServiceCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para categorías de servicios."""
    queryset = ServiceCategory.objects.filter(is_active=True)
    serializer_class = ServiceCategorySerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.OrderingFilter]
    ordering = ['order', 'name']

    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Categorías destacadas."""
        featured_categories = self.get_queryset().filter(is_featured=True)
        serializer = self.get_serializer(featured_categories, many=True)
        return Response(serializer.data)


class ServiceViewSet(viewsets.ModelViewSet):
    """
    SVC-02: CRUD de servicios. Lectura pública; creación/edición solo para
    service_providers con suscripción activa. Staff CRUD completo.
    """
    queryset = Service.objects.filter(is_active=True).select_related('category', 'provider')
    permission_classes = [IsActiveSubscriberOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'pricing_type', 'difficulty', 'is_featured', 'is_most_requested', 'provider']
    search_fields = ['name', 'short_description', 'full_description']
    ordering_fields = ['name', 'popularity_score', 'views_count', 'requests_count', 'created_at']
    ordering = ['-popularity_score', '-is_featured', 'name']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ServiceDetailSerializer
        return ServiceListSerializer

    def perform_create(self, serializer):
        """SVC-001: respetar `max_active_services` del plan del prestador.

        Staff puede crear sin límite (p.ej. semillas y administración);
        prestadores reales se validan contra `ServiceSubscription.can_publish_service`.
        """
        from rest_framework.exceptions import PermissionDenied

        user = self.request.user
        if not user.is_staff:
            subscription = ServiceSubscription.objects.filter(
                service_provider=user,
                status__in=('trial', 'active'),
            ).select_related('plan').first()
            if subscription is None:
                raise PermissionDenied('Se requiere una suscripción activa para publicar servicios.')
            if not subscription.can_publish_service:
                raise PermissionDenied(
                    f'Has alcanzado el máximo de {subscription.plan.max_active_services} servicios '
                    f'activos de tu plan ({subscription.plan.name}).'
                )

        service = serializer.save(provider=user)

        # Incrementar contador de servicios publicados cuando aplica.
        if not user.is_staff:
            subscription.services_published = (subscription.services_published or 0) + 1
            subscription.save(update_fields=['services_published'])

        return service

    def perform_destroy(self, instance):
        """Al eliminar (o desactivar vía DELETE) liberar espacio del plan."""
        provider = instance.provider
        super().perform_destroy(instance)
        if provider and not provider.is_staff:
            subscription = ServiceSubscription.objects.filter(
                service_provider=provider,
                status__in=('trial', 'active'),
            ).first()
            if subscription and subscription.services_published:
                subscription.services_published = max(0, subscription.services_published - 1)
                subscription.save(update_fields=['services_published'])

    def retrieve(self, request, *args, **kwargs):
        """Obtener detalle del servicio e incrementar contador de vistas."""
        instance = self.get_object()
        instance.increment_views()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Servicios destacados."""
        featured_services = self.get_queryset().filter(is_featured=True)[:12]
        serializer = self.get_serializer(featured_services, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def most_requested(self, request):
        """Servicios más solicitados."""
        most_requested = self.get_queryset().filter(is_most_requested=True)[:10]
        serializer = self.get_serializer(most_requested, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Servicios populares por puntuación."""
        popular_services = self.get_queryset().order_by('-popularity_score')[:15]
        serializer = self.get_serializer(popular_services, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Servicios agrupados por categoría."""
        category_slug = request.query_params.get('category')
        if category_slug:
            services = self.get_queryset().filter(category__slug=category_slug)
        else:
            services = self.get_queryset()

        serializer = self.get_serializer(services, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def mine(self, request):
        """Servicios del prestador autenticado."""
        my_services = Service.objects.filter(provider=request.user).select_related('category')
        serializer = self.get_serializer(my_services, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Estadísticas generales de servicios."""
        queryset = self.get_queryset()
        
        # Estadísticas básicas
        total_services = queryset.count()
        total_categories = ServiceCategory.objects.filter(is_active=True).count()
        featured_services = queryset.filter(is_featured=True).count()
        most_requested_services = queryset.filter(is_most_requested=True).count()
        
        # Estadísticas de solicitudes
        total_requests = ServiceRequest.objects.count()
        pending_requests = ServiceRequest.objects.filter(status='pending').count()
        
        # Estadísticas por categoría
        categories_stats = list(
            ServiceCategory.objects.filter(is_active=True)
            .annotate(
                services_count=Count('services', filter=Q(services__is_active=True)),
                requests_count=Count('services__service_requests')
            )
            .values('name', 'services_count', 'requests_count')
            .order_by('-services_count')
        )
        
        # Servicios populares
        popular_services = queryset.order_by('-popularity_score')[:5]
        
        stats_data = {
            'total_services': total_services,
            'total_categories': total_categories,
            'featured_services': featured_services,
            'most_requested_services': most_requested_services,
            'total_requests': total_requests,
            'pending_requests': pending_requests,
            'categories_stats': categories_stats,
            'popular_services': popular_services,
        }
        
        serializer = ServiceStatsSerializer(stats_data)
        return Response(serializer.data)


class ServiceRequestViewSet(viewsets.ModelViewSet):
    """ViewSet para solicitudes de servicios."""
    queryset = ServiceRequest.objects.all()
    permission_classes = [AllowAny]  # En producción, ajustar permisos
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['service', 'status']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateServiceRequestSerializer
        return ServiceRequestSerializer

    def create(self, request, *args, **kwargs):
        """Crear nueva solicitud de servicio."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service_request = serializer.save()
        
        # Retornar la solicitud creada con datos completos
        response_serializer = ServiceRequestSerializer(service_request)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


# Vistas adicionales para endpoints específicos
class PopularServicesListView(generics.ListAPIView):
    """Lista de servicios populares."""
    serializer_class = ServiceListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Service.objects.filter(
            is_active=True
        ).order_by('-popularity_score')[:20]


class FeaturedServicesListView(generics.ListAPIView):
    """Lista de servicios destacados."""
    serializer_class = ServiceListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Service.objects.filter(
            is_active=True, 
            is_featured=True
        ).order_by('-popularity_score')


class MostRequestedServicesListView(generics.ListAPIView):
    """Lista de servicios más solicitados."""
    serializer_class = ServiceListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Service.objects.filter(
            is_active=True, 
            is_most_requested=True
        ).order_by('-requests_count')


class ServicesByCategoryListView(generics.ListAPIView):
    """Lista de servicios por categoría."""
    serializer_class = ServiceListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        category_slug = self.kwargs.get('category_slug')
        return Service.objects.filter(
            is_active=True,
            category__slug=category_slug,
            category__is_active=True
        ).order_by('-popularity_score')


class ServiceSearchView(generics.ListAPIView):
    """Búsqueda de servicios."""
    serializer_class = ServiceListSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'short_description', 'full_description', 'category__name']
    filterset_fields = ['category', 'pricing_type', 'difficulty']

    def get_queryset(self):
        return Service.objects.filter(is_active=True).select_related('category')


# ══════════════════════════════════════════════════════════════
# SISTEMA DE SUSCRIPCIONES
# ══════════════════════════════════════════════════════════════

class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Planes de suscripción disponibles. Público (solo lectura).
    """
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [AllowAny]
    queryset = SubscriptionPlan.objects.filter(is_active=True)


class ServiceSubscriptionViewSet(viewsets.ModelViewSet):
    """
    Gestión de suscripciones. Solo el prestador de servicios ve la suya.
    Staff ve todas.
    """
    serializer_class = ServiceSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return ServiceSubscription.objects.select_related('plan', 'service_provider').all()
        return ServiceSubscription.objects.filter(service_provider=self.request.user).select_related('plan')

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Obtener suscripción activa del usuario actual."""
        try:
            sub = ServiceSubscription.objects.get(
                service_provider=request.user,
                status__in=['trial', 'active'],
            )
            return Response(ServiceSubscriptionSerializer(sub).data)
        except ServiceSubscription.DoesNotExist:
            return Response({'detail': 'No tiene suscripción activa'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def subscribe(self, request):
        """Suscribirse a un plan.

        El modelo `ServiceSubscription` es OneToOne por proveedor. Si el
        proveedor ya tiene una suscripción en estado no-activo (cancelled,
        expired, etc.), reactivamos la existente en lugar de crear otra
        (la OneToOne prohíbe duplicados).
        """
        plan_id = request.data.get('plan_id')
        if not plan_id:
            return Response({'error': 'plan_id es obligatorio'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Plan no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        # Verificar que no tenga suscripción activa
        existing_active = ServiceSubscription.objects.filter(
            service_provider=request.user,
            status__in=['trial', 'active'],
        ).first()
        if existing_active:
            return Response({'error': 'Ya tiene una suscripción activa. Cancele primero para cambiar de plan.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        # Calcular duración según ciclo
        if plan.billing_cycle == 'monthly':
            end_date = now + timedelta(days=30)
        elif plan.billing_cycle == 'quarterly':
            end_date = now + timedelta(days=90)
        else:
            end_date = now + timedelta(days=365)

        defaults = {
            'plan': plan,
            'status': 'trial',
            'start_date': now,
            'end_date': end_date,
            'trial_end_date': now + timedelta(days=7),
            'next_billing_date': (now + timedelta(days=7)).date(),
            'auto_renew': True,
            'cancelled_at': None,
            'cancellation_reason': '',
        }
        sub, created = ServiceSubscription.objects.update_or_create(
            service_provider=request.user,
            defaults=defaults,
        )
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(ServiceSubscriptionSerializer(sub).data, status=response_status)

    @action(detail=False, methods=['post'])
    def cancel(self, request):
        """Cancelar suscripción activa."""
        reason = request.data.get('reason', '')
        try:
            sub = ServiceSubscription.objects.get(
                service_provider=request.user,
                status__in=['trial', 'active'],
            )
        except ServiceSubscription.DoesNotExist:
            return Response({'error': 'No tiene suscripción activa'}, status=status.HTTP_404_NOT_FOUND)

        sub.status = 'cancelled'
        sub.cancelled_at = timezone.now()
        sub.cancellation_reason = reason
        sub.auto_renew = False
        sub.save(update_fields=['status', 'cancelled_at', 'cancellation_reason', 'auto_renew', 'updated_at'])
        return Response(ServiceSubscriptionSerializer(sub).data)

    @action(detail=False, methods=['post'])
    def upgrade(self, request):
        """Cambiar a un plan superior."""
        plan_id = request.data.get('plan_id')
        if not plan_id:
            return Response({'error': 'plan_id es obligatorio'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Plan no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        try:
            sub = ServiceSubscription.objects.get(
                service_provider=request.user,
                status__in=['trial', 'active'],
            )
        except ServiceSubscription.DoesNotExist:
            return Response({'error': 'No tiene suscripción activa'}, status=status.HTTP_404_NOT_FOUND)

        sub.plan = new_plan
        sub.save(update_fields=['plan', 'updated_at'])
        return Response(ServiceSubscriptionSerializer(sub).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Estadísticas de suscripciones (solo staff)."""
        if not request.user.is_staff:
            return Response({'error': 'Solo staff'}, status=status.HTTP_403_FORBIDDEN)
        total = ServiceSubscription.objects.count()
        active = ServiceSubscription.objects.filter(status__in=['trial', 'active']).count()
        by_plan = dict(
            ServiceSubscription.objects.filter(status__in=['trial', 'active'])
            .values_list('plan__name')
            .annotate(c=Count('id'))
            .values_list('plan__name', 'c')
        )
        return Response({
            'total_subscriptions': total,
            'active_subscriptions': active,
            'by_plan': by_plan,
        })


class ServiceOrderViewSet(viewsets.ModelViewSet):
    """T2.2 · ViewSet de órdenes de servicio prestador↔cliente.

    - El prestador crea órdenes en estado 'draft' o 'sent'.
    - El cliente las acepta o rechaza (acciones accept / reject).
    - Cuando se acepta, se crea automáticamente una PaymentOrder enlazada
      (consecutivo PO-YYYY-NNNNNNNN) que el cliente puede pagar vía pasarela.
    - Validación: el prestador debe tener suscripción activa para crear.

    Permisos por rol:
    - admin/staff: ve todas
    - provider: ve órdenes que emitió
    - client (landlord/tenant): ve órdenes recibidas
    """
    serializer_class = ServiceOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ServiceOrder.objects.select_related(
            'provider', 'client', 'service', 'payment_order',
        ).prefetch_related('payments')
        if user.is_staff or user.is_superuser:
            return qs
        return qs.filter(Q(provider=user) | Q(client=user))

    def perform_create(self, serializer):
        # Validar suscripción activa del prestador
        provider = self.request.user
        if provider.user_type != 'service_provider':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Solo prestadores pueden crear órdenes de servicio.')
        sub = ServiceSubscription.objects.filter(
            service_provider=provider, status__in=['trial', 'active'],
        ).first()
        if sub is None:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                'Necesitas una suscripción activa para emitir órdenes de servicio.'
            )
        serializer.save(provider=provider)

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """Marca la orden como enviada al cliente."""
        order = self.get_object()
        if order.provider_id != request.user.id:
            return Response({'error': 'Solo el emisor puede enviar.'}, status=status.HTTP_403_FORBIDDEN)
        if order.status != 'draft':
            return Response({'error': f'Solo órdenes en draft pueden enviarse (actual: {order.status}).'},
                            status=status.HTTP_400_BAD_REQUEST)
        order.status = 'sent'
        order.sent_at = timezone.now()
        order.save()
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Cliente acepta la orden y se genera la PaymentOrder."""
        order = self.get_object()
        if order.client_id != request.user.id:
            return Response({'error': 'Solo el cliente puede aceptar.'}, status=status.HTTP_403_FORBIDDEN)
        if order.status not in ('sent', 'draft'):
            return Response({'error': f'No se puede aceptar una orden en estado {order.status}.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Crear PaymentOrder enlazada (T1.4)
        from payments.models import PaymentOrder
        from datetime import date as _date, timedelta as _td
        due = order.due_date or (_date.today() + _td(days=15))
        po = PaymentOrder.objects.create(
            order_type='service',
            payer=order.client,
            payee=order.provider,
            created_by=order.provider,
            amount=order.amount,
            date_due=due,
            date_grace_end=due,  # sin gracia para servicios
            date_max_overdue=due,  # sin mora para servicios
            description=f'Orden de servicio · {order.title}',
            status='pending',
        )
        po.add_audit_event(
            'service_accepted',
            f'Orden aceptada por {request.user.email}',
            actor=request.user,
        )

        order.status = 'accepted'
        order.accepted_at = timezone.now()
        order.payment_order = po
        order._updated_by = request.user  # 1.9.5 atribuir signal
        order.save()

        # 1.9.7: auditoría unificada.
        from core.audit_service import log_activity
        log_activity(
            request,
            action_type='service_order.accept',
            description=f'Orden de servicio aceptada: {order.title}',
            target_object=order,
            details={
                'amount': str(order.amount),
                'payment_order_id': str(po.id),
            },
        )
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Cliente rechaza la orden."""
        order = self.get_object()
        if order.client_id != request.user.id:
            return Response({'error': 'Solo el cliente puede rechazar.'}, status=status.HTTP_403_FORBIDDEN)
        if order.status not in ('sent', 'draft'):
            return Response({'error': f'No se puede rechazar una orden en estado {order.status}.'},
                            status=status.HTTP_400_BAD_REQUEST)
        order.status = 'rejected'
        order.save()
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancelación por el prestador o admin."""
        order = self.get_object()
        user = request.user
        if not (user.is_staff or order.provider_id == user.id):
            return Response({'error': 'Solo el prestador o admin pueden cancelar.'},
                            status=status.HTTP_403_FORBIDDEN)
        if order.status in ('paid', 'cancelled'):
            return Response({'error': f'Orden ya está {order.status}.'},
                            status=status.HTTP_400_BAD_REQUEST)
        order.status = 'cancelled'
        order.cancelled_at = timezone.now()
        order.save()
        # También cancelar la PaymentOrder asociada si existe
        if order.payment_order and order.payment_order.status not in ('paid', 'cancelled'):
            order.payment_order.status = 'cancelled'
            order.payment_order.add_audit_event(
                'service_cancelled',
                f'Orden de servicio cancelada por {user.email}',
                actor=user,
            )
            order.payment_order.save()
        return Response(self.get_serializer(order).data)