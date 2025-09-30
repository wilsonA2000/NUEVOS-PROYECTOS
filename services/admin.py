"""
Configuración del panel de administración para Servicios Adicionales.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.db import models
from django.forms import Textarea
from .models import ServiceCategory, Service, ServiceImage, ServiceRequest


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'order', 'services_count', 'is_featured', 'is_active', 'created_at']
    list_editable = ['order', 'is_featured', 'is_active']
    list_filter = ['is_active', 'is_featured', 'created_at']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('name', 'slug', 'description')
        }),
        ('Apariencia', {
            'fields': ('icon_name', 'color', 'order'),
            'classes': ('collapse',)
        }),
        ('Estado', {
            'fields': ('is_active', 'is_featured')
        }),
    )

    def services_count(self, obj):
        return obj.services.filter(is_active=True).count()
    services_count.short_description = 'Servicios Activos'


class ServiceImageInline(admin.TabularInline):
    model = ServiceImage
    extra = 1
    fields = ['image', 'alt_text', 'is_main', 'order']


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'category', 'pricing_type', 'price_display', 
        'popularity_score', 'views_count', 'requests_count',
        'is_featured', 'is_most_requested', 'is_active'
    ]
    list_editable = [
        'popularity_score', 'is_featured', 'is_most_requested', 'is_active'
    ]
    list_filter = [
        'category', 'pricing_type', 'difficulty', 'is_active', 
        'is_featured', 'is_most_requested', 'created_at'
    ]
    search_fields = ['name', 'short_description', 'full_description']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ServiceImageInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('category', 'name', 'slug', 'short_description', 'full_description')
        }),
        ('Precios', {
            'fields': ('pricing_type', 'base_price', 'price_range_min', 'price_range_max'),
            'classes': ('collapse',)
        }),
        ('Características', {
            'fields': ('difficulty', 'estimated_duration', 'requirements'),
            'classes': ('collapse',)
        }),
        ('Información del Proveedor', {
            'fields': ('provider_info', 'contact_email', 'contact_phone'),
            'classes': ('collapse',)
        }),
        ('Métricas y Estado', {
            'fields': (
                'popularity_score', 'views_count', 'requests_count',
                'is_active', 'is_featured', 'is_most_requested'
            )
        }),
    )
    
    readonly_fields = ['views_count', 'requests_count']
    
    formfield_overrides = {
        models.TextField: {'widget': Textarea(attrs={'rows': 4, 'cols': 80})},
    }

    def price_display(self, obj):
        return obj.get_price_display()
    price_display.short_description = 'Precio'

    actions = ['mark_as_featured', 'mark_as_not_featured', 'mark_as_most_requested']

    def mark_as_featured(self, request, queryset):
        updated = queryset.update(is_featured=True)
        self.message_user(request, f'{updated} servicios marcados como destacados.')
    mark_as_featured.short_description = 'Marcar como destacado'

    def mark_as_not_featured(self, request, queryset):
        updated = queryset.update(is_featured=False)
        self.message_user(request, f'{updated} servicios desmarcados como destacados.')
    mark_as_not_featured.short_description = 'Desmarcar como destacado'

    def mark_as_most_requested(self, request, queryset):
        updated = queryset.update(is_most_requested=True)
        self.message_user(request, f'{updated} servicios marcados como más solicitados.')
    mark_as_most_requested.short_description = 'Marcar como más solicitado'


@admin.register(ServiceImage)
class ServiceImageAdmin(admin.ModelAdmin):
    list_display = ['service', 'alt_text', 'is_main', 'order']
    list_filter = ['is_main', 'service__category']
    search_fields = ['service__name', 'alt_text']


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = [
        'service', 'requester_name', 'requester_email', 
        'status', 'preferred_date', 'created_at'
    ]
    list_filter = ['status', 'service__category', 'created_at', 'preferred_date']
    search_fields = [
        'requester_name', 'requester_email', 'service__name', 'message'
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Información del Servicio', {
            'fields': ('service', 'status')
        }),
        ('Datos del Solicitante', {
            'fields': ('requester_name', 'requester_email', 'requester_phone')
        }),
        ('Detalles de la Solicitud', {
            'fields': ('message', 'preferred_date', 'budget_range')
        }),
        ('Administración', {
            'fields': ('admin_notes', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    actions = ['mark_as_contacted', 'mark_as_in_progress', 'mark_as_completed']

    def mark_as_contacted(self, request, queryset):
        updated = queryset.update(status='contacted')
        self.message_user(request, f'{updated} solicitudes marcadas como contactadas.')
    mark_as_contacted.short_description = 'Marcar como contactado'

    def mark_as_in_progress(self, request, queryset):
        updated = queryset.update(status='in_progress')
        self.message_user(request, f'{updated} solicitudes marcadas como en progreso.')
    mark_as_in_progress.short_description = 'Marcar como en progreso'

    def mark_as_completed(self, request, queryset):
        updated = queryset.update(status='completed')
        self.message_user(request, f'{updated} solicitudes marcadas como completadas.')
    mark_as_completed.short_description = 'Marcar como completado'