/**
 * WebSocket Service - Real-time communication manager
 * Handles WebSocket connections for messaging, notifications, and user status
 */

import { toast } from 'react-toastify';

export interface WebSocketMessage {
  type: string;
  message?: string;
  data?: any;
  timestamp?: string;
  user_id?: string;
  thread_id?: string;
  notification_id?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
}

type WebSocketEventCallback = (message: WebSocketMessage) => void;
type ConnectionStatusCallback = (status: ConnectionStatus) => void;

class WebSocketService {
  private connections: Map<string, WebSocket> = new Map();
  private eventCallbacks: Map<string, Set<WebSocketEventCallback>> = new Map();
  private statusCallbacks: Set<ConnectionStatusCallback> = new Set();
  private connectionStatus: Map<string, ConnectionStatus> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  private readonly BASE_WS_URL = this.getWebSocketBaseUrl();
  private readonly RECONNECT_DELAY = 15000; // Increased to 15 seconds
  private readonly MAX_RECONNECT_ATTEMPTS = 2; // Reduced to 2 attempts
  private readonly PING_INTERVAL = 60000; // Increased to 60 seconds

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  /**
   * Connect to a WebSocket endpoint with automatic authentication - DISABLED
   */
  async connectAuthenticated(endpoint: string): Promise<void> {
    console.log(`WebSocket connection disabled for endpoint: ${endpoint}`);
    return Promise.resolve();
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('User not authenticated');
    }
    return this.connect(endpoint, token);
  }

  /**
   * Connect to a WebSocket endpoint
   */
  connect(endpoint: string, token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connections.has(endpoint)) {
        const existingWs = this.connections.get(endpoint);
        if (existingWs?.readyState === WebSocket.OPEN) {
          resolve();
          return;
        }
      }

      // Get authentication token
      const authToken = token || this.getAuthToken();
      if (!authToken) {
        reject(new Error('No authentication token available'));
        return;
      }

      // Update connection status
      this.updateConnectionStatus(endpoint, {
        connected: false,
        connecting: true,
        reconnectAttempts: this.getConnectionStatus(endpoint).reconnectAttempts,
      });

      // Build WebSocket URL with authentication token
      const wsUrl = `${this.BASE_WS_URL}/${endpoint}/`;
      const authenticatedUrl = `${wsUrl}${wsUrl.includes('?') ? '&' : '?'}token=${authToken}`;
      const ws = new WebSocket(authenticatedUrl);

      ws.onopen = () => {
        console.log(`WebSocket connected to ${endpoint}`);
        this.connections.set(endpoint, ws);
        
        this.updateConnectionStatus(endpoint, {
          connected: true,
          connecting: false,
          lastConnected: new Date(),
          reconnectAttempts: 0,
        });

        // Start ping interval
        this.startPingInterval(endpoint);
        
        resolve();
      };

      ws.onmessage = (event) => {
        this.handleMessage(endpoint, event.data);
      };

      ws.onclose = (event) => {
        // DEV: Reduced logging - console.log(`WebSocket disconnected from ${endpoint}:`, event.code, event.reason);
        this.handleDisconnection(endpoint, event.code);
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error on ${endpoint}:`, error);
        this.updateConnectionStatus(endpoint, {
          connected: false,
          connecting: false,
          reconnectAttempts: this.getConnectionStatus(endpoint).reconnectAttempts,
        });
        reject(error);
      };
    });
  }

  /**
   * Disconnect from a WebSocket endpoint
   */
  disconnect(endpoint: string): void {
    const ws = this.connections.get(endpoint);
    if (ws) {
      // Clear ping interval
      const pingInterval = this.pingIntervals.get(endpoint);
      if (pingInterval) {
        clearInterval(pingInterval);
        this.pingIntervals.delete(endpoint);
      }

      // Clear reconnect timeout
      const reconnectTimeout = this.reconnectTimeouts.get(endpoint);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        this.reconnectTimeouts.delete(endpoint);
      }

      ws.close(1000, 'Client disconnecting');
      this.connections.delete(endpoint);
      
      this.updateConnectionStatus(endpoint, {
        connected: false,
        connecting: false,
        reconnectAttempts: 0,
      });
    }
  }

  /**
   * Send a message to a WebSocket endpoint
   */
  send(endpoint: string, message: WebSocketMessage): boolean {
    const ws = this.connections.get(endpoint);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    
    console.warn(`Cannot send message to ${endpoint}: WebSocket not connected`);
    return false;
  }

  /**
   * Subscribe to WebSocket events
   */
  subscribe(eventType: string, callback: WebSocketEventCallback): () => void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, new Set());
    }
    
    this.eventCallbacks.get(eventType)?.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.eventCallbacks.get(eventType)?.delete(callback);
    };
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionStatusChange(callback: ConnectionStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Get current connection status for an endpoint
   */
  getConnectionStatus(endpoint: string): ConnectionStatus {
    return this.connectionStatus.get(endpoint) || {
      connected: false,
      connecting: false,
      reconnectAttempts: 0,
    };
  }

  /**
   * Check if endpoint is connected
   */
  isConnected(endpoint: string): boolean {
    const ws = this.connections.get(endpoint);
    return ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get all connected endpoints
   */
  getConnectedEndpoints(): string[] {
    return Array.from(this.connections.keys()).filter(endpoint => 
      this.isConnected(endpoint)
    );
  }

  // Private methods

  /**
   * Get WebSocket base URL based on environment
   */
  private getWebSocketBaseUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.NODE_ENV === 'development' ? '8001' : window.location.port;
    
    if (process.env.NODE_ENV === 'development') {
      return `${protocol}//${host}:${port}/ws`;
    } else {
      return `${protocol}//${host}${port ? `:${port}` : ''}/ws`;
    }
  }

  /**
   * Get authentication token from localStorage
   */
  private getAuthToken(): string | null {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.warn('No authentication token found in localStorage');
        return null;
      }
      return token;
    } catch (error) {
      console.error('Error retrieving auth token:', error);
      return null;
    }
  }

  private handleMessage(endpoint: string, data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      
      // Handle system messages
      if (message.type === 'pong') {
        // Pong received, connection is alive
        return;
      }

      if (message.type === 'connection_established') {
        console.log(`Connection established to ${endpoint}:`, message.message);
        return;
      }

      // Emit to subscribers
      const callbacks = this.eventCallbacks.get(message.type);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in WebSocket callback:', error);
          }
        });
      }

      // Emit to global listeners
      const globalCallbacks = this.eventCallbacks.get('*');
      if (globalCallbacks) {
        globalCallbacks.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in global WebSocket callback:', error);
          }
        });
      }

    } catch (error) {
      console.error('Error parsing WebSocket message:', error, data);
    }
  }

  private handleDisconnection(endpoint: string, code: number): void {
    this.connections.delete(endpoint);
    
    // Clear ping interval
    const pingInterval = this.pingIntervals.get(endpoint);
    if (pingInterval) {
      clearInterval(pingInterval);
      this.pingIntervals.delete(endpoint);
    }

    const status = this.getConnectionStatus(endpoint);
    
    this.updateConnectionStatus(endpoint, {
      connected: false,
      connecting: false,
      reconnectAttempts: status.reconnectAttempts,
    });

    // Attempt reconnection for unexpected disconnections
    if (code !== 1000 && code !== 1001) { // Not normal closure or going away
      this.attemptReconnection(endpoint);
    }
  }

  private attemptReconnection(endpoint: string): void {
    const status = this.getConnectionStatus(endpoint);
    
    if (status.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error(`Max reconnection attempts reached for ${endpoint}`);
      toast.error('Connection lost. Please refresh the page.');
      return;
    }

    const reconnectDelay = this.RECONNECT_DELAY * Math.pow(2, status.reconnectAttempts);
    
    // DEV: Reduced logging - console.log(`Attempting to reconnect to ${endpoint} in ${reconnectDelay}ms (attempt ${status.reconnectAttempts + 1})`);
    
    const timeout = setTimeout(async () => {
      this.updateConnectionStatus(endpoint, {
        ...status,
        reconnectAttempts: status.reconnectAttempts + 1,
      });

      try {
        // Get fresh token for reconnection
        const freshToken = this.getAuthToken();
        await this.connect(endpoint, freshToken || undefined);
        toast.success('Connection restored');
      } catch (error) {
        console.error(`Reconnection failed for ${endpoint}:`, error);
        this.attemptReconnection(endpoint);
      }
    }, reconnectDelay);

    this.reconnectTimeouts.set(endpoint, timeout);
  }

  private startPingInterval(endpoint: string): void {
    const interval = setInterval(() => {
      this.send(endpoint, {
        type: 'ping',
        timestamp: new Date().toISOString(),
      });
    }, this.PING_INTERVAL);

    this.pingIntervals.set(endpoint, interval);
  }

  private updateConnectionStatus(endpoint: string, status: ConnectionStatus): void {
    this.connectionStatus.set(endpoint, status);
    
    // Notify status callbacks
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in connection status callback:', error);
      }
    });
  }

  private handleOnline(): void {
    console.log('Network connection restored');
    // Attempt to reconnect all disconnected endpoints
    const freshToken = this.getAuthToken();
    if (freshToken) {
      this.connectionStatus.forEach((status, endpoint) => {
        if (!status.connected && !status.connecting) {
          this.connect(endpoint, freshToken).catch(error => {
            console.error(`Failed to reconnect ${endpoint} after going online:`, error);
          });
        }
      });
    } else {
      console.warn('Cannot reconnect: No auth token available');
    }
  }

  private handleOffline(): void {
    console.log('Network connection lost');
    toast.warn('Network connection lost. Reconnecting when online...');
  }

  /**
   * Clean up all connections and intervals
   */
  destroy(): void {
    // Disconnect all endpoints
    Array.from(this.connections.keys()).forEach(endpoint => {
      this.disconnect(endpoint);
    });

    // Clear all callbacks
    this.eventCallbacks.clear();
    this.statusCallbacks.clear();

    // Remove event listeners
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

export default websocketService;

// === CONFIGURACIÓN ESPECIAL PARA DESARROLLO ===
const isDevelopment = import.meta.env.DEV;
const DEV_WEBSOCKET_CONFIG = {
    maxReconnectAttempts: isDevelopment ? 2 : 5,
    baseReconnectInterval: isDevelopment ? 10000 : 3000,
    maxReconnectInterval: isDevelopment ? 30000 : 60000,
    enableVerboseLogging: isDevelopment ? false : true
};
