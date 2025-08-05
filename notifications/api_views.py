"""
Vistas API para el sistema de notificaciones de VeriHome.
Proporciona endpoints REST para gestión completa de notificaciones.
"""

from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta
from typing import Dict, Any

from .models import (
    NotificationChannel, NotificationTemplate, Notification,
    NotificationDelivery, NotificationPreference, NotificationDigest,
    NotificationAnalytics
)
from .serializers import (
    NotificationChannelSerializer, NotificationTemplateSerializer,
    NotificationSerializer, NotificationCreateSerializer,
    BulkNotificationSerializer, NotificationDeliverySerializer,
    NotificationPreferenceSerializer, NotificationDigestSerializer,
    NotificationAnalyticsSerializer, NotificationStatsSerializer,
    MarkAsReadSerializer, NotificationTestSerializer,
    NotificationSearchSerializer
)
from .notification_service import notification_service


class NotificationChannelViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para canales de notificación (solo lectura)."""
    
    queryset = NotificationChannel.objects.filter(status='active')
    serializer_class = NotificationChannelSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['channel_type', 'is_default', 'priority']
    search_fields = ['name', 'description']
    ordering = ['priority', 'name']
    
    @action(detail=True, methods=['post'])
    def test_configuration(self, request, pk=None):
        """Prueba la configuración de un canal."""
        channel = self.get_object()
        
        from .channels import NotificationChannelManager
        manager = NotificationChannelManager()
        result = manager.validate_channel_config(channel)
        
        return Response(result)


class NotificationTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet para plantillas de notificación."""
    
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['template_type', 'priority', 'is_active', 'is_system_template']
    search_fields = ['name', 'title', 'content_text']
    ordering_fields = ['name', 'template_type', 'priority', 'created_at']
    ordering = ['template_type', 'name']
    
    def get_queryset(self):
        """Filtrar plantillas según permisos del usuario."""
        queryset = super().get_queryset()
        
        # Los usuarios normales solo ven plantillas públicas
        if not self.request.user.is_staff:
            queryset = queryset.filter(
                Q(is_system_template=True) | 
                Q(created_by=self.request.user)
            )
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def test_render(self, request, pk=None):
        """Prueba el renderizado de una plantilla."""
        template = self.get_object()
        
        # Contexto de prueba
        test_context = {
            'user_name': request.user.get_full_name(),
            'platform_name': 'VeriHome',
            'action_url': 'https://verihome.com/test',
            'recipient_name': request.user.get_full_name(),
            **request.data.get('context', {})
        }
        
        try:
            rendered = template.render_content(test_context)
            return Response({
                'success': True,
                'rendered_content': rendered
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplica una plantilla."""
        template = self.get_object()
        
        # Crear copia
        new_template = NotificationTemplate.objects.create(
            name=f"{template.name} (Copia)",
            template_type=template.template_type,
            title=template.title,
            subject=template.subject,
            content_text=template.content_text,
            content_html=template.content_html,
            priority=template.priority,
            variables=template.variables,
            max_frequency_per_user_per_day=template.max_frequency_per_user_per_day,
            is_active=False,
            created_by=request.user
        )
        
        # Copiar canales
        new_template.channels.set(template.channels.all())
        
        serializer = self.get_serializer(new_template)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet para notificaciones."""
    
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'is_read', 'template__template_type']
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'sent_at', 'priority']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filtrar notificaciones del usuario actual."""
        return Notification.objects.filter(
            recipient=self.request.user
        ).select_related('template', 'recipient')
    
    def get_serializer_class(self):
        """Usar diferentes serializers según la acción."""
        if self.action == 'create':
            return NotificationCreateSerializer
        return super().get_serializer_class()
    
    def create(self, request, *args, **kwargs):
        """Crear notificación usando el servicio."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            recipient = User.objects.get(id=serializer.validated_data['recipient_id'])
            
            notification = notification_service.create_notification(
                recipient=recipient,
                title=serializer.validated_data['title'],
                message=serializer.validated_data['message'],
                template_name=serializer.validated_data.get('template_name'),
                priority=serializer.validated_data.get('priority', 'normal'),
                channels=serializer.validated_data.get('channels'),
                action_url=serializer.validated_data.get('action_url', ''),
                deep_link=serializer.validated_data.get('deep_link', ''),
                data=serializer.validated_data.get('data', {}),
                scheduled_at=serializer.validated_data.get('scheduled_at'),
                expires_at=serializer.validated_data.get('expires_at'),
                context=serializer.validated_data.get('context', {})
            )
            
            if notification:
                response_serializer = NotificationSerializer(notification)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'error': 'No se pudo crear la notificación (posiblemente bloqueada por preferencias)'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Marca una notificación como leída."""
        notification = self.get_object()
        
        success = notification_service.mark_notification_as_read(
            str(notification.id),
            request.user
        )
        
        if success:
            return Response({'message': 'Notificación marcada como leída'})
        else:
            return Response({
                'error': 'No se pudo marcar la notificación como leída'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Marca todas las notificaciones como leídas."""
        count = notification_service.mark_all_as_read(request.user)
        
        return Response({
            'message': f'Se marcaron {count} notificaciones como leídas'
        })
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Obtiene el conteo de notificaciones no leídas."""
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
            status__in=['sent', 'delivered']
        ).count()
        
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Obtiene estadísticas de notificaciones del usuario."""
        stats = notification_service.get_notification_stats(request.user)
        serializer = NotificationStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def search(self, request):
        """Búsqueda avanzada de notificaciones."""
        serializer = NotificationSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        queryset = self.get_queryset()
        
        # Aplicar filtros
        if data.get('query'):
            queryset = queryset.filter(
                Q(title__icontains=data['query']) |
                Q(message__icontains=data['query'])
            )
        
        if data.get('status'):
            queryset = queryset.filter(status=data['status'])
        
        if data.get('priority'):
            queryset = queryset.filter(priority=data['priority'])
        
        if data.get('template_type'):
            queryset = queryset.filter(template__template_type=data['template_type'])
        
        if data.get('date_from'):
            queryset = queryset.filter(created_at__gte=data['date_from'])
        
        if data.get('date_to'):
            queryset = queryset.filter(created_at__lte=data['date_to'])
        
        if data.get('is_read') is not None:
            queryset = queryset.filter(is_read=data['is_read'])
        
        # Paginación
        page = data.get('page', 1)
        page_size = data.get('page_size', 20)
        start = (page - 1) * page_size
        end = start + page_size
        
        total = queryset.count()
        notifications = queryset[start:end]
        
        result_serializer = NotificationSerializer(notifications, many=True)
        
        return Response({
            'results': result_serializer.data,
            'total': total,
            'page': page,
            'page_size': page_size,
            'has_more': total > end
        })


