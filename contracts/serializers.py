"""
Serializers para la aplicación de contratos de VeriHome.
"""

from rest_framework import serializers
from django.utils import timezone
from .models import (
    Contract, ContractTemplate, ContractSignature, ContractAmendment,
    ContractRenewal, ContractTermination, ContractDocument,
    ColombianContract, LegalClause, BiometricAuthentication
)


class ContractTemplateSerializer(serializers.ModelSerializer):
    """Serializer para plantillas de contratos."""
    
    class Meta:
        model = ContractTemplate
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at')


class ContractSignatureSerializer(serializers.ModelSerializer):
    """Serializer para firmas de contratos."""
    
    class Meta:
        model = ContractSignature
        fields = '__all__'
        read_only_fields = ('signed_at', 'verification_hash')


class ContractAmendmentSerializer(serializers.ModelSerializer):
    """Serializer para enmiendas de contratos."""
    
    class Meta:
        model = ContractAmendment
        fields = '__all__'
        read_only_fields = ('created_at', 'approved_at')


class ContractRenewalSerializer(serializers.ModelSerializer):
    """Serializer para renovaciones de contratos."""
    
    class Meta:
        model = ContractRenewal
        fields = '__all__'
        read_only_fields = ('requested_at', 'responded_at', 'executed_at')


class ContractTerminationSerializer(serializers.ModelSerializer):
    """Serializer para terminaciones de contratos."""
    
    class Meta:
        model = ContractTermination
        fields = '__all__'
        read_only_fields = ('created_at', 'approved_at')


class ContractDocumentSerializer(serializers.ModelSerializer):
    """Serializer para documentos de contratos."""
    
    class Meta:
        model = ContractDocument
        fields = '__all__'
        read_only_fields = ('uploaded_by', 'uploaded_at', 'file_size')


class ContractSerializer(serializers.ModelSerializer):
    """Serializer para contratos."""
    
    signatures = ContractSignatureSerializer(many=True, read_only=True)
    amendments = ContractAmendmentSerializer(many=True, read_only=True)
    documents = ContractDocumentSerializer(many=True, read_only=True)
    
    # Información detallada de la propiedad
    property = serializers.SerializerMethodField()
    
    # Información de los usuarios involucrados
    landlord = serializers.SerializerMethodField()
    tenant = serializers.SerializerMethodField()
    
    class Meta:
        model = Contract
        fields = '__all__'
        read_only_fields = ('id', 'contract_number', 'created_at', 'updated_at')
    
    def get_property(self, obj):
        """Obtiene información detallada de la propiedad."""
        try:
            if hasattr(obj, 'property') and obj.property:
                property_obj = obj.property
                return {
                    'id': str(property_obj.id),
                    'title': getattr(property_obj, 'title', ''),
                    'address': getattr(property_obj, 'address', ''),
                    'rent_price': float(property_obj.rent_price) if getattr(property_obj, 'rent_price', None) else 0,
                    'main_image': property_obj.main_image.url if getattr(property_obj, 'main_image', None) else None,
                    'property_type': getattr(property_obj, 'property_type', ''),
                    'bedrooms': getattr(property_obj, 'bedrooms', 0),
                    'bathrooms': getattr(property_obj, 'bathrooms', 0),
                    'area': float(property_obj.area) if getattr(property_obj, 'area', None) else 0,
                }
        except Exception as e:
            # Log el error pero no fallar la serialización
            print(f"Error en get_property: {e}")
        return None
    
    def get_landlord(self, obj):
        """Obtiene información del arrendador."""
        try:
            if hasattr(obj, 'primary_party') and obj.primary_party:
                user = obj.primary_party
                return {
                    'id': str(user.id),
                    'name': user.get_full_name() or getattr(user, 'email', ''),
                    'email': getattr(user, 'email', ''),
                    'phone': getattr(user, 'phone', None),
                    'user_type': getattr(user, 'user_type', None),
                }
        except Exception as e:
            print(f"Error en get_landlord: {e}")
        return None
    
    def get_tenant(self, obj):
        """Obtiene información del inquilino."""
        try:
            if hasattr(obj, 'secondary_party') and obj.secondary_party:
                user = obj.secondary_party
                return {
                    'id': str(user.id),
                    'name': user.get_full_name() or getattr(user, 'email', ''),
                    'email': getattr(user, 'email', ''),
                    'phone': getattr(user, 'phone', None),
                    'user_type': getattr(user, 'user_type', None),
                }
        except Exception as e:
            print(f"Error en get_tenant: {e}")
        return None
    
    def create(self, validated_data):
        """Asigna automáticamente el usuario que crea el contrato."""
        validated_data['primary_party'] = self.context['request'].user
        return super().create(validated_data)


