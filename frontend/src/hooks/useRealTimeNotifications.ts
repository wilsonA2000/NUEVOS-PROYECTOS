/**
 * Hook para notificaciones push en tiempo real
 * Integra con el sistema WebSocket para notificaciones instantáneas
 */

import { useCallback, useEffect, useState } from 'react';
import { useWebSocket, WebSocketMessage } from './useWebSocket';
import { useNotification } from './useNotification';
import { useAuth } from './useAuth';

export interface RealTimeNotification {
  id: string;
  type: 'message' | 'contract' | 'payment' | 'property' | 'system' | 'urgent';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionLabel?: string;
  icon?: string;
  image?: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface UseRealTimeNotificationsReturn {
  // Estado de conexión
  isConnected: boolean;
  connectionState: string;
  
  // Notificaciones
  notifications: RealTimeNotification[];
  unreadCount: number;
  
  // Acciones
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  
  // Configuración
  enablePushNotifications: () => Promise<boolean>;
  disablePushNotifications: () => void;
  isPushEnabled: boolean;
  
  // Control
  reconnect: () => void;
  disconnect: () => void;
}

export const useRealTimeNotifications = (): UseRealTimeNotificationsReturn => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [isPushEnabled, setIsPushEnabled] = useState(false);

  // WebSocket para notificaciones
  const {
    connectionState,
    isConnected,
    reconnect,
    disconnect,
  } = useWebSocket({
    url: '/ws/notifications/',
    onMessage: handleNotificationMessage,
    onOpen: handleConnectionOpen,
    heartbeatInterval: 60000, // 1 minuto
  });

