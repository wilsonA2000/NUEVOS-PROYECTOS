"""
Sistema de pagos con Escrow integrado a contratos.
Manejo automático de liberación de fondos según hitos del contrato.
"""

from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from django.db import models, transaction
from django.core.exceptions import ValidationError
import uuid

from contracts.colombian_contracts import ColombianContract, ContractMilestone
from payments.models import Transaction


class ContractEscrowAccount(models.Model):
    """Cuenta de garantía para contratos"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.OneToOneField(
        ColombianContract,
        on_delete=models.PROTECT,
        related_name='escrow_account'
    )
    
    # Balance actual
    total_deposited = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    available_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    held_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    released_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Configuración de liberación automática
    auto_release_enabled = models.BooleanField(default=True)
    hold_period_hours = models.IntegerField(
        default=24,
        help_text="Horas antes de liberación automática"
    )
    
    # Estados
    status = models.CharField(max_length=20, choices=[
        ('ACTIVE', 'Activo'),
        ('FROZEN', 'Congelado'),
        ('DISPUTE', 'En Disputa'),
        ('CLOSED', 'Cerrado')
    ], default='ACTIVE')
    
    # Metadatos
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'escrow_accounts'

class EscrowTransaction(models.Model):
    """Transacciones en la cuenta de garantía"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    escrow_account = models.ForeignKey(
        ContractEscrowAccount,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    
    transaction_type = models.CharField(max_length=20, choices=[
        ('DEPOSIT', 'Depósito'),
        ('HOLD', 'Retención'),
        ('RELEASE', 'Liberación'),
        ('REFUND', 'Reembolso'),
        ('FEE', 'Comisión')
    ])
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField()
    
    # Relacionado con hitos del contrato
    related_milestone = models.ForeignKey(
        ContractMilestone,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Autorización y aprobación
    authorized_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='authorized_escrow_transactions'
    )
    
    # Estados de la transacción
    status = models.CharField(max_length=20, choices=[
        ('PENDING', 'Pendiente'),
        ('PROCESSING', 'Procesando'),
        ('COMPLETED', 'Completado'),
        ('FAILED', 'Fallido'),
        ('CANCELLED', 'Cancelado')
    ], default='PENDING')
    
    # Timestamps
    scheduled_for = models.DateTimeField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'escrow_transactions'
        ordering = ['-created_at']

