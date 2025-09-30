"""
Optimized Property Serializers - Zero N+1 Queries
Uses annotations and prefetched data to eliminate all N+1 query problems
"""

from rest_framework import serializers
from django.db.models import Avg, Count
from django.contrib.auth import get_user_model

from .models import (
    Property, PropertyImage, PropertyVideo, PropertyAmenity, 
    PropertyInquiry, PropertyFavorite, PropertyView, PropertyAmenityRelation
)
from users.serializers import LandlordProfileSerializer

User = get_user_model()


class OptimizedPropertyImageSerializer(serializers.ModelSerializer):
    """Optimized PropertyImage serializer."""
    
    class Meta:
        model = PropertyImage
        fields = [
            'id', 'image', 'caption', 'is_main', 'order', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class OptimizedAmenitySerializer(serializers.ModelSerializer):
    """Optimized PropertyAmenity serializer."""
    
    class Meta:
        model = PropertyAmenity
        fields = ['id', 'name', 'icon', 'category', 'description']


class OptimizedPropertyAmenityRelationSerializer(serializers.ModelSerializer):
    """Optimized PropertyAmenityRelation serializer with prefetched amenity data."""
    
    amenity = OptimizedAmenitySerializer(read_only=True)
    
    class Meta:
        model = PropertyAmenityRelation
        fields = ['id', 'amenity']


class OptimizedLandlordSerializer(serializers.ModelSerializer):
    """Optimized landlord serializer using prefetched profile data."""
    
    profile = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'profile']
    
    def get_profile(self, obj):
        """Use prefetched landlord_profile to avoid N+1."""
        if hasattr(obj, 'landlord_profile') and obj.landlord_profile:
            return {
                'phone_number': obj.landlord_profile.phone_number,
                'bio': obj.landlord_profile.bio,
                'verified': obj.landlord_profile.verified,
                'rating': obj.landlord_profile.rating,
            }
        return None


