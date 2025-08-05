"""
Serializers para la aplicación de pagos de VeriHome.
"""

from rest_framework import serializers
from .models import (
    Transaction, PaymentMethod, Invoice, EscrowAccount,
    PaymentPlan, PaymentInstallment, RentPaymentSchedule, RentPaymentReminder
)
# Importaciones de escrow y payment plans ahora están en models.py


class PaymentMethodSerializer(serializers.ModelSerializer):
    """Serializer para métodos de pago."""
    
    class Meta:
        model = PaymentMethod
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'verified_at', 'last_used_at')
    
    def create(self, validated_data):
        """Asigna automáticamente el usuario."""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer para transacciones."""
    
    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ('id', 'transaction_number', 'created_at', 'processed_at', 'completed_at')
    
    def create(self, validated_data):
        """Asigna automáticamente el pagador."""
        validated_data['payer'] = self.context['request'].user
        return super().create(validated_data)


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer para facturas."""
    
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ('id', 'invoice_number', 'created_at', 'updated_at', 'viewed_at', 'sent_at')
    
    def create(self, validated_data):
        """Asigna automáticamente el emisor."""
        validated_data['issuer'] = self.context['request'].user
        return super().create(validated_data)


# class PaymentSerializer(serializers.ModelSerializer):
#     """Serializer para pagos mejorados."""
#     
#     payer_name = serializers.CharField(source='payer.get_full_name', read_only=True)
#     payee_name = serializers.CharField(source='payee.get_full_name', read_only=True)
#     
#     class Meta:
#         model = Payment
#         fields = '__all__'
#         read_only_fields = ('id', 'payment_number', 'created_at', 'processed_at', 'refunded_at')


# class CreatePaymentSerializer(serializers.ModelSerializer):
#     """Serializer para crear pagos."""
#     
#     class Meta:
#         model = Payment
#         fields = [
#             'payee', 'amount', 'currency', 'payment_method', 'description',
#             'contract', 'property', 'payment_type'
#         ]


# class EscrowAccountSerializer(serializers.ModelSerializer):
#     """Serializer para cuentas de escrow mejorado."""
#     
#     depositor_name = serializers.CharField(source='depositor.get_full_name', read_only=True)
#     beneficiary_name = serializers.CharField(source='beneficiary.get_full_name', read_only=True)
#     
#     class Meta:
#         model = EscrowAccount
#         fields = '__all__'
#         read_only_fields = ('id', 'account_number', 'created_at', 'actual_release_date')


# class EscrowMilestoneSerializer(serializers.ModelSerializer):
#     """Serializer para hitos de escrow."""
#     
#     class Meta:
#         model = EscrowMilestone
#         fields = '__all__'
#         read_only_fields = ('is_completed', 'completed_date', 'release_transaction')


# class PaymentPlanSerializer(serializers.ModelSerializer):
#     """Serializer para planes de pago mejorado."""
#     
#     debtor_name = serializers.CharField(source='debtor.get_full_name', read_only=True)
#     creditor_name = serializers.CharField(source='creditor.get_full_name', read_only=True)
#     installments_count = serializers.IntegerField(source='installments.count', read_only=True)
#     paid_installments = serializers.SerializerMethodField()
#     
#     class Meta:
#         model = PaymentPlan
#         fields = '__all__'
#         read_only_fields = ('id', 'plan_number', 'created_at', 'approved_at', 'total_paid', 'total_pending')
#     
#     def get_paid_installments(self, obj):
#         return obj.installments.filter(status='paid').count()


# class PaymentPlanInstallmentSerializer(serializers.ModelSerializer):
#     """Serializer para cuotas de planes de pago."""
#     
#     is_overdue = serializers.SerializerMethodField()
#     plan_number = serializers.CharField(source='payment_plan.plan_number', read_only=True)
#     
#     class Meta:
#         model = PaymentPlanInstallment
#         fields = '__all__'
#         read_only_fields = ('paid_date', 'payment_transaction', 'late_fee_applied')
#     
#     def get_is_overdue(self, obj):
        return obj.is_overdue()


