"""
Modelos de usuarios para VeriHome.
Incluye los tres tipos de perfiles: Arrendadores, Arrendatarios y Prestadores de Servicios.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator
from PIL import Image
import uuid


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
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
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
            return getattr(self, 'landlord_profile', None)
        elif self.user_type == 'tenant':
            return getattr(self, 'tenant_profile', None)
        elif self.user_type == 'service_provider':
            return getattr(self, 'service_provider_profile', None)
        return None


class BaseProfile(models.Model):
    """Modelo base para todos los perfiles."""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField('Biografía', max_length=1000, blank=True)
    profile_image = models.ImageField(
        'Imagen de perfil',
        upload_to='profiles/',
        null=True,
        blank=True
    )
    address = models.CharField('Dirección', max_length=255, blank=True)
    city = models.CharField('Ciudad', max_length=100, blank=True)
    state = models.CharField('Estado/Provincia', max_length=100, blank=True)
    country = models.CharField('País', max_length=100, default='México')
    postal_code = models.CharField('Código postal', max_length=10, blank=True)
    latitude = models.DecimalField('Latitud', max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField('Longitud', max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Documentos de verificación
    identification_document = models.FileField(
        'Documento de identificación',
        upload_to='documents/identification/',
        null=True,
        blank=True
    )
    proof_of_address = models.FileField(
        'Comprobante de domicilio',
        upload_to='documents/address/',
        null=True,
        blank=True
    )
    
    # Video de presentación
    presentation_video = models.FileField(
        'Video de presentación',
        upload_to='videos/presentations/',
        null=True,
        blank=True
    )
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        abstract = True
        
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        # Redimensionar imagen de perfil
        if self.profile_image:
            img = Image.open(self.profile_image.path)
            if img.height > 300 or img.width > 300:
                output_size = (300, 300)
                img.thumbnail(output_size)
                img.save(self.profile_image.path)


class LandlordProfile(BaseProfile):
    """Perfil específico para arrendadores."""
    
    PROPERTY_TYPES = [
        ('apartment', 'Apartamento'),
        ('house', 'Casa'),
        ('commercial', 'Comercial'),
        ('office', 'Oficina'),
        ('warehouse', 'Bodega'),
        ('land', 'Terreno'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='landlord_profile'
    )
    
    # Información específica del arrendador
    company_name = models.CharField('Nombre de la empresa', max_length=200, blank=True)
    property_types = models.JSONField(
        'Tipos de propiedades',
        default=list,
        help_text='Tipos de propiedades que maneja'
    )
    total_properties = models.PositiveIntegerField('Total de propiedades', default=0)
    years_experience = models.PositiveIntegerField('Años de experiencia', default=0)
    
    # Documentos específicos
    property_ownership_docs = models.FileField(
        'Documentos de propiedad',
        upload_to='documents/property_ownership/',
        null=True,
        blank=True
    )
    business_license = models.FileField(
        'Licencia de negocio',
        upload_to='documents/business_license/',
        null=True,
        blank=True
    )
    
    class Meta:
        verbose_name = 'Perfil de Arrendador'
        verbose_name_plural = 'Perfiles de Arrendadores'
        
    def __str__(self):
        return f"Arrendador: {self.user.get_full_name()}"


class TenantProfile(BaseProfile):
    """Perfil específico para arrendatarios."""
    
    EMPLOYMENT_STATUS = [
        ('employed', 'Empleado'),
        ('self_employed', 'Trabajador independiente'),
        ('student', 'Estudiante'),
        ('unemployed', 'Desempleado'),
        ('retired', 'Jubilado'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='tenant_profile'
    )
    
    # Información financiera
    monthly_income = models.DecimalField(
        'Ingresos mensuales',
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    employment_status = models.CharField(
        'Estado laboral',
        max_length=20,
        choices=EMPLOYMENT_STATUS,
        blank=True
    )
    employer_name = models.CharField('Nombre del empleador', max_length=200, blank=True)
    employer_phone = models.CharField('Teléfono del empleador', max_length=15, blank=True)
    
    # Referencias
    emergency_contact_name = models.CharField('Contacto de emergencia', max_length=200, blank=True)
    emergency_contact_phone = models.CharField('Teléfono de emergencia', max_length=15, blank=True)
    emergency_contact_relation = models.CharField('Relación', max_length=100, blank=True)
    
    # Historial crediticio
    credit_score = models.PositiveIntegerField('Puntuación crediticia', null=True, blank=True)
    
    # Documentos específicos
    income_proof = models.FileField(
        'Comprobante de ingresos',
        upload_to='documents/income_proof/',
        null=True,
        blank=True
    )
    employment_letter = models.FileField(
        'Carta laboral',
        upload_to='documents/employment/',
        null=True,
        blank=True
    )
    bank_statements = models.FileField(
        'Estados de cuenta',
        upload_to='documents/bank_statements/',
        null=True,
        blank=True
    )
    
    class Meta:
        verbose_name = 'Perfil de Arrendatario'
        verbose_name_plural = 'Perfiles de Arrendatarios'
        
    def __str__(self):
        return f"Arrendatario: {self.user.get_full_name()}"


class ServiceProviderProfile(BaseProfile):
    """Perfil específico para prestadores de servicios."""
    
    SERVICE_CATEGORIES = [
        ('maintenance', 'Mantenimiento'),
        ('cleaning', 'Limpieza'),
        ('security', 'Seguridad'),
        ('landscaping', 'Jardinería'),
        ('plumbing', 'Plomería'),
        ('electrical', 'Electricidad'),
        ('painting', 'Pintura'),
        ('carpentry', 'Carpintería'),
        ('legal', 'Servicios Legales'),
        ('real_estate', 'Asesoría Inmobiliaria'),
        ('insurance', 'Seguros'),
        ('photography', 'Fotografía'),
        ('inspection', 'Inspección'),
        ('other', 'Otros'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='service_provider_profile'
    )
    
    # Información del servicio
    service_category = models.CharField(
        'Categoría de servicio',
        max_length=20,
        choices=SERVICE_CATEGORIES
    )
    specialties = models.JSONField(
        'Especialidades',
        default=list,
        help_text='Lista de especialidades específicas'
    )
    service_description = models.TextField('Descripción del servicio', max_length=1000)
    service_areas = models.JSONField(
        'Áreas de servicio',
        default=list,
        help_text='Ciudades o zonas donde presta servicios'
    )
    
    # Información profesional
    business_name = models.CharField('Nombre del negocio', max_length=200, blank=True)
    years_experience = models.PositiveIntegerField('Años de experiencia', default=0)
    hourly_rate = models.DecimalField(
        'Tarifa por hora',
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True
    )
    minimum_charge = models.DecimalField(
        'Cargo mínimo',
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Disponibilidad
    available_weekdays = models.JSONField(
        'Días disponibles',
        default=list,
        help_text='Lista de días de la semana disponibles'
    )
    available_hours_start = models.TimeField('Hora de inicio', null=True, blank=True)
    available_hours_end = models.TimeField('Hora de fin', null=True, blank=True)
    
    # Documentos y certificaciones
    professional_license = models.FileField(
        'Licencia profesional',
        upload_to='documents/professional_license/',
        null=True,
        blank=True
    )
    insurance_certificate = models.FileField(
        'Certificado de seguro',
        upload_to='documents/insurance/',
        null=True,
        blank=True
    )
    certifications = models.FileField(
        'Certificaciones',
        upload_to='documents/certifications/',
        null=True,
        blank=True
    )
    
    class Meta:
        verbose_name = 'Perfil de Prestador de Servicios'
        verbose_name_plural = 'Perfiles de Prestadores de Servicios'
        
    def __str__(self):
        return f"Prestador de Servicios: {self.user.get_full_name()}"


class PortfolioItem(models.Model):
    """Elemento del portafolio para prestadores de servicios."""
    
    service_provider = models.ForeignKey(
        ServiceProviderProfile,
        on_delete=models.CASCADE,
        related_name='portfolio_items'
    )
    title = models.CharField('Título', max_length=200)
    description = models.TextField('Descripción', max_length=500)
    image = models.ImageField('Imagen', upload_to='portfolio/', null=True, blank=True)
    project_date = models.DateField('Fecha del proyecto', null=True, blank=True)
    client_name = models.CharField('Nombre del cliente', max_length=200, blank=True)
    project_cost = models.DecimalField(
        'Costo del proyecto',
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Elemento del Portafolio'
        verbose_name_plural = 'Elementos del Portafolio'
        ordering = ['-project_date', '-created_at']
        
    def __str__(self):
        return f"{self.title} - {self.service_provider.user.get_full_name()}"
