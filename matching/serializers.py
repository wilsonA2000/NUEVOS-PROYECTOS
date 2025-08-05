"""
Serializers para el sistema de matching de VeriHome.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import MatchRequest, MatchCriteria, MatchNotification, MatchAnalytics

User = get_user_model()


class MatchRequestSerializer(serializers.ModelSerializer):
    """Serializer básico para solicitudes de match."""
    
    property_title = serializers.CharField(source='property.title', read_only=True)
    property_city = serializers.CharField(source='property.city', read_only=True)
    property_rent_price = serializers.DecimalField(source='property.rent_price', max_digits=10, decimal_places=2, read_only=True)
    tenant_name = serializers.CharField(source='tenant.get_full_name', read_only=True)
    landlord_name = serializers.CharField(source='landlord.get_full_name', read_only=True)
    compatibility_score = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    can_follow_up = serializers.SerializerMethodField()
    
    class Meta:
        model = MatchRequest
        fields = [
            'id', 'match_code', 'status', 'priority', 'created_at', 'viewed_at', 
            'responded_at', 'expires_at', 'property_title', 'property_city', 
            'property_rent_price', 'tenant_name', 'landlord_name', 
            'compatibility_score', 'is_expired', 'can_follow_up', 'follow_up_count'
        ]
        read_only_fields = ['id', 'match_code', 'created_at', 'viewed_at', 'responded_at']
    
    def get_compatibility_score(self, obj):
        return obj.get_compatibility_score()
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_can_follow_up(self, obj):
        return obj.can_follow_up()


class MatchRequestDetailSerializer(serializers.ModelSerializer):
    """Serializer detallado para solicitudes de match."""
    
    property = serializers.SerializerMethodField()
    tenant = serializers.SerializerMethodField()
    landlord = serializers.SerializerMethodField()
    compatibility_analysis = serializers.SerializerMethodField()
    
    class Meta:
        model = MatchRequest
        fields = [
            'id', 'match_code', 'status', 'priority', 'tenant_message', 
            'tenant_phone', 'tenant_email', 'monthly_income', 'employment_type',
            'preferred_move_in_date', 'lease_duration_months', 'has_rental_references',
            'has_employment_proof', 'has_credit_check', 'number_of_occupants',
            'has_pets', 'pet_details', 'smoking_allowed', 'landlord_response',
            'created_at', 'viewed_at', 'responded_at', 'expires_at',
            'follow_up_count', 'last_follow_up', 'property', 'tenant', 'landlord',
            'compatibility_analysis'
        ]
        read_only_fields = [
            'id', 'match_code', 'created_at', 'viewed_at', 'responded_at',
            'follow_up_count', 'last_follow_up'
        ]
    
    def get_property(self, obj):
        property = obj.property
        return {
            'id': str(property.id),
            'title': property.title,
            'description': property.description,
            'rent_price': property.rent_price,
            'sale_price': property.sale_price,
            'property_type': property.property_type,
            'listing_type': property.listing_type,
            'bedrooms': property.bedrooms,
            'bathrooms': property.bathrooms,
            'total_area': property.total_area,
            'city': property.city,
            'state': property.state,
            'full_address': property.full_address,
            'pets_allowed': property.pets_allowed,
            'parking_spaces': property.parking_spaces,
            'main_image': property.get_main_image(),
            'status': property.status
        }
    
    def get_tenant(self, obj):
        tenant = obj.tenant
        return {
            'id': str(tenant.id),
            'name': tenant.get_full_name(),
            'email': tenant.email,
            'phone_number': tenant.phone_number,
            'user_type': tenant.user_type
        }
    
    def get_landlord(self, obj):
        landlord = obj.landlord
        return {
            'id': str(landlord.id),
            'name': landlord.get_full_name(),
            'email': landlord.email,
            'phone_number': landlord.phone_number,
            'user_type': landlord.user_type
        }
    
    def get_compatibility_analysis(self, obj):
        from .utils import calculate_match_compatibility
        return calculate_match_compatibility(obj)


class CreateMatchRequestSerializer(serializers.ModelSerializer):
    """Serializer para crear solicitudes de match."""
    
    class Meta:
        model = MatchRequest
        fields = [
            'property', 'tenant_message', 'tenant_phone', 'tenant_email',
            'monthly_income', 'employment_type', 'preferred_move_in_date',
            'lease_duration_months', 'has_rental_references', 'has_employment_proof',
            'has_credit_check', 'number_of_occupants', 'has_pets', 'pet_details',
            'smoking_allowed', 'priority'
        ]
    
    def validate_property(self, value):
        """Valida que la propiedad esté disponible."""
        if not value.is_active or value.status != 'available':
            raise serializers.ValidationError("Esta propiedad no está disponible")
        return value
    
    def validate_tenant_message(self, value):
        """Valida que el mensaje no esté vacío."""
        if not value or len(value.strip()) < 10:
            raise serializers.ValidationError("El mensaje debe tener al menos 10 caracteres")
        return value
    
    def validate_monthly_income(self, value):
        """Valida que los ingresos sean razonables."""
        if value and value < 0:
            raise serializers.ValidationError("Los ingresos no pueden ser negativos")
        return value
    
    def validate_lease_duration_months(self, value):
        """Valida la duración del contrato."""
        if value < 1 or value > 60:
            raise serializers.ValidationError("La duración del contrato debe estar entre 1 y 60 meses")
        return value
    
    def validate_number_of_occupants(self, value):
        """Valida el número de ocupantes."""
        if value < 1 or value > 20:
            raise serializers.ValidationError("El número de ocupantes debe estar entre 1 y 20")
        return value


class MatchCriteriaSerializer(serializers.ModelSerializer):
    """Serializer para criterios de matching."""
    
    matching_properties_count = serializers.SerializerMethodField()
    
    class Meta:
        model = MatchCriteria
        fields = [
            'id', 'preferred_cities', 'max_distance_km', 'min_price', 'max_price',
            'property_types', 'min_bedrooms', 'min_bathrooms', 'min_area',
            'required_amenities', 'pets_required', 'smoking_required',
            'furnished_required', 'parking_required', 'auto_apply_enabled',
            'notification_frequency', 'created_at', 'updated_at', 'last_search',
            'matching_properties_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_search']
    
    def get_matching_properties_count(self, obj):
        """Obtiene el número de propiedades que coinciden con los criterios."""
        try:
            return obj.find_matching_properties().count()
        except:
            return 0
    
    def validate_max_price(self, value):
        """Valida que el precio máximo sea razonable."""
        if value and value <= 0:
            raise serializers.ValidationError("El precio máximo debe ser mayor a 0")
        return value
    
    def validate_min_price(self, value):
        """Valida que el precio mínimo sea razonable."""
        if value and value < 0:
            raise serializers.ValidationError("El precio mínimo no puede ser negativo")
        return value
    
    def validate(self, data):
        """Validaciones cruzadas."""
        min_price = data.get('min_price')
        max_price = data.get('max_price')
        
        if min_price and max_price and min_price >= max_price:
            raise serializers.ValidationError("El precio mínimo debe ser menor al precio máximo")
        
        min_bedrooms = data.get('min_bedrooms', 0)
        min_bathrooms = data.get('min_bathrooms', 0)
        
        if min_bedrooms < 0 or min_bathrooms < 0:
            raise serializers.ValidationError("El número de dormitorios y baños no puede ser negativo")
        
        return data


class MatchNotificationSerializer(serializers.ModelSerializer):
    """Serializer para notificaciones de match."""
    
    match_request_code = serializers.CharField(source='match_request.match_code', read_only=True)
    property_title = serializers.CharField(source='match_request.property.title', read_only=True)
    time_since_created = serializers.SerializerMethodField()
    
    class Meta:
        model = MatchNotification
        fields = [
            'id', 'notification_type', 'title', 'message', 'is_read', 'is_sent',
            'metadata', 'created_at', 'read_at', 'sent_at', 'match_request_code',
            'property_title', 'time_since_created'
        ]
        read_only_fields = [
            'id', 'created_at', 'read_at', 'sent_at', 'match_request_code',
            'property_title'
        ]
    
    def get_time_since_created(self, obj):
        """Calcula el tiempo transcurrido desde la creación."""
        from django.utils import timezone
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days > 0:
            return f"Hace {diff.days} día{'s' if diff.days > 1 else ''}"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"Hace {hours} hora{'s' if hours > 1 else ''}"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"Hace {minutes} minuto{'s' if minutes > 1 else ''}"
        else:
            return "Hace unos segundos"


class MatchAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer para analíticas de matching."""
    
    class Meta:
        model = MatchAnalytics
        fields = [
            'date', 'total_requests_created', 'total_requests_viewed',
            'total_requests_accepted', 'total_requests_rejected', 'view_rate',
            'acceptance_rate', 'response_rate', 'avg_response_time_hours',
            'avg_match_score', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class MatchStatisticsSerializer(serializers.Serializer):
    """Serializer para estadísticas de matching del usuario."""
    
    # Estadísticas comunes
    total_sent = serializers.IntegerField(required=False)
    total_received = serializers.IntegerField(required=False)
    pending = serializers.IntegerField()
    viewed = serializers.IntegerField()
    accepted = serializers.IntegerField()
    rejected = serializers.IntegerField()
    expired = serializers.IntegerField()
    response_rate = serializers.FloatField()
    acceptance_rate = serializers.FloatField()
    avg_response_time = serializers.FloatField()
    
    # Campos específicos para arrendatarios
    has_criteria = serializers.BooleanField(required=False)
    auto_apply_enabled = serializers.BooleanField(required=False)
    last_search = serializers.DateTimeField(required=False, allow_null=True)
    
    # Campos específicos para arrendadores
    active_properties = serializers.IntegerField(required=False)
    pending_by_property = serializers.DictField(required=False)


class PropertyMatchSerializer(serializers.Serializer):
    """Serializer para propiedades en resultados de matching."""
    
    property = serializers.DictField()
    match_score = serializers.IntegerField()
    reasons = serializers.ListField(child=serializers.CharField())
    has_applied = serializers.BooleanField()


class TenantRecommendationSerializer(serializers.Serializer):
    """Serializer para recomendaciones de arrendatarios."""
    
    property = serializers.DictField()
    tenant = serializers.DictField()
    compatibility_score = serializers.IntegerField()
    reasons = serializers.ListField(child=serializers.CharField())
    can_contact = serializers.BooleanField()


class MatchActionSerializer(serializers.Serializer):
    """Serializer para acciones de match (aceptar/rechazar)."""
    
    message = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True,
        help_text="Mensaje opcional para el arrendatario"
    )
    
    def validate_message(self, value):
        """Valida el mensaje de respuesta."""
        if value and len(value.strip()) < 5:
            raise serializers.ValidationError("El mensaje debe tener al menos 5 caracteres")
        return value


class DashboardDataSerializer(serializers.Serializer):
    """Serializer para datos del dashboard de matching."""
    
    user_type = serializers.CharField()
    recent_requests = serializers.ListField(child=serializers.DictField())
    unread_notifications = serializers.IntegerField()
    statistics = MatchStatisticsSerializer()
    
    # Campos específicos para arrendatarios
    pending_responses = serializers.IntegerField(required=False)
    potential_matches = serializers.IntegerField(required=False)
    
    # Campos específicos para arrendadores
    pending_requests = serializers.IntegerField(required=False)
    active_properties = serializers.IntegerField(required=False)