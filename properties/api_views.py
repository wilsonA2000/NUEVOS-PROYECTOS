"""
Vistas de API REST para la aplicación de propiedades de VeriHome.
OPTIMIZADO para performance con caching y queries eficientes.
"""

from rest_framework import viewsets, generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Avg, Count
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from datetime import datetime, timedelta

# Importar utilidades de cache optimizadas
from core.cache import (
    cache_manager, 
    cache_api_response,
    cache_property_list,
    cache_property_detail,
    SmartCache,
    CACHE_TIMEOUTS
)

from .models import (
    Property, PropertyImage, PropertyVideo, PropertyAmenity, 
    PropertyInquiry, PropertyFavorite, PropertyView
)
from .serializers import (
    PropertyImageSerializer, PropertyVideoSerializer, PropertyAmenitySerializer,
    PropertyViewSerializer, PropertySearchSerializer, PropertyStatsSerializer
)
from .optimized_serializers import (
    OptimizedPropertySerializer as PropertySerializer,
    OptimizedCreatePropertySerializer as CreatePropertySerializer,
    OptimizedUpdatePropertySerializer as UpdatePropertySerializer,
    OptimizedPropertyInquirySerializer as PropertyInquirySerializer,
    OptimizedPropertyFavoriteSerializer as PropertyFavoriteSerializer,
    OptimizedPropertyListSerializer,
    OptimizedPropertyDetailSerializer
)
from users.services import AdminActionLogger
from users.permissions import (
    CanViewProperty, CanCreateProperty, CanEditProperty, CanDeleteProperty,
    CanContactLandlord, PropertyAccessMixin, RoleBasedPermissionMixin
)


