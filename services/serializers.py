"""
Serializers para la API de servicios adicionales.
"""

from rest_framework import serializers
from .models import ServiceCategory, Service, ServiceImage, ServiceRequest


class ServiceImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ServiceImage
        fields = ['id', 'image', 'image_url', 'alt_text', 'is_main', 'order']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class ServiceCategorySerializer(serializers.ModelSerializer):
    services_count = serializers.SerializerMethodField()

    class Meta:
        model = ServiceCategory
        fields = [
            'id', 'name', 'slug', 'description', 'icon_name', 'color',
            'order', 'is_featured', 'services_count', 'created_at'
        ]

    def get_services_count(self, obj):
        return obj.services.filter(is_active=True).count()


class ServiceListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listas de servicios."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    main_image = serializers.SerializerMethodField()
    price_display = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            'id', 'name', 'slug', 'short_description', 'category_name', 
            'category_color', 'pricing_type', 'price_display', 'difficulty',
            'estimated_duration', 'popularity_score', 'is_featured', 
            'is_most_requested', 'main_image', 'views_count', 'requests_count'
        ]

    def get_main_image(self, obj):
        main_image = obj.images.filter(is_main=True).first()
        if main_image:
            return ServiceImageSerializer(main_image, context=self.context).data
        return None

    def get_price_display(self, obj):
        return obj.get_price_display()


class ServiceDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalles de servicios."""
    category = ServiceCategorySerializer(read_only=True)
    images = ServiceImageSerializer(many=True, read_only=True)
    price_display = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            'id', 'name', 'slug', 'short_description', 'full_description',
            'category', 'pricing_type', 'base_price', 'price_range_min', 
            'price_range_max', 'price_display', 'difficulty', 'estimated_duration',
            'requirements', 'provider_info', 'contact_email', 'contact_phone',
            'popularity_score', 'views_count', 'requests_count', 'is_featured',
            'is_most_requested', 'images', 'created_at', 'updated_at'
        ]

    def get_price_display(self, obj):
        return obj.get_price_display()


class CreateServiceRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = [
            'service', 'requester_name', 'requester_email', 'requester_phone',
            'message', 'preferred_date', 'budget_range'
        ]

    def create(self, validated_data):
        service_request = super().create(validated_data)
        # Incrementar contador de solicitudes del servicio
        service_request.service.increment_requests()
        return service_request


class ServiceRequestSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    category_name = serializers.CharField(source='service.category.name', read_only=True)

    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'service', 'service_name', 'category_name', 'requester_name',
            'requester_email', 'requester_phone', 'message', 'preferred_date',
            'budget_range', 'status', 'admin_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['admin_notes', 'status']


class ServiceStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de servicios."""
    total_services = serializers.IntegerField()
    total_categories = serializers.IntegerField()
    featured_services = serializers.IntegerField()
    most_requested_services = serializers.IntegerField()
    total_requests = serializers.IntegerField()
    pending_requests = serializers.IntegerField()
    categories_stats = serializers.ListField()
    popular_services = ServiceListSerializer(many=True, read_only=True)