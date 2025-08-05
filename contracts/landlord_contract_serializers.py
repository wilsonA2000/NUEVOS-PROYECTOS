"""
Serializers para las APIs del sistema de contratos controlado por arrendador.
Proporciona serialización/deserialización completa para todas las operaciones.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .landlord_contract_models import (
    LandlordControlledContract,
    ContractObjection,
    LandlordContractGuarantee,
    ContractWorkflowHistory
)

User = get_user_model()


class ContractObjectionSerializer(serializers.ModelSerializer):
    """Serializer para objeciones de contrato."""
    
    objected_by_name = serializers.CharField(source='objected_by.get_full_name', read_only=True)
    responded_by_name = serializers.CharField(source='responded_by.get_full_name', read_only=True)
    age_in_days = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = ContractObjection
        fields = [
            'id', 'contract', 'objected_by', 'objected_by_name',
            'field_name', 'current_value', 'proposed_value',
            'justification', 'priority', 'status',
            'response_note', 'responded_by', 'responded_by_name',
            'submitted_at', 'responded_at', 'age_in_days', 'is_overdue'
        ]
        read_only_fields = ['id', 'submitted_at', 'responded_at']
    
    def get_age_in_days(self, obj):
        return obj.get_age_in_days()
    
    def get_is_overdue(self, obj):
        return obj.is_overdue()


class LandlordContractGuaranteeSerializer(serializers.ModelSerializer):
    """Serializer para garantías de contrato."""
    
    class Meta:
        model = LandlordContractGuarantee
        fields = [
            'id', 'contract', 'guarantee_type', 'amount', 'description',
            'co_signer_name', 'co_signer_document', 'co_signer_phone',
            'co_signer_email', 'co_signer_address', 'policy_number',
            'insurance_company', 'bank_name', 'bank_guarantee_number',
            'status', 'is_active', 'deposit_account', 'verification_documents',
            'created_at', 'expiry_date', 'notes'
        ]
        read_only_fields = ['id', 'created_at']


class ContractWorkflowHistorySerializer(serializers.ModelSerializer):
    """Serializer para historial de workflow."""
    
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)
    related_objection_details = ContractObjectionSerializer(source='related_objection', read_only=True)
    
    class Meta:
        model = ContractWorkflowHistory
        fields = [
            'id', 'contract', 'performed_by', 'performed_by_name',
            'action_type', 'description', 'old_state', 'new_state',
            'data_changes', 'timestamp', 'ip_address', 'user_agent',
            'related_objection', 'related_objection_details', 'related_guarantee'
        ]
        read_only_fields = ['id', 'timestamp']


class LandlordControlledContractListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listado de contratos."""
    
    landlord_name = serializers.CharField(source='landlord.get_full_name', read_only=True)
    tenant_name = serializers.CharField(source='tenant.get_full_name', read_only=True)
    tenant_email = serializers.EmailField(read_only=True)
    property_address = serializers.CharField(source='property.full_address', read_only=True)
    progress_percentage = serializers.SerializerMethodField()
    current_state_display = serializers.CharField(source='get_current_state_display', read_only=True)
    days_in_current_state = serializers.SerializerMethodField()
    pending_objections_count = serializers.SerializerMethodField()
    
    class Meta:
        model = LandlordControlledContract
        fields = [
            'id', 'contract_number', 'landlord', 'landlord_name',
            'tenant', 'tenant_name', 'tenant_email', 'property',
            'property_address', 'current_state', 'current_state_display',
            'monthly_rent', 'security_deposit', 'contract_duration_months',
            'created_at', 'updated_at', 'progress_percentage',
            'days_in_current_state', 'pending_objections_count',
            'landlord_approved', 'tenant_approved', 'published'
        ]
        read_only_fields = [
            'id', 'contract_number', 'created_at', 'updated_at',
            'progress_percentage', 'days_in_current_state'
        ]
    
    def get_progress_percentage(self, obj):
        return obj.get_progress_percentage()
    
    def get_days_in_current_state(self, obj):
        return obj.get_days_in_current_state()
    
    def get_pending_objections_count(self, obj):
        return obj.objections.filter(status='PENDING').count()


class LandlordControlledContractDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalles de contrato."""
    
    landlord_name = serializers.CharField(source='landlord.get_full_name', read_only=True)
    landlord_email = serializers.CharField(source='landlord.email', read_only=True)
    tenant_name = serializers.CharField(source='tenant.get_full_name', read_only=True)
    tenant_email = serializers.EmailField(read_only=True)
    property_details = serializers.SerializerMethodField()
    
    # Estados y progreso
    current_state_display = serializers.CharField(source='get_current_state_display', read_only=True)
    progress_percentage = serializers.SerializerMethodField()
    days_in_current_state = serializers.SerializerMethodField()
    can_be_published = serializers.SerializerMethodField()
    
    # Objections y garantías relacionadas
    objections = ContractObjectionSerializer(many=True, read_only=True)
    guarantees = LandlordContractGuaranteeSerializer(many=True, read_only=True)
    recent_history = serializers.SerializerMethodField()
    
    # Estadísticas
    total_objections = serializers.SerializerMethodField()
    pending_objections = serializers.SerializerMethodField()
    approved_objections = serializers.SerializerMethodField()
    
    class Meta:
        model = LandlordControlledContract
        fields = [
            # Información básica
            'id', 'contract_number', 'landlord', 'landlord_name', 'landlord_email',
            'tenant', 'tenant_name', 'tenant_email', 'property', 'property_details',
            
            # Estados y workflow
            'current_state', 'current_state_display', 'progress_percentage',
            'days_in_current_state', 'can_be_published',
            
            # Datos del contrato
            'contract_template', 'monthly_rent', 'security_deposit',
            'contract_duration_months', 'utilities_included', 'pets_allowed',
            'smoking_allowed', 'additional_terms',
            
            # Datos de las partes
            'landlord_data', 'tenant_data',
            
            # Aprobaciones y firmas
            'landlord_approved', 'landlord_approved_at',
            'tenant_approved', 'tenant_approved_at',
            'landlord_signed', 'landlord_signed_at',
            'tenant_signed', 'tenant_signed_at',
            
            # Publicación
            'published', 'published_at', 'start_date', 'end_date',
            
            # Invitación
            'invitation_token', 'invitation_expires_at',
            
            # Fechas
            'created_at', 'updated_at', 'fully_signed_at',
            
            # Relaciones
            'objections', 'guarantees', 'recent_history',
            
            # Estadísticas
            'total_objections', 'pending_objections', 'approved_objections',
            
            # Historial
            'workflow_history'
        ]
        read_only_fields = [
            'id', 'contract_number', 'created_at', 'updated_at',
            'progress_percentage', 'days_in_current_state',
            'landlord_approved_at', 'tenant_approved_at',
            'landlord_signed_at', 'tenant_signed_at',
            'published_at', 'fully_signed_at'
        ]
    
    def get_property_details(self, obj):
        if obj.property:
            return {
                'id': obj.property.id,
                'title': obj.property.title,
                'address': obj.property.full_address,
                'property_type': obj.property.property_type,
                'bedrooms': obj.property.bedrooms,
                'bathrooms': obj.property.bathrooms,
                'area': obj.property.area,
                'main_image_url': obj.property.main_image_url
            }
        return None
    
    def get_progress_percentage(self, obj):
        return obj.get_progress_percentage()
    
    def get_days_in_current_state(self, obj):
        return obj.get_days_in_current_state()
    
    def get_can_be_published(self, obj):
        return obj.can_be_published()
    
    def get_recent_history(self, obj):
        recent_entries = obj.history_entries.order_by('-timestamp')[:10]
        return ContractWorkflowHistorySerializer(recent_entries, many=True).data
    
    def get_total_objections(self, obj):
        return obj.objections.count()
    
    def get_pending_objections(self, obj):
        return obj.objections.filter(status='PENDING').count()
    
    def get_approved_objections(self, obj):
        return obj.objections.filter(status='ACCEPTED').count()


class ContractCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear nuevos contratos."""
    
    class Meta:
        model = LandlordControlledContract
        fields = [
            'property', 'contract_template', 'monthly_rent', 'security_deposit',
            'contract_duration_months', 'utilities_included', 'pets_allowed',
            'smoking_allowed', 'additional_terms'
        ]
    
    def validate_monthly_rent(self, value):
        if value <= 0:
            raise serializers.ValidationError("El canon mensual debe ser mayor a 0")
        return value
    
    def validate_security_deposit(self, value):
        if value < 0:
            raise serializers.ValidationError("El depósito no puede ser negativo")
        return value
    
    def validate_contract_duration_months(self, value):
        if value < 1 or value > 60:
            raise serializers.ValidationError("La duración debe estar entre 1 y 60 meses")
        return value