class PropertyPagination(PageNumberPagination):
    """Paginación personalizada para propiedades."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class PropertyViewSet(PropertyAccessMixin, RoleBasedPermissionMixin, viewsets.ModelViewSet):
    """ViewSet para propiedades con permisos basados en roles - ALTAMENTE OPTIMIZADO."""
    pagination_class = PropertyPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['property_type', 'listing_type', 'status', 'city', 'state']
    search_fields = ['title', 'description', 'address', 'city', 'state']
    ordering_fields = ['created_at', 'last_updated', 'rent_price', 'sale_price', 'views_count']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Dynamic queryset optimization based on action and user context.
        Eliminates all N+1 queries through strategic prefetching.
        """
        from .optimized_views import OptimizedPropertyViewSet
        optimized_viewset = OptimizedPropertyViewSet()
        optimized_viewset.request = self.request
        optimized_viewset.action = self.action
        return optimized_viewset.get_queryset()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreatePropertySerializer
        elif self.action in ['update', 'partial_update']:
            return UpdatePropertySerializer
        elif self.action == 'list':
            return OptimizedPropertyListSerializer
        elif self.action == 'retrieve':
            return OptimizedPropertyDetailSerializer
        return PropertySerializer
    
    def list(self, request, *args, **kwargs):
        """
        Optimized list view with intelligent caching.
        Cache keys include user context and filter parameters.
        """
        from .optimized_views import OptimizedPropertyViewSet
        optimized_viewset = OptimizedPropertyViewSet()
        optimized_viewset.request = self.request
        optimized_viewset.action = self.action
        optimized_viewset.kwargs = self.kwargs
        optimized_viewset.format_kwarg = getattr(self, 'format_kwarg', None)
        return optimized_viewset.list(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        """Asigna el landlord al crear la propiedad."""
        property_obj = serializer.save(landlord=self.request.user)
        
        # Invalidar cache relacionado con propiedades
        SmartCache.invalidate_pattern('verihome:properties:*')
        
        request = self.request
        # Logging automático
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='property_create',
                description=f'Creación de propiedad {property_obj.title}',
                target_object=property_obj,
                new_data=serializer.data,
                notify_user=True
            )
        else:
            # Temporarily disabled activity logging due to schema mismatch
            # TODO: Run migrations to update UserActivityLog table
            pass
    
    def perform_update(self, serializer):
        """Actualiza propiedad e invalida cache."""
        property_obj = serializer.save()
        
        # Invalidar cache específico de la propiedad
        cache_patterns = [
            f'property:detail:v2:{property_obj.id}:*',
            'properties:list:v2:*'
        ]
        
        for pattern in cache_patterns:
            SmartCache.invalidate_pattern(pattern)
        
        request = self.request
        # Logging automático
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='property_edit',
                description=f'Edición de propiedad {property_obj.title}',
                target_object=property_obj,
                new_data=serializer.data,
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='property_edit',
                description=f'Edición de propiedad {property_obj.title}',
                details={'property_id': str(property_obj.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                performed_by_admin=False
            )
    
    def perform_destroy(self, instance):
        """Hard delete propiedad e invalida cache - OPTIMIZADO para desarrollo."""
        property_id = str(instance.id)
        property_title = instance.title
        
        try:
            # Hard delete para desarrollo - funciona mejor con frontend
            instance.delete()
            
            # Invalidar cache DESPUÉS de eliminar
            SmartCache.invalidate_pattern('verihome:properties:*')
            
            # Logging simple sin errores
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f'Propiedad eliminada exitosamente: {property_title} (ID: {property_id})')
            
        except Exception as e:
            # Manejo de errores robusto
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Error eliminando propiedad {property_id}: {str(e)}')
            
            # Si hay error, intentar soft delete como fallback
            try:
                if hasattr(instance, 'is_active'):
                    instance.is_active = False
                    instance.save(update_fields=['is_active'])
                    SmartCache.invalidate_pattern('verihome:properties:*')
                    logger.warning(f'Fallback a soft delete para propiedad {property_id}')
                else:
                    # Re-raise el error si no podemos hacer soft delete
                    raise
            except Exception as fallback_error:
                logger.error(f'Error en fallback para propiedad {property_id}: {str(fallback_error)}')
                raise
    
    def retrieve(self, request, *args, **kwargs):
        """
        Optimized detail view with property view tracking.
        Automatically tracks property views for analytics.
        """
        from .optimized_views import OptimizedPropertyViewSet
        optimized_viewset = OptimizedPropertyViewSet()
        optimized_viewset.request = self.request
        optimized_viewset.action = self.action
        optimized_viewset.kwargs = self.kwargs
        optimized_viewset.format_kwarg = getattr(self, 'format_kwarg', None)
        optimized_viewset.basename = getattr(self, 'basename', None)
        optimized_viewset.permission_classes = self.permission_classes
        optimized_viewset.filter_backends = self.filter_backends
        optimized_viewset.filterset_fields = self.filterset_fields
        optimized_viewset.search_fields = self.search_fields
        optimized_viewset.ordering_fields = self.ordering_fields
        optimized_viewset.ordering = self.ordering
        return optimized_viewset.retrieve(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Delegate update to optimized viewset."""
        from .optimized_views import OptimizedPropertyViewSet
        optimized_viewset = OptimizedPropertyViewSet()
        optimized_viewset.request = self.request
        optimized_viewset.action = self.action
        optimized_viewset.kwargs = self.kwargs
        optimized_viewset.format_kwarg = getattr(self, 'format_kwarg', None)
        optimized_viewset.basename = getattr(self, 'basename', None)
        optimized_viewset.permission_classes = self.permission_classes
        optimized_viewset.filter_backends = self.filter_backends
        optimized_viewset.filterset_fields = self.filterset_fields
        optimized_viewset.search_fields = self.search_fields
        optimized_viewset.ordering_fields = self.ordering_fields
        optimized_viewset.ordering = self.ordering
        return optimized_viewset.update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        """Delegate partial_update to optimized viewset."""
        from .optimized_views import OptimizedPropertyViewSet
        optimized_viewset = OptimizedPropertyViewSet()
        optimized_viewset.request = self.request
        optimized_viewset.action = self.action
        optimized_viewset.kwargs = self.kwargs
        optimized_viewset.format_kwarg = getattr(self, 'format_kwarg', None)
        optimized_viewset.basename = getattr(self, 'basename', None)
        optimized_viewset.permission_classes = self.permission_classes
        optimized_viewset.filter_backends = self.filter_backends
        optimized_viewset.filterset_fields = self.filterset_fields
        optimized_viewset.search_fields = self.search_fields
        optimized_viewset.ordering_fields = self.ordering_fields
        optimized_viewset.ordering = self.ordering
        return optimized_viewset.partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delegate destroy to optimized viewset."""
        from .optimized_views import OptimizedPropertyViewSet
        optimized_viewset = OptimizedPropertyViewSet()
        optimized_viewset.request = self.request
        optimized_viewset.action = self.action
        optimized_viewset.kwargs = self.kwargs
        optimized_viewset.format_kwarg = getattr(self, 'format_kwarg', None)
        optimized_viewset.basename = getattr(self, 'basename', None)
        optimized_viewset.permission_classes = self.permission_classes
        optimized_viewset.filter_backends = self.filter_backends
        optimized_viewset.filterset_fields = self.filterset_fields
        optimized_viewset.search_fields = self.search_fields
        optimized_viewset.ordering_fields = self.ordering_fields
        optimized_viewset.ordering = self.ordering
        return optimized_viewset.destroy(request, *args, **kwargs)


class PropertyImageViewSet(viewsets.ModelViewSet):
    """ViewSet para imágenes de propiedades - OPTIMIZADO."""
    queryset = PropertyImage.objects.select_related('property').order_by('order')
    serializer_class = PropertyImageSerializer
    permission_classes = [CanEditProperty]
    
    def get_queryset(self):
        """Filtra imágenes por propiedad."""
        property_id = self.kwargs.get('property_pk')
        if property_id:
            return self.queryset.filter(property_id=property_id)
        return self.queryset.none()
    
    def perform_create(self, serializer):
        """Personalizar la creación de imágenes con cache invalidation."""
        image = serializer.save()
        
        # Invalidar property caches
        SmartCache.invalidate_pattern(f'property:detail:v2:{image.property_id}:*')
        
        # Logging automático
        request = self.request
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='property_image_create',
                description=f'Agregar imagen a propiedad {image.property.title}',
                target_object=image,
                new_data=serializer.data,
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='property_image_create',
                description=f'Agregar imagen a propiedad {image.property.title}',
                details={'property_id': str(image.property.id), 'image_id': str(image.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                performed_by_admin=False
            )
    
    def perform_destroy(self, instance):
        """Personalizar la eliminación de imágenes."""
        image_id = str(instance.id)
        property_title = instance.property.title
        instance.delete()
        
        # Logging automático
        request = self.request
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='property_image_delete',
                description=f'Eliminar imagen de propiedad {property_title}',
                target_object=None,
                new_data={'deleted_image_id': image_id},
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='property_image_delete',
                description=f'Eliminar imagen de propiedad {property_title}',
                details={'deleted_image_id': image_id},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                performed_by_admin=False
            )


class PropertyVideoViewSet(viewsets.ModelViewSet):
    """ViewSet para videos de propiedades."""
    queryset = PropertyVideo.objects.all()
    serializer_class = PropertyVideoSerializer
    permission_classes = [CanEditProperty]
    
    def get_queryset(self):
        """Filtra videos por propiedad o permite acceso directo."""
        property_id = self.kwargs.get('property_pk')
        if property_id:
            # URL anidada: /properties/{property_pk}/videos/
            return self.queryset.filter(property_id=property_id)
        
        # URL directa: /property-videos/{id}/ - permitir acceso si el usuario es propietario
        request = getattr(self, 'request', None)
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            # Filtrar solo videos de propiedades que le pertenecen al usuario
            return self.queryset.filter(property__landlord=request.user)
        
        return self.queryset.all()  # Cambiar a all() en lugar de none()
    
    def perform_create(self, serializer):
        """Personalizar la creación de videos."""
        video = serializer.save()
        
        # Logging automático
        request = self.request
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='property_video_create',
                description=f'Agregar video a propiedad {video.property.title}',
                target_object=video,
                new_data=serializer.data,
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='property_video_create',
                description=f'Agregar video a propiedad {video.property.title}',
                metadata={'property_id': str(video.property.id), 'video_id': str(video.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )


class PropertyAmenityViewSet(viewsets.ModelViewSet):
    """ViewSet para amenidades de propiedades."""
    queryset = PropertyAmenity.objects.filter(is_active=True)
    serializer_class = PropertyAmenitySerializer
    permission_classes = [permissions.IsAuthenticated]


class PropertyInquiryViewSet(viewsets.ModelViewSet):
    """ViewSet para consultas sobre propiedades - OPTIMIZADO."""
    serializer_class = PropertyInquirySerializer
    permission_classes = [CanContactLandlord]
    
    def get_queryset(self):
        """Filtra consultas según el rol del usuario con optimización."""
        user = self.request.user
        
        # Superusuarios ven todas las consultas
        if user.is_superuser:
            return PropertyInquiry.objects.select_related(
                'property', 'inquirer', 'inquirer__tenant_profile'
            ).all()
        
        # Arrendadores ven consultas de sus propiedades
        if hasattr(user, 'landlord_profile'):
            return PropertyInquiry.objects.filter(
                property__landlord=user
            ).select_related(
                'property',
                'inquirer',
                'inquirer__tenant_profile'
            ).order_by('-created_at')
        
        # Arrendatarios y prestadores de servicios ven sus propias consultas
        else:
            return PropertyInquiry.objects.filter(
                inquirer=user
            ).select_related(
                'property',
                'property__landlord'
            ).order_by('-created_at')
    
    def perform_create(self, serializer):
        """Personalizar la creación de consultas."""
        inquiry = serializer.save(inquirer=self.request.user)
        
        # Logging automático
        request = self.request
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='property_inquiry_create',
                description=f'Consulta sobre propiedad {inquiry.property.title}',
                target_object=inquiry,
                new_data=serializer.data,
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='property_inquiry_create',
                description=f'Consulta sobre propiedad {inquiry.property.title}',
                details={'property_id': str(inquiry.property.id), 'inquiry_id': str(inquiry.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                performed_by_admin=False
            )


class PropertyFavoriteViewSet(viewsets.ModelViewSet):
    """ViewSet para propiedades favoritas - OPTIMIZADO."""
    serializer_class = PropertyFavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filtra favoritos por usuario con prefetch optimizado."""
        from django.db.models import Prefetch
        return PropertyFavorite.objects.filter(
            user=self.request.user
        ).select_related(
            'property',
            'property__landlord'
        ).prefetch_related(
            Prefetch(
                'property__images',
                queryset=PropertyImage.objects.filter(is_main=True)[:1],
                to_attr='main_image'
            )
        ).order_by('-created_at')
    
    def perform_create(self, serializer):
        """Personalizar la creación de favoritos."""
        favorite = serializer.save(user=self.request.user)
        
        # Logging automático
        request = self.request
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='property_favorite_create',
                description=f'Agregar propiedad {favorite.property.title} a favoritos',
                target_object=favorite,
                new_data=serializer.data,
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='property_favorite_create',
                description=f'Agregar propiedad {favorite.property.title} a favoritos',
                details={'property_id': str(favorite.property.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                performed_by_admin=False
            )
    
    def perform_destroy(self, instance):
        """Personalizar la eliminación de favoritos."""
        property_title = instance.property.title
        instance.delete()
        
        # Logging automático
        request = self.request
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='property_favorite_delete',
                description=f'Quitar propiedad {property_title} de favoritos',
                target_object=None,
                new_data={'removed_property_id': str(instance.property.id)},
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='property_favorite_delete',
                description=f'Quitar propiedad {property_title} de favoritos',
                details={'removed_property_id': str(instance.property.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                performed_by_admin=False
            )


class PropertySearchAPIView(PropertyAccessMixin, generics.ListAPIView):
    """Vista para búsqueda básica de propiedades - OPTIMIZADA."""
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = PropertyPagination
    
    def get_queryset(self):
        """Filtra propiedades según el rol del usuario - OPTIMIZADO."""
        # Usar queryset optimizado de la clase base
        queryset = super().get_queryset().select_related(
            'landlord'
        ).prefetch_related(
            'images',
            'amenity_relations__amenity'
        )
        
        # Aplicar filtros de búsqueda
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(address__icontains=search) |
                Q(city__icontains=search) |
                Q(state__icontains=search)
            )
        
        # Filtros adicionales
        property_type = self.request.query_params.get('property_type', None)
        if property_type:
            queryset = queryset.filter(property_type=property_type)
        
        min_price = self.request.query_params.get('min_price', None)
        if min_price:
            queryset = queryset.filter(rent_price__gte=min_price)
        
        max_price = self.request.query_params.get('max_price', None)
        if max_price:
            queryset = queryset.filter(rent_price__lte=max_price)
        
        bedrooms = self.request.query_params.get('bedrooms', None)
        if bedrooms:
            queryset = queryset.filter(bedrooms__gte=bedrooms)
        
        bathrooms = self.request.query_params.get('bathrooms', None)
        if bathrooms:
            queryset = queryset.filter(bathrooms__gte=bathrooms)
        
        city = self.request.query_params.get('city', None)
        if city:
            queryset = queryset.filter(city__icontains=city)
        
        return queryset


class PropertyFiltersAPIView(APIView):
    """Vista para obtener filtros disponibles para propiedades."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Retorna los filtros disponibles según el rol del usuario."""
        filters = {
            'property_types': dict(Property.PROPERTY_TYPES),
            'statuses': dict(Property.PROPERTY_STATUS),
            'cities': list(Property.objects.values_list('city', flat=True).distinct()),
            'states': list(Property.objects.values_list('state', flat=True).distinct()),
        }
        
        return Response(filters)


class FeaturedPropertiesAPIView(PropertyAccessMixin, generics.ListAPIView):
    """Vista para obtener propiedades destacadas."""
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return super().get_queryset().filter(is_featured=True)


class TrendingPropertiesAPIView(PropertyAccessMixin, generics.ListAPIView):
    """Vista para obtener propiedades tendencia."""
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Propiedades más vistas en los últimos 30 días
        thirty_days_ago = timezone.now() - timedelta(days=30)
        trending_properties = PropertyView.objects.filter(
            created_at__gte=thirty_days_ago
        ).values('property').annotate(
            view_count=Count('id')
        ).order_by('-view_count')[:10]
        
        property_ids = [item['property'] for item in trending_properties]
        return super().get_queryset().filter(id__in=property_ids)


class PropertyStatsAPIView(APIView):
    """Vista para obtener estadísticas de propiedades."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Retorna estadísticas según el rol del usuario."""
        user = request.user
        
        if hasattr(user, 'user_type') and user.user_type == 'landlord':
            # Estadísticas para arrendadores
            total_properties = Property.objects.filter(landlord=user).count()
            active_properties = Property.objects.filter(landlord=user, status='available').count()
            rented_properties = Property.objects.filter(landlord=user, status='rented').count()
            total_views = PropertyView.objects.filter(property__landlord=user).count()
            
            stats = {
                'total_properties': total_properties,
                'active_properties': active_properties,
                'rented_properties': rented_properties,
                'total_views': total_views,
            }
        else:
            # Estadísticas para arrendatarios y prestadores de servicios
            available_properties = Property.objects.filter(is_active=True, status='available').count()
            user_favorites = PropertyFavorite.objects.filter(user=user).count()
            user_inquiries = PropertyInquiry.objects.filter(inquirer=user).count()
            
            stats = {
                'available_properties': available_properties,
                'user_favorites': user_favorites,
                'user_inquiries': user_inquiries,
            }
        
        return Response(stats)


class ToggleFavoriteAPIView(APIView):
    """Vista para agregar/quitar propiedades de favoritos."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, property_id):
        """Agrega o quita una propiedad de favoritos."""
        try:
            property_obj = Property.objects.get(id=property_id)
            
            # Verificar si ya está en favoritos
            favorite, created = PropertyFavorite.objects.get_or_create(
                user=request.user,
                property=property_obj
            )
            
            if created:
                message = f'Propiedad {property_obj.title} agregada a favoritos'
                action = 'added'
            else:
                favorite.delete()
                message = f'Propiedad {property_obj.title} removida de favoritos'
                action = 'removed'
            
            return Response({
                'message': message,
                'action': action,
                'property_id': property_id
            })
            
        except Property.DoesNotExist:
            return Response(
                {'error': 'Propiedad no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )


class PropertyVideoDetailAPIView(APIView):
    """Vista para operaciones específicas de videos de propiedades."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_video(self, video_id):
        """Obtiene video por ID."""
        try:
            return PropertyVideo.objects.get(id=video_id)
        except PropertyVideo.DoesNotExist:
            return None
    
    def delete(self, request, video_id):
        """Elimina un video específico."""
        video = self.get_video(video_id)
        if not video:
            return Response(
                {'error': 'Video no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar permisos - el usuario debe ser el dueño de la propiedad
        if video.property.landlord != request.user:
            return Response(
                {'error': 'No tienes permisos para eliminar este video'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Eliminar archivo de video si existe
        if video.video:
            video.video.delete(save=False)
        
        # Guardar información para log
        property_title = video.property.title
        video_title = video.title
        
        # Eliminar video
        video.delete()
        
        # Log de actividad
        from users.models import UserActivityLog
        UserActivityLog.objects.create(
            user=request.user,
            activity_type='property_video_delete',
            description=f'Eliminar video "{video_title}" de propiedad "{property_title}"',
            metadata={'video_id': video_id, 'property_id': str(video.property.id)},
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        
        return Response(
            {'message': f'Video "{video_title}" eliminado exitosamente'},
            status=status.HTTP_200_OK
        )
    
    def put(self, request, video_id):
        """Actualiza un video específico."""
        video = self.get_video(video_id)
        if not video:
            return Response(
                {'error': 'Video no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar permisos
        if video.property.landlord != request.user:
            return Response(
                {'error': 'No tienes permisos para editar este video'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Actualizar video
        serializer = PropertyVideoSerializer(video, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PropertyVideoUploadAPIView(APIView):
    """Vista para subir videos a propiedades."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, property_id):
        """Sube un nuevo video a la propiedad."""
        try:
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {'error': 'Propiedad no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar permisos
        if property_obj.landlord != request.user:
            return Response(
                {'error': 'No tienes permisos para agregar videos a esta propiedad'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Agregar la propiedad a los datos
        data = request.data.copy()
        data['property'] = property_obj.id
        
        # Crear video
        serializer = PropertyVideoSerializer(data=data)
        if serializer.is_valid():
            video = serializer.save(property=property_obj)
            
            # Log de actividad
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='property_video_create',
                description=f'Agregar video "{video.title}" a propiedad "{property_obj.title}"',
                metadata={'video_id': str(video.id), 'property_id': str(property_obj.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)