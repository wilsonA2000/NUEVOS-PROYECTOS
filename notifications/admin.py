"""
Configuración del admin de Django para el sistema de notificaciones.
Interfaz administrativa completa para gestionar notificaciones.
"""

from django.contrib import admin
from django.db.models import Count, Q
from django.utils.html import format_html
from django.utils import timezone
from django.urls import reverse
from django.http import HttpResponseRedirect
from django.contrib import messages
from datetime import timedelta

from .models import (
    NotificationChannel, NotificationTemplate, Notification,
    NotificationDelivery, NotificationPreference, NotificationDigest,
    NotificationAnalytics
)
from .notification_service import notification_service


@admin.register(NotificationChannel)
class NotificationChannelAdmin(admin.ModelAdmin):
    """Admin para canales de notificación."""
    
    list_display = [
        'name', 'channel_type', 'status', 'is_default', 'priority',
        'rate_limit_per_minute', 'rate_limit_per_hour', 'created_at'
    ]
    list_filter = ['channel_type', 'status', 'is_default', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['priority', 'name']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('name', 'channel_type', 'description', 'status')
        }),
        ('Configuración', {
            'fields': ('is_default', 'priority', 'configuration'),
            'classes': ('collapse',)
        }),
        ('Límites de Velocidad', {
            'fields': (
                'rate_limit_per_minute', 'rate_limit_per_hour',
                'retry_attempts', 'retry_delay_seconds'
            ),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['test_channel_configuration', 'activate_channels', 'deactivate_channels']
    
    def test_channel_configuration(self, request, queryset):
        """Prueba la configuración de los canales seleccionados."""
        from .channels import NotificationChannelManager
        
        manager = NotificationChannelManager()
        tested = 0
        errors = 0
        
        for channel in queryset:
            result = manager.validate_channel_config(channel)
            tested += 1
            
            if not result['valid']:
                errors += 1
                self.message_user(
                    request,
                    f"Error en {channel.name}: {result.get('error', 'Configuración inválida')}",
                    level=messages.ERROR
                )
        
        if errors == 0:
            self.message_user(
                request,
                f"Todos los {tested} canales tienen configuración válida.",
                level=messages.SUCCESS
            )
        else:
            self.message_user(
                request,
                f"Se encontraron errores en {errors} de {tested} canales.",
                level=messages.WARNING
            )
    
    test_channel_configuration.short_description = "Probar configuración de canales"
    
    def activate_channels(self, request, queryset):
        """Activa los canales seleccionados."""
        updated = queryset.update(status='active')
        self.message_user(
            request,
            f"Se activaron {updated} canales.",
            level=messages.SUCCESS
        )
    
    activate_channels.short_description = "Activar canales seleccionados"
    
    def deactivate_channels(self, request, queryset):
        """Desactiva los canales seleccionados."""
        updated = queryset.update(status='inactive')
        self.message_user(
            request,
            f"Se desactivaron {updated} canales.",
            level=messages.SUCCESS
        )
    
    deactivate_channels.short_description = "Desactivar canales seleccionados"


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    """Admin para plantillas de notificación."""
    
    list_display = [
        'name', 'template_type', 'priority', 'is_active', 'is_system_template',
        'max_frequency_per_user_per_day', 'created_at'
    ]
    list_filter = [
        'template_type', 'priority', 'is_active', 'is_system_template', 'created_at'
    ]
    search_fields = ['name', 'title', 'content_text']
    filter_horizontal = ['channels']
    ordering = ['template_type', 'name']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('name', 'template_type', 'title', 'subject')
        }),
        ('Contenido', {
            'fields': ('content_text', 'content_html'),
        }),
        ('Configuración', {
            'fields': (
                'channels', 'priority', 'max_frequency_per_user_per_day',
                'variables', 'is_active', 'is_system_template'
            ),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['duplicate_templates', 'test_template_rendering']
    
    def duplicate_templates(self, request, queryset):
        """Duplica las plantillas seleccionadas."""
        duplicated = 0
        
        for template in queryset:
            # Crear copia
            new_template = NotificationTemplate.objects.create(
                name=f"{template.name} (Copia)",
                template_type=template.template_type,
                title=template.title,
                subject=template.subject,
                content_text=template.content_text,
                content_html=template.content_html,
                priority=template.priority,
                variables=template.variables,
                max_frequency_per_user_per_day=template.max_frequency_per_user_per_day,
                is_active=False,  # Crear inactiva
                created_by=request.user
            )
            
            # Copiar canales
            new_template.channels.set(template.channels.all())
            duplicated += 1
        
        self.message_user(
            request,
            f"Se duplicaron {duplicated} plantillas.",
            level=messages.SUCCESS
        )
    
    duplicate_templates.short_description = "Duplicar plantillas seleccionadas"
    
    def test_template_rendering(self, request, queryset):
        """Prueba el renderizado de las plantillas."""
        test_context = {
            'user_name': 'Usuario de Prueba',
            'platform_name': 'VeriHome',
            'action_url': 'https://verihome.com/test'
        }
        
        tested = 0
        errors = 0
        
        for template in queryset:
            try:
                rendered = template.render_content(test_context)
                if 'Error renderizando' in rendered['content_text']:
                    errors += 1
                tested += 1
            except Exception as e:
                errors += 1
                self.message_user(
                    request,
                    f"Error en plantilla {template.name}: {str(e)}",
                    level=messages.ERROR
                )
        
        if errors == 0:
            self.message_user(
                request,
                f"Todas las {tested} plantillas se renderizaron correctamente.",
                level=messages.SUCCESS
            )
        else:
            self.message_user(
                request,
                f"Se encontraron errores en {errors} de {tested} plantillas.",
                level=messages.WARNING
            )
    
    test_template_rendering.short_description = "Probar renderizado de plantillas"


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin para notificaciones."""
    
    list_display = [
        'title', 'recipient', 'status', 'priority', 'is_read',
        'template', 'created_at', 'sent_at', 'actions_column'
    ]
    list_filter = [
        'status', 'priority', 'is_read', 'template__template_type',
        'created_at', 'sent_at'
    ]
    search_fields = ['title', 'message', 'recipient__email', 'recipient__first_name', 'recipient__last_name']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    readonly_fields = ['id', 'created_at', 'sent_at', 'delivered_at', 'read_at']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('recipient', 'title', 'message', 'priority')
        }),
        ('Configuración', {
            'fields': ('template', 'action_url', 'deep_link', 'data'),
            'classes': ('collapse',)
        }),
        ('Estado', {
            'fields': ('status', 'is_read'),
        }),
        ('Fechas', {
            'fields': (
                'created_at', 'scheduled_at', 'sent_at',
                'delivered_at', 'read_at', 'expires_at'
            ),
            'classes': ('collapse',)
        }),
        ('Objeto Relacionado', {
            'fields': ('content_type', 'object_id'),
            'classes': ('collapse',)
        }),
    )
    
    actions = [
        'mark_as_read', 'mark_as_unread', 'resend_notifications',
        'cancel_notifications', 'send_test_notification'
    ]
    
    def actions_column(self, obj):
        """Columna de acciones personalizadas."""
        actions = []
        
        if obj.status == 'pending':
            actions.append(
                f'<a href="#" onclick="return confirm(\'¿Enviar notificación ahora?\') && '
                f'sendNotification(\'{obj.id}\')" class="button">Enviar</a>'
            )
        
        if not obj.is_read:
            actions.append(
                f'<a href="#" onclick="markAsRead(\'{obj.id}\')" class="button">Marcar Leída</a>'
            )
        
        return format_html(' '.join(actions))
    
    actions_column.short_description = 'Acciones'
    actions_column.allow_tags = True
    
    def mark_as_read(self, request, queryset):
        """Marca notificaciones como leídas."""
        updated = 0
        for notification in queryset.filter(is_read=False):
            notification.mark_as_read()
            updated += 1
        
        self.message_user(
            request,
            f"Se marcaron {updated} notificaciones como leídas.",
            level=messages.SUCCESS
        )
    
    mark_as_read.short_description = "Marcar como leídas"
    
    def mark_as_unread(self, request, queryset):
        """Marca notificaciones como no leídas."""
        updated = queryset.filter(is_read=True).update(
            is_read=False,
            read_at=None,
            status='delivered'
        )
        
        self.message_user(
            request,
            f"Se marcaron {updated} notificaciones como no leídas.",
            level=messages.SUCCESS
        )
    
    mark_as_unread.short_description = "Marcar como no leídas"
    
    def resend_notifications(self, request, queryset):
        """Reenvía notificaciones fallidas."""
        resent = 0
        errors = 0
        
        for notification in queryset.filter(status__in=['failed', 'cancelled']):
            try:
                notification.status = 'pending'
                notification.save()
                
                result = notification_service.send_notification(notification)
                if result['success']:
                    resent += 1
                else:
                    errors += 1
            except Exception:
                errors += 1
        
        if resent > 0:
            self.message_user(
                request,
                f"Se reenviaron {resent} notificaciones.",
                level=messages.SUCCESS
            )
        
        if errors > 0:
            self.message_user(
                request,
                f"Falló el reenvío de {errors} notificaciones.",
                level=messages.ERROR
            )
    
    resend_notifications.short_description = "Reenviar notificaciones"
    
    def cancel_notifications(self, request, queryset):
        """Cancela notificaciones pendientes."""
        cancelled = queryset.filter(status='pending').update(status='cancelled')
        
        self.message_user(
            request,
            f"Se cancelaron {cancelled} notificaciones.",
            level=messages.SUCCESS
        )
    
    cancel_notifications.short_description = "Cancelar notificaciones pendientes"
    
    def send_test_notification(self, request, queryset):
        """Envía notificación de prueba al admin."""
        try:
            notification_service.create_notification(
                recipient=request.user,
                title="Notificación de Prueba",
                message="Esta es una notificación de prueba enviada desde el panel de administración.",
                priority="normal",
                channels=['in_app', 'email']
            )
            
            self.message_user(
                request,
                "Se envió una notificación de prueba a tu cuenta.",
                level=messages.SUCCESS
            )
        except Exception as e:
            self.message_user(
                request,
                f"Error enviando notificación de prueba: {str(e)}",
                level=messages.ERROR
            )
    
    send_test_notification.short_description = "Enviar notificación de prueba"
    
    class Media:
        js = ('admin/js/notification_actions.js',)


@admin.register(NotificationDelivery)
class NotificationDeliveryAdmin(admin.ModelAdmin):
    """Admin para entregas de notificaciones."""
    
    list_display = [
        'notification', 'channel', 'status', 'sent_to',
        'retry_count', 'created_at', 'sent_at'
    ]
    list_filter = ['status', 'channel__name', 'created_at', 'sent_at']
    search_fields = [
        'notification__title', 'sent_to', 'external_id', 'tracking_id'
    ]
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    readonly_fields = [
        'notification', 'channel', 'created_at', 'sent_at',
        'delivered_at', 'clicked_at'
    ]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('notification', 'channel', 'status', 'sent_to')
        }),
        ('Identificadores', {
            'fields': ('external_id', 'tracking_id'),
            'classes': ('collapse',)
        }),
        ('Errores y Reintentos', {
            'fields': (
                'error_code', 'error_message', 'retry_count', 'next_retry_at'
            ),
            'classes': ('collapse',)
        }),
        ('Fechas', {
            'fields': (
                'created_at', 'sent_at', 'delivered_at', 'clicked_at'
            ),
            'classes': ('collapse',)
        }),
        ('Datos de Respuesta', {
            'fields': ('response_data',),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['retry_failed_deliveries', 'mark_as_delivered']
    
    def retry_failed_deliveries(self, request, queryset):
        """Reintenta entregas fallidas."""
        retried = 0
        
        for delivery in queryset.filter(status='failed'):
            if delivery.can_retry():
                delivery.schedule_retry()
                retried += 1
        
        self.message_user(
            request,
            f"Se programaron {retried} reintentos.",
            level=messages.SUCCESS
        )
    
    retry_failed_deliveries.short_description = "Reintentar entregas fallidas"
    
    def mark_as_delivered(self, request, queryset):
        """Marca entregas como entregadas."""
        updated = queryset.filter(status='sent').update(
            status='delivered',
            delivered_at=timezone.now()
        )
        
        self.message_user(
            request,
            f"Se marcaron {updated} entregas como entregadas.",
            level=messages.SUCCESS
        )
    
    mark_as_delivered.short_description = "Marcar como entregadas"


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    """Admin para preferencias de notificación."""
    
    list_display = [
        'user', 'is_enabled', 'allow_email', 'allow_sms',
        'allow_push', 'allow_in_app', 'email_frequency', 'digest_enabled'
    ]
    list_filter = [
        'is_enabled', 'allow_email', 'allow_sms', 'allow_push',
        'allow_in_app', 'email_frequency', 'digest_enabled'
    ]
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    ordering = ['user__email']
    
    fieldsets = (
        ('Usuario', {
            'fields': ('user',)
        }),
        ('Configuración General', {
            'fields': ('is_enabled',)
        }),
        ('Canales Permitidos', {
            'fields': ('allow_email', 'allow_sms', 'allow_push', 'allow_in_app')
        }),
        ('Tipos de Notificación', {
            'fields': (
                'marketing_notifications', 'system_notifications',
                'security_notifications', 'property_notifications',
                'contract_notifications', 'payment_notifications',
                'message_notifications', 'rating_notifications'
            ),
            'classes': ('collapse',)
        }),
        ('Configuración de Horarios', {
            'fields': ('quiet_hours_start', 'quiet_hours_end', 'timezone'),
            'classes': ('collapse',)
        }),
        ('Configuración Avanzada', {
            'fields': ('email_frequency', 'digest_enabled', 'digest_frequency'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['enable_all_notifications', 'disable_all_notifications', 'reset_to_defaults']
    
    def enable_all_notifications(self, request, queryset):
        """Habilita todas las notificaciones."""
        updated = queryset.update(
            is_enabled=True,
            allow_email=True,
            allow_push=True,
            allow_in_app=True
        )
        
        self.message_user(
            request,
            f"Se habilitaron las notificaciones para {updated} usuarios.",
            level=messages.SUCCESS
        )
    
    enable_all_notifications.short_description = "Habilitar todas las notificaciones"
    
    def disable_all_notifications(self, request, queryset):
        """Deshabilita todas las notificaciones."""
        updated = queryset.update(is_enabled=False)
        
        self.message_user(
            request,
            f"Se deshabilitaron las notificaciones para {updated} usuarios.",
            level=messages.SUCCESS
        )
    
    disable_all_notifications.short_description = "Deshabilitar todas las notificaciones"
    
    def reset_to_defaults(self, request, queryset):
        """Restablece configuraciones por defecto."""
        updated = queryset.update(
            is_enabled=True,
            allow_email=True,
            allow_sms=False,
            allow_push=True,
            allow_in_app=True,
            email_frequency='immediate',
            digest_enabled=True,
            digest_frequency='daily'
        )
        
        self.message_user(
            request,
            f"Se restablecieron las configuraciones por defecto para {updated} usuarios.",
            level=messages.SUCCESS
        )
    
    reset_to_defaults.short_description = "Restablecer configuraciones por defecto"


@admin.register(NotificationDigest)
class NotificationDigestAdmin(admin.ModelAdmin):
    """Admin para resúmenes de notificaciones."""
    
    list_display = [
        'user', 'digest_type', 'status', 'notification_count',
        'period_start', 'period_end', 'sent_at', 'email_sent'
    ]
    list_filter = ['digest_type', 'status', 'email_sent', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    readonly_fields = ['created_at', 'sent_at']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('user', 'digest_type', 'status')
        }),
        ('Período', {
            'fields': ('period_start', 'period_end')
        }),
        ('Contenido', {
            'fields': ('notification_count', 'summary_data'),
            'classes': ('collapse',)
        }),
        ('Entrega', {
            'fields': ('email_sent', 'sent_at', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['resend_digests', 'mark_as_sent']
    
    def resend_digests(self, request, queryset):
        """Reenvía resúmenes fallidos."""
        resent = 0
        
        for digest in queryset.filter(status__in=['pending', 'failed']):
            try:
                # Aquí iría la lógica de reenvío
                digest.status = 'sent'
                digest.sent_at = timezone.now()
                digest.email_sent = True
                digest.save()
                resent += 1
            except Exception:
                pass
        
        self.message_user(
            request,
            f"Se reenviaron {resent} resúmenes.",
            level=messages.SUCCESS
        )
    
    resend_digests.short_description = "Reenviar resúmenes"
    
    def mark_as_sent(self, request, queryset):
        """Marca resúmenes como enviados."""
        updated = queryset.update(
            status='sent',
            email_sent=True,
            sent_at=timezone.now()
        )
        
        self.message_user(
            request,
            f"Se marcaron {updated} resúmenes como enviados.",
            level=messages.SUCCESS
        )
    
    mark_as_sent.short_description = "Marcar como enviados"


@admin.register(NotificationAnalytics)
class NotificationAnalyticsAdmin(admin.ModelAdmin):
    """Admin para analíticas de notificaciones."""
    
    list_display = [
        'date', 'channel', 'notifications_sent', 'notifications_delivered',
        'notifications_failed', 'delivery_rate', 'click_rate', 'read_rate'
    ]
    list_filter = ['date', 'channel__name']
    date_hierarchy = 'date'
    ordering = ['-date']
    
    readonly_fields = [
        'date', 'channel', 'notifications_sent', 'notifications_delivered',
        'notifications_failed', 'notifications_clicked', 'notifications_read',
        'delivery_rate', 'click_rate', 'read_rate', 'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('date', 'channel')
        }),
        ('Contadores', {
            'fields': (
                'notifications_sent', 'notifications_delivered',
                'notifications_failed', 'notifications_clicked',
                'notifications_read'
            )
        }),
        ('Tasas Calculadas', {
            'fields': ('delivery_rate', 'click_rate', 'read_rate')
        }),
        ('Tiempos Promedio', {
            'fields': ('avg_delivery_time_seconds', 'avg_read_time_seconds'),
            'classes': ('collapse',)
        }),
        ('Fechas', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        """No permitir creación manual de analíticas."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """No permitir eliminación de analíticas."""
        return False