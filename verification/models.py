"""
Modelos para el sistema de verificación de documentos y CV de VeriHome.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

User = get_user_model()


class CVDocument(models.Model):
    """Documentos de CV subidos por arrendatarios."""
    
    DOCUMENT_TYPES = [
        ('identity', 'Cédula de Ciudadanía'),
        ('employment_letter', 'Carta Laboral'),
        ('pay_stubs', 'Comprobantes de Pago'),
        ('bank_statements', 'Extractos Bancarios'),
        ('rental_references', 'Referencias de Arrendamiento'),
        ('education_certificate', 'Certificado de Educación'),
        ('credit_report', 'Reporte Crediticio'),
        ('tax_returns', 'Declaración de Renta'),
        ('business_license', 'Licencia de Negocio'),
        ('other', 'Otro Documento'),
    ]
    
    VERIFICATION_STATUS = [
        ('pending', 'Pendiente'),
        ('in_review', 'En Revisión'),
        ('verified', 'Verificado'),
        ('rejected', 'Rechazado'),
        ('expired', 'Expirado'),
        ('requires_resubmission', 'Requiere Re-envío'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='cv_documents',
        verbose_name='Arrendatario'
    )
    
    # Información del documento
    document_type = models.CharField('Tipo de documento', max_length=30, choices=DOCUMENT_TYPES)
    file_name = models.CharField('Nombre del archivo', max_length=255)
    file_path = models.FileField('Archivo', upload_to='cv_documents/')
    file_size = models.PositiveIntegerField('Tamaño del archivo (bytes)', default=0)
    
    # Estado de verificación
    verification_status = models.CharField('Estado de verificación', max_length=25, choices=VERIFICATION_STATUS, default='pending')
    verification_notes = models.TextField('Notas de verificación', blank=True)
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_documents',
        verbose_name='Verificado por'
    )
    
    # Fechas importantes
    uploaded_at = models.DateTimeField('Fecha de subida', auto_now_add=True)
    verified_at = models.DateTimeField('Fecha de verificación', null=True, blank=True)
    expiry_date = models.DateField('Fecha de expiración', null=True, blank=True)
    
    # Metadatos de verificación
    verification_score = models.FloatField('Puntuación de verificación', default=0.0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    automatic_verification = models.BooleanField('Verificación automática', default=False)
    requires_manual_review = models.BooleanField('Requiere revisión manual', default=True)
    
    class Meta:
        verbose_name = 'Documento de CV'
        verbose_name_plural = 'Documentos de CV'
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['tenant', 'document_type']),
            models.Index(fields=['verification_status', 'uploaded_at']),
        ]
    
    def __str__(self):
        return f"{self.get_document_type_display()} - {self.tenant.get_full_name()}"
    
    @property
    def file_url(self):
        """URL del archivo."""
        if self.file_path:
            return self.file_path.url
        return None
    
    def mark_as_verified(self, verified_by_user, notes='', score=100.0):
        """Marca el documento como verificado."""
        self.verification_status = 'verified'
        self.verified_by = verified_by_user
        self.verified_at = timezone.now()
        self.verification_notes = notes
        self.verification_score = score
        self.save()
    
    def mark_as_rejected(self, rejected_by_user, reason):
        """Marca el documento como rechazado."""
        self.verification_status = 'rejected'
        self.verified_by = rejected_by_user
        self.verified_at = timezone.now()
        self.verification_notes = reason
        self.verification_score = 0.0
        self.save()
    
    def is_expired(self):
        """Verifica si el documento ha expirado."""
        if self.expiry_date:
            return timezone.now().date() > self.expiry_date
        return False


class TenantVerification(models.Model):
    """Estado de verificación completa de un arrendatario."""
    
    VERIFICATION_STATUS = [
        ('pending', 'Pendiente'),
        ('in_progress', 'En Progreso'),
        ('approved', 'Aprobado'),
        ('conditional', 'Aprobado Condicional'),
        ('rejected', 'Rechazado'),
        ('expired', 'Expirado'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='verification_profile',
        verbose_name='Arrendatario'
    )
    
    # Estado general
    status = models.CharField('Estado de verificación', max_length=20, choices=VERIFICATION_STATUS, default='pending')
    overall_score = models.FloatField('Puntuación general', default=0.0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    
    # Verificación de información personal
    personal_info_verified = models.BooleanField('Información personal verificada', default=False)
    identity_verified = models.BooleanField('Identidad verificada', default=False)
    address_verified = models.BooleanField('Dirección verificada', default=False)
    
    # Verificación laboral
    employment_verified = models.BooleanField('Empleo verificado', default=False)
    income_verified = models.BooleanField('Ingresos verificados', default=False)
    employment_stability_score = models.FloatField('Puntuación de estabilidad laboral', default=0.0)
    
    # Verificación financiera
    credit_score = models.IntegerField('Puntaje crediticio', null=True, blank=True)
    financial_stability_verified = models.BooleanField('Estabilidad financiera verificada', default=False)
    debt_to_income_ratio = models.FloatField('Ratio deuda-ingresos', null=True, blank=True)
    
    # Historial de arrendamiento
    rental_history_verified = models.BooleanField('Historial de arrendamiento verificado', default=False)
    rental_references_count = models.PositiveIntegerField('Número de referencias verificadas', default=0)
    payment_history_score = models.FloatField('Puntuación de historial de pagos', default=0.0)
    
    # Educación
    education_verified = models.BooleanField('Educación verificada', default=False)
    highest_education_level = models.CharField('Nivel educativo más alto', max_length=100, blank=True)
    
    # Verificación automatizada
    auto_verification_passed = models.BooleanField('Verificación automática aprobada', default=False)
    manual_review_required = models.BooleanField('Requiere revisión manual', default=True)
    
    # Resultados y recomendaciones
    verification_report = models.JSONField('Reporte de verificación', default=dict, blank=True)
    recommendations = models.JSONField('Recomendaciones', default=list, blank=True)
    red_flags = models.JSONField('Señales de alerta', default=list, blank=True)
    
    # Información del verificador
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tenant_verifications',
        verbose_name='Verificado por'
    )
    
    # Fechas importantes
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última actualización', auto_now=True)
    verified_at = models.DateTimeField('Fecha de verificación', null=True, blank=True)
    expires_at = models.DateTimeField('Fecha de expiración', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Verificación de Arrendatario'
        verbose_name_plural = 'Verificaciones de Arrendatarios'
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Verificación de {self.tenant.get_full_name()} - {self.get_status_display()}"
    
    def calculate_overall_score(self):
        """Calcula la puntuación general basada en todos los criterios."""
        score = 0
        max_score = 100
        
        # Información personal (20 puntos)
        personal_score = 0
        if self.personal_info_verified:
            personal_score += 7
        if self.identity_verified:
            personal_score += 8
        if self.address_verified:
            personal_score += 5
        score += personal_score
        
        # Verificación laboral (30 puntos)
        employment_score = 0
        if self.employment_verified:
            employment_score += 15
        if self.income_verified:
            employment_score += 10
        employment_score += self.employment_stability_score * 0.05  # Max 5 puntos
        score += employment_score
        
        # Verificación financiera (25 puntos)
        financial_score = 0
        if self.financial_stability_verified:
            financial_score += 10
        if self.credit_score:
            # Normalizar puntaje crediticio (300-850) a escala de 15 puntos
            normalized_credit = ((self.credit_score - 300) / 550) * 15
            financial_score += max(0, min(15, normalized_credit))
        score += financial_score
        
        # Historial de arrendamiento (20 puntos)
        rental_score = 0
        if self.rental_history_verified:
            rental_score += 5
        rental_score += min(10, self.rental_references_count * 2)  # Max 10 puntos
        rental_score += self.payment_history_score * 0.05  # Max 5 puntos
        score += rental_score
        
        # Educación (5 puntos)
        if self.education_verified:
            score += 5
        
        self.overall_score = min(max_score, score)
        return self.overall_score
    
    def update_status_based_on_score(self):
        """Actualiza el estado basado en la puntuación general."""
        score = self.calculate_overall_score()
        
        if score >= 85:
            self.status = 'approved'
        elif score >= 70:
            self.status = 'conditional'
        elif score >= 50:
            self.status = 'pending'  # Requiere más documentos
        else:
            self.status = 'rejected'
        
        self.save()
    
    def generate_verification_report(self):
        """Genera un reporte detallado de verificación."""
        report = {
            'overall_score': self.overall_score,
            'status': self.status,
            'personal_info': {
                'full_name_verified': self.personal_info_verified,
                'id_number_verified': self.identity_verified,
                'date_of_birth_verified': self.personal_info_verified,
                'address_verified': self.address_verified,
            },
            'employment': {
                'current_employer_verified': self.employment_verified,
                'employment_duration': getattr(self, 'employment_duration', 0),
                'monthly_income_verified': self.income_verified,
                'employment_type': getattr(self, 'employment_type', 'unknown'),
            },
            'education': {
                'highest_degree': self.highest_education_level,
                'institution_verified': self.education_verified,
                'graduation_year': getattr(self, 'graduation_year', None),
            },
            'rental_history': {
                'previous_landlord_contacts': getattr(self, 'previous_landlord_contacts', 0),
                'references_verified': self.rental_references_count,
                'payment_history_score': self.payment_history_score,
            },
            'financial_status': {
                'credit_score': self.credit_score,
                'debt_to_income_ratio': self.debt_to_income_ratio,
                'bank_account_verified': self.financial_stability_verified,
            },
            'recommendations': self.recommendations,
            'red_flags': self.red_flags,
        }
        
        self.verification_report = report
        self.save()
        return report


class VerificationRequest(models.Model):
    """Solicitudes de verificación de arrendatarios."""
    
    REQUEST_STATUS = [
        ('pending', 'Pendiente'),
        ('assigned', 'Asignada'),
        ('in_progress', 'En Progreso'),
        ('completed', 'Completada'),
        ('cancelled', 'Cancelada'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Baja'),
        ('normal', 'Normal'),
        ('high', 'Alta'),
        ('urgent', 'Urgente'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='verification_requests',
        verbose_name='Arrendatario'
    )
    requested_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='requested_verifications',
        verbose_name='Solicitado por'
    )
    
    # Información de la solicitud
    status = models.CharField('Estado', max_length=20, choices=REQUEST_STATUS, default='pending')
    priority = models.CharField('Prioridad', max_length=10, choices=PRIORITY_LEVELS, default='normal')
    
    # Relación con match request si aplica
    match_request = models.ForeignKey(
        'matching.MatchRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verification_requests',
        verbose_name='Solicitud de Match'
    )
    
    # Asignación
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_verifications',
        verbose_name='Asignado a'
    )
    
    # Notas y comentarios
    request_notes = models.TextField('Notas de la solicitud', blank=True)
    completion_notes = models.TextField('Notas de finalización', blank=True)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de solicitud', auto_now_add=True)
    assigned_at = models.DateTimeField('Fecha de asignación', null=True, blank=True)
    completed_at = models.DateTimeField('Fecha de finalización', null=True, blank=True)
    due_date = models.DateTimeField('Fecha límite', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Solicitud de Verificación'
        verbose_name_plural = 'Solicitudes de Verificación'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Verificación de {self.tenant.get_full_name()} - {self.get_status_display()}"
    
    def assign_to_user(self, user):
        """Asigna la solicitud a un usuario."""
        self.assigned_to = user
        self.assigned_at = timezone.now()
        self.status = 'assigned'
        self.save()
    
    def mark_as_completed(self, completion_notes=''):
        """Marca la solicitud como completada."""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.completion_notes = completion_notes
        self.save()
    
    def is_overdue(self):
        """Verifica si la solicitud está vencida."""
        if self.due_date and self.status not in ['completed', 'cancelled']:
            return timezone.now() > self.due_date
        return False