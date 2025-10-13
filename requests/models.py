"""
Modelos para el sistema integral de solicitudes de VeriHome.
Maneja todos los tipos de solicitudes entre usuarios.
"""

import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from properties.models import Property
from contracts.models import Contract

User = get_user_model()


class BaseRequest(models.Model):
    """Modelo base para todas las solicitudes."""
    
    REQUEST_TYPES = [
        ('property_interest', 'Interés en Propiedad'),
        ('service_request', 'Solicitud de Servicio'),
        ('contract_signature', 'Firma de Contrato'),
        ('maintenance_request', 'Solicitud de Mantenimiento'),
        ('tenant_verification', 'Verificación de Arrendatario'),
        ('landlord_inquiry', 'Consulta a Arrendador'),
        ('property_viewing', 'Visita a Propiedad'),
        ('rent_negotiation', 'Negociación de Renta'),
        ('lease_renewal', 'Renovación de Contrato'),
        ('damage_report', 'Reporte de Daños'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('in_progress', 'En Progreso'),
        ('completed', 'Completado'),
        ('rejected', 'Rechazado'),
        ('cancelled', 'Cancelado'),
        ('on_hold', 'En Espera'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Baja'),
        ('normal', 'Normal'),
        ('high', 'Alta'),
        ('urgent', 'Urgente'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_type = models.CharField(max_length=50, choices=REQUEST_TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    # Usuarios involucrados
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_requests')
    assignee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_requests')
    
    # Estado y prioridad
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    
    # Fechas
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Respuesta del asignado
    response_message = models.TextField(blank=True)
    response_date = models.DateTimeField(null=True, blank=True)
    
    # Metadatos adicionales
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['requester', 'status']),
            models.Index(fields=['assignee', 'status']),
            models.Index(fields=['request_type', 'status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_request_type_display()} - {self.title}"
    
    def is_overdue(self):
        if self.due_date and self.status not in ['completed', 'rejected', 'cancelled']:
            return timezone.now() > self.due_date
        return False
    
    def get_status_color(self):
        colors = {
            'pending': 'warning',
            'in_progress': 'info',
            'completed': 'success',
            'rejected': 'error',
            'cancelled': 'default',
            'on_hold': 'secondary',
        }
        return colors.get(self.status, 'default')


class PropertyInterestRequest(BaseRequest):
    """Solicitud específica para interés en propiedades."""
    
    # Workflow stages for 3-stage process
    WORKFLOW_STAGES = [
        (1, 'Etapa 1: Visita'),
        (2, 'Etapa 2: Documentos'), 
        (3, 'Etapa 3: Contrato'),
    ]
    
    WORKFLOW_STATUSES = [
        ('visit_scheduled', 'Visita Programada'),
        ('visit_completed', 'Visita Completada'),
        ('documents_pending', 'Documentos Pendientes'),
        ('documents_review', 'Documentos en Revisión'),
        ('documents_approved', 'Documentos Aprobados'),
        ('contract_ready', 'Contrato Listo'),
        ('contract_signed', 'Contrato Firmado'),
        ('completed', 'Proceso Completado'),
    ]
    
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='interest_requests')
    monthly_income = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    employment_type = models.CharField(max_length=50, blank=True)
    preferred_move_in_date = models.DateField(null=True, blank=True)
    lease_duration_months = models.IntegerField(default=12)
    number_of_occupants = models.IntegerField(default=1)
    has_pets = models.BooleanField(default=False)
    pet_details = models.TextField(blank=True)
    smoking_allowed = models.BooleanField(default=False)
    
    # Referencias
    has_rental_references = models.BooleanField(default=False)
    has_employment_proof = models.BooleanField(default=False)
    has_credit_check = models.BooleanField(default=False)
    
    # Campos de workflow para sincronización
    workflow_stage = models.IntegerField(choices=WORKFLOW_STAGES, default=1)
    workflow_status = models.CharField(max_length=30, choices=WORKFLOW_STATUSES, default='visit_scheduled')
    workflow_data = models.JSONField(default=dict, blank=True, help_text="Datos específicos del workflow como fechas de visita, documentos, etc.")
    workflow_updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        pass


class ServiceRequest(BaseRequest):
    """Solicitud de servicios profesionales."""
    
    SERVICE_CATEGORIES = [
        ('cleaning', 'Limpieza'),
        ('maintenance', 'Mantenimiento'),
        ('plumbing', 'Plomería'),
        ('electrical', 'Electricidad'),
        ('painting', 'Pintura'),
        ('gardening', 'Jardinería'),
        ('security', 'Seguridad'),
        ('moving', 'Mudanza'),
        ('repair', 'Reparación'),
        ('installation', 'Instalación'),
    ]
    
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='service_requests')
    service_category = models.CharField(max_length=50, choices=SERVICE_CATEGORIES)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    actual_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Horarios preferidos
    preferred_date = models.DateField(null=True, blank=True)
    preferred_time = models.TimeField(null=True, blank=True)
    flexible_schedule = models.BooleanField(default=True)
    
    # Ubicación específica
    location_details = models.TextField(blank=True)
    urgency_level = models.CharField(max_length=10, choices=BaseRequest.PRIORITY_CHOICES, default='normal')


class ContractSignatureRequest(BaseRequest):
    """Solicitud de firma de contratos."""
    
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='signature_requests')
    contract_type = models.CharField(max_length=50)
    
    # Términos específicos
    rental_amount = models.DecimalField(max_digits=10, decimal_places=2)
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2)
    lease_start_date = models.DateField()
    lease_end_date = models.DateField()
    
    # Estado de firmas
    landlord_signed = models.BooleanField(default=False)
    tenant_signed = models.BooleanField(default=False)
    landlord_signature_date = models.DateTimeField(null=True, blank=True)
    tenant_signature_date = models.DateTimeField(null=True, blank=True)
    
    # Documentos requeridos
    documents_uploaded = models.BooleanField(default=False)
    verification_completed = models.BooleanField(default=False)


class MaintenanceRequest(BaseRequest):
    """Solicitudes de mantenimiento específicas."""
    
    MAINTENANCE_TYPES = [
        ('emergency', 'Emergencia'),
        ('routine', 'Rutina'),
        ('preventive', 'Preventivo'),
        ('repair', 'Reparación'),
        ('improvement', 'Mejora'),
    ]
    
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='maintenance_requests')
    maintenance_type = models.CharField(max_length=20, choices=MAINTENANCE_TYPES)
    affected_area = models.CharField(max_length=100)
    
    # Detalles técnicos
    issue_description = models.TextField()
    photos_uploaded = models.BooleanField(default=False)
    access_instructions = models.TextField(blank=True)
    
    # Programación
    requires_tenant_presence = models.BooleanField(default=False)
    estimated_duration_hours = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)