class OptimizedPropertySerializer(serializers.ModelSerializer):
    """
    Highly optimized Property serializer that uses annotations and prefetched data
    to completely eliminate N+1 queries.
    """
    
    # Use SerializerMethodField for data that comes from annotations or prefetching
    landlord = OptimizedLandlordSerializer(read_only=True)
    images = serializers.SerializerMethodField()
    videos = serializers.SerializerMethodField() 
    amenities = serializers.SerializerMethodField()
    
    # Use annotation-based fields for counts and calculations
    favorites_count = serializers.SerializerMethodField()
    inquiries_count = serializers.SerializerMethodField()
    images_count = serializers.SerializerMethodField()
    amenities_count = serializers.SerializerMethodField()
    price_per_sqm = serializers.SerializerMethodField()
    
    # User-specific fields (from annotations)
    is_favorited = serializers.SerializerMethodField()
    has_been_viewed = serializers.SerializerMethodField()
    user_inquiries_count = serializers.SerializerMethodField()
    
    # Computed fields
    full_address = serializers.SerializerMethodField()
    display_price = serializers.SerializerMethodField()
    
    class Meta:
        model = Property
        fields = [
            # Basic property info
            'id', 'title', 'description', 'property_type', 'listing_type',
            'status', 'address', 'city', 'state', 'country', 'postal_code',
            'latitude', 'longitude',
            
            # Property details
            'bedrooms', 'bathrooms', 'total_area', 'lot_area', 'year_built',
            'rent_price', 'sale_price', 'security_deposit', 'utilities_included',
            'furnished', 'pets_allowed', 'smoking_allowed',
            
            # Additional property details
            'parking_spaces', 'floors', 'minimum_lease_term', 'property_features',
            'nearby_amenities', 'transportation',
            
            # Relationships
            'landlord', 'images', 'videos', 'amenities',
            
            # Calculated fields
            'favorites_count', 'inquiries_count', 'images_count', 'amenities_count',
            'price_per_sqm', 'views_count',
            
            # User-specific fields
            'is_favorited', 'has_been_viewed', 'user_inquiries_count',
            
            # Computed fields
            'full_address', 'display_price',
            
            # Timestamps
            'created_at', 'last_updated', 'available_from'
        ]
        read_only_fields = [
            'id', 'landlord', 'views_count', 'created_at', 'last_updated',
            'favorites_count', 'inquiries_count', 'images_count', 'amenities_count',
            'is_favorited', 'has_been_viewed', 'user_inquiries_count',
            'price_per_sqm', 'full_address', 'display_price'
        ]
    
    def get_images(self, obj):
        """
        Use prefetched image data to avoid N+1 queries.
        For list views, use main_image_only; for detail views, use ordered_images.
        """
        # Check if we have prefetched data for list view
        if hasattr(obj, 'main_image_only'):
            return OptimizedPropertyImageSerializer(obj.main_image_only, many=True).data
        
        # Check if we have prefetched data for detail view
        if hasattr(obj, 'ordered_images'):
            return OptimizedPropertyImageSerializer(obj.ordered_images, many=True).data
        
        # Fallback to regular images (should not happen with proper prefetching)
        return OptimizedPropertyImageSerializer(obj.images.all()[:5], many=True).data
    
    def get_videos(self, obj):
        """Use prefetched video data."""
        if hasattr(obj, '_prefetched_objects_cache') and 'videos' in obj._prefetched_objects_cache:
            from .serializers import PropertyVideoSerializer
            return PropertyVideoSerializer(obj.videos.all(), many=True).data
        return []
    
    def get_amenities(self, obj):
        """
        Use prefetched amenity data to avoid N+1 queries.
        For list views, use featured_amenities_only; for detail views, use all_amenities.
        """
        # Check if we have prefetched featured amenities for list view
        if hasattr(obj, 'featured_amenities_only'):
            return OptimizedPropertyAmenityRelationSerializer(obj.featured_amenities_only, many=True).data
        
        # Check if we have prefetched all amenities for detail view
        if hasattr(obj, 'all_amenities'):
            return OptimizedPropertyAmenityRelationSerializer(obj.all_amenities, many=True).data
        
        # Fallback (should not happen with proper prefetching)
        return []
    
    def get_favorites_count(self, obj):
        """Use annotation instead of counting related objects."""
        return getattr(obj, 'favorites_count_real', obj.favorited_by.count())
    
    def get_inquiries_count(self, obj):
        """Use annotation instead of counting related objects."""
        return getattr(obj, 'inquiries_count_real', 0)
    
    def get_images_count(self, obj):
        """Use annotation instead of counting related objects."""
        return getattr(obj, 'images_count', 0)
    
    def get_amenities_count(self, obj):
        """Use annotation instead of counting related objects."""
        return getattr(obj, 'amenities_count', 0)
    
    def get_price_per_sqm(self, obj):
        """Use annotation for price per square meter calculation."""
        return getattr(obj, 'price_per_sqm', None)
    
    def get_is_favorited(self, obj):
        """Use annotation to check if property is favorited by current user."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        # Use annotation from the queryset
        return getattr(obj, 'is_favorited_by_user', False)
    
    def get_has_been_viewed(self, obj):
        """Use annotation to check if property has been viewed by current user."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        # Use annotation from the queryset
        return getattr(obj, 'has_been_viewed', False)
    
    def get_user_inquiries_count(self, obj):
        """Use annotation for user's inquiry count."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        
        # Use annotation from the queryset
        return getattr(obj, 'user_inquiries_count', 0)
    
    def get_full_address(self, obj):
        """Construct full address string."""
        parts = [obj.address, obj.city, obj.state, obj.country]
        return ', '.join(filter(None, parts))
    
    def get_display_price(self, obj):
        """Get the appropriate price based on listing type."""
        if obj.listing_type == 'rent' and obj.rent_price:
            return {
                'amount': obj.rent_price,
                'currency': 'COP',
                'period': 'month',
                'formatted': f"${obj.rent_price:,.0f}/mes"
            }
        elif obj.listing_type == 'sale' and obj.sale_price:
            return {
                'amount': obj.sale_price,
                'currency': 'COP',
                'period': 'total',
                'formatted': f"${obj.sale_price:,.0f}"
            }
        return None


class OptimizedPropertyListSerializer(OptimizedPropertySerializer):
    """
    Lightweight serializer for property lists.
    Excludes heavy fields that are not needed in list views.
    """
    
    class Meta(OptimizedPropertySerializer.Meta):
        fields = [
            # Essential fields for list view
            'id', 'title', 'property_type', 'listing_type', 'status',
            'city', 'bedrooms', 'bathrooms', 'total_area',
            'rent_price', 'sale_price', 'landlord',
            
            # Lightweight relationships
            'images', 'amenities',
            
            # Calculated fields
            'favorites_count', 'price_per_sqm', 'views_count',
            
            # User-specific fields
            'is_favorited',
            
            # Computed fields
            'display_price',
            
            # Timestamps
            'created_at', 'available_from'
        ]


class OptimizedPropertyDetailSerializer(OptimizedPropertySerializer):
    """
    Comprehensive serializer for property detail views.
    Includes all fields and relationships.
    """
    
    recent_inquiries = serializers.SerializerMethodField()
    view_statistics = serializers.SerializerMethodField()
    
    class Meta(OptimizedPropertySerializer.Meta):
        fields = OptimizedPropertySerializer.Meta.fields + [
            'recent_inquiries', 'view_statistics'
        ]
    
    def get_recent_inquiries(self, obj):
        """Use prefetched recent inquiries data."""
        if hasattr(obj, 'recent_inquiries'):
            from .serializers import PropertyInquirySerializer
            return PropertyInquirySerializer(obj.recent_inquiries, many=True, context=self.context).data
        return []
    
    def get_view_statistics(self, obj):
        """Provide view statistics from prefetched data."""
        if hasattr(obj, 'recent_views'):
            return {
                'total_views': obj.views_count,
                'recent_views_count': len(obj.recent_views),
                'unique_viewers': len(set(view.user_id for view in obj.recent_views if view.user_id))
            }
        return {
            'total_views': obj.views_count,
            'recent_views_count': 0,
            'unique_viewers': 0
        }


class OptimizedCreatePropertySerializer(serializers.ModelSerializer):
    """Optimized serializer for property creation."""
    
    # Redefinir los campos JSONField como CharField para recibir CSV
    utilities_included = serializers.CharField(required=False, allow_blank=True)
    property_features = serializers.CharField(required=False, allow_blank=True)
    nearby_amenities = serializers.CharField(required=False, allow_blank=True)
    transportation = serializers.CharField(required=False, allow_blank=True)
    
    # Campos de medios
    images = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
        write_only=True
    )
    main_image = serializers.ImageField(required=False, write_only=True)
    video_file = serializers.FileField(required=False, write_only=True)
    video_files = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        write_only=True
    )
    youtube_urls = serializers.ListField(
        child=serializers.URLField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = Property
        fields = [
            'title', 'description', 'property_type', 'listing_type',
            'address', 'city', 'state', 'country', 'postal_code',
            'latitude', 'longitude',
            'bedrooms', 'bathrooms', 'total_area', 'lot_area', 'year_built',
            'rent_price', 'sale_price', 'security_deposit', 'utilities_included',
            'furnished', 'pets_allowed', 'smoking_allowed', 'available_from',
            # Campos faltantes agregados
            'parking_spaces', 'floors', 'minimum_lease_term', 'property_features',
            'nearby_amenities', 'transportation',
            # Campos de medios
            'images', 'main_image', 'video_file', 'video_files', 'youtube_urls'
        ]
    
    def validate_utilities_included(self, value):
        """Convert CSV string to JSON list for utilities_included."""
        if isinstance(value, str):
            if value.strip() == '':
                return []
            # Si es string, convertir CSV a lista
            utilities = [utility.strip() for utility in value.split(',') if utility.strip()]
            return utilities
        elif isinstance(value, list):
            # Si ya es lista, validar y limpiar
            return [utility.strip() for utility in value if utility.strip()]
        return value or []
    
    def validate_property_features(self, value):
        """Convert CSV string to JSON list for property_features."""
        if isinstance(value, str):
            if value.strip() == '':
                return []
            # Si es string, convertir CSV a lista
            features = [feature.strip() for feature in value.split(',') if feature.strip()]
            return features
        elif isinstance(value, list):
            # Si ya es lista, validar y limpiar
            return [feature.strip() for feature in value if feature.strip()]
        return value or []
    
    def validate_nearby_amenities(self, value):
        """Convert CSV string to JSON list for nearby_amenities."""
        if isinstance(value, str):
            if value.strip() == '':
                return []
            # Si es string, convertir CSV a lista
            amenities = [amenity.strip() for amenity in value.split(',') if amenity.strip()]
            return amenities
        elif isinstance(value, list):
            # Si ya es lista, validar y limpiar
            return [amenity.strip() for amenity in value if amenity.strip()]
        return value or []
    
    def validate_transportation(self, value):
        """Convert CSV string to JSON list for transportation."""
        if isinstance(value, str):
            if value.strip() == '':
                return []
            # Si es string, convertir CSV a lista
            transport = [transport.strip() for transport in value.split(',') if transport.strip()]
            return transport
        elif isinstance(value, list):
            # Si ya es lista, validar y limpiar
            return [transport.strip() for transport in value if transport.strip()]
        return value or []
    
    def validate_parking_spaces(self, value):
        """Validate parking_spaces is a non-negative integer."""
        if value is not None and value < 0:
            raise serializers.ValidationError("Parking spaces cannot be negative.")
        return value
    
    def validate_floors(self, value):
        """Validate floors is a positive integer."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Floors must be greater than 0.")
        return value
    
    def validate_minimum_lease_term(self, value):
        """Validate minimum_lease_term is a positive integer."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Minimum lease term must be greater than 0.")
        return value
    
    def validate(self, data):
        """Validate property data."""
        listing_type = data.get('listing_type')
        rent_price = data.get('rent_price')
        sale_price = data.get('sale_price')
        
        # Check if rent_price is provided and valid for rental properties
        if listing_type == 'rent':
            if not rent_price or (isinstance(rent_price, str) and rent_price.strip() == '') or rent_price == 0:
                raise serializers.ValidationError({"rent_price": "Rent price is required for rental properties."})
        
        # Check if sale_price is provided and valid for sale properties
        if listing_type == 'sale':
            if not sale_price or (isinstance(sale_price, str) and sale_price.strip() == '') or sale_price == 0:
                raise serializers.ValidationError({"sale_price": "Sale price is required for sale properties."})
        
        return data
    
    def create(self, validated_data):
        """Create property with images and videos."""
        
        # Extraer archivos de medios
        images = validated_data.pop('images', [])
        main_image = validated_data.pop('main_image', None)
        video_file = validated_data.pop('video_file', None)
        video_files = validated_data.pop('video_files', [])
        youtube_urls = validated_data.pop('youtube_urls', [])
        
        # Obtener usuario de la request
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['landlord'] = request.user
        
        # Crear propiedad
        property_instance = Property.objects.create(**validated_data)
        
        # Si hay video_file individual (por compatibilidad), agregarlo a la lista
        if video_file:
            video_files.append(video_file)
        
        # Procesar imágenes
        if images:
            for i, image in enumerate(images):
                # Verificar si es main_image
                is_main = (main_image and image == main_image) or (i == 0 and not main_image)
                
                PropertyImage.objects.create(
                    property=property_instance,
                    image=image,
                    is_main=is_main if is_main is not None else False,
                    order=i
                )
        
        # Procesar múltiples archivos de video
        for i, video in enumerate(video_files):
            title_key = f'video_{i}_title'
            description_key = f'video_{i}_description'
            
            title = request.data.get(title_key, f'Video {i+1}') if request else 'Video'
            description = request.data.get(description_key, '') if request else ''
            
            PropertyVideo.objects.create(
                property=property_instance,
                video=video,
                title=title,
                description=description
            )
        
        # Procesar URLs de YouTube
        for i, youtube_url in enumerate(youtube_urls):
            title_key = f'youtube_{i}_title'
            description_key = f'youtube_{i}_description'
            
            title = request.data.get(title_key, f'YouTube Video {i+1}') if request else 'YouTube Video'
            description = request.data.get(description_key, '') if request else ''
            
            PropertyVideo.objects.create(
                property=property_instance,
                youtube_url=youtube_url,
                title=title,
                description=description
            )
        
        # Logging de actividad (opcional)
        if request and hasattr(request, 'user'):
            try:
                from core.audit_service import AuditService
                AuditService.log_activity(
                    user=request.user,
                    action_type='property_created',
                    resource_type='property',
                    resource_id=property_instance.id,
                    metadata={
                        'property_title': property_instance.title,
                        'property_type': property_instance.property_type,
                        'images_count': len(images),
                        'videos_count': len(video_files) + len(youtube_urls)
                    }
                )
            except Exception as e:
                # Log pero no fallar si hay problemas con auditoría
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Error logging property creation: {e}")
        
        return property_instance
    
    def to_representation(self, instance):
        """Return property data with ID for frontend."""
        data = super().to_representation(instance)
        # Ensure ID is included in response
        data['id'] = instance.id
        return data


class OptimizedUpdatePropertySerializer(OptimizedCreatePropertySerializer):
    """Optimized serializer for property updates."""
    
    class Meta(OptimizedCreatePropertySerializer.Meta):
        fields = OptimizedCreatePropertySerializer.Meta.fields + ['status']
    
    def update(self, instance, validated_data):
        """Update property with new images and videos."""
        
        # Extraer archivos de medios
        images = validated_data.pop('images', [])
        main_image = validated_data.pop('main_image', None)
        video_file = validated_data.pop('video_file', None)
        video_files = validated_data.pop('video_files', [])
        youtube_urls = validated_data.pop('youtube_urls', [])
        
        # Actualizar campos básicos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Obtener request para metadatos de videos
        request = self.context.get('request')
        
        # Si hay video_file individual (por compatibilidad), agregarlo a la lista
        if video_file:
            video_files.append(video_file)
        
        # Agregar nuevas imágenes (sin eliminar las existentes)
        if images:
            for i, image in enumerate(images):
                # Verificar si es main_image
                is_main = (main_image and image == main_image) or (i == 0 and not main_image)
                
                PropertyImage.objects.create(
                    property=instance,
                    image=image,
                    is_main=is_main if is_main is not None else False,
                    order=instance.images.count() + i
                )
        
        # MEJORAR LÓGICA DE ARCHIVOS DE VIDEO - evitar duplicación
        # Verificar si se están enviando archivos de video
        has_video_files_data = any(key.startswith('video_') or key == 'video_files' for key in (request.data.keys() if request else []))
        
        # Si se detectan campos de video en el request, solo agregar los nuevos (no eliminar existentes)
        # Los videos existentes se eliminan individualmente mediante la API deleteVideo
        if video_files:
            for i, video in enumerate(video_files):
                if video:  # Solo archivos válidos
                    title_key = f'video_{i}_title'
                    description_key = f'video_{i}_description'
                    
                    title = request.data.get(title_key, f'Video {i+1}') if request else 'Video Actualizado'
                    description = request.data.get(description_key, '') if request else ''
                    
                    PropertyVideo.objects.create(
                        property=instance,
                        video=video,
                        title=title,
                        description=description
                    )
                    print(f"➕ Added video file: {title}")
                else:
                    print(f"⚠️ Skipped empty video file at index {i}")
        
        # MEJORAR LÓGICA DE VIDEOS DE YOUTUBE - evitar duplicación
        # Verificar si se están enviando datos de YouTube (incluso si están vacíos)
        has_youtube_data = any(key.startswith('youtube') for key in (request.data.keys() if request else []))
        
        # Si se detectan campos de YouTube en el request (incluso vacíos), gestionar videos
        if has_youtube_data or youtube_urls:
            # Eliminar todos los videos de YouTube existentes
            PropertyVideo.objects.filter(property=instance, youtube_url__isnull=False).delete()
            print(f"🗑️ Deleted existing YouTube videos for property {instance.id}")
        
        # Agregar solo las URLs de YouTube válidas
        if youtube_urls:
            for i, youtube_url in enumerate(youtube_urls):
                if youtube_url and youtube_url.strip():  # Solo URLs no vacías
                    title_key = f'youtube_{i}_title'
                    description_key = f'youtube_{i}_description'
                    
                    title = request.data.get(title_key, f'YouTube Video {i+1}') if request else 'YouTube Video Actualizado'
                    description = request.data.get(description_key, '') if request else ''
                    
                    PropertyVideo.objects.create(
                        property=instance,
                        youtube_url=youtube_url.strip(),
                        title=title,
                        description=description
                    )
                    print(f"➕ Added YouTube video: {title}")
                else:
                    print(f"⚠️ Skipped empty YouTube URL at index {i}")
        
        # Logging de actividad (opcional)
        if request and hasattr(request, 'user'):
            try:
                from core.audit_service import AuditService
                AuditService.log_activity(
                    user=request.user,
                    action_type='property_updated',
                    resource_type='property',
                    resource_id=instance.id,
                    metadata={
                        'property_title': instance.title,
                        'property_type': instance.property_type,
                        'new_images_count': len(images),
                        'new_videos_count': len(video_files) + len(youtube_urls)
                    }
                )
            except Exception as e:
                # Log pero no fallar si hay problemas con auditoría
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Error logging property update: {e}")
        
        return instance


class OptimizedPropertyFavoriteSerializer(serializers.ModelSerializer):
    """Optimized PropertyFavorite serializer with prefetched property data."""
    
    property = OptimizedPropertyListSerializer(read_only=True)
    
    class Meta:
        model = PropertyFavorite
        fields = ['id', 'property', 'created_at']
        read_only_fields = ['id', 'created_at']


class OptimizedPropertyInquirySerializer(serializers.ModelSerializer):
    """Optimized PropertyInquiry serializer."""
    
    inquirer = serializers.SerializerMethodField()
    property_title = serializers.CharField(source='property.title', read_only=True)
    
    class Meta:
        model = PropertyInquiry
        fields = [
            'id', 'message', 'inquirer', 'property_title', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'inquirer', 'created_at', 'updated_at']
    
    def get_inquirer(self, obj):
        """Use prefetched inquirer data."""
        if hasattr(obj.inquirer, 'tenant_profile') and obj.inquirer.tenant_profile:
            return {
                'id': obj.inquirer.id,
                'name': f"{obj.inquirer.first_name} {obj.inquirer.last_name}",
                'email': obj.inquirer.email,
                'phone': obj.inquirer.tenant_profile.phone_number,
                'verified': obj.inquirer.tenant_profile.verified
            }
        return {
            'id': obj.inquirer.id,
            'name': f"{obj.inquirer.first_name} {obj.inquirer.last_name}",
            'email': obj.inquirer.email
        }


# Export the optimized serializers
PropertySerializer = OptimizedPropertySerializer
PropertyListSerializer = OptimizedPropertyListSerializer
PropertyDetailSerializer = OptimizedPropertyDetailSerializer
CreatePropertySerializer = OptimizedCreatePropertySerializer
UpdatePropertySerializer = OptimizedUpdatePropertySerializer
PropertyFavoriteSerializer = OptimizedPropertyFavoriteSerializer
PropertyInquirySerializer = OptimizedPropertyInquirySerializer