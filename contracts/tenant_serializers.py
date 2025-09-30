"""
Serializers específicos para las operaciones del arrendatario.
Vista optimizada desde la perspectiva del tenant en el workflow.
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


class TenantContractListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listado de contratos desde perspectiva del arrendatario."""
    
    landlord_name = serializers.CharField(source='landlord.get_full_name', read_only=True)
    landlord_email = serializers.CharField(source='landlord.email', read_only=True)
    landlord_phone = serializers.CharField(source='landlord.profile.phone', read_only=True)
    property_address = serializers.CharField(source='property.address', read_only=True)
    property_title = serializers.CharField(source='property.title', read_only=True)
    
    # Estados y progreso desde perspectiva del tenant
    current_state_display = serializers.CharField(source='get_current_state_display', read_only=True)
    tenant_progress_percentage = serializers.SerializerMethodField()
    days_since_invitation = serializers.SerializerMethodField()
    
    # Acciones disponibles para el tenant
    can_complete_data = serializers.SerializerMethodField()
    can_approve = serializers.SerializerMethodField()
    can_sign = serializers.SerializerMethodField()
    can_object = serializers.SerializerMethodField()
    
    # Información de objeciones (temporalmente deshabilitado - modelo no soporta objected_by)
    # tenant_objections_count = serializers.SerializerMethodField()
    # pending_landlord_responses = serializers.SerializerMethodField()
    
    # Campos calculados desde JSONField
    monthly_rent = serializers.SerializerMethodField()
    security_deposit = serializers.SerializerMethodField()
    contract_duration_months = serializers.SerializerMethodField()
    utilities_included = serializers.SerializerMethodField()
    pets_allowed = serializers.SerializerMethodField()
    smoking_allowed = serializers.SerializerMethodField()
    
    class Meta:
        model = LandlordControlledContract
        fields = [
            'id', 'contract_number', 'landlord', 'landlord_name', 
            'landlord_email', 'landlord_phone', 'property', 'property_address',
            'property_title', 'current_state', 'current_state_display',
            'monthly_rent', 'security_deposit', 'contract_duration_months',
            'utilities_included', 'pets_allowed', 'smoking_allowed',
            'created_at', 'updated_at', 'invitation_expires_at',
            'tenant_approved', 'tenant_approved_at', 'tenant_signed', 'tenant_signed_at',
            'published', 'published_at', 'start_date', 'end_date',
            'tenant_progress_percentage', 'days_since_invitation',
            'can_complete_data', 'can_approve', 'can_sign', 'can_object'
        ]
        read_only_fields = [
            'id', 'contract_number', 'created_at', 'updated_at',
            'tenant_approved_at', 'tenant_signed_at', 'published_at'
        ]
    
    def get_tenant_progress_percentage(self, obj):
        """Calcular progreso desde perspectiva del arrendatario."""
        state_progress = {
            'TENANT_INVITED': 10,
            'TENANT_REVIEWING': 25,
            'LANDLORD_REVIEWING': 50,
            'OBJECTIONS_PENDING': 60,
            'BOTH_REVIEWING': 75,
            'READY_TO_SIGN': 85,
            'FULLY_SIGNED': 95,
            'PUBLISHED': 100
        }
        return state_progress.get(obj.current_state, 0)
    
    def get_days_since_invitation(self, obj):
        """Días desde que fue invitado."""
        if obj.created_at:
            from django.utils import timezone
            return (timezone.now() - obj.created_at).days
        return 0
    
    def get_can_complete_data(self, obj):
        """¿Puede completar sus datos?"""
        return obj.current_state == 'TENANT_REVIEWING'
    
    def get_can_approve(self, obj):
        """¿Puede aprobar el contrato?"""
        return obj.current_state == 'BOTH_REVIEWING' and not obj.tenant_approved
    
    def get_can_sign(self, obj):
        """¿Puede firmar el contrato?"""
        return obj.current_state == 'READY_TO_SIGN' and not obj.tenant_signed
    
    def get_can_object(self, obj):
        """¿Puede presentar objeciones?"""
        return obj.current_state in ['LANDLORD_REVIEWING', 'TENANT_REVIEWING', 'OBJECTIONS_PENDING']
    
    # Métodos temporalmente deshabilitados - modelo no soporta objected_by
    # def get_tenant_objections_count(self, obj):
    #     """Número de objeciones presentadas por el arrendatario."""
    #     request = self.context.get('request')
    #     if request and request.user:
    #         return obj.objections.filter(objected_by=request.user).count()
    #     return 0
    # 
    # def get_pending_landlord_responses(self, obj):
    #     """Objeciones del tenant esperando respuesta del landlord."""
    #     request = self.context.get('request')
    #     if request and request.user:
    #         return obj.objections.filter(
    #             objected_by=request.user,
    #             status='PENDING'
    #         ).count()
    #     return 0
    
    # Métodos para campos calculados desde JSONField - List Serializer
    def get_monthly_rent(self, obj):
        return obj.economic_terms.get('monthly_rent', 0) if obj.economic_terms else 0
    
    def get_security_deposit(self, obj):
        return obj.economic_terms.get('security_deposit', 0) if obj.economic_terms else 0
    
    def get_contract_duration_months(self, obj):
        return obj.contract_terms.get('contract_duration_months', 12) if obj.contract_terms else 12
    
    def get_utilities_included(self, obj):
        return obj.contract_terms.get('utilities_included', False) if obj.contract_terms else False
    
    def get_pets_allowed(self, obj):
        return obj.contract_terms.get('pets_allowed', False) if obj.contract_terms else False
    
    def get_smoking_allowed(self, obj):
        return obj.contract_terms.get('smoking_allowed', False) if obj.contract_terms else False


class TenantContractDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalles de contrato desde perspectiva del arrendatario."""
    
    # Información del arrendador
    landlord_details = serializers.SerializerMethodField()
    
    # Información de la propiedad
    property_details = serializers.SerializerMethodField()
    
    # Estados y progreso
    current_state_display = serializers.CharField(source='get_current_state_display', read_only=True)
    tenant_progress_percentage = serializers.SerializerMethodField()
    next_action_required = serializers.SerializerMethodField()
    
    # Objeciones y garantías (solo las relevantes para el tenant)
    my_objections = serializers.SerializerMethodField()
    landlord_objections = serializers.SerializerMethodField()
    guarantees = serializers.SerializerMethodField()
    
    # Historial reciente
    recent_activity = serializers.SerializerMethodField()
    
    # Capacidades del arrendatario
    tenant_capabilities = serializers.SerializerMethodField()
    
    # Información de firma y aprobación
    signature_status = serializers.SerializerMethodField()
    
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
            'id', 'contract_number', 'landlord', 'landlord_details',
            'tenant', 'property', 'property_details',
            
            # Estados y workflow
            'current_state', 'current_state_display', 'tenant_progress_percentage',
            'next_action_required', 'tenant_capabilities',
            
            # Datos del contrato
            'monthly_rent', 'security_deposit',
            'contract_duration_months', 'utilities_included', 'pets_allowed',
            'smoking_allowed', 'additional_terms',
            
            # Datos de las partes
            'landlord_data', 'tenant_data',
            
            # Aprobaciones y firmas
            'landlord_approved', 'landlord_approved_at',
            'tenant_approved', 'tenant_approved_at',
            'signature_status',
            
            # Publicación
            'published', 'published_at', 'start_date', 'end_date',
            
            # Invitación
            'invitation_token', 'invitation_expires_at',
            
            # Fechas
            'created_at', 'updated_at',
            
            # Relaciones filtradas
            'my_objections', 'landlord_objections', 'guarantees',
            'recent_activity',
            
            # Historial
            'workflow_history'
        ]
        read_only_fields = [
            'id', 'contract_number', 'created_at', 'updated_at',
            'landlord_approved_at', 'tenant_approved_at',
            'published_at'
        ]
    
    def get_landlord_details(self, obj):
        """Detalles del arrendador."""
        if obj.landlord:
            landlord_data = obj.landlord_data or {}
            return {
                'id': obj.landlord.id,
                'name': obj.landlord.get_full_name(),
                'email': obj.landlord.email,
                'phone': landlord_data.get('phone', ''),
                'document_type': landlord_data.get('document_type', ''),
                'document_number': landlord_data.get('document_number', ''),
                'address': landlord_data.get('address', ''),
                'city': landlord_data.get('city', ''),
                'emergency_contact_name': landlord_data.get('emergency_contact_name', ''),
                'emergency_contact_phone': landlord_data.get('emergency_contact_phone', '')
            }
        return None
    
    def get_property_details(self, obj):
        """Detalles de la propiedad."""
        if obj.property:
            return {
                'id': obj.property.id,
                'title': obj.property.title,
                'description': obj.property.description,
                'address': obj.property.address,
                'property_type': obj.property.property_type,
                'bedrooms': obj.property.bedrooms,
                'bathrooms': obj.property.bathrooms,
                'area': getattr(obj.property, 'total_area', None),
                'furnished': getattr(obj.property, 'furnished', False),
                'parking': getattr(obj.property, 'parking', False),
                'main_image_url': getattr(obj.property, 'main_image_url', ''),
                'amenities': [amenity.name for amenity in obj.property.amenities.all()] if hasattr(obj.property, 'amenities') else []
            }
        return None
    
    def get_tenant_progress_percentage(self, obj):
        """Progreso desde perspectiva del arrendatario."""
        state_progress = {
            'TENANT_INVITED': 10,
            'TENANT_REVIEWING': 25,
            'LANDLORD_REVIEWING': 50,
            'OBJECTIONS_PENDING': 60,
            'BOTH_REVIEWING': 75,
            'READY_TO_SIGN': 85,
            'FULLY_SIGNED': 95,
            'PUBLISHED': 100
        }
        return state_progress.get(obj.current_state, 0)
    
    def get_next_action_required(self, obj):
        """Próxima acción requerida del arrendatario."""
        user = self.context.get('request').user if self.context.get('request') else None
        
        if not user or obj.tenant != user:
            return None
        
        actions = {
            'TENANT_REVIEWING': {
                'action': 'complete_data',
                'title': 'Completar tus datos',
                'description': 'Completa tu información personal y referencias',
                'priority': 'high'
            },
            'BOTH_REVIEWING': {
                'action': 'approve_contract' if not obj.tenant_approved else 'wait_landlord',
                'title': 'Aprobar contrato' if not obj.tenant_approved else 'Esperando al arrendador',
                'description': 'Revisa y aprueba los términos finales del contrato' if not obj.tenant_approved else 'El arrendador debe aprobar también',
                'priority': 'high' if not obj.tenant_approved else 'medium'
            },
            'READY_TO_SIGN': {
                'action': 'sign_contract' if not obj.tenant_signed else 'wait_landlord_sign',
                'title': 'Firmar contrato' if not obj.tenant_signed else 'Esperando firma del arrendador',
                'description': 'Firma digitalmente el contrato' if not obj.tenant_signed else 'El arrendador debe firmar también',
                'priority': 'high' if not obj.tenant_signed else 'medium'
            },
            'OBJECTIONS_PENDING': {
                'action': 'review_objections',
                'title': 'Revisar objeciones',
                'description': 'Hay objeciones pendientes de respuesta',
                'priority': 'high'
            }
        }
        
        return actions.get(obj.current_state)
    
    def get_my_objections(self, obj):
        """Objeciones presentadas por el arrendatario (deshabilitado - modelo no soporta objected_by)."""
        # user = self.context.get('request').user if self.context.get('request') else None
        # if user:
        #     my_objections = obj.objections.filter(objected_by=user).order_by('-submitted_at')
        #     from .landlord_contract_serializers import ContractObjectionSerializer
        #     return ContractObjectionSerializer(my_objections, many=True).data
        return []
    
    def get_landlord_objections(self, obj):
        """Objeciones presentadas por el arrendador (deshabilitado - modelo no soporta objected_by)."""
        # landlord_objections = obj.objections.filter(objected_by=obj.landlord).order_by('-submitted_at')
        # from .landlord_contract_serializers import ContractObjectionSerializer
        # return ContractObjectionSerializer(landlord_objections, many=True).data
        return []
    
    def get_guarantees(self, obj):
        """Garantías del contrato."""
        from .landlord_contract_serializers import LandlordContractGuaranteeSerializer
        return LandlordContractGuaranteeSerializer(obj.guarantees.all(), many=True).data
    
    def get_recent_activity(self, obj):
        """Actividad reciente del contrato."""
        recent_entries = obj.history_entries.order_by('-timestamp')[:5]
        from .landlord_contract_serializers import ContractWorkflowHistorySerializer
        return ContractWorkflowHistorySerializer(recent_entries, many=True).data
    
    def get_tenant_capabilities(self, obj):
        """Qué puede hacer el arrendatario en el estado actual."""
        user = self.context.get('request').user if self.context.get('request') else None
        
        if not user or obj.tenant != user:
            return {}
        
        return {
            'can_complete_data': obj.current_state == 'TENANT_REVIEWING',
            'can_create_objections': obj.current_state in ['LANDLORD_REVIEWING', 'TENANT_REVIEWING', 'OBJECTIONS_PENDING'],
            'can_respond_objections': False,  # Deshabilitado - modelo no soporta objected_by
            'can_approve': obj.current_state == 'BOTH_REVIEWING' and not obj.tenant_approved,
            'can_sign': obj.current_state == 'READY_TO_SIGN' and not obj.tenant_signed,
            'can_view_contract': obj.current_state in ['BOTH_REVIEWING', 'READY_TO_SIGN', 'FULLY_SIGNED', 'PUBLISHED']
        }
    
    def get_signature_status(self, obj):
        """Estado de las firmas."""
        return {
            'landlord_signed': obj.landlord_signed,
            'landlord_signed_at': obj.landlord_signed_at,
            'tenant_signed': obj.tenant_signed,
            'tenant_signed_at': obj.tenant_signed_at,
            'fully_signed': obj.landlord_signed and obj.tenant_signed
        }
    
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


class TenantDataSerializer(serializers.Serializer):
    """Serializer para datos del arrendatario."""
    
    # Información personal
    full_name = serializers.CharField(max_length=200)
    document_type = serializers.ChoiceField(choices=[
        ('CC', 'Cédula de Ciudadanía'),
        ('CE', 'Cédula de Extranjería'),
        ('PP', 'Pasaporte'),
        ('TI', 'Tarjeta de Identidad')
    ])
    document_number = serializers.CharField(max_length=50)
    birth_date = serializers.DateField()
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    
    # Dirección actual
    current_address = serializers.CharField(max_length=300)
    current_city = serializers.CharField(max_length=100)
    current_department = serializers.CharField(max_length=100)
    time_at_current_address = serializers.IntegerField(
        min_value=0, 
        help_text="Meses en la dirección actual"
    )
    
    # Información laboral
    employment_type = serializers.ChoiceField(choices=[
        ('employed', 'Empleado'),
        ('self_employed', 'Independiente'),
        ('student', 'Estudiante'),
        ('retired', 'Pensionado'),
        ('unemployed', 'Desempleado')
    ])
    employer_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    job_title = serializers.CharField(max_length=100, required=False, allow_blank=True)
    monthly_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    employment_start_date = serializers.DateField(required=False)
    
    # Referencias personales (mínimo 2)
    reference_1_name = serializers.CharField(max_length=200)
    reference_1_phone = serializers.CharField(max_length=20)
    reference_1_relationship = serializers.CharField(max_length=100)
    
    reference_2_name = serializers.CharField(max_length=200)
    reference_2_phone = serializers.CharField(max_length=20)
    reference_2_relationship = serializers.CharField(max_length=100)
    
    # Referencia laboral (opcional)
    work_reference_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    work_reference_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    work_reference_position = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    # Información adicional
    marital_status = serializers.ChoiceField(choices=[
        ('single', 'Soltero/a'),
        ('married', 'Casado/a'),
        ('divorced', 'Divorciado/a'),
        ('widowed', 'Viudo/a'),
        ('common_law', 'Unión libre')
    ])
    dependents_count = serializers.IntegerField(min_value=0, default=0)
    pets_description = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    # Comentarios adicionales
    additional_comments = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    
    def validate_monthly_income(self, value):
        if value <= 0:
            raise serializers.ValidationError("Los ingresos mensuales deben ser mayores a 0")
        return value


class InvitationAcceptanceSerializer(serializers.Serializer):
    """Serializer para aceptar invitaciones de contrato."""
    
    invitation_token = serializers.CharField(max_length=255)
    accept_terms = serializers.BooleanField()
    
    def validate_accept_terms(self, value):
        if not value:
            raise serializers.ValidationError("Debes aceptar los términos para continuar")
        return value


class TenantContractObjectionCreateSerializer(serializers.Serializer):
    """Serializer para crear objeciones como arrendatario."""
    
    field_name = serializers.CharField(max_length=100)
    current_value = serializers.CharField(max_length=1000)
    proposed_value = serializers.CharField(max_length=1000)
    justification = serializers.CharField(max_length=2000)
    priority = serializers.ChoiceField(
        choices=[('LOW', 'Baja'), ('MEDIUM', 'Media'), ('HIGH', 'Alta'), ('CRITICAL', 'Crítica')],
        default='MEDIUM'
    )
    
    # Campos específicos para arrendatarios
    affects_budget = serializers.BooleanField(default=False)
    requires_negotiation = serializers.BooleanField(default=True)
    
    def validate_justification(self, value):
        if len(value.strip()) < 20:
            raise serializers.ValidationError("La justificación debe tener al menos 20 caracteres")
        return value


class TenantContractApprovalSerializer(serializers.Serializer):
    """Serializer para aprobación de contratos por parte del arrendatario."""
    
    approved = serializers.BooleanField()
    tenant_notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    confirm_understanding = serializers.BooleanField()
    
    def validate_confirm_understanding(self, value):
        if not value:
            raise serializers.ValidationError("Debes confirmar que entiendes los términos del contrato")
        return value


class TenantContractSignatureSerializer(serializers.Serializer):
    """Serializer para firmas digitales del arrendatario."""
    
    signature_data = serializers.JSONField()
    signature_image = serializers.ImageField(required=False)
    biometric_data = serializers.JSONField(required=False)
    device_fingerprint = serializers.JSONField(required=False)
    accept_legal_responsibility = serializers.BooleanField()
    
    def validate_signature_data(self, value):
        required_fields = ['timestamp', 'user_agent', 'ip_address']
        for field in required_fields:
            if field not in value:
                raise serializers.ValidationError(f"Campo requerido en signature_data: {field}")
        return value
    
    def validate_accept_legal_responsibility(self, value):
        if not value:
            raise serializers.ValidationError("Debes aceptar la responsabilidad legal de la firma")
        return value


class TenantContractStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas del arrendatario."""
    
    total_contracts = serializers.IntegerField()
    active_contracts = serializers.IntegerField()
    completed_contracts = serializers.IntegerField()
    pending_approval = serializers.IntegerField()
    pending_signature = serializers.IntegerField()
    waiting_for_landlord = serializers.IntegerField()
    
    # Gastos
    monthly_rent_expenses = serializers.DecimalField(max_digits=15, decimal_places=2)
    
    # Tiempos
    average_signing_days = serializers.FloatField()
    
    # Objeciones
    total_objections_made = serializers.IntegerField()
    accepted_objections = serializers.IntegerField()
    rejected_objections = serializers.IntegerField()
    objection_success_rate = serializers.FloatField()
    
    # Desglose
    state_breakdown = serializers.DictField()
    property_types = serializers.DictField()