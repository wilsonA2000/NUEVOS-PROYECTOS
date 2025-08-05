"""
Serializers para la aplicación de usuarios de VeriHome.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import LandlordProfile, TenantProfile, ServiceProviderProfile, UserResume, UserSettings, InterviewCode, PortfolioItem

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer para usuarios."""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'full_name', 'user_type', 'is_verified', 'phone_number')
        read_only_fields = ('id', 'is_verified')
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer para actualización de perfil de usuario."""
    
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'phone_number')
        read_only_fields = ('email',)


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer para registro de usuarios con creación automática de perfiles."""
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)
    interview_code = serializers.CharField(write_only=True, max_length=12)
    terms_accepted = serializers.BooleanField(write_only=True)
    privacy_policy_accepted = serializers.BooleanField(write_only=True)
    
    # Campos del modelo User
    class Meta:
        model = User
        fields = (
            'email', 'password', 'password2', 'first_name', 'last_name', 'user_type', 
            'phone_number', 'whatsapp', 'date_of_birth', 'gender', 'nationality', 
            'marital_status', 'country', 'state', 'city', 'postal_code',
            'employment_status', 'monthly_income', 'currency', 'employer_name', 
            'job_title', 'years_employed', 'source', 'marketing_consent',
            'interview_code', 'terms_accepted', 'privacy_policy_accepted'
        )
    
    def validate(self, attrs):
        """Validación de datos de registro."""
        # Validar contraseñas
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                'password2': 'Las contraseñas no coinciden.'
            })
        
        # Validar términos y condiciones
        if not attrs.get('terms_accepted'):
            raise serializers.ValidationError({
                'terms_accepted': 'Debes aceptar los términos y condiciones.'
            })
        
        if not attrs.get('privacy_policy_accepted'):
            raise serializers.ValidationError({
                'privacy_policy_accepted': 'Debes aceptar la política de privacidad.'
            })
        
        # Validar código de entrevista (sin marcarlo como usado aquí)
        interview_code = attrs.get('interview_code')
        if interview_code:
            try:
                code_obj = InterviewCode.objects.get(
                    interview_code=interview_code,
                    candidate_email=attrs['email'],
                    status='active'
                )
                # NO marcar como usado aquí, se hará en la vista
            except InterviewCode.DoesNotExist:
                raise serializers.ValidationError({
                    'interview_code': 'Código de entrevista inválido o ya utilizado.'
                })
        
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        """Crear usuario y perfil específico en una transacción."""
        # Separar campos del User de campos de perfil
        user_fields = {
            'email', 'password', 'first_name', 'last_name', 'user_type',
            'phone_number', 'whatsapp', 'date_of_birth', 'gender', 'nationality',
            'marital_status', 'country', 'state', 'city', 'postal_code',
            'employment_status', 'monthly_income', 'currency', 'employer_name',
            'job_title', 'years_employed', 'source', 'marketing_consent'
        }
        
        # Extraer datos para el usuario
        user_data = {k: v for k, v in validated_data.items() if k in user_fields}
        
        # Remover campos que no van al modelo User
        user_data.pop('password2', None)
        user_data.pop('interview_code', None)
        user_data.pop('terms_accepted', None)
        user_data.pop('privacy_policy_accepted', None)
        
        # Crear el usuario
        user = User.objects.create_user(**user_data)
        
        # Crear perfil específico según el tipo de usuario
        user_type = user.user_type
        
        if user_type == 'landlord':
            self._create_landlord_profile(user, validated_data)
        elif user_type == 'tenant':
            self._create_tenant_profile(user, validated_data)
        elif user_type == 'service_provider':
            self._create_service_provider_profile(user, validated_data)
        
        # Crear configuración de usuario por defecto
        UserSettings.objects.create(user=user)
        
        return user
    
    def _create_landlord_profile(self, user, data):
        """Crear perfil de arrendador solo con campos válidos."""
        model_fields = set(f.name for f in LandlordProfile._meta.get_fields())
        landlord_data = {k: v for k, v in data.items() if k in model_fields and k != 'user'}
        LandlordProfile.objects.create(user=user, **landlord_data)
    
    def _create_tenant_profile(self, user, data):
        """Crear perfil de arrendatario solo con campos válidos."""
        model_fields = set(f.name for f in TenantProfile._meta.get_fields())
        tenant_data = {k: v for k, v in data.items() if k in model_fields and k != 'user'}
        TenantProfile.objects.create(user=user, **tenant_data)
    
    def _create_service_provider_profile(self, user, data):
        """Crear perfil de prestador de servicios solo con campos válidos."""
        model_fields = set(f.name for f in ServiceProviderProfile._meta.get_fields())
        provider_data = {k: v for k, v in data.items() if k in model_fields and k != 'user'}
        ServiceProviderProfile.objects.create(user=user, **provider_data)


class InterviewCodeVerificationSerializer(serializers.Serializer):
    """Serializer para verificación de códigos de entrevista."""
    code = serializers.CharField(max_length=12)
    email = serializers.EmailField()


class UserResumeSerializer(serializers.ModelSerializer):
    """Serializer para la hoja de vida del usuario."""
    
    class Meta:
        model = UserResume
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')


class UserSettingsSerializer(serializers.ModelSerializer):
    """Serializer para los ajustes del usuario."""
    
    class Meta:
        model = UserSettings
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')


class LandlordProfileSerializer(serializers.ModelSerializer):
    """Serializer para perfiles de arrendadores."""
    
    class Meta:
        model = LandlordProfile
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')


class TenantProfileSerializer(serializers.ModelSerializer):
    """Serializer para perfiles de arrendatarios."""
    
    class Meta:
        model = TenantProfile
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')


class ServiceProviderProfileSerializer(serializers.ModelSerializer):
    """Serializer para perfiles de prestadores de servicios."""
    
    class Meta:
        model = ServiceProviderProfile
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')


class InterviewCodeSerializer(serializers.ModelSerializer):
    """Serializer para códigos de entrevista."""
    
    class Meta:
        model = InterviewCode
        fields = '__all__'
        read_only_fields = ('id', 'code', 'created_at')


class UserCompleteProfileSerializer(serializers.ModelSerializer):
    """Serializer completo para el perfil del usuario con toda su información."""
    landlord_profile = LandlordProfileSerializer(read_only=True)
    tenant_profile = TenantProfileSerializer(read_only=True)
    service_provider_profile = ServiceProviderProfileSerializer(read_only=True)
    user_settings = UserSettingsSerializer(read_only=True)
    user_resume = UserResumeSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name', 'user_type',
            'phone_number', 'whatsapp', 'date_of_birth', 'gender', 'nationality',
            'marital_status', 'country', 'state', 'city', 'postal_code',
            'employment_status', 'monthly_income', 'currency', 'employer_name',
            'job_title', 'years_employed', 'is_verified',
            'verification_date', 'date_joined', 'last_login',
            'landlord_profile', 'tenant_profile', 'service_provider_profile',
            'user_settings', 'user_resume'
        ]
        read_only_fields = ['id', 'email', 'is_verified', 'verification_date', 'date_joined', 'last_login']
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class PortfolioItemSerializer(serializers.ModelSerializer):
    """Serializer para elementos del portafolio de prestadores de servicios."""
    
    class Meta:
        model = PortfolioItem
        fields = '__all__'
        read_only_fields = ('id', 'created_at') 