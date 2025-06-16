"""
Configuración del panel de administración para el sistema de calificaciones.
"""

from django.contrib import admin
from .models import Rating, RatingCategory, RatingResponse, RatingReport, UserRatingProfile, RatingInvitation


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    """Administración de calificaciones."""
    
    list_display = ('id', 'reviewer_name', 'reviewee_name', 'overall_rating', 
                    'rating_type', 'is_verified', 'created_at')
    list_filter = ('rating_type', 'is_verified', 'is_public', 'is_anonymous', 
                   'moderation_status', 'created_at')
    search_fields = ('reviewer__first_name', 'reviewer__last_name', 'reviewer__email',
                     'reviewee__first_name', 'reviewee__last_name', 'reviewee__email',
                     'title', 'review_text')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'
    
    def reviewer_name(self, obj):
        return obj.reviewer.get_full_name()
    reviewer_name.short_description = 'Autor'
    
    def reviewee_name(self, obj):
        return obj.reviewee.get_full_name()
    reviewee_name.short_description = 'Calificado'


@admin.register(RatingCategory)
class RatingCategoryAdmin(admin.ModelAdmin):
    """Administración de categorías de calificación."""
    
    list_display = ('id', 'rating_id', 'category', 'score')
    list_filter = ('category', 'score')
    search_fields = ('rating__reviewer__email', 'rating__reviewee__email')


@admin.register(RatingResponse)
class RatingResponseAdmin(admin.ModelAdmin):
    """Administración de respuestas a calificaciones."""
    
    list_display = ('id', 'rating_id', 'responder_name', 'is_public', 'created_at')
    list_filter = ('is_public', 'is_flagged', 'created_at')
    search_fields = ('responder__first_name', 'responder__last_name', 'responder__email',
                     'response_text')
    readonly_fields = ('created_at', 'updated_at')
    
    def responder_name(self, obj):
        return obj.responder.get_full_name()
    responder_name.short_description = 'Autor de la respuesta'


@admin.register(RatingReport)
class RatingReportAdmin(admin.ModelAdmin):
    """Administración de reportes de calificaciones."""
    
    list_display = ('id', 'rating_id', 'reporter_name', 'reason', 'status', 'created_at')
    list_filter = ('reason', 'status', 'created_at')
    search_fields = ('reporter__first_name', 'reporter__last_name', 'reporter__email',
                     'description')
    readonly_fields = ('created_at',)
    actions = ['mark_as_under_review', 'mark_as_resolved', 'mark_as_dismissed']
    
    def reporter_name(self, obj):
        return obj.reporter.get_full_name()
    reporter_name.short_description = 'Reportado por'
    
    def mark_as_under_review(self, request, queryset):
        queryset.update(status='under_review')
    mark_as_under_review.short_description = "Marcar como 'En Revisión'"
    
    def mark_as_resolved(self, request, queryset):
        queryset.update(status='resolved')
    mark_as_resolved.short_description = "Marcar como 'Resuelto'"
    
    def mark_as_dismissed(self, request, queryset):
        queryset.update(status='dismissed')
    mark_as_dismissed.short_description = "Marcar como 'Desestimado'"


@admin.register(UserRatingProfile)
class UserRatingProfileAdmin(admin.ModelAdmin):
    """Administración de perfiles de calificaciones de usuarios."""
    
    list_display = ('id', 'user_name', 'average_rating', 'total_ratings_received', 'last_updated')
    list_filter = ('last_updated',)
    search_fields = ('user__first_name', 'user__last_name', 'user__email')
    readonly_fields = ('created_at', 'last_updated')
    actions = ['update_statistics']
    
    def user_name(self, obj):
        return obj.user.get_full_name()
    user_name.short_description = 'Usuario'
    
    def update_statistics(self, request, queryset):
        for profile in queryset:
            profile.update_statistics()
    update_statistics.short_description = "Actualizar estadísticas de calificaciones"


@admin.register(RatingInvitation)
class RatingInvitationAdmin(admin.ModelAdmin):
    """Administración de invitaciones para calificar."""
    
    list_display = ('id', 'inviter_name', 'invitee_name', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('inviter__first_name', 'inviter__last_name', 'inviter__email',
                     'invitee__first_name', 'invitee__last_name', 'invitee__email')
    readonly_fields = ('invitation_token', 'created_at')
    
    def inviter_name(self, obj):
        return obj.inviter.get_full_name()
    inviter_name.short_description = 'Invitador'
    
    def invitee_name(self, obj):
        return obj.invitee.get_full_name()
    invitee_name.short_description = 'Invitado'