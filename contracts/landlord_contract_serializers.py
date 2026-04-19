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
    ContractWorkflowHistory,
    ContractModificationRequest
)

User = get_user_model()


class ContractObjectionSerializer(serializers.ModelSerializer):
    """Serializer para objeciones de contrato.

    Alineado con el modelo real `ContractObjection` (Fase A3): el modelo
    no tiene `objected_by`, `responded_by`, `response_note` ni
    `responded_at`; usa `field_reference`, `proposed_modification`,
    `objection_text`, `landlord_response`, `resolved_at`.
    """

    age_in_days = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = ContractObjection
        fields = [
            'id', 'contract',
            'objection_type', 'field_reference',
            'current_value', 'proposed_modification',
            'objection_text', 'priority', 'status',
            'landlord_response', 'landlord_counter_proposal',
            'final_resolution',
            'submitted_at', 'reviewed_at', 'resolved_at',
            'age_in_days', 'is_overdue',
        ]
        read_only_fields = ['id', 'submitted_at', 'reviewed_at', 'resolved_at']

    def get_age_in_days(self, obj):
        return obj.get_age_in_days() if hasattr(obj, 'get_age_in_days') else None

    def get_is_overdue(self, obj):
        return obj.is_overdue() if hasattr(obj, 'is_overdue') else None


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
    monthly_rent = serializers.SerializerMethodField()
    security_deposit = serializers.SerializerMethodField()
    contract_duration_months = serializers.SerializerMethodField()

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
    
    def get_monthly_rent(self, obj):
        return (obj.economic_terms or {}).get('monthly_rent')

    def get_security_deposit(self, obj):
        return (obj.economic_terms or {}).get('security_deposit')

    def get_contract_duration_months(self, obj):
        return (obj.contract_terms or {}).get('contract_duration_months')

    def get_progress_percentage(self, obj):
        state_progress = {
            'DRAFT': 10, 'PENDING_ADMIN_REVIEW': 15, 'RE_PENDING_ADMIN': 15,
            'TENANT_INVITED': 30, 'TENANT_REVIEWING': 50,
            'LANDLORD_REVIEWING': 70, 'BOTH_REVIEWING': 80,
            'READY_TO_SIGN': 90, 'FULLY_SIGNED': 95,
            'pending_tenant_biometric': 60, 'pending_guarantor_biometric': 70,
            'pending_landlord_biometric': 80, 'completed_biometric': 90,
            'active': 100, 'PUBLISHED': 100,
        }
        return state_progress.get(obj.current_state, 0)

    def get_days_in_current_state(self, obj):
        from django.utils import timezone
        return (timezone.now() - obj.updated_at).days

    def get_pending_objections_count(self, obj):
        return obj.objections.filter(status='PENDING').count()


class LandlordControlledContractDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalles de contrato.

    CRITICAL: Este serializer se usa tanto para lectura (retrieve) como para
    escritura (update, partial_update). Los campos contract_terms, landlord_data,
    tenant_data son JSONFields que se deben mergear en updates, no reemplazar.
    """

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
    # 1.9.2: historial completo desde ContractWorkflowHistory (reemplaza JSONField)
    history_entries = serializers.SerializerMethodField()

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

    # CRITICAL: JSONFields editables para updates
    contract_terms = serializers.JSONField(required=False)
    economic_terms = serializers.JSONField(required=False)
    landlord_data = serializers.JSONField(required=False)
    tenant_data = serializers.JSONField(required=False)
    property_data = serializers.JSONField(required=False)
    special_clauses = serializers.JSONField(required=False)

    class Meta:
        model = LandlordControlledContract
        fields = [
            # Información básica
            'id', 'contract_number', 'landlord', 'landlord_name', 'landlord_email',
            'tenant', 'tenant_name', 'tenant_email', 'property', 'property_details',

            # Estados y workflow
            'current_state', 'current_state_display', 'progress_percentage',
            'days_in_current_state', 'can_be_published',
            # Flujo circular de revisión (Plan Maestro V2.0)
            'review_cycle_count', 'tenant_return_notes',
            'is_locked', 'locked_at', 'locked_reason',
            'admin_reviewed', 'admin_reviewed_at', 'admin_review_notes',
            'admin_review_deadline', 'admin_review_escalated',

            # Datos del contrato (JSONFields editables)
            'contract_terms', 'economic_terms', 'property_data', 'special_clauses',

            # Campos calculados (read-only shortcuts)
            'monthly_rent', 'security_deposit',
            'contract_duration_months', 'utilities_included', 'pets_allowed',
            'smoking_allowed', 'additional_terms',

            # Datos de las partes (JSONFields editables)
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

            # Historial (1.9.2: modelo ContractWorkflowHistory, no JSONField)
            'history_entries',
        ]
        read_only_fields = [
            'id', 'contract_number', 'created_at', 'updated_at',
            'progress_percentage', 'days_in_current_state',
            'landlord_approved_at', 'tenant_approved_at',
            'landlord_signed_at', 'tenant_signed_at',
            'published_at'
        ]

    def update(self, instance, validated_data):
        """
        CRITICAL: Custom update method that properly merges JSONField data.

        This ensures that when the frontend sends partial contract_terms data,
        it gets merged with existing data instead of replacing it entirely.
        """
        import logging
        logger = logging.getLogger(__name__)

        # List of JSONFields that need to be merged, not replaced
        json_fields_to_merge = [
            'contract_terms', 'economic_terms', 'landlord_data',
            'tenant_data', 'property_data'
        ]

        for field_name in json_fields_to_merge:
            if field_name in validated_data:
                incoming_data = validated_data.pop(field_name)
                existing_data = getattr(instance, field_name) or {}

                # Deep merge: incoming data overwrites existing values
                if isinstance(incoming_data, dict) and isinstance(existing_data, dict):
                    merged_data = {**existing_data, **incoming_data}

                    # Special handling for nested objects in contract_terms
                    if field_name == 'contract_terms':
                        # Merge codeudor_data if present
                        if 'codeudor_data' in incoming_data and isinstance(incoming_data['codeudor_data'], dict):
                            existing_codeudor = existing_data.get('codeudor_data', {})
                            merged_data['codeudor_data'] = {**existing_codeudor, **incoming_data['codeudor_data']}

                        logger.info(f"[CONTRACT UPDATE] Merging contract_terms:")
                        logger.info(f"  - guarantee_type: {merged_data.get('guarantee_type')}")
                        logger.info(f"  - guarantor_required: {merged_data.get('guarantor_required')}")
                        logger.info(f"  - guests_policy: {merged_data.get('guests_policy')}")
                        logger.info(f"  - codeudor_data present: {bool(merged_data.get('codeudor_data'))}")

                    setattr(instance, field_name, merged_data)
                else:
                    # If not both dicts, just set the new value
                    setattr(instance, field_name, incoming_data)

        # Handle special_clauses separately (it's a list, not a dict)
        if 'special_clauses' in validated_data:
            instance.special_clauses = validated_data.pop('special_clauses')

        # Update remaining fields normally
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        logger.info(f"[CONTRACT UPDATE] Contract {instance.id} saved successfully")

        return instance
    
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
        """1.9.2: últimos 10 eventos desde ContractWorkflowHistory (modelo relacional)."""
        queryset = obj.history_entries.order_by('-timestamp')[:10]
        return ContractWorkflowHistorySerializer(queryset, many=True, context=self.context).data

    def get_history_entries(self, obj):
        """1.9.2: historial completo del workflow (ordenado más reciente primero)."""
        queryset = obj.history_entries.order_by('-timestamp')
        return ContractWorkflowHistorySerializer(queryset, many=True, context=self.context).data
    
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
    tenant_data = serializers.JSONField(required=False, default=dict)  # CRITICAL: Datos del arrendatario
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
            'property', 'property_data', 'landlord_data', 'tenant_data',  # CRITICAL: tenant_data agregado
            'basic_terms', 'guarantee_terms', 'special_clauses', 'contract_template',
            'contract_content', 'monthly_rent', 'security_deposit',
            'contract_duration_months', 'utilities_included', 'pets_allowed',
            'smoking_allowed'
        ]
    
    def create(self, validated_data):
        # Extraer datos estructurados del formulario
        property_data = validated_data.pop('property_data', {})
        landlord_data = validated_data.pop('landlord_data', {})
        tenant_data = validated_data.pop('tenant_data', {})  # CRITICAL: Extraer datos del arrendatario
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
        validated_data['landlord'] = self.context['request'].user
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

        # Preparar términos del contrato - INCLUYE TODOS LOS CAMPOS DEL FORMULARIO
        contract_terms = {
            # Duración y fechas
            'contract_duration_months': basic_terms.get('duration_months', basic_terms.get('contract_duration_months', contract_duration_months or 12)),
            'start_date': basic_terms.get('start_date', ''),
            'end_date': basic_terms.get('end_date', ''),

            # Pagos
            'payment_due_day': basic_terms.get('payment_day', basic_terms.get('payment_due_day', 5)),
            'grace_period_days': basic_terms.get('grace_period_days', 5),
            'rent_increase_type': basic_terms.get('rent_increase_type', 'ipc'),

            # Servicios incluidos
            'utilities_included': basic_terms.get('utilities_included', utilities_included),
            'internet_included': basic_terms.get('internet_included', False),

            # Políticas de uso
            'pets_allowed': basic_terms.get('pets_allowed', pets_allowed),
            'smoking_allowed': basic_terms.get('smoking_allowed', smoking_allowed),
            'guests_policy': basic_terms.get('guests_policy', 'limited'),
            'max_occupants': basic_terms.get('max_occupants', 4),

            # Responsabilidades
            'maintenance_responsibility': basic_terms.get('maintenance_responsibility', 'tenant'),
            'guarantor_required': basic_terms.get('guarantor_required', False),
            'guarantor_type': basic_terms.get('guarantor_type', 'personal'),
        }

        # Agregar datos de garantías del codeudor si existen
        if guarantee_terms and (guarantee_terms.get('guarantor_required') or guarantee_terms.get('guarantee_type', 'none') != 'none'):
            contract_terms.update({
                'guarantor_required': True,
                'guarantee_type': guarantee_terms.get('guarantee_type', 'codeudor'),
                'guarantee_amount': float(guarantee_terms.get('guarantee_amount', 0)),
                'requires_biometric_codeudor': guarantee_terms.get('requires_biometric_codeudor', False),
                'codeudor_data': guarantee_terms.get('codeudor_data', {})
            })

        validated_data['contract_terms'] = contract_terms

        # Asignar datos específicos para las secciones del contrato
        validated_data['property_data'] = self._enhance_property_data(property_data)
        validated_data['landlord_data'] = self._enhance_landlord_data(landlord_data)
        validated_data['tenant_data'] = self._enhance_tenant_data(tenant_data)  # CRITICAL: Guardar datos del arrendatario
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

    def _enhance_tenant_data(self, tenant_data):
        """Enriquecer datos del arrendatario para el contrato PDF.

        CRITICAL: Este método procesa todos los datos del formulario de arrendatario
        incluyendo información personal, laboral y de contacto de emergencia.
        """
        if not tenant_data:
            return {}

        enhanced = tenant_data.copy()

        # Formatear tipo de documento para el contrato PDF
        if 'document_type' in enhanced:
            doc_types = {
                'CC': 'Cédula de Ciudadanía',
                'CE': 'Cédula de Extranjería',
                'NIT': 'NIT',
                'PP': 'Pasaporte',
                'TI': 'Tarjeta de Identidad'
            }
            enhanced['document_type_display'] = doc_types.get(enhanced['document_type'], enhanced['document_type'])

        # Crear dirección completa del arrendatario
        address_parts = []
        if enhanced.get('current_address'):
            address_parts.append(enhanced['current_address'])
        if enhanced.get('city'):
            address_parts.append(enhanced['city'])
        if enhanced.get('department'):
            address_parts.append(enhanced['department'])
        if enhanced.get('country'):
            address_parts.append(enhanced['country'])
        if address_parts:
            enhanced['full_address'] = ', '.join(address_parts)

        # Formatear tipo de empleo para el contrato PDF
        if 'employment_type' in enhanced:
            employment_types = {
                'employee': 'Empleado',
                'self_employed': 'Trabajador Independiente',
                'business_owner': 'Empresario',
                'retired': 'Pensionado',
                'student': 'Estudiante',
                'other': 'Otro'
            }
            enhanced['employment_type_display'] = employment_types.get(enhanced['employment_type'], enhanced['employment_type'])

        # Formatear ingresos mensuales
        if 'monthly_income' in enhanced:
            try:
                income = float(enhanced['monthly_income'])
                enhanced['monthly_income_formatted'] = f"${income:,.0f} COP"
            except (ValueError, TypeError):
                enhanced['monthly_income_formatted'] = 'No especificado'

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


# ========================================
# SERIALIZERS: CONTRACT MODIFICATION REQUEST
# ========================================

class ContractModificationRequestSerializer(serializers.ModelSerializer):
    """
    Serializer completo para solicitudes de modificación de contratos.

    Incluye información del solicitante, contrato, y estado de la solicitud.
    """

    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    requested_by_email = serializers.EmailField(source='requested_by.email', read_only=True)
    contract_address = serializers.CharField(source='contract.property_address', read_only=True)
    can_request_another = serializers.SerializerMethodField()
    days_since_request = serializers.SerializerMethodField()

    class Meta:
        model = ContractModificationRequest
        fields = [
            'id',
            'contract',
            'requested_by',
            'requested_by_name',
            'requested_by_email',
            'contract_address',
            'requested_changes',
            'reason',
            'revision_number',
            'status',
            'landlord_response',
            'created_at',
            'updated_at',
            'responded_at',
            'can_request_another',
            'days_since_request'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'responded_at']

    def get_can_request_another(self, obj):
        """Verifica si se puede solicitar otra modificación (máximo 2 ciclos)."""
        return obj.can_request_another_modification()

    def get_days_since_request(self, obj):
        """Calcula días desde la solicitud."""
        from django.utils import timezone
        delta = timezone.now() - obj.created_at
        return delta.days


class ContractModificationRequestCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear solicitudes de modificación.

    Valida que el contrato esté en estado correcto y que no se exceda
    el límite de 2 ciclos de revisión.
    """

    class Meta:
        model = ContractModificationRequest
        fields = [
            'contract',
            'requested_changes',
            'reason'
        ]

    def validate_contract(self, value):
        """Valida que el contrato esté en estado válido para solicitar modificación."""
        # Estados válidos para solicitar modificación
        valid_states = [
            'TENANT_REVIEWING',
            'UNDER_MODIFICATION',
            'BOTH_REVIEWING',  # Ambas partes revisando
            'APPROVED_BY_TENANT',  # Aunque esté aprobado, puede solicitar cambio
            'DRAFT',  # Borrador inicial
        ]
        # Usar current_state que es el campo correcto del modelo
        if value.current_state not in valid_states:
            raise serializers.ValidationError(
                f"El contrato debe estar en revisión para solicitar modificaciones. "
                f"Estado actual: {value.get_current_state_display()}"
            )

        # Verificar que no exceda el límite de revisiones
        current_requests = value.modification_requests.count()
        if current_requests >= 2:
            raise serializers.ValidationError(
                "Se ha alcanzado el límite máximo de 2 ciclos de revisión para este contrato."
            )

        return value

    def validate_requested_changes(self, value):
        """Valida la estructura de requested_changes."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("requested_changes debe ser un objeto JSON.")

        if not value:
            raise serializers.ValidationError("Debe especificar al menos un cambio solicitado.")

        # Validar estructura de cada cambio
        for field_name, change_data in value.items():
            if not isinstance(change_data, dict):
                raise serializers.ValidationError(
                    f"Cada cambio debe ser un objeto. Error en campo: {field_name}"
                )

            required_keys = ['current_value', 'requested_value', 'reason']
            missing_keys = [k for k in required_keys if k not in change_data]
            if missing_keys:
                raise serializers.ValidationError(
                    f"Faltan campos requeridos en {field_name}: {', '.join(missing_keys)}"
                )

        return value

    def create(self, validated_data):
        """Crea la solicitud y actualiza el estado del contrato."""
        # Determinar número de revisión
        contract = validated_data['contract']
        revision_number = contract.modification_requests.count() + 1

        # Crear solicitud
        modification_request = ContractModificationRequest.objects.create(
            **validated_data,
            requested_by=self.context['request'].user,
            revision_number=revision_number
        )

        # Actualizar estado del contrato usando current_state (campo correcto)
        contract.current_state = 'MODIFICATION_REQUESTED'
        contract.save()

        return modification_request


class ContractModificationRequestResponseSerializer(serializers.Serializer):
    """
    Serializer para respuestas del arrendador a solicitudes de modificación.

    Permite aprobar o rechazar solicitudes con comentarios opcionales.
    """

    action = serializers.ChoiceField(choices=['approve', 'reject'], required=True)
    landlord_response = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        """Validación adicional."""
        if attrs['action'] == 'reject' and not attrs.get('landlord_response'):
            raise serializers.ValidationError({
                'landlord_response': 'Debe proporcionar una razón al rechazar la solicitud.'
            })
        return attrs

    def save(self, modification_request):
        """Procesa la respuesta del arrendador."""
        action = self.validated_data['action']
        landlord_response = self.validated_data.get('landlord_response', '')

        if action == 'approve':
            modification_request.approve_and_implement(landlord_response)
        elif action == 'reject':
            modification_request.reject(landlord_response)

        return modification_request