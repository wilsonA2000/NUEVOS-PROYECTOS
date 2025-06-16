"""
Vistas para la aplicación de calificaciones de VeriHome.
"""

from django.shortcuts import render
from django.views.generic import TemplateView, ListView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse
from django.db import models

from .models import Rating, RatingCategory, UserRatingProfile

class RatingDashboardView(LoginRequiredMixin, TemplateView):
    """Dashboard de calificaciones."""
    template_name = 'ratings/dashboard.html'

class MyRatingsView(LoginRequiredMixin, ListView):
    """Vista de mis calificaciones."""
    model = Rating
    template_name = 'ratings/my_ratings.html'
    context_object_name = 'ratings'
    
    def get_queryset(self):
        return Rating.objects.filter(reviewer=self.request.user)

class ReceivedRatingsView(LoginRequiredMixin, ListView):
    """Vista de calificaciones recibidas."""
    model = Rating
    template_name = 'ratings/received_ratings.html'
    context_object_name = 'ratings'
    
    def get_queryset(self):
        return Rating.objects.filter(rated_user=self.request.user)

class GivenRatingsView(LoginRequiredMixin, ListView):
    """Vista de calificaciones dadas."""
    model = Rating
    template_name = 'ratings/given_ratings.html'
    context_object_name = 'ratings'
    
    def get_queryset(self):
        return Rating.objects.filter(reviewer=self.request.user)

class RatingDetailView(LoginRequiredMixin, DetailView):
    """Vista de detalle de calificación."""
    model = Rating
    template_name = 'ratings/rating_detail.html'
    context_object_name = 'rating'

class CreateRatingView(LoginRequiredMixin, TemplateView):
    """Vista para crear calificación."""
    template_name = 'ratings/create_rating.html'

class EditRatingView(LoginRequiredMixin, TemplateView):
    """Vista para editar calificación."""
    template_name = 'ratings/edit_rating.html'

class DeleteRatingView(LoginRequiredMixin, TemplateView):
    """Vista para eliminar calificación."""
    template_name = 'ratings/delete_rating.html'

class RateUserView(LoginRequiredMixin, TemplateView):
    """Vista para calificar usuario."""
    template_name = 'ratings/rate_user.html'

class RatePropertyView(LoginRequiredMixin, TemplateView):
    """Vista para calificar propiedad."""
    template_name = 'ratings/rate_property.html'

class RateServiceView(LoginRequiredMixin, TemplateView):
    """Vista para calificar servicio."""
    template_name = 'ratings/rate_service.html'

class RateContractView(LoginRequiredMixin, TemplateView):
    """Vista para calificar contrato."""
    template_name = 'ratings/rate_contract.html'

class RatingInvitationListView(LoginRequiredMixin, TemplateView):
    """Vista de lista de invitaciones."""
    template_name = 'ratings/invitations.html'

class SendRatingInvitationView(LoginRequiredMixin, TemplateView):
    """Vista para enviar invitación."""
    template_name = 'ratings/send_invitation.html'

class AcceptRatingInvitationView(LoginRequiredMixin, TemplateView):
    """Vista para aceptar invitación."""
    template_name = 'ratings/accept_invitation.html'

class DeclineRatingInvitationView(LoginRequiredMixin, TemplateView):
    """Vista para rechazar invitación."""
    template_name = 'ratings/decline_invitation.html'

class PendingInvitationsView(LoginRequiredMixin, TemplateView):
    """Vista de invitaciones pendientes."""
    template_name = 'ratings/pending_invitations.html'

class SentInvitationsView(LoginRequiredMixin, TemplateView):
    """Vista de invitaciones enviadas."""
    template_name = 'ratings/sent_invitations.html'

class RatingResponseView(LoginRequiredMixin, TemplateView):
    """Vista para responder calificación."""
    template_name = 'ratings/rating_response.html'

class EditRatingResponseView(LoginRequiredMixin, TemplateView):
    """Vista para editar respuesta."""
    template_name = 'ratings/edit_rating_response.html'

class DeleteRatingResponseView(LoginRequiredMixin, TemplateView):
    """Vista para eliminar respuesta."""
    template_name = 'ratings/delete_rating_response.html'

class ReportRatingView(LoginRequiredMixin, TemplateView):
    """Vista para reportar calificación."""
    template_name = 'ratings/report_rating.html'

class RatingReportDetailView(LoginRequiredMixin, TemplateView):
    """Vista de detalle de reporte."""
    template_name = 'ratings/rating_report_detail.html'

class RatingReportListView(LoginRequiredMixin, TemplateView):
    """Vista de lista de reportes."""
    template_name = 'ratings/rating_reports.html'

