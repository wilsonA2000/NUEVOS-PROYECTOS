"""
WebSocket consumers para funcionalidad de mensajería en tiempo real.
Maneja conexiones WebSocket para notificaciones instantáneas y chat en vivo.
"""

import json
import asyncio
from datetime import datetime, timezone
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone as django_timezone
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class MessageConsumer(AsyncWebsocketConsumer):
    """Consumer para mensajería en tiempo real."""
    
    async def connect(self):
        """Establece conexión WebSocket."""
        try:
            # Obtener usuario de la sesión
            self.user = self.scope["user"]
            
            if not self.user.is_authenticated:
                await self.close(code=4001)
                return
            
            # Configurar grupos de canales
            self.user_group_name = f"user_{self.user.id}"
            
            # Unirse al grupo del usuario
            await self.channel_layer.group_add(
                self.user_group_name,
                self.channel_name
            )
            
            await self.accept()
            
            # Enviar confirmación de conexión
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': 'Hello from WebSocket!',
                'user_id': self.user.id,
                'timestamp': datetime.now().isoformat()
            }))
            
            # Enviar mensajes no leídos pendientes
            await self.send_pending_notifications()
            
            logger.info(f"WebSocket connection established for user {self.user.id}")
            
        except Exception as e:
            logger.error(f"Error establishing WebSocket connection: {str(e)}")
            await self.close(code=4000)
    
    async def disconnect(self, close_code):
        """Maneja desconexión WebSocket."""
        try:
            if hasattr(self, 'user_group_name'):
                await self.channel_layer.group_discard(
                    self.user_group_name,
                    self.channel_name
                )
            
            logger.info(f"WebSocket disconnected for user {getattr(self.user, 'id', 'unknown')} with code {close_code}")
            
        except Exception as e:
            logger.error(f"Error during WebSocket disconnect: {str(e)}")
    
    async def receive(self, text_data):
        """Recibe y procesa mensajes del cliente."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))
            
            elif message_type == 'mark_as_read':
                await self.handle_mark_as_read(data)
            
            elif message_type == 'typing_start':
                await self.handle_typing_notification(data, True)
            
            elif message_type == 'typing_stop':
                await self.handle_typing_notification(data, False)
            
            elif message_type == 'join_conversation':
                await self.handle_join_conversation(data)
            
            elif message_type == 'leave_conversation':
                await self.handle_leave_conversation(data)
            
            else:
                logger.warning(f"Unknown message type received: {message_type}")
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received in WebSocket")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"Error processing WebSocket message: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Error processing message'
            }))
    
    async def handle_mark_as_read(self, data):
        """Maneja marcado de mensajes como leídos."""
        try:
            message_id = data.get('message_id')
            if not message_id:
                return
            
            success = await self.mark_message_as_read(message_id)
            
            if success:
                await self.send(text_data=json.dumps({
                    'type': 'message_marked_read',
                    'message_id': message_id
                }))
                
                # Notificar al remitente sobre la lectura
                await self.notify_read_receipt(message_id)
            
        except Exception as e:
            logger.error(f"Error marking message as read: {str(e)}")
    
    async def handle_typing_notification(self, data, is_typing):
        """Maneja notificaciones de escritura."""
        try:
            thread_id = data.get('thread_id')
            if not thread_id:
                return
            
            # Obtener otros participantes de la conversación
            participants = await self.get_thread_participants(thread_id)
            
            for participant_id in participants:
                if participant_id != self.user.id:
                    await self.channel_layer.group_send(
                        f"user_{participant_id}",
                        {
                            'type': 'typing_notification',
                            'thread_id': thread_id,
                            'user_id': self.user.id,
                            'user_name': self.user.get_full_name(),
                            'is_typing': is_typing
                        }
                    )
            
        except Exception as e:
            logger.error(f"Error handling typing notification: {str(e)}")
    
    async def handle_join_conversation(self, data):
        """Maneja unión a una conversación específica."""
        try:
            thread_id = data.get('thread_id')
            if not thread_id:
                return
            
            # Verificar permisos para la conversación
            can_access = await self.can_access_thread(thread_id)
            
            if can_access:
                conversation_group = f"thread_{thread_id}"
                await self.channel_layer.group_add(
                    conversation_group,
                    self.channel_name
                )
                
                await self.send(text_data=json.dumps({
                    'type': 'joined_conversation',
                    'thread_id': thread_id
                }))
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'No tienes permisos para acceder a esta conversación'
                }))
        
        except Exception as e:
            logger.error(f"Error joining conversation: {str(e)}")
    
    async def handle_leave_conversation(self, data):
        """Maneja salida de una conversación específica."""
        try:
            thread_id = data.get('thread_id')
            if not thread_id:
                return
            
            conversation_group = f"thread_{thread_id}"
            await self.channel_layer.group_discard(
                conversation_group,
                self.channel_name
            )
            
            await self.send(text_data=json.dumps({
                'type': 'left_conversation',
                'thread_id': thread_id
            }))
            
        except Exception as e:
            logger.error(f"Error leaving conversation: {str(e)}")
    
    # Handlers para mensajes del grupo
    async def message_notification(self, event):
        """Envía notificación de nuevo mensaje."""
        await self.send(text_data=json.dumps(event))
    
    async def new_message(self, event):
        """Envía nuevo mensaje en tiempo real."""
        await self.send(text_data=json.dumps(event))
    
    async def typing_notification(self, event):
        """Envía notificación de escritura."""
        await self.send(text_data=json.dumps(event))
    
    async def message_read_receipt(self, event):
        """Envía confirmación de lectura."""
        await self.send(text_data=json.dumps(event))
    
    async def conversation_updated(self, event):
        """Envía actualización de conversación."""
        await self.send(text_data=json.dumps(event))
    
    # Métodos auxiliares con acceso a base de datos
    @database_sync_to_async
    def mark_message_as_read(self, message_id):
        """Marca un mensaje como leído en la base de datos."""
        try:
            from messaging.models import Message
            
            message = Message.objects.get(
                id=message_id,
                recipient=self.user
            )
            message.mark_as_read()
            return True
            
        except Message.DoesNotExist:
            return False
        except Exception as e:
            logger.error(f"Database error marking message as read: {str(e)}")
            return False
    
    @database_sync_to_async
    def get_thread_participants(self, thread_id):
        """Obtiene los participantes de una conversación."""
        try:
            from messaging.models import MessageThread
            
            thread = MessageThread.objects.get(id=thread_id)
            return list(thread.participants.values_list('id', flat=True))
            
        except Exception as e:
            logger.error(f"Error getting thread participants: {str(e)}")
            return []
    
    @database_sync_to_async
    def can_access_thread(self, thread_id):
        """Verifica si el usuario puede acceder a la conversación."""
        try:
            from messaging.models import MessageThread
            
            return MessageThread.objects.filter(
                id=thread_id,
                participants=self.user
            ).exists()
            
        except Exception as e:
            logger.error(f"Error checking thread access: {str(e)}")
            return False
    
    @database_sync_to_async
    def get_pending_notifications(self):
        """Obtiene notificaciones pendientes para el usuario."""
        try:
            from messaging.models import Message
            
            unread_messages = Message.objects.filter(
                recipient=self.user,
                is_read=False
            ).select_related('sender', 'thread')[:10]  # Límite para evitar sobrecarga
            
            notifications = []
            for message in unread_messages:
                notifications.append({
                    'type': 'unread_message',
                    'message_id': str(message.id),
                    'thread_id': str(message.thread.id),
                    'sender_name': message.sender.get_full_name(),
                    'content_preview': message.content[:100] + '...' if len(message.content) > 100 else message.content,
                    'sent_at': message.sent_at.isoformat(),
                    'thread_subject': message.thread.subject
                })
            
            return notifications
            
        except Exception as e:
            logger.error(f"Error getting pending notifications: {str(e)}")
            return []
    
    async def send_pending_notifications(self):
        """Envía notificaciones pendientes al conectarse."""
        try:
            notifications = await self.get_pending_notifications()
            
            if notifications:
                await self.send(text_data=json.dumps({
                    'type': 'pending_notifications',
                    'notifications': notifications,
                    'count': len(notifications)
                }))
            
        except Exception as e:
            logger.error(f"Error sending pending notifications: {str(e)}")
    
    async def notify_read_receipt(self, message_id):
        """Notifica al remitente que su mensaje fue leído."""
        try:
            sender_id = await self.get_message_sender_id(message_id)
            
            if sender_id and sender_id != self.user.id:
                await self.channel_layer.group_send(
                    f"user_{sender_id}",
                    {
                        'type': 'message_read_receipt',
                        'message_id': message_id,
                        'read_by': self.user.get_full_name(),
                        'read_at': django_timezone.now().isoformat()
                    }
                )
        
        except Exception as e:
            logger.error(f"Error sending read receipt: {str(e)}")
    
    @database_sync_to_async
    def get_message_sender_id(self, message_id):
        """Obtiene el ID del remitente de un mensaje."""
        try:
            from messaging.models import Message
            
            message = Message.objects.get(id=message_id)
            return message.sender.id
            
        except Exception as e:
            logger.error(f"Error getting message sender: {str(e)}")
            return None


class NotificationConsumer(AsyncWebsocketConsumer):
    """Consumer especializado para notificaciones generales."""
    
    async def connect(self):
        """Establece conexión para notificaciones."""
        self.user = self.scope["user"]
        
        if not self.user.is_authenticated:
            await self.close(code=4001)
            return
        
        self.notification_group = f"notifications_{self.user.id}"
        
        await self.channel_layer.group_add(
            self.notification_group,
            self.channel_name
        )
        
        await self.accept()
        
        logger.info(f"Notification WebSocket connected for user {self.user.id}")
    
    async def disconnect(self, close_code):
        """Maneja desconexión de notificaciones."""
        if hasattr(self, 'notification_group'):
            await self.channel_layer.group_discard(
                self.notification_group,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Procesa mensajes de notificaciones."""
        try:
            data = json.loads(text_data)
            
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong'
                }))
                
        except Exception as e:
            logger.error(f"Error in notification consumer: {str(e)}")
    
    # Handlers para diferentes tipos de notificaciones
    async def general_notification(self, event):
        """Envía notificación general."""
        await self.send(text_data=json.dumps(event))
    
    async def system_notification(self, event):
        """Envía notificación del sistema."""
        await self.send(text_data=json.dumps(event))
    
    async def urgent_notification(self, event):
        """Envía notificación urgente."""
        await self.send(text_data=json.dumps(event))


