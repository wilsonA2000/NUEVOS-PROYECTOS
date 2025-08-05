"""
Configuración del admin para el sistema de códigos de entrevista.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.utils import timezone
from django.http import HttpResponse
from django.template.response import TemplateResponse
from django.contrib.admin import SimpleListFilter
from .models import InterviewCode
import csv


class InterviewStatusFilter(SimpleListFilter):
    title = 'Estado de Entrevista'
    parameter_name = 'interview_status'

    def lookups(self, request, model_admin):
        return (
            ('pending_interview', 'Pendiente de Entrevista'),
            ('interviewed', 'Entrevistado'),
            ('approved', 'Aprobado'),
            ('high_rating', 'Calificación Alta (8+)'),
            ('expiring_soon', 'Expira Pronto'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'pending_interview':
            return queryset.filter(is_approved=False, interview_rating__isnull=True)
        if self.value() == 'interviewed':
            return queryset.filter(interview_rating__isnull=False)
        if self.value() == 'approved':
            return queryset.filter(is_approved=True)
        if self.value() == 'high_rating':
            return queryset.filter(interview_rating__gte=8)
        if self.value() == 'expiring_soon':
            week_from_now = timezone.now() + timezone.timedelta(days=7)
            return queryset.filter(expires_at__lte=week_from_now, status='active')


@admin.register(InterviewCode)
class InterviewCodeAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'user_type', 'email', 
        'is_active', 'is_used', 'created_at'
    ]
    list_filter = [
        'user_type', 'is_active', 'is_used', 
        'created_at', 'valid_until'
    ]
    search_fields = [
        'code', 'email', 'created_by__username'
    ]
    readonly_fields = [
        'code', 'created_at', 'used_at', 'current_uses'
    ]
    list_per_page = 25
    ordering = ['-created_at']
    
    fieldsets = (
        ('Información del Código', {
            'fields': (
                'code', 'user_type', 'is_active', 'current_uses', 'max_uses'
            )
        }),
        ('Información del Usuario', {
            'fields': (
                'email', 'notes'
            )
        }),
        ('Fechas Importantes', {
            'fields': (
                'valid_from', 'valid_until', 'created_at', 'used_at'
            )
        }),
        ('Gestión', {
            'fields': ('created_by', 'is_used')
        })
    )
    
    actions = [
        'approve_selected', 'revoke_selected', 'export_to_csv', 
        'send_reminder_email', 'extend_expiry'
    ]
    
    def rating_display(self, obj):
        if obj.interview_rating:
            stars = '⭐' * obj.interview_rating
            color = 'green' if obj.interview_rating >= 7 else 'orange' if obj.interview_rating >= 5 else 'red'
            return format_html(
                '<span style="color: {};">{} ({})</span>',
                color, stars, obj.interview_rating
            )
        return '-'
    rating_display.short_description = 'Calificación'
    
    def status_display(self, obj):
        colors = {
            'active': 'green',
            'used': 'blue',
            'expired': 'orange',
            'revoked': 'red'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_display.short_description = 'Estado'
    
    def approve_selected(self, request, queryset):
        """Acción para aprobar códigos seleccionados."""
        if 'apply' in request.POST:
            user_type = request.POST.get('user_type')
            rating = request.POST.get('rating')
            notes = request.POST.get('notes', '')
            
            if user_type and rating:
                try:
                    rating = int(rating)
                    for code in queryset:
                        if not code.is_approved:
                            code.approve(request.user, user_type, rating, notes)
                    
                    self.message_user(request, f'{queryset.count()} códigos aprobados exitosamente.')
                    return
                except ValueError:
                    self.message_user(request, 'Error: Rating debe ser un número válido.', level='ERROR')
        
        # Mostrar formulario de aprobación
        context = {
            'codes': queryset,
            'action_name': 'approve_selected',
            'title': 'Aprobar códigos seleccionados'
        }
        return TemplateResponse(request, 'admin/interview_code_approve.html', context)
    
    approve_selected.short_description = 'Aprobar códigos seleccionados'
    
    def revoke_selected(self, request, queryset):
        """Revocar códigos seleccionados."""
        count = 0
        for code in queryset:
            if code.status == 'active':
                code.revoke()
                count += 1
        
        self.message_user(request, f'{count} códigos revocados exitosamente.')
    revoke_selected.short_description = 'Revocar códigos seleccionados'
    
    def export_to_csv(self, request, queryset):
        """Exportar códigos a CSV."""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="interview_codes.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Código', 'Candidato', 'Email', 'Teléfono', 'Tipo Usuario',
            'Calificación', 'Estado', 'Aprobado', 'Creado', 'Expira'
        ])
        
        for code in queryset:
            writer.writerow([
                code.interview_code,
                code.candidate_name,
                code.candidate_email,
                code.candidate_phone,
                code.get_approved_user_type_display() if code.approved_user_type else '',
                code.interview_rating or '',
                code.get_status_display(),
                'Sí' if code.is_approved else 'No',
                code.created_at.strftime('%Y-%m-%d %H:%M'),
                code.expires_at.strftime('%Y-%m-%d %H:%M') if code.expires_at else ''
            ])
        
        return response
    export_to_csv.short_description = 'Exportar a CSV'
    
    def extend_expiry(self, request, queryset):
        """Extender fecha de expiración por 30 días."""
        for code in queryset:
            if code.status == 'active':
                code.expires_at = timezone.now() + timezone.timedelta(days=30)
                code.save()
        
        self.message_user(request, f'Expiración extendida para {queryset.count()} códigos.')
    extend_expiry.short_description = 'Extender expiración 30 días'


