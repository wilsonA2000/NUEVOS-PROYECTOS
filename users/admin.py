"""
Configuración del panel de administración para la aplicación de usuarios.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import (
    User, LandlordProfile, TenantProfile, ServiceProviderProfile, PortfolioItem, UserResume
)
# Importar los admin de entrevistas
from .admin_interview import InterviewCodeAdmin
# Importar modelos de allauth para email confirmation
from allauth.account.models import EmailConfirmation, EmailAddress


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Administración personalizada para el modelo User."""
    
    list_display = [
        'email', 'get_full_name', 'user_type', 'is_verified', 
        'is_active', 'created_at', 'verification_badge'
    ]
    list_filter = ['user_type', 'is_verified', 'is_active', 'created_at']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Información Personal', {
            'fields': ('first_name', 'last_name', 'phone_number', 'user_type')
        }),
        ('Verificación', {
            'fields': ('is_verified', 'verification_date')
        }),
        ('Permisos', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'classes': ['collapse']
        }),
        ('Fechas Importantes', {
            'fields': ('last_login', 'created_at', 'updated_at'),
            'classes': ['collapse']
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'user_type', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'last_login']
    
    def verification_badge(self, obj):
        """Muestra un badge visual del estado de verificación."""
        if obj.is_verified:
            return format_html(
                '<span style="background-color: #10B981; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px;">✓ Verificado</span>'
            )
        return format_html(
            '<span style="background-color: #EF4444; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px;">✗ No Verificado</span>'
        )
    verification_badge.short_description = 'Estado'


class PortfolioItemInline(admin.TabularInline):
    """Inline para elementos del portafolio."""
    model = PortfolioItem
    extra = 0
    fields = ['title', 'description', 'item_type', 'date', 'is_public']


@admin.register(LandlordProfile)
class LandlordProfileAdmin(admin.ModelAdmin):
    """Administración para perfiles de arrendadores."""
    
    list_display = [
        'user', 'company_name', 'total_properties', 'years_experience', 
        'created_at', 'user_verification_status'
    ]
    list_filter = ['years_experience', 'created_at', 'user__is_verified']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'company_name']
    
    fieldsets = (
        ('Usuario', {'fields': ('user',)}),
        ('Información Básica', {
            'fields': ('bio', 'profile_image', 'presentation_video')
        }),
        ('Información de Contacto', {
            'fields': ('address', 'city', 'state', 'country', 'postal_code', 'latitude', 'longitude')
        }),
        ('Información Profesional', {
            'fields': ('company_name', 'property_types', 'total_properties', 'years_experience')
        }),
        ('Documentos', {
            'fields': ('identification_document', 'proof_of_address', 'property_ownership_docs', 'business_license'),
            'classes': ['collapse']
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    def user_verification_status(self, obj):
        """Muestra el estado de verificación del usuario."""
        return obj.user.is_verified
    user_verification_status.boolean = True
    user_verification_status.short_description = 'Usuario Verificado'


@admin.register(TenantProfile)
class TenantProfileAdmin(admin.ModelAdmin):
    """Administración para perfiles de arrendatarios."""
    
    list_display = [
        'user', 'employment_status', 'monthly_income', 
        'created_at', 'user_verification_status'
    ]
    list_filter = ['employment_status', 'created_at', 'user__is_verified']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'employer_name']
    
    fieldsets = (
        ('Usuario', {'fields': ('user',)}),
        ('Información Básica', {
            'fields': ('bio', 'profile_image', 'presentation_video')
        }),
        ('Información de Contacto', {
            'fields': ('address', 'city', 'state', 'country', 'postal_code', 'latitude', 'longitude')
        }),
        ('Información Financiera', {
            'fields': ('monthly_income', 'currency', 'employment_status', 'employer_name', 'job_title', 'years_employed')
        }),
        ('Referencias', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone')
        }),
        ('Documentos', {
            'fields': ('identification_document', 'proof_of_address', 'income_proof', 'employment_letter', 'bank_statements'),
            'classes': ['collapse']
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    def user_verification_status(self, obj):
        """Muestra el estado de verificación del usuario."""
        return obj.user.is_verified
    user_verification_status.boolean = True
    user_verification_status.short_description = 'Usuario Verificado'


@admin.register(ServiceProviderProfile)
class ServiceProviderProfileAdmin(admin.ModelAdmin):
    """Administración para perfiles de prestadores de servicios."""
    
    list_display = [
        'user', 'company_name', 'years_experience', 
        'hourly_rate', 'created_at', 'user_verification_status'
    ]
    list_filter = ['years_experience', 'created_at', 'user__is_verified']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'company_name']
    
    fieldsets = (
        ('Usuario', {'fields': ('user',)}),
        ('Información Básica', {
            'fields': ('bio', 'profile_image', 'presentation_video')
        }),
        ('Información de Contacto', {
            'fields': ('address', 'city', 'state', 'country', 'postal_code', 'latitude', 'longitude')
        }),
        ('Información del Servicio', {
            'fields': ('service_types', 'service_areas', 'max_distance_km')
        }),
        ('Información Profesional', {
            'fields': ('company_name', 'years_experience', 'hourly_rate')
        }),
        ('Disponibilidad', {
            'fields': ('available_monday', 'available_tuesday', 'available_wednesday', 'available_thursday', 'available_friday', 'available_saturday', 'available_sunday', 'work_start_time', 'work_end_time')
        }),
        ('Documentos', {
            'fields': ('identification_document', 'proof_of_address', 'professional_license', 'insurance_certificate', 'certifications'),
            'classes': ['collapse']
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    # inlines = [PortfolioItemInline]  # PortfolioItem is related to User, not ServiceProviderProfile
    
    def user_verification_status(self, obj):
        """Muestra el estado de verificación del usuario."""
        return obj.user.is_verified
    user_verification_status.boolean = True
    user_verification_status.short_description = 'Usuario Verificado'


@admin.register(PortfolioItem)
class PortfolioItemAdmin(admin.ModelAdmin):
    """Administración para elementos del portafolio."""
    
    list_display = ['title', 'user', 'item_type', 'date', 'created_at']
    list_filter = ['item_type', 'date', 'created_at']
    search_fields = ['title', 'description', 'service_provider__user__first_name', 'service_provider__user__last_name']
    
    fieldsets = (
        ('Información del Proyecto', {
            'fields': ('service_provider', 'title', 'description', 'image')
        }),
        ('Detalles', {
            'fields': ('project_date', 'client_name', 'project_cost')
        }),
    )
    
    readonly_fields = ['created_at']


@admin.register(UserResume)
class UserResumeAdmin(admin.ModelAdmin):
    """Administración para hojas de vida de usuarios."""
    
    list_display = [
        'user', 'completion_percentage', 'verification_score', 'is_complete', 
        'created_at', 'user_verification_status'
    ]
    list_filter = ['is_complete', 'created_at', 'user__is_verified']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    
    fieldsets = (
        ('Usuario', {'fields': ('user',)}),
        ('Información Personal', {
            'fields': ('date_of_birth', 'nationality', 'marital_status', 'dependents')
        }),
        ('Información de Contacto', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone', 
                      'emergency_contact_relation', 'emergency_contact_address')
        }),
        ('Información Educativa', {
            'fields': ('education_level', 'institution_name', 'field_of_study', 
                      'graduation_year', 'gpa')
        }),
        ('Información Laboral', {
            'fields': ('current_employer', 'current_position', 'employment_type',
                      'start_date', 'end_date', 'monthly_salary', 'supervisor_name',
                      'supervisor_phone', 'supervisor_email')
        }),
        ('Información Financiera', {
            'fields': ('bank_name', 'account_type', 'account_number', 'credit_score',
                      'monthly_expenses')
        }),
        ('Referencias', {
            'fields': ('reference1_name', 'reference1_phone', 'reference1_email', 'reference1_relation',
                      'reference2_name', 'reference2_phone', 'reference2_email', 'reference2_relation')
        }),
        ('Historial de Vivienda', {
            'fields': ('previous_addresses', 'eviction_history', 'eviction_details', 'rental_history')
        }),
        ('Documentos', {
            'fields': ('id_document', 'id_document_status', 'proof_of_income', 'proof_of_income_status',
                      'bank_statement', 'bank_statement_status', 'employment_letter', 'employment_letter_status',
                      'tax_return', 'tax_return_status', 'credit_report', 'credit_report_status'),
            'classes': ['collapse']
        }),
        ('Información Adicional', {
            'fields': ('criminal_record', 'criminal_record_details', 'criminal_record_document')
        }),
        ('Verificación', {
            'fields': ('is_complete', 'verification_score', 'verification_notes', 'verified_by', 'verified_at')
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'completion_percentage']
    
    def completion_percentage(self, obj):
        """Muestra el porcentaje de completitud."""
        return f"{obj.get_completion_percentage()}%"
    completion_percentage.short_description = 'Completitud'
    
    def user_verification_status(self, obj):
        """Muestra el estado de verificación del usuario."""
        return obj.user.is_verified
    user_verification_status.boolean = True
    user_verification_status.short_description = 'Usuario Verificado'



# Admin para EmailConfirmation de django-allauth
@admin.register(EmailConfirmation)
class EmailConfirmationAdmin(admin.ModelAdmin):
    """Administración para confirmaciones de email."""
    
    list_display = [
        'key', 'email_address', 'created', 'sent', 'is_expired'
    ]
    list_filter = ['created', 'sent']
    search_fields = ['key', 'email_address__email', 'email_address__user__email']
    ordering = ['-created']
    readonly_fields = ['key', 'created', 'sent']
    
    def is_expired(self, obj):
        """Muestra si el token ha expirado."""
        return obj.key_expired()
    is_expired.boolean = True
    is_expired.short_description = 'Expirado'
