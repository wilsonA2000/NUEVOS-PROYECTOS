"""
Configuración del admin para el sistema de solicitudes.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    BaseRequest, PropertyInterestRequest, ServiceRequest, 
    ContractSignatureRequest, MaintenanceRequest, 
    RequestAttachment, RequestComment, RequestNotification,
    TenantDocument
)


@admin.register(BaseRequest)
class BaseRequestAdmin(admin.ModelAdmin):
    list_display = ['title', 'request_type', 'requester', 'assignee', 'status', 'priority', 'created_at', 'is_overdue_display']
    list_filter = ['request_type', 'status', 'priority', 'created_at']
    search_fields = ['title', 'description', 'requester__email', 'assignee__email']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('id', 'request_type', 'title', 'description')
        }),
        ('Usuarios', {
            'fields': ('requester', 'assignee')
        }),
        ('Estado', {
            'fields': ('status', 'priority', 'due_date', 'completed_at')
        }),
        ('Respuesta', {
            'fields': ('response_message', 'response_date')
        }),
        ('Fechas', {
            'fields': ('created_at', 'updated_at')
        }),
        ('Metadatos', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
    )
    
    def is_overdue_display(self, obj):
        if obj.is_overdue():
            return format_html('<span style="color: red;">Vencida</span>')
        return 'No'
    is_overdue_display.short_description = 'Vencida'


@admin.register(PropertyInterestRequest)
class PropertyInterestRequestAdmin(admin.ModelAdmin):
    list_display = ['title', 'property', 'requester', 'status', 'monthly_income', 'preferred_move_in_date']
    list_filter = ['status', 'has_pets', 'has_rental_references', 'employment_type']
    search_fields = ['title', 'property__title', 'requester__email']


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = ['title', 'service_category', 'property', 'requester', 'status', 'estimated_cost']
    list_filter = ['service_category', 'status', 'urgency_level']
    search_fields = ['title', 'service_category', 'property__title']


@admin.register(ContractSignatureRequest)
class ContractSignatureRequestAdmin(admin.ModelAdmin):
    list_display = ['title', 'contract', 'rental_amount', 'landlord_signed', 'tenant_signed', 'status']
    list_filter = ['landlord_signed', 'tenant_signed', 'status']
    search_fields = ['title', 'contract__title']


@admin.register(MaintenanceRequest)
class MaintenanceRequestAdmin(admin.ModelAdmin):
    list_display = ['title', 'maintenance_type', 'property', 'affected_area', 'status', 'priority']
    list_filter = ['maintenance_type', 'status', 'priority', 'requires_tenant_presence']
    search_fields = ['title', 'affected_area', 'property__title']


@admin.register(RequestAttachment)
class RequestAttachmentAdmin(admin.ModelAdmin):
    list_display = ['filename', 'request', 'file_type', 'file_size', 'uploaded_at', 'uploaded_by']
    list_filter = ['file_type', 'uploaded_at']
    search_fields = ['filename', 'request__title']


@admin.register(RequestComment)
class RequestCommentAdmin(admin.ModelAdmin):
    list_display = ['request', 'author', 'content_preview', 'is_internal', 'created_at']
    list_filter = ['is_internal', 'created_at']
    search_fields = ['content', 'request__title', 'author__email']
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Contenido'


@admin.register(RequestNotification)
class RequestNotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'notification_type', 'recipient', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['title', 'message', 'recipient__email']


@admin.register(TenantDocument)
class TenantDocumentAdmin(admin.ModelAdmin):
    list_display = [
        'document_type_display', 'property_request_display', 'uploaded_by_display', 
        'status_display', 'file_size_display', 'uploaded_at', 'reviewed_at'
    ]
    list_filter = [
        'status', 'document_type', 'uploaded_at', 'reviewed_at'
    ]
    search_fields = [
        'document_type', 'original_filename', 'other_description',
        'uploaded_by__email', 'uploaded_by__first_name', 'uploaded_by__last_name',
        'property_request__property__title'
    ]
    readonly_fields = [
        'id', 'uploaded_at', 'updated_at', 'file_size', 'original_filename'
    ]
    date_hierarchy = 'uploaded_at'
    
    fieldsets = (
        ('Información del Documento', {
            'fields': ('id', 'document_type', 'document_file', 'original_filename', 'file_size', 'other_description')
        }),
        ('Proceso y Usuario', {
            'fields': ('property_request', 'uploaded_by')
        }),
        ('Revisión', {
            'fields': ('status', 'reviewed_by', 'review_notes', 'reviewed_at')
        }),
        ('Fechas', {
            'fields': ('uploaded_at', 'updated_at')
        }),
    )
    
    def document_type_display(self, obj):
        return obj.get_document_type_display()
    document_type_display.short_description = 'Tipo de Documento'
    
    def property_request_display(self, obj):
        return f"{obj.property_request.property.title} - {obj.property_request.requester.get_full_name()}"
    property_request_display.short_description = 'Proceso/Propiedad'
    
    def uploaded_by_display(self, obj):
        return obj.uploaded_by.get_full_name()
    uploaded_by_display.short_description = 'Subido por'
    
    def status_display(self, obj):
        colors = {
            'pending': 'orange',
            'approved': 'green',
            'rejected': 'red',
            'requires_correction': 'blue'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_display.short_description = 'Estado'
    
    def file_size_display(self, obj):
        if obj.file_size:
            if obj.file_size < 1024 * 1024:  # < 1MB
                return f"{obj.file_size / 1024:.1f} KB"
            else:  # >= 1MB
                return f"{obj.file_size / (1024 * 1024):.1f} MB"
        return "N/A"
    file_size_display.short_description = 'Tamaño'