/**
 * Optimized WebSocket Context - Smart, spam-free real-time communication
 * Provides controlled WebSocket connections with user-managed activation
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { optimizedWebSocketService, WebSocketMessage } from '../services/optimizedWebSocketService';
import { useNotification } from '../hooks/useNotification';

export interface OptimizedWebSocketContextType {
  // Connection states
  isConnected: boolean;
  connectionStatus: string;
  connectedEndpoints: string[];
  
  // Control functions
  enableRealTime: () => Promise<void>;
  disableRealTime: () => void;
  send: (endpoint: string, message: WebSocketMessage) => boolean;
  
  // Event subscriptions
  subscribe: (eventType: string, callback: (message: WebSocketMessage) => void) => () => void;
  
  // Status states
  unreadMessagesCount: number;
  onlineUsers: Map<string, any>;
  
  // Health monitoring
  connectionHealth: any;
}

const OptimizedWebSocketContext = createContext<OptimizedWebSocketContextType | null>(null);

export const useOptimizedWebSocketContext = () => {
  const context = useContext(OptimizedWebSocketContext);
  if (!context) {
    throw new Error('useOptimizedWebSocketContext must be used within an OptimizedWebSocketProvider');
  }
  return context;
};

interface OptimizedWebSocketProviderProps {
  children: React.ReactNode;
}

export const OptimizedWebSocketProvider: React.FC<OptimizedWebSocketProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { showNotification } = useNotification();
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Desconectado');
  const [connectedEndpoints, setConnectedEndpoints] = useState<string[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, any>>(new Map());
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);

  // Essential endpoints for VeriHome functionality
  const coreEndpoints = [
    'messaging',        // Real-time chat
    'notifications',    // Push notifications
    'user-status'       // User presence
  ];

  // Enable real-time features
  const enableRealTime = useCallback(async () => {
    if (!isAuthenticated || !user || realTimeEnabled) return;
    
    console.log('🚀 Enabling optimized real-time features...');
    setConnectionStatus('Conectando...');
    
    try {
      // Connect to core endpoints with optimized service
      await optimizedWebSocketService.connectToEndpoints(coreEndpoints);
      
      setRealTimeEnabled(true);
      setIsConnected(true);
      setConnectionStatus('Conectado - Tiempo real activo');
      setConnectedEndpoints(optimizedWebSocketService.getConnectedEndpoints());
      
      showNotification('Tiempo real activado', 'success');
      
    } catch (error) {
      console.error('Error enabling real-time features:', error);
      setIsConnected(false);
      setConnectionStatus('Error de conexión');
      showNotification('Error al activar tiempo real', 'error');
      throw error;
    }
  }, [isAuthenticated, user, realTimeEnabled, showNotification]);

  // Disable real-time features
  const disableRealTime = useCallback(() => {
    if (!realTimeEnabled) return;
    
    console.log('📴 Disabling real-time features...');
    
    optimizedWebSocketService.disconnectAll();
    
    setRealTimeEnabled(false);
    setIsConnected(false);
    setConnectionStatus('Desconectado');
    setConnectedEndpoints([]);
    setOnlineUsers(new Map());
    setUnreadMessagesCount(0);
    
    showNotification('Tiempo real desactivado', 'info');
  }, [realTimeEnabled, showNotification]);

  // Monitor overall connection health
  useEffect(() => {
    if (!realTimeEnabled) return;
    
    const interval = setInterval(() => {
      const health = optimizedWebSocketService.getHealthStatus();
      const activeConnections = health.activeConnections;
      const hasConnections = activeConnections > 0;
      
      if (hasConnections !== isConnected) {
        setIsConnected(hasConnections);
        setConnectionStatus(
          hasConnections 
            ? `Conectado (${activeConnections}/${coreEndpoints.length})` 
            : 'Desconectado'
        );
        setConnectedEndpoints(optimizedWebSocketService.getConnectedEndpoints());
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [realTimeEnabled, isConnected]);

  // Handle incoming messages when connected
  useEffect(() => {
    if (!realTimeEnabled || !isConnected) return;

    const unsubscribers = [
      // New messages
      optimizedWebSocketService.subscribe('new_message', (message) => {
        if (message.data?.sender_id !== user?.id) {
          setUnreadMessagesCount(prev => prev + 1);
          showNotification(
            `Nuevo mensaje de ${message.data?.sender_name || 'Usuario'}`,
            'info',
            {
              autoClose: 5000,
              onClick: () => {
                window.location.href = `/app/messages/thread/${message.data?.thread_id}`;
              }
            }
          );
        }
      }),

      // User status updates
      optimizedWebSocketService.subscribe('user_status_update', (message) => {
        const { user_id, user_name, is_online, last_seen } = message.data;
        
        setOnlineUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(user_id, {
            id: user_id,
            name: user_name,
            isOnline: is_online,
            lastSeen: last_seen
          });
          return newMap;
        });
      }),

      // System notifications
      optimizedWebSocketService.subscribe('system_notification', (message) => {
        showNotification(
          message.data?.message || 'Notificación del sistema',
          message.data?.type || 'info'
        );
      }),

      // Connection errors
      optimizedWebSocketService.subscribe('error', (message) => {
        console.error('WebSocket error:', message);
        // Don't spam user with error notifications
      })
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [realTimeEnabled, isConnected, user, showNotification]);

  // Auto-cleanup on auth changes
  useEffect(() => {
    if (!isAuthenticated && realTimeEnabled) {
      disableRealTime();
    }
  }, [isAuthenticated, realTimeEnabled, disableRealTime]);

  // Send function wrapper
  const send = useCallback((endpoint: string, message: WebSocketMessage) => {
    if (!realTimeEnabled) {
      console.log('Real-time disabled, message not sent:', message);
      return false;
    }
    return optimizedWebSocketService.send(endpoint, message);
  }, [realTimeEnabled]);

  // Subscribe function wrapper
  const subscribe = useCallback((eventType: string, callback: (message: WebSocketMessage) => void) => {
    if (!realTimeEnabled) {
      console.log('Real-time disabled, subscription not created:', eventType);
      return () => {};
    }
    return optimizedWebSocketService.subscribe(eventType, callback);
  }, [realTimeEnabled]);

  const contextValue: OptimizedWebSocketContextType = {
    isConnected,
    connectionStatus,
    connectedEndpoints,
    enableRealTime,
    disableRealTime,
    send,
    subscribe,
    unreadMessagesCount,
    onlineUsers,
    connectionHealth: optimizedWebSocketService.getHealthStatus(),
  };

  return (
    <OptimizedWebSocketContext.Provider value={contextValue}>
      {children}
    </OptimizedWebSocketContext.Provider>
  );
};

export default OptimizedWebSocketProvider;