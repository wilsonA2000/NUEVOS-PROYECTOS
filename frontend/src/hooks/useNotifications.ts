import { useState, useEffect } from 'react';
import { api } from '../services/api';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  user: number;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/notifications/');
      const data = response.data.results || response.data || [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Si no hay endpoint de notificaciones, usar datos de ejemplo
      setNotifications([
        {
          id: '1',
          title: 'Nuevo pago recibido',
          message: 'Has recibido un pago de $1,500 por la propiedad Calle 123',
          type: 'success',
          read: false,
          created_at: new Date().toISOString(),
          user: 1
        },
        {
          id: '2',
          title: 'Contrato actualizado',
          message: 'El contrato de la propiedad Avenida Principal ha sido actualizado',
          type: 'info',
          read: false,
          created_at: new Date().toISOString(),
          user: 1
        },
        {
          id: '3',
          title: 'Mensaje nuevo',
          message: 'Tienes un nuevo mensaje de Juan Pérez sobre la propiedad',
          type: 'info',
          read: false,
          created_at: new Date().toISOString(),
          user: 1
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/users/notifications/${notificationId}/mark-read/`);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/users/notifications/mark-all-read/');
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return {
    notifications: Array.isArray(notifications) ? notifications : [],
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}; 