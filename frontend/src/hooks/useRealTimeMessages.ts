/**
 * Hook especializado para mensajería en tiempo real con WebSocket
 * Integra con React Query para sincronización de datos
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket, WebSocketMessage } from './useWebSocket';
import { useAuth } from './useAuth';
import { useNotification } from './useNotification';
import { Message, MessageThread } from '../types/message';

export interface RealTimeMessage extends Message {
  isRealTime?: boolean;
}

export interface TypingUser {
  userId: string;
  userName: string;
  threadId: string;
  timestamp: string;
}

export interface UserStatus {
  userId: string;
  userName: string;
  isOnline: boolean;
  lastSeen: string;
}

export interface UseRealTimeMessagesReturn {
  // Estados de conexión
  isConnected: boolean;
  connectionState: string;
  
  // Mensajes en tiempo real
  sendMessage: (threadId: string, content: string) => void;
  markMessagesAsRead: (threadId: string, messageIds: string[]) => void;
  
  // Indicadores de escritura
  startTyping: (threadId: string) => void;
  stopTyping: (threadId: string) => void;
  typingUsers: TypingUser[];
  
  // Estados de usuario
  userStatuses: Map<string, UserStatus>;
  
  // Gestión de conversaciones
  joinThread: (threadId: string) => void;
  leaveThread: (threadId: string) => void;
  currentThreadId: string | null;
  
  // Notificaciones
  unreadCount: number;
  hasNewMessages: boolean;
  
  // Control de conexión
  reconnect: () => void;
  disconnect: () => void;
}

export const useRealTimeMessages = (): UseRealTimeMessagesReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [userStatuses, setUserStatuses] = useState<Map<string, UserStatus>>(new Map());
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const messageQueuesRef = useRef<Map<string, RealTimeMessage[]>>(new Map());

  // WebSocket para mensajería general
  const {
    connectionState,
    sendMessage: sendWebSocketMessage,
    isConnected,
    reconnect,
    disconnect,
  } = useWebSocket({
    url: '/ws/messaging/',
    onMessage: handleWebSocketMessage,
    onOpen: handleWebSocketOpen,
    onClose: handleWebSocketClose,
    heartbeatInterval: 30000,
  });

  // WebSocket para estado de usuarios
  const {
    sendMessage: sendStatusMessage,
  } = useWebSocket({
    url: '/ws/user-status/',
    onMessage: handleUserStatusMessage,
    heartbeatInterval: 60000,
  });

  // Manejar mensajes WebSocket generales
  function handleWebSocketMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'connection_established':

break;

      case 'pending_notifications':
        handlePendingNotifications(message);
        break;

      case 'new_message':
        handleNewMessage(message);
        break;

      case 'message_read_receipt':
        handleReadReceipt(message);
        break;

      case 'typing_notification':
        handleTypingNotification(message);
        break;

      case 'conversation_updated':
        handleConversationUpdate(message);
        break;

      case 'error':
        console.error('Error WebSocket:', message.message);
        showNotification('Error en la conexión de mensajería', 'error');
        break;

      default:

}
  }

  // Manejar mensajes de estado de usuario
  function handleUserStatusMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'user_status_update':
        handleUserStatusUpdate(message);
        break;

      case 'heartbeat_ack':
        // Heartbeat confirmado
        break;

      default:

}
  }

  // Manejar conexión abierta
  function handleWebSocketOpen() {

setHasNewMessages(false);
  }

  // Manejar cierre de conexión
  function handleWebSocketClose() {

}

  // Manejar notificaciones pendientes
  function handlePendingNotifications(message: WebSocketMessage) {
    const { notifications, count } = message;
    setUnreadCount(count);
    
    if (count > 0) {
      setHasNewMessages(true);
      showNotification(`Tienes ${count} mensaje${count > 1 ? 's' : ''} sin leer`, 'info');
    }
  }

  // Manejar nuevo mensaje
  function handleNewMessage(message: WebSocketMessage) {
    const newMessage: RealTimeMessage = {
      ...message.message,
      isRealTime: true,
    };

    // Actualizar cache de React Query
    queryClient.setQueryData(
      ['messages', newMessage.thread_id],
      (oldData: any) => {
        if (!oldData) return oldData;
        
        const exists = oldData.results?.some((msg: Message) => msg.id === newMessage.id);
        if (exists) return oldData;

        return {
          ...oldData,
          results: [...(oldData.results || []), newMessage],
        };
      }
    );

    // Actualizar lista de conversaciones
    queryClient.invalidateQueries({ queryKey: ['threads'] });

    // Incrementar contador de no leídos si no es del usuario actual
    if (newMessage.sender_id !== user?.id) {
      setUnreadCount(prev => prev + 1);
      setHasNewMessages(true);

      // Mostrar notificación si no está en la conversación actual
      if (currentThreadId !== newMessage.thread_id) {
        showNotification(
          `Nuevo mensaje de ${newMessage.sender_name}`,
          'info',
          {
            autoClose: 5000,
            onClick: () => {
              // Navegar a la conversación
              window.location.href = `/messages/thread/${newMessage.thread_id}`;
            }
          }
        );
      }
    }
  }

  // Manejar confirmación de lectura
  function handleReadReceipt(message: WebSocketMessage) {
    const { message_id, read_by, read_at } = message;

    // Actualizar mensaje en cache
    queryClient.setQueryData(
      ['messages', currentThreadId],
      (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          results: oldData.results?.map((msg: Message) =>
            msg.id === message_id
              ? { ...msg, is_read: true, read_at }
              : msg
          ),
        };
      }
    );
  }

  // Manejar indicadores de escritura
  function handleTypingNotification(message: WebSocketMessage) {
    const { user_id, user_name, thread_id, is_typing } = message;

    if (is_typing) {
      setTypingUsers(prev => {
        const filtered = prev.filter(
          user => !(user.userId === user_id && user.threadId === thread_id)
        );
        
        return [
          ...filtered,
          {
            userId: user_id,
            userName: user_name,
            threadId: thread_id,
            timestamp: new Date().toISOString(),
          }
        ];
      });

      // Limpiar indicador después de un timeout
      const timeoutKey = `${user_id}-${thread_id}`;
      if (typingTimeoutRef.current.has(timeoutKey)) {
        clearTimeout(typingTimeoutRef.current.get(timeoutKey)!);
      }

      const timeout = setTimeout(() => {
        setTypingUsers(prev =>
          prev.filter(user => !(user.userId === user_id && user.threadId === thread_id))
        );
        typingTimeoutRef.current.delete(timeoutKey);
      }, 5000);

      typingTimeoutRef.current.set(timeoutKey, timeout);
    } else {
      setTypingUsers(prev =>
        prev.filter(user => !(user.userId === user_id && user.threadId === thread_id))
      );
    }
  }

  // Manejar actualización de conversación
  function handleConversationUpdate(message: WebSocketMessage) {
    // Invalidar queries relacionadas con conversaciones
    queryClient.invalidateQueries({ queryKey: ['threads'] });
    queryClient.invalidateQueries({ queryKey: ['messages', message.thread_id] });
  }

  // Manejar actualización de estado de usuario
  function handleUserStatusUpdate(message: WebSocketMessage) {
    const { user_id, user_name, is_online, last_seen } = message;
    
    setUserStatuses(prev => {
      const newMap = new Map(prev);
      newMap.set(user_id, {
        userId: user_id,
        userName: user_name,
        isOnline: is_online,
        lastSeen: last_seen,
      });
      return newMap;
    });
  }

  // Enviar mensaje
  const sendMessage = useCallback((threadId: string, content: string) => {
    if (!isConnected) {
      showNotification('No hay conexión para enviar el mensaje', 'error');
      return;
    }

    sendWebSocketMessage({
      type: 'send_message',
      thread_id: threadId,
      content: content.trim(),
    });
  }, [isConnected, sendWebSocketMessage, showNotification]);

  // Marcar mensajes como leídos
  const markMessagesAsRead = useCallback((threadId: string, messageIds: string[]) => {
    if (!isConnected || messageIds.length === 0) return;

    sendWebSocketMessage({
      type: 'mark_as_read',
      thread_id: threadId,
      message_ids: messageIds,
    });

    // Decrementar contador local
    setUnreadCount(prev => Math.max(0, prev - messageIds.length));
  }, [isConnected, sendWebSocketMessage]);

  // Iniciar indicador de escritura
  const startTyping = useCallback((threadId: string) => {
    if (!isConnected) return;

    sendWebSocketMessage({
      type: 'typing_start',
      thread_id: threadId,
    });
  }, [isConnected, sendWebSocketMessage]);

  // Detener indicador de escritura
  const stopTyping = useCallback((threadId: string) => {
    if (!isConnected) return;

    sendWebSocketMessage({
      type: 'typing_stop',
      thread_id: threadId,
    });
  }, [isConnected, sendWebSocketMessage]);

  // Unirse a conversación
  const joinThread = useCallback((threadId: string) => {
    if (!isConnected) return;

    setCurrentThreadId(threadId);
    sendWebSocketMessage({
      type: 'join_conversation',
      thread_id: threadId,
    });
  }, [isConnected, sendWebSocketMessage]);

  // Salir de conversación
  const leaveThread = useCallback((threadId: string) => {
    if (!isConnected) return;

    if (currentThreadId === threadId) {
      setCurrentThreadId(null);
    }

    sendWebSocketMessage({
      type: 'leave_conversation',
      thread_id: threadId,
    });
  }, [isConnected, sendWebSocketMessage, currentThreadId]);

  // Enviar heartbeat para estado de usuario
  useEffect(() => {
    if (!isConnected) return;

    const heartbeatInterval = setInterval(() => {
      sendStatusMessage({
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
      });
    }, 60000); // Cada minuto

    return () => clearInterval(heartbeatInterval);
  }, [isConnected, sendStatusMessage]);

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    };
  }, []);

  return {
    // Estados de conexión
    isConnected,
    connectionState,
    
    // Mensajes en tiempo real
    sendMessage,
    markMessagesAsRead,
    
    // Indicadores de escritura
    startTyping,
    stopTyping,
    typingUsers,
    
    // Estados de usuario
    userStatuses,
    
    // Gestión de conversaciones
    joinThread,
    leaveThread,
    currentThreadId,
    
    // Notificaciones
    unreadCount,
    hasNewMessages,
    
    // Control de conexión
    reconnect,
    disconnect,
  };
};