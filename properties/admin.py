"""
Configuración del panel de administración para la aplicación de propiedades.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Property, PropertyImage, PropertyVideo, PropertyAmenity, 
    PropertyAmenityRelation, PropertyFavorite, PropertyView, PropertyInquiry
)


class PropertyImageInline(admin.TabularInline):
    """Inline para imágenes de propiedades."""
    model = PropertyImage
    extra = 0
    fields = ['image', 'caption', 'is_main', 'order']
    readonly_fields = ['created_at']


class PropertyVideoInline(admin.TabularInline):
    """Inline para videos de propiedades."""
    model = PropertyVideo
    extra = 0
    fields = ['title', 'video', 'description', 'thumbnail']
    readonly_fields = ['created_at']


class PropertyAmenityInline(admin.TabularInline):
    """Inline para amenidades de propiedades."""
    model = PropertyAmenityRelation
    extra = 0
    fields = ['amenity', 'available', 'notes']


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    """Administración para propiedades."""
    
    list_display = [
        'title', 'landlord', 'property_type', 'city', 'status', 
        'rent_price', 'is_featured', 'created_at', 'views_count'
    ]
    list_filter = [
        'property_type', 'status', 'listing_type', 'is_featured', 
        'is_active', 'city', 'created_at'
    ]
    search_fields = ['title', 'description', 'address', 'city', 'landlord__email']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('landlord', 'title', 'description', 'property_type', 'listing_type', 'status')
        }),
        ('Ubicación', {
            'fields': ('address', 'city', 'state', 'country', 'postal_code', 'latitude', 'longitude')
        }),
        ('Características Físicas', {
            'fields': (
                'bedrooms', 'bathrooms', 'half_bathrooms', 'total_area', 
                'built_area', 'lot_area', 'parking_spaces', 'floors', 
                'floor_number', 'year_built'
            )
        }),
        ('Precios', {
            'fields': ('rent_price', 'sale_price', 'security_deposit', 'maintenance_fee')
        }),
        ('Condiciones de Renta', {
            'fields': (
                'minimum_lease_term', 'maximum_lease_term', 'pets_allowed', 
                'smoking_allowed', 'furnished', 'utilities_included'
            )
        }),
        ('Información Adicional', {
            'fields': ('property_features', 'nearby_amenities', 'transportation')
        }),
        ('Disponibilidad', {
            'fields': ('available_from', 'is_featured', 'is_active')
        }),
        ('Métricas', {
            'fields': ('views_count', 'favorites_count'),
            'classes': ['collapse']
        }),
    )
    
    readonly_fields = ['created_at', 'last_updated', 'views_count', 'favorites_count']
    inlines = [PropertyImageInline, PropertyVideoInline, PropertyAmenityInline]
    
    actions = ['mark_as_featured', 'mark_as_available', 'mark_as_rented']
    
    def mark_as_featured(self, request, queryset):
        """Marca propiedades como destacadas."""
        queryset.update(is_featured=True)
        self.message_user(request, f"{queryset.count()} propiedades marcadas como destacadas.")
    mark_as_featured.short_description = "Marcar como destacadas"
    
    def mark_as_available(self, request, queryset):
        """Marca propiedades como disponibles."""
        queryset.update(status='available')
        self.message_user(request, f"{queryset.count()} propiedades marcadas como disponibles.")
    mark_as_available.short_description = "Marcar como disponibles"
    
    def mark_as_rented(self, request, queryset):
        """Marca propiedades como rentadas."""
        queryset.update(status='rented')
        self.message_user(request, f"{queryset.count()} propiedades marcadas como rentadas.")
    mark_as_rented.short_description = "Marcar como rentadas"


@admin.register(PropertyImage)
class PropertyImageAdmin(admin.ModelAdmin):
    """Administración para imágenes de propiedades."""
    
    list_display = ['property', 'caption', 'is_main', 'order', 'created_at']
    list_filter = ['is_main', 'created_at']
    search_fields = ['property__title', 'caption']
    
    fieldsets = (
        ('Imagen', {
            'fields': ('property', 'image', 'caption')
        }),
        ('Configuración', {
            'fields': ('is_main', 'order')
        }),
    )
    
    readonly_fields = ['created_at']


@admin.register(PropertyVideo)
class PropertyVideoAdmin(admin.ModelAdmin):
    """Administración para videos de propiedades."""
    
    list_display = ['title', 'property', 'duration', 'created_at']
    list_filter = ['created_at']
    search_fields = ['title', 'description', 'property__title']
    
    fieldsets = (
        ('Video', {
            'fields': ('property', 'title', 'description', 'video', 'thumbnail')
        }),
        ('Metadatos', {
            'fields': ('duration',)
        }),
    )
    
    readonly_fields = ['created_at']


@admin.register(PropertyAmenity)
class PropertyAmenityAdmin(admin.ModelAdmin):
    """Administración para amenidades."""
    
    list_display = ['name', 'category', 'is_active']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'description']
    
    fieldsets = (
        ('Amenidad', {
            'fields': ('name', 'category', 'description', 'icon')
        }),
        ('Estado', {
            'fields': ('is_active',)
        }),
    )


@admin.register(PropertyInquiry)
class PropertyInquiryAdmin(admin.ModelAdmin):
    """Administración para consultas de propiedades."""
    
    list_display = [
        'property', 'inquirer', 'subject', 'status', 
        'preferred_contact_method', 'created_at'
    ]
    list_filter = ['status', 'preferred_contact_method', 'created_at']
    search_fields = ['property__title', 'inquirer__email', 'subject', 'message']
    
    fieldsets = (
        ('Consulta', {
            'fields': ('property', 'inquirer', 'subject', 'message', 'preferred_contact_method')
        }),
        ('Información Adicional', {
            'fields': ('move_in_date', 'lease_duration', 'budget_min', 'budget_max')
        }),
        ('Estado y Respuesta', {
            'fields': ('status', 'response', 'responded_at')
        }),
    )
    
    readonly_fields = ['created_at', 'responded_at']


@admin.register(PropertyFavorite)
class PropertyFavoriteAdmin(admin.ModelAdmin):
    """Administración para propiedades favoritas."""
    
    list_display = ['user', 'property', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email', 'property__title']
    
    readonly_fields = ['created_at']


@admin.register(PropertyView)
class PropertyViewAdmin(admin.ModelAdmin):
    """Administración para visualizaciones de propiedades."""
    
    list_display = ['property', 'user', 'ip_address', 'viewed_at']
    list_filter = ['viewed_at']
    search_fields = ['property__title', 'user__email', 'ip_address']
    
    readonly_fields = ['viewed_at']
    
    def has_add_permission(self, request):
        """No permitir agregar manualmente."""
        return False
