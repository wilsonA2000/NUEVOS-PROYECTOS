"""
Modelos de usuarios para VeriHome.
Incluye los tres tipos de perfiles: Arrendadores, Arrendatarios y Prestadores de Servicios.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from django.utils import timezone
from PIL import Image
import uuid
import random
import string
from .managers import UserManager


# Los modelos de entrevista se definen al final de este archivo para evitar dependencias circulares


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
            ('google', 'Google'),
            ('facebook', 'Facebook'),
            ('instagram', 'Instagram'),
            ('referral', 'Recomendación'),
            ('advertisement', 'Anuncio'),
            ('other', 'Otro'),
        ],
        null=True,
        blank=True
    )
    marketing_consent = models.BooleanField('Consentimiento de marketing', default=False)
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
            return getattr(self, 'landlord_profile', None)
        elif self.user_type == 'tenant':
            return getattr(self, 'tenant_profile', None)
        elif self.user_type == 'service_provider':
            return getattr(self, 'service_provider_profile', None)
        return None
        
    def get_initials(self):
        """Obtiene las iniciales del nombre completo del usuario."""
        if self.first_name and self.last_name:
            return f"{self.first_name[0]}{self.last_name[0]}".upper()
        elif self.first_name:
            return self.first_name[0].upper()
        elif self.last_name:
            return self.last_name[0].upper()
        else:
            return self.email[0].upper()


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


class UserResume(models.Model):
    """Modelo para la hoja de vida detallada del usuario."""
    
    EDUCATION_LEVELS = [
        ('primary', 'Primaria'),
        ('secondary', 'Secundaria'),
        ('high_school', 'Preparatoria'),
        ('bachelor', 'Licenciatura'),
        ('master', 'Maestría'),
        ('doctorate', 'Doctorado'),
        ('technical', 'Técnico'),
        ('other', 'Otro'),
    ]
    
    EMPLOYMENT_TYPES = [
        ('full_time', 'Tiempo completo'),
        ('part_time', 'Tiempo parcial'),
        ('contract', 'Por contrato'),
        ('freelance', 'Freelance'),
        ('temporary', 'Temporal'),
        ('internship', 'Pasante'),
        ('self_employed', 'Trabajador independiente'),
    ]
    
    DOCUMENT_STATUS = [
        ('pending', 'Pendiente'),
        ('verified', 'Verificado'),
        ('rejected', 'Rechazado'),
        ('expired', 'Expirado'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='resume')
    
    # Información personal extendida
    date_of_birth = models.DateField('Fecha de nacimiento', null=True, blank=True)
    nationality = models.CharField('Nacionalidad', max_length=100, default='Mexicana')
    marital_status = models.CharField('Estado civil', max_length=50, blank=True)
    dependents = models.PositiveIntegerField('Número de dependientes', default=0)
    
    # Información de contacto adicional
    emergency_contact_name = models.CharField('Contacto de emergencia', max_length=200, blank=True)
    emergency_contact_phone = models.CharField('Teléfono de emergencia', max_length=15, blank=True)
    emergency_contact_relation = models.CharField('Relación', max_length=100, blank=True)
    emergency_contact_address = models.CharField('Dirección de emergencia', max_length=255, blank=True)
    
    # Información educativa
    education_level = models.CharField('Nivel educativo', max_length=20, choices=EDUCATION_LEVELS, blank=True)
    institution_name = models.CharField('Nombre de la institución', max_length=200, blank=True)
    field_of_study = models.CharField('Campo de estudio', max_length=200, blank=True)
    graduation_year = models.PositiveIntegerField('Año de graduación', null=True, blank=True)
    gpa = models.DecimalField('Promedio', max_digits=3, decimal_places=2, null=True, blank=True)
    
    # Información laboral detallada
    current_employer = models.CharField('Empleador actual', max_length=200, blank=True)
    current_position = models.CharField('Cargo actual', max_length=200, blank=True)
    employment_type = models.CharField('Tipo de empleo', max_length=20, choices=EMPLOYMENT_TYPES, blank=True)
    start_date = models.DateField('Fecha de inicio', null=True, blank=True)
    end_date = models.DateField('Fecha de fin', null=True, blank=True)
    monthly_salary = models.DecimalField('Salario mensual', max_digits=12, decimal_places=2, null=True, blank=True)
    supervisor_name = models.CharField('Nombre del supervisor', max_length=200, blank=True)
    supervisor_phone = models.CharField('Teléfono del supervisor', max_length=15, blank=True)
    supervisor_email = models.EmailField('Email del supervisor', blank=True)
    
    # Información financiera
    bank_name = models.CharField('Nombre del banco', max_length=200, blank=True)
    account_type = models.CharField('Tipo de cuenta', max_length=50, blank=True)
    account_number = models.CharField('Número de cuenta', max_length=50, blank=True)
    credit_score = models.PositiveIntegerField('Puntuación crediticia', null=True, blank=True)
    monthly_expenses = models.DecimalField('Gastos mensuales', max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Referencias personales
    reference1_name = models.CharField('Referencia 1 - Nombre', max_length=200, blank=True)
    reference1_phone = models.CharField('Referencia 1 - Teléfono', max_length=15, blank=True)
    reference1_email = models.EmailField('Referencia 1 - Email', blank=True)
    reference1_relation = models.CharField('Referencia 1 - Relación', max_length=100, blank=True)
    
    reference2_name = models.CharField('Referencia 2 - Nombre', max_length=200, blank=True)
    reference2_phone = models.CharField('Referencia 2 - Teléfono', max_length=15, blank=True)
    reference2_email = models.EmailField('Referencia 2 - Email', blank=True)
    reference2_relation = models.CharField('Referencia 2 - Relación', max_length=100, blank=True)
    
    # Historial de vivienda
    previous_addresses = models.JSONField('Direcciones anteriores', default=list, blank=True)
    eviction_history = models.BooleanField('Historial de desalojo', default=False)
    eviction_details = models.TextField('Detalles de desalojo', blank=True)
    rental_history = models.JSONField('Historial de rentas', default=list, blank=True)
    
    # Documentos de verificación
    id_document = models.FileField('Documento de identificación', upload_to='resume/id/', null=True, blank=True)
    id_document_status = models.CharField('Estado del documento de ID', max_length=20, choices=DOCUMENT_STATUS, default='pending')
    
    proof_of_income = models.FileField('Comprobante de ingresos', upload_to='resume/income/', null=True, blank=True)
    proof_of_income_status = models.CharField('Estado del comprobante de ingresos', max_length=20, choices=DOCUMENT_STATUS, default='pending')
    
    bank_statement = models.FileField('Estado de cuenta bancario', upload_to='resume/bank/', null=True, blank=True)
    bank_statement_status = models.CharField('Estado del estado de cuenta', max_length=20, choices=DOCUMENT_STATUS, default='pending')
    
    employment_letter = models.FileField('Carta laboral', upload_to='resume/employment/', null=True, blank=True)
    employment_letter_status = models.CharField('Estado de la carta laboral', max_length=20, choices=DOCUMENT_STATUS, default='pending')
    
    tax_return = models.FileField('Declaración de impuestos', upload_to='resume/tax/', null=True, blank=True)
    tax_return_status = models.CharField('Estado de la declaración de impuestos', max_length=20, choices=DOCUMENT_STATUS, default='pending')
    
    credit_report = models.FileField('Reporte crediticio', upload_to='resume/credit/', null=True, blank=True)
    credit_report_status = models.CharField('Estado del reporte crediticio', max_length=20, choices=DOCUMENT_STATUS, default='pending')
    
    # Información adicional
    criminal_record = models.BooleanField('Antecedentes penales', default=False)
    criminal_record_details = models.TextField('Detalles de antecedentes penales', blank=True)
    criminal_record_document = models.FileField('Documento de antecedentes penales', upload_to='resume/criminal/', null=True, blank=True)
    
    # Verificación y estado
    is_complete = models.BooleanField('Hoja de vida completa', default=False)
    verification_score = models.PositiveIntegerField('Puntuación de verificación', default=0)
    verification_notes = models.TextField('Notas de verificación', blank=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_resumes')
    verified_at = models.DateTimeField('Fecha de verificación', null=True, blank=True)
    
    # Metadatos
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Hoja de Vida'
        verbose_name_plural = 'Hojas de Vida'
        
    def __str__(self):
        return f"Hoja de Vida de {self.user.get_full_name()}"
    
    def calculate_verification_score(self):
        """Calcula la puntuación de verificación basada en documentos completados."""
        score = 0
        total_possible = 0
        
        # Documentos básicos (20 puntos cada uno)
        documents = [
            self.id_document_status,
            self.proof_of_income_status,
            self.bank_statement_status,
            self.employment_letter_status,
        ]
        
        for status in documents:
            total_possible += 20
            if status == 'verified':
                score += 20
            elif status == 'pending':
                score += 5
        
        # Documentos adicionales (10 puntos cada uno)
        additional_docs = [
            self.tax_return_status,
            self.credit_report_status,
        ]
        
        for status in additional_docs:
            total_possible += 10
            if status == 'verified':
                score += 10
            elif status == 'pending':
                score += 2
        
        # Información personal (30 puntos)
        personal_info_score = 0
        if self.date_of_birth:
            personal_info_score += 5
        if self.nationality:
            personal_info_score += 5
        if self.education_level:
            personal_info_score += 5
        if self.current_employer:
            personal_info_score += 5
        if self.emergency_contact_name and self.emergency_contact_phone:
            personal_info_score += 5
        if self.reference1_name and self.reference1_phone:
            personal_info_score += 5
        
        score += personal_info_score
        total_possible += 30
        
        # Calcular porcentaje
        if total_possible > 0:
            self.verification_score = int((score / total_possible) * 100)
        else:
            self.verification_score = 0
        
        return self.verification_score
    
    def get_completion_percentage(self):
        """Obtiene el porcentaje de completitud de la hoja de vida."""
        fields = [
            'date_of_birth', 'nationality', 'education_level', 'current_employer',
            'current_position', 'monthly_salary', 'emergency_contact_name',
            'emergency_contact_phone', 'reference1_name', 'reference1_phone',
            'id_document', 'proof_of_income', 'bank_statement', 'employment_letter'
        ]
        
        completed = sum(1 for field in fields if getattr(self, field))
        return int((completed / len(fields)) * 100)


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


class AdminImpersonationSession(models.Model):
    """Registro de sesiones donde un superusuario impersona a otro usuario."""
    
    admin_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='impersonation_sessions_as_admin',
        verbose_name='Administrador'
    )
    impersonated_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='impersonation_sessions_as_target',
        verbose_name='Usuario Impersonado'
    )
    started_at = models.DateTimeField('Iniciado en', auto_now_add=True)
    ended_at = models.DateTimeField('Terminado en', null=True, blank=True)
    session_key = models.CharField('Clave de sesión', max_length=40)
    ip_address = models.GenericIPAddressField('Dirección IP')
    user_agent = models.TextField('User Agent')
    reason = models.TextField('Motivo de la impersonación', max_length=500, blank=True)
    is_active = models.BooleanField('Activa', default=True)
    
    class Meta:
        verbose_name = 'Sesión de Impersonación'
        verbose_name_plural = 'Sesiones de Impersonación'
        ordering = ['-started_at']
    
    def __str__(self):
        return f"{self.admin_user} → {self.impersonated_user} ({self.started_at})"


class AdminActionLog(models.Model):
    """Registro detallado de acciones administrativas realizadas durante impersonación."""
    
    ACTION_TYPES = [
        ('contract_create', 'Crear Contrato'),
        ('contract_edit', 'Editar Contrato'),
        ('contract_delete', 'Eliminar Contrato'),
        ('contract_sign', 'Firmar Contrato'),
        ('contract_download', 'Descargar Contrato'),
        ('payment_create', 'Crear Pago'),
        ('payment_verify', 'Verificar Pago'),
        ('payment_refund', 'Reembolsar Pago'),
        ('payment_approve', 'Aprobar Pago'),
        ('property_create', 'Crear Propiedad'),
        ('property_edit', 'Editar Propiedad'),
        ('property_delete', 'Eliminar Propiedad'),
        ('property_approve', 'Aprobar Propiedad'),
        ('user_create', 'Crear Usuario'),
        ('user_edit', 'Editar Usuario'),
        ('user_suspend', 'Suspender Usuario'),
        ('user_activate', 'Activar Usuario'),
        ('user_password_reset', 'Resetear Contraseña'),
        ('rating_create', 'Crear Calificación'),
        ('rating_edit', 'Editar Calificación'),
        ('rating_delete', 'Eliminar Calificación'),
        ('rating_approve', 'Aprobar Calificación'),
        ('message_send', 'Enviar Mensaje'),
        ('message_delete', 'Eliminar Mensaje'),
        ('system_config', 'Configuración del Sistema'),
        ('data_export', 'Exportar Datos'),
        ('data_import', 'Importar Datos'),
        ('impersonation_start', 'Iniciar Impersonación'),
        ('impersonation_stop', 'Detener Impersonación'),
        ('other', 'Otro'),
    ]
    
    impersonation_session = models.ForeignKey(
        AdminImpersonationSession,
        on_delete=models.CASCADE,
        related_name='actions',
        verbose_name='Sesión de Impersonación'
    )
    action_type = models.CharField('Tipo de acción', max_length=30, choices=ACTION_TYPES)
    action_description = models.TextField('Descripción detallada de la acción')
    target_object_type = models.CharField('Tipo de objeto', max_length=50, blank=True)
    target_object_id = models.CharField('ID del objeto', max_length=50, blank=True)
    target_object_name = models.CharField('Nombre del objeto', max_length=200, blank=True)
    
    # Datos detallados del cambio
    old_data = models.JSONField('Datos anteriores', default=dict, blank=True)
    new_data = models.JSONField('Datos nuevos', default=dict, blank=True)
    changed_fields = models.JSONField('Campos modificados', default=list, blank=True)
    
    # Información de contexto
    ip_address = models.GenericIPAddressField('Dirección IP')
    user_agent = models.TextField('User Agent', blank=True)
    geolocation = models.JSONField('Geolocalización', default=dict, blank=True)
    timestamp = models.DateTimeField('Fecha y hora', auto_now_add=True)
    
    # Estado de la acción
    success = models.BooleanField('Exitosa', default=True)
    error_message = models.TextField('Mensaje de error', blank=True)
    error_traceback = models.TextField('Traceback del error', blank=True)
    
    # Metadatos adicionales
    session_duration = models.DurationField('Duración de la sesión', null=True, blank=True)
    browser_info = models.JSONField('Información del navegador', default=dict, blank=True)
    device_info = models.JSONField('Información del dispositivo', default=dict, blank=True)
    
    # Notificación al usuario
    notify_user = models.BooleanField('Notificar al usuario', default=True)
    notification_sent = models.BooleanField('Notificación enviada', default=False)
    notification_sent_at = models.DateTimeField('Notificación enviada en', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Registro de Acción Administrativa'
        verbose_name_plural = 'Registros de Acciones Administrativas'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['action_type']),
            models.Index(fields=['target_object_type', 'target_object_id']),
            models.Index(fields=['impersonation_session', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.get_action_type_display()} - {self.timestamp}"
    
    def get_changes_summary(self):
        """Obtener un resumen legible de los cambios realizados."""
        if not self.changed_fields:
            return "Sin cambios específicos registrados"
        
        changes = []
        for field in self.changed_fields:
            old_value = self.old_data.get(field, 'No especificado')
            new_value = self.new_data.get(field, 'No especificado')
            changes.append(f"{field}: {old_value} → {new_value}")
        
        return "; ".join(changes)
    
    def get_action_context(self):
        """Obtener contexto completo de la acción."""
        return {
            'admin_user': self.impersonation_session.admin_user.get_full_name(),
            'impersonated_user': self.impersonation_session.impersonated_user.get_full_name(),
            'action_type': self.get_action_type_display(),
            'description': self.action_description,
            'timestamp': self.timestamp,
            'changes': self.get_changes_summary(),
            'ip_address': self.ip_address,
            'success': self.success,
        }


class UserActionNotification(models.Model):
    """Notificaciones enviadas a usuarios sobre acciones administrativas en su cuenta."""
    
    NOTIFICATION_TYPES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('in_app', 'En la aplicación'),
        ('push', 'Notificación push'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('sent', 'Enviada'),
        ('delivered', 'Entregada'),
        ('read', 'Leída'),
        ('failed', 'Fallida'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='admin_action_notifications',
        verbose_name='Usuario notificado'
    )
    admin_action = models.ForeignKey(
        AdminActionLog,
        on_delete=models.CASCADE,
        related_name='user_notifications',
        verbose_name='Acción administrativa'
    )
    
    # Detalles de la notificación
    notification_type = models.CharField('Tipo de notificación', max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField('Título', max_length=200)
    message = models.TextField('Mensaje detallado')
    summary = models.TextField('Resumen', max_length=500)
    
    # Estado de la notificación
    status = models.CharField('Estado', max_length=20, choices=STATUS_CHOICES, default='pending')
    sent_at = models.DateTimeField('Enviada en', null=True, blank=True)
    delivered_at = models.DateTimeField('Entregada en', null=True, blank=True)
    read_at = models.DateTimeField('Leída en', null=True, blank=True)
    
    # Información de entrega
    delivery_attempts = models.PositiveIntegerField('Intentos de entrega', default=0)
    error_message = models.TextField('Mensaje de error', blank=True)
    
    # Metadatos
    created_at = models.DateTimeField('Creada en', auto_now_add=True)
    expires_at = models.DateTimeField('Expira en', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Notificación de Acción Administrativa'
        verbose_name_plural = 'Notificaciones de Acciones Administrativas'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['notification_type', 'status']),
        ]
    
    def __str__(self):
        return f"Notificación para {self.user} - {self.title}"
    
    def mark_as_sent(self):
        """Marcar como enviada."""
        from django.utils import timezone
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save()
    
    def mark_as_delivered(self):
        """Marcar como entregada."""
        from django.utils import timezone
        self.status = 'delivered'
        self.delivered_at = timezone.now()
        self.save()
    
    def mark_as_read(self):
        """Marcar como leída."""
        from django.utils import timezone
        self.status = 'read'
        self.read_at = timezone.now()
        self.save()


class UserActivityLog(models.Model):
    """Registro de actividad del usuario para que pueda ver su historial completo."""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='user_activity_logs',
        verbose_name='Usuario'
    )
    
    # Referencia a la acción administrativa (si aplica)
    admin_action = models.ForeignKey(
        AdminActionLog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_activity_logs',
        verbose_name='Acción administrativa relacionada'
    )
    
    # Información de la actividad
    activity_type = models.CharField('Tipo de actividad', max_length=50)
    description = models.TextField('Descripción')
    details = models.JSONField('Detalles', default=dict, blank=True)
    
    # Metadatos
    timestamp = models.DateTimeField('Fecha y hora', auto_now_add=True)
    ip_address = models.GenericIPAddressField('Dirección IP')
    user_agent = models.TextField('User Agent', blank=True)
    
    # Indicador de si fue realizada por administrador
    performed_by_admin = models.BooleanField('Realizada por administrador', default=False)
    admin_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='performed_activities',
        verbose_name='Administrador que realizó la acción'
    )
    
    class Meta:
        verbose_name = 'Registro de Actividad del Usuario'
        verbose_name_plural = 'Registros de Actividad del Usuario'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['activity_type']),
            models.Index(fields=['performed_by_admin']),
        ]
    
    def __str__(self):
        admin_info = f" (por {self.admin_user})" if self.performed_by_admin and self.admin_user else ""
        return f"{self.user} - {self.activity_type}{admin_info} - {self.timestamp}"


class AdminSessionSummary(models.Model):
    """Resumen de sesiones de impersonación para reportes."""
    
    impersonation_session = models.OneToOneField(
        AdminImpersonationSession,
        on_delete=models.CASCADE,
        related_name='summary',
        verbose_name='Sesión de Impersonación'
    )
    
    # Estadísticas de la sesión
    total_actions = models.PositiveIntegerField('Total de acciones', default=0)
    successful_actions = models.PositiveIntegerField('Acciones exitosas', default=0)
    failed_actions = models.PositiveIntegerField('Acciones fallidas', default=0)
    
    # Categorías de acciones
    contract_actions = models.PositiveIntegerField('Acciones en contratos', default=0)
    payment_actions = models.PositiveIntegerField('Acciones en pagos', default=0)
    property_actions = models.PositiveIntegerField('Acciones en propiedades', default=0)
    user_actions = models.PositiveIntegerField('Acciones en usuarios', default=0)
    rating_actions = models.PositiveIntegerField('Acciones en calificaciones', default=0)
    system_actions = models.PositiveIntegerField('Acciones del sistema', default=0)
    
    # Información de tiempo
    session_duration = models.DurationField('Duración de la sesión', null=True, blank=True)
    average_action_time = models.DurationField('Tiempo promedio por acción', null=True, blank=True)
    
    # Resumen de cambios
    objects_created = models.PositiveIntegerField('Objetos creados', default=0)
    objects_modified = models.PositiveIntegerField('Objetos modificados', default=0)
    objects_deleted = models.PositiveIntegerField('Objetos eliminados', default=0)
    
    # Metadatos
    created_at = models.DateTimeField('Creado en', auto_now_add=True)
    updated_at = models.DateTimeField('Actualizado en', auto_now=True)
    
    class Meta:
        verbose_name = 'Resumen de Sesión Administrativa'
        verbose_name_plural = 'Resúmenes de Sesiones Administrativas'
    
    def __str__(self):
        return f"Resumen de sesión {self.impersonation_session.id} - {self.total_actions} acciones"
    
    def calculate_statistics(self):
        """Calcular estadísticas basadas en las acciones de la sesión."""
        actions = self.impersonation_session.actions.all()
        
        self.total_actions = actions.count()
        self.successful_actions = actions.filter(success=True).count()
        self.failed_actions = actions.filter(success=False).count()
        
        # Contar por categorías
        self.contract_actions = actions.filter(action_type__startswith='contract_').count()
        self.payment_actions = actions.filter(action_type__startswith='payment_').count()
        self.property_actions = actions.filter(action_type__startswith='property_').count()
        self.user_actions = actions.filter(action_type__startswith='user_').count()
        self.rating_actions = actions.filter(action_type__startswith='rating_').count()
        self.system_actions = actions.filter(action_type__startswith='system_').count()
        
        # Contar objetos afectados
        self.objects_created = actions.filter(action_type__endswith='_create').count()
        self.objects_modified = actions.filter(action_type__endswith='_edit').count()
        self.objects_deleted = actions.filter(action_type__endswith='_delete').count()
        
        self.save()


class UserSettings(models.Model):
    """Configuraciones del usuario."""
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='settings'
    )
    
    # Notificaciones
    email_notifications = models.BooleanField('Notificaciones por Email', default=True)
    sms_notifications = models.BooleanField('Notificaciones por SMS', default=False)
    push_notifications = models.BooleanField('Notificaciones Push', default=True)
    newsletter = models.BooleanField('Newsletter', default=True)
    property_alerts = models.BooleanField('Alertas de Propiedades', default=True)
    message_notifications = models.BooleanField('Notificaciones de Mensajes', default=True)
    payment_reminders = models.BooleanField('Recordatorios de Pagos', default=True)
    
    # Privacidad
    profile_visibility = models.CharField(
        'Visibilidad del Perfil',
        max_length=20,
        choices=[
            ('public', 'Público'),
            ('private', 'Privado'),
            ('contacts_only', 'Solo Contactos'),
        ],
        default='public'
    )
    show_contact_info = models.BooleanField('Mostrar Información de Contacto', default=True)
    show_property_history = models.BooleanField('Mostrar Historial de Propiedades', default=False)
    allow_messages = models.BooleanField('Permitir Mensajes', default=True)
    
    # Preferencias
    language = models.CharField('Idioma', max_length=10, default='es')
    timezone = models.CharField('Zona Horaria', max_length=50, default='America/Bogota')
    currency = models.CharField('Moneda', max_length=3, default='COP')
    date_format = models.CharField('Formato de Fecha', max_length=20, default='DD/MM/YYYY')
    theme = models.CharField(
        'Tema',
        max_length=10,
        choices=[
            ('light', 'Claro'),
            ('dark', 'Oscuro'),
            ('auto', 'Automático'),
        ],
        default='light'
    )
    
    # Seguridad
    two_factor_enabled = models.BooleanField('Autenticación de Dos Factores', default=False)
    login_notifications = models.BooleanField('Notificaciones de Inicio de Sesión', default=True)
    session_timeout = models.PositiveIntegerField('Tiempo de Sesión (minutos)', default=30)
    
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Configuración de Usuario'
        verbose_name_plural = 'Configuraciones de Usuario'
        
    def __str__(self):
        return f"Configuración de {self.user.get_full_name()}"


# ================================
# MODELOS DE SISTEMA DE ENTREVISTAS
# ================================

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
        'User',
        on_delete=models.CASCADE,
        related_name='created_interview_codes',
        verbose_name='Creado por'
    )
    approved_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_interview_codes',
        verbose_name='Aprobado por'
    )
    
    # Usuario registrado (cuando se usa el código)
    registered_user = models.OneToOneField(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='used_interview_code',
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
            from django.utils import timezone
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
        from django.utils import timezone
        
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
    
    def increment_attempt(self):
        """Incrementa el contador de intentos."""
        self.current_attempts += 1
        if self.current_attempts >= self.max_attempts:
            self.status = 'revoked'
        self.save()
    
    def use_code(self, user):
        """Marca el código como usado por un usuario."""
        from django.utils import timezone
        self.status = 'used'
        self.registered_user = user
        self.used_at = timezone.now()
        self.save()
    
    def approve(self, approved_by_user, user_type, rating, notes=''):
        """Aprueba el código de entrevista."""
        self.is_approved = True
        self.approved_user_type = user_type
        self.interview_rating = rating
        self.interview_notes = notes
        self.approved_by = approved_by_user
        self.save()
    
    def revoke(self):
        """Revoca el código de entrevista."""
        self.status = 'revoked'
        self.save()


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
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_contacts',
        verbose_name='Asignado a'
    )
    
    # Código de entrevista relacionado
    interview_code = models.OneToOneField(
        'InterviewCode',
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
        'ContactRequest',
        on_delete=models.CASCADE,
        related_name='interview_sessions',
        verbose_name='Solicitud de Contacto'
    )
    interviewer = models.ForeignKey(
        'User',
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