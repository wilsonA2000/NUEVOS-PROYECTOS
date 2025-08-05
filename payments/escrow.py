"""
Sistema de Escrow (depósito en garantía) para VeriHome.
Maneja depósitos seguros entre arrendadores e inquilinos.
"""

from django.db import models, transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
import uuid
from .models import Transaction  # , Payment  # Modelo no encontrado

User = get_user_model()


class EscrowAccount(models.Model):
    """Cuenta de depósito en garantía para transacciones seguras."""
    
    ESCROW_STATUS = [
        ('active', 'Activa'),
        ('pending_release', 'Pendiente de liberación'),
        ('released', 'Liberada'),
        ('disputed', 'En disputa'),
        ('cancelled', 'Cancelada'),
        ('refunded', 'Reembolsada'),
    ]
    
    ESCROW_TYPES = [
        ('security_deposit', 'Depósito de seguridad'),
        ('rent_payment', 'Pago de renta'),
        ('service_payment', 'Pago de servicio'),
        ('property_purchase', 'Compra de propiedad'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account_number = models.CharField('Número de cuenta', max_length=50, unique=True)
    
    # Partes involucradas
    depositor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='escrow_deposits'
    )
    beneficiary = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='escrow_benefits'
    )
    
    # Información del escrow
    escrow_type = models.CharField('Tipo de escrow', max_length=20, choices=ESCROW_TYPES)
    amount = models.DecimalField('Monto', max_digits=12, decimal_places=2)
    currency = models.CharField('Moneda', max_length=3, default='MXN')
    
    # Referencias
    contract = models.ForeignKey(
        'contracts.Contract',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='escrow_accounts'
    )
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='escrow_accounts'
    )
    
    # Estado y condiciones
    status = models.CharField('Estado', max_length=20, choices=ESCROW_STATUS, default='active')
    release_conditions = models.TextField('Condiciones de liberación')
    
    # Fechas importantes
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    release_date = models.DateTimeField('Fecha de liberación programada', null=True, blank=True)
    actual_release_date = models.DateTimeField('Fecha de liberación real', null=True, blank=True)
    
    # Transacciones relacionadas
    deposit_transaction = models.OneToOneField(
        Transaction,
        on_delete=models.PROTECT,
        related_name='escrow_deposit',
        null=True,
        blank=True
    )
    release_transaction = models.OneToOneField(
        Transaction,
        on_delete=models.PROTECT,
        related_name='escrow_release',
        null=True,
        blank=True
    )
    
    # Disputa
    is_disputed = models.BooleanField('En disputa', default=False)
    dispute_reason = models.TextField('Razón de disputa', blank=True)
    dispute_date = models.DateTimeField('Fecha de disputa', null=True, blank=True)
    dispute_resolution = models.TextField('Resolución de disputa', blank=True)
    
    class Meta:
        db_table = 'payments_escrow_account'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['depositor', 'status']),
            models.Index(fields=['beneficiary', 'status']),
        ]
    
    def __str__(self):
        return f"Escrow {self.account_number} - {self.amount} {self.currency}"
    
    def save(self, *args, **kwargs):
        if not self.account_number:
            self.account_number = self.generate_account_number()
        super().save(*args, **kwargs)
    
    def generate_account_number(self):
        """Generar número único de cuenta escrow."""
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        random_suffix = str(uuid.uuid4())[:6].upper()
        return f"ESC-{timestamp}-{random_suffix}"
    
    @transaction.atomic
    def release_funds(self, release_reason="Condiciones cumplidas"):
        """Liberar fondos del escrow al beneficiario."""
        if self.status != 'active':
            raise ValueError(f"No se pueden liberar fondos de un escrow en estado {self.status}")
        
        # Crear transacción de liberación
        release_transaction = Transaction.objects.create(
            transaction_type='escrow_release',
            direction='outbound',
            payer=self.depositor,
            payee=self.beneficiary,
            amount=self.amount,
            currency=self.currency,
            total_amount=self.amount,
            status='completed',
            description=f"Liberación de escrow: {release_reason}",
            contract=self.contract,
            property=self.property
        )
        
        # Actualizar estado del escrow
        self.release_transaction = release_transaction
        self.status = 'released'
        self.actual_release_date = timezone.now()
        self.save()
        
        return release_transaction
    
    @transaction.atomic
    def refund(self, refund_reason="Cancelación de acuerdo"):
        """Reembolsar fondos al depositante."""
        if self.status not in ['active', 'disputed']:
            raise ValueError(f"No se puede reembolsar un escrow en estado {self.status}")
        
        # Crear transacción de reembolso
        refund_transaction = Transaction.objects.create(
            transaction_type='refund',
            direction='outbound',
            payer=self.beneficiary,
            payee=self.depositor,
            amount=self.amount,
            currency=self.currency,
            total_amount=self.amount,
            status='completed',
            description=f"Reembolso de escrow: {refund_reason}",
            contract=self.contract,
            property=self.property
        )
        
        # Actualizar estado del escrow
        self.status = 'refunded'
        self.actual_release_date = timezone.now()
        self.save()
        
        return refund_transaction
    
    def initiate_dispute(self, reason):
        """Iniciar una disputa sobre el escrow."""
        if self.status != 'active':
            raise ValueError("Solo se pueden disputar escrows activos")
        
        self.is_disputed = True
        self.status = 'disputed'
        self.dispute_reason = reason
        self.dispute_date = timezone.now()
        self.save()
    
    def resolve_dispute(self, resolution, release_to_beneficiary=True):
        """Resolver una disputa del escrow."""
        if not self.is_disputed:
            raise ValueError("Este escrow no está en disputa")
        
        self.dispute_resolution = resolution
        
        if release_to_beneficiary:
            return self.release_funds(f"Disputa resuelta: {resolution}")
        else:
            return self.refund(f"Disputa resuelta: {resolution}")


class EscrowMilestone(models.Model):
    """Hitos para liberación parcial de fondos en escrow."""
    
    escrow_account = models.ForeignKey(
        EscrowAccount,
        on_delete=models.CASCADE,
        related_name='milestones'
    )
    
    name = models.CharField('Nombre del hito', max_length=200)
    description = models.TextField('Descripción')
    amount = models.DecimalField('Monto a liberar', max_digits=10, decimal_places=2)
    
    due_date = models.DateTimeField('Fecha esperada')
    is_completed = models.BooleanField('Completado', default=False)
    completed_date = models.DateTimeField('Fecha de completación', null=True, blank=True)
    
    release_transaction = models.OneToOneField(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='milestone_release'
    )
    
    class Meta:
        db_table = 'payments_escrow_milestone'
        ordering = ['due_date']
    
    def __str__(self):
        return f"{self.name} - {self.amount} {self.escrow_account.currency}"
    
    @transaction.atomic
    def complete_and_release(self):
        """Marcar hito como completado y liberar fondos parciales."""
        if self.is_completed:
            raise ValueError("Este hito ya fue completado")
        
        if self.escrow_account.status != 'active':
            raise ValueError("El escrow debe estar activo para liberar hitos")
        
        # Crear transacción de liberación parcial
        release_transaction = Transaction.objects.create(
            transaction_type='escrow_release',
            direction='outbound',
            payer=self.escrow_account.depositor,
            payee=self.escrow_account.beneficiary,
            amount=self.amount,
            currency=self.escrow_account.currency,
            total_amount=self.amount,
            status='completed',
            description=f"Liberación de hito: {self.name}",
            contract=self.escrow_account.contract,
            property=self.escrow_account.property
        )
        
        # Actualizar hito
        self.is_completed = True
        self.completed_date = timezone.now()
        self.release_transaction = release_transaction
        self.save()
        
        # Verificar si todos los hitos están completados
        all_milestones = self.escrow_account.milestones.all()
        if all(m.is_completed for m in all_milestones):
            self.escrow_account.status = 'released'
            self.escrow_account.actual_release_date = timezone.now()
            self.escrow_account.save()
        
        return release_transaction