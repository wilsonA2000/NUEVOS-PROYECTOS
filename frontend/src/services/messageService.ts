import { api } from './api';
import { Message, MessageThread, MessageFolder, MessageTemplate } from '../types/message';

// Eventos WebSocket para integración con tiempo real
export interface WebSocketMessageEvent {
  type: 'new_message' | 'message_read' | 'message_updated' | 'thread_updated';
  data: any;
}

class MessageService {
  private webSocketCallbacks: Map<string, Function[]> = new Map();

  // Registrar callback para eventos WebSocket
  onWebSocketEvent(eventType: string, callback: Function) {
    if (!this.webSocketCallbacks.has(eventType)) {
      this.webSocketCallbacks.set(eventType, []);
    }
    this.webSocketCallbacks.get(eventType)!.push(callback);
  }

  // Desregistrar callback
  offWebSocketEvent(eventType: string, callback: Function) {
    const callbacks = this.webSocketCallbacks.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Emitir evento WebSocket (llamado desde el hook useRealTimeMessages)
  emitWebSocketEvent(eventType: string, data: any) {
    const callbacks = this.webSocketCallbacks.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // === MENSAJES ===
  async getMessages(threadId?: string, page = 1, limit = 20): Promise<{ results: Message[], count: number, next: string | null, previous: string | null }> {
    const params: any = { page, limit };
    if (threadId) params.thread = threadId;
    
    const response = await api.get('/messages/messages/', { params });
    return response.data;
  }

  async getMessage(id: string): Promise<Message> {
    const response = await api.get(`/messages/messages/${id}/`);
    return response.data;
  }

  async createMessage(data: { thread_id: string; content: string; attachments?: File[] }): Promise<Message> {
    const formData = new FormData();
    formData.append('thread', data.thread_id);
    formData.append('content', data.content);
    
    if (data.attachments) {
      data.attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });
    }

    const response = await api.post('/messages/messages/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Emitir evento para integración con WebSocket
    this.emitWebSocketEvent('new_message', response.data);
    
    return response.data;
  }

  async updateMessage(id: string, data: Partial<Message>): Promise<Message> {
    const response = await api.put(`/messages/messages/${id}/`, data);
    
    // Emitir evento para integración con WebSocket
    this.emitWebSocketEvent('message_updated', response.data);
    
    return response.data;
  }

  async deleteMessage(id: string): Promise<void> {
    await api.delete(`/messages/messages/${id}/`);
  }

  async markMessageAsRead(id: string): Promise<void> {
    await api.post(`/messages/mark-read/${id}/`);
    
    // Emitir evento para integración con WebSocket
    this.emitWebSocketEvent('message_read', { id, isRead: true });
  }

  async markMessagesAsRead(ids: string[]): Promise<void> {
    await api.post('/messages/mark-multiple-read/', { message_ids: ids });
    
    // Emitir evento para integración con WebSocket
    ids.forEach(id => {
      this.emitWebSocketEvent('message_read', { id, isRead: true });
    });
  }

  // === CONVERSACIONES/THREADS ===
  async getThreads(page = 1, limit = 20): Promise<{ results: MessageThread[], count: number, next: string | null, previous: string | null }> {
    const response = await api.get('/messages/threads/', { 
      params: { page, limit } 
    });
    return response.data;
  }

  async getThread(id: string): Promise<MessageThread> {
    const response = await api.get(`/messages/threads/${id}/`);
    return response.data;
  }

  async createThread(data: { 
    subject: string; 
    participants: string[]; 
    initial_message?: string 
  }): Promise<MessageThread> {
    const response = await api.post('/messages/threads/', data);
    
    // Emitir evento para integración con WebSocket
    this.emitWebSocketEvent('thread_updated', response.data);
    
    return response.data;
  }

  async updateThread(id: string, data: Partial<MessageThread>): Promise<MessageThread> {
    const response = await api.put(`/messages/threads/${id}/`, data);
    
    // Emitir evento para integración con WebSocket
    this.emitWebSocketEvent('thread_updated', response.data);
    
    return response.data;
  }

  async deleteThread(id: string): Promise<void> {
    await api.delete(`/messages/threads/${id}/`);
  }

  async archiveThread(id: string): Promise<MessageThread> {
    const response = await api.post(`/messages/threads/${id}/archive/`);
    
    // Emitir evento para integración con WebSocket
    this.emitWebSocketEvent('thread_updated', response.data);
    
    return response.data;
  }

  async unarchiveThread(id: string): Promise<MessageThread> {
    const response = await api.post(`/messages/threads/${id}/unarchive/`);
    
    // Emitir evento para integración con WebSocket
    this.emitWebSocketEvent('thread_updated', response.data);
    
    return response.data;
  }

  // Alias para compatibilidad - las conversaciones son los threads
  async getConversations(page = 1, limit = 20) {
    return this.getThreads(page, limit);
  }

  async createConversation(data: any) {
    return this.createThread(data);
  }

  async updateConversation(id: string, data: any) {
    return this.updateThread(id, data);
  }

  async deleteConversation(id: string) {
    return this.deleteThread(id);
  }

  async markConversationRead(id: string) {
    return this.markThreadAsRead(id);
  }

  async archiveConversation(id: string) {
    return this.archiveThread(id);
  }

  // === FOLDERS ===
  async getFolders(): Promise<MessageFolder[]> {
    const response = await api.get('/messages/folders/');
    return response.data;
  }

  async getFolder(id: string): Promise<MessageFolder> {
    const response = await api.get(`/messages/folders/${id}/`);
    return response.data;
  }

  async createFolder(data: { name: string; color?: string }): Promise<MessageFolder> {
    const response = await api.post('/messages/folders/', data);
    return response.data;
  }

  async updateFolder(id: string, data: Partial<MessageFolder>): Promise<MessageFolder> {
    const response = await api.put(`/messages/folders/${id}/`, data);
    return response.data;
  }

  async deleteFolder(id: string): Promise<void> {
    await api.delete(`/messages/folders/${id}/`);
  }

  // === TEMPLATES ===
  async getTemplates(): Promise<MessageTemplate[]> {
    const response = await api.get('/messages/templates/');
    return response.data;
  }

  async getTemplate(id: string): Promise<MessageTemplate> {
    const response = await api.get(`/messages/templates/${id}/`);
    return response.data;
  }

  async createTemplate(data: { name: string; content: string; category?: string }): Promise<MessageTemplate> {
    const response = await api.post('/messages/templates/', data);
    return response.data;
  }

  async updateTemplate(id: string, data: Partial<MessageTemplate>): Promise<MessageTemplate> {
    const response = await api.put(`/messages/templates/${id}/`, data);
    return response.data;
  }

  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`/messages/templates/${id}/`);
  }

  // === UTILIDADES ===
  async sendMessage(data: { 
    thread_id: string; 
    content: string; 
    attachments?: File[] 
  }): Promise<Message> {
    // Usar createMessage que ya tiene integración WebSocket
    return this.createMessage(data);
  }

  async quickReply(data: { 
    original_message_id: string; 
    content: string 
  }): Promise<Message> {
    const response = await api.post('/messages/quick-reply/', data);
    
    // Emitir evento para integración con WebSocket
    this.emitWebSocketEvent('new_message', response.data);
    
    return response.data;
  }

  async starMessage(id: string): Promise<Message> {
    const response = await api.post(`/messages/star/${id}/`);
    
    // Emitir evento para integración con WebSocket
    this.emitWebSocketEvent('message_updated', response.data);
    
    return response.data;
  }

  async unstarMessage(id: string): Promise<Message> {
    const response = await api.post(`/messages/unstar/${id}/`);
    
    // Emitir evento para integración con WebSocket
    this.emitWebSocketEvent('message_updated', response.data);
    
    return response.data;
  }

  async markThreadAsRead(threadId: string): Promise<void> {
    await api.post(`/messages/threads/${threadId}/mark-read/`);
    
    // Emitir evento para integración con WebSocket
    this.emitWebSocketEvent('thread_updated', { id: threadId, is_read: true });
  }

  async searchMessages(searchParams: { 
    query?: string; 
    thread_id?: string; 
    sender?: string; 
    date_from?: string; 
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<{ results: Message[], count: number }> {
    const response = await api.get('/messages/search/', { params: searchParams });
    return response.data;
  }

  async getMessagingStats(): Promise<{
    total_messages: number;
    unread_messages: number;
    total_threads: number;
    active_threads: number;
    messages_today: number;
    messages_this_week: number;
  }> {
    const response = await api.get('/messages/stats/');
    return response.data;
  }

  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get('/messages/unread-count/');
      return response.data?.count ?? 0;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      return 0;
    }
  }

  async canCommunicate(userId: string): Promise<{ can_communicate: boolean; reason?: string }> {
    const response = await api.get(`/messages/can-communicate/${userId}/`);
    return response.data;
  }

  // === FUNCIONES ESPECÍFICAS PARA WEBSOCKET ===
  async sendRealTimeMessage(threadId: string, content: string): Promise<void> {
    // Esta función será llamada desde el hook useRealTimeMessages
    // Solo valida y prepara los datos, el envío real es por WebSocket
    if (!content.trim()) {
      throw new Error('El contenido del mensaje no puede estar vacío');
    }
    
    if (!threadId) {
      throw new Error('ID de conversación requerido');
    }
    
    // La validación pasó, el hook puede proceder con el envío por WebSocket
  }

  async validateThreadAccess(threadId: string): Promise<boolean> {
    try {
      await this.getThread(threadId);
      return true;
    } catch (error) {
      console.error('Error validating thread access:', error);
      return false;
    }
  }

  // === CACHE Y OPTIMIZATIONS ===
  async preloadThread(threadId: string): Promise<void> {
    // Precargar datos de la conversación para mejor UX
    try {
      await Promise.all([
        this.getThread(threadId),
        this.getMessages(threadId, 1, 50), // Cargar primeros 50 mensajes
      ]);
    } catch (error) {
      console.error('Error preloading thread:', error);
    }
  }

  // === MÉTODOS ADICIONALES PARA COMPATIBILIDAD ===
  async markAsUnread(ids: string[]): Promise<void> {
    await api.post('/messages/mark-unread/', { ids });
  }

}

// Crear instancia singleton
export const messageService = new MessageService(); 