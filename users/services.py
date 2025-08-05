"""
Servicios para el sistema de administración y notificaciones.
"""

from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth import get_user_model
from .models import (
    AdminActionLog, UserActionNotification, UserActivityLog,
    AdminSessionSummary
)

User = get_user_model()


class AdminActionLogger:
    """Servicio para registrar acciones administrativas de forma detallada."""
    
    def __init__(self, impersonation_session):
        self.impersonation_session = impersonation_session
        self.request = None
    
    def log_action(self, action_type, description, target_object=None, 
                   old_data=None, new_data=None, changed_fields=None, 
                   success=True, error_message='', notify_user=True):
        """Registrar una acción administrativa."""
        
        # Preparar datos del objeto objetivo
        target_object_type = ''
        target_object_id = ''
        target_object_name = ''
        
        if target_object:
            target_object_type = target_object.__class__.__name__
            target_object_id = str(target_object.id)
            if hasattr(target_object, 'title'):
                target_object_name = target_object.title
            elif hasattr(target_object, 'name'):
                target_object_name = target_object.name
            elif hasattr(target_object, 'get_full_name'):
                target_object_name = target_object.get_full_name()
        
        # Crear el registro de acción
        action_log = AdminActionLog.objects.create(
            impersonation_session=self.impersonation_session,
            action_type=action_type,
            action_description=description,
            target_object_type=target_object_type,
            target_object_id=target_object_id,
            target_object_name=target_object_name,
            old_data=old_data or {},
            new_data=new_data or {},
            changed_fields=changed_fields or [],
            ip_address=self._get_client_ip(),
            user_agent=self._get_user_agent(),
            success=success,
            error_message=error_message,
            notify_user=notify_user
        )
        
        # Crear registro de actividad para el usuario
        if target_object and hasattr(target_object, 'user'):
            self._create_user_activity_log(target_object.user, action_log)
        
        # Enviar notificación si es necesario
        if notify_user and success:
            self._send_user_notification(action_log)
        
        return action_log
    
    def _get_client_ip(self):
        """Obtener IP del cliente."""
        if hasattr(self.impersonation_session, 'ip_address'):
            return self.impersonation_session.ip_address
        return '0.0.0.0'
    
    def _get_user_agent(self):
        """Obtener User Agent."""
        if hasattr(self.impersonation_session, 'user_agent'):
            return self.impersonation_session.user_agent
        return ''
    
    def _create_user_activity_log(self, user, admin_action):
        """Crear registro de actividad para el usuario."""
        UserActivityLog.objects.create(
            user=user,
            admin_action=admin_action,
            activity_type=admin_action.action_type,
            description=admin_action.action_description,
            details={
                'admin_user': admin_action.impersonation_session.admin_user.get_full_name(),
                'action_type': admin_action.get_action_type_display(),
                'changes': admin_action.get_changes_summary(),
            },
            ip_address=admin_action.ip_address,
            user_agent=admin_action.user_agent,
            performed_by_admin=True,
            admin_user=admin_action.impersonation_session.admin_user
        )
    
    def _send_user_notification(self, admin_action):
        """Enviar notificación al usuario sobre la acción administrativa."""
        try:
            # Determinar el usuario a notificar
            user_to_notify = None
            if admin_action.target_object_type == 'User':
                user_to_notify = User.objects.get(id=admin_action.target_object_id)
            elif hasattr(admin_action, 'target_object') and admin_action.target_object:
                if hasattr(admin_action.target_object, 'user'):
                    user_to_notify = admin_action.target_object.user
                elif hasattr(admin_action.target_object, 'primary_party'):
                    user_to_notify = admin_action.target_object.primary_party
            
            if not user_to_notify:
                return
            
            # Crear notificación
            notification = UserActionNotification.objects.create(
                user=user_to_notify,
                admin_action=admin_action,
                notification_type='email',
                title=f"Acción administrativa en tu cuenta - {admin_action.get_action_type_display()}",
                message=self._generate_notification_message(admin_action),
                summary=admin_action.action_description[:200]
            )
            
            # Enviar email
            self._send_email_notification(notification)
            
        except Exception as e:
            print(f"Error enviando notificación: {e}")
    
    def _generate_notification_message(self, admin_action):
        """Generar mensaje detallado para la notificación."""
        context = admin_action.get_action_context()
        
        message = f"""
        Hola {context['impersonated_user']},
        
        Se ha realizado una acción administrativa en tu cuenta:
        
        **Tipo de acción:** {context['action_type']}
        **Descripción:** {context['description']}
        **Administrador:** {context['admin_user']}
        **Fecha y hora:** {context['timestamp'].strftime('%d/%m/%Y %H:%M:%S')}
        **IP del administrador:** {context['ip_address']}
        
        """
        
        if context['changes'] != "Sin cambios específicos registrados":
            message += f"**Cambios realizados:** {context['changes']}\n\n"
        
        message += """
        Si no reconoces esta acción o tienes alguna pregunta, por favor contacta al soporte técnico.
        
        Saludos,
        Equipo de VeriHome
        """
        
        return message
    
    def _send_email_notification(self, notification):
        """Enviar notificación por email."""
        try:
            subject = notification.title
            message = notification.message
            from_email = settings.DEFAULT_FROM_EMAIL
            recipient_list = [notification.user.email]
            
            # Enviar email
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=recipient_list,
                fail_silently=False
            )
            
            # Marcar como enviada
            notification.mark_as_sent()
            
        except Exception as e:
            notification.status = 'failed'
            notification.error_message = str(e)
            notification.save()


