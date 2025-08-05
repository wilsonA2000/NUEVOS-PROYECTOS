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
import hashlib
import json

User = get_user_model()


class ContractTemplate(models.Model):
    """Plantillas de contratos para diferentes tipos de acuerdos."""
    
    TEMPLATE_TYPES = [
        ('rental_urban', 'Arrendamiento de Vivienda Urbana'),
        ('rental_commercial', 'Arrendamiento de Local Comercial'),
        ('rental_room', 'Arrendamiento de Habitación'),
        ('rental_rural', 'Arrendamiento de Lote de Terreno Rural'),
        ('service_provider', 'Contrato de Prestación de Servicios'),
        ('other', 'Otro'),
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
        ('rental_urban', 'Arrendamiento de Vivienda Urbana'),
        ('rental_commercial', 'Arrendamiento de Local Comercial'),
        ('rental_room', 'Arrendamiento de Habitación'),
        ('rental_rural', 'Arrendamiento de Lote de Terreno Rural'),
        ('service_provider', 'Contrato de Prestación de Servicios'),
        ('other', 'Otro'),
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
        verbose_name='Parte principal (Arrendador/Cliente)'
    )
    secondary_party = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='contracts_as_secondary',
        verbose_name='Parte secundaria (Arrendatario/Prestador)'
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
    
    # Campos para PDF y descarga
    pdf_file = models.FileField(
        'Archivo PDF del contrato',
        upload_to='contracts/pdfs/',
        null=True,
        blank=True
    )
    pdf_generated_at = models.DateTimeField('Fecha de generación PDF', null=True, blank=True)
    is_downloadable = models.BooleanField('Descargable', default=False)
    
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
        total_count = len(signatories)
        
        return {
            'signed_count': signed_count,
            'total_count': total_count,
            'is_complete': signed_count == total_count,
            'percentage': (signed_count / total_count * 100) if total_count > 0 else 0
        }
    
    def can_be_downloaded_by(self, user):
        """Verifica si un usuario puede descargar el contrato."""
        if not self.is_downloadable:
            return False
        
        # Solo el arrendador puede descargar contratos de arrendamiento
        if self.contract_type.startswith('rental_'):
            return user == self.primary_party
        
        # Para contratos de servicios, tanto cliente como prestador pueden descargar
        if self.contract_type == 'service_provider':
            return user in [self.primary_party, self.secondary_party]
        
        return False
    
    def can_be_viewed_by(self, user):
        """Verifica si un usuario puede ver el contrato."""
        # Los firmantes siempre pueden ver
        if user in [self.primary_party, self.secondary_party]:
            return True
        
        # Para contratos de servicios, el prestador puede ver pero no descargar
        if self.contract_type == 'service_provider' and user == self.secondary_party:
            return True
        
        return False


class ContractSignature(models.Model):
    """Firmas digitales para contratos con autenticación avanzada."""
    
    SIGNATURE_TYPES = [
        ('digital', 'Firma Digital'),
        ('electronic', 'Firma Electrónica'),
        ('biometric', 'Firma Biométrica'),
        ('webcam', 'Firma con Cámara Web'),
    ]
    
    AUTHENTICATION_METHODS = [
        ('password', 'Contraseña'),
        ('webcam_face', 'Reconocimiento Facial'),
        ('webcam_document', 'Documento de Identidad'),
        ('biometric_fingerprint', 'Huella Digital'),
        ('sms_verification', 'Verificación SMS'),
        ('email_verification', 'Verificación Email'),
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
    authentication_method = models.CharField('Método de autenticación', max_length=30, choices=AUTHENTICATION_METHODS)
    signature_data = models.TextField('Datos de la firma', help_text='Firma codificada o hash')
    signature_image = models.ImageField(
        'Imagen de la firma',
        upload_to='signatures/',
        null=True,
        blank=True
    )
    
    # Datos de autenticación biométrica
    face_verification_data = models.JSONField(
        'Datos de verificación facial',
        default=dict,
        blank=True,
        help_text='Datos de reconocimiento facial'
    )
    document_verification_data = models.JSONField(
        'Datos de verificación de documento',
        default=dict,
        blank=True,
        help_text='Datos de verificación de documento de identidad'
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
    
    # Verificación de seguridad
    security_checks = models.JSONField(
        'Verificaciones de seguridad',
        default=dict,
        help_text='Resultados de verificaciones de seguridad'
    )
    
    # Nuevos campos para firma digital avanzada
    biometric_data = models.JSONField(
        'Datos biométricos completos',
        default=dict,
        blank=True,
        help_text='Datos completos de verificación biométrica'
    )
    device_fingerprint = models.JSONField(
        'Huella digital del dispositivo',
        default=dict,
        blank=True,
        help_text='Información única del dispositivo utilizado'
    )
    verification_level = models.CharField(
        'Nivel de verificación',
        max_length=20,
        choices=[
            ('basic', 'Básica'),
            ('enhanced', 'Mejorada'),
            ('maximum', 'Máxima')
        ],
        default='basic'
    )
    certificate_chain = models.JSONField(
        'Cadena de certificados',
        default=dict,
        blank=True,
        help_text='Cadena de certificados digitales'
    )
    timestamp_token = models.TextField(
        'Token de marca temporal',
        blank=True,
        help_text='Token de sellado de tiempo RFC 3161'
    )
    blockchain_hash = models.CharField(
        'Hash en blockchain',
        max_length=64,
        blank=True,
        help_text='Hash de la transacción en blockchain para inmutabilidad'
    )
    
    class Meta:
        verbose_name = 'Firma de Contrato'
        verbose_name_plural = 'Firmas de Contratos'
        unique_together = ['contract', 'signer']
        ordering = ['signed_at']
        
    def __str__(self):
        return f"Firma de {self.signer} en {self.contract}"
    
    def save(self, *args, **kwargs):
        # Generar hash de verificación si no existe
        if not self.verification_hash:
            data_to_hash = f"{self.contract.id}{self.signer.id}{self.signed_at}{self.signature_data}"
            self.verification_hash = hashlib.sha256(data_to_hash.encode()).hexdigest()
        
        super().save(*args, **kwargs)
    
    def verify_signature(self):
        """Verifica la autenticidad de la firma."""
        # Verificar hash
        data_to_hash = f"{self.contract.id}{self.signer.id}{self.signed_at}{self.signature_data}"
        expected_hash = hashlib.sha256(data_to_hash.encode()).hexdigest()
        
        if self.verification_hash != expected_hash:
            return False
        
        # Verificar que la firma no sea muy antigua (máximo 24 horas)
        if timezone.now() - self.signed_at > timedelta(hours=24):
            return False
        
        return True


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
