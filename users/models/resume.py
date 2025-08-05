"""
Resume and Portfolio models for VeriHome.
Contains UserResume with detailed verification and PortfolioItem for work samples.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from .user import User


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
            personal_info_score += 10
            
        score += personal_info_score
        total_possible += 30
        
        # Calcular porcentaje
        if total_possible > 0:
            self.verification_score = int((score / total_possible) * 100)
        else:
            self.verification_score = 0
            
        return self.verification_score
    
    def save(self, *args, **kwargs):
        """Override save to update verification score."""
        self.calculate_verification_score()
        super().save(*args, **kwargs)


class PortfolioItem(models.Model):
    """Modelo para elementos del portafolio del usuario."""
    
    ITEM_TYPES = [
        ('work_sample', 'Muestra de trabajo'),
        ('certification', 'Certificación'),
        ('award', 'Premio'),
        ('project', 'Proyecto'),
        ('publication', 'Publicación'),
        ('reference', 'Referencia'),
        ('other', 'Otro'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='portfolio_items')
    title = models.CharField('Título', max_length=200)
    description = models.TextField('Descripción', max_length=1000)
    item_type = models.CharField('Tipo', max_length=20, choices=ITEM_TYPES)
    url = models.URLField('URL', blank=True)
    file = models.FileField('Archivo', upload_to='portfolio/', null=True, blank=True)
    date = models.DateField('Fecha', null=True, blank=True)
    is_public = models.BooleanField('Público', default=True)
    order = models.PositiveIntegerField('Orden', default=0)
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Elemento del portafolio'
        verbose_name_plural = 'Elementos del portafolio'
        ordering = ['order', '-created_at']
        
    def __str__(self):
        return f"{self.title} - {self.user.get_full_name()}"