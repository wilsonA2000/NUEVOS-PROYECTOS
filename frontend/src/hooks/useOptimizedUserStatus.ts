/**
 * Optimized User Status Hook - Smart user presence management
 * Integrates with optimized WebSocket service without spam
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { optimizedWebSocketService } from '../services/optimizedWebSocketService';
import { useAuth } from './useAuth';

export interface UserStatus {
  userId: string;
  userName: string;
  isOnline: boolean;
  lastSeen: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  customMessage?: string;
}

export interface UseOptimizedUserStatusReturn {
  // Current user status
  myStatus: UserStatus | null;
  setMyStatus: (status: Partial<Pick<UserStatus, 'status' | 'customMessage'>>) => void;
  
  // Other users status
  userStatuses: Map<string, UserStatus>;
  getUserStatus: (userId: string) => UserStatus | null;
  getOnlineUsers: () => UserStatus[];
  
  // Status counts
  onlineCount: number;
  totalUsersCount: number;
  
  // Connection state
  isConnected: boolean;
  connectionHealth: any;
  
  // Control methods
  enableRealTime: () => Promise<void>;
  disableRealTime: () => void;
}

export const useOptimizedUserStatus = (): UseOptimizedUserStatusReturn => {
  const { user } = useAuth();
  const [userStatuses, setUserStatuses] = useState<Map<string, UserStatus>>(new Map());
  const [myStatus, setMyStatusState] = useState<UserStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
  
  // Use refs to prevent stale closures
  const userRef = useRef(user);
  const statusRef = useRef(myStatus);
  
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  
  useEffect(() => {
    statusRef.current = myStatus;
  }, [myStatus]);

  // Initialize user status from localStorage and user data
  useEffect(() => {
    if (user && !myStatus) {
      const savedStatus = localStorage.getItem('userStatus') as UserStatus['status'] || 'online';
      
      const initialStatus: UserStatus = {
        userId: user.id,
        userName: `${user.first_name} ${user.last_name}`.trim() || user.email,
        isOnline: savedStatus !== 'offline',
        lastSeen: new Date().toISOString(),
        status: savedStatus,
      };
      
      setMyStatusState(initialStatus);
    }
  }, [user, myStatus]);

  // Enable real-time WebSocket connection
  const enableRealTime = useCallback(async () => {
    if (!user || realTimeEnabled) return;
    
    try {
      console.log('🔌 Enabling real-time user status...');
      await optimizedWebSocketService.connectAuthenticated('user-status');
      setRealTimeEnabled(true);
      
      // Send initial presence
      if (statusRef.current) {
        optimizedWebSocketService.send('user-status', {
          type: 'user_online',
          data: {
            user_id: user.id,
            status: statusRef.current.status,
            timestamp: new Date().toISOString(),
          },
        });
      }
      
    } catch (error) {
      console.error('Failed to enable real-time status:', error);
      throw error;
    }
  }, [user, realTimeEnabled]);

  // Disable real-time connection
  const disableRealTime = useCallback(() => {
    if (realTimeEnabled) {
      console.log('📴 Disabling real-time user status...');
      optimizedWebSocketService.disconnect('user-status');
      setRealTimeEnabled(false);
      setIsConnected(false);
    }
  }, [realTimeEnabled]);

  // Monitor connection status
  useEffect(() => {
    const unsubscribe = optimizedWebSocketService.onConnectionStatusChange((status) => {
      if (status.connected !== isConnected) {
        setIsConnected(status.connected);
        console.log(`User status WebSocket: ${status.connected ? 'Connected' : 'Disconnected'}`);
      }
    });

    return unsubscribe;
  }, [isConnected]);

  // Handle incoming user status updates (only when real-time enabled)
  useEffect(() => {
    if (!realTimeEnabled || !isConnected) return;

    const unsubscribers = [
      optimizedWebSocketService.subscribe('user_online', (message) => {
        const { user_id, user_name, status, timestamp, custom_message } = message.data;
        
        const userStatus: UserStatus = {
          userId: user_id,
          userName: user_name,
          isOnline: true,
          lastSeen: timestamp,
          status: status || 'online',
          customMessage: custom_message,
        };

        setUserStatuses(prev => new Map(prev.set(user_id, userStatus)));
      }),

      optimizedWebSocketService.subscribe('user_offline', (message) => {
        const { user_id, user_name, timestamp } = message.data;
        
        setUserStatuses(prev => {
          const existing = prev.get(user_id);
          if (existing) {
            const updated = { ...existing, isOnline: false, status: 'offline' as const, lastSeen: timestamp };
            return new Map(prev.set(user_id, updated));
          }
          return prev;
        });
      }),

      optimizedWebSocketService.subscribe('user_status_update', (message) => {
        const { user_id, user_name, status, custom_message, timestamp } = message.data;
        
        setUserStatuses(prev => {
          const existing = prev.get(user_id);
          const updated: UserStatus = {
            userId: user_id,
            userName: user_name,
            isOnline: existing?.isOnline ?? true,
            lastSeen: timestamp,
            status: status || 'online',
            customMessage: custom_message,
          };
          
          return new Map(prev.set(user_id, updated));
        });
      }),

      optimizedWebSocketService.subscribe('bulk_user_status', (message) => {
        // Handle bulk status updates efficiently
        const { users } = message.data;
        if (Array.isArray(users)) {
          setUserStatuses(prev => {
            const newMap = new Map(prev);
            users.forEach((userStatus: any) => {
              newMap.set(userStatus.user_id, {
                userId: userStatus.user_id,
                userName: userStatus.user_name,
                isOnline: userStatus.is_online,
                lastSeen: userStatus.last_seen,
                status: userStatus.status || 'online',
                customMessage: userStatus.custom_message,
              });
            });
            return newMap;
          });
        }
      }),
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [realTimeEnabled, isConnected]);

  // Smart status update with local + remote sync
  const setMyStatus = useCallback((statusUpdate: Partial<Pick<UserStatus, 'status' | 'customMessage'>>) => {
    if (!user) return;

    // Always update local state immediately for responsiveness
    setMyStatusState(prev => {
      const updated = prev ? {
        ...prev,
        ...statusUpdate,
        lastSeen: new Date().toISOString(),
        isOnline: statusUpdate.status !== 'offline',
      } : null;
      
      return updated;
    });
    
    // Save to localStorage for persistence
    if (statusUpdate.status) {
      localStorage.setItem('userStatus', statusUpdate.status);
    }

    // Send to WebSocket if connected
    if (realTimeEnabled && isConnected) {
      optimizedWebSocketService.send('user-status', {
        type: 'status_update',
        data: {
          user_id: user.id,
          ...statusUpdate,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }, [user, realTimeEnabled, isConnected]);

  // Utility functions
  const getUserStatus = useCallback((userId: string): UserStatus | null => {
    return userStatuses.get(userId) || null;
  }, [userStatuses]);

  const getOnlineUsers = useCallback((): UserStatus[] => {
    return Array.from(userStatuses.values()).filter(status => status.isOnline);
  }, [userStatuses]);

  // Send offline status on cleanup
  useEffect(() => {
    return () => {
      if (realTimeEnabled && isConnected && userRef.current) {
        optimizedWebSocketService.send('user-status', {
          type: 'user_offline',
          data: {
            user_id: userRef.current.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    };
  }, [realTimeEnabled, isConnected]);

  // Handle page visibility for away status (optional, less aggressive)
  useEffect(() => {
    if (!realTimeEnabled) return;
    
    const handleVisibilityChange = () => {
      if (!userRef.current || !isConnected) return;
      
      // Only change to away if currently online, don't override busy/offline
      const currentStatus = statusRef.current?.status;
      if (currentStatus === 'online') {
        const newStatus = document.hidden ? 'away' : 'online';
        if (newStatus !== currentStatus) {
          setMyStatus({ status: newStatus });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [realTimeEnabled, isConnected, setMyStatus]);

  const onlineCount = getOnlineUsers().length;
  const totalUsersCount = userStatuses.size;
  const connectionHealth = optimizedWebSocketService.getHealthStatus();

  return {
    myStatus,
    setMyStatus,
    userStatuses,
    getUserStatus,
    getOnlineUsers,
    onlineCount,
    totalUsersCount,
    isConnected,
    connectionHealth,
    enableRealTime,
    disableRealTime,
  };
};

export default useOptimizedUserStatus;