class RequestAttachment(models.Model):
    """Archivos adjuntos para solicitudes."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(BaseRequest, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='request_attachments/')
    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    file_size = models.IntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    def __str__(self):
        return f"{self.filename} - {self.request.title}"


class RequestComment(models.Model):
    """Comentarios y actualizaciones en solicitudes."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(BaseRequest, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    is_internal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comentario por {self.author.get_full_name()} - {self.request.title}"


class RequestNotification(models.Model):
    """Notificaciones relacionadas con solicitudes."""
    
    NOTIFICATION_TYPES = [
        ('request_created', 'Solicitud Creada'),
        ('request_updated', 'Solicitud Actualizada'),
        ('request_completed', 'Solicitud Completada'),
        ('request_rejected', 'Solicitud Rechazada'),
        ('comment_added', 'Comentario Agregado'),
        ('due_date_reminder', 'Recordatorio de Fecha Límite'),
        ('overdue_alert', 'Alerta de Vencimiento'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(BaseRequest, on_delete=models.CASCADE, related_name='notifications')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='request_notifications')
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()


class TenantDocument(models.Model):
    """Documentos subidos por inquilinos durante el proceso de arrendamiento."""
    
    # Tipos de documentos específicos según especificaciones
    DOCUMENT_TYPES = [
        # TOMADOR (Inquilino principal)
        ('tomador_cedula_ciudadania', 'Cédula de Ciudadanía'),
        ('tomador_pasaporte', 'Pasaporte'),
        ('tomador_cedula_extranjeria', 'Cédula de Extranjería'),
        ('tomador_certificado_laboral', 'Certificado Laboral'),
        ('tomador_carta_recomendacion', 'Carta de Recomendación'),
        
        # CODEUDOR
        ('codeudor_cedula_ciudadania', 'Codeudor: Cédula de Ciudadanía'),
        ('codeudor_pasaporte', 'Codeudor: Pasaporte'),
        ('codeudor_cedula_extranjeria', 'Codeudor: Cédula de Extranjería'),
        ('codeudor_certificado_laboral', 'Codeudor: Certificado Laboral'),
        ('codeudor_libertad_tradicion', 'Codeudor: Certificado de Libertad y Tradición'),
        
        # OTROS
        ('otros', 'Otros Documentos (Personalizable)'),
        
        # LEGACY - Mantener para compatibilidad con datos existentes
        ('tomador_cedula_frente', 'Cédula de Ciudadanía - Frente (Legacy)'),
        ('tomador_cedula_atras', 'Cédula de Ciudadanía - Atrás (Legacy)'),
        ('codeudor_cedula_frente', 'Codeudor: Cédula de Ciudadanía - Frente (Legacy)'),
        ('codeudor_cedula_atras', 'Codeudor: Cédula de Ciudadanía - Atrás (Legacy)'),
        ('tomador_cedula_extranjeria_frente', 'Cédula de Extranjería - Frente (Legacy)'),
        ('tomador_cedula_extranjeria_atras', 'Cédula de Extranjería - Atrás (Legacy)'),
        ('codeudor_cedula_extranjeria_frente', 'Codeudor: Cédula de Extranjería - Frente (Legacy)'),
        ('codeudor_cedula_extranjeria_atras', 'Codeudor: Cédula de Extranjería - Atrás (Legacy)'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pendiente de Revisión'),
        ('approved', 'Aprobado'),
        ('rejected', 'Rechazado'),
        ('requires_correction', 'Requiere Corrección'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # ✅ VINCULACIÓN CON MATCH REQUEST (WORKFLOW UNIFICADO)
    match_request = models.ForeignKey(
        'matching.MatchRequest',
        on_delete=models.CASCADE,
        related_name='tenant_documents',
        verbose_name='Solicitud de Match',
        help_text='Match request al que pertenece este documento'
    )

    # Legacy - mantener por compatibilidad temporal
    property_request = models.ForeignKey(
        PropertyInterestRequest,
        on_delete=models.CASCADE,
        related_name='legacy_tenant_documents',
        null=True,
        blank=True
    )
    
    # Usuario que sube el documento
    uploaded_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='uploaded_documents'
    )
    
    # Información del documento
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    document_file = models.FileField(
        upload_to='tenant_documents/%Y/%m/',
        max_length=255,
        help_text='Solo archivos PDF permitidos'
    )
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(help_text='Tamaño en bytes')
    
    # Para documentos tipo "otros"
    other_description = models.CharField(
        max_length=200, 
        blank=True, 
        help_text='Descripción para documentos tipo "otros"'
    )
    
    # Estado y revisión
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='reviewed_documents'
    )
    review_notes = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # Fechas
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['match_request', 'document_type']),
            models.Index(fields=['uploaded_by', 'status']),
            models.Index(fields=['status', 'uploaded_at']),
        ]
        # Evitar duplicados del mismo tipo de documento para la misma solicitud
        unique_together = ['match_request', 'document_type', 'uploaded_by']
    
    def __str__(self):
        property_title = self.match_request.property.title if self.match_request else "Sin propiedad"
        return f"{self.get_document_type_display()} - {property_title}"
    
    def is_identity_document(self):
        """Verifica si es un documento de identidad."""
        identity_docs = [
            # Nuevos tipos unificados
            'tomador_cedula_ciudadania', 'tomador_pasaporte', 'tomador_cedula_extranjeria',
            'codeudor_cedula_ciudadania', 'codeudor_pasaporte', 'codeudor_cedula_extranjeria',
            # Legacy - mantener compatibilidad
            'tomador_cedula_frente', 'tomador_cedula_atras',
            'tomador_cedula_extranjeria_frente', 'tomador_cedula_extranjeria_atras', 
            'codeudor_cedula_frente', 'codeudor_cedula_atras',
            'codeudor_cedula_extranjeria_frente', 'codeudor_cedula_extranjeria_atras'
        ]
        return self.document_type in identity_docs
    
    def is_codeudor_document(self):
        """Verifica si es un documento del codeudor."""
        return self.document_type.startswith('codeudor_')
    
    def get_category(self):
        """Obtiene la categoría del documento."""
        if self.is_codeudor_document():
            return 'CODEUDOR'
        elif self.document_type == 'otros':
            return 'OTROS'
        else:
            return 'TOMADOR'
    
    def get_file_url(self):
        """Obtiene la URL del archivo."""
        if self.document_file:
            return self.document_file.url
        return None
    
    def get_status_color(self):
        """Obtiene el color para mostrar el estado."""
        colors = {
            'pending': 'warning',
            'approved': 'success', 
            'rejected': 'error',
            'requires_correction': 'info'
        }
        return colors.get(self.status, 'default')