"""
Interview and contact request models for VeriHome.
Handles interview codes and contact requests.
"""

from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
import random
import string
from datetime import timedelta
from .user import User


class InterviewCode(models.Model):
    """Modelo para códigos de entrevista para registro controlado."""
    
    code = models.CharField(
        'Código',
        max_length=10,
        unique=True,
        db_index=True
    )
    user_type = models.CharField(
        'Tipo de usuario',
        max_length=20,
        choices=User.USER_TYPES
    )
    email = models.EmailField(
        'Email asociado',
        blank=True,
        help_text='Email pre-autorizado para usar este código'
    )
    is_active = models.BooleanField('Activo', default=True)
    is_used = models.BooleanField('Usado', default=False)
    
    # Validez del código
    valid_from = models.DateTimeField('Válido desde', default=timezone.now)
    valid_until = models.DateTimeField('Válido hasta')
    
    # Metadata
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_interview_codes'
    )
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    used_at = models.DateTimeField('Fecha de uso', null=True, blank=True)
    
    # Información adicional
    notes = models.TextField('Notas', blank=True)
    max_uses = models.PositiveIntegerField('Usos máximos', default=1)
    current_uses = models.PositiveIntegerField('Usos actuales', default=0)
    
    class Meta:
        verbose_name = 'Código de Entrevista'
        verbose_name_plural = 'Códigos de Entrevista'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.code} - {self.get_user_type_display()}"
    
    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.generate_unique_code()
        if not self.valid_until:
            self.valid_until = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_unique_code(length=8):
        """Genera un código único de entrevista."""
        while True:
            code = ''.join(random.choices(
                string.ascii_uppercase + string.digits,
                k=length
            ))
            if not InterviewCode.objects.filter(code=code).exists():
                return code
    
    def is_valid(self):
        """Verifica si el código es válido."""
        now = timezone.now()
        return (
            self.is_active and
            not self.is_used and
            self.valid_from <= now <= self.valid_until and
            self.current_uses < self.max_uses
        )
    
    def use_code(self, user):
        """Marca el código como usado."""
        if not self.is_valid():
            raise ValidationError("El código no es válido")
        
        self.current_uses += 1
        if self.current_uses >= self.max_uses:
            self.is_used = True
            self.used_at = timezone.now()
        
        self.save()
        
        # Asociar el código con el usuario
        user.interview_code = self
        user.save()
        
        return True
    
    @classmethod
    def validate_code(cls, code, email=None):
        """
        Valida un código de entrevista.
        
        Args:
            code: El código a validar
            email: Email opcional para validación adicional
            
        Returns:
            InterviewCode: El código si es válido
            
        Raises:
            ValidationError: Si el código no es válido
        """
        try:
            interview_code = cls.objects.get(code=code.upper())
        except cls.DoesNotExist:
            raise ValidationError("Código inválido")
        
        if not interview_code.is_valid():
            if not interview_code.is_active:
                raise ValidationError("El código está desactivado")
            elif interview_code.is_used:
                raise ValidationError("El código ya fue utilizado")
            elif timezone.now() < interview_code.valid_from:
                raise ValidationError("El código aún no es válido")
            elif timezone.now() > interview_code.valid_until:
                raise ValidationError("El código ha expirado")
            else:
                raise ValidationError("El código no es válido")
        
        # Validar email si fue proporcionado
        if email and interview_code.email:
            if interview_code.email.lower() != email.lower():
                raise ValidationError(
                    "Este código está asociado a un email diferente"
                )
        
        return interview_code


class ContactRequest(models.Model):
    """Modelo para solicitudes de contacto de usuarios no registrados."""
    
    REQUEST_TYPES = [
        ('landlord_info', 'Información para arrendadores'),
        ('tenant_info', 'Información para arrendatarios'),
        ('service_info', 'Información para prestadores de servicios'),
        ('general_inquiry', 'Consulta general'),
        ('partnership', 'Propuesta de partnership'),
        ('support', 'Soporte técnico'),
        ('other', 'Otro'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('in_progress', 'En progreso'),
        ('responded', 'Respondido'),
        ('closed', 'Cerrado'),
        ('spam', 'Spam'),
    ]
    
    # Información del contacto
    name = models.CharField('Nombre completo', max_length=200)
    email = models.EmailField('Email')
    phone = models.CharField('Teléfono', max_length=15, blank=True)
    company = models.CharField('Empresa', max_length=200, blank=True)
    
    # Detalles de la solicitud
    request_type = models.CharField(
        'Tipo de solicitud',
        max_length=20,
        choices=REQUEST_TYPES
    )
    subject = models.CharField('Asunto', max_length=200)
    message = models.TextField('Mensaje')
    
    # Estado y seguimiento
    status = models.CharField(
        'Estado',
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_contact_requests'
    )
    
    # Respuesta
    response = models.TextField('Respuesta', blank=True)
    responded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='responded_contact_requests'
    )
    responded_at = models.DateTimeField('Fecha de respuesta', null=True, blank=True)
    
    # Metadata
    ip_address = models.GenericIPAddressField('Dirección IP', null=True, blank=True)
    user_agent = models.CharField('User Agent', max_length=255, blank=True)
    referrer = models.URLField('Referrer', blank=True)
    
    # Timestamps
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    # Si resulta en registro
    resulted_in_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contact_request'
    )
    interview_code_sent = models.ForeignKey(
        InterviewCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    class Meta:
        verbose_name = 'Solicitud de Contacto'
        verbose_name_plural = 'Solicitudes de Contacto'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.name} - {self.get_request_type_display()}"
    
    def respond(self, response_text, user):
        """Responde a la solicitud de contacto."""
        self.response = response_text
        self.responded_by = user
        self.responded_at = timezone.now()
        self.status = 'responded'
        self.save()


class InterviewSession(models.Model):
    """Modelo para sesiones de entrevista completadas."""
    
    interview_code = models.ForeignKey(
        InterviewCode,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='interview_sessions'
    )
    
    # Resultados de la entrevista
    interview_data = models.JSONField('Datos de la entrevista', default=dict)
    score = models.PositiveIntegerField('Puntuación', null=True, blank=True)
    recommendation = models.TextField('Recomendación', blank=True)
    
    # Estado
    is_complete = models.BooleanField('Completa', default=False)
    completed_at = models.DateTimeField('Fecha de finalización', null=True, blank=True)
    
    # Metadata
    duration_minutes = models.PositiveIntegerField(
        'Duración (minutos)',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Sesión de Entrevista'
        verbose_name_plural = 'Sesiones de Entrevista'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Entrevista de {self.user.get_full_name()} - {self.created_at}"