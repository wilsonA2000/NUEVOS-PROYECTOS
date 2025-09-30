"""
Sistema de pagos y transacciones para VeriHome.
Incluye pasarela de pagos, escrow, historial y facturación.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
import uuid

User = get_user_model()

# Importar modelos de escrow integration al final del archivo para evitar import circular
# Los modelos se importan usando __all__ al final


class PaymentMethod(models.Model):
    """Métodos de pago de los usuarios."""
    
    PAYMENT_TYPES = [
        ('credit_card', 'Tarjeta de Crédito'),
        ('debit_card', 'Tarjeta de Débito'),
        ('bank_transfer', 'Transferencia Bancaria'),
        ('paypal', 'PayPal'),
        ('stripe', 'Stripe'),
        ('cash', 'Efectivo'),
        ('check', 'Cheque'),
    ]
    
    CARD_BRANDS = [
        ('visa', 'Visa'),
        ('mastercard', 'Mastercard'),
        ('amex', 'American Express'),
        ('discover', 'Discover'),
        ('other', 'Otra'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='payment_methods'
    )
    
    # Información del método de pago
    payment_type = models.CharField('Tipo de pago', max_length=20, choices=PAYMENT_TYPES)
    name = models.CharField('Nombre descriptivo', max_length=100)
    
    # Información de tarjeta (encriptada/tokenizada)
    card_brand = models.CharField('Marca de tarjeta', max_length=20, choices=CARD_BRANDS, blank=True)
    card_last_four = models.CharField('Últimos 4 dígitos', max_length=4, blank=True)
    card_expiry_month = models.PositiveIntegerField('Mes de vencimiento', null=True, blank=True)
    card_expiry_year = models.PositiveIntegerField('Año de vencimiento', null=True, blank=True)
    
    # Información bancaria
    bank_name = models.CharField('Nombre del banco', max_length=100, blank=True)
    account_number_last_four = models.CharField('Últimos 4 dígitos de cuenta', max_length=4, blank=True)
    routing_number = models.CharField('Número de ruta', max_length=20, blank=True)
    
    # Tokens de pasarela de pago
    stripe_payment_method_id = models.CharField('ID de Stripe', max_length=100, blank=True)
    paypal_email = models.EmailField('Email de PayPal', blank=True)
    
    # Estado y configuración
    is_default = models.BooleanField('Método por defecto', default=False)
    is_active = models.BooleanField('Activo', default=True)
    is_verified = models.BooleanField('Verificado', default=False)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    verified_at = models.DateTimeField('Fecha de verificación', null=True, blank=True)
    last_used_at = models.DateTimeField('Último uso', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Método de Pago'
        verbose_name_plural = 'Métodos de Pago'
        ordering = ['-is_default', '-last_used_at']
        
    def __str__(self):
        return f"{self.name} - {self.user.get_full_name()}"
    
    def save(self, *args, **kwargs):
        # Si este método se marca como por defecto, desmarcar los demás
        if self.is_default:
            PaymentMethod.objects.filter(
                user=self.user,
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        
        super().save(*args, **kwargs)
    
    def get_display_name(self):
        """Devuelve un nombre de visualización seguro."""
        if self.payment_type in ['credit_card', 'debit_card']:
            return f"{self.card_brand.title() if self.card_brand else 'Tarjeta'} •••• {self.card_last_four}"
        elif self.payment_type == 'bank_transfer':
            return f"{self.bank_name} •••• {self.account_number_last_four}"
        elif self.payment_type == 'paypal':
            return f"PayPal ({self.paypal_email})"
        else:
            return self.name


class Transaction(models.Model):
    """Transacciones financieras en la plataforma."""
    
    TRANSACTION_TYPES = [
        ('rent_payment', 'Pago de Renta'),
        ('monthly_rent', 'Renta Mensual'),
        ('security_deposit', 'Depósito de Garantía'),
        ('service_payment', 'Pago de Servicios'),
        ('utilities', 'Servicios Públicos'),
        ('parking_fee', 'Cuota de Estacionamiento'),
        ('pet_deposit', 'Depósito por Mascota'),
        ('rent_increase', 'Aumento de Renta'),
        ('commission', 'Comisión'),
        ('refund', 'Reembolso'),
        ('penalty', 'Penalización'),
        ('late_fee', 'Recargo por Mora'),
        ('maintenance_fee', 'Cuota de Mantenimiento'),
        ('repair_cost', 'Costo de Reparación'),
        ('cleaning_fee', 'Tarifa de Limpieza'),
        ('platform_fee', 'Comisión de Plataforma'),
        ('escrow_deposit', 'Depósito en Escrow'),
        ('escrow_release', 'Liberación de Escrow'),
    ]
    
    TRANSACTION_STATUS = [
        ('pending', 'Pendiente'),
        ('processing', 'Procesando'),
        ('completed', 'Completada'),
        ('failed', 'Fallida'),
        ('cancelled', 'Cancelada'),
        ('refunded', 'Reembolsada'),
        ('disputed', 'En disputa'),
        ('on_hold', 'En espera'),
    ]
    
    PAYMENT_DIRECTION = [
        ('inbound', 'Entrada'),
        ('outbound', 'Salida'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction_number = models.CharField('Número de transacción', max_length=50, unique=True)
    
    # Partes involucradas
    payer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='payments_made'
    )
    payee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='payments_received'
    )
    
    # Información de la transacción
    transaction_type = models.CharField('Tipo de transacción', max_length=20, choices=TRANSACTION_TYPES)
    direction = models.CharField('Dirección', max_length=10, choices=PAYMENT_DIRECTION)
    amount = models.DecimalField('Monto', max_digits=12, decimal_places=2)
    currency = models.CharField('Moneda', max_length=3, default='MXN')
    
    # Comisiones y tarifas
    platform_fee = models.DecimalField('Comisión de plataforma', max_digits=8, decimal_places=2, default=Decimal('0.00'))
    processing_fee = models.DecimalField('Tarifa de procesamiento', max_digits=8, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField('Monto total', max_digits=12, decimal_places=2)
    
    # Estado y seguimiento
    status = models.CharField('Estado', max_length=20, choices=TRANSACTION_STATUS, default='pending')
    
    # Método de pago
    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.SET_NULL,
        null=True,
        related_name='transactions'
    )
    
    # Referencias relacionadas
    contract = models.ForeignKey(
        'contracts.Contract',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    
    # Referencia al escrow de contrato (para transacciones de escrow)
    escrow_reference = models.CharField(
        'Referencia de Escrow',
        max_length=100,
        blank=True,
        help_text='ID de la cuenta de escrow relacionada con contratos'
    )
    escrow_milestone_id = models.CharField(
        'ID de Hito de Escrow',
        max_length=100,
        blank=True,
        help_text='ID del hito de escrow que esta transacción libera'
    )
    
    # Información de la pasarela de pago
    gateway_provider = models.CharField('Proveedor de pasarela', max_length=50, blank=True)
    gateway_transaction_id = models.CharField('ID de transacción en pasarela', max_length=100, blank=True)
    gateway_response = models.JSONField('Respuesta de pasarela', default=dict, blank=True)
    
    # Descripción y notas
    description = models.CharField('Descripción', max_length=300)
    notes = models.TextField('Notas internas', max_length=1000, blank=True)
    
    # Fechas importantes
    due_date = models.DateField('Fecha de vencimiento', null=True, blank=True)
    processed_at = models.DateTimeField('Fecha de procesamiento', null=True, blank=True)
    completed_at = models.DateTimeField('Fecha de completado', null=True, blank=True)
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    # Información adicional
    metadata = models.JSONField('Metadatos adicionales', default=dict, blank=True)
    
    class Meta:
        verbose_name = 'Transacción'
        verbose_name_plural = 'Transacciones'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.transaction_number} - {self.get_transaction_type_display()}"
    
    def save(self, *args, **kwargs):
        # Generar número de transacción único si no existe
        if not self.transaction_number:
            year = timezone.now().year
            count = Transaction.objects.filter(
                created_at__year=year
            ).count() + 1
            self.transaction_number = f"TX-{year}-{count:08d}"
        
        # Calcular monto total si no está establecido
        if not self.total_amount:
            self.total_amount = self.amount + self.platform_fee + self.processing_fee
        
        super().save(*args, **kwargs)
    
    def can_be_refunded(self):
        """Verifica si la transacción puede ser reembolsada."""
        return self.status == 'completed' and self.direction == 'inbound'
    
    def get_net_amount(self):
        """Obtiene el monto neto después de comisiones."""
        if self.direction == 'inbound':
            return self.amount - self.platform_fee - self.processing_fee
        return self.amount


class EscrowAccount(models.Model):
    """Cuentas de escrow para transacciones seguras."""
    
    ESCROW_STATUS = [
        ('pending', 'Pendiente'),
        ('funded', 'Financiada'),
        ('released', 'Liberada'),
        ('disputed', 'En Disputa'),
        ('refunded', 'Reembolsada'),
        ('expired', 'Expirada'),
    ]
    
    ESCROW_TYPES = [
        ('security_deposit', 'Depósito de Garantía'),
        ('rent_payment', 'Pago de Renta'),
        ('service_payment', 'Pago de Servicios'),
        ('purchase_payment', 'Pago de Compra'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    escrow_number = models.CharField('Número de escrow', max_length=50, unique=True)
    
    # Partes involucradas
    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='escrow_accounts_as_buyer'
    )
    seller = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='escrow_accounts_as_seller'
    )
    
    # Información del escrow
    escrow_type = models.CharField('Tipo de escrow', max_length=20, choices=ESCROW_TYPES)
    amount = models.DecimalField('Monto', max_digits=12, decimal_places=2)
    currency = models.CharField('Moneda', max_length=3, default='MXN')
    
    # Estado y condiciones
    status = models.CharField('Estado', max_length=20, choices=ESCROW_STATUS, default='pending')
    release_conditions = models.JSONField(
        'Condiciones de liberación',
        default=list,
        help_text='Lista de condiciones que deben cumplirse'
    )
    
    # Referencias relacionadas
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
    
    # Transacciones relacionadas
    deposit_transaction = models.ForeignKey(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='escrow_deposits'
    )
    release_transaction = models.ForeignKey(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='escrow_releases'
    )
    
    # Fechas importantes
    funded_at = models.DateTimeField('Fecha de financiamiento', null=True, blank=True)
    release_date = models.DateField('Fecha de liberación programada', null=True, blank=True)
    released_at = models.DateTimeField('Fecha de liberación real', null=True, blank=True)
    expires_at = models.DateTimeField('Fecha de expiración', null=True, blank=True)
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    # Notas y descripción
    description = models.CharField('Descripción', max_length=300)
    notes = models.TextField('Notas', max_length=1000, blank=True)
    
    class Meta:
        verbose_name = 'Cuenta de Escrow'
        verbose_name_plural = 'Cuentas de Escrow'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Escrow {self.escrow_number} - {self.get_escrow_type_display()}"
    
    def save(self, *args, **kwargs):
        # Generar número de escrow único si no existe
        if not self.escrow_number:
            year = timezone.now().year
            count = EscrowAccount.objects.filter(
                created_at__year=year
            ).count() + 1
            self.escrow_number = f"ESC-{year}-{count:06d}"
        
        super().save(*args, **kwargs)
    
    def can_be_released(self):
        """Verifica si el escrow puede ser liberado."""
        return self.status == 'funded' and all(
            condition.get('met', False) for condition in self.release_conditions
        )
    
    def is_expired(self):
        """Verifica si el escrow ha expirado."""
        return self.expires_at and self.expires_at < timezone.now()


class Invoice(models.Model):
    """Facturas generadas en el sistema."""
    
    INVOICE_STATUS = [
        ('draft', 'Borrador'),
        ('sent', 'Enviada'),
        ('viewed', 'Vista'),
        ('paid', 'Pagada'),
        ('overdue', 'Vencida'),
        ('cancelled', 'Cancelada'),
        ('refunded', 'Reembolsada'),
    ]
    
    INVOICE_TYPES = [
        ('rent', 'Renta'),
        ('services', 'Servicios'),
        ('commission', 'Comisión'),
        ('fees', 'Tarifas'),
        ('other', 'Otro'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField('Número de factura', max_length=50, unique=True)
    
    # Partes involucradas
    issuer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='issued_invoices'
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='received_invoices'
    )
    
    # Información de la factura
    invoice_type = models.CharField('Tipo de factura', max_length=20, choices=INVOICE_TYPES)
    title = models.CharField('Título', max_length=200)
    description = models.TextField('Descripción', max_length=1000, blank=True)
    
    # Montos
    subtotal = models.DecimalField('Subtotal', max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField('Impuestos', max_digits=8, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField('Descuentos', max_digits=8, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField('Total', max_digits=12, decimal_places=2)
    currency = models.CharField('Moneda', max_length=3, default='MXN')
    
    # Estado y fechas
    status = models.CharField('Estado', max_length=20, choices=INVOICE_STATUS, default='draft')
    issue_date = models.DateField('Fecha de emisión', default=timezone.now)
    due_date = models.DateField('Fecha de vencimiento')
    paid_date = models.DateField('Fecha de pago', null=True, blank=True)
    
    # Referencias relacionadas
    contract = models.ForeignKey(
        'contracts.Contract',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices'
    )
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices'
    )
    transaction = models.OneToOneField(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice'
    )
    
    # Archivos
    pdf_file = models.FileField('Archivo PDF', upload_to='invoices/', null=True, blank=True)
    
    # Metadatos
    viewed_at = models.DateTimeField('Fecha de visualización', null=True, blank=True)
    sent_at = models.DateTimeField('Fecha de envío', null=True, blank=True)
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Factura'
        verbose_name_plural = 'Facturas'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Factura {self.invoice_number} - {self.title}"
    
    def save(self, *args, **kwargs):
        # Generar número de factura único si no existe
        if not self.invoice_number:
            year = timezone.now().year
            count = Invoice.objects.filter(
                created_at__year=year
            ).count() + 1
            self.invoice_number = f"INV-{year}-{count:06d}"
        
        # Calcular total si no está establecido
        if not self.total_amount:
            self.total_amount = self.subtotal + self.tax_amount - self.discount_amount
        
        super().save(*args, **kwargs)
    
    def is_overdue(self):
        """Verifica si la factura está vencida."""
        return self.due_date < timezone.now().date() and self.status not in ['paid', 'cancelled']
    
    def days_overdue(self):
        """Calcula los días de vencimiento."""
        if not self.is_overdue():
            return 0
        return (timezone.now().date() - self.due_date).days


class InvoiceItem(models.Model):
    """Elementos individuales de las facturas."""
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='items'
    )
    
    # Información del elemento
    description = models.CharField('Descripción', max_length=300)
    quantity = models.DecimalField('Cantidad', max_digits=8, decimal_places=2, default=Decimal('1.00'))
    unit_price = models.DecimalField('Precio unitario', max_digits=10, decimal_places=2)
    total_price = models.DecimalField('Precio total', max_digits=12, decimal_places=2)
    
    # Impuestos y descuentos
    tax_rate = models.DecimalField('Tasa de impuesto (%)', max_digits=5, decimal_places=2, default=Decimal('0.00'))
    discount_rate = models.DecimalField('Tasa de descuento (%)', max_digits=5, decimal_places=2, default=Decimal('0.00'))
    
    # Orden
    order = models.PositiveIntegerField('Orden', default=0)
    
    class Meta:
        verbose_name = 'Elemento de Factura'
        verbose_name_plural = 'Elementos de Facturas'
        ordering = ['order']
        
    def __str__(self):
        return f"{self.description} - {self.invoice.invoice_number}"
    
    def save(self, *args, **kwargs):
        # Calcular precio total
        if not self.total_price:
            self.total_price = self.quantity * self.unit_price
        
        super().save(*args, **kwargs)


class PaymentPlan(models.Model):
    """Planes de pago para transacciones grandes."""
    
    PLAN_STATUS = [
        ('active', 'Activo'),
        ('completed', 'Completado'),
        ('defaulted', 'En Mora'),
        ('cancelled', 'Cancelado'),
    ]
    
    FREQUENCY_CHOICES = [
        ('weekly', 'Semanal'),
        ('biweekly', 'Quincenal'),
        ('monthly', 'Mensual'),
        ('quarterly', 'Trimestral'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='payment_plans'
    )
    
    # Información del plan
    plan_name = models.CharField('Nombre del plan', max_length=200)
    total_amount = models.DecimalField('Monto total', max_digits=12, decimal_places=2)
    installment_amount = models.DecimalField('Monto de cuota', max_digits=10, decimal_places=2)
    number_of_installments = models.PositiveIntegerField('Número de cuotas')
    frequency = models.CharField('Frecuencia', max_length=20, choices=FREQUENCY_CHOICES)
    
    # Estado y fechas
    status = models.CharField('Estado', max_length=20, choices=PLAN_STATUS, default='active')
    start_date = models.DateField('Fecha de inicio')
    end_date = models.DateField('Fecha de finalización')
    
    # Referencias relacionadas
    contract = models.ForeignKey(
        'contracts.Contract',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payment_plans'
    )
    
    # Configuración
    auto_charge = models.BooleanField('Cargo automático', default=True)
    grace_period_days = models.PositiveIntegerField('Días de gracia', default=5)
    late_fee_amount = models.DecimalField('Recargo por mora', max_digits=8, decimal_places=2, default=Decimal('0.00'))
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Plan de Pago'
        verbose_name_plural = 'Planes de Pago'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.plan_name} - {self.user.get_full_name()}"
    
    def get_next_payment_date(self):
        """Obtiene la fecha del próximo pago."""
        last_payment = self.installments.filter(status='paid').order_by('-due_date').first()
        if not last_payment:
            return self.start_date
        
        # Calcular siguiente fecha basada en la frecuencia
        if self.frequency == 'weekly':
            return last_payment.due_date + timedelta(weeks=1)
        elif self.frequency == 'biweekly':
            return last_payment.due_date + timedelta(weeks=2)
        elif self.frequency == 'monthly':
            return last_payment.due_date + timedelta(days=30)
        elif self.frequency == 'quarterly':
            return last_payment.due_date + timedelta(days=90)
        
        return None
    
    def get_remaining_balance(self):
        """Obtiene el saldo pendiente."""
        paid_amount = self.installments.filter(status='paid').aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        return self.total_amount - paid_amount


class PaymentInstallment(models.Model):
    """Cuotas individuales de los planes de pago."""
    
    INSTALLMENT_STATUS = [
        ('pending', 'Pendiente'),
        ('paid', 'Pagada'),
        ('overdue', 'Vencida'),
        ('failed', 'Fallida'),
        ('waived', 'Exonerada'),
    ]
    
    payment_plan = models.ForeignKey(
        PaymentPlan,
        on_delete=models.CASCADE,
        related_name='installments'
    )
    
    # Información de la cuota
    installment_number = models.PositiveIntegerField('Número de cuota')
    amount = models.DecimalField('Monto', max_digits=10, decimal_places=2)
    late_fee = models.DecimalField('Recargo por mora', max_digits=8, decimal_places=2, default=Decimal('0.00'))
    
    # Estado y fechas
    status = models.CharField('Estado', max_length=20, choices=INSTALLMENT_STATUS, default='pending')
    due_date = models.DateField('Fecha de vencimiento')
    paid_date = models.DateField('Fecha de pago', null=True, blank=True)
    
    # Transacción relacionada
    transaction = models.OneToOneField(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='installment'
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Cuota de Pago'
        verbose_name_plural = 'Cuotas de Pago'
        unique_together = ['payment_plan', 'installment_number']
        ordering = ['installment_number']
        
    def __str__(self):
        return f"Cuota {self.installment_number} - {self.payment_plan.plan_name}"
    
    def is_overdue(self):
        """Verifica si la cuota está vencida."""
        return self.due_date < timezone.now().date() and self.status == 'pending'
    
    def get_total_amount_due(self):
        """Obtiene el monto total adeudado incluyendo recargos."""
        return self.amount + self.late_fee


class RentPaymentSchedule(models.Model):
    """Cronograma de pagos de alquiler automático."""
    
    # Relaciones
    contract = models.OneToOneField(
        'contracts.Contract',
        on_delete=models.CASCADE,
        related_name='rent_schedule',
        verbose_name='Contrato'
    )
    tenant = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='rent_schedules',
        verbose_name='Arrendatario'
    )
    landlord = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='landlord_rent_schedules',
        verbose_name='Arrendador'
    )
    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Método de pago automático'
    )
    
    # Detalles del pago
    rent_amount = models.DecimalField('Monto de renta', max_digits=10, decimal_places=2)
    due_date = models.PositiveIntegerField('Día de vencimiento', default=1)  # Día del mes
    late_fee_amount = models.DecimalField('Recargo por mora', max_digits=10, decimal_places=2, default=0)
    grace_period_days = models.PositiveIntegerField('Días de gracia', default=5)
    
    # Configuración automática
    auto_charge_enabled = models.BooleanField('Cobro automático habilitado', default=False)
    auto_late_fee_enabled = models.BooleanField('Recargo automático por mora', default=True)
    
    # Notificaciones
    reminder_days_before = models.PositiveIntegerField('Días de recordatorio antes', default=3)
    send_payment_confirmations = models.BooleanField('Enviar confirmaciones de pago', default=True)
    
    # Estado
    is_active = models.BooleanField('Activo', default=True)
    start_date = models.DateField('Fecha de inicio')
    end_date = models.DateField('Fecha de fin', null=True, blank=True)
    last_payment_date = models.DateField('Última fecha de pago', null=True, blank=True)
    
    # Metadatos
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Cronograma de Pago de Renta'
        verbose_name_plural = 'Cronogramas de Pago de Renta'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Renta {self.contract.property.title} - {self.tenant.get_full_name()}"
    
    def get_next_due_date(self):
        """Obtiene la próxima fecha de vencimiento."""
        from datetime import date, timedelta
        from calendar import monthrange
        
        today = date.today()
        
        # Si estamos antes del día de vencimiento este mes
        if today.day < self.due_date:
            try:
                return date(today.year, today.month, self.due_date)
            except ValueError:  # El día no existe en este mes
                # Usar el último día del mes
                last_day = monthrange(today.year, today.month)[1]
                return date(today.year, today.month, min(self.due_date, last_day))
        
        # Calcular para el próximo mes
        if today.month == 12:
            next_month = 1
            next_year = today.year + 1
        else:
            next_month = today.month + 1
            next_year = today.year
            
        try:
            return date(next_year, next_month, self.due_date)
        except ValueError:
            last_day = monthrange(next_year, next_month)[1]
            return date(next_year, next_month, min(self.due_date, last_day))
    
    def is_payment_overdue(self):
        """Verifica si el pago actual está vencido."""
        from datetime import date, timedelta
        
        due_date = self.get_next_due_date()
        grace_end = due_date + timedelta(days=self.grace_period_days)
        
        return date.today() > grace_end
    
    def calculate_late_fee(self):
        """Calcula el recargo por mora si aplica."""
        if self.is_payment_overdue() and self.auto_late_fee_enabled:
            return self.late_fee_amount
        return 0


class RentPaymentReminder(models.Model):
    """Recordatorios de pago de renta."""
    
    REMINDER_TYPES = [
        ('upcoming', 'Próximo Vencimiento'),
        ('due_today', 'Vence Hoy'),
        ('overdue', 'Vencido'),
        ('late_fee_applied', 'Recargo Aplicado'),
    ]
    
    schedule = models.ForeignKey(
        RentPaymentSchedule,
        on_delete=models.CASCADE,
        related_name='reminders',
        verbose_name='Cronograma'
    )
    reminder_type = models.CharField('Tipo de recordatorio', max_length=20, choices=REMINDER_TYPES)
    due_date = models.DateField('Fecha de vencimiento')
    amount_due = models.DecimalField('Monto adeudado', max_digits=10, decimal_places=2)
    
    # Estado del recordatorio
    sent_at = models.DateTimeField('Enviado el', null=True, blank=True)
    is_sent = models.BooleanField('Enviado', default=False)
    
    # Metadatos
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Recordatorio de Pago'
        verbose_name_plural = 'Recordatorios de Pago'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.get_reminder_type_display()} - {self.schedule.tenant.get_full_name()}"


# Importar modelos de escrow integration
try:
    from .escrow_integration import (
        ContractEscrowAccount,
        EscrowTransaction as ContractEscrowTransaction,
        EscrowReleaseRule as ContractEscrowReleaseRule,
        EscrowService as ContractEscrowService
    )
    # Hacer disponibles los modelos de escrow para otros módulos
    __all__ = [
        'PaymentMethod', 'Transaction', 'EscrowAccount', 'Invoice', 'InvoiceItem',
        'PaymentPlan', 'PaymentInstallment', 'RentPaymentSchedule', 'RentPaymentReminder',
        'ContractEscrowAccount', 'ContractEscrowTransaction', 'ContractEscrowReleaseRule', 'ContractEscrowService'
    ]
except ImportError:
    # Si no está disponible escrow integration, solo exportar modelos básicos
    __all__ = [
        'PaymentMethod', 'Transaction', 'EscrowAccount', 'Invoice', 'InvoiceItem',
        'PaymentPlan', 'PaymentInstallment', 'RentPaymentSchedule', 'RentPaymentReminder'
    ]
