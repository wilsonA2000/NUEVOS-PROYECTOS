from django.contrib import admin
from .models import ContactMessage, SiteConfiguration, Notification, ActivityLog, SystemAlert, FAQ, SupportTicket, TicketResponse, EmailTemplate, SystemMetrics


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'subject', 'status', 'email_notified', 'created_at')
    list_filter = ('status', 'email_notified', 'created_at')
    search_fields = ('name', 'email', 'subject', 'message')
    readonly_fields = ('id', 'name', 'email', 'subject', 'message', 'ip_address', 'email_notified', 'created_at', 'updated_at')
    list_editable = ('status',)
    date_hierarchy = 'created_at'
    list_per_page = 25

    fieldsets = (
        ('Datos del Contacto', {
            'fields': ('id', 'name', 'email', 'subject', 'message', 'created_at')
        }),
        ('Gestión', {
            'fields': ('status', 'admin_notes')
        }),
        ('Metadatos', {
            'fields': ('ip_address', 'email_notified', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def has_add_permission(self, request):
        return False  # Solo se crean desde el formulario público


@admin.register(SiteConfiguration)
class SiteConfigurationAdmin(admin.ModelAdmin):
    list_display = ('site_name', 'contact_email', 'is_maintenance_mode')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'notification_type', 'priority', 'is_read', 'created_at')
    list_filter = ('notification_type', 'priority', 'is_read')
    search_fields = ('title', 'message')


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ('question', 'category', 'is_published', 'order')
    list_filter = ('category', 'is_published')
    list_editable = ('order', 'is_published')
