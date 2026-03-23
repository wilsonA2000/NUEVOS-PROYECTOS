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
        ('PENDING_ADMIN_REVIEW', 'Pendiente Revisión Admin'),  # Revisión obligatoria del abogado
        ('DRAFT', 'Borrador del Arrendador'),
        ('LANDLORD_COMPLETING', 'Arrendador Completando Datos'),
        ('TENANT_INVITED', 'Arrendatario Invitado'),
        ('TENANT_REVIEWING', 'En Revisión por Arrendatario'),
        # === NUEVOS ESTADOS PARA FLUJO CIRCULAR ===
        ('TENANT_RETURNED', 'Devuelto por Arrendatario'),  # Arrendatario devuelve para corrección
        ('LANDLORD_CORRECTING', 'Arrendador Corrigiendo'),  # Arrendador modifica tras devolución
        ('RE_PENDING_ADMIN', 'Re-enviado a Revisión Admin'),  # Re-revisión por abogado (ciclo)
        # === FIN NUEVOS ESTADOS ===
        ('MODIFICATION_REQUESTED', 'Modificación Solicitada por Arrendatario'),
        ('UNDER_MODIFICATION', 'Arrendador Modificando Borrador'),
        ('OBJECTIONS_PENDING', 'Objeciones Pendientes de Respuesta'),
        ('NEGOTIATION_IN_PROGRESS', 'Negociación en Progreso'),
        ('APPROVED_BY_TENANT', 'Aprobado por Arrendatario'),
        ('REJECTED_BY_TENANT', 'Rechazado por Arrendatario'),
        ('REJECTED_BY_LANDLORD', 'Solicitud de Modificación Rechazada'),
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
        default='PENDING_ADMIN_REVIEW'  # CAMBIO: Todos los contratos inician en revisión admin
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

    # Control de Revisión Admin (Sistema de Control Molecular)
    admin_reviewed = models.BooleanField(
        'Revisado por Admin',
        default=False,
        help_text='Indica si el contrato ha sido revisado y aprobado por el administrador'
    )
    admin_reviewed_at = models.DateTimeField(
        'Fecha de revisión Admin',
        null=True,
        blank=True,
        help_text='Fecha en que el administrador aprobó el borrador'
    )
    admin_reviewer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_contracts',
        verbose_name='Revisado por (Admin)'
    )
    admin_review_notes = models.TextField(
        'Notas de revisión Admin',
        blank=True,
        help_text='Comentarios del administrador durante la revisión'
    )

    # SLA de revisión jurídica
    admin_review_deadline = models.DateTimeField(
        'Fecha límite de revisión',
        null=True,
        blank=True,
        help_text='Fecha máxima para que el admin revise el contrato (5 días hábiles)'
    )
    admin_review_escalated = models.BooleanField(
        'Revisión escalada',
        default=False,
        help_text='True si el plazo de revisión venció y fue escalado'
    )

    # === SISTEMA DE INMUTABILIDAD Y FLUJO CIRCULAR (Plan Maestro V2.0) ===
    is_locked = models.BooleanField(
        'Bloqueado',
        default=False,
        help_text='⚠️ INMUTABLE: True después de autenticación biométrica completa. No se puede editar.'
    )
    locked_at = models.DateTimeField(
        'Fecha de bloqueo',
        null=True,
        blank=True,
        help_text='Timestamp exacto del momento de bloqueo'
    )
    locked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='locked_contracts',
        verbose_name='Bloqueado por',
        help_text='Usuario cuya autenticación biométrica activó el bloqueo'
    )
    locked_reason = models.CharField(
        'Razón de bloqueo',
        max_length=100,
        blank=True,
        choices=[
            ('biometric_complete', 'Autenticación Biométrica Completada'),
            ('manual_admin_lock', 'Bloqueo Manual por Administrador'),
            ('legal_dispute', 'Disputa Legal en Curso'),
            ('court_order', 'Orden Judicial'),
        ],
        help_text='Motivo por el cual el contrato fue bloqueado'
    )

    # Control de ciclos de revisión (flujo circular)
    review_cycle_count = models.PositiveIntegerField(
        'Ciclos de revisión',
        default=1,
        help_text='Número de veces que el contrato ha pasado por revisión del abogado'
    )
    tenant_return_notes = models.TextField(
        'Notas de devolución del arrendatario',
        blank=True,
        help_text='Comentarios del arrendatario al devolver el contrato para corrección'
    )
    last_return_date = models.DateTimeField(
        'Última fecha de devolución',
        null=True,
        blank=True,
        help_text='Fecha de la última devolución por parte del arrendatario'
    )
    # === FIN SISTEMA DE INMUTABILIDAD ===

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
        """
        Guarda el contrato con validaciones de inmutabilidad.

        🔒 SISTEMA DE INMUTABILIDAD (Plan Maestro V2.0):
        - Contratos con is_locked=True NO pueden ser modificados
        - Solo se permiten cambios de estado específicos (ej: ACTIVE → EXPIRED)
        - Excepción: Campos de auditoría y transiciones de estado permitidas
        """
        # === VALIDACIÓN DE INMUTABILIDAD ===
        if self.pk:  # Solo si ya existe en BD
            try:
                old_instance = LandlordControlledContract.objects.get(pk=self.pk)

                # Si el contrato estaba bloqueado, verificar qué se está modificando
                if old_instance.is_locked:
                    # Campos permitidos de modificar en contratos bloqueados
                    allowed_fields = {
                        'current_state',      # Transiciones de estado (ACTIVE → EXPIRED)
                        'workflow_history',   # Historial de auditoría (siempre se puede agregar)
                        'updated_at',         # Timestamp automático
                    }

                    # Verificar si update_fields está especificado
                    update_fields = kwargs.get('update_fields')
                    if update_fields:
                        # Solo permitir campos autorizados
                        unauthorized = set(update_fields) - allowed_fields
                        if unauthorized:
                            raise ValidationError(
                                f'🔒 CONTRATO INMUTABLE: No se pueden modificar los campos {unauthorized}. '
                                f'Este contrato está bloqueado desde {old_instance.locked_at}. '
                                f'Razón: {old_instance.locked_reason}'
                            )
                    else:
                        # Sin update_fields, verificar si hay cambios sustanciales
                        # Campos críticos que no deben cambiar
                        critical_fields = [
                            'landlord_data', 'tenant_data', 'property_data',
                            'economic_terms', 'contract_terms', 'special_clauses',
                            'start_date', 'end_date', 'final_pdf_file'
                        ]
                        for field in critical_fields:
                            old_value = getattr(old_instance, field)
                            new_value = getattr(self, field)
                            if old_value != new_value:
                                raise ValidationError(
                                    f'🔒 CONTRATO INMUTABLE: No se puede modificar "{field}". '
                                    f'Este contrato está bloqueado y no admite ediciones.'
                                )
            except LandlordControlledContract.DoesNotExist:
                pass  # Es un nuevo registro, permitir

        # === GENERACIÓN DE DATOS AUTOMÁTICOS ===
        # Generar número de contrato único si no existe
        if not self.contract_number:
            self.contract_number = self._generate_contract_number()

        # Actualizar título automáticamente si no se ha definido
        if not self.title and self.property:
            self.title = f"Contrato de {self.get_contract_type_display()} - {self.property.address}"

        # Calcular deadline de revisión admin (5 días hábiles) al entrar en PENDING_ADMIN_REVIEW
        if self.current_state in ('PENDING_ADMIN_REVIEW', 'RE_PENDING_ADMIN') and not self.admin_review_deadline:
            from datetime import timedelta
            deadline = timezone.now()
            days_added = 0
            while days_added < 5:
                deadline += timedelta(days=1)
                if deadline.weekday() < 5:  # Lunes=0 a Viernes=4
                    days_added += 1
            self.admin_review_deadline = deadline

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
            # === FLUJO INICIAL ===
            'PENDING_ADMIN_REVIEW': ['DRAFT', 'CANCELLED'],  # Admin aprueba → DRAFT
            'DRAFT': ['LANDLORD_COMPLETING', 'CANCELLED'],
            'LANDLORD_COMPLETING': ['TENANT_INVITED', 'DRAFT', 'CANCELLED'],
            'TENANT_INVITED': ['TENANT_REVIEWING', 'CANCELLED'],

            # === FLUJO CIRCULAR DE REVISIÓN (Plan Maestro V2.0) ===
            'TENANT_REVIEWING': [
                'OBJECTIONS_PENDING',      # Arrendatario objeta cláusulas específicas
                'TENANT_DATA_PENDING',     # Arrendatario aprueba y continúa
                'TENANT_RETURNED',         # 🔄 NUEVO: Arrendatario devuelve para corrección
                'CANCELLED'
            ],
            'TENANT_RETURNED': ['LANDLORD_CORRECTING', 'CANCELLED'],  # 🔄 NUEVO
            'LANDLORD_CORRECTING': ['RE_PENDING_ADMIN', 'CANCELLED'],  # 🔄 NUEVO: Arrendador re-envía
            'RE_PENDING_ADMIN': ['DRAFT', 'CANCELLED'],  # 🔄 NUEVO: Admin re-aprueba → DRAFT (ciclo)

            # === FLUJO EXISTENTE ===
            'OBJECTIONS_PENDING': ['NEGOTIATION_IN_PROGRESS', 'TENANT_REVIEWING', 'CANCELLED'],
            'NEGOTIATION_IN_PROGRESS': ['TENANT_REVIEWING', 'OBJECTIONS_PENDING', 'CANCELLED'],
            'MODIFICATION_REQUESTED': ['UNDER_MODIFICATION', 'REJECTED_BY_LANDLORD', 'CANCELLED'],
            'UNDER_MODIFICATION': ['TENANT_REVIEWING', 'CANCELLED'],

            # === FLUJO DE FIRMA (POST-APROBACIÓN) ===
            'TENANT_DATA_PENDING': ['TENANT_AUTHENTICATION', 'CANCELLED'],
            'TENANT_AUTHENTICATION': ['TENANT_SIGNED', 'TENANT_DATA_PENDING', 'CANCELLED'],
            'TENANT_SIGNED': ['LANDLORD_AUTHENTICATION', 'CANCELLED'],
            'LANDLORD_AUTHENTICATION': ['LANDLORD_SIGNED', 'TENANT_SIGNED', 'CANCELLED'],
            'LANDLORD_SIGNED': ['READY_TO_PUBLISH', 'CANCELLED'],
            'READY_TO_PUBLISH': ['PUBLISHED', 'LANDLORD_SIGNED', 'CANCELLED'],

            # === ESTADOS FINALES (INMUTABLES) ===
            'PUBLISHED': ['ACTIVE', 'TERMINATED'],  # 🔒 INMUTABLE
            'ACTIVE': ['EXPIRED', 'TERMINATED'],    # 🔒 INMUTABLE
            'EXPIRED': ['TERMINATED'],              # 🔒 INMUTABLE
            'TERMINATED': [],  # Estado final
            'CANCELLED': []    # Estado final
        }

        return new_state in valid_transitions.get(self.current_state, [])
    
    def get_current_responsible_party(self) -> str:
        """Determina quién es responsable de la siguiente acción."""
        # Estados exclusivos del administrador/abogado
        admin_states = [
            'PENDING_ADMIN_REVIEW',
            'RE_PENDING_ADMIN'  # 🔄 NUEVO: Re-revisión tras ciclo
        ]
        # Estados donde el arrendador es responsable
        landlord_states = [
            'DRAFT', 'LANDLORD_COMPLETING', 'OBJECTIONS_PENDING',
            'NEGOTIATION_IN_PROGRESS', 'LANDLORD_AUTHENTICATION', 'READY_TO_PUBLISH',
            'LANDLORD_CORRECTING',  # 🔄 NUEVO: Arrendador corrigiendo
            'UNDER_MODIFICATION'
        ]
        # Estados donde el arrendatario es responsable
        tenant_states = [
            'TENANT_REVIEWING', 'TENANT_DATA_PENDING', 'TENANT_AUTHENTICATION',
            'TENANT_RETURNED'  # 🔄 NUEVO: Arrendatario devolvió (transición)
        ]
        # Estados del sistema (sin intervención humana directa)
        system_states = ['TENANT_INVITED', 'PUBLISHED', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED']

        if self.current_state in admin_states:
            return 'admin'
        elif self.current_state in landlord_states:
            return 'landlord'
        elif self.current_state in tenant_states:
            return 'tenant'
        else:
            return 'system'
    
    def is_editable_by_landlord(self) -> bool:
        """Verifica si el arrendador puede editar el contrato."""
        # ⚠️ INMUTABILIDAD: Si está bloqueado, NADIE puede editar
        if self.is_locked:
            return False

        editable_states = [
            'DRAFT', 'LANDLORD_COMPLETING', 'NEGOTIATION_IN_PROGRESS',
            'LANDLORD_CORRECTING',  # 🔄 NUEVO: Arrendador puede editar durante corrección
            'UNDER_MODIFICATION'
        ]
        return self.current_state in editable_states

    def is_editable(self) -> bool:
        """
        Verifica si el contrato puede ser editado por cualquier usuario.

        🔒 INMUTABILIDAD: Contratos bloqueados son ABSOLUTAMENTE inmutables.
        """
        # REGLA ABSOLUTA: Contratos bloqueados no se pueden editar
        if self.is_locked:
            return False

        # Estados inmutables (ya nació a la vida jurídica)
        immutable_states = ['PUBLISHED', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED']
        return self.current_state not in immutable_states
    
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

    # === MÉTODOS DEL FLUJO CIRCULAR (Plan Maestro V2.0) ===

    def add_workflow_event(self, event_type: str, description: str, performed_by: User,
                           old_state: str = '', new_state: str = '', metadata: Dict = None):
        """
        Registra un evento en el workflow con datos completos de auditoría.

        Args:
            event_type: Tipo de evento (ej: 'admin_approval', 'tenant_return')
            description: Descripción legible del evento
            performed_by: Usuario que realizó la acción
            old_state: Estado anterior del contrato
            new_state: Nuevo estado del contrato
            metadata: Datos adicionales para auditoría
        """
        entry = {
            'timestamp': timezone.now().isoformat(),
            'event_type': event_type,
            'description': description,
            'user_id': str(performed_by.id),
            'user_email': performed_by.email,
            'user_name': performed_by.get_full_name() or performed_by.username,
            'old_state': old_state,
            'new_state': new_state,
            'cycle': self.review_cycle_count,
            'metadata': metadata or {}
        }

        if not isinstance(self.workflow_history, list):
            self.workflow_history = []

        self.workflow_history.append(entry)
        self.save(update_fields=['workflow_history', 'updated_at'])

    def return_to_landlord(self, tenant_user: User, notes: str) -> bool:
        """
        🔄 FLUJO CIRCULAR: Arrendatario devuelve el contrato al arrendador.

        Solo puede ejecutarse cuando el contrato está en TENANT_REVIEWING.
        El arrendador deberá corregir y re-enviar al abogado.

        Args:
            tenant_user: Usuario arrendatario que devuelve
            notes: Notas explicando por qué se devuelve (obligatorio)

        Returns:
            bool: True si la devolución fue exitosa
        """
        if self.current_state != 'TENANT_REVIEWING':
            raise ValidationError(
                f'Solo se puede devolver en estado TENANT_REVIEWING. '
                f'Estado actual: {self.current_state}'
            )

        if not notes or len(notes.strip()) < 10:
            raise ValidationError('Debe proporcionar notas detalladas (mínimo 10 caracteres)')

        if tenant_user != self.tenant:
            raise ValidationError('Solo el arrendatario asignado puede devolver el contrato')

        # Guardar estado anterior
        old_state = self.current_state

        # Actualizar campos
        self.current_state = 'TENANT_RETURNED'
        self.tenant_return_notes = notes
        self.last_return_date = timezone.now()

        self.save(update_fields=[
            'current_state', 'tenant_return_notes', 'last_return_date', 'updated_at'
        ])

        # Registrar en auditoría
        self.add_workflow_event(
            event_type='tenant_return',
            description=f'Contrato devuelto por arrendatario: {tenant_user.email}',
            performed_by=tenant_user,
            old_state=old_state,
            new_state='TENANT_RETURNED',
            metadata={'notes': notes, 'cycle': self.review_cycle_count}
        )

        return True

    def start_landlord_correction(self, landlord_user: User) -> bool:
        """
        🔄 FLUJO CIRCULAR: Arrendador inicia corrección del contrato.

        Solo puede ejecutarse cuando el contrato está en TENANT_RETURNED.

        Args:
            landlord_user: Usuario arrendador que iniciará la corrección

        Returns:
            bool: True si el inicio de corrección fue exitoso
        """
        if self.current_state != 'TENANT_RETURNED':
            raise ValidationError(
                f'Solo se puede iniciar corrección en estado TENANT_RETURNED. '
                f'Estado actual: {self.current_state}'
            )

        if landlord_user != self.landlord:
            raise ValidationError('Solo el arrendador propietario puede corregir el contrato')

        old_state = self.current_state
        self.current_state = 'LANDLORD_CORRECTING'

        self.save(update_fields=['current_state', 'updated_at'])

        self.add_workflow_event(
            event_type='landlord_correction_start',
            description=f'Arrendador {landlord_user.email} inicia corrección',
            performed_by=landlord_user,
            old_state=old_state,
            new_state='LANDLORD_CORRECTING',
            metadata={'tenant_notes': self.tenant_return_notes}
        )

        return True

    def resubmit_for_admin_review(self, landlord_user: User, changes_summary: str = '') -> bool:
        """
        🔄 FLUJO CIRCULAR: Arrendador re-envía el contrato al abogado para re-revisión.

        Solo puede ejecutarse cuando el contrato está en LANDLORD_CORRECTING.
        Incrementa el contador de ciclos de revisión.

        Args:
            landlord_user: Usuario arrendador que re-envía
            changes_summary: Resumen opcional de los cambios realizados

        Returns:
            bool: True si el re-envío fue exitoso
        """
        if self.current_state != 'LANDLORD_CORRECTING':
            raise ValidationError(
                f'Solo se puede re-enviar en estado LANDLORD_CORRECTING. '
                f'Estado actual: {self.current_state}'
            )

        if landlord_user != self.landlord:
            raise ValidationError('Solo el arrendador propietario puede re-enviar para revisión')

        old_state = self.current_state

        # Incrementar ciclo de revisión
        self.review_cycle_count += 1
        self.current_state = 'RE_PENDING_ADMIN'
        # Limpiar notas de devolución para el nuevo ciclo
        self.tenant_return_notes = ''

        self.save(update_fields=[
            'current_state', 'review_cycle_count', 'tenant_return_notes', 'updated_at'
        ])

        self.add_workflow_event(
            event_type='resubmit_for_review',
            description=f'Contrato re-enviado para revisión (Ciclo #{self.review_cycle_count})',
            performed_by=landlord_user,
            old_state=old_state,
            new_state='RE_PENDING_ADMIN',
            metadata={
                'cycle': self.review_cycle_count,
                'changes_summary': changes_summary
            }
        )

        return True

    def lock_contract(self, user: User, reason: str = 'biometric_complete') -> bool:
        """
        🔒 INMUTABILIDAD: Bloquea el contrato permanentemente.

        Una vez bloqueado, el contrato no puede ser editado por ningún usuario.
        Solo se usa después de completar la autenticación biométrica.

        Args:
            user: Usuario cuya acción activa el bloqueo
            reason: Razón del bloqueo

        Returns:
            bool: True si el bloqueo fue exitoso
        """
        if self.is_locked:
            raise ValidationError('El contrato ya está bloqueado')

        # Verificar que esté en un estado que permita bloqueo
        lockable_states = ['LANDLORD_SIGNED', 'READY_TO_PUBLISH', 'PUBLISHED']
        if self.current_state not in lockable_states:
            raise ValidationError(
                f'Solo se puede bloquear en estados {lockable_states}. '
                f'Estado actual: {self.current_state}'
            )

        self.is_locked = True
        self.locked_at = timezone.now()
        self.locked_by = user
        self.locked_reason = reason

        self.save(update_fields=[
            'is_locked', 'locked_at', 'locked_by', 'locked_reason', 'updated_at'
        ])

        self.add_workflow_event(
            event_type='contract_locked',
            description=f'🔒 Contrato bloqueado permanentemente. Razón: {reason}',
            performed_by=user,
            old_state=self.current_state,
            new_state=self.current_state,
            metadata={'reason': reason, 'locked_at': self.locked_at.isoformat()}
        )

        return True

    # === FIN MÉTODOS DEL FLUJO CIRCULAR ===

    def approve_by_admin(self, admin_user, notes: str = '') -> bool:
        """
        Aprueba el contrato por el administrador y lo mueve a estado DRAFT.

        Solo puede ejecutarse cuando el contrato está en PENDING_ADMIN_REVIEW
        o RE_PENDING_ADMIN (para ciclos de re-revisión).
        Registra la auditoría de quién aprobó y cuándo.

        Args:
            admin_user: Usuario administrador que aprueba
            notes: Notas opcionales de la revisión

        Returns:
            bool: True si la aprobación fue exitosa
        """
        # 🔄 FLUJO CIRCULAR: Aceptar tanto revisión inicial como re-revisiones
        valid_states = ['PENDING_ADMIN_REVIEW', 'RE_PENDING_ADMIN']
        if self.current_state not in valid_states:
            raise ValidationError(
                f'Solo se pueden aprobar contratos en estados {valid_states}. '
                f'Estado actual: {self.current_state}'
            )

        if not admin_user.is_staff:
            raise ValidationError('Solo administradores pueden aprobar contratos')

        # Conflicto de intereses: admin no puede aprobar contrato donde es parte
        if admin_user == self.landlord:
            raise ValidationError(
                'Conflicto de intereses: el administrador no puede aprobar un contrato '
                'en el que figura como arrendador.'
            )

        # Registrar aprobación
        self.admin_reviewed = True
        self.admin_reviewed_at = timezone.now()
        self.admin_reviewer = admin_user
        self.admin_review_notes = notes

        # Cambiar a DRAFT
        old_state = self.current_state
        self.current_state = 'DRAFT'

        self.save(update_fields=[
            'admin_reviewed', 'admin_reviewed_at', 'admin_reviewer',
            'admin_review_notes', 'current_state', 'updated_at'
        ])

        # Registrar en historial
        self.add_workflow_event(
            event_type='admin_approval',
            description=f'Contrato aprobado por admin: {admin_user.email}',
            performed_by=admin_user,
            old_state=old_state,
            new_state='DRAFT',
            metadata={'notes': notes}
        )

        return True

    def reject_by_admin(self, admin_user, reason: str) -> bool:
        """
        Rechaza el contrato por el administrador y lo mueve a estado CANCELLED.

        Args:
            admin_user: Usuario administrador que rechaza
            reason: Motivo del rechazo (obligatorio)

        Returns:
            bool: True si el rechazo fue exitoso
        """
        if self.current_state != 'PENDING_ADMIN_REVIEW':
            raise ValidationError(
                f'Solo se pueden rechazar contratos en estado PENDING_ADMIN_REVIEW. '
                f'Estado actual: {self.current_state}'
            )

        if not admin_user.is_staff:
            raise ValidationError('Solo administradores pueden rechazar contratos')

        if admin_user == self.landlord:
            raise ValidationError(
                'Conflicto de intereses: el administrador no puede rechazar un contrato '
                'en el que figura como arrendador.'
            )

        if not reason:
            raise ValidationError('Debe proporcionar un motivo de rechazo')

        # Registrar rechazo
        self.admin_reviewed = True
        self.admin_reviewed_at = timezone.now()
        self.admin_reviewer = admin_user
        self.admin_review_notes = f'RECHAZADO: {reason}'

        # Cambiar a CANCELLED
        old_state = self.current_state
        self.current_state = 'CANCELLED'

        self.save(update_fields=[
            'admin_reviewed', 'admin_reviewed_at', 'admin_reviewer',
            'admin_review_notes', 'current_state', 'updated_at'
        ])

        # Registrar en historial
        self.add_workflow_event(
            event_type='admin_rejection',
            description=f'Contrato rechazado por admin: {admin_user.email}. Motivo: {reason}',
            performed_by=admin_user,
            old_state=old_state,
            new_state='CANCELLED',
            metadata={'reason': reason}
        )

        return True


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


# ========================
# MODELO: CONTRACT MODIFICATION REQUEST
# ========================

class ContractModificationRequest(models.Model):
    """
    Modelo para gestionar solicitudes de modificación de contratos.

    Permite a los arrendatarios solicitar cambios específicos al borrador del contrato,
    con un límite de 2 ciclos de revisión para evitar bucles infinitos.

    FLUJO:
    1. Arrendatario solicita modificación (MODIFICATION_REQUESTED)
    2. Arrendador puede:
       a) Aceptar → Modifica contrato → Vuelve a revisión (UNDER_MODIFICATION)
       b) Rechazar → Contrato rechazado definitivamente (REJECTED_BY_LANDLORD)
    3. Máximo 2 ciclos de revisión permitidos
    """

    MODIFICATION_STATUS = [
        ('PENDING', 'Pendiente de Revisión'),
        ('ACCEPTED', 'Aceptada por Arrendador'),
        ('REJECTED', 'Rechazada por Arrendador'),
        ('IMPLEMENTED', 'Modificación Implementada'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relaciones
    contract = models.ForeignKey(
        LandlordControlledContract,
        on_delete=models.CASCADE,
        related_name='modification_requests',
        verbose_name='Contrato'
    )
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='modification_requests',
        verbose_name='Solicitado por'
    )

    # Datos de la solicitud
    requested_changes = models.JSONField(
        verbose_name='Cambios Solicitados',
        help_text='Estructura: { "field_name": { "current_value": "...", "requested_value": "...", "reason": "..." } }',
        default=dict
    )
    reason = models.TextField(
        verbose_name='Justificación General',
        help_text='Razón general por la cual se solicitan modificaciones'
    )

    # Control de revisiones
    revision_number = models.PositiveIntegerField(
        verbose_name='Número de Revisión',
        default=1,
        help_text='Contador de ciclos de revisión (máximo 2)'
    )

    # Estado y respuesta
    status = models.CharField(
        max_length=20,
        choices=MODIFICATION_STATUS,
        default='PENDING',
        verbose_name='Estado'
    )
    landlord_response = models.TextField(
        blank=True,
        null=True,
        verbose_name='Respuesta del Arrendador',
        help_text='Comentarios del arrendador al aceptar o rechazar'
    )

    # Metadatos
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Solicitud')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Última Actualización')
    responded_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Fecha de Respuesta',
        help_text='Fecha en que el arrendador respondió'
    )

    class Meta:
        db_table = 'contract_modification_requests'
        verbose_name = 'Solicitud de Modificación'
        verbose_name_plural = 'Solicitudes de Modificación'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['contract', 'status']),
            models.Index(fields=['requested_by', '-created_at']),
        ]

    def __str__(self):
        return f"Modificación #{self.revision_number} - Contrato {self.contract.id} - {self.get_status_display()}"

    def can_request_another_modification(self):
        """Verifica si se puede solicitar otra modificación (límite 2 ciclos)."""
        return self.revision_number < 2

    def approve_and_implement(self, landlord_response=None):
        """Arrendador acepta y procede a implementar modificación."""
        self.status = 'ACCEPTED'
        self.landlord_response = landlord_response
        self.responded_at = timezone.now()
        self.save()

        # Cambiar estado del contrato a "UNDER_MODIFICATION" usando current_state
        self.contract.current_state = 'UNDER_MODIFICATION'
        self.contract.save()

    def reject(self, landlord_response):
        """Arrendador rechaza la solicitud de modificación."""
        self.status = 'REJECTED'
        self.landlord_response = landlord_response
        self.responded_at = timezone.now()
        self.save()

        # Cambiar estado del contrato a "REJECTED_BY_LANDLORD" usando current_state
        self.contract.current_state = 'REJECTED_BY_LANDLORD'
        self.contract.save()

    def mark_as_implemented(self):
        """Marca la modificación como implementada cuando el arrendador termina de editar."""
        self.status = 'IMPLEMENTED'
        self.save()

        # Incrementar contador de revisiones
        self.revision_number += 1
        self.save()

        # Cambiar estado del contrato de vuelta a "TENANT_REVIEWING" usando current_state
        self.contract.current_state = 'TENANT_REVIEWING'
        self.contract.save()


