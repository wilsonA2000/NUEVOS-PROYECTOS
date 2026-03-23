from django.contrib import admin
from .models import VerificationAgent, VerificationVisit, VerificationReport


@admin.register(VerificationAgent)
class VerificationAgentAdmin(admin.ModelAdmin):
    list_display = ('agent_code', 'user', 'specialization', 'is_available', 'total_visits_completed', 'average_rating', 'hired_at')
    list_filter = ('specialization', 'is_available')
    search_fields = ('agent_code', 'user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('id', 'agent_code', 'total_visits_completed', 'average_rating', 'created_at', 'updated_at')

    fieldsets = (
        ('Agente', {'fields': ('id', 'user', 'agent_code', 'specialization')}),
        ('Cobertura', {'fields': ('service_areas', 'certifications')}),
        ('Disponibilidad', {'fields': ('is_available', 'max_weekly_visits', 'availability_notes')}),
        ('Métricas', {'fields': ('total_visits_completed', 'average_rating', 'hired_at')}),
        ('Sistema', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


@admin.register(VerificationVisit)
class VerificationVisitAdmin(admin.ModelAdmin):
    list_display = ('visit_number', 'visit_type', 'agent', 'target_user', 'status', 'scheduled_date', 'verification_passed')
    list_filter = ('visit_type', 'status', 'verification_passed', 'visit_city', 'scheduled_date')
    search_fields = ('visit_number', 'target_user__email', 'target_user__first_name', 'agent__agent_code')
    list_editable = ('status',)
    date_hierarchy = 'scheduled_date'
    readonly_fields = ('id', 'visit_number', 'duration_minutes', 'created_at', 'updated_at')
    raw_id_fields = ('target_user', 'property_ref')

    fieldsets = (
        ('Visita', {'fields': ('id', 'visit_number', 'visit_type', 'status')}),
        ('Asignación', {'fields': ('agent', 'target_user', 'property_ref')}),
        ('Programación', {'fields': ('scheduled_date', 'scheduled_time', 'visit_address', 'visit_city')}),
        ('Ejecución', {'fields': ('started_at', 'completed_at', 'duration_minutes')}),
        ('Resultado', {'fields': ('verification_passed', 'agent_notes', 'cancellation_reason')}),
        ('Sistema', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


@admin.register(VerificationReport)
class VerificationReportAdmin(admin.ModelAdmin):
    list_display = ('visit', 'overall_condition', 'initial_rating', 'identity_verified', 'approved_by_admin', 'created_at')
    list_filter = ('overall_condition', 'identity_verified', 'approved_by_admin', 'property_exists')
    search_fields = ('visit__visit_number', 'findings', 'recommendations')
    list_editable = ('approved_by_admin',)
    readonly_fields = ('id', 'created_at', 'updated_at')

    fieldsets = (
        ('Visita', {'fields': ('id', 'visit')}),
        ('Evaluación General', {'fields': ('overall_condition', 'initial_rating')}),
        ('Verificación de Identidad', {'fields': ('identity_verified', 'document_type_verified', 'document_number_verified')}),
        ('Verificación de Propiedad', {
            'fields': ('property_exists', 'property_matches_description', 'property_condition_notes'),
            'classes': ('collapse',),
        }),
        ('Verificación de Persona', {'fields': ('person_lives_at_address', 'person_cooperative', 'references_verified')}),
        ('Hallazgos', {'fields': ('findings', 'recommendations', 'risk_flags')}),
        ('Evidencias', {'fields': ('photo_evidence',)}),
        ('Aprobación', {'fields': ('approved_by_admin', 'admin_notes')}),
        ('Sistema', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )
