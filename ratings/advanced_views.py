"""
Vistas API avanzadas para el sistema de calificaciones de VeriHome.
Incluye analytics, recomendaciones y gestión avanzada.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q, Avg, Count
from django.utils import timezone
from datetime import timedelta
from typing import Dict, Any

from .models import Rating, UserRatingProfile, RatingInvitation, RatingReport
from .analytics import RatingAnalytics, RatingRecommendationEngine
from .notifications import RatingNotificationManager
from .serializers import (
    RatingSerializer, UserRatingProfileSerializer, 
    RatingDetailSerializer, RatingReportSerializer
)
from users.models import User
from contracts.models import Contract


class AdvancedRatingViewSet(viewsets.ModelViewSet):
    """ViewSet avanzado para calificaciones con funcionalidades mejoradas."""
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filtrar calificaciones según el usuario y permisos."""
        user = self.request.user
        
        if user.is_staff:
            return Rating.objects.all().order_by('-created_at')
        
        return Rating.objects.filter(
            Q(reviewer=user) | Q(reviewee=user, is_public=True)
        ).order_by('-created_at')
    
    def get_serializer_class(self):
        """Retorna el serializer apropiado según la acción."""
        if self.action == 'retrieve':
            return RatingDetailSerializer
        return RatingSerializer
    
    @action(detail=False, methods=['post'])
    def bulk_invite(self, request):
        """Invita múltiples usuarios a calificar basado en contratos completados."""
        try:
            notification_manager = RatingNotificationManager()
            
            # Obtener contratos completados del usuario sin calificaciones
            completed_contracts = Contract.objects.filter(
                Q(primary_party=request.user) | Q(secondary_party=request.user),
                status='completed',
                end_date__gte=timezone.now() - timedelta(days=90)  # Últimos 3 meses
            ).exclude(
                ratings__reviewer=request.user
            )
            
            invitations_sent = 0
            errors = []
            
            for contract in completed_contracts:
                other_party = (contract.secondary_party if contract.primary_party == request.user 
                             else contract.primary_party)
                
                try:
                    success = notification_manager.send_rating_invitation(
                        contract=contract,
                        inviter=request.user,
                        invitee=other_party
                    )
                    if success:
                        invitations_sent += 1
                except Exception as e:
                    errors.append(f"Error inviting {other_party.get_full_name()}: {str(e)}")
            
            return Response({
                'invitations_sent': invitations_sent,
                'total_contracts': completed_contracts.count(),
                'errors': errors
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Error processing bulk invitations: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        """Obtiene recomendaciones de usuarios para calificar."""
        try:
            engine = RatingRecommendationEngine()
            recommendations = engine.get_users_to_rate(request.user)
            
            return Response({
                'recommendations': recommendations,
                'count': len(recommendations)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error getting recommendations: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def my_analytics(self, request):
        """Obtiene analíticas personales del usuario."""
        try:
            analytics = RatingAnalytics(user=request.user)
            user_analytics = analytics.get_user_analytics(request.user)
            
            return Response(user_analytics)
            
        except Exception as e:
            return Response(
                {'error': f'Error getting analytics: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def improvement_suggestions(self, request):
        """Obtiene sugerencias de mejora para el usuario."""
        try:
            engine = RatingRecommendationEngine()
            suggestions = engine.get_improvement_suggestions(request.user)
            
            return Response(suggestions)
            
        except Exception as e:
            return Response(
                {'error': f'Error getting suggestions: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def mark_helpful(self, request, pk=None):
        """Marca una calificación como útil."""
        try:
            rating = self.get_object()
            
            # Verificar que el usuario no sea el autor ni el calificado
            if request.user in [rating.reviewer, rating.reviewee]:
                return Response(
                    {'error': 'No puedes marcar como útil tu propia calificación'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Aquí podrías implementar un sistema de votos de utilidad
            # Por ahora, registramos la acción en los logs
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='rating_marked_helpful',
                description=f'Marked rating {rating.id} as helpful',
                details={'rating_id': str(rating.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                performed_by_admin=False
            )
            
            return Response({'message': 'Calificación marcada como útil'})
            
        except Exception as e:
            return Response(
                {'error': f'Error marking rating as helpful: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RatingAnalyticsAPIView(APIView):
    """Vista API para analíticas de calificaciones."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtiene analíticas según los parámetros proporcionados."""
        try:
            # Parámetros de consulta
            analytics_type = getattr(request, "query_params", request.GET).get('type', 'global')
            date_range = int(getattr(request, "query_params", request.GET).get('days', 30))
            user_id = getattr(request, "query_params", request.GET).get('user_id')
            property_id = getattr(request, "query_params", request.GET).get('property_id')
            
            analytics = RatingAnalytics(date_range=date_range)
            
            if analytics_type == 'global' and request.user.is_staff:
                # Solo administradores pueden ver estadísticas globales
                data = analytics.get_global_statistics()
            elif analytics_type == 'user' and user_id:
                target_user = get_object_or_404(User, id=user_id)
                # Verificar permisos para ver analíticas del usuario
                if request.user == target_user or request.user.is_staff:
                    data = analytics.get_user_analytics(target_user)
                else:
                    return Response(
                        {'error': 'No tienes permiso para ver estas analíticas'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            elif analytics_type == 'property' and property_id:
                data = analytics.get_property_analytics(property_id)
            else:
                # Analíticas personales del usuario
                data = analytics.get_user_analytics(request.user)
            
            return Response(data)
            
        except Exception as e:
            return Response(
                {'error': f'Error getting analytics: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RatingModerationAPIView(APIView):
    """Vista API para moderación de calificaciones (solo administradores)."""
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Obtiene elementos que requieren moderación."""
        try:
            # Calificaciones pendientes de moderación
            pending_ratings = Rating.objects.filter(
                moderation_status='pending'
            ).order_by('-created_at')
            
            # Calificaciones reportadas
            flagged_ratings = Rating.objects.filter(
                is_flagged=True
            ).order_by('-created_at')
            
            # Reportes pendientes
            pending_reports = RatingReport.objects.filter(
                status='pending'
            ).order_by('-created_at')
            
            # Detectar patrones sospechosos
            analytics = RatingAnalytics()
            suspicious_patterns = analytics.detect_suspicious_patterns()
            
            data = {
                'pending_ratings': RatingSerializer(pending_ratings, many=True).data,
                'flagged_ratings': RatingSerializer(flagged_ratings, many=True).data,
                'pending_reports': RatingReportSerializer(pending_reports, many=True).data,
                'suspicious_patterns': suspicious_patterns,
                'summary': {
                    'pending_count': pending_ratings.count(),
                    'flagged_count': flagged_ratings.count(),
                    'reports_count': pending_reports.count()
                }
            }
            
            return Response(data)
            
        except Exception as e:
            return Response(
                {'error': f'Error getting moderation data: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Procesa acciones de moderación."""
        try:
            action = request.data.get('action')
            rating_id = request.data.get('rating_id')
            report_id = request.data.get('report_id')
            reason = request.data.get('reason', '')
            
            if action == 'approve_rating' and rating_id:
                rating = get_object_or_404(Rating, id=rating_id)
                rating.moderation_status = 'approved'
                rating.is_flagged = False
                rating.verified_at = timezone.now()
                rating.save()
                
                # Actualizar perfil del usuario
                profile, created = UserRatingProfile.objects.get_or_create(user=rating.reviewee)
                profile.update_statistics()
                
                return Response({'message': 'Calificación aprobada'})
            
            elif action == 'reject_rating' and rating_id:
                rating = get_object_or_404(Rating, id=rating_id)
                rating.moderation_status = 'rejected'
                rating.is_active = False
                rating.save()
                
                return Response({'message': 'Calificación rechazada'})
            
            elif action == 'resolve_report' and report_id:
                report = get_object_or_404(RatingReport, id=report_id)
                report.status = 'resolved'
                report.reviewed_by = request.user
                report.reviewed_at = timezone.now()
                report.resolution_notes = reason
                report.save()
                
                return Response({'message': 'Reporte resuelto'})
            
            else:
                return Response(
                    {'error': 'Acción no válida o parámetros faltantes'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
        except Exception as e:
            return Response(
                {'error': f'Error processing moderation action: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RatingInvitationAPIView(APIView):
    """Vista API para gestión de invitaciones de calificación."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtiene invitaciones del usuario."""
        try:
            # Invitaciones recibidas (pendientes)
            received_invitations = RatingInvitation.objects.filter(
                invitee=request.user,
                status__in=['pending', 'sent']
            ).order_by('-created_at')
            
            # Invitaciones enviadas
            sent_invitations = RatingInvitation.objects.filter(
                inviter=request.user
            ).order_by('-created_at')
            
            data = {
                'received': [{
                    'id': inv.id,
                    'inviter_name': inv.inviter.get_full_name(),
                    'contract_id': inv.contract.id,
                    'property_title': inv.contract.property.title if inv.contract.property else 'Servicio',
                    'created_at': inv.created_at,
                    'expires_at': inv.expires_at,
                    'status': inv.status,
                    'rating_url': f'/ratings/create/{inv.invitation_token}',
                    'is_expired': inv.is_expired()
                } for inv in received_invitations],
                'sent': [{
                    'id': inv.id,
                    'invitee_name': inv.invitee.get_full_name(),
                    'contract_id': inv.contract.id,
                    'property_title': inv.contract.property.title if inv.contract.property else 'Servicio',
                    'created_at': inv.created_at,
                    'expires_at': inv.expires_at,
                    'status': inv.status,
                    'resulting_rating_id': inv.resulting_rating.id if inv.resulting_rating else None
                } for inv in sent_invitations]
            }
            
            return Response(data)
            
        except Exception as e:
            return Response(
                {'error': f'Error getting invitations: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Crea una nueva invitación de calificación."""
        try:
            contract_id = request.data.get('contract_id')
            invitee_id = request.data.get('invitee_id')
            
            if not contract_id or not invitee_id:
                return Response(
                    {'error': 'contract_id y invitee_id son requeridos'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            contract = get_object_or_404(Contract, id=contract_id)
            invitee = get_object_or_404(User, id=invitee_id)
            
            # Verificar que el usuario sea parte del contrato
            if request.user not in [contract.primary_party, contract.secondary_party]:
                return Response(
                    {'error': 'No tienes permiso para crear invitaciones para este contrato'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Verificar que no exista ya una calificación
            existing_rating = Rating.objects.filter(
                reviewer=request.user,
                reviewee=invitee,
                contract=contract
            ).first()
            
            if existing_rating:
                return Response(
                    {'error': 'Ya has calificado a este usuario para este contrato'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Enviar invitación
            notification_manager = RatingNotificationManager()
            success = notification_manager.send_rating_invitation(
                contract=contract,
                inviter=request.user,
                invitee=invitee
            )
            
            if success:
                return Response({'message': 'Invitación enviada correctamente'})
            else:
                return Response(
                    {'error': 'Error al enviar la invitación'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        except Exception as e:
            return Response(
                {'error': f'Error creating invitation: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RatingFromInvitationAPIView(APIView):
    """Vista API para crear calificaciones desde invitaciones."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, token):
        """Obtiene información de la invitación para crear calificación."""
        try:
            invitation = get_object_or_404(
                RatingInvitation, 
                invitation_token=token,
                invitee=request.user
            )
            
            if invitation.status == 'completed':
                return Response(
                    {'error': 'Esta invitación ya fue completada'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if invitation.is_expired():
                invitation.status = 'expired'
                invitation.save()
                return Response(
                    {'error': 'Esta invitación ha expirado'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            data = {
                'invitation_id': invitation.id,
                'inviter': {
                    'id': invitation.inviter.id,
                    'name': invitation.inviter.get_full_name(),
                    'user_type': invitation.inviter.user_type
                },
                'contract': {
                    'id': invitation.contract.id,
                    'property_title': invitation.contract.property.title if invitation.contract.property else 'Servicio',
                    'start_date': invitation.contract.start_date,
                    'end_date': invitation.contract.end_date
                },
                'suggested_categories': self._get_suggested_categories(invitation),
                'expires_at': invitation.expires_at
            }
            
            return Response(data)
            
        except Exception as e:
            return Response(
                {'error': f'Error getting invitation: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request, token):
        """Crea calificación desde invitación."""
        try:
            invitation = get_object_or_404(
                RatingInvitation, 
                invitation_token=token,
                invitee=request.user
            )
            
            if invitation.status == 'completed':
                return Response(
                    {'error': 'Esta invitación ya fue completada'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if invitation.is_expired():
                return Response(
                    {'error': 'Esta invitación ha expirado'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Crear calificación
            rating_data = request.data.copy()
            rating_data.update({
                'reviewer': request.user.id,
                'reviewee': invitation.inviter.id,
                'contract': invitation.contract.id,
                'property': invitation.contract.property.id if invitation.contract.property else None
            })
            
            # Determinar tipo de calificación
            rating_type = self._determine_rating_type(request.user, invitation.inviter)
            rating_data['rating_type'] = rating_type
            
            # Crear la calificación usando el serializer existente
            serializer = RatingDetailSerializer(data=rating_data)
            if serializer.is_valid():
                rating = serializer.save()
                
                # Actualizar invitación
                invitation.status = 'completed'
                invitation.completed_at = timezone.now()
                invitation.resulting_rating = rating
                invitation.save()
                
                # Enviar notificación al calificado
                notification_manager = RatingNotificationManager()
                notification_manager.send_rating_received_notification(rating)
                
                # Actualizar perfil del usuario calificado
                profile, created = UserRatingProfile.objects.get_or_create(user=rating.reviewee)
                profile.update_statistics()
                
                return Response(
                    RatingDetailSerializer(rating).data, 
                    status=status.HTTP_201_CREATED
                )
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response(
                {'error': f'Error creating rating: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_suggested_categories(self, invitation) -> list:
        """Sugiere categorías relevantes según el tipo de contrato."""
        inviter_type = invitation.inviter.user_type
        invitee_type = invitation.invitee.user_type
        
        suggestions = []
        
        if inviter_type == 'landlord' and invitee_type == 'tenant':
            suggestions = ['communication', 'reliability', 'property_condition', 'responsiveness']
        elif inviter_type == 'tenant' and invitee_type == 'landlord':
            suggestions = ['communication', 'cleanliness', 'payment_timeliness', 'reliability']
        elif inviter_type == 'service_provider':
            suggestions = ['professionalism', 'punctuality', 'reliability', 'responsiveness']
        elif invitee_type == 'service_provider':
            suggestions = ['communication', 'payment_timeliness', 'professionalism']
        else:
            suggestions = ['communication', 'reliability', 'professionalism', 'overall']
        
        return suggestions
    
    def _determine_rating_type(self, rater: User, ratee: User) -> str:
        """Determina el tipo de calificación basado en los roles."""
        if rater.user_type == 'landlord' and ratee.user_type == 'tenant':
            return 'landlord_to_tenant'
        elif rater.user_type == 'tenant' and ratee.user_type == 'landlord':
            return 'tenant_to_landlord'
        elif rater.user_type in ['tenant', 'landlord'] and ratee.user_type == 'service_provider':
            return 'client_to_service_provider'
        elif rater.user_type == 'service_provider' and ratee.user_type in ['tenant', 'landlord']:
            return 'service_provider_to_client'
        else:
            return 'general'


class RatingStatsAPIView(APIView):
    """Vista API para estadísticas rápidas de calificaciones."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtiene estadísticas rápidas del usuario."""
        try:
            user = request.user
            
            # Estadísticas básicas
            total_received = Rating.objects.filter(
                reviewee=user,
                is_active=True,
                moderation_status='approved'
            ).count()
            
            total_given = Rating.objects.filter(
                reviewer=user,
                is_active=True
            ).count()
            
            avg_rating = Rating.objects.filter(
                reviewee=user,
                is_active=True,
                moderation_status='approved'
            ).aggregate(avg=Avg('overall_rating'))['avg'] or 0
            
            # Invitaciones pendientes
            pending_invitations = RatingInvitation.objects.filter(
                invitee=user,
                status__in=['pending', 'sent']
            ).count()
            
            # Calificaciones recientes (última semana)
            week_ago = timezone.now() - timedelta(days=7)
            recent_ratings = Rating.objects.filter(
                reviewee=user,
                is_active=True,
                moderation_status='approved',
                created_at__gte=week_ago
            ).count()
            
            data = {
                'total_received': total_received,
                'total_given': total_given,
                'average_rating': round(avg_rating, 2),
                'pending_invitations': pending_invitations,
                'recent_ratings': recent_ratings,
                'reputation_level': self._get_reputation_level(avg_rating, total_received)
            }
            
            return Response(data)
            
        except Exception as e:
            return Response(
                {'error': f'Error getting stats: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_reputation_level(self, avg_rating: float, total_ratings: int) -> str:
        """Determina el nivel de reputación del usuario."""
        if total_ratings == 0:
            return 'Nuevo'
        elif avg_rating >= 9.0 and total_ratings >= 20:
            return 'Experto'
        elif avg_rating >= 8.0 and total_ratings >= 10:
            return 'Avanzado'
        elif avg_rating >= 7.0 and total_ratings >= 5:
            return 'Intermedio'
        elif total_ratings >= 3:
            return 'Principiante'
        else:
            return 'Nuevo'