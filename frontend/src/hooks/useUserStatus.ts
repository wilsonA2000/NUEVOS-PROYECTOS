/**
 * useUserStatus - Hook for managing real-time user online/offline status
 * Integrates with WebSocket for live presence tracking
 */

import { useEffect, useState, useCallback } from 'react';
// WebSocket disabled
import { useAuth } from './useAuth';

export interface UserStatus {
  userId: string;
  userName: string;
  isOnline: boolean;
  lastSeen: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  customMessage?: string;
}

export interface UseUserStatusReturn {
  // Current user status
  myStatus: UserStatus | null;
  setMyStatus: (status: Partial<Pick<UserStatus, 'status' | 'customMessage'>>) => void;
  
  // Other users status
  userStatuses: Map<string, UserStatus>;
  getUserStatus: (userId: string) => UserStatus | null;
  getOnlineUsers: () => UserStatus[];
  getOfflineUsers: () => UserStatus[];
  
  // Status counts
  onlineCount: number;
  totalUsersCount: number;
  
  // Connection state
  isConnected: boolean;
  
  // Event handlers
  onUserStatusChange: (callback: (status: UserStatus) => void) => () => void;
}

export const useUserStatus = (): UseUserStatusReturn => {
  const { user } = useAuth();
  const [userStatuses, setUserStatuses] = useState<Map<string, UserStatus>>(new Map());
  const [myStatus, setMyStatusState] = useState<UserStatus | null>(null);
  const [statusChangeCallbacks, setStatusChangeCallbacks] = useState<Set<(status: UserStatus) => void>>(new Set());

  // No WebSocket connection - static status
  const isConnected = false;
  const send = () => false;
  const subscribe = () => () => {};

  // Initialize my status when user is available
  useEffect(() => {
    if (user && !myStatus) {
      const initialStatus: UserStatus = {
        userId: user.id,
        userName: `${user.first_name} ${user.last_name}`.trim() || user.email,
        isOnline: true,
        lastSeen: new Date().toISOString(),
        status: 'online',
      };
      setMyStatusState(initialStatus);
    }
  }, [user, myStatus]);

  // Heartbeat disabled

  // WebSocket event handlers disabled

  // Simple status setter without WebSocket
  const setMyStatus = useCallback((statusUpdate: Partial<Pick<UserStatus, 'status' | 'customMessage'>>) => {
    if (!user) return;

    // Update local state only
    setMyStatusState(prev => prev ? {
      ...prev,
      ...statusUpdate,
      lastSeen: new Date().toISOString(),
    } : null);
    
    // Save to localStorage for persistence
    if (statusUpdate.status) {
      localStorage.setItem('userStatus', statusUpdate.status);
    }
  }, [user]);

  // Get specific user status
  const getUserStatus = useCallback((userId: string): UserStatus | null => {
    return userStatuses.get(userId) || null;
  }, [userStatuses]);

  // Get online users
  const getOnlineUsers = useCallback((): UserStatus[] => {
    return Array.from(userStatuses.values()).filter(status => status.isOnline);
  }, [userStatuses]);

  // Get offline users
  const getOfflineUsers = useCallback((): UserStatus[] => {
    return Array.from(userStatuses.values()).filter(status => !status.isOnline);
  }, [userStatuses]);

  // Register status change callback
  const onUserStatusChange = useCallback((callback: (status: UserStatus) => void) => {
    setStatusChangeCallbacks(prev => new Set(prev.add(callback)));
    
    return () => {
      setStatusChangeCallbacks(prev => {
        const newSet = new Set(prev);
        newSet.delete(callback);
        return newSet;
      });
    };
  }, []);

  // Offline status handler disabled

  // Visibility change handler disabled

  // Focus/blur handlers disabled

  const onlineCount = getOnlineUsers().length;
  const totalUsersCount = userStatuses.size;

  return {
    myStatus,
    setMyStatus,
    userStatuses,
    getUserStatus,
    getOnlineUsers,
    getOfflineUsers,
    onlineCount,
    totalUsersCount,
    isConnected,
    onUserStatusChange,
  };
};

export default useUserStatus;