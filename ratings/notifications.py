"""
Sistema de notificaciones automatizado para calificaciones de VeriHome.
Maneja invitaciones, recordatorios y alertas relacionadas con calificaciones.
"""

from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from typing import List, Dict, Any, Optional
import logging

from .models import Rating, RatingInvitation, UserRatingProfile, RatingReport
from users.models import User
from contracts.models import Contract
# from core.models import NotificationTemplate  # Modelo no encontrado, comentado temporalmente

logger = logging.getLogger(__name__)


class RatingNotificationManager:
    """Gestor principal de notificaciones para calificaciones."""
    
    def __init__(self):
        self.base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    
    def send_rating_invitation(self, contract: Contract, inviter: User, invitee: User) -> bool:
        """Envía invitación para calificar después de completar un contrato."""
        try:
            # Crear o actualizar invitación
            invitation, created = RatingInvitation.objects.get_or_create(
                contract=contract,
                inviter=inviter,
                invitee=invitee,
                defaults={
                    'status': 'pending',
                    'expires_at': timezone.now() + timedelta(days=30)
                }
            )
            
            if not created and invitation.status != 'pending':
                return False  # Ya procesada
            
            # Preparar contexto del email
            context = {
                'invitee_name': invitee.get_full_name(),
                'inviter_name': inviter.get_full_name(),
                'contract': contract,
                'property_title': contract.property.title if contract.property else 'Servicio',
                'rating_url': f"{self.base_url}/ratings/create/{invitation.invitation_token}",
                'expires_at': invitation.expires_at,
                'platform_name': 'VeriHome'
            }
            
            # Determinar plantilla según el tipo de usuario
            template_name = self._get_invitation_template(invitee.user_type, inviter.user_type)
            
            # Enviar email
            success = self._send_email(
                recipient=invitee,
                subject=f"Invitación para calificar en {context['platform_name']}",
                template_name=template_name,
                context=context
            )
            
            if success:
                invitation.status = 'sent'
                invitation.sent_at = timezone.now()
                invitation.save()
                
                # Log de actividad
                self._log_notification('rating_invitation_sent', invitee, {
                    'inviter_id': inviter.id,
                    'contract_id': str(contract.id)
                })
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending rating invitation: {str(e)}")
            return False
    
    def send_rating_received_notification(self, rating: Rating) -> bool:
        """Notifica al usuario que ha recibido una nueva calificación."""
        try:
            context = {
                'recipient_name': rating.reviewee.get_full_name(),
                'reviewer_name': rating.reviewer.get_full_name() if not rating.is_anonymous else 'Usuario anónimo',
                'rating': rating,
                'stars_display': rating.get_stars_display(),
                'rating_url': f"{self.base_url}/ratings/{rating.id}",
                'is_anonymous': rating.is_anonymous,
                'platform_name': 'VeriHome'
            }
            
            success = self._send_email(
                recipient=rating.reviewee,
                subject=f"Has recibido una nueva calificación en {context['platform_name']}",
                template_name='ratings/email/rating_received.html',
                context=context
            )
            
            if success:
                self._log_notification('rating_received', rating.reviewee, {
                    'rating_id': str(rating.id),
                    'reviewer_id': rating.reviewer.id
                })
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending rating received notification: {str(e)}")
            return False
    
    def send_rating_response_notification(self, response) -> bool:
        """Notifica al calificador que han respondido a su calificación."""
        try:
            rating = response.rating
            
            context = {
                'reviewer_name': rating.reviewer.get_full_name(),
                'responder_name': response.responder.get_full_name(),
                'rating': rating,
                'response': response,
                'rating_url': f"{self.base_url}/ratings/{rating.id}",
                'platform_name': 'VeriHome'
            }
            
            success = self._send_email(
                recipient=rating.reviewer,
                subject=f"Respuesta a tu calificación en {context['platform_name']}",
                template_name='ratings/email/response_received.html',
                context=context
            )
            
            if success:
                self._log_notification('rating_response_received', rating.reviewer, {
                    'rating_id': str(rating.id),
                    'response_id': str(response.id)
                })
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending rating response notification: {str(e)}")
            return False
    
    def send_milestone_achievement_notification(self, user: User, milestone: str) -> bool:
        """Notifica logros de hitos en calificaciones."""
        try:
            profile = UserRatingProfile.objects.get(user=user)
            
            milestone_data = self._get_milestone_data(milestone, profile)
            if not milestone_data:
                return False
            
            context = {
                'user_name': user.get_full_name(),
                'milestone': milestone_data,
                'profile': profile,
                'profile_url': f"{self.base_url}/profile/{user.id}/ratings",
                'platform_name': 'VeriHome'
            }
            
            success = self._send_email(
                recipient=user,
                subject=f"¡Felicidades! Has alcanzado un nuevo hito en {context['platform_name']}",
                template_name='ratings/email/milestone_achieved.html',
                context=context
            )
            
            if success:
                self._log_notification('milestone_achieved', user, {
                    'milestone': milestone,
                    'total_ratings': profile.total_ratings_received
                })
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending milestone notification: {str(e)}")
            return False
    
    def send_rating_reminder(self, invitation: RatingInvitation) -> bool:
        """Envía recordatorio para calificar."""
        try:
            if invitation.status != 'sent' or invitation.is_expired():
                return False
            
            context = {
                'invitee_name': invitation.invitee.get_full_name(),
                'inviter_name': invitation.inviter.get_full_name(),
                'contract': invitation.contract,
                'property_title': invitation.contract.property.title if invitation.contract.property else 'Servicio',
                'rating_url': f"{self.base_url}/ratings/create/{invitation.invitation_token}",
                'expires_at': invitation.expires_at,
                'days_remaining': (invitation.expires_at - timezone.now()).days,
                'platform_name': 'VeriHome'
            }
            
            success = self._send_email(
                recipient=invitation.invitee,
                subject=f"Recordatorio: Calificación pendiente en {context['platform_name']}",
                template_name='ratings/email/rating_reminder.html',
                context=context
            )
            
            if success:
                self._log_notification('rating_reminder_sent', invitation.invitee, {
                    'invitation_id': str(invitation.id),
                    'contract_id': str(invitation.contract.id)
                })
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending rating reminder: {str(e)}")
            return False
    
    def send_low_rating_alert(self, user: User, recent_rating: Rating) -> bool:
        """Envía alerta al usuario cuando recibe una calificación baja."""
        try:
            if recent_rating.overall_rating > 4:  # Solo para calificaciones 4 o menores
                return False
            
            # Obtener sugerencias de mejora
            from .analytics import RatingRecommendationEngine
            engine = RatingRecommendationEngine()
            suggestions = engine.get_improvement_suggestions(user)
            
            context = {
                'user_name': user.get_full_name(),
                'rating': recent_rating,
                'suggestions': suggestions,
                'support_url': f"{self.base_url}/support",
                'profile_url': f"{self.base_url}/profile/{user.id}/ratings",
                'platform_name': 'VeriHome'
            }
            
            success = self._send_email(
                recipient=user,
                subject=f"Sugerencias para mejorar tu reputación en {context['platform_name']}",
                template_name='ratings/email/low_rating_support.html',
                context=context
            )
            
            if success:
                self._log_notification('low_rating_alert_sent', user, {
                    'rating_id': str(recent_rating.id),
                    'rating_score': recent_rating.overall_rating
                })
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending low rating alert: {str(e)}")
            return False
    
    def send_moderation_alert(self, report: RatingReport) -> bool:
        """Notifica a moderadores sobre reportes de calificaciones."""
        try:
            # Obtener moderadores
            moderators = User.objects.filter(is_staff=True, is_active=True)
            
            context = {
                'report': report,
                'rating': report.rating,
                'reporter_name': report.reporter.get_full_name(),
                'reason_display': report.get_reason_display(),
                'moderation_url': f"{self.base_url}/admin/ratings/rating/{report.rating.id}",
                'platform_name': 'VeriHome'
            }
            
            success_count = 0
            for moderator in moderators:
                success = self._send_email(
                    recipient=moderator,
                    subject=f"Nuevo reporte de calificación - {context['platform_name']}",
                    template_name='ratings/email/moderation_alert.html',
                    context=context
                )
                if success:
                    success_count += 1
            
            if success_count > 0:
                self._log_notification('moderation_alert_sent', None, {
                    'report_id': str(report.id),
                    'rating_id': str(report.rating.id),
                    'moderators_notified': success_count
                })
            
            return success_count > 0
            
        except Exception as e:
            logger.error(f"Error sending moderation alert: {str(e)}")
            return False
    
    def process_automated_notifications(self) -> Dict[str, int]:
        """Procesa notificaciones automáticas programadas."""
        results = {
            'reminders_sent': 0,
            'milestone_notifications': 0,
            'contract_invitations': 0,
            'expired_invitations': 0
        }
        
        try:
            # Enviar recordatorios para invitaciones próximas a expirar
            expiring_invitations = RatingInvitation.objects.filter(
                status='sent',
                expires_at__gte=timezone.now(),
                expires_at__lte=timezone.now() + timedelta(days=3)
            )
            
            for invitation in expiring_invitations:
                if self.send_rating_reminder(invitation):
                    results['reminders_sent'] += 1
            
            # Marcar invitaciones expiradas
            expired_invitations = RatingInvitation.objects.filter(
                status='sent',
                expires_at__lt=timezone.now()
            )
            
            expired_count = expired_invitations.update(status='expired')
            results['expired_invitations'] = expired_count
            
            # Detectar nuevos hitos alcanzados
            results['milestone_notifications'] = self._check_new_milestones()
            
            # Crear invitaciones para contratos recién completados
            results['contract_invitations'] = self._create_contract_invitations()
            
        except Exception as e:
            logger.error(f"Error processing automated notifications: {str(e)}")
        
        return results
    
    def _send_email(self, recipient: User, subject: str, template_name: str, context: Dict[str, Any]) -> bool:
        """Envía email usando plantilla."""
        try:
            # Renderizar contenido HTML
            html_content = render_to_string(template_name, context)
            
            # Renderizar contenido de texto plano
            text_template = template_name.replace('.html', '.txt')
            try:
                text_content = render_to_string(text_template, context)
            except:
                text_content = f"Mensaje de {context.get('platform_name', 'VeriHome')}"
            
            # Enviar email
            send_mail(
                subject=subject,
                message=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient.email],
                html_message=html_content,
                fail_silently=False
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending email to {recipient.email}: {str(e)}")
            return False
    
    def _get_invitation_template(self, invitee_type: str, inviter_type: str) -> str:
        """Determina la plantilla de invitación según los tipos de usuario."""
        templates = {
            ('tenant', 'landlord'): 'ratings/email/tenant_invitation.html',
            ('landlord', 'tenant'): 'ratings/email/landlord_invitation.html',
            ('service_provider', 'tenant'): 'ratings/email/service_provider_invitation.html',
            ('service_provider', 'landlord'): 'ratings/email/service_provider_invitation.html',
            ('tenant', 'service_provider'): 'ratings/email/client_invitation.html',
            ('landlord', 'service_provider'): 'ratings/email/client_invitation.html',
        }
        
        return templates.get((invitee_type, inviter_type), 'ratings/email/generic_invitation.html')
    
    def _get_milestone_data(self, milestone: str, profile: UserRatingProfile) -> Optional[Dict[str, Any]]:
        """Obtiene datos del hito alcanzado."""
        milestones = {
            'first_rating': {
                'title': '¡Primera Calificación!',
                'description': 'Has recibido tu primera calificación en la plataforma.',
                'icon': '⭐',
                'condition': profile.total_ratings_received == 1
            },
            'excellent_rating': {
                'title': 'Excelencia Reconocida',
                'description': 'Has alcanzado un promedio de calificación excelente (9+).',
                'icon': '🌟',
                'condition': profile.average_rating >= 9.0
            },
            'trusted_member': {
                'title': 'Miembro Confiable',
                'description': 'Has recibido 10 o más calificaciones positivas.',
                'icon': '🛡️',
                'condition': profile.total_ratings_received >= 10
            },
            'expert_level': {
                'title': 'Nivel Experto',
                'description': 'Has alcanzado el nivel experto con 50+ calificaciones excelentes.',
                'icon': '🏆',
                'condition': profile.total_ratings_received >= 50 and profile.average_rating >= 8.5
            }
        }
        
        milestone_data = milestones.get(milestone)
        if milestone_data and milestone_data['condition']:
            return milestone_data
        
        return None
    
    def _check_new_milestones(self) -> int:
        """Verifica y notifica nuevos hitos alcanzados."""
        notifications_sent = 0
        
        # Obtener perfiles actualizados recientemente
        recent_profiles = UserRatingProfile.objects.filter(
            last_updated__gte=timezone.now() - timedelta(hours=24)
        )
        
        for profile in recent_profiles:
            # Verificar cada tipo de hito
            milestones_to_check = ['first_rating', 'excellent_rating', 'trusted_member', 'expert_level']
            
            for milestone in milestones_to_check:
                # Aquí podrías implementar lógica para verificar si es un hito nuevo
                # Por simplicidad, verificamos solo las condiciones actuales
                milestone_data = self._get_milestone_data(milestone, profile)
                if milestone_data:
                    if self.send_milestone_achievement_notification(profile.user, milestone):
                        notifications_sent += 1
        
        return notifications_sent
    
    def _create_contract_invitations(self) -> int:
        """Crea invitaciones automáticas para contratos recién completados."""
        invitations_created = 0
        
        # Encontrar contratos completados en las últimas 24 horas sin invitaciones
        completed_contracts = Contract.objects.filter(
            status='completed',
            end_date__gte=timezone.now() - timedelta(days=1),
            rating_invitations__isnull=True
        )
        
        for contract in completed_contracts:
            # Crear invitaciones mutuas
            primary_party = contract.primary_party
            secondary_party = contract.secondary_party
            
            # Invitación del primary al secondary
            if self.send_rating_invitation(contract, primary_party, secondary_party):
                invitations_created += 1
            
            # Invitación del secondary al primary
            if self.send_rating_invitation(contract, secondary_party, primary_party):
                invitations_created += 1
        
        return invitations_created
    
    def _log_notification(self, notification_type: str, user: Optional[User], data: Dict[str, Any]):
        """Registra la notificación en el log de actividades."""
        try:
            from users.models import UserActivityLog
            
            UserActivityLog.objects.create(
                user=user,
                activity_type=f'notification_{notification_type}',
                description=f'Notification sent: {notification_type}',
                details=data,
                performed_by_admin=False
            )
        except Exception as e:
            logger.error(f"Error logging notification: {str(e)}")


