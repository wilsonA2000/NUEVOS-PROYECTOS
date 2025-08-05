"""
URLs para la aplicación de mensajería de VeriHome.
Sistema de mensajería tipo Gmail con restricciones de comunicación.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .api_views import (
    MessageThreadViewSet, MessageViewSet, MessageFolderViewSet,
    MessageTemplateViewSet, SendMessageAPIView, QuickReplyAPIView,
    MarkMessageReadAPIView, MarkMessageUnreadAPIView, StarMessageAPIView,
    MarkConversationReadAPIView, ArchiveConversationAPIView,
    SearchMessagesAPIView, MessagingStatsAPIView, UnreadCountAPIView,
    CanCommunicateAPIView, ConversationViewSet
)
from .advanced_api_views import (
    AdvancedMessageThreadViewSet, AdvancedMessageViewSet,
    MessageConversationAPIView, MessageSendAPIView, MessageSearchAPIView,
    MessageCommunicationCheckAPIView, MessageAttachmentAPIView,
    MessageStatsAPIView
)

# Configurar router para ViewSets
router = DefaultRouter()
router.register('threads', MessageThreadViewSet, basename='messagethreads')
router.register('messages', MessageViewSet, basename='messages')
router.register('folders', MessageFolderViewSet, basename='messagefolders')
router.register('templates', MessageTemplateViewSet, basename='messagetemplates')
router.register('conversations', ConversationViewSet, basename='conversations')

# Router para API avanzada
advanced_router = DefaultRouter()
advanced_router.register('advanced-threads', AdvancedMessageThreadViewSet, basename='advanced-threads')
advanced_router.register('advanced-messages', AdvancedMessageViewSet, basename='advanced-messages')

app_name = 'messaging'

urlpatterns = [
    # Vistas principales
    path('', views.InboxView.as_view(), name='inbox'),
    path('enviados/', views.SentView.as_view(), name='sent'),
    path('archivados/', views.ArchivedView.as_view(), name='archived'),
    path('destacados/', views.StarredView.as_view(), name='starred'),
    path('papelera/', views.TrashView.as_view(), name='trash'),
    path('buscar/', views.SearchThreadsView.as_view(), name='search'),
    
    # Composición y detalle de mensajes
    path('nuevo/', views.ComposeView.as_view(), name='compose'),
    path('hilo/<int:pk>/', views.ThreadDetailView.as_view(), name='thread_detail'),
    
    # Acciones sobre hilos
    path('hilo/<int:pk>/archivar/', views.ArchiveThreadView.as_view(), name='archive_thread'),
    path('hilo/<int:pk>/desarchivar/', views.UnarchiveThreadView.as_view(), name='unarchive_thread'),
    path('hilo/<int:pk>/destacar/', views.StarThreadView.as_view(), name='star_thread'),
    path('hilo/<int:pk>/quitar-destacado/', views.UnstarThreadView.as_view(), name='unstar_thread'),
    path('hilo/<int:pk>/eliminar/', views.DeleteThreadView.as_view(), name='delete_thread'),
    path('hilo/<int:pk>/restaurar/', views.RestoreThreadView.as_view(), name='restore_thread'),
    path('hilo/<int:pk>/eliminar-permanentemente/', views.PermanentlyDeleteThreadView.as_view(), name='permanently_delete_thread'),
    path('hilo/<int:pk>/marcar-spam/', views.MarkAsSpamView.as_view(), name='mark_spam'),
    path('hilo/<int:pk>/quitar-spam/', views.MarkAsNotSpamView.as_view(), name='unmark_spam'),
    
    # Bandeja de entrada y carpetas
    path('mensajes/', views.InboxView.as_view(), name='inbox_alt'),
    path('borradores/', views.DraftsView.as_view(), name='drafts'),
    path('importantes/', views.StarredView.as_view(), name='starred'),
    path('papelera/', views.TrashView.as_view(), name='trash'),
    
    # Conversaciones
    path('conversacion/<uuid:thread_pk>/', views.ConversationView.as_view(), name='conversation'),
    path('conversacion/<uuid:thread_pk>/archivar/', views.ArchiveConversationView.as_view(), name='archive_conversation'),
    path('conversacion/<uuid:thread_pk>/destacar/', views.StarConversationView.as_view(), name='star_conversation'),
    path('conversacion/<uuid:thread_pk>/silenciar/', views.MuteConversationView.as_view(), name='mute_conversation'),
    path('conversacion/<uuid:thread_pk>/eliminar/', views.DeleteConversationView.as_view(), name='delete_conversation'),
    path('conversacion/<uuid:thread_pk>/marcar-leida/', views.MarkConversationReadView.as_view(), name='mark_conversation_read'),
    
    # Mensajes individuales
    path('mensaje/<uuid:message_pk>/', views.MessageDetailView.as_view(), name='message_detail'),
    path('mensaje/<uuid:message_pk>/marcar-leido/', views.MarkMessageReadView.as_view(), name='mark_message_read'),
    path('mensaje/<uuid:message_pk>/destacar/', views.StarMessageView.as_view(), name='star_message'),
    path('mensaje/<uuid:message_pk>/marcar/', views.FlagMessageView.as_view(), name='flag_message'),
    path('mensaje/<uuid:message_pk>/eliminar/', views.DeleteMessageView.as_view(), name='delete_message'),
    path('mensaje/<uuid:message_pk>/reenviar/', views.ForwardMessageView.as_view(), name='forward_message'),
    
    # Envío de mensajes
    path('responder/<uuid:message_pk>/', views.ReplyMessageView.as_view(), name='reply'),
    path('responder-todos/<uuid:thread_pk>/', views.ReplyAllView.as_view(), name='reply_all'),
    
    # Carpetas personalizadas
    path('carpetas/', views.FolderListView.as_view(), name='folders'),
    path('carpeta/<int:folder_pk>/', views.FolderMessagesView.as_view(), name='folder_messages'),
    path('carpeta/crear/', views.CreateFolderView.as_view(), name='create_folder'),
    path('carpeta/<int:folder_pk>/editar/', views.EditFolderView.as_view(), name='edit_folder'),
    path('carpeta/<int:folder_pk>/eliminar/', views.DeleteFolderView.as_view(), name='delete_folder'),
    path('mensaje/<uuid:message_pk>/mover-carpeta/', views.MoveToFolderView.as_view(), name='move_to_folder'),
    
    # Plantillas de mensajes
    path('plantillas/', views.MessageTemplateListView.as_view(), name='templates'),
    path('plantilla/<int:template_pk>/', views.TemplateDetailView.as_view(), name='template_detail'),
    path('plantilla/crear/', views.CreateTemplateView.as_view(), name='create_template'),
    path('plantilla/<int:template_pk>/editar/', views.EditTemplateView.as_view(), name='edit_template'),
    path('plantilla/<int:template_pk>/eliminar/', views.DeleteTemplateView.as_view(), name='delete_template'),
    path('plantilla/<int:template_pk>/usar/', views.UseTemplateView.as_view(), name='use_template'),
    
    # Búsqueda de mensajes
    path('busqueda-avanzada/', views.AdvancedSearchView.as_view(), name='advanced_search'),
    
    # Configuración de mensajería
    path('configuracion/', views.MessagingSettingsView.as_view(), name='settings'),
    path('configuracion/filtros/', views.MessageFiltersView.as_view(), name='filters'),
    path('configuracion/notificaciones/', views.NotificationSettingsView.as_view(), name='notification_settings'),
    path('configuracion/firmas/', views.SignatureSettingsView.as_view(), name='signature_settings'),
    
    # Contactos y comunicación
    path('contactos/', views.ContactListView.as_view(), name='contacts'),
    path('contactos/verificar-comunicacion/<uuid:user_pk>/', views.VerifyCommmunicationView.as_view(), name='verify_communication'),
    
    # Archivos adjuntos
    path('archivo/<int:attachment_pk>/descargar/', views.DownloadAttachmentView.as_view(), name='download_attachment'),
    path('archivo/<int:attachment_pk>/vista-previa/', views.PreviewAttachmentView.as_view(), name='preview_attachment'),
    
    # Reacciones a mensajes
    path('mensaje/<uuid:message_pk>/reaccionar/', views.ReactToMessageView.as_view(), name='react_to_message'),
    path('mensaje/<uuid:message_pk>/quitar-reaccion/', views.RemoveReactionView.as_view(), name='remove_reaction'),
    
    # Estadísticas y analytics
    path('estadisticas/', views.MessagingStatsView.as_view(), name='stats'),
    
    # Operaciones masivas
    path('marcar-multiples-leidas/', views.BulkMarkReadView.as_view(), name='bulk_mark_read'),
    path('eliminar-multiples/', views.BulkDeleteView.as_view(), name='bulk_delete'),
    path('archivar-multiples/', views.BulkArchiveView.as_view(), name='bulk_archive'),
    
    # Exportar conversaciones
    path('conversacion/<uuid:thread_pk>/exportar/', views.ExportConversationView.as_view(), name='export_conversation'),
    
    # API endpoints para funcionalidad AJAX
    path('api/unread-count/', UnreadCountAPIView.as_view(), name='api_unread_count'),
    path('api/mark-read/<uuid:message_pk>/', views.MarkReadAPIView.as_view(), name='api_mark_read'),
    path('api/quick-reply/', QuickReplyAPIView.as_view(), name='api_quick_reply'),
    
    # API REST endpoints
    path('api/', include(router.urls)),
    
    # API básica de mensajería
    path('api/send-message/', SendMessageAPIView.as_view(), name='api_send_message'),
    path('api/mark-message-read/<uuid:message_pk>/', MarkMessageReadAPIView.as_view(), name='api_mark_message_read'),
    path('api/mark-message-unread/<uuid:message_pk>/', MarkMessageUnreadAPIView.as_view(), name='api_mark_message_unread'),
    path('api/star-message/<uuid:message_pk>/', StarMessageAPIView.as_view(), name='api_star_message'),
    path('api/mark-conversation-read/<uuid:thread_pk>/', MarkConversationReadAPIView.as_view(), name='api_mark_conversation_read'),
    path('api/archive-conversation/<uuid:thread_pk>/', ArchiveConversationAPIView.as_view(), name='api_archive_conversation'),
    path('api/search-messages/', SearchMessagesAPIView.as_view(), name='api_search_messages'),
    path('api/messaging-stats/', MessagingStatsAPIView.as_view(), name='api_messaging_stats'),
    path('api/can-communicate/<uuid:user_pk>/', CanCommunicateAPIView.as_view(), name='api_can_communicate'),
    
    # API avanzada de mensajería
    path('api/advanced/', include(advanced_router.urls)),
    path('api/advanced/conversation/create/', MessageConversationAPIView.as_view(), name='api_create_conversation'),
    path('api/advanced/message/send/', MessageSendAPIView.as_view(), name='api_send_advanced_message'),
    path('api/advanced/search/', MessageSearchAPIView.as_view(), name='api_advanced_search'),
    path('api/advanced/communication-check/<int:user_id>/', MessageCommunicationCheckAPIView.as_view(), name='api_communication_check'),
    path('api/advanced/attachment/upload/', MessageAttachmentAPIView.as_view(), name='api_upload_attachment'),
    path('api/advanced/stats/', MessageStatsAPIView.as_view(), name='api_advanced_stats'),
]
