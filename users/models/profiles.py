"""
Profile models for VeriHome.
Contains BaseProfile and specific profiles for each user type.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from PIL import Image
from .user import User


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
    country = models.CharField('País', max_length=100, default='Colombia')
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
            try:
                img = Image.open(self.profile_image.path)
                if img.height > 300 or img.width > 300:
                    output_size = (300, 300)
                    img.thumbnail(output_size)
                    img.save(self.profile_image.path)
            except Exception as e:
                print(f"Error processing image: {e}")


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
    currency = models.CharField(
        'Moneda',
        max_length=3,
        choices=[
            ('COP', 'Pesos Colombianos'),
            ('USD', 'Dólares Americanos'),
        ],
        default='COP'
    )
    employment_status = models.CharField(
        'Estado laboral',
        max_length=20,
        choices=EMPLOYMENT_STATUS,
        blank=True
    )
    employer_name = models.CharField('Nombre del empleador', max_length=200, blank=True)
    job_title = models.CharField('Cargo', max_length=200, blank=True)
    years_employed = models.PositiveIntegerField('Años de empleo', null=True, blank=True)
    
    # Documentos específicos
    income_proof = models.FileField(
        'Comprobante de ingresos',
        upload_to='documents/income/',
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
        'Extractos bancarios',
        upload_to='documents/bank/',
        null=True,
        blank=True
    )
    
    # Información adicional
    has_pets = models.BooleanField('Tiene mascotas', default=False)
    pets_description = models.TextField('Descripción de mascotas', max_length=500, blank=True)
    smokes = models.BooleanField('Fuma', default=False)
    has_children = models.BooleanField('Tiene hijos', default=False)
    children_count = models.PositiveIntegerField('Número de hijos', default=0)
    emergency_contact_name = models.CharField('Nombre contacto de emergencia', max_length=200, blank=True)
    emergency_contact_phone = models.CharField('Teléfono contacto de emergencia', max_length=15, blank=True)
    
    # Preferencias
    preferred_property_types = models.JSONField(
        'Tipos de propiedad preferidos',
        default=list
    )
    preferred_locations = models.JSONField(
        'Ubicaciones preferidas',
        default=list
    )
    max_rent_budget = models.DecimalField(
        'Presupuesto máximo de renta',
        max_digits=12,
        decimal_places=2,
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
    
    SERVICE_TYPES = [
        ('plumbing', 'Plomería'),
        ('electrical', 'Electricidad'),
        ('cleaning', 'Limpieza'),
        ('gardening', 'Jardinería'),
        ('painting', 'Pintura'),
        ('carpentry', 'Carpintería'),
        ('hvac', 'Aire Acondicionado'),
        ('locksmith', 'Cerrajería'),
        ('moving', 'Mudanzas'),
        ('handyman', 'Mantenimiento General'),
        ('other', 'Otro'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='service_provider_profile'
    )
    
    # Información profesional
    company_name = models.CharField('Nombre de la empresa', max_length=200, blank=True)
    service_types = models.JSONField(
        'Tipos de servicios',
        default=list,
        help_text='Tipos de servicios que ofrece'
    )
    years_experience = models.PositiveIntegerField('Años de experiencia', default=0)
    hourly_rate = models.DecimalField(
        'Tarifa por hora',
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Cobertura de servicio
    service_areas = models.JSONField(
        'Áreas de servicio',
        default=list,
        help_text='Ciudades o zonas donde presta servicios'
    )
    max_distance_km = models.PositiveIntegerField(
        'Distancia máxima (km)',
        default=50,
        help_text='Distancia máxima que está dispuesto a viajar'
    )
    
    # Disponibilidad
    available_monday = models.BooleanField('Disponible lunes', default=True)
    available_tuesday = models.BooleanField('Disponible martes', default=True)
    available_wednesday = models.BooleanField('Disponible miércoles', default=True)
    available_thursday = models.BooleanField('Disponible jueves', default=True)
    available_friday = models.BooleanField('Disponible viernes', default=True)
    available_saturday = models.BooleanField('Disponible sábado', default=False)
    available_sunday = models.BooleanField('Disponible domingo', default=False)
    
    # Horarios
    work_start_time = models.TimeField('Hora de inicio', null=True, blank=True)
    work_end_time = models.TimeField('Hora de fin', null=True, blank=True)
    
    # Documentos y certificaciones
    professional_license = models.FileField(
        'Licencia profesional',
        upload_to='documents/licenses/',
        null=True,
        blank=True
    )
    insurance_certificate = models.FileField(
        'Certificado de seguro',
        upload_to='documents/insurance/',
        null=True,
        blank=True
    )
    certifications = models.JSONField(
        'Certificaciones',
        default=list,
        help_text='Lista de certificaciones profesionales'
    )
    
    # Información adicional
    has_own_tools = models.BooleanField('Tiene herramientas propias', default=True)
    has_vehicle = models.BooleanField('Tiene vehículo', default=True)
    accepts_emergency_calls = models.BooleanField('Acepta llamadas de emergencia', default=False)
    emergency_rate_multiplier = models.DecimalField(
        'Multiplicador tarifa emergencia',
        max_digits=3,
        decimal_places=1,
        default=1.5,
        validators=[MinValueValidator(1.0), MaxValueValidator(3.0)]
    )
    
    class Meta:
        verbose_name = 'Perfil de Prestador de Servicios'
        verbose_name_plural = 'Perfiles de Prestadores de Servicios'
        
    def __str__(self):
        return f"Prestador de Servicios: {self.user.get_full_name()}"