class RatingNotificationScheduler:
    """Programador de notificaciones para el sistema de calificaciones."""
    
    def __init__(self):
        self.manager = RatingNotificationManager()
    
    def schedule_daily_notifications(self):
        """Ejecuta notificaciones diarias programadas."""
        logger.info("Starting daily rating notifications...")
        
        results = self.manager.process_automated_notifications()
        
        logger.info(f"Daily notifications completed: {results}")
        return results
    
    def schedule_weekly_summary(self):
        """Envía resumen semanal de calificaciones a usuarios activos."""
        try:
            # Obtener usuarios que han recibido calificaciones esta semana
            week_ago = timezone.now() - timedelta(days=7)
            
            users_with_recent_ratings = User.objects.filter(
                ratings_received__created_at__gte=week_ago,
                ratings_received__is_active=True
            ).distinct()
            
            summaries_sent = 0
            
            for user in users_with_recent_ratings:
                if self._send_weekly_summary(user, week_ago):
                    summaries_sent += 1
            
            logger.info(f"Weekly summaries sent: {summaries_sent}")
            return summaries_sent
            
        except Exception as e:
            logger.error(f"Error sending weekly summaries: {str(e)}")
            return 0
    
    def _send_weekly_summary(self, user: User, week_ago) -> bool:
        """Envía resumen semanal individual."""
        try:
            # Obtener calificaciones de la semana
            recent_ratings = Rating.objects.filter(
                reviewee=user,
                created_at__gte=week_ago,
                is_active=True,
                moderation_status='approved'
            )
            
            if not recent_ratings.exists():
                return False
            
            # Calcular estadísticas
            from django.db.models import Avg
            weekly_avg = recent_ratings.aggregate(avg=Avg('overall_rating'))['avg']
            
            context = {
                'user_name': user.get_full_name(),
                'week_start': week_ago.date(),
                'week_end': timezone.now().date(),
                'total_ratings': recent_ratings.count(),
                'weekly_average': round(weekly_avg, 2) if weekly_avg else 0,
                'ratings': recent_ratings.order_by('-created_at')[:5],  # Top 5 recientes
                'profile_url': f"{self.manager.base_url}/profile/{user.id}/ratings",
                'platform_name': 'VeriHome'
            }
            
            return self.manager._send_email(
                recipient=user,
                subject=f"Tu resumen semanal de calificaciones - {context['platform_name']}",
                template_name='ratings/email/weekly_summary.html',
                context=context
            )
            
        except Exception as e:
            logger.error(f"Error sending weekly summary to {user.email}: {str(e)}")
            return False