# ========================
# MODELO: CODEUDOR AUTH TOKEN
# ========================

class CodeudorAuthToken(models.Model):
    """
    Token de autenticación para codeudores vía email.

    Permite a los codeudores completar su autenticación biométrica
    sin necesidad de registrarse o iniciar sesión en VeriHome.
    El flujo es:
    1. Arrendador invita al codeudor
    2. Codeudor recibe email con link único
    3. Codeudor completa biometría en página aislada
    4. Sistema confirma y avanza el workflow
    """

    STATUS_CHOICES = [
        ('pending', 'Pendiente de Envío'),
        ('sent', 'Invitación Enviada'),
        ('accessed', 'Link Accedido'),
        ('in_progress', 'Biometría en Progreso'),
        ('completed', 'Completado Exitosamente'),
        ('expired', 'Expirado'),
        ('failed', 'Fallido'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Token único para el link
    token = models.CharField(
        'Token Único',
        max_length=128,
        unique=True,
        db_index=True,
        help_text='Token seguro para acceder a la página de autenticación'
    )
    token_hash = models.CharField(
        'Hash del Token',
        max_length=64,
        unique=True,
        db_index=True,
        help_text='SHA-256 hash del token para verificación segura'
    )

    # Relaciones
    contract = models.ForeignKey(
        LandlordControlledContract,
        on_delete=models.CASCADE,
        related_name='codeudor_auth_tokens',
        verbose_name='Contrato'
    )
    guarantee = models.ForeignKey(
        LandlordContractGuarantee,
        on_delete=models.CASCADE,
        related_name='auth_tokens',
        verbose_name='Garantía',
        null=True,
        blank=True,
        help_text='Garantía específica del codeudor (opcional)'
    )

    # Datos del codeudor
    codeudor_name = models.CharField('Nombre del Codeudor', max_length=255)
    codeudor_email = models.EmailField('Email del Codeudor')
    codeudor_phone = models.CharField('Teléfono del Codeudor', max_length=20, blank=True)
    codeudor_document_type = models.CharField(
        'Tipo de Documento',
        max_length=10,
        choices=[
            ('CC', 'Cédula de Ciudadanía'),
            ('CE', 'Cédula de Extranjería'),
            ('PP', 'Pasaporte'),
            ('TI', 'Tarjeta de Identidad'),
            ('NIT', 'NIT'),
        ],
        default='CC'
    )
    codeudor_document_number = models.CharField('Número de Documento', max_length=50)
    codeudor_type = models.CharField(
        'Tipo de Codeudor',
        max_length=30,
        choices=[
            ('codeudor_salario', 'Codeudor con Salario'),
            ('codeudor_finca_raiz', 'Codeudor con Finca Raíz'),
        ],
        default='codeudor_salario'
    )

    # Estado
    status = models.CharField(
        'Estado',
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    # Timestamps
    created_at = models.DateTimeField('Creado', auto_now_add=True)
    sent_at = models.DateTimeField('Enviado', null=True, blank=True)
    accessed_at = models.DateTimeField('Accedido', null=True, blank=True)
    completed_at = models.DateTimeField('Completado', null=True, blank=True)
    expires_at = models.DateTimeField('Expira', null=True, blank=True)

    # Datos de la sesión biométrica
    biometric_session_id = models.CharField(
        'ID de Sesión Biométrica',
        max_length=100,
        blank=True,
        help_text='ID de la sesión de autenticación biométrica'
    )
    biometric_data = models.JSONField(
        'Datos Biométricos',
        default=dict,
        help_text='Datos de la autenticación biométrica completada'
    )

    # Seguridad
    ip_address = models.GenericIPAddressField('IP de Acceso', null=True, blank=True)
    user_agent = models.TextField('User Agent', blank=True)
    access_count = models.PositiveIntegerField('Número de Accesos', default=0)

    # Mensaje personalizado del arrendador
    personal_message = models.TextField(
        'Mensaje Personal',
        blank=True,
        help_text='Mensaje personalizado del arrendador para el codeudor'
    )

    # Creador
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_codeudor_tokens',
        verbose_name='Creado por'
    )

    class Meta:
        verbose_name = 'Token de Autenticación de Codeudor'
        verbose_name_plural = 'Tokens de Autenticación de Codeudores'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['token_hash']),
            models.Index(fields=['contract', 'status']),
            models.Index(fields=['codeudor_email']),
        ]

    def __str__(self):
        return f"Token Codeudor: {self.codeudor_name} - {self.contract.contract_number}"

    def save(self, *args, **kwargs):
        # Generar token si no existe
        if not self.token:
            self.token = secrets.token_urlsafe(48)

        # Generar hash del token
        if not self.token_hash:
            self.token_hash = hashlib.sha256(self.token.encode()).hexdigest()

        # Establecer fecha de expiración (7 días por defecto)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)

        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        """Verifica si el token ha expirado."""
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        """Verifica si el token es válido para uso."""
        return (
            not self.is_expired and
            self.status not in ['completed', 'expired', 'failed']
        )

    def mark_as_sent(self):
        """Marca el token como enviado."""
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at'])

    def mark_as_accessed(self, ip_address=None, user_agent=''):
        """Marca el token como accedido."""
        self.status = 'accessed'
        self.accessed_at = timezone.now()
        self.access_count += 1
        if ip_address:
            self.ip_address = ip_address
        if user_agent:
            self.user_agent = user_agent[:2000]  # Truncar
        self.save(update_fields=['status', 'accessed_at', 'access_count', 'ip_address', 'user_agent'])

    def start_biometric_session(self, session_id):
        """Inicia la sesión biométrica."""
        self.status = 'in_progress'
        self.biometric_session_id = session_id
        self.save(update_fields=['status', 'biometric_session_id'])

    def complete_biometric(self, biometric_data):
        """Marca la autenticación biométrica como completada."""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.biometric_data = biometric_data
        self.save(update_fields=['status', 'completed_at', 'biometric_data'])

    def mark_as_expired(self):
        """Marca el token como expirado."""
        self.status = 'expired'
        self.save(update_fields=['status'])

    def mark_as_failed(self, reason=''):
        """Marca el token como fallido."""
        self.status = 'failed'
        if reason:
            self.biometric_data['failure_reason'] = reason
        self.save(update_fields=['status', 'biometric_data'])

    def get_auth_url(self, base_url='http://localhost:5173'):
        """Genera la URL de autenticación para el codeudor."""
        return f"{base_url}/codeudor-auth/{self.token}"

    @classmethod
    def validate_token(cls, token):
        """Valida un token y retorna el objeto si es válido."""
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        try:
            auth_token = cls.objects.get(token_hash=token_hash)
            if auth_token.is_valid:
                return auth_token
            return None
        except cls.DoesNotExist:
            return None