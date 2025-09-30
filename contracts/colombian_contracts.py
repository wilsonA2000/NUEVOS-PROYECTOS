"""
Sistema de contratos robusto ajustado a la legislación colombiana.
Integrado con sistema de matching para garantizar seguridad en las transacciones.
"""

from django.db import models
from django.core.exceptions import ValidationError
from decimal import Decimal
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class ColombianContractType(models.TextChoices):
    """Tipos de contratos según legislación colombiana"""
    ARRENDAMIENTO_VIVIENDA_URBANA = 'ARR_VIV_URB', 'Contrato de Arrendamiento de Vivienda Urbana (Ley 820 de 2003)'
    ARRENDAMIENTO_LOCAL_COMERCIAL = 'ARR_COM', 'Contrato de Arrendamiento de Local Comercial'
    PRESTACION_SERVICIOS = 'PREST_SERV', 'Contrato de Prestación de Servicios (Art. 1495 CC)'
    COMPRAVENTA_INMUEBLE = 'COMPRA_VENTA', 'Contrato de Compraventa de Bien Inmueble'
    ADMINISTRACION_INMUEBLE = 'ADMIN_INM', 'Contrato de Administración de Inmueble'
    CORRETAJE_INMOBILIARIO = 'CORRETAJE', 'Contrato de Corretaje Inmobiliario'
    PROMESA_COMPRAVENTA = 'PROMESA', 'Promesa de Compraventa (Art. 89 Ley 153/1887)'

class ContractStatus(models.TextChoices):
    """Estados del contrato con validaciones legales"""
    DRAFT = 'DRAFT', 'Borrador'
    PENDING_VERIFICATION = 'PENDING_VER', 'Pendiente Verificación de Identidad'
    PENDING_SIGNATURES = 'PENDING_SIG', 'Pendiente de Firmas'
    PARTIALLY_SIGNED = 'PARTIAL_SIG', 'Parcialmente Firmado'
    FULLY_SIGNED = 'SIGNED', 'Firmado por Todas las Partes'
    NOTARIZED = 'NOTARIZED', 'Autenticado en Notaría'
    REGISTERED = 'REGISTERED', 'Registrado (Oficina de Registro)'
    ACTIVE = 'ACTIVE', 'Vigente'
    TERMINATED = 'TERMINATED', 'Terminado'
    CANCELLED = 'CANCELLED', 'Cancelado'

class LegalClause(models.Model):
    """Cláusulas legales obligatorias según tipo de contrato"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract_type = models.CharField(max_length=20, choices=ColombianContractType.choices)
    clause_number = models.IntegerField()
    title = models.CharField(max_length=200)
    content = models.TextField()
    is_mandatory = models.BooleanField(default=True)
    legal_reference = models.CharField(
        max_length=200, 
        help_text="Referencia legal (ej: Art. 1973 CC, Ley 820/2003)"
    )
    requires_customization = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['contract_type', 'clause_number']
        unique_together = ['contract_type', 'clause_number']

class ColombianContract(models.Model):
    """Contrato robusto con cumplimiento legal colombiano"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relación con Match (OBLIGATORIO)
    match_request = models.OneToOneField(
        'matching.MatchRequest',
        on_delete=models.PROTECT,
        related_name='contract',
        help_text="Solo se pueden crear contratos desde matches aceptados"
    )
    
    # Tipo y estado
    contract_type = models.CharField(max_length=20, choices=ColombianContractType.choices)
    status = models.CharField(max_length=20, choices=ContractStatus.choices, default=ContractStatus.DRAFT)
    
    # Partes del contrato con verificación
    landlord_verified = models.BooleanField(default=False)
    tenant_verified = models.BooleanField(default=False)
    landlord_id_type = models.CharField(max_length=20, choices=[
        ('CC', 'Cédula de Ciudadanía'),
        ('CE', 'Cédula de Extranjería'),
        ('PA', 'Pasaporte'),
        ('NIT', 'NIT (Persona Jurídica)')
    ])
    landlord_id_number = models.CharField(max_length=20)
    tenant_id_type = models.CharField(max_length=20, choices=[
        ('CC', 'Cédula de Ciudadanía'),
        ('CE', 'Cédula de Extranjería'),
        ('PA', 'Pasaporte')
    ])
    tenant_id_number = models.CharField(max_length=20)
    
    # Detalles específicos según tipo
    # Para arrendamiento
    monthly_rent = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rent_increment_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, 
        null=True, blank=True,
        help_text="% incremento anual según IPC"
    )
    security_deposit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    administration_fee = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Fechas importantes
    start_date = models.DateField()
    end_date = models.DateField()
    payment_due_day = models.IntegerField(
        default=5,
        help_text="Día del mes para pago de canon"
    )
    
    # Garantías (Ley 820 de 2003)
    guarantee_type = models.CharField(max_length=30, choices=[
        ('CODEUDOR', 'Codeudor Solidario'),
        ('FIANZA', 'Fianza o Aval Bancario'),
        ('SEGURO', 'Seguro de Arrendamiento'),
        ('DEPOSITO', 'Depósito en Garantía')
    ], null=True, blank=True)
    
    # Servicios públicos
    utilities_included = models.JSONField(
        default=dict,
        help_text="{'agua': True, 'luz': False, 'gas': False, 'internet': False}"
    )
    
    # Inventario del inmueble
    property_inventory = models.JSONField(
        default=list,
        help_text="Lista detallada de elementos del inmueble"
    )
    
    # Cláusulas adicionales
    custom_clauses = models.JSONField(default=list)
    penalties_clauses = models.JSONField(default=dict)
    
    # Firmas y autenticación
    landlord_signature = models.JSONField(null=True, blank=True)
    tenant_signature = models.JSONField(null=True, blank=True)
    witness_1_signature = models.JSONField(null=True, blank=True)
    witness_2_signature = models.JSONField(null=True, blank=True)
    
    # Notarización
    notary_number = models.CharField(max_length=50, null=True, blank=True)
    notary_city = models.CharField(max_length=100, null=True, blank=True)
    notarization_date = models.DateTimeField(null=True, blank=True)
    notary_protocol_number = models.CharField(max_length=50, null=True, blank=True)
    
    # Registro (para compraventas)
    registration_office = models.CharField(max_length=200, null=True, blank=True)
    registration_number = models.CharField(max_length=100, null=True, blank=True)
    registration_date = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey('users.User', on_delete=models.PROTECT, related_name='contracts_created')
    
    # Documentos adjuntos
    documents = models.JSONField(
        default=dict,
        help_text="URLs de documentos: certificados, paz y salvos, etc."
    )
    
    class Meta:
        db_table = 'colombian_contracts'
        verbose_name = 'Contrato Legal Colombiano'
        verbose_name_plural = 'Contratos Legales Colombianos'
        indexes = [
            models.Index(fields=['status', 'contract_type']),
            models.Index(fields=['landlord_id_number', 'tenant_id_number']),
        ]
    
    def clean(self):
        """Validaciones legales según tipo de contrato"""
        if self.match_request and self.match_request.status != 'accepted':
            raise ValidationError("Solo se pueden crear contratos de matches aceptados")
        
        if self.contract_type == ColombianContractType.ARRENDAMIENTO_VIVIENDA_URBANA:
            # Validaciones Ley 820 de 2003
            if not self.security_deposit:
                raise ValidationError("El depósito de seguridad es obligatorio")
            
            if self.security_deposit > self.monthly_rent * 2:
                raise ValidationError("El depósito no puede exceder 2 meses de arriendo")
            
            # Duración mínima 1 año para vivienda urbana
            duration = (self.end_date - self.start_date).days
            if duration < 365:
                raise ValidationError("Contratos de vivienda urbana mínimo 1 año")
    
    def generate_legal_clauses(self):
        """Genera cláusulas obligatorias según tipo de contrato"""
        mandatory_clauses = LegalClause.objects.filter(
            contract_type=self.contract_type,
            is_mandatory=True
        ).order_by('clause_number')
        
        return mandatory_clauses
    
    def can_be_signed(self):
        """Verifica si el contrato puede ser firmado"""
        return all([
            self.status in [ContractStatus.PENDING_SIGNATURES, ContractStatus.PARTIALLY_SIGNED],
            self.landlord_verified,
            self.tenant_verified,
            self.match_request.status == 'accepted'
        ])

