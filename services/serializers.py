"""
Serializers para la API de servicios adicionales.
"""

from rest_framework import serializers
from .models import SubscriptionPlan, ServiceSubscription, SubscriptionBillingHistory
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
    provider_name = serializers.CharField(source='provider.get_full_name', read_only=True, default='')
    main_image = serializers.SerializerMethodField()
    price_display = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            'id', 'name', 'slug', 'short_description', 'category', 'category_name',
            'category_color', 'pricing_type', 'price_display', 'difficulty',
            'estimated_duration', 'popularity_score', 'is_featured',
            'is_most_requested', 'main_image', 'views_count', 'requests_count',
            'provider', 'provider_name',
        ]
        read_only_fields = ['id', 'slug', 'provider', 'popularity_score', 'views_count', 'requests_count']

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
    provider_name = serializers.CharField(source='provider.get_full_name', read_only=True, default='')
    provider_email = serializers.EmailField(source='provider.email', read_only=True, default='')

    class Meta:
        model = Service
        fields = [
            'id', 'name', 'slug', 'short_description', 'full_description',
            'category', 'pricing_type', 'base_price', 'price_range_min',
            'price_range_max', 'price_display', 'difficulty', 'estimated_duration',
            'requirements', 'provider', 'provider_name', 'provider_email',
            'provider_info', 'contact_email', 'contact_phone',
            'popularity_score', 'views_count', 'requests_count', 'is_featured',
            'is_most_requested', 'images', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'provider', 'popularity_score', 'views_count', 'requests_count']

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


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=0, read_only=True)
    billing_cycle_display = serializers.CharField(source='get_billing_cycle_display', read_only=True)

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'slug', 'description', 'billing_cycle', 'billing_cycle_display',
            'price', 'discount_percentage', 'effective_price',
            'max_active_services', 'max_monthly_requests',
            'featured_listing', 'priority_in_search', 'verified_badge',
            'access_to_analytics', 'direct_messaging', 'payment_gateway_access',
            'is_active', 'is_recommended', 'sort_order',
        ]


class SubscriptionBillingHistorySerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SubscriptionBillingHistory
        fields = ['id', 'amount', 'billing_date', 'payment_method', 'transaction_ref', 'status', 'status_display', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


class ServiceSubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_price = serializers.DecimalField(source='plan.price', max_digits=10, decimal_places=0, read_only=True)
    provider_name = serializers.CharField(source='service_provider.get_full_name', read_only=True)
    provider_email = serializers.EmailField(source='service_provider.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    can_publish_service = serializers.BooleanField(read_only=True)
    can_receive_requests = serializers.BooleanField(read_only=True)
    billing_history = SubscriptionBillingHistorySerializer(many=True, read_only=True)

    class Meta:
        model = ServiceSubscription
        fields = [
            'id', 'service_provider', 'provider_name', 'provider_email',
            'plan', 'plan_name', 'plan_price',
            'status', 'status_display',
            'start_date', 'end_date', 'trial_end_date', 'next_billing_date',
            'auto_renew', 'cancelled_at',
            'services_published', 'requests_this_month',
            'is_valid', 'can_publish_service', 'can_receive_requests',
            'billing_history',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'services_published', 'requests_this_month', 'created_at', 'updated_at']