import { api } from './api';
import { Notification } from '../types/notification';

export const notificationService = {
  // CRUD básico de notificaciones
  getNotifications: async (page: number = 1): Promise<any> => {
    // Asegurar que page sea un número válido
    const pageNumber = typeof page === 'number' ? page : 1;
    const response = await api.get(`/core/notifications/?page=${pageNumber}`);
    return response.data;
  },

  getNotification: async (id: string): Promise<any> => {
    const response = await api.get(`/core/notifications/${id}/`);
    return response.data;
  },

  createNotification: async (data: any): Promise<any> => {
    const response = await api.post('/core/notifications/', data);
    return response.data;
  },

  updateNotification: async (id: string, data: any): Promise<any> => {
    const response = await api.put(`/core/notifications/${id}/`, data);
    return response.data;
  },

  deleteNotification: async (id: string): Promise<void> => {
    await api.delete(`/core/notifications/${id}/`);
  },

  // Marcar notificación como leída
  markAsRead: async (id: string): Promise<Notification> => {
    const response = await api.patch(`/core/notifications/${id}/`, { is_read: true });
    return response.data;
  },

  // Conteo de notificaciones no leídas
  getUnreadCount: async (): Promise<{ count: number }> => {
    try {
      const response = await api.get('/core/notifications/unread_count/');
      return response.data;
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
      // Devolver un valor por defecto en caso de error para no romper la UI
      return { count: 0 };
    }
  },

  // Marcar todas como leídas
  markAllAsRead: async (): Promise<void> => {
    await api.post('/core/notifications/mark-all-read/');
  },

  // Logs de actividad
  getActivityLogs: async (): Promise<any[]> => {
    const response = await api.get('/core/activity-logs/');
    return response.data;
  },

  getActivityLog: async (id: string): Promise<any> => {
    const response = await api.get(`/core/activity-logs/${id}/`);
    return response.data;
  },

  createActivityLog: async (data: any): Promise<any> => {
    const response = await api.post('/core/activity-logs/', data);
    return response.data;
  },

  updateActivityLog: async (id: string, data: any): Promise<any> => {
    const response = await api.put(`/core/activity-logs/${id}/`, data);
    return response.data;
  },

  deleteActivityLog: async (id: string): Promise<void> => {
    await api.delete(`/core/activity-logs/${id}/`);
  },

  // Alertas del sistema
  getSystemAlerts: async (): Promise<any[]> => {
    const response = await api.get('/core/system-alerts/');
    return response.data;
  },

  getSystemAlert: async (id: string): Promise<any> => {
    const response = await api.get(`/core/system-alerts/${id}/`);
    return response.data;
  },

  createSystemAlert: async (data: any): Promise<any> => {
    const response = await api.post('/core/system-alerts/', data);
    return response.data;
  },

  updateSystemAlert: async (id: string, data: any): Promise<any> => {
    const response = await api.put(`/core/system-alerts/${id}/`, data);
    return response.data;
  },

  deleteSystemAlert: async (id: string): Promise<void> => {
    await api.delete(`/core/system-alerts/${id}/`);
  },

  // Estadísticas del dashboard
  getDashboardStats: async (): Promise<any> => {
    const response = await api.get('/core/stats/dashboard/');
    return response.data;
  },

  // Vista general del sistema
  getSystemOverview: async (): Promise<any> => {
    const response = await api.get('/core/stats/overview/');
    return response.data;
  },
}; 