"""
Vistas API avanzadas para el sistema de mensajería de VeriHome.
Incluye funcionalidades en tiempo real, búsqueda avanzada y analíticas.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg, Max
from django.utils import timezone
from django.core.files.base import ContentFile
from datetime import timedelta
from typing import Dict, Any
import json

from .models import (
    MessageThread, Message, MessageAttachment, ThreadParticipant, 
    MessageFolder, MessageTemplate, ConversationAnalytics, MessageReaction
)
from .advanced_messaging import AdvancedMessagingService
from .notifications import MessageNotificationManager
from .serializers import (
    MessageThreadSerializer, MessageSerializer, MessageAttachmentSerializer,
    MessageFolderSerializer, MessageTemplateSerializer
)
from users.models import User


class AdvancedMessageThreadViewSet(viewsets.ModelViewSet):
    """ViewSet avanzado para hilos de mensajes con funcionalidades extendidas."""
    serializer_class = MessageThreadSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filtrar hilos según el usuario y parámetros."""
        queryset = MessageThread.objects.filter(participants=self.request.user)
        
        # Filtros opcionales
        status_filter = self.getattr(request, "query_params", request.GET).get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        thread_type = self.getattr(request, "query_params", request.GET).get('type')
        if thread_type:
            queryset = queryset.filter(thread_type=thread_type)
        
        # Filtro de búsqueda
        search = self.getattr(request, "query_params", request.GET).get('search')
        if search:
            queryset = queryset.filter(
                Q(subject__icontains=search) |
                Q(messages__content__icontains=search)
            ).distinct()
        
        return queryset.select_related('created_by').prefetch_related('participants')
    
    @action(detail=True, methods=['post'])
    def mark_all_read(self, request, pk=None):
        """Marca todos los mensajes del hilo como leídos."""
        thread = self.get_object()
        
        updated_count = thread.messages.filter(
            recipient=request.user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now(),
            status='read'
        )
        
        # Actualizar última lectura del participante
        ThreadParticipant.objects.filter(
            thread=thread,
            user=request.user
        ).update(last_read_at=timezone.now())
        
        return Response({
            'messages_marked': updated_count,
            'message': 'All messages marked as read'
        })
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archiva la conversación para el usuario."""
        thread = self.get_object()
        
        ThreadParticipant.objects.filter(
            thread=thread,
            user=request.user
        ).update(
            is_archived=True,
            archived_at=timezone.now()
        )
        
        return Response({'message': 'Conversation archived'})
    
    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        """Desarchiva la conversación para el usuario."""
        thread = self.get_object()
        
        ThreadParticipant.objects.filter(
            thread=thread,
            user=request.user
        ).update(
            is_archived=False,
            archived_at=None
        )
        
        return Response({'message': 'Conversation unarchived'})
    
    @action(detail=True, methods=['post'])
    def star(self, request, pk=None):
        """Marca/desmarca la conversación como destacada."""
        thread = self.get_object()
        
        participant = ThreadParticipant.objects.get(
            thread=thread,
            user=request.user
        )
        
        participant.is_starred = not participant.is_starred
        participant.save()
        
        return Response({
            'is_starred': participant.is_starred,
            'message': 'Starred' if participant.is_starred else 'Unstarred'
        })
    
    @action(detail=True, methods=['post'])
    def mute(self, request, pk=None):
        """Silencia/activa las notificaciones de la conversación."""
        thread = self.get_object()
        
        participant = ThreadParticipant.objects.get(
            thread=thread,
            user=request.user
        )
        
        participant.is_muted = not participant.is_muted
        participant.save()
        
        return Response({
            'is_muted': participant.is_muted,
            'message': 'Muted' if participant.is_muted else 'Unmuted'
        })
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Obtiene analíticas de la conversación."""
        thread = self.get_object()
        
        service = AdvancedMessagingService()
        analytics = service.get_conversation_analytics(str(thread.id), request.user)
        
        return Response(analytics)
    
    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Obtiene un resumen automático de la conversación."""
        thread = self.get_object()
        
        service = AdvancedMessagingService()
        summary = service.get_conversation_summary(str(thread.id), request.user)
        
        return Response(summary)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Obtiene el conteo de mensajes no leídos por conversación."""
        threads = self.get_queryset()
        
        unread_data = []
        for thread in threads:
            unread_count = thread.get_unread_count(request.user)
            if unread_count > 0:
                unread_data.append({
                    'thread_id': thread.id,
                    'unread_count': unread_count,
                    'last_message_at': thread.last_message_at.isoformat() if thread.last_message_at else None
                })
        
        return Response({
            'unread_conversations': unread_data,
            'total_unread': sum(item['unread_count'] for item in unread_data)
        })