class ThreadConsumer(AsyncWebsocketConsumer):
    """Consumer especializado para conversaciones específicas."""
    
    async def connect(self):
        """Conecta a una conversación específica."""
        self.user = self.scope["user"]
        self.thread_id = self.scope['url_route']['kwargs']['thread_id']
        
        if not self.user.is_authenticated:
            await self.close(code=4001)
            return
        
        # Verificar permisos para la conversación
        can_access = await self.can_access_thread(self.thread_id)
        
        if not can_access:
            await self.close(code=4003)
            return
        
        self.thread_group_name = f"thread_{self.thread_id}"
        
        await self.channel_layer.group_add(
            self.thread_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Notificar que el usuario se conectó a la conversación
        await self.channel_layer.group_send(
            self.thread_group_name,
            {
                'type': 'user_joined_thread',
                'user_id': self.user.id,
                'user_name': self.user.get_full_name(),
                'thread_id': self.thread_id,
                'timestamp': django_timezone.now().isoformat()
            }
        )
        
        logger.info(f"User {self.user.id} connected to thread {self.thread_id}")
    
    async def disconnect(self, close_code):
        """Desconecta de la conversación."""
        if hasattr(self, 'thread_group_name'):
            # Notificar que el usuario se desconectó
            await self.channel_layer.group_send(
                self.thread_group_name,
                {
                    'type': 'user_left_thread',
                    'user_id': self.user.id,
                    'user_name': self.user.get_full_name(),
                    'thread_id': self.thread_id,
                    'timestamp': django_timezone.now().isoformat()
                }
            )
            
            await self.channel_layer.group_discard(
                self.thread_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Procesa mensajes de la conversación."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'send_message':
                await self.handle_send_message(data)
            elif message_type == 'typing_start':
                await self.handle_typing(data, True)
            elif message_type == 'typing_stop':
                await self.handle_typing(data, False)
            elif message_type == 'mark_messages_read':
                await self.handle_mark_messages_read(data)
            
        except Exception as e:
            logger.error(f"Error in thread consumer: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Error processing message'
            }))
    
    async def handle_send_message(self, data):
        """Maneja envío de mensaje nuevo."""
        try:
            content = data.get('content', '').strip()
            if not content:
                return
            
            # Crear mensaje en la base de datos
            message = await self.create_message(content)
            
            if message:
                # Enviar mensaje a todos los participantes de la conversación
                await self.channel_layer.group_send(
                    self.thread_group_name,
                    {
                        'type': 'new_thread_message',
                        'message': {
                            'id': str(message['id']),
                            'content': message['content'],
                            'sender_id': message['sender_id'],
                            'sender_name': message['sender_name'],
                            'thread_id': self.thread_id,
                            'sent_at': message['sent_at'],
                            'is_read': False
                        }
                    }
                )
        
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")
    
    async def handle_typing(self, data, is_typing):
        """Maneja indicadores de escritura."""
        await self.channel_layer.group_send(
            self.thread_group_name,
            {
                'type': 'typing_indicator',
                'user_id': self.user.id,
                'user_name': self.user.get_full_name(),
                'is_typing': is_typing,
                'thread_id': self.thread_id
            }
        )
    
    async def handle_mark_messages_read(self, data):
        """Marca mensajes como leídos."""
        try:
            message_ids = data.get('message_ids', [])
            if message_ids:
                success = await self.mark_messages_as_read(message_ids)
                
                if success:
                    # Notificar cambio de estado de lectura
                    await self.channel_layer.group_send(
                        self.thread_group_name,
                        {
                            'type': 'messages_read_update',
                            'message_ids': message_ids,
                            'read_by': self.user.id,
                            'read_by_name': self.user.get_full_name(),
                            'thread_id': self.thread_id
                        }
                    )
        
        except Exception as e:
            logger.error(f"Error marking messages as read: {str(e)}")
    
    # Handlers para eventos del grupo
    async def new_thread_message(self, event):
        """Envía nuevo mensaje a la conversación."""
        await self.send(text_data=json.dumps(event))
    
    async def typing_indicator(self, event):
        """Envía indicador de escritura."""
        # No enviar el indicador de escritura al mismo usuario que está escribiendo
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps(event))
    
    async def user_joined_thread(self, event):
        """Notifica que un usuario se unió a la conversación."""
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps(event))
    
    async def user_left_thread(self, event):
        """Notifica que un usuario salió de la conversación."""
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps(event))
    
    async def messages_read_update(self, event):
        """Notifica actualización de estado de lectura."""
        if event['read_by'] != self.user.id:
            await self.send(text_data=json.dumps(event))
    
    # Métodos de base de datos
    @database_sync_to_async
    def can_access_thread(self, thread_id):
        """Verifica si el usuario puede acceder a la conversación."""
        try:
            from messaging.models import MessageThread
            
            return MessageThread.objects.filter(
                id=thread_id,
                participants=self.user
            ).exists()
            
        except Exception as e:
            logger.error(f"Error checking thread access: {str(e)}")
            return False
    
    @database_sync_to_async
    def create_message(self, content):
        """Crea un nuevo mensaje en la base de datos."""
        try:
            from messaging.models import Message, MessageThread
            
            thread = MessageThread.objects.get(
                id=self.thread_id,
                participants=self.user
            )
            
            # Determinar el destinatario (otro participante)
            recipients = thread.participants.exclude(id=self.user.id)
            if not recipients.exists():
                return None
            
            recipient = recipients.first()
            
            message = Message.objects.create(
                thread=thread,
                sender=self.user,
                recipient=recipient,
                content=content
            )
            
            return {
                'id': message.id,
                'content': message.content,
                'sender_id': message.sender.id,
                'sender_name': message.sender.get_full_name(),
                'sent_at': message.sent_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error creating message: {str(e)}")
            return None
    
    @database_sync_to_async
    def mark_messages_as_read(self, message_ids):
        """Marca múltiples mensajes como leídos."""
        try:
            from messaging.models import Message
            
            updated = Message.objects.filter(
                id__in=message_ids,
                recipient=self.user,
                is_read=False
            ).update(
                is_read=True,
                read_at=django_timezone.now()
            )
            
            return updated > 0
            
        except Exception as e:
            logger.error(f"Error marking messages as read: {str(e)}")
            return False


class UserStatusConsumer(AsyncWebsocketConsumer):
    """Consumer para estados de usuario (online/offline)."""
    
    async def connect(self):
        """Conecta para seguimiento de estado."""
        self.user = self.scope["user"]
        
        if not self.user.is_authenticated:
            await self.close(code=4001)
            return
        
        self.status_group = "user_status"
        
        await self.channel_layer.group_add(
            self.status_group,
            self.channel_name
        )
        
        await self.accept()
        
        # Actualizar estado del usuario a online
        await self.update_user_status(True)
        
        # Notificar a otros usuarios que este usuario está online
        await self.channel_layer.group_send(
            self.status_group,
            {
                'type': 'user_status_update',
                'user_id': self.user.id,
                'user_name': self.user.get_full_name(),
                'is_online': True,
                'last_seen': django_timezone.now().isoformat()
            }
        )
    
    async def disconnect(self, close_code):
        """Desconecta y actualiza estado a offline."""
        if hasattr(self, 'status_group'):
            # Actualizar estado del usuario a offline
            await self.update_user_status(False)
            
            # Notificar a otros usuarios que este usuario está offline
            await self.channel_layer.group_send(
                self.status_group,
                {
                    'type': 'user_status_update',
                    'user_id': self.user.id,
                    'user_name': self.user.get_full_name(),
                    'is_online': False,
                    'last_seen': django_timezone.now().isoformat()
                }
            )
            
            await self.channel_layer.group_discard(
                self.status_group,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Procesa mensajes de estado."""
        try:
            data = json.loads(text_data)
            
            if data.get('type') == 'heartbeat':
                await self.send(text_data=json.dumps({
                    'type': 'heartbeat_ack',
                    'timestamp': django_timezone.now().isoformat()
                }))
                
                # Actualizar última actividad
                await self.update_last_activity()
                
        except Exception as e:
            logger.error(f"Error in status consumer: {str(e)}")
    
    async def user_status_update(self, event):
        """Envía actualización de estado de usuario."""
        # No enviar actualización del propio usuario
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps(event))
    
    @database_sync_to_async
    def update_user_status(self, is_online):
        """Actualiza el estado online/offline del usuario."""
        try:
            from users.models import UserProfile
            
            profile, created = UserProfile.objects.get_or_create(user=self.user)
            profile.is_online = is_online
            profile.last_seen = django_timezone.now()
            profile.save()
            
        except Exception as e:
            logger.error(f"Error updating user status: {str(e)}")
    
    @database_sync_to_async
    def update_last_activity(self):
        """Actualiza la última actividad del usuario."""
        try:
            from users.models import UserProfile
            
            profile, created = UserProfile.objects.get_or_create(user=self.user)
            profile.last_seen = django_timezone.now()
            profile.save()
            
        except Exception as e:
            logger.error(f"Error updating last activity: {str(e)}")