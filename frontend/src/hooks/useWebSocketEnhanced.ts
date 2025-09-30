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

  // Connect function disabled
  const connect = useCallback(async () => {
    console.log(`WebSocket connect disabled for ${endpoint}`);
    return Promise.resolve();
  }, [endpoint]);

  // Disconnect function disabled
  const disconnect = useCallback(() => {
    console.log(`WebSocket disconnect disabled for ${endpoint}`);
  }, [endpoint]);

  // Send function disabled
  const send = useCallback((message: WebSocketMessage) => {
    console.log(`WebSocket send disabled for ${endpoint}:`, message);
    return false;
  }, [endpoint]);

  // Subscribe function disabled
  const subscribe = useCallback((eventType: string, callback: (message: WebSocketMessage) => void) => {
    console.log(`WebSocket subscribe disabled for ${eventType}`);
    return () => {};
  }, []);

  // Auto-connect completely disabled

  // Connection status monitoring disabled
  useEffect(() => {
    setConnectionStatus({ connected: false, connecting: false, error: null });
  }, [endpoint]);

  // Message handler disabled

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
  return useWebSocketEnhanced('messaging', { ...options, autoConnect: false });
};

export const useNotifications = (options?: Omit<UseWebSocketOptions, 'autoConnect'>) => {
  return useWebSocketEnhanced('notifications', { ...options, autoConnect: false });
};

export const useUserStatusWS = (options?: Omit<UseWebSocketOptions, 'autoConnect'>) => {
  return useWebSocketEnhanced('user-status', { ...options, autoConnect: false });
};

export const useThreadMessaging = (
  threadId: string | number,
  options?: Omit<UseWebSocketOptions, 'autoConnect'>
) => {
  const endpoint = `messaging/thread/${threadId}`;
  return useWebSocketEnhanced(endpoint, { 
    ...options, 
    autoConnect: false,
    dependencies: [threadId],
  });
};

export default useWebSocketEnhanced;