class AdvancedMessageViewSet(viewsets.ModelViewSet):
    """ViewSet avanzado para mensajes con funcionalidades extendidas."""
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filtrar mensajes según el usuario y parámetros."""
        queryset = Message.objects.filter(
            Q(sender=self.request.user) | Q(recipient=self.request.user)
        )
        
        # Filtro por hilo
        thread_id = self.getattr(request, "query_params", request.GET).get('thread_id')
        if thread_id:
            queryset = queryset.filter(thread_id=thread_id)
        
        # Filtro por estado de lectura
        is_read = self.getattr(request, "query_params", request.GET).get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        
        return queryset.select_related('sender', 'recipient', 'thread').order_by('sent_at')
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Marca un mensaje como leído."""
        message = self.get_object()
        
        if message.recipient != request.user:
            return Response(
                {'error': 'You can only mark your own messages as read'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        message.mark_as_read()
        
        # Enviar confirmación de lectura si es necesario
        notification_manager = MessageNotificationManager()
        notification_manager.send_message_delivery_notification(message)
        
        return Response({'message': 'Message marked as read'})
    
    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        """Añade/quita una reacción al mensaje."""
        message = self.get_object()
        reaction_type = request.data.get('reaction_type')
        
        if not reaction_type:
            return Response(
                {'error': 'reaction_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar que el usuario puede ver el mensaje
        if request.user not in [message.sender, message.recipient]:
            return Response(
                {'error': 'You cannot react to this message'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        reaction, created = MessageReaction.objects.get_or_create(
            message=message,
            user=request.user,
            defaults={'reaction_type': reaction_type}
        )
        
        if not created:
            if reaction.reaction_type == reaction_type:
                # Quitar reacción si es la misma
                reaction.delete()
                return Response({'message': 'Reaction removed'})
            else:
                # Cambiar tipo de reacción
                reaction.reaction_type = reaction_type
                reaction.save()
                return Response({'message': 'Reaction updated'})
        
        return Response({'message': 'Reaction added'})
    
    @action(detail=True, methods=['get'])
    def reactions(self, request, pk=None):
        """Obtiene todas las reacciones del mensaje."""
        message = self.get_object()
        
        reactions = MessageReaction.objects.filter(message=message).select_related('user')
        
        reaction_data = {}
        for reaction in reactions:
            reaction_type = reaction.reaction_type
            if reaction_type not in reaction_data:
                reaction_data[reaction_type] = {
                    'count': 0,
                    'users': [],
                    'emoji': dict(MessageReaction.REACTION_TYPES)[reaction_type]
                }
            
            reaction_data[reaction_type]['count'] += 1
            reaction_data[reaction_type]['users'].append({
                'id': reaction.user.id,
                'name': reaction.user.get_full_name()
            })
        
        return Response(reaction_data)


class MessageConversationAPIView(APIView):
    """Vista API para gestión avanzada de conversaciones."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Crea una nueva conversación."""
        try:
            service = AdvancedMessagingService()
            
            # Extraer datos
            recipient_id = request.data.get('recipient_id')
            subject = request.data.get('subject', 'Nueva conversación')
            initial_message = request.data.get('message')
            thread_type = request.data.get('thread_type', 'general')
            property_id = request.data.get('property_id')
            contract_id = request.data.get('contract_id')
            
            if not recipient_id or not initial_message:
                return Response(
                    {'error': 'recipient_id and message are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Obtener destinatario
            try:
                recipient = User.objects.get(id=recipient_id)
            except User.DoesNotExist:
                return Response(
                    {'error': 'Recipient not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Procesar adjuntos si existen
            attachments = request.FILES.getlist('attachments', [])
            
            # Crear conversación
            result = service.create_conversation(
                initiator=request.user,
                recipient=recipient,
                subject=subject,
                initial_message=initial_message,
                thread_type=thread_type,
                property_id=property_id,
                contract_id=contract_id,
                attachments=attachments
            )
            
            if result['success']:
                return Response(result, status=status.HTTP_201_CREATED)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response(
                {'error': f'Error creating conversation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MessageSendAPIView(APIView):
    """Vista API para envío avanzado de mensajes."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Envía un nuevo mensaje."""
        try:
            service = AdvancedMessagingService()
            
            # Extraer datos
            thread_id = request.data.get('thread_id')
            content = request.data.get('content')
            message_type = request.data.get('message_type', 'text')
            reply_to_id = request.data.get('reply_to_id')
            
            if not thread_id or not content:
                return Response(
                    {'error': 'thread_id and content are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Procesar adjuntos
            attachments = request.FILES.getlist('attachments', [])
            
            # Enviar mensaje
            result = service.send_message(
                thread_id=thread_id,
                sender=request.user,
                content=content,
                message_type=message_type,
                reply_to_id=reply_to_id,
                attachments=attachments
            )
            
            if result['success']:
                return Response(result, status=status.HTTP_201_CREATED)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response(
                {'error': f'Error sending message: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MessageSearchAPIView(APIView):
    """Vista API para búsqueda avanzada de mensajes."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Busca mensajes con filtros avanzados."""
        try:
            service = AdvancedMessagingService()
            
            # Extraer parámetros de búsqueda
            query = getattr(request, "query_params", request.GET).get('q', '')
            
            filters = {}
            if getattr(request, "query_params", request.GET).get('thread_type'):
                filters['thread_type'] = getattr(request, "query_params", request.GET).get('thread_type')
            
            if getattr(request, "query_params", request.GET).get('date_from'):
                filters['date_from'] = getattr(request, "query_params", request.GET).get('date_from')
            
            if getattr(request, "query_params", request.GET).get('date_to'):
                filters['date_to'] = getattr(request, "query_params", request.GET).get('date_to')
            
            if getattr(request, "query_params", request.GET).get('sender_id'):
                filters['sender_id'] = getattr(request, "query_params", request.GET).get('sender_id')
            
            if getattr(request, "query_params", request.GET).get('has_attachments'):
                filters['has_attachments'] = getattr(request, "query_params", request.GET).get('has_attachments').lower() == 'true'
            
            if getattr(request, "query_params", request.GET).get('is_read'):
                filters['is_read'] = getattr(request, "query_params", request.GET).get('is_read').lower() == 'true'
            
            # Realizar búsqueda
            results = service.search_messages(request.user, query, filters)
            
            return Response(results)
            
        except Exception as e:
            return Response(
                {'error': f'Error searching messages: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MessageCommunicationCheckAPIView(APIView):
    """Vista API para verificar si dos usuarios pueden comunicarse."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id):
        """Verifica si el usuario actual puede comunicarse con otro usuario."""
        try:
            other_user = get_object_or_404(User, id=user_id)
            
            service = AdvancedMessagingService()
            result = service.can_users_communicate(request.user, other_user)
            
            return Response(result)
            
        except Exception as e:
            return Response(
                {'error': f'Error checking communication: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MessageAttachmentAPIView(APIView):
    """Vista API para gestión de adjuntos."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Sube un archivo adjunto."""
        try:
            file = request.FILES.get('file')
            if not file:
                return Response(
                    {'error': 'No file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validar tamaño (máximo 10MB)
            if file.size > 10 * 1024 * 1024:
                return Response(
                    {'error': 'File too large (max 10MB)'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Por ahora, solo guardar temporalmente
            # En una implementación real, se podría usar un servicio como AWS S3
            
            return Response({
                'file_id': str(uuid.uuid4()),
                'filename': file.name,
                'size': file.size,
                'content_type': file.content_type,
                'message': 'File uploaded successfully'
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error uploading file: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MessageStatsAPIView(APIView):
    """Vista API para estadísticas de mensajería."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtiene estadísticas de mensajería del usuario."""
        try:
            user = request.user
            
            # Estadísticas básicas
            total_conversations = MessageThread.objects.filter(participants=user).count()
            total_messages_sent = Message.objects.filter(sender=user).count()
            total_messages_received = Message.objects.filter(recipient=user).count()
            
            # Mensajes no leídos
            unread_messages = Message.objects.filter(recipient=user, is_read=False).count()
            
            # Conversaciones archivadas
            archived_conversations = ThreadParticipant.objects.filter(
                user=user,
                is_archived=True
            ).count()
            
            # Conversaciones destacadas
            starred_conversations = ThreadParticipant.objects.filter(
                user=user,
                is_starred=True
            ).count()
            
            # Actividad reciente (últimos 7 días)
            week_ago = timezone.now() - timedelta(days=7)
            recent_activity = Message.objects.filter(
                Q(sender=user) | Q(recipient=user),
                sent_at__gte=week_ago
            ).count()
            
            # Tiempo promedio de respuesta (últimos 30 días)
            month_ago = timezone.now() - timedelta(days=30)
            user_messages = Message.objects.filter(
                sender=user,
                sent_at__gte=month_ago,
                reply_to__isnull=False
            ).select_related('reply_to')
            
            response_times = []
            for message in user_messages:
                if message.reply_to:
                    response_time = message.sent_at - message.reply_to.sent_at
                    response_times.append(response_time.total_seconds() / 3600)  # en horas
            
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            
            return Response({
                'total_conversations': total_conversations,
                'total_messages_sent': total_messages_sent,
                'total_messages_received': total_messages_received,
                'unread_messages': unread_messages,
                'archived_conversations': archived_conversations,
                'starred_conversations': starred_conversations,
                'recent_activity_7_days': recent_activity,
                'avg_response_time_hours': round(avg_response_time, 2),
                'response_rate': round((len(response_times) / max(total_messages_received, 1)) * 100, 2)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error getting stats: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )