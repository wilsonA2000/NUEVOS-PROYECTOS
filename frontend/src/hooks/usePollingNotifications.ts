/**
 * Polling-based notifications hook - Alternative to WebSocket
 * Polls for notifications every 30 seconds when user is active
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const usePollingNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisible = useRef(true);

  // Track page visibility to pause polling when tab is not active
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisible.current = !document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchNotifications = async () => {
    if (!isAuthenticated || !isVisible.current) return;

    try {
      setIsLoading(true);
      // Since we don't have a notifications API yet, we'll mock it
      // In real implementation, this would call: api.get('/notifications/')
      
      // Mock notifications for demonstration
      const mockNotifications: Notification[] = [];
      
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.is_read).length);
    } catch (error) {
      console.warn('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up polling
  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchNotifications();

    // Set up interval for polling every 30 seconds
    intervalRef.current = setInterval(() => {
      if (isVisible.current) {
        fetchNotifications();
      }
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId 
          ? { ...n, is_read: true }
          : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
};