class UserActivityService:
    """Servicio para gestionar la actividad del usuario."""
    
    @staticmethod
    def get_user_activity_summary(user, days=30):
        """Obtener resumen de actividad del usuario."""
        from datetime import timedelta
        
        start_date = timezone.now() - timedelta(days=days)
        
        activities = UserActivityLog.objects.filter(
            user=user,
            timestamp__gte=start_date
        ).order_by('-timestamp')
        
        # Estadísticas
        total_activities = activities.count()
        admin_activities = activities.filter(performed_by_admin=True).count()
        user_activities = total_activities - admin_activities
        
        # Actividades por tipo
        activity_types = activities.values('activity_type').annotate(
            count=Count('activity_type')
        ).order_by('-count')
        
        # Actividades recientes
        recent_activities = activities[:10]
        
        return {
            'total_activities': total_activities,
            'admin_activities': admin_activities,
            'user_activities': user_activities,
            'activity_types': activity_types,
            'recent_activities': recent_activities,
            'period_days': days
        }
    
    @staticmethod
    def get_admin_actions_on_user(user, days=30):
        """Obtener todas las acciones administrativas realizadas sobre un usuario."""
        from datetime import timedelta
        
        start_date = timezone.now() - timedelta(days=days)
        
        return AdminActionLog.objects.filter(
            impersonation_session__impersonated_user=user,
            timestamp__gte=start_date
        ).select_related(
            'impersonation_session__admin_user'
        ).order_by('-timestamp')
    
    @staticmethod
    def get_user_notifications(user, unread_only=False):
        """Obtener notificaciones del usuario."""
        notifications = UserActionNotification.objects.filter(user=user)
        
        if unread_only:
            notifications = notifications.filter(is_read=False)
        
        return notifications.order_by('-created_at')


class AdminSessionService:
    """Servicio para gestionar sesiones administrativas."""
    
    @staticmethod
    def create_session_summary(impersonation_session):
        """Crear resumen de una sesión de impersonación."""
        summary, created = AdminSessionSummary.objects.get_or_create(
            impersonation_session=impersonation_session
        )
        
        if created:
            summary.calculate_statistics()
        
        return summary
    
    @staticmethod
    def get_admin_session_stats(admin_user, days=30):
        """Obtener estadísticas de sesiones de un administrador."""
        from datetime import timedelta
        
        start_date = timezone.now() - timedelta(days=days)
        
        sessions = AdminImpersonationSession.objects.filter(
            admin_user=admin_user,
            started_at__gte=start_date
        )
        
        total_sessions = sessions.count()
        total_duration = sum(
            (s.ended_at - s.started_at) if s.ended_at else timezone.now() - s.started_at
            for s in sessions
        )
        
        # Acciones por sesión
        total_actions = sum(
            s.actions.count() for s in sessions
        )
        
        # Usuarios impersonados
        unique_users = sessions.values('impersonated_user').distinct().count()
        
        return {
            'total_sessions': total_sessions,
            'total_duration': total_duration,
            'total_actions': total_actions,
            'unique_users': unique_users,
            'average_actions_per_session': total_actions / total_sessions if total_sessions > 0 else 0,
            'average_session_duration': total_duration / total_sessions if total_sessions > 0 else 0,
        }
    
    @staticmethod
    def get_impersonation_history(user):
        """Obtener historial de impersonaciones de un usuario."""
        return AdminImpersonationSession.objects.filter(
            impersonated_user=user
        ).select_related(
            'admin_user'
        ).prefetch_related(
            'actions'
        ).order_by('-started_at')


class NotificationService:
    """Servicio para gestionar notificaciones."""
    
    @staticmethod
    def send_bulk_notifications(notifications):
        """Enviar múltiples notificaciones."""
        for notification in notifications:
            try:
                if notification.notification_type == 'email':
                    NotificationService._send_email_notification(notification)
                elif notification.notification_type == 'sms':
                    NotificationService._send_sms_notification(notification)
                elif notification.notification_type == 'in_app':
                    NotificationService._send_in_app_notification(notification)
            except Exception as e:
                notification.status = 'failed'
                notification.error_message = str(e)
                notification.save()
    
    @staticmethod
    def _send_email_notification(notification):
        """Enviar notificación por email."""
        subject = notification.title
        message = notification.message
        from_email = settings.DEFAULT_FROM_EMAIL
        recipient_list = [notification.user.email]
        
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            fail_silently=False
        )
        
        notification.mark_as_sent()
    
    @staticmethod
    def _send_sms_notification(notification):
        """Enviar notificación por SMS (implementar según proveedor)."""
        # Implementar según el proveedor de SMS
        notification.mark_as_sent()
    
    @staticmethod
    def _send_in_app_notification(notification):
        """Enviar notificación en la aplicación."""
        # Implementar notificaciones en tiempo real
        notification.mark_as_sent() 