class ContractMilestone(models.Model):
    """Hitos del contrato para pagos y obligaciones"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(ColombianContract, on_delete=models.CASCADE, related_name='milestones')
    
    milestone_type = models.CharField(max_length=30, choices=[
        ('PAGO_MENSUAL', 'Pago Mensual de Arriendo'),
        ('ENTREGA_INMUEBLE', 'Entrega del Inmueble'),
        ('DEVOLUCION_INMUEBLE', 'Devolución del Inmueble'),
        ('PAGO_SERVICIOS', 'Pago de Servicios'),
        ('MANTENIMIENTO', 'Mantenimiento Programado'),
        ('INSPECCION', 'Inspección Periódica')
    ])
    
    description = models.TextField()
    due_date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=[
        ('PENDING', 'Pendiente'),
        ('IN_PROGRESS', 'En Proceso'),
        ('COMPLETED', 'Completado'),
        ('OVERDUE', 'Vencido'),
        ('CANCELLED', 'Cancelado')
    ], default='PENDING')
    
    completed_date = models.DateTimeField(null=True, blank=True)
    evidence = models.JSONField(default=list, help_text="Evidencias de cumplimiento")
    
    class Meta:
        ordering = ['due_date']

class ContractGuarantee(models.Model):
    """Sistema de garantías según Ley 820/2003"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(ColombianContract, on_delete=models.CASCADE, related_name='guarantees')
    
    guarantee_type = models.CharField(max_length=30, choices=[
        ('CODEUDOR', 'Codeudor Solidario'),
        ('FIANZA_BANCARIA', 'Fianza Bancaria'),
        ('SEGURO_ARRENDAMIENTO', 'Seguro de Arrendamiento'),
        ('DEPOSITO_GARANTIA', 'Depósito en Garantía'),
        ('PAGARE', 'Pagaré en Blanco con Carta de Instrucciones')
    ])
    
    # Para codeudor
    guarantor_name = models.CharField(max_length=200, null=True, blank=True)
    guarantor_id_type = models.CharField(max_length=20, null=True, blank=True)
    guarantor_id_number = models.CharField(max_length=20, null=True, blank=True)
    guarantor_verified = models.BooleanField(default=False)
    guarantor_income_verified = models.BooleanField(default=False)
    
    # Para seguros/fianzas
    policy_number = models.CharField(max_length=100, null=True, blank=True)
    insurance_company = models.CharField(max_length=200, null=True, blank=True)
    coverage_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Documentos
    documents = models.JSONField(default=list)
    
    status = models.CharField(max_length=20, choices=[
        ('PENDING', 'Pendiente'),
        ('APPROVED', 'Aprobado'),
        ('REJECTED', 'Rechazado'),
        ('ACTIVE', 'Activo'),
        ('EXPIRED', 'Vencido')
    ], default='PENDING')
    
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)