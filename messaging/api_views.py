"""
Vistas de API REST para la aplicación de mensajería de VeriHome.
"""

from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .serializers import (
    ConversationSerializer, MessageSerializer, MessageThreadSerializer,
    MessageFolderSerializer, MessageTemplateSerializer
)
from .models import Conversation, Message, MessageThread, MessageFolder, MessageTemplate

User = get_user_model()

# ViewSets básicos
class MessageThreadViewSet(viewsets.ModelViewSet):
    """ViewSet para hilos de mensajes."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MessageThreadSerializer
    
    def get_queryset(self):
        return MessageThread.objects.filter(participants=self.request.user)
    
    def create(self, request, *args, **kwargs):
        # Extract participants from request data
        participants = request.data.get('participants', [])
        
        # Create serializer with context
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request, 'participants': participants}
        )
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class MessageViewSet(viewsets.ModelViewSet):
    """ViewSet para mensajes individuales."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MessageSerializer
    
    def get_queryset(self):
        return Message.objects.filter(thread__participants=self.request.user)
    
    def create(self, request, *args, **kwargs):
        # Create serializer with context
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class MessageFolderViewSet(viewsets.ModelViewSet):
    """ViewSet para carpetas de mensajes."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MessageFolderSerializer
    
    def get_queryset(self):
        return MessageFolder.objects.filter(user=self.request.user)

class MessageTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet para plantillas de mensajes."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MessageTemplateSerializer
    
    def get_queryset(self):
        return MessageTemplate.objects.filter(user=self.request.user)

# Vistas de API personalizadas
class SendMessageAPIView(APIView):
    """Vista para enviar un mensaje."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # Implementación básica
        thread_id = request.data.get('thread_id')
        content = request.data.get('content')
        
        if not thread_id or not content:
            return Response(
                {"detail": "thread_id y content son requeridos"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            thread = MessageThread.objects.get(id=thread_id, participants=request.user)
            message = Message.objects.create(
                thread=thread,
                sender=request.user,
                recipient=thread.participants.exclude(id=request.user.id).first(),
                content=content
            )
            return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)
        except MessageThread.DoesNotExist:
            return Response(
                {"detail": "Hilo de mensaje no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class QuickReplyAPIView(APIView):
    """Vista para respuesta rápida a un mensaje."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # Implementación básica
        message_id = request.data.get('message_id')
        content = request.data.get('content')
        
        if not message_id or not content:
            return Response(
                {"detail": "message_id y content son requeridos"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            original_message = Message.objects.get(id=message_id, thread__participants=request.user)
            reply = Message.objects.create(
                thread=original_message.thread,
                sender=request.user,
                recipient=original_message.sender,
                content=content,
                reply_to=original_message
            )
            return Response(MessageSerializer(reply).data, status=status.HTTP_201_CREATED)
        except Message.DoesNotExist:
            return Response(
                {"detail": "Mensaje no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class MarkMessageReadAPIView(APIView):
    """Vista para marcar un mensaje como leído."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, message_pk):
        try:
            message = Message.objects.get(id=message_pk, recipient=request.user)
            message.is_read = True
            message.save()
            return Response({"detail": "Mensaje marcado como leído"})
        except Message.DoesNotExist:
            return Response(
                {"detail": "Mensaje no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class MarkMessageUnreadAPIView(APIView):
    """Vista para marcar un mensaje como no leído."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, message_pk):
        try:
            message = Message.objects.get(id=message_pk, recipient=request.user)
            message.is_read = False
            message.save()
            return Response({"detail": "Mensaje marcado como no leído"})
        except Message.DoesNotExist:
            return Response(
                {"detail": "Mensaje no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class StarMessageAPIView(APIView):
    """Vista para destacar/quitar destacado de un mensaje."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, message_pk):
        try:
            message = Message.objects.get(id=message_pk, recipient=request.user)
            message.is_starred = not message.is_starred
            message.save()
            return Response({"detail": f"Mensaje {'destacado' if message.is_starred else 'quita destacado'}"})
        except Message.DoesNotExist:
            return Response(
                {"detail": "Mensaje no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class MarkConversationReadAPIView(APIView):
    """Vista para marcar una conversación como leída."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, thread_pk):
        try:
            thread = MessageThread.objects.get(id=thread_pk, participants=request.user)
            Message.objects.filter(
                thread=thread,
                recipient=request.user,
                is_read=False
            ).update(is_read=True)
            return Response({"detail": "Conversación marcada como leída"})
        except MessageThread.DoesNotExist:
            return Response(
                {"detail": "Conversación no encontrada"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class ArchiveConversationAPIView(APIView):
    """Vista para archivar una conversación."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, thread_pk):
        try:
            thread = MessageThread.objects.get(id=thread_pk, participants=request.user)
            thread.status = 'archived'
            thread.save()
            return Response({"detail": "Conversación archivada"})
        except MessageThread.DoesNotExist:
            return Response(
                {"detail": "Conversación no encontrada"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class SearchMessagesAPIView(generics.ListAPIView):
    """Vista para buscar mensajes."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MessageSerializer
    
    def get_queryset(self):
        query = self.getattr(request, "query_params", request.GET).get('q', '')
        return Message.objects.filter(
            thread__participants=self.request.user,
            content__icontains=query
        )

class MessagingStatsAPIView(APIView):
    """Vista para estadísticas de mensajería."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Mensajes no leídos
        unread_count = Message.objects.filter(
            recipient=user,
            is_read=False
        ).count()
        
        # Conversaciones activas
        active_conversations = MessageThread.objects.filter(
            participants=user,
            status='active'
        ).count()
        
        # Mensajes enviados hoy
        from django.utils import timezone
        from datetime import timedelta
        today = timezone.now().date()
        messages_today = Message.objects.filter(
            sender=user,
            sent_at__date=today
        ).count()
        
        return Response({
            'unread_count': unread_count,
            'active_conversations': active_conversations,
            'messages_today': messages_today,
        })

class UnreadCountAPIView(APIView):
    """Vista para contar mensajes no leídos."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            unread_count = Message.objects.filter(
                recipient=request.user,
                is_read=False
            ).count()
            
            return Response({
                'unread_count': unread_count
            })
        except Exception as e:
            return Response({
                'unread_count': 0,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CanCommunicateAPIView(APIView):
    """Vista para verificar si se puede comunicar con un usuario."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_pk):
        try:
            target_user = User.objects.get(id=user_pk)
            
            # No permitir comunicación consigo mismo
            if target_user.id == request.user.id:
                return Response({
                    'can_communicate': False,
                    'reason': 'No puedes comunicarte contigo mismo',
                    'user_id': user_pk
                })
            
            # Verificar que ambos usuarios estén activos
            if not target_user.is_active:
                return Response({
                    'can_communicate': False,
                    'reason': 'El usuario no está activo',
                    'user_id': user_pk
                })
            
            # Verificar relaciones según el tipo de usuario
            current_user = request.user
            can_communicate = False
            reason = "No hay relación establecida entre los usuarios"
            
            # Arrendador con Arrendatario
            if (current_user.user_type == 'landlord' and target_user.user_type == 'tenant') or \
               (current_user.user_type == 'tenant' and target_user.user_type == 'landlord'):
                # Verificar si hay contratos activos entre ellos
                from contracts.models import Contract
                contracts = Contract.objects.filter(
                    primary_party__in=[current_user, target_user],
                    secondary_party__in=[current_user, target_user],
                    status='active'
                )
                if contracts.exists():
                    can_communicate = True
                    reason = "Relación de arrendamiento activa"
            
            # Arrendador con Prestador de Servicios
            elif (current_user.user_type == 'landlord' and target_user.user_type == 'service_provider') or \
                 (current_user.user_type == 'service_provider' and target_user.user_type == 'landlord'):
                # Verificar si hay propiedades del arrendador o contratos de servicios
                from properties.models import Property
                if current_user.user_type == 'landlord':
                    properties = Property.objects.filter(landlord=current_user)
                    if properties.exists():
                        can_communicate = True
                        reason = "Arrendador con propiedades disponibles"
                else:
                    properties = Property.objects.filter(landlord=target_user)
                    if properties.exists():
                        can_communicate = True
                        reason = "Arrendador con propiedades disponibles"
            
            # Arrendatario con Prestador de Servicios
            elif (current_user.user_type == 'tenant' and target_user.user_type == 'service_provider') or \
                 (current_user.user_type == 'service_provider' and target_user.user_type == 'tenant'):
                # Verificar si el arrendatario tiene contratos activos
                from contracts.models import Contract
                if current_user.user_type == 'tenant':
                    contracts = Contract.objects.filter(
                        primary_party=current_user,
                        status='active'
                    )
                else:
                    contracts = Contract.objects.filter(
                        primary_party=target_user,
                        status='active'
                    )
                
                if contracts.exists():
                    can_communicate = True
                    reason = "Arrendatario con contratos activos"
            
            return Response({
                'can_communicate': can_communicate,
                'reason': reason,
                'user_id': user_pk,
                'current_user_type': current_user.user_type,
                'target_user_type': target_user.user_type
            })
            
        except User.DoesNotExist:
            return Response(
                {"detail": "Usuario no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class ConversationViewSet(viewsets.ModelViewSet):
    """ViewSet para conversaciones."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)