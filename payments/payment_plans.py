"""
Sistema de planes de pago para VeriHome.
Permite pagos diferidos y en cuotas.
"""

from django.db import models, transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
import uuid

User = get_user_model()


class PaymentPlan(models.Model):
    """Plan de pago para diferir pagos en cuotas."""
    
    PLAN_STATUS = [
        ('draft', 'Borrador'),
        ('pending_approval', 'Pendiente de aprobación'),
        ('active', 'Activo'),
        ('completed', 'Completado'),
        ('defaulted', 'En mora'),
        ('cancelled', 'Cancelado'),
    ]
    
    FREQUENCY_CHOICES = [
        ('weekly', 'Semanal'),
        ('biweekly', 'Quincenal'),
        ('monthly', 'Mensual'),
        ('quarterly', 'Trimestral'),
        ('custom', 'Personalizado'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan_number = models.CharField('Número de plan', max_length=50, unique=True)
    
    # Partes involucradas
    debtor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='payment_plans_as_debtor'
    )
    creditor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='payment_plans_as_creditor'
    )
    
    # Detalles del plan
    total_amount = models.DecimalField('Monto total', max_digits=12, decimal_places=2)
    currency = models.CharField('Moneda', max_length=3, default='MXN')
    
    # Configuración de cuotas
    number_of_installments = models.PositiveIntegerField('Número de cuotas')
    frequency = models.CharField('Frecuencia', max_length=20, choices=FREQUENCY_CHOICES)
    installment_amount = models.DecimalField('Monto por cuota', max_digits=10, decimal_places=2)
    
    # Intereses y cargos
    interest_rate = models.DecimalField(
        'Tasa de interés (%)',
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00')
    )
    setup_fee = models.DecimalField(
        'Cargo por configuración',
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00')
    )
    late_fee = models.DecimalField(
        'Cargo por mora',
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Estado
    status = models.CharField('Estado', max_length=20, choices=PLAN_STATUS, default='draft')
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    approved_at = models.DateTimeField('Fecha de aprobación', null=True, blank=True)
    start_date = models.DateField('Fecha de inicio')
    end_date = models.DateField('Fecha de finalización')
    
    # Referencias
    contract = models.ForeignKey(
        'contracts.Contract',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payment_plans'
    )
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payment_plans'
    )
    
    # Términos y condiciones
    terms_and_conditions = models.TextField('Términos y condiciones')
    notes = models.TextField('Notas', blank=True)
    
    # Montos acumulados
    total_paid = models.DecimalField(
        'Total pagado',
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_pending = models.DecimalField(
        'Total pendiente',
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    class Meta:
        db_table = 'payments_payment_plan'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['debtor', 'status']),
            models.Index(fields=['creditor', 'status']),
        ]
    
    def __str__(self):
        return f"Plan {self.plan_number} - {self.total_amount} {self.currency}"
    
    def save(self, *args, **kwargs):
        if not self.plan_number:
            self.plan_number = self.generate_plan_number()
        
        # Calcular monto por cuota si no está establecido
        if not self.installment_amount and self.number_of_installments:
            base_amount = self.total_amount / self.number_of_installments
            if self.interest_rate:
                # Cálculo simple de interés
                interest = base_amount * (self.interest_rate / 100)
                self.installment_amount = base_amount + interest
            else:
                self.installment_amount = base_amount
        
        # Calcular total pendiente
        self.total_pending = self.total_amount - self.total_paid
        
        super().save(*args, **kwargs)
    
    def generate_plan_number(self):
        """Generar número único de plan."""
        timestamp = timezone.now().strftime('%Y%m%d')
        random_suffix = str(uuid.uuid4())[:6].upper()
        return f"PLAN-{timestamp}-{random_suffix}"
    
    @transaction.atomic
    def generate_installments(self):
        """Generar todas las cuotas del plan."""
        if self.status != 'active':
            raise ValueError("Solo se pueden generar cuotas para planes activos")
        
        # Eliminar cuotas existentes no pagadas
        self.installments.filter(status='pending').delete()
        
        current_date = self.start_date
        
        for i in range(self.number_of_installments):
            installment_number = i + 1
            
            # Calcular fecha de vencimiento según frecuencia
            if self.frequency == 'weekly':
                due_date = current_date + timedelta(weeks=i)
            elif self.frequency == 'biweekly':
                due_date = current_date + timedelta(weeks=i*2)
            elif self.frequency == 'monthly':
                due_date = current_date + timedelta(days=30*i)
            elif self.frequency == 'quarterly':
                due_date = current_date + timedelta(days=90*i)
            else:
                # Custom - distribuir equitativamente
                days_between = (self.end_date - self.start_date).days
                days_per_installment = days_between / self.number_of_installments
                due_date = current_date + timedelta(days=int(days_per_installment * i))
            
            PaymentPlanInstallment.objects.create(
                payment_plan=self,
                installment_number=installment_number,
                amount=self.installment_amount,
                due_date=due_date,
                status='pending'
            )
    
    def approve(self):
        """Aprobar el plan de pago."""
        if self.status != 'pending_approval':
            raise ValueError("Solo se pueden aprobar planes pendientes")
        
        self.status = 'active'
        self.approved_at = timezone.now()
        self.save()
        
        # Generar cuotas
        self.generate_installments()
    
    def check_and_update_status(self):
        """Verificar y actualizar el estado del plan."""
        installments = self.installments.all()
        
        # Si todas las cuotas están pagadas
        if all(i.status == 'paid' for i in installments):
            self.status = 'completed'
        
        # Si hay cuotas vencidas
        elif any(i.is_overdue() for i in installments.filter(status='pending')):
            self.status = 'defaulted'
        
        self.save()


