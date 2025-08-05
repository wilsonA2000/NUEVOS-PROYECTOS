"""
Configuración del panel de administración para el sistema de contratos.
Incluye todas las configuraciones avanzadas para gestión administrativa.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from django.db.models import Count, Q
from django.http import HttpResponse
import csv

from .models import (
    Contract, ContractTemplate, ContractSignature,
    ContractAmendment, ContractTermination, ContractRenewal,
    ContractDocument
)


@admin.register(ContractTemplate)
class ContractTemplateAdmin(admin.ModelAdmin):
    """Administración de plantillas de contratos."""
    
    list_display = [
        'name', 'template_type', 'is_default', 'is_active', 
        'created_at', 'usage_count'
    ]
    list_filter = ['template_type', 'is_default', 'is_active', 'created_at']
    search_fields = ['name', 'template_type', 'content']
    readonly_fields = ['created_at', 'updated_at', 'usage_count']
    ordering = ['template_type', 'name']
    
    fieldsets = (
        ('Información General', {
            'fields': ('name', 'template_type', 'is_default', 'is_active')
        }),
        ('Contenido', {
            'fields': ('content', 'variables'),
            'classes': ('wide',)
        }),
        ('Metadatos', {
            'fields': ('created_by', 'created_at', 'updated_at', 'usage_count'),
            'classes': ('collapse',)
        })
    )
    
    def usage_count(self, obj):
        """Cuenta cuántos contratos usan esta plantilla."""
        count = obj.contracts.count()
        if count > 0:
            url = reverse('admin:contracts_contract_changelist') + f'?template__id__exact={obj.id}'
            return format_html('<a href="{}">{} contratos</a>', url, count)
        return '0 contratos'
    usage_count.short_description = 'Uso'
    
    def save_model(self, request, obj, form, change):
        if not change:  # Solo al crear
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


class ContractSignatureInline(admin.TabularInline):
    """Inline para firmas de contratos."""
    model = ContractSignature
    extra = 0
    readonly_fields = [
        'signed_at', 'verification_hash', 'is_valid', 
        'ip_address', 'user_agent'
    ]
    fields = [
        'signer', 'signature_type', 'authentication_method',
        'verification_level', 'signed_at', 'is_valid'
    ]
    
    def has_add_permission(self, request, obj=None):
        return False  # No permitir agregar firmas desde el admin


class ContractAmendmentInline(admin.TabularInline):
    """Inline para enmiendas de contratos."""
    model = ContractAmendment
    extra = 0
    readonly_fields = ['created_at', 'approved_at']
    fields = [
        'title', 'status', 'requested_by', 'approved_by', 'created_at'
    ]


class ContractDocumentInline(admin.TabularInline):
    """Inline para documentos de contratos."""
    model = ContractDocument
    extra = 0
    readonly_fields = ['uploaded_at', 'file_size']
    fields = [
        'title', 'document_type', 'file', 'uploaded_by', 'uploaded_at'
    ]


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    """Administración principal de contratos."""
    
    list_display = [
        'contract_number', 'title', 'contract_type', 'status',
        'primary_party_email', 'secondary_party_email',
        'start_date', 'end_date', 'monthly_rent', 'signature_status',
        'created_at'
    ]
    list_filter = [
        'contract_type', 'status', 'is_renewable',
        'created_at', 'start_date', 'end_date'
    ]
    search_fields = [
        'contract_number', 'title', 'primary_party__email',
        'secondary_party__email', 'property__title'
    ]
    readonly_fields = [
        'contract_number', 'created_at', 'updated_at',
        'signature_status', 'is_expired', 'days_until_expiry',
        'pdf_generated_at'
    ]
    raw_id_fields = ['primary_party', 'secondary_party', 'property', 'template']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    inlines = [ContractSignatureInline, ContractAmendmentInline, ContractDocumentInline]
    
    fieldsets = (
        ('Información General', {
            'fields': (
                'contract_number', 'contract_type', 'template', 'title', 'description'
            )
        }),
        ('Partes del Contrato', {
            'fields': ('primary_party', 'secondary_party', 'property')
        }),
        ('Fechas y Vigencia', {
            'fields': (
                'start_date', 'end_date', 'is_renewable', 'auto_renewal_notice_days'
            )
        }),
        ('Información Financiera', {
            'fields': ('monthly_rent', 'security_deposit', 'late_fee'),
            'classes': ('collapse',)
        }),
        ('Estado y Seguimiento', {
            'fields': (
                'status', 'signature_status', 'is_expired', 'days_until_expiry'
            )
        }),
        ('Contenido', {
            'fields': ('content', 'variables_data'),
            'classes': ('collapse',)
        }),
        ('Archivo PDF', {
            'fields': ('pdf_file', 'pdf_generated_at', 'is_downloadable'),
            'classes': ('collapse',)
        }),
        ('Metadatos', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    actions = ['export_to_csv', 'mark_as_active']
    
    def primary_party_email(self, obj):
        """Muestra el email de la parte primaria."""
        return obj.primary_party.email
    primary_party_email.short_description = 'Arrendador'
    
    def secondary_party_email(self, obj):
        """Muestra el email de la parte secundaria."""
        return obj.secondary_party.email
    secondary_party_email.short_description = 'Arrendatario'
    
    def signature_status(self, obj):
        """Muestra el estado de las firmas."""
        status = obj.get_signature_status()
        signed = status['signed_count']
        total = status['total_count']
        percentage = status['percentage']
        
        if percentage == 100:
            color = 'green'
            icon = '✓'
        elif percentage > 0:
            color = 'orange'
            icon = '◐'
        else:
            color = 'red'
            icon = '○'
        
        return format_html(
            '<span style="color: {}">{} {}/{} ({}%)</span>',
            color, icon, signed, total, int(percentage)
        )
    signature_status.short_description = 'Firmas'
    
    def is_expired(self, obj):
        """Indica si el contrato ha expirado."""
        if obj.is_expired():
            return format_html('<span style="color: red;">Sí</span>')
        return format_html('<span style="color: green;">No</span>')
    is_expired.short_description = 'Expirado'
    is_expired.boolean = True
    
    def days_until_expiry(self, obj):
        """Muestra los días hasta el vencimiento."""
        days = obj.days_until_expiry()
        if days <= 0:
            return format_html('<span style="color: red;">Expirado</span>')
        elif days <= 30:
            return format_html('<span style="color: orange;">{} días</span>', days)
        else:
            return f'{days} días'
    days_until_expiry.short_description = 'Días para vencer'
    
    def export_to_csv(self, request, queryset):
        """Exporta contratos seleccionados a CSV."""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="contratos.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Número', 'Tipo', 'Estado', 'Arrendador', 'Arrendatario',
            'Inicio', 'Fin', 'Renta', 'Creado'
        ])
        
        for contract in queryset:
            writer.writerow([
                contract.contract_number,
                contract.get_contract_type_display(),
                contract.get_status_display(),
                contract.primary_party.email,
                contract.secondary_party.email,
                contract.start_date,
                contract.end_date,
                contract.monthly_rent or '',
                contract.created_at.strftime('%Y-%m-%d')
            ])
        
        return response
    export_to_csv.short_description = 'Exportar a CSV'
    
    def mark_as_active(self, request, queryset):
        """Marca contratos como activos."""
        updated = queryset.filter(
            status='fully_signed'
        ).update(status='active')
        
        self.message_user(
            request,
            f'{updated} contratos marcados como activos.'
        )
    mark_as_active.short_description = 'Marcar como activos'


@admin.register(ContractSignature)
class ContractSignatureAdmin(admin.ModelAdmin):
    """Administración de firmas de contratos."""
    
    list_display = [
        'contract_number', 'signer_email', 'signature_type',
        'authentication_method', 'verification_level',
        'signed_at', 'is_valid', 'verification_status'
    ]
    list_filter = [
        'signature_type', 'authentication_method', 'verification_level',
        'is_valid', 'signed_at'
    ]
    search_fields = [
        'contract__contract_number', 'signer__email',
        'ip_address', 'verification_hash'
    ]
    readonly_fields = [
        'signed_at', 'verification_hash', 'ip_address', 'user_agent',
        'timestamp_token', 'blockchain_hash'
    ]
    date_hierarchy = 'signed_at'
    ordering = ['-signed_at']
    
    def contract_number(self, obj):
        """Muestra el número del contrato."""
        return obj.contract.contract_number
    contract_number.short_description = 'Contrato'
    
    def signer_email(self, obj):
        """Muestra el email del firmante."""
        return obj.signer.email
    signer_email.short_description = 'Firmante'
    
    def verification_status(self, obj):
        """Muestra el estado de verificación."""
        if obj.is_valid and obj.verify_signature():
            return format_html('<span style="color: green;">✓ Válida</span>')
        else:
            return format_html('<span style="color: red;">✗ Inválida</span>')
    verification_status.short_description = 'Verificación'


@admin.register(ContractAmendment)
class ContractAmendmentAdmin(admin.ModelAdmin):
    """Administración de enmiendas de contratos."""
    
    list_display = [
        'amendment_number', 'contract_number', 'title', 'status',
        'requested_by_email', 'approved_by_email', 'created_at'
    ]
    list_filter = ['status', 'created_at', 'approved_at']
    search_fields = [
        'amendment_number', 'contract__contract_number',
        'title', 'description'
    ]
    readonly_fields = ['created_at', 'approved_at']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    def contract_number(self, obj):
        return obj.contract.contract_number
    contract_number.short_description = 'Contrato'
    
    def requested_by_email(self, obj):
        return obj.requested_by.email
    requested_by_email.short_description = 'Solicitado por'
    
    def approved_by_email(self, obj):
        return obj.approved_by.email if obj.approved_by else '-'
    approved_by_email.short_description = 'Aprobado por'


@admin.register(ContractDocument)
class ContractDocumentAdmin(admin.ModelAdmin):
    """Administración de documentos de contratos."""
    
    list_display = [
        'title', 'contract_number', 'document_type',
        'uploaded_by_email', 'file_size_mb', 'uploaded_at'
    ]
    list_filter = ['document_type', 'uploaded_at', 'mime_type']
    search_fields = [
        'title', 'contract__contract_number',
        'uploaded_by__email', 'description'
    ]
    readonly_fields = ['uploaded_at', 'file_size', 'mime_type']
    date_hierarchy = 'uploaded_at'
    
    def contract_number(self, obj):
        return obj.contract.contract_number
    contract_number.short_description = 'Contrato'
    
    def uploaded_by_email(self, obj):
        return obj.uploaded_by.email
    uploaded_by_email.short_description = 'Subido por'
    
    def file_size_mb(self, obj):
        if obj.file_size:
            return f'{obj.file_size / (1024 * 1024):.2f} MB'
        return '-'
    file_size_mb.short_description = 'Tamaño'