class CreateContractSerializer(serializers.ModelSerializer):
    """Serializer para crear contratos."""
    
    class Meta:
        model = Contract
        fields = [
            'contract_type', 'template', 'secondary_party', 'title', 'description',
            'content', 'start_date', 'end_date', 'is_renewable', 'auto_renewal_notice_days',
            'monthly_rent', 'security_deposit', 'late_fee', 'property', 'variables_data'
        ]
    
    def create(self, validated_data):
        """Asigna automáticamente el usuario que crea el contrato."""
        validated_data['primary_party'] = self.context['request'].user
        return super().create(validated_data)


class UpdateContractSerializer(serializers.ModelSerializer):
    """Serializer para actualizar contratos."""
    
    class Meta:
        model = Contract
        fields = [
            'title', 'description', 'content', 'start_date', 'end_date',
            'is_renewable', 'auto_renewal_notice_days', 'monthly_rent',
            'security_deposit', 'late_fee', 'variables_data'
        ]
        read_only_fields = ('contract_type', 'primary_party', 'secondary_party', 'property')


class ContractStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de contratos."""
    
    total_contracts = serializers.IntegerField()
    active_contracts = serializers.IntegerField()
    pending_signatures = serializers.IntegerField()
    expiring_soon = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2)


class LegalClauseSerializer(serializers.ModelSerializer):
    """Serializer para cláusulas legales."""
    
    class Meta:
        model = LegalClause
        fields = '__all__'
        read_only_fields = ('id',)


class ColombianContractSerializer(serializers.ModelSerializer):
    """Serializer para contratos colombianos."""
    
    match_code = serializers.CharField(source='match_request.match_code', read_only=True)
    property_title = serializers.CharField(source='match_request.property.title', read_only=True)
    tenant_name = serializers.CharField(source='match_request.tenant.get_full_name', read_only=True)
    landlord_name = serializers.CharField(source='match_request.property.landlord.get_full_name', read_only=True)
    can_be_signed = serializers.SerializerMethodField()
    contract_progress = serializers.SerializerMethodField()
    
    class Meta:
        model = ColombianContract
        fields = '__all__'
        read_only_fields = (
            'id', 'match_code', 'property_title', 'tenant_name', 'landlord_name',
            'created_at', 'signed_at', 'notarized_at'
        )
    
    def get_can_be_signed(self, obj):
        """Verifica si el contrato puede ser firmado."""
        return obj.status in ['PENDING_SIG', 'PARTIAL_SIG'] and obj.landlord_verified and obj.tenant_verified
    
    def get_contract_progress(self, obj):
        """Obtiene el progreso del contrato."""
        stages = {
            'DRAFT': 10,
            'PENDING_VER': 25,
            'PENDING_SIG': 50,
            'PARTIAL_SIG': 75,
            'SIGNED': 90,
            'NOTARIZED': 95,
            'ACTIVE': 100
        }
        return stages.get(obj.status, 0)
    
    def validate_match_request(self, value):
        """Valida que el match esté aceptado."""
        if value.status != 'accepted':
            raise serializers.ValidationError("Solo se pueden crear contratos desde matches aceptados")
        if hasattr(value, 'contract'):
            raise serializers.ValidationError("Este match ya tiene un contrato asociado")
        return value


class CreateColombianContractSerializer(serializers.ModelSerializer):
    """Serializer para crear contratos colombianos desde match."""
    
    class Meta:
        model = ColombianContract
        fields = [
            'match_request', 'contract_type', 'landlord_id_type', 'landlord_id_number',
            'tenant_id_type', 'tenant_id_number', 'monthly_rent', 'security_deposit',
            'administration_fee', 'start_date', 'end_date', 'payment_due_day',
            'late_payment_fee', 'special_clauses'
        ]
    
    def create(self, validated_data):
        """Crea contrato y actualiza el match."""
        contract = super().create(validated_data)
        
        # Actualizar el match
        match_request = validated_data['match_request']
        match_request.has_contract = True
        match_request.contract_generated_at = timezone.now()
        match_request.save()
        
        return contract


class ContractValidationSerializer(serializers.Serializer):
    """Serializer para validación de contratos."""
    
    can_create_contract = serializers.BooleanField()
    validation_errors = serializers.ListField(child=serializers.CharField(), required=False)
    missing_requirements = serializers.ListField(child=serializers.CharField(), required=False)
    compatibility_score = serializers.IntegerField()
    estimated_monthly_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)


# ===================================================================
# SERIALIZERS PARA AUTENTICACIÓN BIOMÉTRICA
# ===================================================================

class BiometricAuthenticationSerializer(serializers.ModelSerializer):
    """Serializer completo para autenticación biométrica."""
    
    progress_percentage = serializers.SerializerMethodField()
    is_complete = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    contract_number = serializers.SerializerMethodField()
    user_full_name = serializers.SerializerMethodField()
    completed_steps = serializers.SerializerMethodField()
    
    class Meta:
        model = BiometricAuthentication
        fields = [
            'id', 'contract', 'user', 'status', 'document_type', 'document_number',
            'document_expiry_date', 'face_confidence_score', 'document_confidence_score',
            'voice_confidence_score', 'overall_confidence_score', 'voice_text',
            'ip_address', 'device_info', 'geolocation', 'started_at', 'completed_at',
            'expires_at', 'security_checks', 'integrity_hash',
            # Campos calculados
            'progress_percentage', 'is_complete', 'is_expired', 'contract_number',
            'user_full_name', 'completed_steps'
        ]
        read_only_fields = [
            'id', 'started_at', 'completed_at', 'expires_at', 'voice_text',
            'face_confidence_score', 'document_confidence_score', 'voice_confidence_score',
            'overall_confidence_score', 'security_checks', 'integrity_hash'
        ]
    
    def get_progress_percentage(self, obj):
        """Obtiene el porcentaje de progreso."""
        return obj.get_progress_percentage()
    
    def get_is_complete(self, obj):
        """Verifica si está completa."""
        return obj.is_complete()
    
    def get_is_expired(self, obj):
        """Verifica si ha expirado."""
        return obj.is_expired()
    
    def get_contract_number(self, obj):
        """Obtiene el número de contrato."""
        return obj.contract.contract_number
    
    def get_user_full_name(self, obj):
        """Obtiene el nombre completo del usuario."""
        return f"{obj.user.first_name} {obj.user.last_name}"
    
    def get_completed_steps(self, obj):
        """Obtiene los pasos completados."""
        return {
            'face_front': bool(obj.face_front_image),
            'face_side': bool(obj.face_side_image),
            'document': bool(obj.document_image),
            'combined': bool(obj.document_with_face_image),
            'voice': bool(obj.voice_recording)
        }


class BiometricAuthenticationCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear autenticación biométrica."""
    
    class Meta:
        model = BiometricAuthentication
        fields = [
            'contract', 'user', 'document_type', 'document_number',
            'document_expiry_date', 'ip_address', 'device_info', 'geolocation'
        ]