class BulkNotificationAPIView(APIView):
    """Vista para envío masivo de notificaciones."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Envía notificaciones masivas."""
        serializer = BulkNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            recipients = User.objects.filter(
                id__in=serializer.validated_data['recipient_ids']
            )
            
            result = notification_service.send_bulk_notifications(
                recipients=list(recipients),
                title=serializer.validated_data['title'],
                message=serializer.validated_data['message'],
                template_name=serializer.validated_data.get('template_name'),
                priority=serializer.validated_data.get('priority', 'normal'),
                channels=serializer.validated_data.get('channels'),
                action_url=serializer.validated_data.get('action_url', ''),
                data=serializer.validated_data.get('data', {})
            )
            
            return Response(result, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class NotificationPreferenceAPIView(APIView):
    """Vista para preferencias de notificación del usuario."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtiene las preferencias del usuario."""
        preferences = notification_service._get_user_preferences(request.user)
        serializer = NotificationPreferenceSerializer(preferences)
        return Response(serializer.data)
    
    def put(self, request):
        """Actualiza las preferencias del usuario."""
        preferences = notification_service._get_user_preferences(request.user)
        serializer = NotificationPreferenceSerializer(
            preferences,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data)


class NotificationDigestViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para resúmenes de notificaciones."""
    
    serializer_class = NotificationDigestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['digest_type', 'status', 'email_sent']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filtrar resúmenes del usuario actual."""
        return NotificationDigest.objects.filter(
            user=self.request.user
        )
    
    @action(detail=False, methods=['post'])
    def create_digest(self, request):
        """Crea un resumen de notificaciones."""
        digest_type = request.data.get('digest_type', 'daily')
        force = request.data.get('force', False)
        
        try:
            digest = notification_service.create_digest(
                user=request.user,
                digest_type=digest_type,
                force=force
            )
            
            if digest:
                serializer = self.get_serializer(digest)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'message': 'No se creó el resumen (ya existe o no hay notificaciones)'
                })
                
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class NotificationAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para analíticas de notificaciones (solo staff)."""
    
    queryset = NotificationAnalytics.objects.all()
    serializer_class = NotificationAnalyticsSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['date', 'channel__name']
    ordering = ['-date']
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Obtiene resumen de analíticas."""
        try:
            # Últimos 30 días
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=30)
            
            analytics = NotificationAnalytics.objects.filter(
                date__gte=start_date,
                date__lte=end_date
            )
            
            # Agregaciones
            summary = analytics.aggregate(
                total_sent=models.Sum('notifications_sent'),
                total_delivered=models.Sum('notifications_delivered'),
                total_failed=models.Sum('notifications_failed'),
                total_clicked=models.Sum('notifications_clicked'),
                total_read=models.Sum('notifications_read')
            )
            
            # Calcular tasas
            total_sent = summary['total_sent'] or 0
            if total_sent > 0:
                summary['overall_delivery_rate'] = (summary['total_delivered'] or 0) / total_sent * 100
                summary['overall_click_rate'] = (summary['total_clicked'] or 0) / total_sent * 100
                summary['overall_read_rate'] = (summary['total_read'] or 0) / total_sent * 100
            else:
                summary['overall_delivery_rate'] = 0
                summary['overall_click_rate'] = 0
                summary['overall_read_rate'] = 0
            
            # Por canal
            by_channel = analytics.values('channel__name').annotate(
                sent=models.Sum('notifications_sent'),
                delivered=models.Sum('notifications_delivered'),
                failed=models.Sum('notifications_failed')
            )
            
            summary['by_channel'] = list(by_channel)
            summary['period'] = {
                'start_date': start_date,
                'end_date': end_date,
                'days': 30
            }
            
            return Response(summary)
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class NotificationTestAPIView(APIView):
    """Vista para probar envío de notificaciones."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Envía una notificación de prueba."""
        serializer = NotificationTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        recipient_id = data.get('recipient_id', request.user.id)
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            recipient = User.objects.get(id=recipient_id)
            
            notification = notification_service.create_notification(
                recipient=recipient,
                title=f"Notificación de Prueba - {data['channel_type'].upper()}",
                message=data['test_message'],
                priority='normal',
                channels=[data['channel_type']],
                data={'test': True, 'channel': data['channel_type']}
            )
            
            if notification:
                return Response({
                    'success': True,
                    'message': f'Notificación de prueba enviada via {data["channel_type"]}',
                    'notification_id': notification.id
                })
            else:
                return Response({
                    'success': False,
                    'message': 'No se pudo enviar la notificación de prueba'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class NotificationProcessAPIView(APIView):
    """Vista para procesar notificaciones programadas (uso interno)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request):
        """Procesa notificaciones programadas y reintentos."""
        try:
            # Procesar notificaciones programadas
            scheduled_stats = notification_service.process_scheduled_notifications()
            
            # Procesar reintentos
            retry_stats = notification_service.retry_failed_deliveries()
            
            return Response({
                'scheduled_notifications': scheduled_stats,
                'retry_deliveries': retry_stats,
                'processed_at': timezone.now().isoformat()
            })
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)