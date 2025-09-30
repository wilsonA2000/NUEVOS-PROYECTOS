"""
Servicio de notificaciones para VeriHome.
Maneja la creación y envío de notificaciones a usuarios.
"""

from typing import Optional, Dict, Any
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json
import logging

from .models import Notification

User = get_user_model()
logger = logging.getLogger(__name__)


class NotificationService:
    """Servicio centralizado para gestión de notificaciones."""
    
    @staticmethod
    def create_notification(
        user: User,
        notification_type: str,
        title: str,
        message: str,
        priority: str = 'normal',
        action_url: Optional[str] = None,
        action_label: Optional[str] = None,
        related_object: Optional[Any] = None,
        send_email: bool = True,
        send_push: bool = True
    ) -> Notification:
        """
        Crea una notificación para un usuario.
        
        Args:
            user: Usuario destinatario
            notification_type: Tipo de notificación (message, contract, payment, etc.)
            title: Título de la notificación
            message: Mensaje de la notificación
            priority: Prioridad (low, normal, high, urgent)
            action_url: URL de acción opcional
            action_label: Etiqueta del botón de acción
            related_object: Objeto relacionado (Property, Contract, etc.)
            send_email: Si enviar notificación por email
            send_push: Si enviar notificación push
            
        Returns:
            Notificación creada
        """
        try:
            # Preparar datos de la notificación
            notification_data = {
                'user': user,
                'notification_type': notification_type,
                'title': title,
                'message': message,
                'priority': priority,
                'action_url': action_url,
                'action_label': action_label,
            }
            
            # Si hay un objeto relacionado, obtener su content type
            if related_object:
                ct = ContentType.objects.get_for_model(related_object)
                notification_data['content_type'] = ct
                notification_data['object_id'] = str(related_object.pk)
            
            # Crear la notificación
            notification = Notification.objects.create(**notification_data)
            
            # Enviar notificación en tiempo real via WebSocket
            NotificationService._send_websocket_notification(user, notification)
            
            # Enviar email si está configurado
            if send_email and notification_type not in ['system', 'reminder']:
                NotificationService._send_email_notification(user, notification)
            
            # Enviar push si está configurado
            if send_push:
                NotificationService._send_push_notification(user, notification)
            
            logger.info(f"Notificación creada: {notification.id} para usuario {user.email}")
            return notification
            
        except Exception as e:
            logger.error(f"Error creando notificación: {str(e)}")
            raise
    
    @staticmethod
    def _send_websocket_notification(user: User, notification: Notification):
        """Envía notificación por WebSocket."""
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                notification_data = {
                    'id': str(notification.id),
                    'title': notification.title,
                    'message': notification.message,
                    'notification_type': notification.notification_type,
                    'priority': notification.priority,
                    'is_read': notification.is_read,
                    'created_at': notification.created_at.isoformat(),
                    'action_url': notification.action_url,
                    'action_label': notification.action_label,
                }
                
                async_to_sync(channel_layer.group_send)(
                    f'notifications_{user.id}',
                    {
                        'type': 'notification.new',
                        'notification': notification_data
                    }
                )
                logger.info(f"WebSocket notification sent to user {user.id}")
        except Exception as e:
            logger.error(f"Error sending WebSocket notification: {str(e)}")
    
    @staticmethod
    def _send_email_notification(user: User, notification: Notification):
        """Envía notificación por email."""
        try:
            from django.core.mail import send_mail
            from django.template.loader import render_to_string
            from django.conf import settings
            
            # Determinar plantilla según el tipo de notificación
            template_map = {
                'contract': 'core/email/contract_notification.html',
                'message': 'core/email/message_notification.html',
                'payment': 'core/email/payment_notification.html',
                'property': 'core/email/property_notification.html',
                'rating': 'core/email/rating_notification.html',
                'verification': 'core/email/verification_notification.html',
                'welcome': 'core/email/welcome_notification.html',
                'system': 'core/email/system_notification.html'
            }
            
            template_name = template_map.get(
                notification.notification_type, 
                'core/email/generic_notification.html'
            )
            
            # Preparar contexto para el email
            context = {
                'user': user,
                'user_name': user.get_full_name() or user.first_name or user.email.split('@')[0],
                'notification': notification,
                'title': notification.title,
                'message': notification.message,
                'action_url': notification.action_url,
                'action_label': notification.action_label,
                'platform_name': 'VeriHome',
                'base_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:5173'),
                'current_year': timezone.now().year
            }
            
            # Renderizar contenido HTML
            html_content = render_to_string(template_name, context)
            
            # Renderizar contenido de texto plano
            text_template = template_name.replace('.html', '.txt')
            try:
                text_content = render_to_string(text_template, context)
            except:
                # Fallback a texto plano básico
                text_content = f"""{notification.title}

{notification.message}

{notification.action_label or 'Ver más'}: {notification.action_url or context['base_url']}

---
VeriHome - {context['current_year']}"""
            
            # Enviar email
            send_mail(
                subject=notification.title,
                message=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_content,
                fail_silently=False
            )
            
            logger.info(f"Email notification sent to {user.email} for {notification.notification_type}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email notification to {user.email}: {str(e)}")
            return False
    
    @staticmethod
    def _send_push_notification(user: User, notification: Notification):
        """Envía notificación push al navegador."""
        # TODO: Implementar push notifications
        pass
    
    # Métodos de conveniencia para tipos específicos de notificaciones
    
    @staticmethod
    def notify_new_message(sender: User, recipient: User, message_preview: str):
        """Notifica sobre un nuevo mensaje."""
        return NotificationService.create_notification(
            user=recipient,
            notification_type='message',
            title=f'Nuevo mensaje de {sender.get_full_name()}',
            message=message_preview[:100] + '...' if len(message_preview) > 100 else message_preview,
            priority='normal',
            action_url='/app/messages',
            action_label='Ver Mensaje'
        )
    
    @staticmethod
    def notify_contract_update(user: User, contract: Any, status: str):
        """Notifica sobre actualización de contrato."""
        status_messages = {
            'pending': 'está pendiente de firma',
            'active': 'ha sido activado',
            'expired': 'ha expirado',
            'terminated': 'ha sido terminado'
        }
        
        return NotificationService.create_notification(
            user=user,
            notification_type='contract',
            title='Actualización de Contrato',
            message=f'Tu contrato {status_messages.get(status, "ha sido actualizado")}',
            priority='high' if status in ['expired', 'terminated'] else 'normal',
            action_url=f'/app/contracts/{contract.id}',
            action_label='Ver Contrato',
            related_object=contract
        )
    
    @staticmethod
    def notify_payment_received(landlord: User, amount: float, property_name: str):
        """Notifica sobre pago recibido."""
        return NotificationService.create_notification(
            user=landlord,
            notification_type='payment',
            title='Pago Recibido',
            message=f'Has recibido un pago de ${amount:,.2f} por {property_name}',
            priority='normal',
            action_url='/app/payments',
            action_label='Ver Pagos'
        )
    
    @staticmethod
    def notify_payment_due(tenant: User, amount: float, due_date: str):
        """Notifica sobre pago pendiente."""
        return NotificationService.create_notification(
            user=tenant,
            notification_type='payment',
            title='Pago Pendiente',
            message=f'Tienes un pago de ${amount:,.2f} pendiente para {due_date}',
            priority='high',
            action_url='/app/payments',
            action_label='Pagar Ahora'
        )
    
    @staticmethod
    def notify_new_property_match(user: User, property_name: str, property_id: str):
        """Notifica sobre nueva propiedad que coincide con criterios."""
        return NotificationService.create_notification(
            user=user,
            notification_type='property',
            title='Nueva Propiedad Disponible',
            message=f'{property_name} coincide con tus criterios de búsqueda',
            priority='normal',
            action_url=f'/app/properties/{property_id}',
            action_label='Ver Propiedad'
        )
    
    @staticmethod
    def notify_rating_received(user: User, rating: int, from_user: str):
        """Notifica sobre nueva calificación recibida."""
        return NotificationService.create_notification(
            user=user,
            notification_type='rating',
            title='Nueva Calificación',
            message=f'{from_user} te ha calificado con {rating} estrellas',
            priority='normal',
            action_url='/app/profile/ratings',
            action_label='Ver Calificaciones'
        )
    
    @staticmethod
    def notify_verification_complete(user: User):
        """Notifica que la verificación está completa."""
        return NotificationService.create_notification(
            user=user,
            notification_type='verification',
            title='¡Verificación Completa!',
            message='Tu cuenta ha sido verificada exitosamente',
            priority='high',
            action_url='/app/profile',
            action_label='Ver Perfil'
        )
    
    @staticmethod
    def notify_welcome(user: User):
        """Notificación de bienvenida."""
        return NotificationService.create_notification(
            user=user,
            notification_type='welcome',
            title='¡Bienvenido a VeriHome!',
            message='Gracias por unirte a nuestra comunidad. Completa tu perfil para comenzar.',
            priority='normal',
            action_url='/app/profile',
            action_label='Completar Perfil',
            send_email=True
        )
    
    # ===================================================================
    # NOTIFICACIONES ESPECIALIZADAS PARA CONTRATOS
    # ===================================================================
    
    @staticmethod
    def notify_contract_draft_created(landlord: User, contract: Any):
        """Notifica al arrendador que su borrador ha sido creado."""
        return NotificationService.create_notification(
            user=landlord,
            notification_type='contract',
            title='Borrador de Contrato Creado',
            message=f'Tu borrador de contrato para {contract.property.title if hasattr(contract, "property") else "la propiedad"} ha sido guardado exitosamente.',
            priority='normal',
            action_url=f'/app/contracts/landlord/{contract.id}',
            action_label='Ver Borrador',
            related_object=contract,
            send_email=False  # Solo notificación en app
        )
    
    @staticmethod
    def notify_tenant_invited(tenant: User, contract: Any, landlord: User):
        """Notifica al arrendatario que ha sido invitado a revisar un contrato."""
        return NotificationService.create_notification(
            user=tenant,
            notification_type='contract',
            title='Invitación a Revisar Contrato',
            message=f'{landlord.get_full_name()} te ha invitado a revisar un contrato de arrendamiento. Tienes 72 horas para responder.',
            priority='high',
            action_url=f'/app/contracts/tenant/review/{contract.id}',
            action_label='Revisar Contrato',
            related_object=contract,
            send_email=True
        )
    
    @staticmethod
    def notify_contract_objection_submitted(landlord: User, contract: Any, tenant: User, objection_count: int):
        """Notifica al arrendador sobre objeciones del arrendatario."""
        plural = 'es' if objection_count > 1 else ''
        return NotificationService.create_notification(
            user=landlord,
            notification_type='contract',
            title=f'Objecion{plural} Recibida{plural}',
            message=f'{tenant.get_full_name()} ha enviado {objection_count} objeción{plural} a tu contrato. Revisa y responde para continuar.',
            priority='high',
            action_url=f'/app/contracts/landlord/{contract.id}/objections',
            action_label='Ver Objeciones',
            related_object=contract,
            send_email=True
        )
    
    @staticmethod
    def notify_objections_resolved(tenant: User, contract: Any, landlord: User):
        """Notifica al arrendatario que sus objeciones han sido resueltas."""
        return NotificationService.create_notification(
            user=tenant,
            notification_type='contract',
            title='Objeciones Resueltas',
            message=f'{landlord.get_full_name()} ha actualizado el contrato basado en tus objeciones. Por favor revisa los cambios.',
            priority='normal',
            action_url=f'/app/contracts/tenant/review/{contract.id}',
            action_label='Revisar Cambios',
            related_object=contract,
            send_email=True
        )
    
    @staticmethod
    def notify_contract_accepted_by_tenant(landlord: User, contract: Any, tenant: User):
        """Notifica al arrendador que el arrendatario aceptó el contrato."""
        return NotificationService.create_notification(
            user=landlord,
            notification_type='contract',
            title='Contrato Aceptado',
            message=f'{tenant.get_full_name()} ha aceptado tu contrato. Ahora puede proceder con las firmas digitales.',
            priority='high',
            action_url=f'/app/contracts/landlord/{contract.id}/signatures',
            action_label='Gestionar Firmas',
            related_object=contract,
            send_email=True
        )
    
    @staticmethod
    def notify_signature_request(user: User, contract: Any, requester: User, signature_type: str = 'digital'):
        """Notifica sobre solicitud de firma."""
        type_display = 'biométrica' if signature_type == 'biometric' else 'digital'
        return NotificationService.create_notification(
            user=user,
            notification_type='contract',
            title=f'Solicitud de Firma {type_display.title()}',
            message=f'{requester.get_full_name()} solicita tu firma {type_display} para completar el contrato.',
            priority='high',
            action_url=f'/app/contracts/sign/{contract.id}',
            action_label='Firmar Ahora',
            related_object=contract,
            send_email=True
        )
    
    @staticmethod
    def notify_contract_fully_signed(user: User, contract: Any):
        """Notifica que el contrato ha sido firmado por todas las partes."""
        return NotificationService.create_notification(
            user=user,
            notification_type='contract',
            title='¡Contrato Completado!',
            message='Tu contrato ha sido firmado por todas las partes y está ahora activo. Puedes descargar la copia final.',
            priority='high',
            action_url=f'/app/contracts/{contract.id}/download',
            action_label='Descargar Contrato',
            related_object=contract,
            send_email=True
        )
    
    @staticmethod
    def notify_contract_published(tenant: User, contract: Any, landlord: User):
        """Notifica al arrendatario que el contrato ha sido publicado y está activo."""
        return NotificationService.create_notification(
            user=tenant,
            notification_type='contract',
            title='Contrato Activo',
            message=(f'Tu contrato con {landlord.get_full_name()} está ahora activo. '
                    'Puedes acceder a todos los servicios de la plataforma.'),
            priority='normal',
            action_url=f'/app/contracts/{contract.id}',
            action_label='Ver Contrato',
            related_object=contract,
            send_email=True
        )
    
    @staticmethod
    def notify_contract_expiring(user: User, contract: Any, days_until_expiry: int):
        """Notifica sobre contrato próximo a expirar."""
        return NotificationService.create_notification(
            user=user,
            notification_type='contract',
            title='Contrato Próximo a Expirar',
            message=f'Tu contrato expira en {days_until_expiry} días. Considera renovar o hacer los arreglos necesarios.',
            priority='high' if days_until_expiry <= 7 else 'normal',
            action_url=f'/app/contracts/{contract.id}/renewal',
            action_label='Gestionar Renovación',
            related_object=contract,
            send_email=True
        )
    
    @staticmethod
    def notify_contract_terminated(user: User, contract: Any, terminator: User, reason: str = ''):
        """Notifica sobre terminación de contrato."""
        terminator_name = 'El sistema' if terminator == user else terminator.get_full_name()
        reason_text = f' Motivo: {reason}' if reason else ''
        
        return NotificationService.create_notification(
            user=user,
            notification_type='contract',
            title='Contrato Terminado',
            message=f'{terminator_name} ha terminado tu contrato.{reason_text} Revisa los detalles y próximos pasos.',
            priority='urgent',
            action_url=f'/app/contracts/{contract.id}/termination',
            action_label='Ver Detalles',
            related_object=contract,
            send_email=True
        )


# Instancia global del servicio
notification_service = NotificationService()