/**
 * Enhanced WebSocket hooks - Modern WebSocket integration
 * Built on top of the WebSocket service for better state management
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import websocketService, { WebSocketMessage, ConnectionStatus } from '../services/websocketService';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
  dependencies?: any[];
}

interface UseWebSocketReturn {
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (message: WebSocketMessage) => boolean;
  subscribe: (eventType: string, callback: (message: WebSocketMessage) => void) => () => void;
}

export const useWebSocketEnhanced = (
  endpoint: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const { autoConnect = true, onMessage, onConnectionChange, dependencies = [] } = options;
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() => 
    websocketService.getConnectionStatus(endpoint)
  );
  
  const onMessageRef = useRef(onMessage);
  const onConnectionChangeRef = useRef(onConnectionChange);
  
  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
  
  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
  }, [onConnectionChange]);

  // Connect function
  const connect = useCallback(async () => {
    try {
      await websocketService.connect(endpoint);
    } catch (error) {
      console.error(`Failed to connect to WebSocket ${endpoint}:`, error);
      throw error;
    }
  }, [endpoint]);

  // Disconnect function  
  const disconnect = useCallback(() => {
    websocketService.disconnect(endpoint);
  }, [endpoint]);

  // Send function
  const send = useCallback((message: WebSocketMessage) => {
    return websocketService.send(endpoint, message);
  }, [endpoint]);

  // Subscribe function
  const subscribe = useCallback((eventType: string, callback: (message: WebSocketMessage) => void) => {
    return websocketService.subscribe(eventType, callback);
  }, []);

  // Auto-connect effect
  useEffect(() => {
    if (autoConnect) {
      connect().catch(error => {
        console.error('Auto-connect failed:', error);
      });
    }

    return () => {
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect, ...dependencies]);

  // Connection status effect
  useEffect(() => {
    const unsubscribe = websocketService.onConnectionStatusChange((status) => {
      setConnectionStatus(status);
      onConnectionChangeRef.current?.(status);
    });

    // Set initial status
    setConnectionStatus(websocketService.getConnectionStatus(endpoint));

    return unsubscribe;
  }, [endpoint]);

  // Global message handler effect
  useEffect(() => {
    if (!onMessageRef.current) return;

    const unsubscribe = websocketService.subscribe('*', (message) => {
      onMessageRef.current?.(message);
    });

    return unsubscribe;
  }, []);

  return {
    connectionStatus,
    isConnected: connectionStatus.connected,
    connect,
    disconnect,
    send,
    subscribe,
  };
};

// Specialized hooks for different WebSocket endpoints

export const useMessaging = (options?: Omit<UseWebSocketOptions, 'autoConnect'>) => {
  return useWebSocketEnhanced('messaging', { ...options, autoConnect: true });
};

export const useNotifications = (options?: Omit<UseWebSocketOptions, 'autoConnect'>) => {
  return useWebSocketEnhanced('notifications', { ...options, autoConnect: true });
};

export const useUserStatus = (options?: Omit<UseWebSocketOptions, 'autoConnect'>) => {
  return useWebSocketEnhanced('user-status', { ...options, autoConnect: true });
};

export const useThreadMessaging = (
  threadId: string | number,
  options?: Omit<UseWebSocketOptions, 'autoConnect'>
) => {
  const endpoint = `messaging/thread/${threadId}`;
  return useWebSocketEnhanced(endpoint, { 
    ...options, 
    autoConnect: true,
    dependencies: [threadId],
  });
};

export default useWebSocketEnhanced;