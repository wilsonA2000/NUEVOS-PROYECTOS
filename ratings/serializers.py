"""
Serializadores para la API de calificaciones de VeriHome.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Rating, RatingCategory, RatingResponse, RatingReport, UserRatingProfile

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Serializador básico para información de usuario."""
    
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'full_name', 'user_type', 'is_verified']
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class RatingCategorySerializer(serializers.ModelSerializer):
    """Serializador para categorías de calificación."""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = RatingCategory
        fields = ['id', 'rating', 'category', 'category_display', 'score', 'notes']
        read_only_fields = ['id']


class RatingResponseSerializer(serializers.ModelSerializer):
    """Serializador para respuestas a calificaciones."""
    
    responder = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = RatingResponse
        fields = ['id', 'rating', 'responder', 'response_text', 'is_public', 'created_at']
        read_only_fields = ['id', 'rating', 'responder', 'created_at']


class RatingReportSerializer(serializers.ModelSerializer):
    """Serializador para reportes de calificaciones."""
    
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    reporter = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = RatingReport
        fields = ['id', 'rating', 'reporter', 'reason', 'reason_display', 'description', 'status', 'created_at']
        read_only_fields = ['id', 'rating', 'reporter', 'status', 'created_at']


class RatingSerializer(serializers.ModelSerializer):
    """Serializador para calificaciones (versión lista)."""
    
    reviewer = UserBasicSerializer(read_only=True)
    reviewee = UserBasicSerializer(read_only=True)
    rating_type_display = serializers.CharField(source='get_rating_type_display', read_only=True)
    stars_display = serializers.CharField(source='get_stars_display', read_only=True)
    has_response = serializers.SerializerMethodField()
    
    class Meta:
        model = Rating
        fields = [
            'id', 'reviewer', 'reviewee', 'rating_type', 'rating_type_display',
            'overall_rating', 'stars_display', 'title', 'review_text',
            'is_anonymous', 'is_public', 'is_verified', 'created_at',
            'has_response'
        ]
        read_only_fields = ['id', 'reviewer', 'rating_type', 'created_at', 'is_verified']
    
    def get_has_response(self, obj):
        return hasattr(obj, 'response')


class RatingDetailSerializer(serializers.ModelSerializer):
    """Serializador para calificaciones (versión detallada)."""
    
    reviewer = UserBasicSerializer(read_only=True)
    reviewee = UserBasicSerializer(read_only=True)
    rating_type_display = serializers.CharField(source='get_rating_type_display', read_only=True)
    stars_display = serializers.CharField(source='get_stars_display', read_only=True)
    categories = RatingCategorySerializer(source='category_ratings', many=True, read_only=True)
    response = RatingResponseSerializer(read_only=True)
    
    class Meta:
        model = Rating
        fields = [
            'id', 'reviewer', 'reviewee', 'rating_type', 'rating_type_display',
            'overall_rating', 'stars_display', 'title', 'review_text',
            'is_anonymous', 'is_public', 'is_verified', 'created_at',
            'categories', 'response', 'contract', 'property'
        ]
        read_only_fields = [
            'id', 'reviewer', 'reviewee', 'rating_type', 'created_at',
            'is_verified', 'contract', 'property'
        ]


class UserRatingProfileSerializer(serializers.ModelSerializer):
    """Serializador para perfiles de calificaciones de usuarios."""
    
    user = UserBasicSerializer(read_only=True)
    badges_display = serializers.ListField(source='get_badge_display', read_only=True)
    
    class Meta:
        model = UserRatingProfile
        fields = [
            'id', 'user', 'total_ratings_received', 'average_rating',
            'ratings_distribution', 'category_averages', 'badges', 'badges_display',
            'landlord_rating', 'tenant_rating', 'service_provider_rating',
            'last_updated'
        ]
        read_only_fields = ['id', 'user', 'last_updated']