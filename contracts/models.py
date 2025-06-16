"""
Modelos para el sistema de contratos digitales de VeriHome.
Incluye contratos de arrendamiento, firmas digitales y seguimiento.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
import uuid
from datetime import timedelta

User = get_user_model()


class ContractTemplate(models.Model):
    """Plantillas de contratos para diferentes tipos de acuerdos."""
    
    TEMPLATE_TYPES = [
        ('rental', 'Contrato de Arrendamiento'),
        ('service', 'Contrato de Servicios'),
        ('sale', 'Contrato de Compraventa'),
        ('sublease', 'Contrato de Subarrendamiento'),
    ]
    
    name = models.CharField('Nombre de la plantilla', max_length=200)
    template_type = models.CharField('Tipo de plantilla', max_length=20, choices=TEMPLATE_TYPES)
    content = models.TextField('Contenido del contrato')
    variables = models.JSONField(
        'Variables disponibles',
        default=list,
        help_text='Lista de variables que se pueden usar en la plantilla'
    )
    is_default = models.BooleanField('Plantilla por defecto', default=False)
    is_active = models.BooleanField('Activa', default=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='contract_templates'
    )
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Plantilla de Contrato'
        verbose_name_plural = 'Plantillas de Contratos'
        ordering = ['template_type', 'name']
        
    def __str__(self):
        return f"{self.name} ({self.get_template_type_display()})"


class Contract(models.Model):
    """Modelo principal para contratos digitales."""
    
    CONTRACT_TYPES = [
        ('rental', 'Contrato de Arrendamiento'),
        ('service', 'Contrato de Servicios'),
        ('sale', 'Contrato de Compraventa'),
        ('sublease', 'Contrato de Subarrendamiento'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Borrador'),
        ('pending_review', 'Pendiente de Revisión'),
        ('pending_signature', 'Pendiente de Firma'),
        ('partially_signed', 'Parcialmente Firmado'),
        ('fully_signed', 'Completamente Firmado'),
        ('active', 'Activo'),
        ('expired', 'Vencido'),
        ('terminated', 'Terminado'),
        ('cancelled', 'Cancelado'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract_number = models.CharField('Número de contrato', max_length=50, unique=True)
    contract_type = models.CharField('Tipo de contrato', max_length=20, choices=CONTRACT_TYPES)
    template = models.ForeignKey(
        ContractTemplate,
        on_delete=models.SET_NULL,
        null=True,
        related_name='contracts'
    )
    
    # Partes del contrato
    primary_party = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='contracts_as_primary',
        verbose_name='Parte principal'
    )
    secondary_party = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='contracts_as_secondary',
        verbose_name='Parte secundaria'
    )
    
    # Información del contrato
    title = models.CharField('Título del contrato', max_length=200)
    description = models.TextField('Descripción', max_length=1000, blank=True)
    content = models.TextField('Contenido del contrato')
    
    # Fechas importantes
    start_date = models.DateField('Fecha de inicio')
    end_date = models.DateField('Fecha de finalización')
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    # Estado y seguimiento
    status = models.CharField('Estado', max_length=20, choices=STATUS_CHOICES, default='draft')
    is_renewable = models.BooleanField('Renovable automáticamente', default=False)
    auto_renewal_notice_days = models.PositiveIntegerField(
        'Días de aviso para renovación automática',
        default=30
    )
    
    # Información financiera (específica para contratos de arrendamiento)
    monthly_rent = models.DecimalField(
        'Renta mensual',
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    security_deposit = models.DecimalField(
        'Depósito de garantía',
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    late_fee = models.DecimalField(
        'Recargo por mora',
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Propiedad relacionada (para contratos de arrendamiento)
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contracts'
    )
    
    # Metadatos
    variables_data = models.JSONField(
        'Datos de variables',
        default=dict,
        help_text='Datos específicos utilizados en el contrato'
    )
    
    class Meta:
        verbose_name = 'Contrato'
        verbose_name_plural = 'Contratos'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.contract_number} - {self.title}"
    
    def save(self, *args, **kwargs):
        # Generar número de contrato único si no existe
        if not self.contract_number:
            year = timezone.now().year
            count = Contract.objects.filter(
                created_at__year=year
            ).count() + 1
            self.contract_number = f"VH-{year}-{count:06d}"
        
        super().save(*args, **kwargs)
    
    def is_expired(self):
        """Verifica si el contrato ha expirado."""
        return self.end_date < timezone.now().date()
    
    def days_until_expiry(self):
        """Calcula los días hasta el vencimiento."""
        if self.is_expired():
            return 0
        return (self.end_date - timezone.now().date()).days
    
    def get_signatories(self):
        """Obtiene todos los firmantes del contrato."""
        return [self.primary_party, self.secondary_party]
    
    def is_fully_signed(self):
        """Verifica si el contrato está completamente firmado."""
        signatures = self.signatures.filter(is_valid=True)
        signatories = self.get_signatories()
        return signatures.filter(signer__in=signatories).count() == len(signatories)
    
    def get_signature_status(self):
        """Obtiene el estado de las firmas."""
        signatures = self.signatures.filter(is_valid=True)
        signatories = self.get_signatories()
        signed_count = signatures.filter(signer__in=signatories).count()
        
        if signed_count == 0:
            return 'not_signed'
        elif signed_count < len(signatories):
            return 'partially_signed'
        else:
            return 'fully_signed'


class ContractSignature(models.Model):
    """Firmas digitales para contratos."""
    
    SIGNATURE_TYPES = [
        ('digital', 'Firma Digital'),
        ('electronic', 'Firma Electrónica'),
        ('biometric', 'Firma Biométrica'),
    ]
    
    contract = models.ForeignKey(
        Contract,
        on_delete=models.CASCADE,
        related_name='signatures'
    )
    signer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='contract_signatures'
    )
    
    # Información de la firma
    signature_type = models.CharField('Tipo de firma', max_length=20, choices=SIGNATURE_TYPES)
    signature_data = models.TextField('Datos de la firma', help_text='Firma codificada o hash')
    signature_image = models.ImageField(
        'Imagen de la firma',
        upload_to='signatures/',
        null=True,
        blank=True
    )
    
    # Información de verificación
    ip_address = models.GenericIPAddressField('Dirección IP')
    user_agent = models.TextField('User Agent')
    geolocation = models.JSONField('Geolocalización', default=dict, blank=True)
    
    # Fechas y validación
    signed_at = models.DateTimeField('Fecha de firma', auto_now_add=True)
    is_valid = models.BooleanField('Firma válida', default=True)
    verification_hash = models.CharField('Hash de verificación', max_length=256)
    
    # Información adicional
    witnessed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='witnessed_signatures'
    )
    notes = models.TextField('Notas', max_length=500, blank=True)
    
    class Meta:
        verbose_name = 'Firma de Contrato'
        verbose_name_plural = 'Firmas de Contratos'
        unique_together = ['contract', 'signer']
        ordering = ['signed_at']
        
    def __str__(self):
        return f"Firma de {self.signer.get_full_name()} - {self.contract.contract_number}"


class ContractAmendment(models.Model):
    """Enmiendas o modificaciones a contratos existentes."""
    
    AMENDMENT_STATUS = [
        ('draft', 'Borrador'),
        ('pending_approval', 'Pendiente de Aprobación'),
        ('approved', 'Aprobada'),
        ('rejected', 'Rechazada'),
        ('active', 'Activa'),
    ]
    
    contract = models.ForeignKey(
        Contract,
        on_delete=models.CASCADE,
        related_name='amendments'
    )
    amendment_number = models.CharField('Número de enmienda', max_length=20)
    title = models.CharField('Título de la enmienda', max_length=200)
    description = models.TextField('Descripción de cambios', max_length=1000)
    content = models.TextField('Contenido de la enmienda')
    
    # Información de cambios
    changes_summary = models.JSONField(
        'Resumen de cambios',
        default=dict,
        help_text='Estructura de los cambios realizados'
    )
    
    # Estado y aprobación
    status = models.CharField('Estado', max_length=20, choices=AMENDMENT_STATUS, default='draft')
    requested_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='requested_amendments'
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_amendments'
    )
    
    # Fechas
    effective_date = models.DateField('Fecha de vigencia', null=True, blank=True)
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    approved_at = models.DateTimeField('Fecha de aprobación', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Enmienda de Contrato'
        verbose_name_plural = 'Enmiendas de Contratos'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Enmienda {self.amendment_number} - {self.contract.contract_number}"


class ContractTermination(models.Model):
    """Registro de terminaciones de contratos."""
    
    TERMINATION_REASONS = [
        ('mutual_agreement', 'Acuerdo Mutuo'),
        ('breach_of_contract', 'Incumplimiento de Contrato'),
        ('non_payment', 'Falta de Pago'),
        ('property_damage', 'Daño a la Propiedad'),
        ('violation_of_terms', 'Violación de Términos'),
        ('early_termination', 'Terminación Anticipada'),
        ('natural_expiration', 'Vencimiento Natural'),
        ('force_majeure', 'Fuerza Mayor'),
        ('other', 'Otro'),
    ]
    
    contract = models.OneToOneField(
        Contract,
        on_delete=models.CASCADE,
        related_name='termination'
    )
    
    # Información de la terminación
    reason = models.CharField('Razón de terminación', max_length=30, choices=TERMINATION_REASONS)
    description = models.TextField('Descripción detallada', max_length=1000)
    requested_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='requested_terminations'
    )
    
    # Fechas importantes
    termination_date = models.DateField('Fecha de terminación')
    notice_date = models.DateField('Fecha de aviso')
    effective_date = models.DateField('Fecha efectiva')
    created_at = models.DateTimeField('Fecha de solicitud', auto_now_add=True)
    
    # Información financiera
    penalty_amount = models.DecimalField(
        'Monto de penalización',
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    refund_amount = models.DecimalField(
        'Monto de reembolso',
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    final_payment_due = models.DecimalField(
        'Pago final adeudado',
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Estado de aprobación
    is_approved = models.BooleanField('Aprobada', default=False)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_terminations'
    )
    approved_at = models.DateTimeField('Fecha de aprobación', null=True, blank=True)
    
    # Documentos
    termination_document = models.FileField(
        'Documento de terminación',
        upload_to='contracts/terminations/',
        null=True,
        blank=True
    )
    
    class Meta:
        verbose_name = 'Terminación de Contrato'
        verbose_name_plural = 'Terminaciones de Contratos'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Terminación - {self.contract.contract_number}"


class ContractRenewal(models.Model):
    """Renovaciones de contratos."""
    
    RENEWAL_STATUS = [
        ('pending', 'Pendiente'),
        ('approved', 'Aprobada'),
        ('rejected', 'Rechazada'),
        ('executed', 'Ejecutada'),
    ]
    
    original_contract = models.ForeignKey(
        Contract,
        on_delete=models.CASCADE,
        related_name='renewals'
    )
    new_contract = models.OneToOneField(
        Contract,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='renewal_from'
    )
    
    # Información de la renovación
    new_start_date = models.DateField('Nueva fecha de inicio')
    new_end_date = models.DateField('Nueva fecha de finalización')
    new_monthly_rent = models.DecimalField(
        'Nueva renta mensual',
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    rent_increase_percentage = models.DecimalField(
        'Porcentaje de aumento de renta',
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Estado y seguimiento
    status = models.CharField('Estado', max_length=20, choices=RENEWAL_STATUS, default='pending')
    requested_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='requested_renewals'
    )
    requested_at = models.DateTimeField('Fecha de solicitud', auto_now_add=True)
    
    # Cambios en términos
    terms_changes = models.JSONField(
        'Cambios en términos',
        default=dict,
        help_text='Cambios específicos en los términos del contrato'
    )
    notes = models.TextField('Notas adicionales', max_length=1000, blank=True)
    
    # Fechas de respuesta
    response_deadline = models.DateField('Fecha límite de respuesta')
    responded_at = models.DateTimeField('Fecha de respuesta', null=True, blank=True)
    executed_at = models.DateTimeField('Fecha de ejecución', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Renovación de Contrato'
        verbose_name_plural = 'Renovaciones de Contratos'
        ordering = ['-requested_at']
        
    def __str__(self):
        return f"Renovación - {self.original_contract.contract_number}"


class ContractDocument(models.Model):
    """Documentos adicionales relacionados con contratos."""
    
    DOCUMENT_TYPES = [
        ('addendum', 'Addendum'),
        ('attachment', 'Anexo'),
        ('evidence', 'Evidencia'),
        ('correspondence', 'Correspondencia'),
        ('invoice', 'Factura'),
        ('receipt', 'Recibo'),
        ('other', 'Otro'),
    ]
    
    contract = models.ForeignKey(
        Contract,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    
    # Información del documento
    title = models.CharField('Título', max_length=200)
    document_type = models.CharField('Tipo de documento', max_length=20, choices=DOCUMENT_TYPES)
    description = models.TextField('Descripción', max_length=500, blank=True)
    file = models.FileField('Archivo', upload_to='contracts/documents/')
    
    # Metadatos
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='uploaded_contract_documents'
    )
    file_size = models.PositiveIntegerField('Tamaño del archivo (bytes)', null=True, blank=True)
    mime_type = models.CharField('Tipo MIME', max_length=100, blank=True)
    
    # Fechas
    uploaded_at = models.DateTimeField('Fecha de subida', auto_now_add=True)
    document_date = models.DateField('Fecha del documento', null=True, blank=True)
    
    # Control de versiones
    version = models.PositiveIntegerField('Versión', default=1)
    replaces = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replaced_by'
    )
    
    class Meta:
        verbose_name = 'Documento de Contrato'
        verbose_name_plural = 'Documentos de Contratos'
        ordering = ['-uploaded_at']
        
    def __str__(self):
        return f"{self.title} - {self.contract.contract_number}"
