"""
Configuración del panel de administración para el módulo de Matching.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import MatchRequest, MatchCriteria, MatchNotification, MatchAnalytics


@admin.register(MatchRequest)
class MatchRequestAdmin(admin.ModelAdmin):
    list_display = [
        'match_code', 'tenant_display', 'property_display', 'status', 
        'priority', 'created_at', 'expires_at'
    ]
    list_filter = [
        'status', 'priority', 'created_at', 'expires_at',
        'has_rental_references', 'has_employment_proof', 'has_pets'
    ]
    search_fields = [
        'match_code', 'tenant__email', 'tenant__first_name', 'tenant__last_name',
        'property__title', 'tenant_message'
    ]
    readonly_fields = [
        'id', 'match_code', 'created_at', 'viewed_at', 'responded_at'
    ]
    ordering = ['-created_at']
    
    fieldsets = (
        ('Información General', {
            'fields': (
                'id', 'match_code', 'property', 'tenant', 'landlord',
                'status', 'priority'
            )
        }),
        ('Información del Arrendatario', {
            'fields': (
                'tenant_message', 'tenant_phone', 'tenant_email',
                'monthly_income', 'employment_type', 'number_of_occupants'
            )
        }),
        ('Preferencias de Alquiler', {
            'fields': (
                'preferred_move_in_date', 'lease_duration_months',
                'has_pets', 'pet_details', 'smoking_allowed'
            )
        }),
        ('Documentación', {
            'fields': (
                'has_rental_references', 'has_employment_proof', 'has_credit_check'
            )
        }),
        ('Respuesta del Arrendador', {
            'fields': ('landlord_response', 'landlord_notes')
        }),
        ('Fechas', {
            'fields': ('created_at', 'viewed_at', 'responded_at', 'expires_at')
        })
    )

    def tenant_display(self, obj):
        return f"{obj.tenant.get_full_name()} ({obj.tenant.email})"
    tenant_display.short_description = 'Arrendatario'

    def property_display(self, obj):
        return format_html(
            '<a href="{}">{}</a>',
            reverse('admin:properties_property_change', args=[obj.property.pk]),
            obj.property.title
        )
    property_display.short_description = 'Propiedad'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'tenant', 'landlord', 'property'
        )


@admin.register(MatchCriteria)
class MatchCriteriaAdmin(admin.ModelAdmin):
    list_display = [
        'tenant_display', 'max_price', 'min_bedrooms',
        'pets_required', 'smoking_required', 'created_at'
    ]
    list_filter = [
        'pets_required', 'smoking_required', 'created_at'
    ]
    search_fields = [
        'tenant__email', 'tenant__first_name', 'tenant__last_name'
    ]
    readonly_fields = ['id', 'created_at', 'updated_at']

    fieldsets = (
        ('Usuario', {
            'fields': ('id', 'tenant')
        }),
        ('Criterios de Precio', {
            'fields': ('min_price', 'max_price')
        }),
        ('Criterios de Propiedad', {
            'fields': (
                'property_types', 'min_bedrooms', 'min_bathrooms', 'min_area'
            )
        }),
        ('Preferencias de Ubicación', {
            'fields': ('preferred_cities', 'max_distance_km')
        }),
        ('Preferencias Especiales', {
            'fields': (
                'pets_required', 'smoking_required', 'furnished_required',
                'parking_required'
            )
        }),
        ('Configuración', {
            'fields': ('auto_apply_enabled', 'notification_frequency')
        }),
        ('Fechas', {
            'fields': ('created_at', 'updated_at', 'last_search')
        })
    )

    def tenant_display(self, obj):
        return f"{obj.tenant.get_full_name()} ({obj.tenant.email})"
    tenant_display.short_description = 'Arrendatario'


@admin.register(MatchNotification)
class MatchNotificationAdmin(admin.ModelAdmin):
    list_display = [
        'user_display', 'notification_type', 'title',
        'is_read', 'created_at', 'match_request_display'
    ]
    list_filter = [
        'notification_type', 'is_read', 'created_at'
    ]
    search_fields = [
        'user__email', 'user__first_name', 'user__last_name',
        'title', 'message'
    ]
    readonly_fields = ['id', 'created_at']
    ordering = ['-created_at']

    fieldsets = (
        ('Información General', {
            'fields': ('id', 'user', 'match_request', 'notification_type')
        }),    
        ('Contenido', {
            'fields': ('title', 'message', 'metadata')
        }),
        ('Estado', {
            'fields': ('is_read', 'is_sent', 'read_at', 'sent_at', 'created_at')
        })
    )

    def user_display(self, obj):
        return f"{obj.user.get_full_name()} ({obj.user.email})"
    user_display.short_description = 'Usuario'

    def match_request_display(self, obj):
        if obj.match_request:
            return format_html(
                '<a href="{}">{}</a>',
                reverse('admin:matching_matchrequest_change', args=[obj.match_request.pk]),
                obj.match_request.match_code
            )
        return '-'
    match_request_display.short_description = 'Solicitud Match'

    actions = ['mark_as_read', 'mark_as_unread']

    def mark_as_read(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(is_read=True, read_at=timezone.now())
        self.message_user(request, f'{updated} notificaciones marcadas como leídas.')
    mark_as_read.short_description = 'Marcar como leídas'

    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False, read_at=None)
        self.message_user(request, f'{updated} notificaciones marcadas como no leídas.')
    mark_as_unread.short_description = 'Marcar como no leídas'


@admin.register(MatchAnalytics)
class MatchAnalyticsAdmin(admin.ModelAdmin):
    list_display = [
        'date', 'total_requests_created', 'total_requests_accepted', 'total_requests_rejected',
        'acceptance_rate', 'avg_match_score'
    ]
    list_filter = ['date']
    readonly_fields = [
        'id', 'date', 'total_requests_created', 'total_requests_viewed', 'total_requests_accepted',
        'total_requests_rejected', 'view_rate', 'acceptance_rate', 'response_rate',
        'avg_response_time_hours', 'avg_match_score', 'created_at', 'updated_at'
    ]
    ordering = ['-date']

    fieldsets = (
        ('Fecha', {
            'fields': ('id', 'date')
        }),
        ('Estadísticas de Solicitudes', {
            'fields': (
                'total_requests_created', 'total_requests_viewed', 'total_requests_accepted',
                'total_requests_rejected'
            )
        }),
        ('Métricas de Rendimiento', {
            'fields': ('view_rate', 'acceptance_rate', 'response_rate')
        }),
        ('Métricas de Tiempo', {
            'fields': ('avg_response_time_hours', 'avg_match_score')
        }),
        ('Fechas', {
            'fields': ('created_at', 'updated_at')
        })
    )

    def has_add_permission(self, request):
        # Las analíticas se generan automáticamente
        return False

    def has_delete_permission(self, request, obj=None):
        # Prevenir eliminación accidental de datos históricos
        return False


# Configuración adicional del admin
admin.site.site_header = "VeriHome - Sistema de Matching"
admin.site.site_title = "Matching Admin"
admin.site.index_title = "Panel de Administración - Matching"