  // Verificar soporte para notificaciones push del navegador
  useEffect(() => {
    if ('Notification' in window) {
      setIsPushEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Manejar mensajes WebSocket de notificaciones
  function handleNotificationMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'general_notification':
        handleGeneralNotification(message);
        break;

      case 'system_notification':
        handleSystemNotification(message);
        break;

      case 'urgent_notification':
        handleUrgentNotification(message);
        break;

      case 'message_notification':
        handleMessageNotification(message);
        break;

      case 'contract_notification':
        handleContractNotification(message);
        break;

      case 'payment_notification':
        handlePaymentNotification(message);
        break;

      case 'property_notification':
        handlePropertyNotification(message);
        break;

      default:

}
  }

  // Manejar conexión establecida
  function handleConnectionOpen() {

showNotification('Notificaciones en tiempo real activadas', 'success');
  }

  // Manejar notificación general
  function handleGeneralNotification(message: WebSocketMessage) {
    const notification: RealTimeNotification = {
      id: message.id || Date.now().toString(),
      type: 'system',
      title: message.title || 'Notificación',
      message: message.message || '',
      data: message.data,
      timestamp: message.timestamp || new Date().toISOString(),
      isRead: false,
      priority: message.priority || 'medium',
      actionUrl: message.action_url,
      actionLabel: message.action_label,
      icon: message.icon,
      image: message.image,
      sender: message.sender,
    };

    addNotification(notification);
    showInAppNotification(notification);
    
    if (isPushEnabled) {
      showBrowserNotification(notification);
    }
  }

  // Manejar notificación del sistema
  function handleSystemNotification(message: WebSocketMessage) {
    const notification: RealTimeNotification = {
      id: message.id || Date.now().toString(),
      type: 'system',
      title: message.title || 'Notificación del Sistema',
      message: message.message || '',
      data: message.data,
      timestamp: message.timestamp || new Date().toISOString(),
      isRead: false,
      priority: 'high',
      actionUrl: message.action_url,
      actionLabel: message.action_label,
      icon: 'system',
    };

    addNotification(notification);
    showInAppNotification(notification);
    
    if (isPushEnabled) {
      showBrowserNotification(notification);
    }
  }

  // Manejar notificación urgente
  function handleUrgentNotification(message: WebSocketMessage) {
    const notification: RealTimeNotification = {
      id: message.id || Date.now().toString(),
      type: 'urgent',
      title: message.title || '¡URGENTE!',
      message: message.message || '',
      data: message.data,
      timestamp: message.timestamp || new Date().toISOString(),
      isRead: false,
      priority: 'urgent',
      actionUrl: message.action_url,
      actionLabel: message.action_label,
      icon: 'warning',
    };

    addNotification(notification);
    showInAppNotification(notification, true);
    
    if (isPushEnabled) {
      showBrowserNotification(notification);
    }

    // Para notificaciones urgentes, también mostrar alert
    if (notification.priority === 'urgent') {
      setTimeout(() => {
        if (window.confirm(`NOTIFICACIÓN URGENTE:\n${notification.title}\n${notification.message}\n\n¿Desea verla ahora?`)) {
          if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
        }
      }, 1000);
    }
  }

  // Manejar notificación de mensaje
  function handleMessageNotification(message: WebSocketMessage) {
    const notification: RealTimeNotification = {
      id: message.id || Date.now().toString(),
      type: 'message',
      title: `Nuevo mensaje de ${message.sender_name || 'Usuario'}`,
      message: message.content_preview || 'Has recibido un nuevo mensaje',
      data: { threadId: message.thread_id, messageId: message.message_id },
      timestamp: message.timestamp || new Date().toISOString(),
      isRead: false,
      priority: 'medium',
      actionUrl: `/app/messages/thread/${message.thread_id}`,
      actionLabel: 'Ver mensaje',
      icon: 'message',
      sender: {
        id: message.sender_id,
        name: message.sender_name,
        avatar: message.sender_avatar,
      },
    };

    addNotification(notification);
    showInAppNotification(notification);
    
    if (isPushEnabled) {
      showBrowserNotification(notification);
    }
  }

  // Manejar notificación de contrato
  function handleContractNotification(message: WebSocketMessage) {
    const notification: RealTimeNotification = {
      id: message.id || Date.now().toString(),
      type: 'contract',
      title: message.title || 'Actualización de Contrato',
      message: message.message || '',
      data: { contractId: message.contract_id },
      timestamp: message.timestamp || new Date().toISOString(),
      isRead: false,
      priority: message.priority || 'high',
      actionUrl: `/app/contracts/${message.contract_id}`,
      actionLabel: 'Ver contrato',
      icon: 'contract',
    };

    addNotification(notification);
    showInAppNotification(notification);
    
    if (isPushEnabled) {
      showBrowserNotification(notification);
    }
  }

  // Manejar notificación de pago
  function handlePaymentNotification(message: WebSocketMessage) {
    const notification: RealTimeNotification = {
      id: message.id || Date.now().toString(),
      type: 'payment',
      title: message.title || 'Actualización de Pago',
      message: message.message || '',
      data: { paymentId: message.payment_id },
      timestamp: message.timestamp || new Date().toISOString(),
      isRead: false,
      priority: 'high',
      actionUrl: `/app/payments/${message.payment_id}`,
      actionLabel: 'Ver pago',
      icon: 'payment',
    };

    addNotification(notification);
    showInAppNotification(notification);
    
    if (isPushEnabled) {
      showBrowserNotification(notification);
    }
  }

  // Manejar notificación de propiedad
  function handlePropertyNotification(message: WebSocketMessage) {
    const notification: RealTimeNotification = {
      id: message.id || Date.now().toString(),
      type: 'property',
      title: message.title || 'Actualización de Propiedad',
      message: message.message || '',
      data: { propertyId: message.property_id },
      timestamp: message.timestamp || new Date().toISOString(),
      isRead: false,
      priority: message.priority || 'medium',
      actionUrl: `/app/properties/${message.property_id}`,
      actionLabel: 'Ver propiedad',
      icon: 'property',
    };

    addNotification(notification);
    showInAppNotification(notification);
    
    if (isPushEnabled) {
      showBrowserNotification(notification);
    }
  }

  // Agregar notificación a la lista
  const addNotification = useCallback((notification: RealTimeNotification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Mantener máximo 50
  }, []);

  // Mostrar notificación en la app
  const showInAppNotification = useCallback((notification: RealTimeNotification, isUrgent = false) => {
    const severity = notification.priority === 'urgent' ? 'error' : 
                    notification.priority === 'high' ? 'warning' : 'info';
    
    showNotification(
      notification.title,
      severity,
      {
        autoClose: isUrgent ? false : 5000,
        onClick: notification.actionUrl ? () => {
          window.location.href = notification.actionUrl!;
        } : undefined,
      }
    );
  }, [showNotification]);

  // Mostrar notificación del navegador
  const showBrowserNotification = useCallback((notification: RealTimeNotification) => {
    if (!isPushEnabled || !('Notification' in window)) return;

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: notification.icon ? `/icons/${notification.icon}.png` : '/icons/default.png',
      image: notification.image,
      badge: '/icons/badge.png',
      tag: notification.id,
      requireInteraction: notification.priority === 'urgent',
      silent: notification.priority === 'low',
    });

    browserNotification.onclick = () => {
      window.focus();
      if (notification.actionUrl) {
        window.location.href = notification.actionUrl;
      }
      browserNotification.close();
    };

    // Cerrar automáticamente después de 10 segundos (excepto urgentes)
    if (notification.priority !== 'urgent') {
      setTimeout(() => {
        browserNotification.close();
      }, 10000);
    }
  }, [isPushEnabled]);

  // Habilitar notificaciones push
  const enablePushNotifications = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      showNotification('Tu navegador no soporta notificaciones', 'error');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const enabled = permission === 'granted';
      setIsPushEnabled(enabled);
      
      if (enabled) {
        showNotification('Notificaciones push habilitadas', 'success');
      } else {
        showNotification('Notificaciones push denegadas', 'warning');
      }
      
      return enabled;
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      showNotification('Error al habilitar notificaciones', 'error');
      return false;
    }
  }, [showNotification]);

  // Deshabilitar notificaciones push
  const disablePushNotifications = useCallback(() => {
    setIsPushEnabled(false);
    showNotification('Notificaciones push deshabilitadas', 'info');
  }, [showNotification]);

  // Marcar notificación como leída
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  }, []);

  // Limpiar notificación
  const clearNotification = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );
  }, []);

  // Limpiar todas las notificaciones
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Contar notificaciones no leídas
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    // Estado de conexión
    isConnected,
    connectionState,
    
    // Notificaciones
    notifications,
    unreadCount,
    
    // Acciones
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    
    // Configuración
    enablePushNotifications,
    disablePushNotifications,
    isPushEnabled,
    
    // Control
    reconnect,
    disconnect,
  };
};