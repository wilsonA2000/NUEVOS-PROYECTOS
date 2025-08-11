"""
Serializers para el sistema de solicitudes de VeriHome.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import (
    BaseRequest, PropertyInterestRequest, ServiceRequest,
    ContractSignatureRequest, MaintenanceRequest,
    RequestAttachment, RequestComment, RequestNotification, TenantDocument
)

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para usuarios en solicitudes."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'user_type']


class RequestAttachmentSerializer(serializers.ModelSerializer):
    """Serializer para archivos adjuntos."""
    uploaded_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = RequestAttachment
        fields = ['id', 'file', 'filename', 'file_type', 'file_size', 'uploaded_at', 'uploaded_by']


class RequestCommentSerializer(serializers.ModelSerializer):
    """Serializer para comentarios de solicitudes."""
    author = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = RequestComment
        fields = ['id', 'content', 'is_internal', 'created_at', 'author']


class BaseRequestSerializer(serializers.ModelSerializer):
    """Serializer base para todas las solicitudes."""
    requester = UserBasicSerializer(read_only=True)
    assignee = UserBasicSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_color = serializers.CharField(source='get_status_color', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    attachments = RequestAttachmentSerializer(many=True, read_only=True)
    comments = RequestCommentSerializer(many=True, read_only=True)
    
    class Meta:
        model = BaseRequest
        fields = [
            'id', 'request_type', 'request_type_display', 'title', 'description',
            'requester', 'assignee', 'status', 'status_display', 'status_color',
            'priority', 'priority_display', 'created_at', 'updated_at',
            'due_date', 'completed_at', 'response_message', 'response_date',
            'is_overdue', 'metadata', 'attachments', 'comments'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CreateBaseRequestSerializer(serializers.ModelSerializer):
    """Serializer para crear solicitudes base."""
    
    class Meta:
        model = BaseRequest
        fields = [
            'request_type', 'title', 'description', 'assignee',
            'priority', 'due_date', 'metadata'
        ]
    
    def create(self, validated_data):
        validated_data['requester'] = self.context['request'].user
        return super().create(validated_data)


class PropertyInterestRequestSerializer(BaseRequestSerializer):
    """Serializer para solicitudes de interés en propiedades."""
    property_title = serializers.CharField(source='property.title', read_only=True)
    property_address = serializers.CharField(source='property.address', read_only=True)
    property_rent_price = serializers.DecimalField(source='property.rent_price', max_digits=10, decimal_places=2, read_only=True)
    
    class Meta(BaseRequestSerializer.Meta):
        model = PropertyInterestRequest
        fields = BaseRequestSerializer.Meta.fields + [
            'property', 'property_title', 'property_address', 'property_rent_price',
            'monthly_income', 'employment_type', 'preferred_move_in_date',
            'lease_duration_months', 'number_of_occupants', 'has_pets', 'pet_details',
            'smoking_allowed', 'has_rental_references', 'has_employment_proof',
            'has_credit_check'
        ]


class CreatePropertyInterestRequestSerializer(serializers.ModelSerializer):
    """Serializer para crear solicitudes de interés en propiedades."""
    
    class Meta:
        model = PropertyInterestRequest
        fields = [
            'property', 'title', 'description', 'priority', 'due_date',
            'monthly_income', 'employment_type', 'preferred_move_in_date',
            'lease_duration_months', 'number_of_occupants', 'has_pets', 'pet_details',
            'smoking_allowed', 'has_rental_references', 'has_employment_proof',
            'has_credit_check'
        ]
    
    def create(self, validated_data):
        property_obj = validated_data['property']
        validated_data['requester'] = self.context['request'].user
        validated_data['assignee'] = property_obj.landlord
        validated_data['request_type'] = 'property_interest'
        
        # Auto-generar título si no se proporciona
        if not validated_data.get('title'):
            validated_data['title'] = f"Interés en {property_obj.title}"
        
        return super().create(validated_data)


class ServiceRequestSerializer(BaseRequestSerializer):
    """Serializer para solicitudes de servicio."""
    property_title = serializers.CharField(source='property.title', read_only=True)
    property_address = serializers.CharField(source='property.address', read_only=True)
    service_category_display = serializers.CharField(source='get_service_category_display', read_only=True)
    
    class Meta(BaseRequestSerializer.Meta):
        model = ServiceRequest
        fields = BaseRequestSerializer.Meta.fields + [
            'property', 'property_title', 'property_address',
            'service_category', 'service_category_display',
            'estimated_cost', 'actual_cost', 'preferred_date', 'preferred_time',
            'flexible_schedule', 'location_details', 'urgency_level'
        ]


class CreateServiceRequestSerializer(serializers.ModelSerializer):
    """Serializer para crear solicitudes de servicio."""
    
    class Meta:
        model = ServiceRequest
        fields = [
            'property', 'assignee', 'title', 'description', 'service_category',
            'estimated_cost', 'preferred_date', 'preferred_time',
            'flexible_schedule', 'location_details', 'urgency_level', 'priority'
        ]
    
    def create(self, validated_data):
        validated_data['requester'] = self.context['request'].user
        validated_data['request_type'] = 'service_request'
        return super().create(validated_data)


class ContractSignatureRequestSerializer(BaseRequestSerializer):
    """Serializer para solicitudes de firma de contrato."""
    contract_title = serializers.CharField(source='contract.title', read_only=True)
    
    class Meta(BaseRequestSerializer.Meta):
        model = ContractSignatureRequest
        fields = BaseRequestSerializer.Meta.fields + [
            'contract', 'contract_title', 'contract_type',
            'rental_amount', 'security_deposit', 'lease_start_date', 'lease_end_date',
            'landlord_signed', 'tenant_signed', 'landlord_signature_date',
            'tenant_signature_date', 'documents_uploaded', 'verification_completed'
        ]


class MaintenanceRequestSerializer(BaseRequestSerializer):
    """Serializer para solicitudes de mantenimiento."""
    property_title = serializers.CharField(source='property.title', read_only=True)
    property_address = serializers.CharField(source='property.address', read_only=True)
    maintenance_type_display = serializers.CharField(source='get_maintenance_type_display', read_only=True)
    
    class Meta(BaseRequestSerializer.Meta):
        model = MaintenanceRequest
        fields = BaseRequestSerializer.Meta.fields + [
            'property', 'property_title', 'property_address',
            'maintenance_type', 'maintenance_type_display', 'affected_area',
            'issue_description', 'photos_uploaded', 'access_instructions',
            'requires_tenant_presence', 'estimated_duration_hours'
        ]


class CreateMaintenanceRequestSerializer(serializers.ModelSerializer):
    """Serializer para crear solicitudes de mantenimiento."""
    
    class Meta:
        model = MaintenanceRequest
        fields = [
            'property', 'assignee', 'title', 'description', 'maintenance_type',
            'affected_area', 'issue_description', 'access_instructions',
            'requires_tenant_presence', 'estimated_duration_hours', 'priority'
        ]
    
    def create(self, validated_data):
        validated_data['requester'] = self.context['request'].user
        validated_data['request_type'] = 'maintenance_request'
        return super().create(validated_data)


class RequestNotificationSerializer(serializers.ModelSerializer):
    """Serializer para notificaciones de solicitudes."""
    
    class Meta:
        model = RequestNotification
        fields = [
            'id', 'notification_type', 'title', 'message',
            'is_read', 'created_at', 'read_at'
        ]


class RequestStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de solicitudes."""
    total_requests = serializers.IntegerField()
    pending_requests = serializers.IntegerField()
    in_progress_requests = serializers.IntegerField()
    completed_requests = serializers.IntegerField()
    overdue_requests = serializers.IntegerField()
    by_type = serializers.DictField()
    by_priority = serializers.DictField()
    recent_activity = serializers.ListField()