class RentPaymentScheduleSerializer(serializers.ModelSerializer):
    """Serializer para cronogramas de pago de renta."""
    
    tenant_name = serializers.CharField(source='tenant.get_full_name', read_only=True)
    landlord_name = serializers.CharField(source='landlord.get_full_name', read_only=True)
    property_title = serializers.CharField(source='contract.property.title', read_only=True)
    next_due_date = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = RentPaymentSchedule
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
    
    def get_next_due_date(self, obj):
        return obj.get_next_due_date()
    
    def get_is_overdue(self, obj):
        return obj.is_payment_overdue()


class CreateTransactionSerializer(serializers.ModelSerializer):
    """Serializer para crear transacciones."""
    
    class Meta:
        model = Transaction
        fields = [
            'payee', 'transaction_type', 'direction', 'amount', 'currency',
            'platform_fee', 'processing_fee', 'payment_method', 'contract',
            'property', 'description', 'notes', 'due_date'
        ]
    
    def create(self, validated_data):
        """Asigna automáticamente el pagador y calcula el total."""
        validated_data['payer'] = self.context['request'].user
        
        # Calcular monto total
        amount = validated_data.get('amount', 0)
        platform_fee = validated_data.get('platform_fee', 0)
        processing_fee = validated_data.get('processing_fee', 0)
        validated_data['total_amount'] = amount + platform_fee + processing_fee
        
        return super().create(validated_data)


class CreateInvoiceSerializer(serializers.ModelSerializer):
    """Serializer para crear facturas."""
    
    class Meta:
        model = Invoice
        fields = [
            'recipient', 'invoice_type', 'title', 'description', 'subtotal',
            'tax_amount', 'discount_amount', 'currency', 'due_date', 'contract', 'property'
        ]
    
    def create(self, validated_data):
        """Asigna automáticamente el emisor y calcula el total."""
        validated_data['issuer'] = self.context['request'].user
        
        # Calcular monto total
        subtotal = validated_data.get('subtotal', 0)
        tax_amount = validated_data.get('tax_amount', 0)
        discount_amount = validated_data.get('discount_amount', 0)
        validated_data['total_amount'] = subtotal + tax_amount - discount_amount
        
        return super().create(validated_data)


class PaymentStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de pagos."""
    
    total_transactions = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_transactions = serializers.IntegerField()
    completed_transactions = serializers.IntegerField()
    failed_transactions = serializers.IntegerField()
    balance = serializers.DecimalField(max_digits=12, decimal_places=2)


class BalanceSerializer(serializers.Serializer):
    """Serializer para balance de usuario."""
    
    available_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField()


class EscrowAccountSerializer(serializers.ModelSerializer):
    """Serializer para cuentas de escrow."""
    
    buyer_name = serializers.CharField(source='buyer.get_full_name', read_only=True)
    seller_name = serializers.CharField(source='seller.get_full_name', read_only=True)
    
    class Meta:
        model = EscrowAccount
        fields = '__all__'
        read_only_fields = ('id', 'escrow_number', 'created_at', 'updated_at', 'funded_at', 'released_at')


class PaymentPlanSerializer(serializers.ModelSerializer):
    """Serializer para planes de pago."""
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    remaining_balance = serializers.SerializerMethodField()
    next_payment_date = serializers.SerializerMethodField()
    
    class Meta:
        model = PaymentPlan
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
    
    def get_remaining_balance(self, obj):
        return obj.get_remaining_balance()
    
    def get_next_payment_date(self, obj):
        return obj.get_next_payment_date()


class PaymentInstallmentSerializer(serializers.ModelSerializer):
    """Serializer para cuotas de planes de pago."""
    
    is_overdue = serializers.SerializerMethodField()
    total_amount_due = serializers.SerializerMethodField()
    plan_name = serializers.CharField(source='payment_plan.plan_name', read_only=True)
    
    class Meta:
        model = PaymentInstallment
        fields = '__all__'
        read_only_fields = ('created_at', 'paid_date')
    
    def get_is_overdue(self, obj):
        return obj.is_overdue()
    
    def get_total_amount_due(self, obj):
        return obj.get_total_amount_due() 