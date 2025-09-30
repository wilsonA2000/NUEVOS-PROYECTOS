"""
Vistas API para el sistema de servicios adicionales.
"""

from rest_framework import viewsets, generics, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q

from .models import ServiceCategory, Service, ServiceRequest
from .serializers import (
    ServiceCategorySerializer, ServiceListSerializer, ServiceDetailSerializer,
    CreateServiceRequestSerializer, ServiceRequestSerializer, ServiceStatsSerializer
)


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


class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para servicios."""
    queryset = Service.objects.filter(is_active=True).select_related('category')
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'pricing_type', 'difficulty', 'is_featured', 'is_most_requested']
    search_fields = ['name', 'short_description', 'full_description']
    ordering_fields = ['name', 'popularity_score', 'views_count', 'requests_count', 'created_at']
    ordering = ['-popularity_score', '-is_featured', 'name']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ServiceDetailSerializer
        return ServiceListSerializer

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