class EscrowReleaseRule(models.Model):
    """Reglas para liberación automática de fondos"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    escrow_account = models.ForeignKey(
        ContractEscrowAccount,
        on_delete=models.CASCADE,
        related_name='release_rules'
    )
    
    rule_type = models.CharField(max_length=30, choices=[
        ('TIME_BASED', 'Basado en Tiempo'),
        ('MILESTONE_BASED', 'Basado en Hitos'),
        ('APPROVAL_BASED', 'Basado en Aprobación'),
        ('AUTOMATED', 'Completamente Automático')
    ])
    
    # Condiciones para liberación
    conditions = models.JSONField(default=dict)
    
    # Acciones al activarse
    actions = models.JSONField(default=dict)
    
    # Estado
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=1)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'escrow_release_rules'
        ordering = ['priority']


class EscrowService:
    """Servicio principal para manejo de cuentas de garantía"""
    
    @staticmethod
    @transaction.atomic
    def create_escrow_for_contract(contract: ColombianContract) -> ContractEscrowAccount:
        """Crea una cuenta de garantía para un contrato"""
        
        if hasattr(contract, 'escrow_account'):
            raise ValidationError("El contrato ya tiene una cuenta de garantía")
        
        escrow_account = ContractEscrowAccount.objects.create(
            contract=contract,
            auto_release_enabled=True,
            hold_period_hours=24
        )
        
        # Crear reglas de liberación automática
        EscrowService._create_default_release_rules(escrow_account)
        
        return escrow_account
    
    @staticmethod
    def _create_default_release_rules(escrow_account: ContractEscrowAccount):
        """Crea reglas de liberación por defecto"""
        
        # Regla 1: Liberación automática de pagos mensuales
        EscrowReleaseRule.objects.create(
            escrow_account=escrow_account,
            rule_type='TIME_BASED',
            conditions={
                'milestone_type': 'PAGO_MENSUAL',
                'auto_release_after_hours': 24,
                'require_landlord_confirmation': False
            },
            actions={
                'release_percentage': 100,
                'notify_parties': True,
                'create_receipt': True
            },
            priority=1
        )
        
        # Regla 2: Retención de depósito hasta final del contrato
        EscrowReleaseRule.objects.create(
            escrow_account=escrow_account,
            rule_type='MILESTONE_BASED',
            conditions={
                'milestone_type': 'DEVOLUCION_INMUEBLE',
                'require_inspection': True,
                'require_both_approvals': True
            },
            actions={
                'release_percentage': 100,
                'deduct_damages': True,
                'notify_parties': True
            },
            priority=2
        )
    
    @staticmethod
    @transaction.atomic
    def deposit_funds(
        escrow_account: ContractEscrowAccount,
        amount: Decimal,
        depositor: 'User',
        description: str,
        payment_method: str
    ) -> EscrowTransaction:
        """Deposita fondos en la cuenta de garantía"""
        
        if escrow_account.status not in ['ACTIVE']:
            raise ValidationError("La cuenta de garantía no está activa")
        
        # Crear transacción de depósito
        escrow_transaction = EscrowTransaction.objects.create(
            escrow_account=escrow_account,
            transaction_type='DEPOSIT',
            amount=amount,
            description=description,
            authorized_by=depositor,
            status='PROCESSING'
        )
        
        # Procesar pago real (integración con Stripe/PayPal)
        payment_result = EscrowService._process_payment(
            amount=amount,
            payment_method=payment_method,
            depositor=depositor
        )
        
        if payment_result['success']:
            # Actualizar balances
            escrow_account.total_deposited += amount
            escrow_account.available_balance += amount
            escrow_account.save()
            
            escrow_transaction.status = 'COMPLETED'
            escrow_transaction.processed_at = datetime.now()
            escrow_transaction.save()
            
            # Notificar partes
            EscrowService._notify_deposit(escrow_account, amount, depositor)
            
        else:
            escrow_transaction.status = 'FAILED'
            escrow_transaction.save()
            raise ValidationError(f"Error procesando pago: {payment_result['error']}")
        
        return escrow_transaction
    
    @staticmethod
    @transaction.atomic
    def hold_funds_for_milestone(
        milestone: ContractMilestone,
        amount: Decimal,
        hold_until: datetime
    ) -> EscrowTransaction:
        """Retiene fondos para un hito específico"""
        
        escrow_account = milestone.contract.escrow_account
        
        if escrow_account.available_balance < amount:
            raise ValidationError("Fondos insuficientes en la cuenta de garantía")
        
        hold_transaction = EscrowTransaction.objects.create(
            escrow_account=escrow_account,
            transaction_type='HOLD',
            amount=amount,
            description=f'Retención para {milestone.description}',
            related_milestone=milestone,
            scheduled_for=hold_until,
            status='COMPLETED'
        )
        
        # Actualizar balances
        escrow_account.available_balance -= amount
        escrow_account.held_balance += amount
        escrow_account.save()
        
        return hold_transaction
    
    @staticmethod
    @transaction.atomic
    def release_funds_for_milestone(
        milestone: ContractMilestone,
        release_amount: Optional[Decimal] = None,
        approved_by: Optional['User'] = None
    ) -> EscrowTransaction:
        """Libera fondos para un hito completado"""
        
        escrow_account = milestone.contract.escrow_account
        
        # Encontrar transacción de retención relacionada
        hold_transaction = EscrowTransaction.objects.filter(
            escrow_account=escrow_account,
            related_milestone=milestone,
            transaction_type='HOLD',
            status='COMPLETED'
        ).first()
        
        if not hold_transaction:
            raise ValidationError("No se encontró retención de fondos para este hito")
        
        amount_to_release = release_amount or hold_transaction.amount
        
        if amount_to_release > hold_transaction.amount:
            raise ValidationError("No se puede liberar más de lo retenido")
        
        # Crear transacción de liberación
        release_transaction = EscrowTransaction.objects.create(
            escrow_account=escrow_account,
            transaction_type='RELEASE',
            amount=amount_to_release,
            description=f'Liberación para {milestone.description}',
            related_milestone=milestone,
            authorized_by=approved_by,
            status='PROCESSING'
        )
        
        # Procesar transferencia al destinatario
        recipient = EscrowService._determine_release_recipient(milestone)
        transfer_result = EscrowService._transfer_funds(
            amount=amount_to_release,
            recipient=recipient,
            description=f'Pago por {milestone.description}'
        )
        
        if transfer_result['success']:
            # Actualizar balances
            escrow_account.held_balance -= amount_to_release
            escrow_account.released_balance += amount_to_release
            escrow_account.save()
            
            release_transaction.status = 'COMPLETED'
            release_transaction.processed_at = datetime.now()
            release_transaction.save()
            
            # Marcar hito como completado
            milestone.status = 'COMPLETED'
            milestone.completed_date = datetime.now()
            milestone.save()
            
            # Notificar partes
            EscrowService._notify_release(escrow_account, amount_to_release, recipient)
            
        else:
            release_transaction.status = 'FAILED'
            release_transaction.save()
            raise ValidationError(f"Error transfiriendo fondos: {transfer_result['error']}")
        
        return release_transaction
    
    @staticmethod
    def check_automatic_releases(escrow_account: ContractEscrowAccount):
        """Verifica y ejecuta liberaciones automáticas pendientes"""
        
        # Buscar transacciones programadas para liberación
        pending_releases = EscrowTransaction.objects.filter(
            escrow_account=escrow_account,
            transaction_type='RELEASE',
            status='PENDING',
            scheduled_for__lte=datetime.now()
        )
        
        for transaction in pending_releases:
            try:
                if transaction.related_milestone:
                    EscrowService.release_funds_for_milestone(
                        milestone=transaction.related_milestone,
                        release_amount=transaction.amount
                    )
            except Exception as e:
                # Log error pero continúa con otras transacciones
                print(f"Error en liberación automática: {e}")
    
    @staticmethod
    def _process_payment(amount: Decimal, payment_method: str, depositor: 'User') -> Dict:
        """Procesa el pago real (integración con pasarelas)"""
        # Implementación específica para Stripe/PayPal
        return {'success': True}  # Placeholder
    
    @staticmethod
    def _transfer_funds(amount: Decimal, recipient: 'User', description: str) -> Dict:
        """Transfiere fondos al destinatario"""
        # Implementación específica para transferencias
        return {'success': True}  # Placeholder
    
    @staticmethod
    def _determine_release_recipient(milestone: ContractMilestone) -> 'User':
        """Determina quién recibe los fondos según el tipo de hito"""
        if milestone.milestone_type in ['PAGO_MENSUAL', 'PAGO_SERVICIOS']:
            return milestone.contract.match_request.property.landlord
        elif milestone.milestone_type == 'DEVOLUCION_INMUEBLE':
            return milestone.contract.match_request.tenant
        else:
            return milestone.contract.match_request.property.landlord
    
    @staticmethod
    def _notify_deposit(escrow_account: ContractEscrowAccount, amount: Decimal, depositor: 'User'):
        """Notifica depósito a las partes"""
        # Implementar notificaciones
        pass
    
    @staticmethod
    def _notify_release(escrow_account: ContractEscrowAccount, amount: Decimal, recipient: 'User'):
        """Notifica liberación de fondos"""
        # Implementar notificaciones
        pass


class EscrowDisputeResolution:
    """Sistema de resolución de disputas en escrow"""
    
    @staticmethod
    def create_dispute(
        escrow_account: ContractEscrowAccount,
        initiated_by: 'User',
        dispute_reason: str,
        evidence: List[str]
    ):
        """Crea una disputa y congela los fondos"""
        
        # Congelar cuenta
        escrow_account.status = 'DISPUTE'
        escrow_account.save()
        
        # Crear registro de disputa
        # Implementar modelo de disputas
        
        # Notificar mediador
        # Implementar notificación de disputa
        pass
    
    @staticmethod
    def resolve_dispute(
        dispute_id: str,
        resolution: Dict,
        resolved_by: 'User'
    ):
        """Resuelve una disputa y redistribuye fondos"""
        # Implementar resolución de disputas
        pass