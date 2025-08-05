"""
Gestores de canales de notificación para VeriHome.
Implementa diferentes canales: email, SMS, push, in-app, etc.
"""

from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import logging
import json
import requests

from .models import NotificationChannel, Notification, NotificationDelivery

logger = logging.getLogger(__name__)


class BaseNotificationChannel(ABC):
    """Clase base para canales de notificación."""
    
    def __init__(self, channel: NotificationChannel):
        self.channel = channel
        self.config = channel.configuration or {}
    
    @abstractmethod
    def send(self, notification: Notification, delivery: NotificationDelivery) -> Dict[str, Any]:
        """
        Envía una notificación a través del canal.
        
        Args:
            notification: Notificación a enviar
            delivery: Registro de entrega
        
        Returns:
            Dict con resultado del envío
        """
        pass
    
    def is_available(self) -> bool:
        """Verifica si el canal está disponible."""
        return self.channel.is_available()
    
    def validate_config(self) -> bool:
        """Valida la configuración del canal."""
        return True


class EmailNotificationChannel(BaseNotificationChannel):
    """Canal de notificaciones por email."""
    
    def send(self, notification: Notification, delivery: NotificationDelivery) -> Dict[str, Any]:
        """Envía notificación por email."""
        try:
            recipient_email = notification.recipient.email
            if not recipient_email:
                return {
                    'success': False,
                    'error': 'User has no email address'
                }
            
            # Preparar contenido
            subject = self._get_subject(notification)
            html_content = self._get_html_content(notification)
            text_content = self._get_text_content(notification)
            
            # Configurar remitente
            from_email = self.config.get('from_email', settings.DEFAULT_FROM_EMAIL)
            
            # Enviar email
            send_mail(
                subject=subject,
                message=text_content,
                from_email=from_email,
                recipient_list=[recipient_email],
                html_message=html_content,
                fail_silently=False
            )
            
            return {
                'success': True,
                'sent_to': recipient_email,
                'external_id': f"email_{notification.id}",
                'response_data': {
                    'subject': subject,
                    'from_email': from_email
                }
            }
            
        except Exception as e:
            logger.error(f"Error sending email notification: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_subject(self, notification: Notification) -> str:
        """Obtiene el asunto del email."""
        if notification.template and notification.template.subject:
            return notification.template.subject
        return f"[VeriHome] {notification.title}"
    
    def _get_html_content(self, notification: Notification) -> str:
        """Obtiene el contenido HTML del email."""
        try:
            # Usar plantilla HTML si está disponible
            if notification.template and notification.template.content_html:
                return notification.template.content_html
            
            # Usar plantilla por defecto
            context = {
                'notification': notification,
                'recipient_name': notification.recipient.get_full_name(),
                'platform_name': 'VeriHome',
                'action_url': notification.action_url,
                'unsubscribe_url': self._get_unsubscribe_url(notification.recipient)
            }
            
            return render_to_string('notifications/email/default.html', context)
            
        except Exception as e:
            logger.error(f"Error rendering HTML email content: {str(e)}")
            return self._get_fallback_html(notification)
    
    def _get_text_content(self, notification: Notification) -> str:
        """Obtiene el contenido de texto plano del email."""
        try:
            if notification.template and notification.template.content_text:
                return notification.template.content_text
            
            # Contenido básico de texto
            content = f"""
{notification.title}

{notification.message}

---
VeriHome - Plataforma Inmobiliaria
            """.strip()
            
            if notification.action_url:
                content += f"\n\nVer más: {notification.action_url}"
            
            return content
            
        except Exception as e:
            logger.error(f"Error rendering text email content: {str(e)}")
            return notification.message
    
    def _get_fallback_html(self, notification: Notification) -> str:
        """Obtiene HTML básico como fallback."""
        return f"""
        <html>
        <body>
            <h2>{notification.title}</h2>
            <p>{notification.message}</p>
            {f'<p><a href="{notification.action_url}">Ver más</a></p>' if notification.action_url else ''}
            <hr>
            <small>VeriHome - Plataforma Inmobiliaria</small>
        </body>
        </html>
        """
    
    def _get_unsubscribe_url(self, user) -> str:
        """Obtiene URL de cancelación de suscripción."""
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        return f"{base_url}/settings/notifications"
    
    def validate_config(self) -> bool:
        """Valida configuración del canal de email."""
        required_settings = ['EMAIL_HOST', 'EMAIL_PORT', 'DEFAULT_FROM_EMAIL']
        return all(hasattr(settings, setting) for setting in required_settings)


class SMSNotificationChannel(BaseNotificationChannel):
    """Canal de notificaciones por SMS."""
    
    def send(self, notification: Notification, delivery: NotificationDelivery) -> Dict[str, Any]:
        """Envía notificación por SMS."""
        try:
            # Obtener número de teléfono del usuario
            phone_number = self._get_user_phone(notification.recipient)
            if not phone_number:
                return {
                    'success': False,
                    'error': 'User has no phone number'
                }
            
            # Preparar mensaje SMS
            message = self._prepare_sms_message(notification)
            
            # Enviar según el proveedor configurado
            provider = self.config.get('provider', 'twilio')
            
            if provider == 'twilio':
                return self._send_via_twilio(phone_number, message, notification)
            elif provider == 'aws_sns':
                return self._send_via_aws_sns(phone_number, message, notification)
            else:
                return {
                    'success': False,
                    'error': f'Unsupported SMS provider: {provider}'
                }
                
        except Exception as e:
            logger.error(f"Error sending SMS notification: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_user_phone(self, user) -> Optional[str]:
        """Obtiene el número de teléfono del usuario."""
        # Buscar en diferentes campos posibles
        phone_fields = ['phone', 'phone_number', 'mobile', 'celular']
        
        for field in phone_fields:
            if hasattr(user, field):
                phone = getattr(user, field)
                if phone:
                    return self._format_phone_number(phone)
        
        return None
    
    def _format_phone_number(self, phone: str) -> str:
        """Formatea el número de teléfono para Colombia."""
        # Eliminar caracteres no numéricos
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # Agregar código de país si no lo tiene
        if len(clean_phone) == 10 and clean_phone.startswith('3'):
            return f"+57{clean_phone}"
        elif len(clean_phone) == 12 and clean_phone.startswith('57'):
            return f"+{clean_phone}"
        elif clean_phone.startswith('+'):
            return phone
        
        return f"+57{clean_phone}"
    
    def _prepare_sms_message(self, notification: Notification) -> str:
        """Prepara el mensaje SMS (máximo 160 caracteres)."""
        message = f"VeriHome: {notification.title}"
        
        # Truncar si es muy largo
        if len(message) > 140:
            message = message[:137] + "..."
        
        # Agregar URL corta si está disponible
        if notification.action_url and len(message) < 120:
            short_url = self._shorten_url(notification.action_url)
            message += f" {short_url}"
        
        return message
    
    def _shorten_url(self, url: str) -> str:
        """Acorta una URL (implementación básica)."""
        # En una implementación real, usar un servicio como bit.ly
        return url[:30] + "..." if len(url) > 30 else url
    
    def _send_via_twilio(self, phone: str, message: str, notification: Notification) -> Dict[str, Any]:
        """Envía SMS via Twilio."""
        try:
            from twilio.rest import Client
            
            account_sid = self.config.get('twilio_account_sid')
            auth_token = self.config.get('twilio_auth_token')
            from_number = self.config.get('twilio_from_number')
            
            if not all([account_sid, auth_token, from_number]):
                return {
                    'success': False,
                    'error': 'Twilio configuration incomplete'
                }
            
            client = Client(account_sid, auth_token)
            
            message_obj = client.messages.create(
                body=message,
                from_=from_number,
                to=phone
            )
            
            return {
                'success': True,
                'sent_to': phone,
                'external_id': message_obj.sid,
                'response_data': {
                    'provider': 'twilio',
                    'status': message_obj.status,
                    'price': message_obj.price
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Twilio error: {str(e)}'
            }
    
    def _send_via_aws_sns(self, phone: str, message: str, notification: Notification) -> Dict[str, Any]:
        """Envía SMS via AWS SNS."""
        try:
            import boto3
            
            region = self.config.get('aws_region', 'us-east-1')
            access_key = self.config.get('aws_access_key_id')
            secret_key = self.config.get('aws_secret_access_key')
            
            sns = boto3.client(
                'sns',
                region_name=region,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key
            )
            
            response = sns.publish(
                PhoneNumber=phone,
                Message=message
            )
            
            return {
                'success': True,
                'sent_to': phone,
                'external_id': response['MessageId'],
                'response_data': {
                    'provider': 'aws_sns',
                    'response': response
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'AWS SNS error: {str(e)}'
            }


class PushNotificationChannel(BaseNotificationChannel):
    """Canal de notificaciones push."""
    
    def send(self, notification: Notification, delivery: NotificationDelivery) -> Dict[str, Any]:
        """Envía notificación push."""
        try:
            # Obtener tokens de dispositivos del usuario
            device_tokens = self._get_user_device_tokens(notification.recipient)
            
            if not device_tokens:
                return {
                    'success': False,
                    'error': 'User has no registered devices'
                }
            
            # Preparar payload de la notificación
            payload = self._prepare_push_payload(notification)
            
            # Enviar según el proveedor
            provider = self.config.get('provider', 'firebase')
            
            if provider == 'firebase':
                return self._send_via_firebase(device_tokens, payload, notification)
            elif provider == 'onesignal':
                return self._send_via_onesignal(device_tokens, payload, notification)
            else:
                return {
                    'success': False,
                    'error': f'Unsupported push provider: {provider}'
                }
                
        except Exception as e:
            logger.error(f"Error sending push notification: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_user_device_tokens(self, user) -> list:
        """Obtiene tokens de dispositivos del usuario."""
        # En una implementación real, obtener de un modelo de dispositivos
        # Por ahora, devolver una lista vacía
        return []
    
    def _prepare_push_payload(self, notification: Notification) -> Dict[str, Any]:
        """Prepara el payload para la notificación push."""
        payload = {
            'title': notification.title,
            'body': notification.message[:100],  # Limitar longitud
            'data': {
                'notification_id': str(notification.id),
                'action_url': notification.action_url,
                'deep_link': notification.deep_link,
                'priority': notification.priority,
                **notification.data
            }
        }
        
        # Configuraciones adicionales
        if notification.priority in ['urgent', 'critical']:
            payload['priority'] = 'high'
            payload['data']['sound'] = 'urgent.wav'
        
        return payload
    
    def _send_via_firebase(self, tokens: list, payload: Dict, notification: Notification) -> Dict[str, Any]:
        """Envía push via Firebase Cloud Messaging."""
        try:
            from firebase_admin import messaging
            
            # Crear mensaje FCM
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=payload['title'],
                    body=payload['body']
                ),
                data=payload['data'],
                tokens=tokens
            )
            
            # Enviar
            response = messaging.send_multicast(message)
            
            return {
                'success': response.success_count > 0,
                'sent_to': f"{response.success_count}/{len(tokens)} devices",
                'external_id': f"fcm_{notification.id}",
                'response_data': {
                    'provider': 'firebase',
                    'success_count': response.success_count,
                    'failure_count': response.failure_count,
                    'responses': [r.__dict__ for r in response.responses]
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Firebase error: {str(e)}'
            }
    
    def _send_via_onesignal(self, tokens: list, payload: Dict, notification: Notification) -> Dict[str, Any]:
        """Envía push via OneSignal."""
        try:
            app_id = self.config.get('onesignal_app_id')
            api_key = self.config.get('onesignal_api_key')
            
            if not app_id or not api_key:
                return {
                    'success': False,
                    'error': 'OneSignal configuration incomplete'
                }
            
            headers = {
                'Authorization': f'Basic {api_key}',
                'Content-Type': 'application/json'
            }
            
            data = {
                'app_id': app_id,
                'include_player_ids': tokens,
                'headings': {'en': payload['title']},
                'contents': {'en': payload['body']},
                'data': payload['data']
            }
            
            response = requests.post(
                'https://onesignal.com/api/v1/notifications',
                headers=headers,
                json=data
            )
            
            response_data = response.json()
            
            return {
                'success': response.status_code == 200,
                'sent_to': f"{len(tokens)} devices",
                'external_id': response_data.get('id'),
                'response_data': {
                    'provider': 'onesignal',
                    'response': response_data
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'OneSignal error: {str(e)}'
            }


class InAppNotificationChannel(BaseNotificationChannel):
    """Canal de notificaciones en la aplicación."""
    
    def send(self, notification: Notification, delivery: NotificationDelivery) -> Dict[str, Any]:
        """Envía notificación in-app (WebSocket)."""
        try:
            # Enviar via WebSocket si está disponible
            success = self._send_websocket_notification(notification)
            
            if success:
                return {
                    'success': True,
                    'sent_to': f"user_{notification.recipient.id}",
                    'external_id': f"ws_{notification.id}",
                    'response_data': {
                        'channel': 'websocket',
                        'user_id': notification.recipient.id
                    }
                }
            else:
                # Si no hay WebSocket, la notificación queda en base de datos
                # para ser recuperada cuando el usuario haga login
                return {
                    'success': True,
                    'sent_to': f"database_user_{notification.recipient.id}",
                    'external_id': f"db_{notification.id}",
                    'response_data': {
                        'channel': 'database',
                        'stored': True
                    }
                }
                
        except Exception as e:
            logger.error(f"Error sending in-app notification: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _send_websocket_notification(self, notification: Notification) -> bool:
        """Envía notificación via WebSocket."""
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            
            if not channel_layer:
                return False
            
            # Preparar datos para WebSocket
            notification_data = {
                'type': 'notification_message',
                'notification': {
                    'id': str(notification.id),
                    'title': notification.title,
                    'message': notification.message,
                    'priority': notification.priority,
                    'action_url': notification.action_url,
                    'deep_link': notification.deep_link,
                    'created_at': notification.created_at.isoformat(),
                    'data': notification.data
                }
            }
            
            # Enviar al grupo del usuario
            async_to_sync(channel_layer.group_send)(
                f"user_{notification.recipient.id}",
                notification_data
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending WebSocket notification: {str(e)}")
            return False


class WebhookNotificationChannel(BaseNotificationChannel):
    """Canal de notificaciones via webhook."""
    
    def send(self, notification: Notification, delivery: NotificationDelivery) -> Dict[str, Any]:
        """Envía notificación via webhook."""
        try:
            webhook_url = self.config.get('webhook_url')
            if not webhook_url:
                return {
                    'success': False,
                    'error': 'Webhook URL not configured'
                }
            
            # Preparar payload
            payload = {
                'notification_id': str(notification.id),
                'recipient_id': notification.recipient.id,
                'recipient_email': notification.recipient.email,
                'title': notification.title,
                'message': notification.message,
                'priority': notification.priority,
                'action_url': notification.action_url,
                'created_at': notification.created_at.isoformat(),
                'data': notification.data
            }
            
            # Configurar headers
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'VeriHome-Notifications/1.0'
            }
            
            # Agregar autenticación si está configurada
            if self.config.get('webhook_token'):
                headers['Authorization'] = f"Bearer {self.config['webhook_token']}"
            
            # Enviar webhook
            response = requests.post(
                webhook_url,
                json=payload,
                headers=headers,
                timeout=30
            )
            
            response.raise_for_status()
            
            return {
                'success': True,
                'sent_to': webhook_url,
                'external_id': f"webhook_{notification.id}",
                'response_data': {
                    'status_code': response.status_code,
                    'response': response.text[:500]  # Limitar respuesta
                }
            }
            
        except Exception as e:
            logger.error(f"Error sending webhook notification: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }


class NotificationChannelManager:
    """Gestor principal de canales de notificación."""
    
    def __init__(self):
        self.channels = {
            'email': EmailNotificationChannel,
            'sms': SMSNotificationChannel,
            'push': PushNotificationChannel,
            'in_app': InAppNotificationChannel,
            'webhook': WebhookNotificationChannel,
        }
    
    def send_notification(
        self,
        channel: NotificationChannel,
        notification: Notification,
        delivery: NotificationDelivery
    ) -> Dict[str, Any]:
        """
        Envía una notificación a través del canal especificado.
        
        Args:
            channel: Canal de notificación
            notification: Notificación a enviar
            delivery: Registro de entrega
        
        Returns:
            Dict con resultado del envío
        """
        try:
            # Obtener clase del canal
            channel_class = self.channels.get(channel.channel_type)
            
            if not channel_class:
                return {
                    'success': False,
                    'error': f'Unknown channel type: {channel.channel_type}'
                }
            
            # Crear instancia del canal
            channel_instance = channel_class(channel)
            
            # Verificar disponibilidad
            if not channel_instance.is_available():
                return {
                    'success': False,
                    'error': f'Channel {channel.name} is not available'
                }
            
            # Enviar notificación
            result = channel_instance.send(notification, delivery)
            result['channel'] = channel.name
            
            return result
            
        except Exception as e:
            logger.error(f"Error in channel manager: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'channel': channel.name
            }
    
    def get_available_channels(self) -> list:
        """Obtiene lista de canales disponibles."""
        return list(NotificationChannel.objects.filter(status='active'))
    
    def validate_channel_config(self, channel: NotificationChannel) -> Dict[str, Any]:
        """
        Valida la configuración de un canal.
        
        Args:
            channel: Canal a validar
        
        Returns:
            Dict con resultado de la validación
        """
        try:
            channel_class = self.channels.get(channel.channel_type)
            
            if not channel_class:
                return {
                    'valid': False,
                    'error': f'Unknown channel type: {channel.channel_type}'
                }
            
            channel_instance = channel_class(channel)
            is_valid = channel_instance.validate_config()
            
            return {
                'valid': is_valid,
                'channel_type': channel.channel_type,
                'channel_name': channel.name
            }
            
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }