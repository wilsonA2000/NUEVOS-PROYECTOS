/**
 * Hook genérico para manejar conexiones WebSocket con reconexión automática
 * y manejo de estados de conexión.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface WebSocketMessage {
  type: string;
  data?: string;
  [key: string]: any;
}

export interface UseWebSocketOptions {
  url: string;
  protocols?: string | string[];
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  shouldReconnect?: (closeEvent: CloseEvent) => boolean;
}

export interface UseWebSocketReturn {
  socket: WebSocket | null;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  sendMessage: (message: WebSocketMessage) => void;
  sendJsonMessage: (data: any) => void;
  reconnect: () => void;
  disconnect: () => void;
  isConnected: boolean;
}

// Simple hook for URL string compatibility with useNotifications
export const useWebSocket = (urlOrOptions: string | UseWebSocketOptions): UseWebSocketReturn & { lastMessage?: WebSocketMessage } => {
  // Handle both string URL and options object
  const options: UseWebSocketOptions = typeof urlOrOptions === 'string' 
    ? { url: urlOrOptions } 
    : urlOrOptions;
  const {
    url,
    protocols,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    heartbeatInterval = 30000,
    onOpen,
    onClose,
    onError,
    onMessage,
    shouldReconnect = (closeEvent) => closeEvent.code !== 1000, // No reconectar si cierre normal
  } = options;

  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<UseWebSocketReturn['connectionState']>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | undefined>();
  
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  // Función para limpiar timeouts
  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
  }, []);

  // Función para crear conexión WebSocket
  const createWebSocket = useCallback(() => {
    if (!isAuthenticated || !token) {
      console.warn('Usuario no autenticado, no se puede crear conexión WebSocket');
      return;
    }

    try {
      setConnectionState('connecting');
      
      // Construir URL correcta para WebSocket
      let wsUrl: string;
      if (url.startsWith('ws://') || url.startsWith('wss://')) {
        // URL completa
        wsUrl = url;
      } else {
        // URL relativa - construir URL completa
        const baseUrl = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = process.env.NODE_ENV === 'development' ? '8001' : window.location.port;
        wsUrl = `${baseUrl}//${host}:${port}${url.startsWith('/') ? url : `/${url}`}`;
      }
      
      // Agregar token de autenticación
      const urlWithToken = `${wsUrl}${wsUrl.includes('?') ? '&' : '?'}token=${token}`;

      console.log('Conectando WebSocket a:', urlWithToken);
      const newSocket = new WebSocket(urlWithToken, protocols);

      newSocket.onopen = (event) => {

setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        
        // Configurar heartbeat
        if (heartbeatInterval > 0) {
          heartbeatIntervalRef.current = setInterval(() => {
            if (newSocket.readyState === WebSocket.OPEN) {
              newSocket.send(JSON.stringify({ 
                type: 'ping', 
                timestamp: new Date().toISOString() 
              }));
            }
          }, heartbeatInterval);
        }

        onOpen?.(event);
      };

      newSocket.onclose = (event) => {

setConnectionState('disconnected');
        setSocket(null);
        clearTimeouts();

        onClose?.(event);

        // Intentar reconexión si es necesario
        if (shouldReconnectRef.current && shouldReconnect(event) && reconnectAttemptsRef.current < reconnectAttempts) {
          reconnectAttemptsRef.current++;

reconnectTimeoutRef.current = setTimeout(() => {
            createWebSocket();
          }, reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current - 1)); // Backoff exponencial
        }
      };

      newSocket.onerror = (event) => {
        console.error('Error en WebSocket:', event);
        setConnectionState('error');
        onError?.(event);
      };

      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          
          // Manejar pong para heartbeat
          if (message.type === 'pong') {
            return;
          }

          // Set lastMessage for compatibility with useNotifications
          setLastMessage({ ...message, data: event.data });
          onMessage?.(message);
        } catch (error) {
          console.error('Error parseando mensaje WebSocket:', error);
        }
      };

      setSocket(newSocket);
    } catch (error) {
      console.error('Error creando WebSocket:', error);
      setConnectionState('error');
    }
  }, [url, protocols, token, isAuthenticated, onOpen, onClose, onError, onMessage, shouldReconnect, reconnectAttempts, reconnectInterval, heartbeatInterval]);

  // Función para enviar mensajes
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket no está conectado, no se puede enviar el mensaje');
    }
  }, [socket]);

  // Función para enviar datos JSON
  const sendJsonMessage = useCallback((data: any) => {
    sendMessage(data);
  }, [sendMessage]);

  // Función para reconectar manualmente
  const reconnect = useCallback(() => {
    if (socket) {
      socket.close();
    }
    reconnectAttemptsRef.current = 0;
    shouldReconnectRef.current = true;
    createWebSocket();
  }, [socket, createWebSocket]);

  // Función para desconectar
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearTimeouts();
    if (socket) {
      socket.close(1000, 'Desconexión manual');
    }
  }, [socket, clearTimeouts]);

  // Efecto para crear conexión inicial
  useEffect(() => {
    if (isAuthenticated && token) {
      createWebSocket();
    }

    return () => {
      shouldReconnectRef.current = false;
      clearTimeouts();
      if (socket) {
        socket.close();
      }
    };
  }, [isAuthenticated, token, createWebSocket]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      clearTimeouts();
      if (socket) {
        socket.close();
      }
    };
  }, [socket, clearTimeouts]);

  return {
    socket,
    connectionState,
    sendMessage,
    sendJsonMessage,
    reconnect,
    disconnect,
    isConnected: connectionState === 'connected',
    lastMessage,
  };
};