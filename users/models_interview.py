"""
Modelos para el sistema de códigos de entrevista de VeriHome.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid
import random
import string

User = get_user_model()


class InterviewCode(models.Model):
    """Códigos de entrevista para registro controlado de usuarios."""
    
    STATUS_CHOICES = [
        ('active', 'Activo'),
        ('used', 'Usado'),
        ('expired', 'Expirado'),
        ('revoked', 'Revocado'),
    ]
    
    USER_TYPE_CHOICES = [
        ('landlord', 'Arrendador'),
        ('tenant', 'Arrendatario'),
        ('service_provider', 'Prestador de Servicios'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Código único de entrevista
    interview_code = models.CharField(
        'Código de Entrevista',
        max_length=12,
        unique=True,
        editable=False,
        help_text='Código único generado automáticamente'
    )
    
    # Información del candidato
    candidate_name = models.CharField('Nombre del Candidato', max_length=200)
    candidate_email = models.EmailField('Email del Candidato')
    candidate_phone = models.CharField('Teléfono del Candidato', max_length=15, blank=True)
    
    # Información de la entrevista
    interview_date = models.DateTimeField('Fecha de Entrevista', null=True, blank=True)
    interview_rating = models.IntegerField(
        'Calificación de Entrevista',
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        null=True,
        blank=True,
        help_text='Calificación de 1 a 10 estrellas'
    )
    interview_notes = models.TextField('Notas de Entrevista', blank=True)
    
    # Aprobación
    is_approved = models.BooleanField('Aprobado', default=False)
    approved_user_type = models.CharField(
        'Tipo de Usuario Aprobado',
        max_length=20,
        choices=USER_TYPE_CHOICES,
        blank=True,
        help_text='Tipo de usuario para el que fue aprobado'
    )
    
    # Estado del código
    status = models.CharField('Estado', max_length=10, choices=STATUS_CHOICES, default='active')
    
    # Información del administrador
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_interview_codes',
        verbose_name='Creado por'
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_interview_codes',
        verbose_name='Aprobado por'
    )
    
    # Usuario registrado (cuando se usa el código)
    registered_user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='interview_code',
        verbose_name='Usuario Registrado'
    )
    
    # Fechas importantes
    created_at = models.DateTimeField('Fecha de Creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última Actualización', auto_now=True)
    expires_at = models.DateTimeField(
        'Fecha de Expiración',
        help_text='Fecha límite para usar el código'
    )
    used_at = models.DateTimeField('Fecha de Uso', null=True, blank=True)
    
    # Configuración adicional
    max_attempts = models.PositiveIntegerField('Máximo Intentos', default=3)
    current_attempts = models.PositiveIntegerField('Intentos Actuales', default=0)
    
    class Meta:
        verbose_name = 'Código de Entrevista'
        verbose_name_plural = 'Códigos de Entrevista'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['interview_code']),
            models.Index(fields=['status', 'expires_at']),
            models.Index(fields=['candidate_email']),
        ]
    
    def __str__(self):
        return f"{self.interview_code} - {self.candidate_name} ({self.get_status_display()})"
    
    def save(self, *args, **kwargs):
        if not self.interview_code:
            self.interview_code = self.generate_interview_code()
        
        # Si no tiene fecha de expiración, establecer en 30 días
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=30)
        
        super().save(*args, **kwargs)
    
    def generate_interview_code(self):
        """Genera un código único de entrevista."""
        while True:
            # Formato: VH-XXXX-YYYY (VH = VeriHome, XXXX = letras, YYYY = números)
            letters = ''.join(random.choices(string.ascii_uppercase, k=4))
            numbers = ''.join(random.choices(string.digits, k=4))
            code = f"VH-{letters}-{numbers}"
            
            if not InterviewCode.objects.filter(interview_code=code).exists():
                return code
    
    def is_valid(self):
        """Verifica si el código es válido para uso."""
        if self.status != 'active':
            return False, f"Código {self.get_status_display().lower()}"
        
        if not self.is_approved:
            return False, "Código no aprobado"
        
        if self.expires_at and timezone.now() > self.expires_at:
            self.status = 'expired'
            self.save()
            return False, "Código expirado"
        
        if self.current_attempts >= self.max_attempts:
            self.status = 'revoked'
            self.save()
            return False, "Máximo de intentos excedido"
        
        return True, "Código válido"
    
    def use_code(self, user):
        """Marca el código como usado."""
        if self.status == 'active' and self.is_approved:
            self.status = 'used'
            self.used_at = timezone.now()
            self.registered_user = user
            self.save()
            return True
        return False
    
    def increment_attempt(self):
        """Incrementa el contador de intentos."""
        self.current_attempts += 1
        if self.current_attempts >= self.max_attempts:
            self.status = 'revoked'
        self.save()
    
    def approve(self, approved_by_user, user_type, rating=None, notes=''):
        """Aprueba el código de entrevista."""
        self.is_approved = True
        self.approved_by = approved_by_user
        self.approved_user_type = user_type
        if rating:
            self.interview_rating = rating
        if notes:
            self.interview_notes = notes
        self.save()
    
    def revoke(self):
        """Revoca el código de entrevista."""
        self.status = 'revoked'
        self.save()
    
    def get_rating_display(self):
        """Retorna la calificación con estrellas."""
        if self.interview_rating:
            return '⭐' * self.interview_rating + ' ' + f"({self.interview_rating}/10)"
        return "Sin calificar"


class ContactRequest(models.Model):
    """Solicitudes de contacto desde la página web."""
    
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('contacted', 'Contactado'),
        ('interviewed', 'Entrevistado'),
        ('approved', 'Aprobado'),
        ('rejected', 'Rechazado'),
        ('closed', 'Cerrado'),
    ]
    
    USER_TYPE_CHOICES = [
        ('landlord', 'Arrendador'),
        ('tenant', 'Arrendatario'),
        ('service_provider', 'Prestador de Servicios'),
        ('other', 'Otro'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Información del contacto
    full_name = models.CharField('Nombre Completo', max_length=200)
    email = models.EmailField('Email')
    phone = models.CharField('Teléfono', max_length=15)
    
    # Intención de registro
    interested_as = models.CharField(
        'Interesado como',
        max_length=20,
        choices=USER_TYPE_CHOICES,
        default='other'
    )
    
    # Mensaje y detalles
    message = models.TextField('Mensaje', max_length=1000)
    company_name = models.CharField('Nombre de Empresa', max_length=200, blank=True)
    experience_years = models.PositiveIntegerField('Años de Experiencia', null=True, blank=True)
    
    # Estado de la solicitud
    status = models.CharField('Estado', max_length=15, choices=STATUS_CHOICES, default='pending')
    
    # Información de seguimiento
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_contacts',
        verbose_name='Asignado a'
    )
    
    # Código de entrevista relacionado
    interview_code = models.OneToOneField(
        InterviewCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contact_request',
        verbose_name='Código de Entrevista'
    )
    
    # Notas internas
    internal_notes = models.TextField('Notas Internas', blank=True)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de Solicitud', auto_now_add=True)
    contacted_at = models.DateTimeField('Fecha de Contacto', null=True, blank=True)
    interviewed_at = models.DateTimeField('Fecha de Entrevista', null=True, blank=True)
    
    # Metadatos
    ip_address = models.GenericIPAddressField('Dirección IP', null=True, blank=True)
    user_agent = models.TextField('User Agent', blank=True)
    referrer = models.URLField('Referrer', blank=True)
    
    class Meta:
        verbose_name = 'Solicitud de Contacto'
        verbose_name_plural = 'Solicitudes de Contacto'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['email']),
            models.Index(fields=['assigned_to', 'status']),
        ]
    
    def __str__(self):
        return f"{self.full_name} - {self.get_interested_as_display()} ({self.get_status_display()})"
    
    def assign_to_user(self, user):
        """Asigna la solicitud a un usuario."""
        self.assigned_to = user
        self.save()
    
    def mark_as_contacted(self):
        """Marca como contactado."""
        self.status = 'contacted'
        self.contacted_at = timezone.now()
        self.save()
    
    def create_interview_code(self, created_by_user):
        """Crea un código de entrevista para esta solicitud."""
        if not self.interview_code:
            interview_code = InterviewCode.objects.create(
                candidate_name=self.full_name,
                candidate_email=self.email,
                candidate_phone=self.phone,
                created_by=created_by_user,
                expires_at=timezone.now() + timezone.timedelta(days=30)
            )
            self.interview_code = interview_code
            self.status = 'interviewed'
            self.interviewed_at = timezone.now()
            self.save()
            return interview_code
        return self.interview_code
    
    def approve_and_generate_code(self, approved_by_user, user_type, rating, notes=''):
        """Aprueba la solicitud y genera código de entrevista."""
        if not self.interview_code:
            self.create_interview_code(approved_by_user)
        
        self.interview_code.approve(approved_by_user, user_type, rating, notes)
        self.status = 'approved'
        self.save()
        
        return self.interview_code


class InterviewSession(models.Model):
    """Sesiones de entrevista realizadas."""
    
    SESSION_STATUS = [
        ('scheduled', 'Programada'),
        ('in_progress', 'En Progreso'),
        ('completed', 'Completada'),
        ('cancelled', 'Cancelada'),
        ('rescheduled', 'Reprogramada'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relaciones
    contact_request = models.ForeignKey(
        ContactRequest,
        on_delete=models.CASCADE,
        related_name='interview_sessions',
        verbose_name='Solicitud de Contacto'
    )
    interviewer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='conducted_interviews',
        verbose_name='Entrevistador'
    )
    
    # Información de la sesión
    scheduled_date = models.DateTimeField('Fecha Programada')
    actual_start_time = models.DateTimeField('Hora de Inicio Real', null=True, blank=True)
    actual_end_time = models.DateTimeField('Hora de Finalización Real', null=True, blank=True)
    
    # Estado y resultado
    status = models.CharField('Estado', max_length=15, choices=SESSION_STATUS, default='scheduled')
    final_rating = models.IntegerField(
        'Calificación Final',
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        null=True,
        blank=True
    )
    
    # Evaluación detallada
    communication_skills = models.IntegerField('Habilidades de Comunicación', validators=[MinValueValidator(1), MaxValueValidator(10)], null=True, blank=True)
    professionalism = models.IntegerField('Profesionalismo', validators=[MinValueValidator(1), MaxValueValidator(10)], null=True, blank=True)
    experience_relevance = models.IntegerField('Relevancia de Experiencia', validators=[MinValueValidator(1), MaxValueValidator(10)], null=True, blank=True)
    reliability_assessment = models.IntegerField('Evaluación de Confiabilidad', validators=[MinValueValidator(1), MaxValueValidator(10)], null=True, blank=True)
    
    # Notas y observaciones
    interview_notes = models.TextField('Notas de Entrevista', blank=True)
    strengths = models.TextField('Fortalezas', blank=True)
    concerns = models.TextField('Preocupaciones', blank=True)
    recommendations = models.TextField('Recomendaciones', blank=True)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de Creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última Actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Sesión de Entrevista'
        verbose_name_plural = 'Sesiones de Entrevista'
        ordering = ['-scheduled_date']
    
    def __str__(self):
        return f"Entrevista - {self.contact_request.full_name} - {self.scheduled_date.strftime('%Y-%m-%d %H:%M')}"
    
    def calculate_final_rating(self):
        """Calcula la calificación final basada en criterios individuales."""
        ratings = [
            self.communication_skills,
            self.professionalism,
            self.experience_relevance,
            self.reliability_assessment
        ]
        
        valid_ratings = [r for r in ratings if r is not None]
        if valid_ratings:
            average = sum(valid_ratings) / len(valid_ratings)
            self.final_rating = round(average)
            self.save()
            return self.final_rating
        return None
    
    def complete_interview(self, final_rating=None, notes=''):
        """Completa la sesión de entrevista."""
        self.status = 'completed'
        self.actual_end_time = timezone.now()
        if final_rating:
            self.final_rating = final_rating
        if notes:
            self.interview_notes = notes
        self.save()
        
        # Actualizar el código de entrevista si existe
        if hasattr(self.contact_request, 'interview_code') and self.contact_request.interview_code:
            self.contact_request.interview_code.interview_rating = self.final_rating
            self.contact_request.interview_code.interview_notes = notes
            self.contact_request.interview_code.interview_date = self.actual_start_time or self.scheduled_date
            self.contact_request.interview_code.save()