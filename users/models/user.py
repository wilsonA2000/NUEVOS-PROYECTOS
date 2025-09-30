"""
User model for VeriHome.
Contains the custom User model with authentication and basic information.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid
from ..managers import UserManager


class User(AbstractUser):
    """Usuario base personalizado para VeriHome."""
    
    USER_TYPES = [
        ('landlord', 'Arrendador'),
        ('tenant', 'Arrendatario'),
        ('service_provider', 'Prestador de Servicios'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField('Correo electrónico', unique=True)
    user_type = models.CharField('Tipo de usuario', max_length=20, choices=USER_TYPES)
    is_verified = models.BooleanField('Verificado', default=False)
    verification_date = models.DateTimeField('Fecha de verificación', null=True, blank=True)
    phone_number = models.CharField(
        'Número de teléfono',
        max_length=15,
        validators=[RegexValidator(r'^\+?1?\d{9,15}$')],
        null=True,
        blank=True
    )
    whatsapp = models.CharField(
        'WhatsApp',
        max_length=15,
        validators=[RegexValidator(r'^\+?1?\d{9,15}$')],
        null=True,
        blank=True
    )
    date_of_birth = models.DateField('Fecha de nacimiento', null=True, blank=True)
    gender = models.CharField(
        'Género',
        max_length=20,
        choices=[
            ('male', 'Masculino'),
            ('female', 'Femenino'),
            ('other', 'Otro'),
            ('prefer_not_to_say', 'Prefiero no decir'),
        ],
        null=True,
        blank=True
    )
    nationality = models.CharField('Nacionalidad', max_length=100, default='Colombiana')
    marital_status = models.CharField(
        'Estado civil',
        max_length=20,
        choices=[
            ('single', 'Soltero/a'),
            ('married', 'Casado/a'),
            ('divorced', 'Divorciado/a'),
            ('widowed', 'Viudo/a'),
            ('other', 'Otro'),
        ],
        null=True,
        blank=True
    )
    country = models.CharField('País', max_length=100, default='Colombia')
    state = models.CharField('Estado/Provincia', max_length=100, blank=True)
    city = models.CharField('Ciudad', max_length=100, blank=True)
    postal_code = models.CharField('Código postal', max_length=10, blank=True)
    employment_status = models.CharField(
        'Estado laboral',
        max_length=20,
        choices=[
            ('employed', 'Empleado'),
            ('self_employed', 'Trabajador Independiente'),
            ('student', 'Estudiante'),
            ('unemployed', 'Desempleado'),
            ('retired', 'Jubilado'),
        ],
        null=True,
        blank=True
    )
    monthly_income = models.DecimalField(
        'Ingresos mensuales',
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    currency = models.CharField(
        'Moneda',
        max_length=3,
        choices=[
            ('COP', 'Pesos Colombianos'),
            ('USD', 'Dólares Americanos'),
        ],
        default='COP'
    )
    employer_name = models.CharField('Nombre del empleador', max_length=200, blank=True)
    job_title = models.CharField('Cargo', max_length=200, blank=True)
    years_employed = models.PositiveIntegerField('Años de empleo', null=True, blank=True)
    source = models.CharField(
        'Fuente de registro',
        max_length=20,
        choices=[
            ('direct', 'Directo'),
            ('google', 'Google'),
            ('facebook', 'Facebook'),
            ('instagram', 'Instagram'),
            ('referral', 'Recomendación'),
            ('advertisement', 'Anuncio'),
            ('other', 'Otro'),
        ],
        default='direct',
        null=True,
        blank=True
    )
    marketing_consent = models.BooleanField('Consentimiento de marketing', default=False)
    
    # Información adicional de verificación y seguridad
    current_address = models.TextField('Dirección actual', blank=True)
    family_size = models.PositiveIntegerField('Tamaño de familia', default=1)
    pets = models.BooleanField('Tiene mascotas', default=False)
    rental_history = models.BooleanField('Historial de arrendamiento', default=False)
    
    # Información específica para arrendadores
    total_properties = models.PositiveIntegerField('Total de propiedades', default=0)
    years_experience = models.PositiveIntegerField('Años de experiencia', default=0)
    company_name = models.CharField('Nombre de la empresa', max_length=200, blank=True)
    
    # Información específica para prestadores de servicios
    business_name = models.CharField('Nombre del negocio', max_length=200, blank=True)
    service_category = models.CharField(
        'Categoría de servicio',
        max_length=50,
        choices=[
            ('maintenance', 'Mantenimiento'),
            ('cleaning', 'Limpieza'),
            ('security', 'Seguridad'),
            ('gardening', 'Jardinería'),
            ('electrical', 'Electricidad'),
            ('plumbing', 'Plomería'),
            ('painting', 'Pintura'),
            ('moving', 'Mudanzas'),
            ('other', 'Otro'),
        ],
        blank=True
    )
    hourly_rate = models.DecimalField(
        'Tarifa por hora',
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    hourly_rate_currency = models.CharField(
        'Moneda de tarifa',
        max_length=3,
        choices=[
            ('COP', 'Pesos Colombianos'),
            ('USD', 'Dólares Americanos'),
        ],
        default='COP'
    )
    
    # Información específica para arrendatarios
    budget_range = models.CharField(
        'Rango de presupuesto',
        max_length=20,
        choices=[
            ('low', 'Económico'),
            ('medium', 'Medio'),
            ('high', 'Alto'),
            ('luxury', 'Premium'),
        ],
        default='medium'
    )
    move_in_date = models.DateField('Fecha deseada de ingreso', null=True, blank=True)
    
    avatar = models.ImageField('Avatar', upload_to='avatars/', null=True, blank=True)
    
    interview_code = models.OneToOneField(
        'InterviewCode',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user'
    )
    initial_rating = models.PositiveSmallIntegerField('Calificación inicial', default=0)
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    objects = UserManager()
    
    # Campos para el sistema de mensajería
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        related_name='messaging_user_set',
        related_query_name='messaging_user'
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='messaging_user_set',
        related_query_name='messaging_user'
    )
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'user_type']
    
    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        
    def __str__(self):
        return f"{self.get_full_name()} ({self.get_user_type_display()})"
    
    def get_profile(self):
        """Obtiene el perfil específico del usuario."""
        if self.user_type == 'landlord':
            return self.landlord_profile
        elif self.user_type == 'tenant':
            return self.tenant_profile
        elif self.user_type == 'service_provider':
            return self.service_provider_profile
        return None
    
    def has_profile(self):
        """Verifica si el usuario tiene un perfil creado."""
        try:
            return self.get_profile() is not None
        except:
            return False
    
    def save(self, *args, **kwargs):
        """Override save to handle verification date."""
        if self.is_verified and not self.verification_date:
            self.verification_date = timezone.now()
        super().save(*args, **kwargs)