class BiometricAuthenticationStatusSerializer(serializers.ModelSerializer):
    """Serializer simplificado para consultar estado."""
    
    progress_percentage = serializers.SerializerMethodField()
    is_complete = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    completed_steps = serializers.SerializerMethodField()
    contract_status = serializers.SerializerMethodField()
    
    class Meta:
        model = BiometricAuthentication
        fields = [
            'id', 'status', 'overall_confidence_score', 'face_confidence_score',
            'document_confidence_score', 'voice_confidence_score', 'voice_text',
            'started_at', 'completed_at', 'expires_at',
            # Campos calculados
            'progress_percentage', 'is_complete', 'is_expired', 'completed_steps',
            'contract_status'
        ]
    
    def get_progress_percentage(self, obj):
        return obj.get_progress_percentage()
    
    def get_is_complete(self, obj):
        return obj.is_complete()
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_completed_steps(self, obj):
        return {
            'face_front': bool(obj.face_front_image),
            'face_side': bool(obj.face_side_image),
            'document': bool(obj.document_image),
            'combined': bool(obj.document_with_face_image),
            'voice': bool(obj.voice_recording)
        }
    
    def get_contract_status(self, obj):
        return obj.contract.status


class BiometricStepResultSerializer(serializers.Serializer):
    """Serializer para resultados de pasos biométricos."""
    
    success = serializers.BooleanField()
    confidence_score = serializers.FloatField(required=False)
    quality_metrics = serializers.DictField(required=False)
    verification_scores = serializers.DictField(required=False)
    verification_checks = serializers.DictField(required=False)
    next_step = serializers.CharField(required=False)
    overall_progress = serializers.FloatField(required=False)
    message = serializers.CharField(required=False)
    error = serializers.CharField(required=False)


