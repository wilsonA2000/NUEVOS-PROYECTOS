/**
 * NotificationContext - Centralized notification state management
 * Provides global notification state and actions throughout the app
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useWebSocketEnhanced';
import api from '../services/api';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'message' | 'property' | 'payment' | 'contract' | 'rating' | 'user' | 'system';
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  read: boolean;
  data?: Record<string, any>;
  actions?: Array<{
    label: string;
    action: string;
    url?: string;
  }>;
  channel?: 'in_app' | 'email' | 'sms' | 'push' | 'webhook';
  scheduled_for?: string;
  expires_at?: string;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
  frequency_limit?: number;
  categories: {
    system: boolean;
    security: boolean;
    marketing: boolean;
    reminders: boolean;
    messages: boolean;
    payments: boolean;
    properties: boolean;
    contracts: boolean;
  };
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
}

type NotificationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'UPDATE_NOTIFICATION'; payload: { id: string; updates: Partial<Notification> } }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'SET_PREFERENCES'; payload: NotificationPreferences }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'CLEAR_ALL' };

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  preferences: null,
  loading: false,
  error: null,
  connected: false,
};

const notificationReducer = (state: NotificationState, action: NotificationAction): NotificationState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter(n => !n.read).length,
        loading: false,
        error: null,
      };
    
    case 'ADD_NOTIFICATION':
      const newNotifications = [action.payload, ...state.notifications];
      return {
        ...state,
        notifications: newNotifications,
        unreadCount: newNotifications.filter(n => !n.read).length,
      };
    
    case 'UPDATE_NOTIFICATION':
      const updatedNotifications = state.notifications.map(n =>
        n.id === action.payload.id ? { ...n, ...action.payload.updates } : n
      );
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.read).length,
      };
    
    case 'REMOVE_NOTIFICATION':
      const filteredNotifications = state.notifications.filter(n => n.id !== action.payload);
      return {
        ...state,
        notifications: filteredNotifications,
        unreadCount: filteredNotifications.filter(n => !n.read).length,
      };
    
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      };
    
    case 'SET_PREFERENCES':
      return { ...state, preferences: action.payload };
    
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };
    
    case 'CLEAR_ALL':
      return { ...state, notifications: [], unreadCount: 0 };
    
    default:
      return state;
  }
};

interface NotificationContextType {
  state: NotificationState;
  actions: {
    loadNotifications: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    removeNotification: (id: string) => Promise<void>;
    clearAll: () => Promise<void>;
    loadPreferences: () => Promise<void>;
    updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
    createNotification: (notification: Partial<Notification>) => Promise<void>;
    testNotification: (channel: string) => Promise<void>;
  };
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // WebSocket integration
  const { isConnected, subscribe } = useNotifications({
    onConnectionChange: (status) => {
      dispatch({ type: 'SET_CONNECTED', payload: status.connected });
    },
  });

  // Handle real-time notifications
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeNewNotification = subscribe('new_notification', (message) => {
      const notification: Notification = {
        id: message.data.id,
        title: message.data.title,
        message: message.data.message,
        type: message.data.type,
        priority: message.data.priority || 'normal',
        status: message.data.status || 'delivered',
        timestamp: message.data.timestamp,
        read: false,
        data: message.data.data,
        actions: message.data.actions,
        channel: message.data.channel,
      };

      dispatch({ type: 'ADD_NOTIFICATION', payload: notification });

      // Show toast for high priority notifications
      if (notification.priority === 'urgent' || notification.priority === 'critical') {
        toast.info(notification.title, {
          position: 'top-right',
          autoClose: 5000,
        });
      }
    });

    const unsubscribeNotificationRead = subscribe('notification_read', (message) => {
      dispatch({ 
        type: 'UPDATE_NOTIFICATION', 
        payload: { 
          id: message.data.notification_id, 
          updates: { read: true } 
        } 
      });
    });

    return () => {
      unsubscribeNewNotification();
      unsubscribeNotificationRead();
    };
  }, [isConnected, subscribe]);

  // Actions
  const actions = {
    loadNotifications: useCallback(async () => {
      if (!isAuthenticated) return;

      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const response = await api.get('/core/notifications/');
        const notifications = response.data.results || response.data;
        dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
      } catch (error: any) {
        dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to load notifications' });
        console.error('Error loading notifications:', error);
      }
    }, [isAuthenticated]),

    markAsRead: useCallback(async (id: string) => {
      try {
        await api.post(`/core/notifications/${id}/mark_read/`);
        dispatch({ type: 'MARK_AS_READ', payload: id });
      } catch (error: any) {
        console.error('Error marking notification as read:', error);
        toast.error('Failed to mark notification as read');
      }
    }, []),

    markAllAsRead: useCallback(async () => {
      try {
        await api.post('/core/notifications/mark_all_read/');
        dispatch({ type: 'MARK_ALL_AS_READ' });
        toast.success('All notifications marked as read');
      } catch (error: any) {
        console.error('Error marking all notifications as read:', error);
        toast.error('Failed to mark all notifications as read');
      }
    }, []),

    removeNotification: useCallback(async (id: string) => {
      try {
        await api.delete(`/core/notifications/${id}/`);
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
      } catch (error: any) {
        console.error('Error removing notification:', error);
        toast.error('Failed to remove notification');
      }
    }, []),

    clearAll: useCallback(async () => {
      try {
        await api.post('/core/notifications/clear_all/');
        dispatch({ type: 'CLEAR_ALL' });
        toast.success('All notifications cleared');
      } catch (error: any) {
        console.error('Error clearing notifications:', error);
        toast.error('Failed to clear notifications');
      }
    }, []),

    loadPreferences: useCallback(async () => {
      if (!isAuthenticated) return;

      try {
        const response = await api.get('/core/notifications/preferences/');
        dispatch({ type: 'SET_PREFERENCES', payload: response.data });
      } catch (error: any) {
        console.error('Error loading notification preferences:', error);
      }
    }, [isAuthenticated]),

    updatePreferences: useCallback(async (preferences: Partial<NotificationPreferences>) => {
      try {
        const response = await api.patch('/core/notifications/preferences/', preferences);
        dispatch({ type: 'SET_PREFERENCES', payload: response.data });
        toast.success('Notification preferences updated');
      } catch (error: any) {
        console.error('Error updating notification preferences:', error);
        toast.error('Failed to update preferences');
      }
    }, []),

    createNotification: useCallback(async (notification: Partial<Notification>) => {
      try {
        const response = await api.post('/core/notifications/', notification);
        dispatch({ type: 'ADD_NOTIFICATION', payload: response.data });
        toast.success('Notification created');
      } catch (error: any) {
        console.error('Error creating notification:', error);
        toast.error('Failed to create notification');
      }
    }, []),

    testNotification: useCallback(async (channel: string) => {
      try {
        await api.post('/core/notifications/test/', { channel });
        toast.success(`Test notification sent via ${channel}`);
      } catch (error: any) {
        console.error('Error sending test notification:', error);
        toast.error('Failed to send test notification');
      }
    }, []),
  };

  // Load initial data
  useEffect(() => {
    if (isAuthenticated) {
      actions.loadNotifications();
      actions.loadPreferences();
    }
  }, [isAuthenticated, actions.loadNotifications, actions.loadPreferences]);

  const contextValue: NotificationContextType = {
    state,
    actions,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;