class UserRatingProfileView(DetailView):
    """Vista de perfil de calificaciones de usuario."""
    model = UserRatingProfile
    template_name = 'ratings/user_rating_profile.html'
    context_object_name = 'rating_profile'

class PublicRatingProfileView(TemplateView):
    """Vista pública de calificaciones."""
    template_name = 'ratings/public_rating_profile.html'

class RatingBadgesView(LoginRequiredMixin, TemplateView):
    """Vista de insignias de calificaciones."""
    template_name = 'ratings/badges.html'

class EarnedBadgesView(LoginRequiredMixin, TemplateView):
    """Vista de insignias ganadas."""
    template_name = 'ratings/earned_badges.html'

class AvailableBadgesView(TemplateView):
    """Vista de insignias disponibles."""
    template_name = 'ratings/available_badges.html'

class TopRatedUsersView(ListView):
    """Vista de usuarios mejor calificados."""
    template_name = 'ratings/top_rated_users.html'
    context_object_name = 'top_users'
    
    def get_queryset(self):
        from users.models import User
        return User.objects.filter(
            is_active=True
        ).annotate(
            avg_rating=models.Avg('received_ratings__overall_rating')
        ).filter(avg_rating__isnull=False).order_by('-avg_rating')[:50]

class TopRatedLandlordsView(TemplateView):
    """Vista de arrendadores mejor calificados."""
    template_name = 'ratings/top_rated_landlords.html'

class TopRatedServiceProvidersView(TemplateView):
    """Vista de prestadores mejor calificados."""
    template_name = 'ratings/top_rated_service_providers.html'

class RatingCategoryListView(TemplateView):
    """Vista de lista de categorías."""
    template_name = 'ratings/categories.html'

class CategoryRatingsView(TemplateView):
    """Vista de calificaciones por categoría."""
    template_name = 'ratings/category_ratings.html'

class RatingStatsView(LoginRequiredMixin, TemplateView):
    """Vista de estadísticas de calificaciones."""
    template_name = 'ratings/stats.html'

class PersonalRatingStatsView(LoginRequiredMixin, TemplateView):
    """Vista de estadísticas personales."""
    template_name = 'ratings/personal_stats.html'

class GlobalRatingStatsView(TemplateView):
    """Vista de estadísticas globales."""
    template_name = 'ratings/global_stats.html'

class RatingTrendsView(TemplateView):
    """Vista de tendencias de calificaciones."""
    template_name = 'ratings/trends.html'

class RatingSettingsView(LoginRequiredMixin, TemplateView):
    """Vista de configuración de calificaciones."""
    template_name = 'ratings/settings.html'

class RatingPrivacySettingsView(LoginRequiredMixin, TemplateView):
    """Vista de configuración de privacidad."""
    template_name = 'ratings/privacy_settings.html'

class RatingNotificationSettingsView(LoginRequiredMixin, TemplateView):
    """Vista de configuración de notificaciones."""
    template_name = 'ratings/notification_settings.html'

class SearchRatingsView(TemplateView):
    """Vista de búsqueda de calificaciones."""
    template_name = 'ratings/search.html'

class RatingFiltersView(TemplateView):
    """Vista de filtros de calificaciones."""
    template_name = 'ratings/filters.html'

class ExportRatingsView(LoginRequiredMixin, TemplateView):
    """Vista para exportar calificaciones."""
    template_name = 'ratings/export.html'

class RatingAnalyticsView(LoginRequiredMixin, TemplateView):
    """Vista de análisis de calificaciones."""
    template_name = 'ratings/analytics.html'

class AverageRatingAPIView(TemplateView):
    """API para calificación promedio."""
    
    def get(self, request, *args, **kwargs):
        user_id = kwargs.get('user_id')
        avg_rating = Rating.objects.filter(
            rated_user_id=user_id
        ).aggregate(
            avg=models.Avg('overall_rating')
        )['avg'] or 0
        
        return JsonResponse({'average_rating': round(avg_rating, 1)})

class RatingCountAPIView(TemplateView):
    """API para conteo de calificaciones."""
    
    def get(self, request, *args, **kwargs):
        user_id = kwargs.get('user_id')
        count = Rating.objects.filter(rated_user_id=user_id).count()
        return JsonResponse({'rating_count': count})

class CanRateAPIView(LoginRequiredMixin, TemplateView):
    """API para verificar si se puede calificar."""
    
    def get(self, request, *args, **kwargs):
        return JsonResponse({'can_rate': True})

class SubmitRatingAPIView(LoginRequiredMixin, TemplateView):
    """API para enviar calificación."""
    
    def post(self, request, *args, **kwargs):
        return JsonResponse({'success': True})
