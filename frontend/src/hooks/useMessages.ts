import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '../services/messageService';
import { useAuth } from './useAuth';

export const useMessages = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Mensajes básicos
  const { data: messages, isLoading, error } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => {
      try {
        const result = await messageService.getMessages();
        return result;
      } catch (error: any) {
        throw error;
      }
    },
    retry: 2,
    retryDelay: 1000,
    enabled: isAuthenticated,
  });

  // Hilos/conversaciones
  const { data: threads } = useQuery({
    queryKey: ['message-threads'],
    queryFn: async () => {
      try {
        const result = await messageService.getThreads();
        return result;
      } catch (error: any) {
        throw error;
      }
    },
    retry: 2,
    retryDelay: 1000,
    enabled: isAuthenticated,
  });

  // Carpetas
  const { data: folders } = useQuery({
    queryKey: ['message-folders'],
    queryFn: async () => {
      try {
        const result = await messageService.getFolders();
        return result;
      } catch (error: any) {
        throw error;
      }
    },
    retry: 2,
    retryDelay: 1000,
    enabled: isAuthenticated,
  });

  // Plantillas
  const { data: templates } = useQuery({
    queryKey: ['message-templates'],
    queryFn: async () => {
      try {
        const result = await messageService.getTemplates();
        return result;
      } catch (error: any) {
        throw error;
      }
    },
    retry: 2,
    retryDelay: 1000,
    enabled: isAuthenticated,
  });

  // Conversaciones
  const { data: conversations } = useQuery({
    queryKey: ['message-conversations'],
    queryFn: async () => {
      try {
        const result = await messageService.getConversations();
        return result;
      } catch (error: any) {
        throw error;
      }
    },
    retry: 2,
    retryDelay: 1000,
    enabled: isAuthenticated,
  });

  // Conteo no leídos - con mejor manejo de errores
  const { data: unreadCount } = useQuery({
    queryKey: ['message-unread-count'],
    queryFn: async () => {
      try {
        const result = await messageService.getUnreadCount();
        return result;
      } catch (error: any) {
        return 0;
      }
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000, // 1 minuto
    enabled: isAuthenticated,
  });

  // Estadísticas
  const { data: messagingStats } = useQuery({
    queryKey: ['messaging-stats'],
    queryFn: async () => {
      try {
        const result = await messageService.getMessagingStats();
        return result;
      } catch (error: any) {
        throw error;
      }
    },
    retry: 2,
    retryDelay: 1000,
    enabled: isAuthenticated,
  });

  // Mutaciones para mensajes
  const createMessage = useMutation({
    mutationFn: messageService.createMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      queryClient.invalidateQueries({ queryKey: ['message-unread-count'] });
    },
  });

  const updateMessage = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      messageService.updateMessage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: messageService.deleteMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['message-unread-count'] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: messageService.sendMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      queryClient.invalidateQueries({ queryKey: ['message-conversations'] });
    },
  });

  const quickReply = useMutation({
    mutationFn: messageService.quickReply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
  });

  const markAsRead = useMutation({
    mutationFn: messageService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['message-unread-count'] });
    },
  });

  const markAsUnread = useMutation({
    mutationFn: messageService.markAsUnread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['message-unread-count'] });
    },
  });

  const starMessage = useMutation({
    mutationFn: messageService.starMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  // Mutaciones para hilos
  const createThread = useMutation({
    mutationFn: messageService.createThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
  });

  const updateThread = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      messageService.updateThread(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
  });

  const deleteThread = useMutation({
    mutationFn: messageService.deleteThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
  });

  const markConversationRead = useMutation({
    mutationFn: messageService.markConversationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      queryClient.invalidateQueries({ queryKey: ['message-unread-count'] });
    },
  });

  const archiveConversation = useMutation({
    mutationFn: messageService.archiveConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      queryClient.invalidateQueries({ queryKey: ['message-conversations'] });
    },
  });

  // Mutaciones para carpetas
  const createFolder = useMutation({
    mutationFn: messageService.createFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-folders'] });
    },
  });

  const updateFolder = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      messageService.updateFolder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-folders'] });
    },
  });

  const deleteFolder = useMutation({
    mutationFn: messageService.deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-folders'] });
    },
  });

  // Mutaciones para plantillas
  const createTemplate = useMutation({
    mutationFn: messageService.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      messageService.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: messageService.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
    },
  });

  // Mutaciones para conversaciones
  const createConversation = useMutation({
    mutationFn: messageService.createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-conversations'] });
    },
  });

  const updateConversation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      messageService.updateConversation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-conversations'] });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: messageService.deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-conversations'] });
    },
  });

  // Búsqueda
  const searchMessages = useMutation({
    mutationFn: messageService.searchMessages,
  });

  // Verificación de comunicación
  const canCommunicate = useMutation({
    mutationFn: messageService.canCommunicate,
  });

  return {
    // Datos
    messages,
    threads,
    folders,
    templates,
    conversations,
    unreadCount,
    messagingStats,
    
    // Estados
    isLoading,
    error,
    
    // Mutaciones de mensajes
    createMessage,
    updateMessage,
    deleteMessage,
    sendMessage,
    quickReply,
    markAsRead,
    markAsUnread,
    starMessage,
    
    // Mutaciones de hilos
    createThread,
    updateThread,
    deleteThread,
    markConversationRead,
    archiveConversation,
    
    // Mutaciones de carpetas
    createFolder,
    updateFolder,
    deleteFolder,
    
    // Mutaciones de plantillas
    createTemplate,
    updateTemplate,
    deleteTemplate,
    
    // Mutaciones de conversaciones
    createConversation,
    updateConversation,
    deleteConversation,
    
    // Utilidades
    searchMessages,
    canCommunicate,
  };
}; 