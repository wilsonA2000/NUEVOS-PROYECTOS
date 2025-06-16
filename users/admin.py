"""
Configuración del panel de administración para la aplicación de usuarios.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import (
    User, LandlordProfile, TenantProfile, ServiceProviderProfile, PortfolioItem
)


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
    fields = ['title', 'description', 'project_date', 'project_cost', 'image']


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
        'user', 'employment_status', 'monthly_income', 'credit_score', 
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
            'fields': ('monthly_income', 'employment_status', 'employer_name', 'employer_phone', 'credit_score')
        }),
        ('Referencias', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation')
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
        'user', 'service_category', 'business_name', 'years_experience', 
        'hourly_rate', 'created_at', 'user_verification_status'
    ]
    list_filter = ['service_category', 'years_experience', 'created_at', 'user__is_verified']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'business_name']
    
    fieldsets = (
        ('Usuario', {'fields': ('user',)}),
        ('Información Básica', {
            'fields': ('bio', 'profile_image', 'presentation_video')
        }),
        ('Información de Contacto', {
            'fields': ('address', 'city', 'state', 'country', 'postal_code', 'latitude', 'longitude')
        }),
        ('Información del Servicio', {
            'fields': ('service_category', 'specialties', 'service_description', 'service_areas')
        }),
        ('Información Profesional', {
            'fields': ('business_name', 'years_experience', 'hourly_rate', 'minimum_charge')
        }),
        ('Disponibilidad', {
            'fields': ('available_weekdays', 'available_hours_start', 'available_hours_end')
        }),
        ('Documentos', {
            'fields': ('identification_document', 'proof_of_address', 'professional_license', 'insurance_certificate', 'certifications'),
            'classes': ['collapse']
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    inlines = [PortfolioItemInline]
    
    def user_verification_status(self, obj):
        """Muestra el estado de verificación del usuario."""
        return obj.user.is_verified
    user_verification_status.boolean = True
    user_verification_status.short_description = 'Usuario Verificado'


@admin.register(PortfolioItem)
class PortfolioItemAdmin(admin.ModelAdmin):
    """Administración para elementos del portafolio."""
    
    list_display = ['title', 'service_provider', 'project_date', 'project_cost', 'created_at']
    list_filter = ['project_date', 'created_at']
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
