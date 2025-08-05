"""
Modelos para el Sistema de Contratos Controlado por Arrendador
VeriHome - Workflow paso a paso para creación de contratos

Este módulo implementa un sistema donde el arrendador tiene control total
del proceso de creación de contratos, con workflow paso a paso.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal
import uuid
import hashlib
import secrets
from datetime import timedelta
from typing import Dict, List, Any

User = get_user_model()


class LandlordControlledContract(models.Model):
    """
    Contrato controlado completamente por el arrendador.
    Implementa workflow paso a paso con responsabilidades claras.
    """
    
    WORKFLOW_STATES = [
        ('DRAFT', 'Borrador del Arrendador'),
        ('LANDLORD_COMPLETING', 'Arrendador Completando Datos'),
        ('TENANT_INVITED', 'Arrendatario Invitado'),
        ('TENANT_REVIEWING', 'En Revisión por Arrendatario'),
        ('OBJECTIONS_PENDING', 'Objeciones Pendientes de Respuesta'),
        ('NEGOTIATION_IN_PROGRESS', 'Negociación en Progreso'),
        ('TENANT_DATA_PENDING', 'Esperando Datos del Arrendatario'),
        ('TENANT_AUTHENTICATION', 'Arrendatario en Proceso de Autenticación'),
        ('TENANT_SIGNED', 'Firmado por Arrendatario'),
        ('LANDLORD_AUTHENTICATION', 'Arrendador en Proceso de Autenticación'),
        ('LANDLORD_SIGNED', 'Firmado por Arrendador'),
        ('READY_TO_PUBLISH', 'Listo para Publicar'),
        ('PUBLISHED', 'Publicado - Vida Jurídica'),
        ('ACTIVE', 'Contrato Activo'),
        ('EXPIRED', 'Vencido'),
        ('TERMINATED', 'Terminado'),
        ('CANCELLED', 'Cancelado')
    ]
    
    CONTRACT_TYPES = [
        ('rental_urban', 'Arrendamiento de Vivienda Urbana'),
        ('rental_commercial', 'Arrendamiento de Local Comercial'),
        ('rental_room', 'Arrendamiento de Habitación'),
        ('rental_rural', 'Arrendamiento de Inmueble Rural'),
        ('service_provider', 'Contrato de Prestación de Servicios'),
    ]
    
    # Identificación única
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract_number = models.CharField(
        'Número de contrato',
        max_length=20,
        unique=True,
        help_text='Formato: VH-YYYY-NNNNNN'
    )
    
    # Partes del contrato
    landlord = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_landlord_contracts',
        verbose_name='Arrendador (Controlador del Contrato)'
    )
    tenant = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tenant_landlord_contracts',
        verbose_name='Arrendatario'
    )
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        related_name='landlord_contracts',
        verbose_name='Propiedad'
    )
    
    # Información básica del contrato
    contract_type = models.CharField(
        'Tipo de contrato',
        max_length=20,
        choices=CONTRACT_TYPES,
        default='rental_urban'
    )
    title = models.CharField(
        'Título del contrato',
        max_length=300,
        help_text='Título descriptivo del contrato'
    )
    description = models.TextField(
        'Descripción del contrato',
        max_length=1000,
        blank=True,
        help_text='Descripción general del acuerdo'
    )
    
    # Estado del workflow
    current_state = models.CharField(
        'Estado actual',
        max_length=30,
        choices=WORKFLOW_STATES,
        default='DRAFT'
    )
    
    # Datos del contrato organizados por responsabilidad
    landlord_data = models.JSONField(
        'Datos del Arrendador',
        default=dict,
        help_text='Información proporcionada por el arrendador'
    )
    property_data = models.JSONField(
        'Datos de la Propiedad',
        default=dict,
        help_text='Información específica de la propiedad para el contrato'
    )
    economic_terms = models.JSONField(
        'Términos Económicos',
        default=dict,
        help_text='Canon, depósitos, incrementos, etc.'
    )
    contract_terms = models.JSONField(
        'Términos del Contrato',
        default=dict,
        help_text='Duración, servicios, obligaciones específicas'
    )
    special_clauses = models.JSONField(
        'Cláusulas Especiales',
        default=list,
        help_text='Cláusulas adicionales específicas de este contrato'
    )
    
    # Datos proporcionados por el arrendatario (mínimos necesarios)
    tenant_data = models.JSONField(
        'Datos del Arrendatario',
        default=dict,
        help_text='Información mínima proporcionada por el arrendatario'
    )
    
    # Sistema de objeciones
    has_pending_objections = models.BooleanField(
        'Tiene objeciones pendientes',
        default=False
    )
    objections_count = models.PositiveIntegerField(
        'Número de objeciones',
        default=0
    )
    last_objection_date = models.DateTimeField(
        'Fecha de última objeción',
        null=True,
        blank=True
    )
    
    # Control de aprobaciones
    landlord_approved = models.BooleanField('Aprobado por arrendador', default=False)
    tenant_approved = models.BooleanField('Aprobado por arrendatario', default=False)
    landlord_approved_at = models.DateTimeField('Fecha de aprobación del arrendador', null=True, blank=True)
    tenant_approved_at = models.DateTimeField('Fecha de aprobación del arrendatario', null=True, blank=True)
    
    # Sistema de invitación
    invitation_token = models.CharField(
        'Token de invitación',
        max_length=255,
        unique=True,
        null=True,
        blank=True,
        help_text='Token único para que el arrendatario acceda al contrato'
    )
    invitation_sent_at = models.DateTimeField('Invitación enviada', null=True, blank=True)
    invitation_expires_at = models.DateTimeField('Invitación expira', null=True, blank=True)
    tenant_identifier = models.CharField(
        'Identificador del arrendatario',
        max_length=50,
        help_text='Cédula o email para identificar al arrendatario'
    )
    invitation_accepted_at = models.DateTimeField('Invitación aceptada', null=True, blank=True)
    
    # Control de firmas digitales
    tenant_signed = models.BooleanField('Firmado por arrendatario', default=False)
    tenant_signed_at = models.DateTimeField('Fecha de firma del arrendatario', null=True, blank=True)
    tenant_signature_data = models.JSONField(
        'Datos de firma del arrendatario',
        default=dict,
        help_text='Datos de autenticación biométrica del arrendatario'
    )
    
    landlord_signed = models.BooleanField('Firmado por arrendador', default=False)
    landlord_signed_at = models.DateTimeField('Fecha de firma del arrendador', null=True, blank=True)
    landlord_signature_data = models.JSONField(
        'Datos de firma del arrendador',
        default=dict,
        help_text='Datos de autenticación biométrica del arrendador'
    )
    
    # Publicación y vida jurídica
    published = models.BooleanField('Publicado', default=False)
    published_at = models.DateTimeField('Fecha de publicación', null=True, blank=True)
    published_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='published_landlord_contracts',
        verbose_name='Publicado por'
    )
    
    # Fechas del contrato
    start_date = models.DateField(
        'Fecha de inicio del contrato',
        null=True,
        blank=True,
        help_text='Fecha en que inicia la vigencia del contrato'
    )
    end_date = models.DateField(
        'Fecha de fin del contrato',
        null=True,
        blank=True,
        help_text='Fecha en que termina la vigencia del contrato'
    )
    
    # Archivos generados
    final_pdf_file = models.FileField(
        'PDF final del contrato',
        upload_to='landlord_contracts/pdfs/',
        null=True,
        blank=True
    )
    pdf_generated_at = models.DateTimeField('PDF generado el', null=True, blank=True)
    
    # Metadatos y seguimiento
    created_at = models.DateTimeField('Creado el', auto_now_add=True)
    updated_at = models.DateTimeField('Actualizado el', auto_now=True)
    
    # Datos para auditoría y logs
    workflow_history = models.JSONField(
        'Historial del workflow',
        default=list,
        help_text='Registro de cambios de estado y acciones'
    )
    
    class Meta:
        verbose_name = 'Contrato Controlado por Arrendador'
        verbose_name_plural = 'Contratos Controlados por Arrendador'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['landlord', 'current_state']),
            models.Index(fields=['tenant', 'current_state']),
            models.Index(fields=['invitation_token']),
            models.Index(fields=['contract_number']),
            models.Index(fields=['published', 'start_date']),
        ]
    
    def __str__(self):
        return f"{self.contract_number} - {self.title}"
    
    def save(self, *args, **kwargs):
        # Generar número de contrato único si no existe
        if not self.contract_number:
            self.contract_number = self._generate_contract_number()
        
        # Actualizar título automáticamente si no se ha definido
        if not self.title and self.property:
            self.title = f"Contrato de {self.get_contract_type_display()} - {self.property.address}"
        
        super().save(*args, **kwargs)
    
    def _generate_contract_number(self) -> str:
        """Genera un número único de contrato."""
        year = timezone.now().year
        # Contar contratos del año actual
        yearly_count = LandlordControlledContract.objects.filter(
            created_at__year=year
        ).count() + 1
        
        return f"VH-{year}-{yearly_count:06d}"
    
    def add_workflow_entry(self, action: str, user: User, details: Dict[str, Any] = None):
        """Agrega una entrada al historial de workflow."""
        entry = {
            'timestamp': timezone.now().isoformat(),
            'action': action,
            'user_id': str(user.id),
            'user_name': user.get_full_name() or user.username,
            'old_state': self.current_state,
            'details': details or {}
        }
        
        if not isinstance(self.workflow_history, list):
            self.workflow_history = []
        
        self.workflow_history.append(entry)
        self.save(update_fields=['workflow_history'])
    
    def can_transition_to(self, new_state: str) -> bool:
        """Verifica si es válida la transición a un nuevo estado."""
        valid_transitions = {
            'DRAFT': ['LANDLORD_COMPLETING', 'CANCELLED'],
            'LANDLORD_COMPLETING': ['TENANT_INVITED', 'DRAFT', 'CANCELLED'],
            'TENANT_INVITED': ['TENANT_REVIEWING', 'CANCELLED'],
            'TENANT_REVIEWING': ['OBJECTIONS_PENDING', 'TENANT_DATA_PENDING', 'CANCELLED'],
            'OBJECTIONS_PENDING': ['NEGOTIATION_IN_PROGRESS', 'TENANT_REVIEWING', 'CANCELLED'],
            'NEGOTIATION_IN_PROGRESS': ['TENANT_REVIEWING', 'OBJECTIONS_PENDING', 'CANCELLED'],
            'TENANT_DATA_PENDING': ['TENANT_AUTHENTICATION', 'CANCELLED'],
            'TENANT_AUTHENTICATION': ['TENANT_SIGNED', 'TENANT_DATA_PENDING', 'CANCELLED'],
            'TENANT_SIGNED': ['LANDLORD_AUTHENTICATION', 'CANCELLED'],
            'LANDLORD_AUTHENTICATION': ['LANDLORD_SIGNED', 'TENANT_SIGNED', 'CANCELLED'],
            'LANDLORD_SIGNED': ['READY_TO_PUBLISH', 'CANCELLED'],
            'READY_TO_PUBLISH': ['PUBLISHED', 'LANDLORD_SIGNED', 'CANCELLED'],
            'PUBLISHED': ['ACTIVE', 'TERMINATED'],
            'ACTIVE': ['EXPIRED', 'TERMINATED'],
            'EXPIRED': ['TERMINATED'],
            'TERMINATED': [],  # Estado final
            'CANCELLED': []    # Estado final
        }
        
        return new_state in valid_transitions.get(self.current_state, [])
    
    def get_current_responsible_party(self) -> str:
        """Determina quién es responsable de la siguiente acción."""
        landlord_states = [
            'DRAFT', 'LANDLORD_COMPLETING', 'OBJECTIONS_PENDING', 
            'NEGOTIATION_IN_PROGRESS', 'LANDLORD_AUTHENTICATION', 'READY_TO_PUBLISH'
        ]
        tenant_states = [
            'TENANT_REVIEWING', 'TENANT_DATA_PENDING', 'TENANT_AUTHENTICATION'
        ]
        system_states = ['TENANT_INVITED', 'PUBLISHED', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED']
        
        if self.current_state in landlord_states:
            return 'landlord'
        elif self.current_state in tenant_states:
            return 'tenant'
        else:
            return 'system'
    
    def is_editable_by_landlord(self) -> bool:
        """Verifica si el arrendador puede editar el contrato."""
        editable_states = ['DRAFT', 'LANDLORD_COMPLETING', 'NEGOTIATION_IN_PROGRESS']
        return self.current_state in editable_states
    
    def is_viewable_by_tenant(self) -> bool:
        """Verifica si el arrendatario puede ver el contrato."""
        viewable_states = [
            'TENANT_REVIEWING', 'OBJECTIONS_PENDING', 'NEGOTIATION_IN_PROGRESS',
            'TENANT_DATA_PENDING', 'TENANT_AUTHENTICATION', 'TENANT_SIGNED',
            'LANDLORD_SIGNED', 'PUBLISHED', 'ACTIVE'
        ]
        return self.current_state in viewable_states
    
    def generate_invitation_token(self) -> str:
        """Genera un token único para la invitación."""
        self.invitation_token = secrets.token_urlsafe(32)
        self.invitation_sent_at = timezone.now()
        self.invitation_expires_at = timezone.now() + timedelta(days=30)
        self.save(update_fields=['invitation_token', 'invitation_sent_at', 'invitation_expires_at'])
        return self.invitation_token
    
    def is_invitation_valid(self) -> bool:
        """Verifica si la invitación es válida."""
        if not self.invitation_token or not self.invitation_expires_at:
            return False
        return timezone.now() < self.invitation_expires_at
    
    def get_completion_percentage(self) -> int:
        """Calcula el porcentaje de completitud del contrato."""
        total_steps = 10
        completed_steps = 0
        
        # Verificar cada paso del proceso
        if self.landlord_data:
            completed_steps += 1
        if self.economic_terms:
            completed_steps += 1
        if self.contract_terms:
            completed_steps += 1
        if self.tenant and self.invitation_accepted_at:
            completed_steps += 1
        if self.tenant_data:
            completed_steps += 1
        if not self.has_pending_objections:
            completed_steps += 1
        if self.tenant_approved:
            completed_steps += 1
        if self.tenant_signed:
            completed_steps += 1
        if self.landlord_signed:
            completed_steps += 1
        if self.published:
            completed_steps += 1
        
        return int((completed_steps / total_steps) * 100)
    
    def get_missing_data_summary(self) -> Dict[str, List[str]]:
        """Obtiene un resumen de los datos faltantes."""
        missing = {
            'landlord': [],
            'tenant': [],
            'contract': []
        }
        
        # Verificar datos del arrendador
        required_landlord_fields = ['name', 'document', 'address', 'phone', 'email']
        for field in required_landlord_fields:
            if not self.landlord_data.get(field):
                missing['landlord'].append(field)
        
        # Verificar datos del arrendatario
        if self.tenant_data:
            required_tenant_fields = ['name', 'document', 'address', 'phone', 'email']
            for field in required_tenant_fields:
                if not self.tenant_data.get(field):
                    missing['tenant'].append(field)
        
        # Verificar datos del contrato
        if not self.economic_terms.get('monthly_rent'):
            missing['contract'].append('monthly_rent')
        if not self.start_date:
            missing['contract'].append('start_date')
        if not self.end_date:
            missing['contract'].append('end_date')
        
        return missing


class ContractObjection(models.Model):
    """
    Objeciones presentadas por el arrendatario al contrato propuesto.
    Permite un proceso de negociación estructurado.
    """
    
    OBJECTION_STATUS = [
        ('PENDING', 'Pendiente de Respuesta'),
        ('UNDER_REVIEW', 'En Revisión por Arrendador'),
        ('ACCEPTED', 'Aceptada - Modificación Aplicada'),
        ('REJECTED', 'Rechazada por Arrendador'),
        ('PARTIALLY_ACCEPTED', 'Parcialmente Aceptada'),
        ('RESOLVED', 'Resuelta'),
        ('WITHDRAWN', 'Retirada por Arrendatario')
    ]
    
    OBJECTION_TYPES = [
        ('ECONOMIC', 'Términos Económicos'),
        ('DURATION', 'Duración del Contrato'),
        ('SERVICES', 'Servicios Incluidos'),
        ('OBLIGATIONS', 'Obligaciones y Responsabilidades'),
        ('CLAUSES', 'Cláusulas Específicas'),
        ('GUARANTEES', 'Garantías Requeridas'),
        ('OTHER', 'Otros Aspectos')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    contract = models.ForeignKey(
        LandlordControlledContract,
        on_delete=models.CASCADE,
        related_name='objections'
    )
    
    # Información de la objeción
    objection_type = models.CharField(
        'Tipo de objeción',
        max_length=20,
        choices=OBJECTION_TYPES,
        default='OTHER'
    )
    field_reference = models.CharField(
        'Campo específico',
        max_length=100,
        blank=True,
        help_text='Campo específico del contrato al que se refiere'
    )
    current_value = models.TextField(
        'Valor actual',
        help_text='Valor actual del campo objetado'
    )
    objection_text = models.TextField(
        'Descripción de la objeción',
        help_text='Explicación detallada de la objeción'
    )
    proposed_modification = models.TextField(
        'Modificación propuesta',
        blank=True,
        help_text='Propuesta específica de cambio'
    )
    
    # Estado y seguimiento
    status = models.CharField(
        'Estado',
        max_length=20,
        choices=OBJECTION_STATUS,
        default='PENDING'
    )
    priority = models.CharField(
        'Prioridad',
        max_length=10,
        choices=[
            ('LOW', 'Baja'),
            ('MEDIUM', 'Media'),
            ('HIGH', 'Alta'),
            ('CRITICAL', 'Crítica')
        ],
        default='MEDIUM'
    )
    
    # Respuesta del arrendador
    landlord_response = models.TextField(
        'Respuesta del arrendador',
        blank=True,
        help_text='Respuesta o justificación del arrendador'
    )
    landlord_counter_proposal = models.TextField(
        'Contrapropuesta del arrendador',
        blank=True,
        help_text='Contrapropuesta alternativa del arrendador'
    )
    final_resolution = models.TextField(
        'Resolución final',
        blank=True,
        help_text='Descripción de cómo se resolvió la objeción'
    )
    
    # Fechas de seguimiento
    submitted_at = models.DateTimeField('Presentada el', auto_now_add=True)
    reviewed_at = models.DateTimeField('Revisada el', null=True, blank=True)
    resolved_at = models.DateTimeField('Resuelta el', null=True, blank=True)
    
    # Datos adicionales
    supporting_documents = models.JSONField(
        'Documentos de soporte',
        default=list,
        help_text='URLs o referencias a documentos que apoyan la objeción'
    )
    
    class Meta:
        verbose_name = 'Objeción de Contrato'
        verbose_name_plural = 'Objeciones de Contratos'
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['contract', 'status']),
            models.Index(fields=['status', 'priority']),
        ]
    
    def __str__(self):
        return f"Objeción #{self.id.hex[:8]} - {self.get_objection_type_display()}"
    
    def mark_as_reviewed(self):
        """Marca la objeción como revisada."""
        if self.status == 'PENDING':
            self.status = 'UNDER_REVIEW'
            self.reviewed_at = timezone.now()
            self.save(update_fields=['status', 'reviewed_at'])
    
    def resolve(self, resolution: str, status: str = 'RESOLVED'):
        """Resuelve la objeción."""
        self.final_resolution = resolution
        self.status = status
        self.resolved_at = timezone.now()
        self.save(update_fields=['final_resolution', 'status', 'resolved_at'])
    
    def get_age_in_days(self) -> int:
        """Obtiene la antigüedad de la objeción en días."""
        return (timezone.now() - self.submitted_at).days
    
    def is_overdue(self) -> bool:
        """Verifica si la objeción está vencida (más de 5 días sin respuesta)."""
        return self.status == 'PENDING' and self.get_age_in_days() > 5


class LandlordContractGuarantee(models.Model):
    """
    Garantías que respaldan el contrato de arrendamiento.
    Puede incluir depósitos, codeudores, pólizas, etc.
    """
    
    GUARANTEE_TYPES = [
        ('DEPOSIT', 'Depósito en Dinero'),
        ('CO_SIGNER', 'Codeudor Solidario'),
        ('JOINT_DEBTOR', 'Deudor Solidario'),
        ('BANK_GUARANTEE', 'Garantía Bancaria'),
        ('INSURANCE_POLICY', 'Póliza de Seguro de Arrendamiento'),
        ('REAL_ESTATE_GUARANTEE', 'Garantía Inmobiliaria'),
        ('PROMISSORY_NOTE', 'Pagaré'),
        ('OTHER', 'Otra Garantía')
    ]
    
    GUARANTEE_STATUS = [
        ('PROPOSED', 'Propuesta'),
        ('ACCEPTED', 'Aceptada'),
        ('ACTIVE', 'Activa'),
        ('EXPIRED', 'Vencida'),
        ('EXECUTED', 'Ejecutada'),
        ('CANCELLED', 'Cancelada')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    contract = models.ForeignKey(
        LandlordControlledContract,
        on_delete=models.CASCADE,
        related_name='guarantees'
    )
    
    # Información básica de la garantía
    guarantee_type = models.CharField(
        'Tipo de garantía',
        max_length=25,
        choices=GUARANTEE_TYPES
    )
    title = models.CharField(
        'Título de la garantía',
        max_length=200,
        help_text='Descripción breve de la garantía'
    )
    description = models.TextField(
        'Descripción detallada',
        help_text='Descripción completa de la garantía'
    )
    
    # Información financiera
    amount = models.DecimalField(
        'Monto de la garantía',
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Valor en pesos colombianos'
    )
    currency = models.CharField(
        'Moneda',
        max_length=3,
        default='COP',
        help_text='Código ISO de la moneda'
    )
    
    # Para codeudores y deudores solidarios
    co_signer_data = models.JSONField(
        'Datos del codeudor',
        default=dict,
        help_text='Información completa del codeudor si aplica'
    )
    
    # Para garantías documentales
    supporting_documents = models.JSONField(
        'Documentos de soporte',
        default=list,
        help_text='Lista de documentos que respaldan la garantía'
    )
    
    # Para pólizas y garantías bancarias
    policy_number = models.CharField(
        'Número de póliza/garantía',
        max_length=100,
        blank=True,
        help_text='Número de identificación de la póliza o garantía'
    )
    issuer = models.CharField(
        'Entidad emisora',
        max_length=200,
        blank=True,
        help_text='Banco, aseguradora o entidad que emite la garantía'
    )
    
    # Fechas importantes
    effective_date = models.DateField(
        'Fecha de vigencia',
        null=True,
        blank=True,
        help_text='Fecha desde la cual es efectiva la garantía'
    )
    expiry_date = models.DateField(
        'Fecha de vencimiento',
        null=True,
        blank=True,
        help_text='Fecha hasta la cual es válida la garantía'
    )
    
    # Estado y control
    status = models.CharField(
        'Estado',
        max_length=15,
        choices=GUARANTEE_STATUS,
        default='PROPOSED'
    )
    is_active = models.BooleanField('Activa', default=True)
    verification_required = models.BooleanField(
        'Requiere verificación',
        default=True,
        help_text='Indica si la garantía requiere verificación adicional'
    )
    verified = models.BooleanField('Verificada', default=False)
    verified_at = models.DateTimeField('Verificada el', null=True, blank=True)
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_guarantees'
    )
    
    # Metadatos
    created_at = models.DateTimeField('Creada el', auto_now_add=True)
    updated_at = models.DateTimeField('Actualizada el', auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_guarantees',
        verbose_name='Creada por'
    )
    
    # Notas adicionales
    notes = models.TextField(
        'Notas adicionales',
        blank=True,
        help_text='Información adicional sobre la garantía'
    )
    
    class Meta:
        verbose_name = 'Garantía de Contrato'
        verbose_name_plural = 'Garantías de Contratos'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['contract', 'guarantee_type']),
            models.Index(fields=['status', 'is_active']),
            models.Index(fields=['expiry_date']),
        ]
    
    def __str__(self):
        return f"{self.get_guarantee_type_display()} - {self.contract.contract_number}"
    
    def is_expired(self) -> bool:
        """Verifica si la garantía ha vencido."""
        if not self.expiry_date:
            return False
        return timezone.now().date() > self.expiry_date
    
    def days_until_expiry(self) -> int:
        """Calcula los días hasta el vencimiento."""
        if not self.expiry_date or self.is_expired():
            return 0
        return (self.expiry_date - timezone.now().date()).days
    
    def get_amount_display(self) -> str:
        """Obtiene el monto formateado para mostrar."""
        if not self.amount:
            return "No especificado"
        
        if self.currency == 'COP':
            return f"${self.amount:,.0f} COP"
        else:
            return f"{self.amount} {self.currency}"
    
    def verify(self, verified_by: User, notes: str = ""):
        """Marca la garantía como verificada."""
        self.verified = True
        self.verified_at = timezone.now()
        self.verified_by = verified_by
        if notes:
            self.notes = f"{self.notes}\n\nVerificación: {notes}" if self.notes else f"Verificación: {notes}"
        self.save(update_fields=['verified', 'verified_at', 'verified_by', 'notes'])
    
    def activate(self):
        """Activa la garantía."""
        self.status = 'ACTIVE'
        self.is_active = True
        if not self.effective_date:
            self.effective_date = timezone.now().date()
        self.save(update_fields=['status', 'is_active', 'effective_date'])


class ContractInvitation(models.Model):
    """Invitaciones de contratos con tokens seguros"""
    
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('sent', 'Enviado'),
        ('delivered', 'Entregado'),
        ('opened', 'Abierto'),
        ('accepted', 'Aceptado'),
        ('expired', 'Expirado'),
        ('failed', 'Fallido'),
    ]
    
    METHOD_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('whatsapp', 'WhatsApp'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(LandlordControlledContract, on_delete=models.CASCADE, related_name='invitations')
    
    # Token seguro (almacenado como hash)
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    
    # Información del arrendatario
    tenant_email = models.EmailField()
    tenant_phone = models.CharField(max_length=20, blank=True)
    tenant_name = models.CharField(max_length=200, default='Arrendatario')
    
    # Método y contenido de invitación
    invitation_method = models.CharField(max_length=10, choices=METHOD_CHOICES, default='email')
    personal_message = models.TextField(blank=True)
    
    # Estado y seguimiento
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    
    # Gestión de reenvíos
    attempts = models.PositiveIntegerField(default=0)
    last_resent_at = models.DateTimeField(null=True, blank=True)
    
    # Referencias
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_invitations')
    accepted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='accepted_invitations')
    
    # Error tracking
    error_message = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token_hash']),
            models.Index(fields=['status', 'expires_at']),
            models.Index(fields=['contract', 'status']),
        ]
    
    def __str__(self):
        return f"Invitación {self.tenant_email} - {self.contract.contract_number}"
    
    @property
    def is_expired(self):
        """Verificar si la invitación ha expirado"""
        return timezone.now() > self.expires_at
    
    @property
    def is_active(self):
        """Verificar si la invitación está activa"""
        return self.status in ['sent', 'opened'] and not self.is_expired


class ContractWorkflowHistory(models.Model):
    """
    Historial detallado de todos los cambios y acciones en el workflow del contrato.
    Proporciona trazabilidad completa para auditoría y resolución de disputas.
    """
    
    ACTION_TYPES = [
        ('CREATE', 'Crear Contrato'),
        ('UPDATE', 'Actualizar Contrato'),
        ('STATE_CHANGE', 'Cambio de Estado'),
        ('INVITATION_SENT', 'Invitación Enviada'),
        ('INVITATION_RESENT', 'Invitación Reenviada'),
        ('INVITATION_ACCEPTED', 'Invitación Aceptada'),
        ('INVITE_TENANT', 'Invitar Arrendatario'),
        ('ACCEPT_INVITATION', 'Aceptar Invitación'),
        ('SUBMIT_OBJECTION', 'Presentar Objeción'),
        ('RESPOND_OBJECTION', 'Responder Objeción'),
        ('APPROVE', 'Aprobar Contrato'),
        ('SIGN', 'Firmar Contrato'),
        ('PUBLISH', 'Publicar Contrato'),
        ('CANCEL', 'Cancelar Contrato'),
        ('TERMINATE', 'Terminar Contrato'),
        ('ADD_GUARANTEE', 'Agregar Garantía'),
        ('MODIFY_GUARANTEE', 'Modificar Garantía'),
        ('VERIFY_GUARANTEE', 'Verificar Garantía'),
        ('SYSTEM_ACTION', 'Acción del Sistema')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    contract = models.ForeignKey(
        LandlordControlledContract,
        on_delete=models.CASCADE,
        related_name='history_entries'
    )
    
    # Información de la acción
    action_type = models.CharField(
        'Tipo de acción',
        max_length=20,
        choices=ACTION_TYPES
    )
    action_description = models.CharField(
        'Descripción de la acción',
        max_length=500,
        help_text='Descripción breve de lo que ocurrió'
    )
    
    # Usuario que realizó la acción
    performed_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='contract_actions',
        verbose_name='Realizado por'
    )
    user_role = models.CharField(
        'Rol del usuario',
        max_length=20,
        choices=[
            ('landlord', 'Arrendador'),
            ('tenant', 'Arrendatario'),
            ('system', 'Sistema'),
            ('admin', 'Administrador')
        ]
    )
    
    # Estados del contrato
    old_state = models.CharField(
        'Estado anterior',
        max_length=30,
        blank=True
    )
    new_state = models.CharField(
        'Nuevo estado',
        max_length=30,
        blank=True
    )
    
    # Detalles específicos de la acción
    changes_made = models.JSONField(
        'Cambios realizados',
        default=dict,
        help_text='Detalles específicos de los cambios realizados'
    )
    metadata = models.JSONField(
        'Metadatos adicionales',
        default=dict,
        help_text='Información adicional relevante para la acción'
    )
    
    # Información técnica
    ip_address = models.GenericIPAddressField(
        'Dirección IP',
        null=True,
        blank=True
    )
    user_agent = models.TextField(
        'User Agent',
        blank=True,
        help_text='Información del navegador/dispositivo'
    )
    session_id = models.CharField(
        'ID de sesión',
        max_length=255,
        blank=True
    )
    
    # Timestamps
    timestamp = models.DateTimeField('Fecha y hora', auto_now_add=True)
    
    # Para objetos relacionados
    related_objection = models.ForeignKey(
        ContractObjection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='history_entries'
    )
    related_guarantee = models.ForeignKey(
        LandlordContractGuarantee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='history_entries'
    )
    
    # Hash de integridad para verificación
    integrity_hash = models.CharField(
        'Hash de integridad',
        max_length=64,
        blank=True,
        help_text='Hash SHA-256 para verificar integridad del registro'
    )
    
    class Meta:
        verbose_name = 'Historial de Workflow'
        verbose_name_plural = 'Historiales de Workflow'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['contract', 'timestamp']),
            models.Index(fields=['performed_by', 'action_type']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.action_description} - {self.performed_by.get_full_name()} ({self.timestamp.strftime('%Y-%m-%d %H:%M')})"
    
    def save(self, *args, **kwargs):
        # Generar hash de integridad
        if not self.integrity_hash:
            self.integrity_hash = self._generate_integrity_hash()
        
        super().save(*args, **kwargs)
    
    def _generate_integrity_hash(self) -> str:
        """Genera un hash de integridad para verificación."""
        data_string = f"{self.contract.id}:{self.action_type}:{self.performed_by.id}:{self.timestamp}:{self.action_description}"
        return hashlib.sha256(data_string.encode()).hexdigest()
    
    def verify_integrity(self) -> bool:
        """Verifica la integridad del registro."""
        expected_hash = self._generate_integrity_hash()
        return self.integrity_hash == expected_hash
    
    @classmethod
    def log_action(cls, contract: LandlordControlledContract, action_type: str, 
                   performed_by: User, description: str, **kwargs):
        """Método de conveniencia para registrar acciones."""
        
        # Determinar el rol del usuario
        if performed_by == contract.landlord:
            user_role = 'landlord'
        elif performed_by == contract.tenant:
            user_role = 'tenant'
        else:
            user_role = 'system'
        
        return cls.objects.create(
            contract=contract,
            action_type=action_type,
            action_description=description,
            performed_by=performed_by,
            user_role=user_role,
            old_state=kwargs.get('old_state', ''),
            new_state=kwargs.get('new_state', ''),
            changes_made=kwargs.get('changes_made', {}),
            metadata=kwargs.get('metadata', {}),
            ip_address=kwargs.get('ip_address'),
            user_agent=kwargs.get('user_agent', '')[:2000],  # Truncar para evitar errores
            session_id=kwargs.get('session_id', ''),
            related_objection=kwargs.get('related_objection'),
            related_guarantee=kwargs.get('related_guarantee')
        )


# Señales para mantener sincronización
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

@receiver(pre_save, sender=LandlordControlledContract)
def update_objections_count(sender, instance, **kwargs):
    """Actualiza el conteo de objeciones pendientes."""
    if instance.pk:
        pending_count = instance.objections.filter(status='PENDING').count()
        instance.objections_count = pending_count
        instance.has_pending_objections = pending_count > 0

@receiver(post_save, sender=ContractObjection)
def update_contract_objection_status(sender, instance, **kwargs):
    """Actualiza el estado de objeciones en el contrato."""
    contract = instance.contract
    pending_count = contract.objections.filter(status='PENDING').count()
    contract.objections_count = pending_count
    contract.has_pending_objections = pending_count > 0
    
    if pending_count > 0:
        contract.last_objection_date = timezone.now()
    
    contract.save(update_fields=['objections_count', 'has_pending_objections', 'last_objection_date'])