class RequestActionSerializer(serializers.Serializer):
    """Serializer para acciones en solicitudes."""
    action = serializers.ChoiceField(choices=[
        ('accept', 'Aceptar'),
        ('reject', 'Rechazar'),
        ('complete', 'Completar'),
        ('cancel', 'Cancelar'),
        ('assign', 'Asignar'),
        ('update_status', 'Actualizar Estado'),
    ])
    message = serializers.CharField(required=False, allow_blank=True)
    assignee_id = serializers.UUIDField(required=False)
    new_status = serializers.CharField(required=False)
    metadata = serializers.DictField(required=False)


class TenantDocumentSerializer(serializers.ModelSerializer):
    """Serializer para documentos subidos por inquilinos."""
    uploaded_by = UserBasicSerializer(read_only=True)
    reviewed_by = UserBasicSerializer(read_only=True)
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    status_color = serializers.CharField(source='get_status_color', read_only=True)
    category = serializers.CharField(source='get_category', read_only=True)
    file_url = serializers.CharField(source='get_file_url', read_only=True)
    is_identity_document = serializers.BooleanField(read_only=True)
    is_codeudor_document = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = TenantDocument
        fields = [
            'id', 'document_type', 'document_type_display', 'category',
            'document_file', 'file_url', 'original_filename', 'file_size',
            'other_description', 'status', 'status_display', 'status_color',
            'review_notes', 'uploaded_by', 'reviewed_by', 'reviewed_at',
            'uploaded_at', 'updated_at', 'is_identity_document', 'is_codeudor_document'
        ]
        read_only_fields = [
            'id', 'uploaded_by', 'reviewed_by', 'reviewed_at', 
            'uploaded_at', 'updated_at'
        ]


