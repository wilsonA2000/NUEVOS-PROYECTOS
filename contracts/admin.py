"""
Configuración del panel de administración para el sistema de contratos.
Incluye todas las configuraciones avanzadas para gestión administrativa.

Sistema Control Molecular: Permite edición de cláusulas con historial completo.
"""

from django.contrib import admin
from django.utils.html import format_html, mark_safe
from django.urls import reverse
from django.utils import timezone
from django.db.models import Count, Q
from django.http import HttpResponse
import csv

# CKEditor para editor rico
try:
    from ckeditor.widgets import CKEditorWidget
    CKEDITOR_AVAILABLE = True
except ImportError:
    CKEDITOR_AVAILABLE = False

# simple_history para historial de cambios
try:
    from simple_history.admin import SimpleHistoryAdmin
    SIMPLE_HISTORY_AVAILABLE = True
except ImportError:
    SIMPLE_HISTORY_AVAILABLE = False
    SimpleHistoryAdmin = admin.ModelAdmin  # Fallback

from .models import (
    Contract, ContractTemplate, ContractSignature,
    ContractAmendment, ContractTermination, ContractRenewal,
    ContractDocument
)
from .clause_models import (
    EditableContractClause, ClauseVersion,
    ContractTypeTemplate, TemplateClauseAssignment
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
    filter_horizontal = ['tenant_documents']  # Interfaz mejorada para documentos
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
        ('📄 Documentos del Inquilino', {
            'fields': ('tenant_documents',),
            'description': 'Documentos subidos durante el proceso de solicitud y asociados a este contrato'
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


# ============================================================================
# SISTEMA DE CONTROL MOLECULAR DE CONTRATOS
# Administración de cláusulas editables desde panel admin
# ============================================================================

class ClauseVersionInline(admin.TabularInline):
    """Inline para mostrar historial de versiones de una cláusula."""
    model = ClauseVersion
    extra = 0
    readonly_fields = [
        'version_number', 'title_snapshot', 'content_snapshot',
        'change_reason', 'changed_by', 'changed_at'
    ]
    fields = ['version_number', 'title_snapshot', 'change_reason', 'changed_by', 'changed_at']
    ordering = ['-version_number']

    def has_add_permission(self, request, obj=None):
        return False  # No permitir agregar versiones manualmente

    def has_delete_permission(self, request, obj=None):
        return False  # No permitir eliminar historial


class TemplateClauseAssignmentInline(admin.TabularInline):
    """Inline para asignar cláusulas a plantillas con orden."""
    model = TemplateClauseAssignment
    extra = 1
    raw_id_fields = ['clause']
    fields = ['clause', 'order', 'is_required']
    ordering = ['order']


# Usar SimpleHistoryAdmin si está disponible para historial completo
_ClauseAdminBase = SimpleHistoryAdmin if SIMPLE_HISTORY_AVAILABLE else admin.ModelAdmin


@admin.register(EditableContractClause)
class EditableContractClauseAdmin(_ClauseAdminBase):
    """
    Administración de Cláusulas Editables - Control Molecular.

    Permite a Wilson (Abogado) editar cualquier cláusula del contrato
    sin necesidad de modificar código Python.

    Características:
    - Editor rico con CKEditor para formateo avanzado
    - Historial completo de cambios con simple_history
    - Variables dinámicas con ayuda interactiva
    """

    list_display = [
        'clause_number', 'ordinal_text', 'title', 'category_badge',
        'has_paragraph', 'legal_reference', 'version', 'is_active',
        'contract_types_display', 'updated_at'
    ]
    list_filter = ['category', 'is_active', 'has_paragraph', 'contract_types']
    search_fields = ['title', 'content', 'ordinal_text', 'legal_reference']
    readonly_fields = [
        'id', 'version', 'created_at', 'updated_at',
        'created_by', 'variable_helper'
    ]
    ordering = ['clause_number']
    list_editable = ['is_active']
    list_per_page = 40
    history_list_display = ['content', 'title', 'category']  # Para simple_history

    inlines = [ClauseVersionInline]

    fieldsets = (
        ('Identificación', {
            'fields': ('clause_number', 'ordinal_text', 'title')
        }),
        ('Contenido de la Cláusula', {
            'fields': ('content', 'variable_helper'),
            'description': 'Use {variable} para insertar datos dinámicos. '
                          'Ej: {property_address}, {monthly_rent}'
        }),
        ('PARÁGRAFO (Opcional)', {
            'fields': ('has_paragraph', 'paragraph_text'),
            'classes': ('collapse',),
            'description': 'Marque la casilla para agregar un parágrafo a esta cláusula. '
                          'El texto del parágrafo aparecerá después del contenido principal. '
                          'Puede usar las mismas {variables} que en el contenido.'
        }),
        ('Clasificación', {
            'fields': ('category', 'contract_types', 'legal_reference'),
            'description': 'Defina a qué tipos de contrato aplica esta cláusula'
        }),
        ('Variables Permitidas', {
            'fields': ('allowed_variables',),
            'classes': ('collapse',),
            'description': 'Lista de variables que se pueden usar en esta cláusula'
        }),
        ('Control de Versiones', {
            'fields': ('version', 'is_active'),
            'description': 'La versión se incrementa automáticamente al editar'
        }),
        ('Auditoría', {
            'fields': ('id', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def get_form(self, request, obj=None, **kwargs):
        """Usar CKEditor para el campo content si está disponible."""
        form = super().get_form(request, obj, **kwargs)
        if CKEDITOR_AVAILABLE and 'content' in form.base_fields:
            form.base_fields['content'].widget = CKEditorWidget(config_name='clause_editor')
        return form

    def category_badge(self, obj):
        """Muestra la categoría con color."""
        colors = {
            'mandatory': '#dc3545',    # Rojo - Obligatoria
            'standard': '#007bff',     # Azul - Estándar
            'optional': '#6c757d',     # Gris - Opcional
            'guarantee': '#28a745',    # Verde - Garantía
        }
        color = colors.get(obj.category, '#000')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color, obj.get_category_display()
        )
    category_badge.short_description = 'Categoría'

    def contract_types_display(self, obj):
        """Muestra los tipos de contrato como badges."""
        if not obj.contract_types:
            return '-'

        type_names = {
            'rental_urban': 'Urbana',
            'rental_commercial': 'Comercial',
            'rental_room': 'Habitación',
            'rental_rural': 'Rural',
        }
        badges = []
        for ct in obj.contract_types:
            name = type_names.get(ct, ct)
            badges.append(f'<span style="background: #e9ecef; padding: 2px 6px; '
                         f'border-radius: 3px; margin-right: 3px; font-size: 10px;">'
                         f'{name}</span>')
        return format_html(''.join(badges))
    contract_types_display.short_description = 'Tipos de Contrato'

    def variable_helper(self, obj):
        """Muestra lista de variables disponibles para copiar."""
        from django.utils.html import escape
        variables = EditableContractClause.get_available_variables()
        html_parts = ['<div style="background: #f8f9fa; padding: 10px; '
                     'border-radius: 5px; max-height: 300px; overflow-y: auto;">']
        html_parts.append('<strong>Variables Disponibles (click para copiar):</strong><br><br>')

        for var in variables:
            # Escapar el texto de la variable para HTML display
            var_text = escape(var["var"])
            var_desc = escape(var["desc"])
            # Escapar comillas para JavaScript
            var_copy = var["var"].replace("\\", "\\\\").replace("'", "\\'")
            html_parts.append(
                '<code style="background: #e9ecef; padding: 2px 5px; '
                'cursor: pointer; margin: 2px;" '
                "onclick=\"navigator.clipboard.writeText('" + var_copy + "'); "
                "this.style.background='#28a745'; this.style.color='white'; "
                "setTimeout(function() { this.style.background='#e9ecef'; "
                "this.style.color='inherit'; }.bind(this), 500);\">"
                + var_text + '</code> - ' + var_desc + '<br>'
            )
        html_parts.append('</div>')
        # Usar mark_safe ya que hemos escapado manualmente los valores dinámicos
        return mark_safe(''.join(html_parts))
    variable_helper.short_description = 'Variables Disponibles'

    def save_model(self, request, obj, form, change):
        """Guardar el usuario que modifica para auditoría."""
        obj._changed_by = request.user
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    class Media:
        css = {
            'all': ['admin/css/clause_admin.css']
        }


@admin.register(ClauseVersion)
class ClauseVersionAdmin(admin.ModelAdmin):
    """Administración del historial de versiones de cláusulas."""

    list_display = [
        'clause_title', 'version_number', 'change_reason',
        'changed_by_email', 'changed_at'
    ]
    list_filter = ['changed_at', 'changed_by']
    search_fields = ['clause__title', 'content_snapshot', 'change_reason']
    readonly_fields = [
        'id', 'clause', 'version_number', 'content_snapshot',
        'title_snapshot', 'change_reason', 'changed_by', 'changed_at'
    ]
    ordering = ['-changed_at']
    date_hierarchy = 'changed_at'

    def clause_title(self, obj):
        return f"Cláusula {obj.clause.clause_number}: {obj.clause.title}"
    clause_title.short_description = 'Cláusula'

    def changed_by_email(self, obj):
        return obj.changed_by.email if obj.changed_by else '-'
    changed_by_email.short_description = 'Modificado por'

    def has_add_permission(self, request):
        return False  # No permitir crear versiones manualmente

    def has_delete_permission(self, request, obj=None):
        return False  # No permitir eliminar historial


@admin.register(ContractTypeTemplate)
class ContractTypeTemplateAdmin(admin.ModelAdmin):
    """Administración de plantillas por tipo de contrato."""

    list_display = [
        'contract_type', 'name', 'clauses_count', 'is_active',
        'last_reviewed', 'reviewed_by_email', 'updated_at'
    ]
    list_filter = ['contract_type', 'is_active', 'last_reviewed']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at', 'last_reviewed', 'reviewed_by']
    ordering = ['contract_type']

    inlines = [TemplateClauseAssignmentInline]

    fieldsets = (
        ('Información General', {
            'fields': ('contract_type', 'name', 'description', 'is_active')
        }),
        ('Revisión Administrativa', {
            'fields': ('last_reviewed', 'reviewed_by'),
            'description': 'Registra cuándo fue revisada por última vez por el administrador legal'
        }),
        ('Metadatos', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    actions = ['mark_as_reviewed']

    def clauses_count(self, obj):
        """Cuenta las cláusulas asignadas a esta plantilla."""
        count = obj.clauses.count()
        url = reverse('admin:contracts_editablecontractclause_changelist')
        return format_html('<a href="{}">{} cláusulas</a>', url, count)
    clauses_count.short_description = 'Cláusulas'

    def reviewed_by_email(self, obj):
        return obj.reviewed_by.email if obj.reviewed_by else '-'
    reviewed_by_email.short_description = 'Revisado por'

    def mark_as_reviewed(self, request, queryset):
        """Marca las plantillas seleccionadas como revisadas."""
        for template in queryset:
            template.mark_as_reviewed(request.user)
        self.message_user(
            request,
            f'{queryset.count()} plantillas marcadas como revisadas.'
        )
    mark_as_reviewed.short_description = 'Marcar como revisadas'


@admin.register(TemplateClauseAssignment)
class TemplateClauseAssignmentAdmin(admin.ModelAdmin):
    """Administración de asignaciones de cláusulas a plantillas."""

    list_display = ['template_type', 'order', 'clause_title', 'is_required']
    list_filter = ['template__contract_type', 'is_required']
    search_fields = ['clause__title', 'template__name']
    raw_id_fields = ['template', 'clause']
    ordering = ['template__contract_type', 'order']

    def template_type(self, obj):
        return obj.template.get_contract_type_display()
    template_type.short_description = 'Plantilla'

    def clause_title(self, obj):
        return f"#{obj.clause.clause_number}: {obj.clause.title}"
    clause_title.short_description = 'Cláusula'
