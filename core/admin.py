from django.contrib import admin
from .models import ContactMessage, SiteConfiguration, Notification, FAQ, SupportTicket, TicketResponse


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


class TicketResponseInline(admin.TabularInline):
    model = TicketResponse
    extra = 1
    readonly_fields = ('author', 'created_at')
    fields = ('author', 'message', 'is_internal', 'attachment', 'created_at')


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ('ticket_number', 'subject', 'department', 'category', 'priority', 'status', 'assigned_to', 'created_at')
    list_filter = ('department', 'category', 'priority', 'status', 'created_at')
    search_fields = ('ticket_number', 'subject', 'description', 'created_by__email')
    list_editable = ('status', 'priority', 'department')
    date_hierarchy = 'created_at'
    raw_id_fields = ('created_by', 'assigned_to')
    readonly_fields = ('id', 'ticket_number', 'ip_address', 'user_agent', 'created_at', 'updated_at', 'resolved_at', 'closed_at')
    inlines = [TicketResponseInline]
    list_per_page = 25

    fieldsets = (
        ('Ticket', {'fields': ('id', 'ticket_number', 'subject', 'description')}),
        ('Clasificación', {'fields': ('category', 'department', 'priority', 'status')}),
        ('Asignación', {'fields': ('created_by', 'assigned_to', 'contact_message')}),
        ('Fechas', {'fields': ('created_at', 'updated_at', 'resolved_at', 'closed_at')}),
        ('Metadatos', {'fields': ('ip_address', 'user_agent'), 'classes': ('collapse',)}),
    )
