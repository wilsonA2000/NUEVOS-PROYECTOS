/**
 * Hook for admin real-time notifications via WebSocket
 * Filters notification events relevant to admin operations:
 * - New contracts pending review
 * - Biometric authentication completions
 * - Security alerts
 * - System health warnings
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminAuth } from './useAdminAuth';

export interface AdminNotification {
  id: string;
  type:
    | 'contract_pending'
    | 'biometric_complete'
    | 'security_alert'
    | 'system_health'
    | 'user_report';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
  data?: Record<string, any>;
}

interface UseAdminNotificationsReturn {
  notifications: AdminNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  isConnected: boolean;
}

export const useAdminNotifications = (): UseAdminNotificationsReturn => {
  const { isAdmin } = useAdminAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (!isAdmin) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8000/ws/notifications/?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);

          if (
            data.type === 'admin_notification' ||
            data.notification_type?.startsWith('admin_')
          ) {
            const notification: AdminNotification = {
              id:
                data.id ||
                `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: data.notification_type || data.type || 'contract_pending',
              title: data.title || 'Notificacion Admin',
              message: data.message || data.body || '',
              severity: data.severity || 'info',
              timestamp: data.timestamp || new Date().toISOString(),
              read: false,
              data: data.extra_data || data.data,
            };
            setNotifications(prev => [notification, ...prev].slice(0, 50));
          }
        } catch {
          // Ignore non-JSON messages
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setIsConnected(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    isConnected,
  };
};

export default useAdminNotifications;
