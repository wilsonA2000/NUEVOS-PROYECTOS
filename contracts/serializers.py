"""
Serializers para la aplicación de contratos de VeriHome.
"""

from rest_framework import serializers
from .models import (
    Contract, ContractTemplate, ContractSignature, ContractAmendment,
    ContractRenewal, ContractTermination, ContractDocument
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
    
    class Meta:
        model = Contract
        fields = '__all__'
        read_only_fields = ('id', 'contract_number', 'created_at', 'updated_at')
    
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