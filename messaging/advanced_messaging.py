"""
Sistema de mensajería avanzada para VeriHome.
Incluye WebSocket, notificaciones, análisis de contenido y funcionalidades avanzadas.
"""

from django.db import models, transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.files.base import ContentFile
from datetime import timedelta
from typing import Dict, List, Any, Optional, Tuple
import json
import re
import uuid
from decimal import Decimal

from .models import MessageThread, Message, MessageAttachment, ThreadParticipant
from .notifications import MessageNotificationManager

User = get_user_model()


class AdvancedMessagingService:
    """Servicio avanzado de mensajería con funcionalidades extendidas."""
    
    def __init__(self):
        self.notification_manager = MessageNotificationManager()
    
    @transaction.atomic
    def create_conversation(
        self, 
        initiator: User, 
        recipient: User, 
        subject: str,
        initial_message: str,
        thread_type: str = 'general',
        property_id: Optional[str] = None,
        contract_id: Optional[str] = None,
        attachments: List[Any] = None
    ) -> Dict[str, Any]:
        """
        Crea una nueva conversación con validaciones de seguridad.
        """
        try:
            # Validar que los usuarios pueden comunicarse
            communication_check = self.can_users_communicate(initiator, recipient)
            if not communication_check['can_communicate']:
                return {
                    'success': False,
                    'error': communication_check['reason'],
                    'code': 'COMMUNICATION_NOT_ALLOWED'
                }
            
            # Verificar si ya existe una conversación activa
            existing_thread = self._find_existing_conversation(
                initiator, recipient, thread_type, property_id, contract_id
            )
            
            if existing_thread:
                return {
                    'success': True,
                    'thread_id': existing_thread.id,
                    'message': 'Using existing conversation',
                    'is_new': False
                }
            
            # Crear nuevo hilo de conversación
            thread = MessageThread.objects.create(
                subject=subject,
                thread_type=thread_type,
                created_by=initiator,
                property_id=property_id,
                contract_id=contract_id,
                last_message_at=timezone.now()
            )
            
            # Añadir participantes
            ThreadParticipant.objects.bulk_create([
                ThreadParticipant(thread=thread, user=initiator),
                ThreadParticipant(thread=thread, user=recipient)
            ])
            
            # Crear mensaje inicial
            message_result = self.send_message(
                thread_id=thread.id,
                sender=initiator,
                content=initial_message,
                attachments=attachments or []
            )
            
            if not message_result['success']:
                # Rollback si el mensaje falla
                thread.delete()
                return message_result
            
            # Enviar notificación
            self.notification_manager.send_new_conversation_notification(
                thread, initiator, recipient
            )
            
            return {
                'success': True,
                'thread_id': thread.id,
                'message_id': message_result['message_id'],
                'is_new': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Error creating conversation: {str(e)}',
                'code': 'CREATION_ERROR'
            }
    
    @transaction.atomic
    def send_message(
        self,
        thread_id: str,
        sender: User,
        content: str,
        message_type: str = 'text',
        reply_to_id: Optional[str] = None,
        attachments: List[Any] = None
    ) -> Dict[str, Any]:
        """
        Envía un mensaje con validaciones y procesamiento avanzado.
        """
        try:
            # Obtener el hilo y validar permisos
            thread = MessageThread.objects.get(id=thread_id)
            
            if not thread.can_participate(sender):
                return {
                    'success': False,
                    'error': 'No tienes permiso para participar en esta conversación',
                    'code': 'PERMISSION_DENIED'
                }
            
            # Validar contenido
            content_validation = self._validate_message_content(content, message_type)
            if not content_validation['valid']:
                return {
                    'success': False,
                    'error': content_validation['error'],
                    'code': 'INVALID_CONTENT'
                }
            
            # Determinar destinatario
            recipient = thread.get_other_participant(sender)
            if not recipient:
                return {
                    'success': False,
                    'error': 'No se pudo determinar el destinatario',
                    'code': 'RECIPIENT_ERROR'
                }
            
            # Verificar límites de velocidad
            rate_limit_check = self._check_rate_limits(sender, thread)
            if not rate_limit_check['allowed']:
                return {
                    'success': False,
                    'error': rate_limit_check['error'],
                    'code': 'RATE_LIMITED'
                }
            
            # Crear el mensaje
            message = Message.objects.create(
                thread=thread,
                sender=sender,
                recipient=recipient,
                content=content,
                message_type=message_type,
                reply_to_id=reply_to_id,
                status='sent'
            )
            
            # Procesar adjuntos si existen
            if attachments:
                attachment_results = self._process_attachments(message, attachments)
                if not attachment_results['success']:
                    # Eliminar mensaje si fallan los adjuntos
                    message.delete()
                    return attachment_results
            
            # Actualizar metadatos del hilo
            thread.last_message_at = message.sent_at
            thread.save(update_fields=['last_message_at'])
            
            # Actualizar analíticas
            self._update_conversation_analytics(thread, message)
            
            # Marcar como entregado
            message.mark_as_delivered()
            
            # Enviar notificaciones
            self.notification_manager.send_new_message_notification(message)
            
            # Enviar por WebSocket si está conectado
            self._send_websocket_notification(message)
            
            return {
                'success': True,
                'message_id': message.id,
                'thread_id': thread.id,
                'sent_at': message.sent_at.isoformat()
            }
            
        except MessageThread.DoesNotExist:
            return {
                'success': False,
                'error': 'Conversación no encontrada',
                'code': 'THREAD_NOT_FOUND'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Error sending message: {str(e)}',
                'code': 'SEND_ERROR'
            }
    
    def can_users_communicate(self, user1: User, user2: User) -> Dict[str, Any]:
        """
        Verifica si dos usuarios pueden comunicarse según las reglas de negocio.
        """
        # Usuarios iguales no pueden comunicarse
        if user1.id == user2.id:
            return {
                'can_communicate': False,
                'reason': 'Los usuarios no pueden comunicarse consigo mismos'
            }
        
        # Verificar si algún usuario está bloqueado
        if not user1.is_active or not user2.is_active:
            return {
                'can_communicate': False,
                'reason': 'Uno de los usuarios no está activo'
            }
        
        # Verificar relaciones contractuales o de propiedades
        has_business_relationship = self._check_business_relationship(user1, user2)
        
        if has_business_relationship:
            return {
                'can_communicate': True,
                'reason': 'Relación comercial establecida'
            }
        
        # Verificar si son del mismo tipo de usuario (limitado)
        if user1.user_type == user2.user_type and user1.user_type != 'service_provider':
            return {
                'can_communicate': False,
                'reason': 'Usuarios del mismo tipo no pueden comunicarse directamente'
            }
        
        # Verificar configuraciones de privacidad
        privacy_check = self._check_privacy_settings(user1, user2)
        if not privacy_check['allowed']:
            return {
                'can_communicate': False,
                'reason': privacy_check['reason']
            }
        
        return {
            'can_communicate': True,
            'reason': 'Comunicación permitida'
        }
    
    def get_conversation_analytics(self, thread_id: str, user: User) -> Dict[str, Any]:
        """
        Obtiene analíticas detalladas de una conversación.
        """
        try:
            thread = MessageThread.objects.get(id=thread_id, participants=user)
            messages = thread.messages.all()
            
            # Métricas básicas
            total_messages = messages.count()
            user_messages = messages.filter(sender=user).count()
            other_messages = total_messages - user_messages
            
            # Análisis temporal
            if total_messages > 0:
                first_message = messages.first()
                last_message = messages.last()
                conversation_duration = last_message.sent_at - first_message.sent_at
                
                # Tiempo promedio de respuesta
                response_times = self._calculate_response_times(messages, user)
                avg_response_time = sum(response_times) / len(response_times) if response_times else timedelta(0)
            else:
                conversation_duration = timedelta(0)
                avg_response_time = timedelta(0)
            
            # Análisis de contenido
            content_analysis = self._analyze_message_content(messages)
            
            # Estado de lectura
            unread_count = messages.filter(recipient=user, is_read=False).count()
            read_rate = ((total_messages - unread_count) / total_messages * 100) if total_messages > 0 else 0
            
            return {
                'thread_id': thread_id,
                'total_messages': total_messages,
                'user_messages': user_messages,
                'other_messages': other_messages,
                'conversation_duration_hours': conversation_duration.total_seconds() / 3600,
                'avg_response_time_minutes': avg_response_time.total_seconds() / 60,
                'unread_count': unread_count,
                'read_rate': round(read_rate, 2),
                'content_analysis': content_analysis,
                'last_activity': thread.last_message_at.isoformat() if thread.last_message_at else None
            }
            
        except MessageThread.DoesNotExist:
            return {'error': 'Conversación no encontrada'}
        except Exception as e:
            return {'error': f'Error getting analytics: {str(e)}'}
    
    def search_messages(
        self, 
        user: User, 
        query: str, 
        filters: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Búsqueda avanzada de mensajes con filtros.
        """
        try:
            # Obtener mensajes del usuario
            messages = Message.objects.filter(
                models.Q(sender=user) | models.Q(recipient=user)
            )
            
            # Aplicar búsqueda de texto
            if query:
                messages = messages.filter(
                    models.Q(content__icontains=query) |
                    models.Q(thread__subject__icontains=query)
                )
            
            # Aplicar filtros
            if filters:
                if filters.get('thread_type'):
                    messages = messages.filter(thread__thread_type=filters['thread_type'])
                
                if filters.get('date_from'):
                    messages = messages.filter(sent_at__gte=filters['date_from'])
                
                if filters.get('date_to'):
                    messages = messages.filter(sent_at__lte=filters['date_to'])
                
                if filters.get('sender_id'):
                    messages = messages.filter(sender_id=filters['sender_id'])
                
                if filters.get('has_attachments'):
                    messages = messages.filter(attachments__isnull=False).distinct()
                
                if filters.get('is_read') is not None:
                    messages = messages.filter(is_read=filters['is_read'])
            
            # Ordenar por relevancia y fecha
            messages = messages.order_by('-sent_at')
            
            # Agrupar por hilo para mostrar contexto
            results = []
            for message in messages[:50]:  # Limitar a 50 resultados
                results.append({
                    'message_id': message.id,
                    'thread_id': message.thread.id,
                    'thread_subject': message.thread.subject,
                    'content': message.content,
                    'sender_name': message.sender.get_full_name(),
                    'sent_at': message.sent_at.isoformat(),
                    'is_read': message.is_read,
                    'has_attachments': message.attachments.exists()
                })
            
            return {
                'success': True,
                'results': results,
                'total_found': messages.count(),
                'query': query,
                'filters_applied': filters or {}
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Error searching messages: {str(e)}'
            }
    
    def get_conversation_summary(self, thread_id: str, user: User) -> Dict[str, Any]:
        """
        Genera un resumen automático de la conversación usando análisis de texto.
        """
        try:
            thread = MessageThread.objects.get(id=thread_id, participants=user)
            messages = thread.messages.all()
            
            if messages.count() == 0:
                return {'summary': 'Conversación sin mensajes'}
            
            # Extraer puntos clave
            key_points = []
            
            # Primer mensaje (contexto inicial)
            first_message = messages.first()
            key_points.append({
                'type': 'inicio',
                'content': first_message.content[:200] + '...' if len(first_message.content) > 200 else first_message.content,
                'date': first_message.sent_at.isoformat()
            })
            
            # Buscar mensajes con preguntas
            questions = messages.filter(content__icontains='?')[:3]
            for question in questions:
                key_points.append({
                    'type': 'pregunta',
                    'content': question.content,
                    'sender': question.sender.get_full_name(),
                    'date': question.sent_at.isoformat()
                })
            
            # Buscar mensajes con números (posibles precios, fechas)
            number_pattern = r'\$?[\d,]+\.?\d*'
            for message in messages:
                numbers = re.findall(number_pattern, message.content)
                if numbers:
                    key_points.append({
                        'type': 'datos_numericos',
                        'content': message.content,
                        'numbers': numbers,
                        'sender': message.sender.get_full_name(),
                        'date': message.sent_at.isoformat()
                    })
                    break  # Solo el primero
            
            # Último mensaje (estado actual)
            last_message = messages.last()
            if last_message != first_message:
                key_points.append({
                    'type': 'ultimo',
                    'content': last_message.content[:200] + '...' if len(last_message.content) > 200 else last_message.content,
                    'date': last_message.sent_at.isoformat()
                })
            
            # Análisis de sentimiento básico
            sentiment = self._analyze_sentiment(messages)
            
            return {
                'thread_id': thread_id,
                'subject': thread.subject,
                'message_count': messages.count(),
                'key_points': key_points,
                'sentiment': sentiment,
                'duration_days': (timezone.now() - thread.created_at).days,
                'participants': [p.get_full_name() for p in thread.participants.all()]
            }
            
        except MessageThread.DoesNotExist:
            return {'error': 'Conversación no encontrada'}
        except Exception as e:
            return {'error': f'Error generating summary: {str(e)}'}
    
    def _find_existing_conversation(
        self, 
        user1: User, 
        user2: User, 
        thread_type: str,
        property_id: Optional[str] = None,
        contract_id: Optional[str] = None
    ) -> Optional[MessageThread]:
        """Busca una conversación existente entre dos usuarios."""
        threads = MessageThread.objects.filter(
            participants=user1,
            thread_type=thread_type,
            status='active'
        ).filter(participants=user2)
        
        if property_id:
            threads = threads.filter(property_id=property_id)
        
        if contract_id:
            threads = threads.filter(contract_id=contract_id)
        
        return threads.first()
    
    def _validate_message_content(self, content: str, message_type: str) -> Dict[str, Any]:
        """Valida el contenido del mensaje."""
        if not content or not content.strip():
            return {'valid': False, 'error': 'El contenido no puede estar vacío'}
        
        if len(content) > 5000:
            return {'valid': False, 'error': 'El mensaje es demasiado largo (máximo 5000 caracteres)'}
        
        # Detectar spam básico
        spam_indicators = ['GRATIS', 'OFERTA LIMITADA', 'CLICK AQUÍ', 'GANADOR']
        if any(indicator in content.upper() for indicator in spam_indicators):
            return {'valid': False, 'error': 'El mensaje fue marcado como posible spam'}
        
        # Detectar contenido inapropiado básico
        inappropriate_words = ['estafa', 'fraude', 'illegal']
        if any(word in content.lower() for word in inappropriate_words):
            return {'valid': False, 'error': 'El mensaje contiene contenido inapropiado'}
        
        return {'valid': True}
    
    def _check_rate_limits(self, user: User, thread: MessageThread) -> Dict[str, Any]:
        """Verifica límites de velocidad para prevenir spam."""
        # Límite: máximo 10 mensajes por minuto por usuario
        one_minute_ago = timezone.now() - timedelta(minutes=1)
        recent_messages = Message.objects.filter(
            sender=user,
            sent_at__gte=one_minute_ago
        ).count()
        
        if recent_messages >= 10:
            return {
                'allowed': False,
                'error': 'Has enviado demasiados mensajes recientemente. Espera un momento.'
            }
        
        # Límite: máximo 3 mensajes consecutivos sin respuesta
        last_messages = Message.objects.filter(
            thread=thread,
            sender=user
        ).order_by('-sent_at')[:3]
        
        if len(last_messages) == 3:
            other_participant = thread.get_other_participant(user)
            if other_participant:
                latest_other_message = Message.objects.filter(
                    thread=thread,
                    sender=other_participant,
                    sent_at__gt=last_messages[2].sent_at
                ).exists()
                
                if not latest_other_message:
                    return {
                        'allowed': False,
                        'error': 'Espera una respuesta antes de enviar más mensajes.'
                    }
        
        return {'allowed': True}
    
    def _process_attachments(self, message: Message, attachments: List[Any]) -> Dict[str, Any]:
        """Procesa y valida archivos adjuntos."""
        try:
            created_attachments = []
            
            for attachment_data in attachments:
                # Validar tamaño (máximo 10MB)
                if attachment_data.size > 10 * 1024 * 1024:
                    return {
                        'success': False,
                        'error': f'El archivo {attachment_data.name} es demasiado grande (máximo 10MB)'
                    }
                
                # Validar tipo de archivo
                allowed_types = [
                    'image/jpeg', 'image/png', 'image/gif',
                    'application/pdf', 'text/plain',
                    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ]
                
                if attachment_data.content_type not in allowed_types:
                    return {
                        'success': False,
                        'error': f'Tipo de archivo no permitido: {attachment_data.content_type}'
                    }
                
                # Crear el adjunto
                attachment = MessageAttachment.objects.create(
                    message=message,
                    file=attachment_data,
                    original_filename=attachment_data.name,
                    file_size=attachment_data.size,
                    mime_type=attachment_data.content_type
                )
                
                created_attachments.append(attachment.id)
            
            return {
                'success': True,
                'attachments_created': created_attachments
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Error processing attachments: {str(e)}'
            }
    
    def _update_conversation_analytics(self, thread: MessageThread, message: Message):
        """Actualiza las analíticas de la conversación."""
        try:
            from .models import ConversationAnalytics
            
            analytics, created = ConversationAnalytics.objects.get_or_create(
                thread=thread,
                defaults={
                    'first_message_at': message.sent_at,
                    'last_activity_at': message.sent_at,
                    'total_messages': 1
                }
            )
            
            if not created:
                analytics.total_messages += 1
                analytics.last_activity_at = message.sent_at
                
                # Actualizar contadores por participante
                if message.sender == thread.created_by:
                    analytics.messages_by_initiator += 1
                else:
                    analytics.messages_by_responder += 1
                
                analytics.save()
            
        except Exception as e:
            # Log error but don't fail the message sending
            pass
    
    def _send_websocket_notification(self, message: Message):
        """Envía notificación por WebSocket."""
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            
            if channel_layer:
                # Enviar al destinatario
                async_to_sync(channel_layer.group_send)(
                    f"user_{message.recipient.id}",
                    {
                        'type': 'new_message',
                        'message_id': str(message.id),
                        'thread_id': str(message.thread.id),
                        'sender_name': message.sender.get_full_name(),
                        'content': message.content[:100] + '...' if len(message.content) > 100 else message.content,
                        'sent_at': message.sent_at.isoformat()
                    }
                )
                
        except Exception as e:
            # Log error but don't fail
            pass
    
    def _check_business_relationship(self, user1: User, user2: User) -> bool:
        """Verifica si existe una relación comercial entre los usuarios."""
        try:
            from contracts.models import Contract
            from properties.models import Property
            
            # Verificar contratos
            contracts = Contract.objects.filter(
                models.Q(primary_party=user1, secondary_party=user2) |
                models.Q(primary_party=user2, secondary_party=user1)
            )
            
            if contracts.exists():
                return True
            
            # Verificar propiedades (inquilino consultando arrendador)
            properties = Property.objects.filter(
                landlord=user1
            )
            
            # Verificar consultas previas o contratos
            if properties.exists():
                return True
            
            properties = Property.objects.filter(
                landlord=user2
            )
            
            if properties.exists():
                return True
            
            return False
            
        except Exception:
            return False
    
    def _check_privacy_settings(self, user1: User, user2: User) -> Dict[str, Any]:
        """Verifica configuraciones de privacidad."""
        # Por ahora, permitir comunicación básica
        # Aquí se pueden implementar configuraciones más específicas
        return {'allowed': True}
    
    def _calculate_response_times(self, messages, user: User) -> List[timedelta]:
        """Calcula tiempos de respuesta del usuario."""
        response_times = []
        user_messages = list(messages.filter(sender=user).order_by('sent_at'))
        other_messages = list(messages.exclude(sender=user).order_by('sent_at'))
        
        for user_msg in user_messages:
            # Buscar el último mensaje del otro usuario antes de este
            previous_other_msg = None
            for other_msg in other_messages:
                if other_msg.sent_at < user_msg.sent_at:
                    previous_other_msg = other_msg
                else:
                    break
            
            if previous_other_msg:
                response_time = user_msg.sent_at - previous_other_msg.sent_at
                response_times.append(response_time)
        
        return response_times
    
    def _analyze_message_content(self, messages) -> Dict[str, Any]:
        """Análisis básico del contenido de los mensajes."""
        total_chars = sum(len(msg.content) for msg in messages)
        avg_length = total_chars / messages.count() if messages.count() > 0 else 0
        
        # Contar preguntas
        questions = sum(1 for msg in messages if '?' in msg.content)
        
        # Contar mensajes con números
        numbers = sum(1 for msg in messages if re.search(r'\d+', msg.content))
        
        return {
            'avg_message_length': round(avg_length, 2),
            'total_characters': total_chars,
            'questions_count': questions,
            'messages_with_numbers': numbers
        }
    
    def _analyze_sentiment(self, messages) -> Dict[str, Any]:
        """Análisis básico de sentimiento."""
        positive_words = ['excelente', 'perfecto', 'genial', 'gracias', 'bien']
        negative_words = ['problema', 'mal', 'terrible', 'horrible', 'no me gusta']
        
        positive_count = 0
        negative_count = 0
        
        for message in messages:
            content_lower = message.content.lower()
            positive_count += sum(1 for word in positive_words if word in content_lower)
            negative_count += sum(1 for word in negative_words if word in content_lower)
        
        if positive_count > negative_count:
            sentiment = 'positive'
        elif negative_count > positive_count:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'
        
        return {
            'sentiment': sentiment,
            'positive_indicators': positive_count,
            'negative_indicators': negative_count
        }