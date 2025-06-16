"""
URLs de la API REST para la aplicación de mensajería de VeriHome.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

# Router para ViewSets
router = DefaultRouter()
router.register(r'threads', api_views.MessageThreadViewSet)
router.register(r'messages', api_views.MessageViewSet)
router.register(r'folders', api_views.MessageFolderViewSet)
router.register(r'templates', api_views.MessageTemplateViewSet)

urlpatterns = [
    # Incluir rutas del router
    path('', include(router.urls)),
    
    # Envío de mensajes
    path('send/', api_views.SendMessageAPIView.as_view(), name='api_send_message'),
    path('quick-reply/', api_views.QuickReplyAPIView.as_view(), name='api_quick_reply'),
    
    # Estado de mensajes
    path('mark-read/<uuid:message_pk>/', api_views.MarkMessageReadAPIView.as_view(), name='api_mark_read'),
    path('mark-unread/<uuid:message_pk>/', api_views.MarkMessageUnreadAPIView.as_view(), name='api_mark_unread'),
    path('star/<uuid:message_pk>/', api_views.StarMessageAPIView.as_view(), name='api_star_message'),
    
    # Conversaciones
    path('conversation/<uuid:thread_pk>/mark-read/', api_views.MarkConversationReadAPIView.as_view(), name='api_mark_conversation_read'),
    path('conversation/<uuid:thread_pk>/archive/', api_views.ArchiveConversationAPIView.as_view(), name='api_archive_conversation'),
    
    # Búsqueda
    path('search/', api_views.SearchMessagesAPIView.as_view(), name='api_search_messages'),
    
    # Estadísticas
    path('stats/', api_views.MessagingStatsAPIView.as_view(), name='api_messaging_stats'),
    path('unread-count/', api_views.UnreadCountAPIView.as_view(), name='api_unread_count'),
    
    # Verificación de comunicación
    path('can-communicate/<uuid:user_pk>/', api_views.CanCommunicateAPIView.as_view(), name='api_can_communicate'),
]
