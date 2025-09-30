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
            'action_type', 'action_description', 'old_state', 'new_state',
            'changes_made', 'timestamp', 'user_role',
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
    
    # Campos calculados desde JSONField
    monthly_rent = serializers.SerializerMethodField()
    security_deposit = serializers.SerializerMethodField()
    contract_duration_months = serializers.SerializerMethodField()
    utilities_included = serializers.SerializerMethodField()
    pets_allowed = serializers.SerializerMethodField()
    smoking_allowed = serializers.SerializerMethodField()
    additional_terms = serializers.SerializerMethodField()
    
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
            'monthly_rent', 'security_deposit',
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
            'created_at', 'updated_at',
            
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
            'published_at'
        ]
    
    def get_property_details(self, obj):
        if obj.property:
            return {
                'id': obj.property.id,
                'title': obj.property.title,
                'address': obj.property.address,
                'property_type': obj.property.property_type,
                'bedrooms': obj.property.bedrooms,
                'bathrooms': obj.property.bathrooms,
                'area': getattr(obj.property, 'total_area', 0),
                'main_image_url': getattr(obj.property, 'main_image_url', '')
            }
        return None
    
    def get_progress_percentage(self, obj):
        # Calcular progreso basado en el estado actual
        state_progress = {
            'DRAFT': 10,
            'TENANT_INVITED': 30,
            'TENANT_REVIEWING': 50,
            'LANDLORD_REVIEWING': 70,
            'BOTH_REVIEWING': 80,
            'READY_TO_SIGN': 90,
            'FULLY_SIGNED': 95,
            'PUBLISHED': 100
        }
        return state_progress.get(obj.current_state, 0)
    
    def get_days_in_current_state(self, obj):
        # Calcular días en el estado actual
        from django.utils import timezone
        return (timezone.now() - obj.updated_at).days
    
    def get_can_be_published(self, obj):
        # Un contrato puede ser publicado si está completamente firmado
        return obj.current_state == 'FULLY_SIGNED'
    
    def get_recent_history(self, obj):
        # Simplificar historial - usar workflow_history JSONField en lugar de objetos relacionados
        return obj.workflow_history[-10:] if obj.workflow_history else []
    
    def get_total_objections(self, obj):
        return obj.objections.count()
    
    def get_pending_objections(self, obj):
        return obj.objections.filter(status='PENDING').count()
    
    def get_approved_objections(self, obj):
        return obj.objections.filter(status='ACCEPTED').count()
    
    # Métodos para campos calculados desde JSONField
    def get_monthly_rent(self, obj):
        return obj.economic_terms.get('monthly_rent', 0)
    
    def get_security_deposit(self, obj):
        return obj.economic_terms.get('security_deposit', 0)
    
    def get_contract_duration_months(self, obj):
        return obj.contract_terms.get('contract_duration_months', 12)
    
    def get_utilities_included(self, obj):
        return obj.contract_terms.get('utilities_included', False)
    
    def get_pets_allowed(self, obj):
        return obj.contract_terms.get('pets_allowed', False)
    
    def get_smoking_allowed(self, obj):
        return obj.contract_terms.get('smoking_allowed', False)
    
    def get_additional_terms(self, obj):
        return obj.contract_terms.get('additional_terms', '')


class ContractCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear nuevos contratos con datos completos del formulario."""

    # Estructura completa de datos del formulario
    property_data = serializers.JSONField(required=False, default=dict)
    landlord_data = serializers.JSONField(required=False, default=dict)
    basic_terms = serializers.JSONField(required=True)
    guarantee_terms = serializers.JSONField(required=False, default=dict)
    special_clauses = serializers.JSONField(required=False, default=list)
    contract_template = serializers.CharField(required=False, default='rental_urban')
    contract_content = serializers.CharField(required=False, allow_blank=True)

    # Campos adicionales para retrocompatibilidad
    monthly_rent = serializers.DecimalField(max_digits=12, decimal_places=2, write_only=True, required=False)
    security_deposit = serializers.DecimalField(max_digits=12, decimal_places=2, write_only=True, required=False)
    contract_duration_months = serializers.IntegerField(write_only=True, required=False)
    utilities_included = serializers.BooleanField(required=False, default=False, write_only=True)
    pets_allowed = serializers.BooleanField(required=False, default=False, write_only=True)
    smoking_allowed = serializers.BooleanField(required=False, default=False, write_only=True)
    
    class Meta:
        model = LandlordControlledContract
        fields = [
            'property', 'property_data', 'landlord_data', 'basic_terms',
            'guarantee_terms', 'special_clauses', 'contract_template',
            'contract_content', 'monthly_rent', 'security_deposit',
            'contract_duration_months', 'utilities_included', 'pets_allowed',
            'smoking_allowed'
        ]
    
    def create(self, validated_data):
        # Extraer datos estructurados del formulario
        property_data = validated_data.pop('property_data', {})
        landlord_data = validated_data.pop('landlord_data', {})
        basic_terms = validated_data.pop('basic_terms', {})
        guarantee_terms = validated_data.pop('guarantee_terms', {})
        special_clauses = validated_data.pop('special_clauses', [])
        contract_template = validated_data.pop('contract_template', 'rental_urban')
        contract_content = validated_data.pop('contract_content', '')

        # Extraer campos de retrocompatibilidad si existen
        monthly_rent = validated_data.pop('monthly_rent', None)
        security_deposit = validated_data.pop('security_deposit', None)
        contract_duration_months = validated_data.pop('contract_duration_months', None)
        utilities_included = validated_data.pop('utilities_included', False)
        pets_allowed = validated_data.pop('pets_allowed', False)
        smoking_allowed = validated_data.pop('smoking_allowed', False)

        # Configurar datos básicos del contrato
        validated_data['primary_party'] = self.context['request'].user
        validated_data['contract_type'] = contract_template
        validated_data['tenant_identifier'] = ''  # Se completará cuando se invite al tenant

        # Preparar términos económicos (priorizar basic_terms, fallback a campos individuales)
        economic_terms = {
            'monthly_rent': float(basic_terms.get('monthly_rent', monthly_rent or 0)),
            'security_deposit': float(basic_terms.get('security_deposit', security_deposit or 0)),
            'currency': basic_terms.get('currency', 'COP'),
            'payment_method': basic_terms.get('payment_method', 'transfer'),
            'late_payment_fee': float(basic_terms.get('late_payment_fee', 0)),
            'rent_increment_percentage': float(basic_terms.get('rent_increment_percentage', 0))
        }
        validated_data['economic_terms'] = economic_terms

        # Preparar términos del contrato
        contract_terms = {
            'contract_duration_months': basic_terms.get('contract_duration_months', contract_duration_months or 12),
            'utilities_included': basic_terms.get('utilities_included', utilities_included),
            'pets_allowed': basic_terms.get('pets_allowed', pets_allowed),
            'smoking_allowed': basic_terms.get('smoking_allowed', smoking_allowed),
            'start_date': basic_terms.get('start_date', ''),
            'end_date': basic_terms.get('end_date', ''),
            'payment_due_day': basic_terms.get('payment_due_day', 1),
            'grace_period_days': basic_terms.get('grace_period_days', 5)
        }

        # Agregar datos de garantías del codeudor si existen
        if guarantee_terms and guarantee_terms.get('guarantor_required'):
            contract_terms.update({
                'guarantor_required': True,
                'guarantee_type': guarantee_terms.get('guarantee_type', 'codeudor'),
                'guarantee_amount': float(guarantee_terms.get('guarantee_amount', 0)),
                'codeudor_data': guarantee_terms.get('codeudor_data', {})
            })

        validated_data['contract_terms'] = contract_terms

        # Asignar datos específicos para las secciones del contrato
        validated_data['property_data'] = self._enhance_property_data(property_data)
        validated_data['landlord_data'] = self._enhance_landlord_data(landlord_data)
        validated_data['special_clauses'] = special_clauses

        # Establecer título descriptivo
        landlord_name = self.context['request'].user.get_full_name()
        validated_data['title'] = f'Contrato de Arrendamiento - {landlord_name}'

        # Agregar contenido del contrato generado si se proporcionó
        if contract_content:
            validated_data['description'] = contract_content[:1000]  # Limitar a 1000 caracteres

        return super().create(validated_data)

    def _enhance_property_data(self, property_data):
        """Enriquecer datos de la propiedad para el contrato"""
        enhanced = property_data.copy()

        # Formatear datos para el contrato PDF
        if 'property_area' in enhanced:
            enhanced['area_formatted'] = f"{enhanced['property_area']} metros cuadrados"

        if 'property_type' in enhanced:
            property_types = {
                'apartment': 'Apartamento',
                'house': 'Casa',
                'room': 'Habitación',
                'commercial': 'Local Comercial',
                'office': 'Oficina'
            }
            enhanced['property_type_display'] = property_types.get(enhanced['property_type'], enhanced['property_type'])

        return enhanced

    def _enhance_landlord_data(self, landlord_data):
        """Enriquecer datos del arrendador para el contrato"""
        enhanced = landlord_data.copy()

        # Formatear datos para el contrato PDF
        if 'document_type' in enhanced:
            doc_types = {
                'CC': 'Cédula de Ciudadanía',
                'CE': 'Cédula de Extranjería',
                'NIT': 'NIT',
                'PP': 'Pasaporte'
            }
            enhanced['document_type_display'] = doc_types.get(enhanced['document_type'], enhanced['document_type'])

        # Crear dirección completa si hay componentes separados
        address_parts = []
        if enhanced.get('address'):
            address_parts.append(enhanced['address'])
        if enhanced.get('city'):
            address_parts.append(enhanced['city'])
        if enhanced.get('department'):
            address_parts.append(enhanced['department'])
        if address_parts:
            enhanced['full_address'] = ', '.join(address_parts)

        return enhanced
    
    def validate_basic_terms(self, value):
        """Validar términos básicos del contrato."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("basic_terms debe ser un objeto JSON")

        # Validar campos requeridos
        required_fields = ['monthly_rent']
        for field in required_fields:
            if field not in value:
                raise serializers.ValidationError(f"Campo requerido en basic_terms: {field}")

        # Validar valores monetarios
        if 'monthly_rent' in value:
            try:
                monthly_rent = float(value['monthly_rent'])
                if monthly_rent <= 0:
                    raise serializers.ValidationError("El canon mensual debe ser mayor a 0")
            except (TypeError, ValueError):
                raise serializers.ValidationError("El canon mensual debe ser un número válido")

        if 'security_deposit' in value:
            try:
                security_deposit = float(value['security_deposit'])
                if security_deposit < 0:
                    raise serializers.ValidationError("El depósito no puede ser negativo")
            except (TypeError, ValueError):
                raise serializers.ValidationError("El depósito debe ser un número válido")

        # Validar duración del contrato
        if 'contract_duration_months' in value:
            try:
                duration = int(value['contract_duration_months'])
                if duration < 1 or duration > 60:
                    raise serializers.ValidationError("La duración debe estar entre 1 y 60 meses")
            except (TypeError, ValueError):
                raise serializers.ValidationError("La duración debe ser un número entero válido")

        return value

    def validate_guarantee_terms(self, value):
        """Validar términos de garantía incluyendo datos del codeudor."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("guarantee_terms debe ser un objeto JSON")

        # Si se requiere codeudor, validar que los datos estén presentes
        if value.get('guarantor_required') and value.get('guarantee_type') != 'none':
            codeudor_data = value.get('codeudor_data', {})

            # Validar campos obligatorios del codeudor
            required_codeudor_fields = [
                'codeudor_full_name', 'codeudor_document_number',
                'codeudor_phone', 'codeudor_email'
            ]

            for field in required_codeudor_fields:
                if not codeudor_data.get(field):
                    field_display = field.replace('codeudor_', '').replace('_', ' ').title()
                    raise serializers.ValidationError(f"Se requiere {field_display} del codeudor")

            # Validar formato de email del codeudor
            if 'codeudor_email' in codeudor_data:
                import re
                email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if not re.match(email_pattern, codeudor_data['codeudor_email']):
                    raise serializers.ValidationError("Email del codeudor debe tener un formato válido")

        return value

    def validate_monthly_rent(self, value):
        if value and value <= 0:
            raise serializers.ValidationError("El canon mensual debe ser mayor a 0")
        return value

    def validate_security_deposit(self, value):
        if value and value < 0:
            raise serializers.ValidationError("El depósito no puede ser negativo")
        return value

    def validate_contract_duration_months(self, value):
        if value and (value < 1 or value > 60):
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