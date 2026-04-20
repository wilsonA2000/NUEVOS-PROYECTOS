/**
 * WebSocket Context - Proveedor global para conexiones WebSocket
 * Maneja conexiones automáticas para mensajería, notificaciones y estado de usuario
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  websocketService,
  WebSocketMessage,
} from '../services/websocketService';
import { useNotification } from '../hooks/useNotification';

export interface WebSocketContextType {
  // Estados de conexión
  isConnected: boolean;
  connectionStatus: string;
  connectedEndpoints: string[];

  // Funciones de control
  connect: (endpoint: string) => Promise<void>;
  disconnect: (endpoint: string) => void;
  send: (endpoint: string, message: WebSocketMessage) => boolean;

  // Suscripciones a eventos
  subscribe: (
    eventType: string,
    callback: (message: WebSocketMessage) => void
  ) => () => void;

  // Estados específicos
  unreadMessagesCount: number;
  onlineUsers: Map<string, any>;
  typingUsers: Array<{ userId: string; userName: string; threadId: string }>;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      'useWebSocketContext must be used within a WebSocketProvider',
    );
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  const { isAuthenticated, user } = useAuth();
  const notification = useNotification();

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Desconectado');
  const [connectedEndpoints, setConnectedEndpoints] = useState<string[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, any>>(new Map());
  const [typingUsers, setTypingUsers] = useState<
    Array<{ userId: string; userName: string; threadId: string }>
  >([]);

  // Endpoints principales para conectar automáticamente
  const autoConnectEndpoints = ['messaging', 'notifications', 'user-status'];

  // WebSocket completely disabled
  useEffect(() => {
    // WebSocket functionality completely disabled
    setIsConnected(false);
    setConnectionStatus('Desconectado');
  }, [isAuthenticated, user]);

  const connectToWebSockets = async () => {
    setConnectionStatus('Conectando...');

    try {
      for (const endpoint of autoConnectEndpoints) {
        await websocketService.connectAuthenticated(endpoint);
      }

      setIsConnected(true);
      setConnectionStatus('Conectado - Tiempo real activo');
      setConnectedEndpoints(websocketService.getConnectedEndpoints());

      if (notification?.success)
        notification.success('Conexión en tiempo real establecida');
    } catch (error) {
      // WebSocket connection error handled
      setIsConnected(false);
      setConnectionStatus('Error de conexión');
      if (notification?.error)
        notification.error('Error al conectar tiempo real');
    }
  };

  const disconnectFromWebSockets = () => {
    autoConnectEndpoints.forEach(endpoint => {
      websocketService.disconnect(endpoint);
    });

    setIsConnected(false);
    setConnectionStatus('Desconectado');
    setConnectedEndpoints([]);
    setOnlineUsers(new Map());
    setTypingUsers([]);
    setUnreadMessagesCount(0);
  };

  // Disabled connect function
  const connect = useCallback(async (endpoint: string) => {
    return Promise.resolve();
  }, []);

  // Disabled disconnect function
  const disconnect = useCallback((endpoint: string) => {}, []);

  // Disabled send function
  const send = useCallback((endpoint: string, message: WebSocketMessage) => {
    return false;
  }, []);

  // Disabled subscribe function
  const subscribe = useCallback(
    (eventType: string, callback: (message: WebSocketMessage) => void) => {
      return () => {};
    },
    [],
  );

  // All WebSocket event subscriptions disabled

  // Connection status monitoring disabled

  const contextValue: WebSocketContextType = {
    isConnected,
    connectionStatus,
    connectedEndpoints,
    connect,
    disconnect,
    send,
    subscribe,
    unreadMessagesCount,
    onlineUsers,
    typingUsers,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};