class PaymentPlanInstallment(models.Model):
    """Cuota individual de un plan de pago."""
    
    INSTALLMENT_STATUS = [
        ('pending', 'Pendiente'),
        ('paid', 'Pagada'),
        ('partial', 'Pago parcial'),
        ('overdue', 'Vencida'),
        ('forgiven', 'Condonada'),
    ]
    
    payment_plan = models.ForeignKey(
        PaymentPlan,
        on_delete=models.CASCADE,
        related_name='installments'
    )
    
    installment_number = models.PositiveIntegerField('Número de cuota')
    amount = models.DecimalField('Monto', max_digits=10, decimal_places=2)
    
    due_date = models.DateField('Fecha de vencimiento')
    paid_date = models.DateField('Fecha de pago', null=True, blank=True)
    
    status = models.CharField(
        'Estado',
        max_length=20,
        choices=INSTALLMENT_STATUS,
        default='pending'
    )
    
    amount_paid = models.DecimalField(
        'Monto pagado',
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Transacción de pago
    payment_transaction = models.ForeignKey(
        'Transaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='plan_installment'
    )
    
    # Cargos adicionales
    late_fee_applied = models.DecimalField(
        'Cargo por mora aplicado',
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    notes = models.TextField('Notas', blank=True)
    
    class Meta:
        db_table = 'payments_payment_plan_installment'
        ordering = ['payment_plan', 'installment_number']
        unique_together = [['payment_plan', 'installment_number']]
    
    def __str__(self):
        return f"Cuota {self.installment_number} - {self.amount}"
    
    def is_overdue(self):
        """Verificar si la cuota está vencida."""
        if self.status == 'paid':
            return False
        return timezone.now().date() > self.due_date
    
    @transaction.atomic
    def mark_as_paid(self, transaction):
        """Marcar cuota como pagada."""
        self.status = 'paid'
        self.paid_date = timezone.now().date()
        self.amount_paid = self.amount
        self.payment_transaction = transaction
        self.save()
        
        # Actualizar montos del plan
        self.payment_plan.total_paid += self.amount
        self.payment_plan.save()
        
        # Verificar estado del plan
        self.payment_plan.check_and_update_status()
    
    def apply_late_fee(self):
        """Aplicar cargo por mora si corresponde."""
        if self.is_overdue() and not self.late_fee_applied:
            self.late_fee_applied = self.payment_plan.late_fee
            self.amount += self.late_fee_applied
            self.save()