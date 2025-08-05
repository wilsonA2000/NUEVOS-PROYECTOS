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
            'nearby_amenities', 'transportation'
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


class OptimizedUpdatePropertySerializer(OptimizedCreatePropertySerializer):
    """Optimized serializer for property updates."""
    
    class Meta(OptimizedCreatePropertySerializer.Meta):
        fields = OptimizedCreatePropertySerializer.Meta.fields + ['status']


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