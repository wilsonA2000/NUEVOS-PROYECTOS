"""
Vistas para la aplicación de mensajería de VeriHome.
"""

from django.shortcuts import render
from django.views.generic import TemplateView, ListView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse

from .models import MessageThread, Message


class MessagingDashboardView(LoginRequiredMixin, TemplateView):
    """Vista principal de mensajería tipo Gmail."""
    template_name = 'messaging/dashboard.html'


class InboxView(LoginRequiredMixin, ListView):
    """Vista de bandeja de entrada."""
    model = MessageThread
    template_name = 'messaging/inbox.html'
    context_object_name = 'threads'
    
    def get_queryset(self):
        return MessageThread.objects.filter(
            participants=self.request.user
        ).order_by('-last_message_at')


class SentMessagesView(LoginRequiredMixin, TemplateView):
    """Vista de mensajes enviados."""
    template_name = 'messaging/sent.html'


class DraftsView(LoginRequiredMixin, TemplateView):
    """Vista de borradores."""
    template_name = 'messaging/drafts.html'


class ArchivedView(LoginRequiredMixin, TemplateView):
    """Vista de archivados."""
    template_name = 'messaging/archived.html'


class StarredView(LoginRequiredMixin, TemplateView):
    """Vista de destacados."""
    template_name = 'messaging/starred.html'


class TrashView(LoginRequiredMixin, TemplateView):
    """Vista de papelera."""
    template_name = 'messaging/trash.html'


class ConversationView(LoginRequiredMixin, DetailView):
    """Vista de conversación."""
    model = MessageThread
    template_name = 'messaging/conversation.html'
    context_object_name = 'thread'


class ArchiveConversationView(LoginRequiredMixin, TemplateView):
    """Vista para archivar conversación."""
    template_name = 'messaging/archive_conversation.html'


class StarConversationView(LoginRequiredMixin, TemplateView):
    """Vista para destacar conversación."""
    template_name = 'messaging/star_conversation.html'


class MuteConversationView(LoginRequiredMixin, TemplateView):
    """Vista para silenciar conversación."""
    template_name = 'messaging/mute_conversation.html'


class DeleteConversationView(LoginRequiredMixin, TemplateView):
    """Vista para eliminar conversación."""
    template_name = 'messaging/delete_conversation.html'


class MarkConversationReadView(LoginRequiredMixin, TemplateView):
    """Vista para marcar conversación como leída."""
    template_name = 'messaging/mark_conversation_read.html'


class MessageDetailView(LoginRequiredMixin, DetailView):
    """Vista de detalle de mensaje."""
    model = Message
    template_name = 'messaging/message_detail.html'
    context_object_name = 'message'


class MarkMessageReadView(LoginRequiredMixin, TemplateView):
    """Vista para marcar mensaje como leído."""
    template_name = 'messaging/mark_message_read.html'


class StarMessageView(LoginRequiredMixin, TemplateView):
    """Vista para destacar mensaje."""
    template_name = 'messaging/star_message.html'


class FlagMessageView(LoginRequiredMixin, TemplateView):
    """Vista para marcar mensaje."""
    template_name = 'messaging/flag_message.html'


class DeleteMessageView(LoginRequiredMixin, TemplateView):
    """Vista para eliminar mensaje."""
    template_name = 'messaging/delete_message.html'


class ForwardMessageView(LoginRequiredMixin, TemplateView):
    """Vista para reenviar mensaje."""
    template_name = 'messaging/forward_message.html'


class ComposeMessageView(LoginRequiredMixin, TemplateView):
    """Vista para componer mensaje."""
    template_name = 'messaging/compose.html'


class ReplyMessageView(LoginRequiredMixin, TemplateView):
    """Vista para responder mensaje."""
    template_name = 'messaging/reply.html'


class ReplyAllView(LoginRequiredMixin, TemplateView):
    """Vista para responder a todos."""
    template_name = 'messaging/reply_all.html'


class FolderListView(LoginRequiredMixin, TemplateView):
    """Vista de lista de carpetas."""
    template_name = 'messaging/folders.html'


class FolderMessagesView(LoginRequiredMixin, TemplateView):
    """Vista de mensajes en carpeta."""
    template_name = 'messaging/folder_messages.html'


class CreateFolderView(LoginRequiredMixin, TemplateView):
    """Vista para crear carpeta."""
    template_name = 'messaging/create_folder.html'


class EditFolderView(LoginRequiredMixin, TemplateView):
    """Vista para editar carpeta."""
    template_name = 'messaging/edit_folder.html'


class DeleteFolderView(LoginRequiredMixin, TemplateView):
    """Vista para eliminar carpeta."""
    template_name = 'messaging/delete_folder.html'


class MoveToFolderView(LoginRequiredMixin, TemplateView):
    """Vista para mover a carpeta."""
    template_name = 'messaging/move_to_folder.html'


class MessageTemplateListView(LoginRequiredMixin, TemplateView):
    """Vista de lista de plantillas."""
    template_name = 'messaging/templates.html'


class TemplateDetailView(LoginRequiredMixin, TemplateView):
    """Vista de detalle de plantilla."""
    template_name = 'messaging/template_detail.html'


class CreateTemplateView(LoginRequiredMixin, TemplateView):
    """Vista para crear plantilla."""
    template_name = 'messaging/create_template.html'


class EditTemplateView(LoginRequiredMixin, TemplateView):
    """Vista para editar plantilla."""
    template_name = 'messaging/edit_template.html'


class DeleteTemplateView(LoginRequiredMixin, TemplateView):
    """Vista para eliminar plantilla."""
    template_name = 'messaging/delete_template.html'


class UseTemplateView(LoginRequiredMixin, TemplateView):
    """Vista para usar plantilla."""
    template_name = 'messaging/use_template.html'


class SearchMessagesView(LoginRequiredMixin, TemplateView):
    """Vista de búsqueda de mensajes."""
    template_name = 'messaging/search.html'


class AdvancedSearchView(LoginRequiredMixin, TemplateView):
    """Vista de búsqueda avanzada."""
    template_name = 'messaging/advanced_search.html'


class MessagingSettingsView(LoginRequiredMixin, TemplateView):
    """Vista de configuración de mensajería."""
    template_name = 'messaging/settings.html'


class MessageFiltersView(LoginRequiredMixin, TemplateView):
    """Vista de filtros de mensajes."""
    template_name = 'messaging/filters.html'


class NotificationSettingsView(LoginRequiredMixin, TemplateView):
    """Vista de configuración de notificaciones."""
    template_name = 'messaging/notification_settings.html'


class SignatureSettingsView(LoginRequiredMixin, TemplateView):
    """Vista de configuración de firmas."""
    template_name = 'messaging/signature_settings.html'


class ContactListView(LoginRequiredMixin, TemplateView):
    """Vista de lista de contactos."""
    template_name = 'messaging/contacts.html'


class VerifyCommmunicationView(LoginRequiredMixin, TemplateView):
    """Vista para verificar comunicación."""
    template_name = 'messaging/verify_communication.html'


class DownloadAttachmentView(LoginRequiredMixin, TemplateView):
    """Vista para descargar archivo adjunto."""
    template_name = 'messaging/download_attachment.html'


class PreviewAttachmentView(LoginRequiredMixin, TemplateView):
    """Vista para vista previa de archivo adjunto."""
    template_name = 'messaging/preview_attachment.html'


class ReactToMessageView(LoginRequiredMixin, TemplateView):
    """Vista para reaccionar a mensaje."""
    template_name = 'messaging/react_to_message.html'


class RemoveReactionView(LoginRequiredMixin, TemplateView):
    """Vista para quitar reacción."""
    template_name = 'messaging/remove_reaction.html'


class MessagingStatsView(LoginRequiredMixin, TemplateView):
    """Vista de estadísticas de mensajería."""
    template_name = 'messaging/stats.html'


class BulkMarkReadView(LoginRequiredMixin, TemplateView):
    """Vista para marcar múltiples como leídos."""
    template_name = 'messaging/bulk_mark_read.html'


class BulkDeleteView(LoginRequiredMixin, TemplateView):
    """Vista para eliminar múltiples."""
    template_name = 'messaging/bulk_delete.html'


class BulkArchiveView(LoginRequiredMixin, TemplateView):
    """Vista para archivar múltiples."""
    template_name = 'messaging/bulk_archive.html'


class ExportConversationView(LoginRequiredMixin, TemplateView):
    """Vista para exportar conversación."""
    template_name = 'messaging/export_conversation.html'


class UnreadCountAPIView(LoginRequiredMixin, TemplateView):
    """API para conteo de no leídos."""
    
    def get(self, request, *args, **kwargs):
        count = Message.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()
        return JsonResponse({'unread_count': count})


class MarkReadAPIView(LoginRequiredMixin, TemplateView):
    """API para marcar como leído."""
    
    def post(self, request, *args, **kwargs):
        return JsonResponse({'success': True})


class QuickReplyAPIView(LoginRequiredMixin, TemplateView):
    """API para respuesta rápida."""
    
    def post(self, request, *args, **kwargs):
        return JsonResponse({'success': True})
