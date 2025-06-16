"""
URLs para la aplicación de mensajería de VeriHome.
Sistema de mensajería tipo Gmail con restricciones de comunicación.
"""

from django.urls import path
from . import views

app_name = 'messaging'

urlpatterns = [
    # Vista principal de mensajería (tipo Gmail)
    path('', views.MessagingDashboardView.as_view(), name='dashboard'),
    
    # Bandeja de entrada y carpetas
    path('bandeja-entrada/', views.InboxView.as_view(), name='inbox'),
    path('enviados/', views.SentMessagesView.as_view(), name='sent'),
    path('borradores/', views.DraftsView.as_view(), name='drafts'),
    path('archivados/', views.ArchivedView.as_view(), name='archived'),
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
    path('nuevo/', views.ComposeMessageView.as_view(), name='compose'),
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
    path('buscar/', views.SearchMessagesView.as_view(), name='search'),
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
    path('api/unread-count/', views.UnreadCountAPIView.as_view(), name='api_unread_count'),
    path('api/mark-read/<uuid:message_pk>/', views.MarkReadAPIView.as_view(), name='api_mark_read'),
    path('api/quick-reply/', views.QuickReplyAPIView.as_view(), name='api_quick_reply'),
]