class ContractPDFGenerationSerializer(serializers.Serializer):
    """Serializer para generación de PDF."""
    
    success = serializers.BooleanField()
    message = serializers.CharField()
    pdf_url = serializers.URLField()
    contract_status = serializers.CharField()
    contract_id = serializers.UUIDField()
    generated_at = serializers.DateTimeField(required=False)


class ContractEditBeforeAuthSerializer(serializers.Serializer):
    """Serializer para edición de contrato antes de autenticación."""
    
    title = serializers.CharField(required=False, max_length=200)
    description = serializers.CharField(required=False)
    monthly_rent = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    security_deposit = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    late_fee = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    minimum_lease_term = serializers.IntegerField(required=False)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)


class BiometricAuthenticationInitSerializer(serializers.Serializer):
    """Serializer para iniciar autenticación biométrica."""
    
    success = serializers.BooleanField()
    message = serializers.CharField()
    authentication_id = serializers.UUIDField()
    contract_status = serializers.CharField()
    expires_at = serializers.DateTimeField()
    voice_text = serializers.CharField()
    next_step = serializers.CharField()
    progress = serializers.FloatField()


class FaceCaptureRequestSerializer(serializers.Serializer):
    """Serializer para request de captura facial."""
    
    face_front_image = serializers.CharField(help_text="Imagen frontal en base64")
    face_side_image = serializers.CharField(help_text="Imagen lateral en base64")


class DocumentCaptureRequestSerializer(serializers.Serializer):
    """Serializer para request de captura de documento."""
    
    document_image = serializers.CharField(help_text="Imagen del documento en base64")
    document_type = serializers.ChoiceField(
        choices=BiometricAuthentication.DOCUMENT_TYPES,
        default='cedula_ciudadania'
    )
    document_number = serializers.CharField(required=False, max_length=50)


class CombinedCaptureRequestSerializer(serializers.Serializer):
    """Serializer para request de captura combinada."""
    
    combined_image = serializers.CharField(help_text="Imagen del documento junto al rostro en base64")


class VoiceCaptureRequestSerializer(serializers.Serializer):
    """Serializer para request de captura de voz."""
    
    voice_recording = serializers.CharField(help_text="Grabación de voz en base64")
    expected_text = serializers.CharField(required=False, help_text="Texto esperado")


class BiometricCompletionResultSerializer(serializers.Serializer):
    """Serializer para resultado de completación biométrica."""
    
    success = serializers.BooleanField()
    authentication_id = serializers.UUIDField(required=False)
    overall_confidence = serializers.FloatField(required=False)
    individual_scores = serializers.DictField(required=False)
    completion_time = serializers.DateTimeField(required=False)
    duration_minutes = serializers.FloatField(required=False)
    contract_status = serializers.CharField(required=False)
    next_step = serializers.CharField(required=False)
    integrity_hash = serializers.CharField(required=False)
    reason = serializers.CharField(required=False)
    required_confidence = serializers.FloatField(required=False) 