class LandlordDataSerializer(serializers.Serializer):
    """Serializer para datos del arrendador."""
    
    full_name = serializers.CharField(max_length=200)
    document_type = serializers.ChoiceField(choices=[
        ('CC', 'Cédula de Ciudadanía'),
        ('CE', 'Cédula de Extranjería'),
        ('PP', 'Pasaporte'),
        ('NIT', 'NIT'),
        ('TI', 'Tarjeta de Identidad')
    ])
    document_number = serializers.CharField(max_length=50)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    address = serializers.CharField(max_length=300)
    city = serializers.CharField(max_length=100)
    department = serializers.CharField(max_length=100)
    postal_code = serializers.CharField(max_length=10, required=False)
    
    # Contacto de emergencia
    emergency_contact_name = serializers.CharField(max_length=200)
    emergency_contact_phone = serializers.CharField(max_length=20)
    emergency_contact_relationship = serializers.CharField(max_length=50)
    
    # Información bancaria para pagos
    bank_name = serializers.CharField(max_length=100, required=False)
    bank_account_type = serializers.ChoiceField(
        choices=[('savings', 'Ahorros'), ('checking', 'Corriente')],
        required=False
    )
    bank_account_number = serializers.CharField(max_length=50, required=False)
    
    # Términos específicos del arrendador
    late_payment_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    grace_period_days = serializers.IntegerField(min_value=0, max_value=30, required=False)
    maintenance_responsibilities = serializers.CharField(max_length=1000, required=False)
    house_rules = serializers.CharField(max_length=2000, required=False)


class TenantInvitationSerializer(serializers.Serializer):
    """Serializer para envío de invitaciones a arrendatarios."""
    
    tenant_email = serializers.EmailField()
    personal_message = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    
    def validate_tenant_email(self, value):
        # Verificar que no sea el mismo email del arrendador
        request = self.context.get('request')
        if request and request.user.email == value:
            raise serializers.ValidationError("No puedes invitarte a ti mismo")
        return value


class ContractObjectionCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear objeciones."""
    
    class Meta:
        model = ContractObjection
        fields = [
            'field_name', 'current_value', 'proposed_value',
            'justification', 'priority'
        ]
    
    def validate_justification(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError("La justificación debe tener al menos 10 caracteres")
        return value


class ContractObjectionResponseSerializer(serializers.Serializer):
    """Serializer para responder a objeciones."""
    
    response = serializers.ChoiceField(choices=[
        ('ACCEPTED', 'Aceptada'),
        ('REJECTED', 'Rechazada')
    ])
    response_note = serializers.CharField(max_length=1000, required=False, allow_blank=True)


class ContractApprovalSerializer(serializers.Serializer):
    """Serializer para aprobación de contratos."""
    
    approved = serializers.BooleanField()
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)


class ContractSignatureSerializer(serializers.Serializer):
    """Serializer para firmas digitales."""
    
    signature_data = serializers.JSONField()
    signature_image = serializers.ImageField(required=False)
    biometric_data = serializers.JSONField(required=False)
    device_fingerprint = serializers.JSONField(required=False)
    
    def validate_signature_data(self, value):
        required_fields = ['timestamp', 'user_agent', 'ip_address']
        for field in required_fields:
            if field not in value:
                raise serializers.ValidationError(f"Campo requerido en signature_data: {field}")
        return value


class ContractStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de contratos."""
    
    total_contracts = serializers.IntegerField()
    draft_contracts = serializers.IntegerField()
    active_contracts = serializers.IntegerField()
    completed_contracts = serializers.IntegerField()
    contracts_with_objections = serializers.IntegerField()
    average_completion_days = serializers.FloatField()
    monthly_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    pending_signatures = serializers.IntegerField()
    
    # Por estado
    state_breakdown = serializers.DictField()
    
    # Tendencias mensuales
    monthly_trends = serializers.ListField(child=serializers.DictField())