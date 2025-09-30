import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useWebSocket } from './useWebSocket';
import { useNavigate } from 'react-router-dom';

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: 'message' | 'contract' | 'payment' | 'property' | 'rating' | 'inquiry' | 'system' | 'reminder' | 'welcome' | 'verification';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
  action_url?: string;
  action_label?: string;
  content_type?: string;
  object_id?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  
  // WebSocket para notificaciones en tiempo real - TEMPORALMENTE DESHABILITADO
  // const { sendMessage, lastMessage, isConnected } = useWebSocket('/ws/notifications/');
  const sendMessage = () => {};
  const lastMessage = null;
  const isConnected = false;

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/core/notifications/');
      const data = response.data.results || response.data || [];
      setNotifications(Array.isArray(data) ? data : []);
      
      // Actualizar contador de no leídas
      const unread = data.filter((n: Notification) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/core/notifications/${notificationId}/`, { is_read: true });
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/core/notifications/mark_all_read/');
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await api.delete(`/core/notifications/${notificationId}/`);
      setNotifications(prev => {
        const notif = prev.find(n => n.id === notificationId);
        if (notif && !notif.is_read) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n.id !== notificationId);
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Marcar como leída
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navegar según el tipo de notificación
    if (notification.action_url) {
      navigate(notification.action_url);
    } else {
      // Navegación por defecto según el tipo
      switch (notification.notification_type) {
        case 'message':
          navigate('/app/messages');
          break;
        case 'contract':
          navigate('/app/contracts');
          break;
        case 'payment':
          navigate('/app/payments');
          break;
        case 'property':
          navigate('/app/properties');
          break;
        case 'rating':
          navigate('/app/ratings');
          break;
        default:
          // Si no hay URL específica, solo marcar como leída
          break;
      }
    }
  };

  // Procesar mensajes de WebSocket
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'notification.new') {
          // Agregar nueva notificación al principio
          setNotifications(prev => [data.notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Mostrar notificación del navegador si está permitido
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(data.notification.title, {
              body: data.notification.message,
              icon: '/logo192.png'
            });
          }
        } else if (data.type === 'notification.update') {
          // Actualizar notificación existente
          setNotifications(prev =>
            prev.map(n => n.id === data.notification.id ? data.notification : n)
          );
        }
      } catch (error) {
        console.error('Error procesando mensaje WebSocket:', error);
      }
    }
  }, [lastMessage]);

  // Cargar notificaciones al montar
  useEffect(() => {
    fetchNotifications();
    
    // Solicitar permisos de notificación del navegador
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [fetchNotifications]);

  // Actualizar notificaciones cada 30 segundos si no hay WebSocket
  useEffect(() => {
    if (!isConnected) {
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, fetchNotifications]);

  return {
    notifications: Array.isArray(notifications) ? notifications : [],
    unreadCount,
    loading,
    isConnected,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    handleNotificationClick,
  };
}; 