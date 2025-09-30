/**
 * Optimized WebSocket Service - Anti-spam, intelligent connection management
 * Designed to prevent connection spam and optimize real-time communication
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
  error?: string | null;
  lastConnected?: Date;
  reconnectAttempts: number;
}

type WebSocketEventCallback = (message: WebSocketMessage) => void;
type ConnectionStatusCallback = (status: ConnectionStatus) => void;

interface ConnectionConfig {
  maxReconnectAttempts: number;
  reconnectDelay: number;
  pingInterval: number;
  connectionTimeout: number;
  rateLimitWindow: number; // Time window for rate limiting
  maxConnectionsPerWindow: number; // Max connections per time window
}

class OptimizedWebSocketService {
  private connections: Map<string, WebSocket> = new Map();
  private eventCallbacks: Map<string, Set<WebSocketEventCallback>> = new Map();
  private statusCallbacks: Set<ConnectionStatusCallback> = new Set();
  private connectionStatus: Map<string, ConnectionStatus> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private connectionAttempts: Map<string, number[]> = new Map(); // Track connection attempts per endpoint
  
  private readonly BASE_WS_URL = this.getWebSocketBaseUrl();
  
  // Optimized configuration to prevent spam
  private readonly config: ConnectionConfig = {
    maxReconnectAttempts: 3,        // Reduced from 5
    reconnectDelay: 30000,          // 30 seconds between attempts
    pingInterval: 45000,            // 45 seconds ping interval
    connectionTimeout: 10000,       // 10 second connection timeout
    rateLimitWindow: 60000,         // 1 minute window
    maxConnectionsPerWindow: 2,     // Max 2 connection attempts per minute
  };

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Cleanup intervals on page unload
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  /**
   * Rate limiting check - prevents spam connections
   */
  private canAttemptConnection(endpoint: string): boolean {
    const now = Date.now();
    const attempts = this.connectionAttempts.get(endpoint) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(
      attempt => now - attempt < this.config.rateLimitWindow
    );
    
    // Update the attempts array
    this.connectionAttempts.set(endpoint, recentAttempts);
    
    // Check if we're under the limit
    if (recentAttempts.length >= this.config.maxConnectionsPerWindow) {
      console.warn(`Rate limit exceeded for WebSocket endpoint: ${endpoint}. Max ${this.config.maxConnectionsPerWindow} attempts per ${this.config.rateLimitWindow/1000}s`);
      return false;
    }
    
    // Record this attempt
    recentAttempts.push(now);
    this.connectionAttempts.set(endpoint, recentAttempts);
    return true;
  }

  /**
   * Intelligent connection with anti-spam protection
   */
  async connectAuthenticated(endpoint: string): Promise<void> {
    // Check if already connected
    if (this.isConnected(endpoint)) {
      console.log(`Already connected to ${endpoint}`);
      return Promise.resolve();
    }
    
    // Check if currently connecting
    const status = this.getConnectionStatus(endpoint);
    if (status.connecting) {
      console.log(`Already connecting to ${endpoint}`);
      return Promise.resolve();
    }
    
    // Rate limiting check
    if (!this.canAttemptConnection(endpoint)) {
      return Promise.reject(new Error(`Rate limit exceeded for ${endpoint}`));
    }
    
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('User not authenticated');
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.setConnectionStatus(endpoint, { 
          connected: false, 
          connecting: true, 
          reconnectAttempts: status.reconnectAttempts,
          error: null 
        });
        
        const wsUrl = `${this.BASE_WS_URL}/ws/${endpoint}/?token=${token}`;
        const ws = new WebSocket(wsUrl);
        
        // Connection timeout
        const timeoutId = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            reject(new Error(`Connection timeout for ${endpoint}`));
          }
        }, this.config.connectionTimeout);
        
        ws.onopen = () => {
          clearTimeout(timeoutId);
          console.log(`✅ WebSocket connected: ${endpoint}`);
          
          this.connections.set(endpoint, ws);
          this.setConnectionStatus(endpoint, { 
            connected: true, 
            connecting: false, 
            lastConnected: new Date(),
            reconnectAttempts: 0,
            error: null 
          });
          
          this.startPing(endpoint);
          resolve();
        };
        
        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(endpoint, message);
          } catch (error) {
            console.error(`Error parsing WebSocket message from ${endpoint}:`, error);
          }
        };
        
        ws.onclose = (event) => {
          clearTimeout(timeoutId);
          this.handleDisconnection(endpoint, event.code, event.reason);
        };
        
        ws.onerror = (error) => {
          clearTimeout(timeoutId);
          console.error(`WebSocket error on ${endpoint}:`, error);
          this.setConnectionStatus(endpoint, { 
            connected: false, 
            connecting: false, 
            error: 'Connection error',
            reconnectAttempts: status.reconnectAttempts + 1 
          });
          reject(error);
        };
        
      } catch (error) {
        this.setConnectionStatus(endpoint, { 
          connected: false, 
          connecting: false, 
          error: 'Connection failed',
          reconnectAttempts: status.reconnectAttempts + 1 
        });
        reject(error);
      }
    });
  }

  /**
   * Smart reconnection with exponential backoff
   */
  private handleDisconnection(endpoint: string, code: number, reason: string) {
    console.log(`WebSocket disconnected: ${endpoint} (${code}: ${reason})`);
    
    this.connections.delete(endpoint);
    this.stopPing(endpoint);
    
    const status = this.getConnectionStatus(endpoint);
    this.setConnectionStatus(endpoint, { 
      connected: false, 
      connecting: false,
      reconnectAttempts: status.reconnectAttempts,
      error: reason || 'Disconnected'
    });
    
    // Only auto-reconnect for unexpected disconnections (not manual close)
    if (code !== 1000 && code !== 1001) {
      this.scheduleReconnect(endpoint);
    }
  }

  /**
   * Intelligent reconnection with exponential backoff
   */
  private scheduleReconnect(endpoint: string) {
    const status = this.getConnectionStatus(endpoint);
    
    // Stop if max attempts reached
    if (status.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.warn(`Max reconnect attempts reached for ${endpoint}`);
      this.setConnectionStatus(endpoint, { 
        ...status, 
        error: 'Max reconnect attempts reached' 
      });
      return;
    }
    
    // Exponential backoff: 30s, 60s, 120s
    const delay = this.config.reconnectDelay * Math.pow(2, status.reconnectAttempts);
    
    console.log(`Scheduling reconnect for ${endpoint} in ${delay/1000}s (attempt ${status.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`);
    
    const timeoutId = setTimeout(async () => {
      try {
        await this.connectAuthenticated(endpoint);
      } catch (error) {
        console.error(`Reconnect failed for ${endpoint}:`, error);
      }
    }, delay);
    
    this.reconnectTimeouts.set(endpoint, timeoutId);
  }

  /**
   * Send message with validation
   */
  send(endpoint: string, message: WebSocketMessage): boolean {
    const ws = this.connections.get(endpoint);
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn(`WebSocket not connected for ${endpoint}`);
      return false;
    }
    
    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
      };
      
      ws.send(JSON.stringify(messageWithTimestamp));
      return true;
    } catch (error) {
      console.error(`Error sending message to ${endpoint}:`, error);
      return false;
    }
  }

  /**
   * Subscribe to events with proper cleanup
   */
  subscribe(eventType: string, callback: WebSocketEventCallback): () => void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, new Set());
    }
    
    this.eventCallbacks.get(eventType)!.add(callback);
    
    return () => {
      const callbacks = this.eventCallbacks.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.eventCallbacks.delete(eventType);
        }
      }
    };
  }

  /**
   * Disconnect with proper cleanup
   */
  disconnect(endpoint: string): void {
    const ws = this.connections.get(endpoint);
    
    if (ws) {
      ws.close(1000, 'Manual disconnect');
      this.connections.delete(endpoint);
    }
    
    // Clear reconnection timer
    const timeoutId = this.reconnectTimeouts.get(endpoint);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.reconnectTimeouts.delete(endpoint);
    }
    
    this.stopPing(endpoint);
    
    this.setConnectionStatus(endpoint, { 
      connected: false, 
      connecting: false, 
      reconnectAttempts: 0,
      error: null 
    });
  }

  /**
   * Health monitoring with intelligent ping
   */
  private startPing(endpoint: string): void {
    const ws = this.connections.get(endpoint);
    if (!ws) return;
    
    const intervalId = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
        } catch (error) {
          console.error(`Ping failed for ${endpoint}:`, error);
          this.stopPing(endpoint);
        }
      } else {
        this.stopPing(endpoint);
      }
    }, this.config.pingInterval);
    
    this.pingIntervals.set(endpoint, intervalId);
  }

  private stopPing(endpoint: string): void {
    const intervalId = this.pingIntervals.get(endpoint);
    if (intervalId) {
      clearInterval(intervalId);
      this.pingIntervals.delete(endpoint);
    }
  }

  private handleMessage(endpoint: string, message: WebSocketMessage): void {
    // Handle pong responses
    if (message.type === 'pong') {
      return;
    }
    
    // Emit to specific event listeners
    const callbacks = this.eventCallbacks.get(message.type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error(`Error in WebSocket callback for ${message.type}:`, error);
        }
      });
    }
    
    // Emit to wildcard listeners
    const wildcardCallbacks = this.eventCallbacks.get('*');
    if (wildcardCallbacks) {
      wildcardCallbacks.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error(`Error in WebSocket wildcard callback:`, error);
        }
      });
    }
  }

  // Utility methods
  private getWebSocketBaseUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.NODE_ENV === 'development' ? '8001' : window.location.port;
    return `${protocol}//${host}:${port}`;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private setConnectionStatus(endpoint: string, status: Partial<ConnectionStatus>): void {
    const currentStatus = this.connectionStatus.get(endpoint) || {
      connected: false,
      connecting: false,
      reconnectAttempts: 0,
    };
    
    const newStatus = { ...currentStatus, ...status };
    this.connectionStatus.set(endpoint, newStatus);
    
    // Notify status callbacks
    this.statusCallbacks.forEach(callback => {
      try {
        callback(newStatus);
      } catch (error) {
        console.error('Error in status callback:', error);
      }
    });
  }

  // Public utility methods
  isConnected(endpoint: string): boolean {
    const ws = this.connections.get(endpoint);
    return ws ? ws.readyState === WebSocket.OPEN : false;
  }

  getConnectionStatus(endpoint: string): ConnectionStatus {
    return this.connectionStatus.get(endpoint) || {
      connected: false,
      connecting: false,
      reconnectAttempts: 0,
    };
  }

  getConnectedEndpoints(): string[] {
    return Array.from(this.connections.keys()).filter(endpoint => this.isConnected(endpoint));
  }

  onConnectionStatusChange(callback: ConnectionStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  // Network event handlers
  private handleOnline(): void {
    console.log('Network online - checking WebSocket connections');
    // Only reconnect to previously connected endpoints
    for (const [endpoint, status] of this.connectionStatus.entries()) {
      if (!status.connected && status.lastConnected) {
        this.scheduleReconnect(endpoint);
      }
    }
  }

  private handleOffline(): void {
    console.log('Network offline - pausing WebSocket connections');
    // Mark all as disconnected but don't attempt reconnection
    this.connections.forEach((ws, endpoint) => {
      this.setConnectionStatus(endpoint, { 
        connected: false, 
        connecting: false,
        error: 'Network offline' 
      });
    });
  }

  // Cleanup method
  private cleanup(): void {
    console.log('Cleaning up WebSocket connections');
    
    // Close all connections gracefully
    this.connections.forEach((ws, endpoint) => {
      try {
        ws.close(1000, 'Page unload');
      } catch (error) {
        console.error(`Error closing WebSocket ${endpoint}:`, error);
      }
    });
    
    // Clear all timeouts
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.pingIntervals.forEach(interval => clearInterval(interval));
    
    // Clear maps
    this.connections.clear();
    this.reconnectTimeouts.clear();
    this.pingIntervals.clear();
  }

  /**
   * Batch connection method - connects to multiple endpoints efficiently
   */
  async connectToEndpoints(endpoints: string[]): Promise<void> {
    const connectionPromises = endpoints.map(async (endpoint) => {
      try {
        await this.connectAuthenticated(endpoint);
        return { endpoint, success: true };
      } catch (error) {
        console.error(`Failed to connect to ${endpoint}:`, error);
        return { endpoint, success: false, error };
      }
    });
    
    const results = await Promise.allSettled(connectionPromises);
    const successful = results.filter(result => result.status === 'fulfilled').length;
    
    console.log(`WebSocket batch connection: ${successful}/${endpoints.length} successful`);
  }

  /**
   * Graceful shutdown - disconnect all with cleanup
   */
  disconnectAll(): void {
    console.log('Disconnecting all WebSocket connections');
    
    this.connections.forEach((_, endpoint) => {
      this.disconnect(endpoint);
    });
    
    this.cleanup();
  }

  /**
   * Get connection health status
   */
  getHealthStatus(): { 
    totalConnections: number;
    activeConnections: number;
    failedConnections: number;
    endpoints: Array<{ endpoint: string; status: ConnectionStatus }>;
  } {
    const endpoints = Array.from(this.connectionStatus.entries()).map(([endpoint, status]) => ({
      endpoint,
      status,
    }));
    
    return {
      totalConnections: this.connections.size,
      activeConnections: this.getConnectedEndpoints().length,
      failedConnections: endpoints.filter(e => e.status.error).length,
      endpoints,
    };
  }
}

// Export singleton instance
export const optimizedWebSocketService = new OptimizedWebSocketService();
export default optimizedWebSocketService;