class TenantDocumentUploadSerializer(serializers.ModelSerializer):
    """Serializer para subir documentos de inquilinos."""
    
    class Meta:
        model = TenantDocument
        fields = [
            'property_request', 'document_type', 'document_file', 
            'other_description'
        ]
    
    def validate_document_file(self, value):
        """Validar que solo se suban archivos PDF."""
        if not value.name.lower().endswith('.pdf'):
            raise serializers.ValidationError("Solo se permiten archivos PDF.")
        
        # Validar tamaño máximo (10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("El archivo no puede ser mayor a 10MB.")
        
        return value
    
    def validate(self, data):
        """Validaciones cruzadas."""
        # Si el tipo es 'otros', debe haber descripción
        if data.get('document_type') == 'otros' and not data.get('other_description'):
            raise serializers.ValidationError({
                'other_description': 'La descripción es requerida para documentos tipo "otros".'
            })
        
        # Si no es 'otros', no debe haber descripción
        if data.get('document_type') != 'otros' and data.get('other_description'):
            raise serializers.ValidationError({
                'other_description': 'La descripción solo se permite para documentos tipo "otros".'
            })
        
        return data
    
    def create(self, validated_data):
        """Crear documento con información adicional."""
        request = self.context['request']
        validated_data['uploaded_by'] = request.user
        
        # Extraer información del archivo
        document_file = validated_data['document_file']
        validated_data['original_filename'] = document_file.name
        validated_data['file_size'] = document_file.size
        
        return super().create(validated_data)


class TenantDocumentReviewSerializer(serializers.ModelSerializer):
    """Serializer para revisar documentos (solo para landlords)."""
    
    class Meta:
        model = TenantDocument
        fields = ['status', 'review_notes']
    
    def validate_status(self, value):
        """Validar estados permitidos para revisión."""
        allowed_statuses = ['approved', 'rejected', 'requires_correction']
        if value not in allowed_statuses:
            raise serializers.ValidationError(
                f"Estado no válido. Valores permitidos: {', '.join(allowed_statuses)}"
            )
        return value
    
    def update(self, instance, validated_data):
        """Actualizar documento con información de revisión."""
        request = self.context['request']
        validated_data['reviewed_by'] = request.user
        validated_data['reviewed_at'] = timezone.now()
        
        return super().update(instance, validated_data)


class DocumentChecklistSerializer(serializers.Serializer):
    """Serializer para el checklist de documentos."""
    
    # Categorías de documentos
    tomador_documents = serializers.ListField(read_only=True)
    codeudor_documents = serializers.ListField(read_only=True)
    otros_documents = serializers.ListField(read_only=True)
    
    # Estadísticas
    total_required = serializers.IntegerField(read_only=True)
    total_uploaded = serializers.IntegerField(read_only=True)
    total_approved = serializers.IntegerField(read_only=True)
    total_pending = serializers.IntegerField(read_only=True)
    total_rejected = serializers.IntegerField(read_only=True)
    
    # Estado general
    completion_percentage = serializers.FloatField(read_only=True)
    all_required_uploaded = serializers.BooleanField(read_only=True)
    all_approved = serializers.BooleanField(read_only=True)
    can_proceed = serializers.BooleanField(read_only=True)