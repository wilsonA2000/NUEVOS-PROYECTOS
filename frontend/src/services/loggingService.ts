/**
 * Servicio centralizado de logging y auditoría para VeriHome
 * Se integra con el performanceMonitor existente y proporciona logging estructurado
 */

import { performanceMonitor } from '../utils/performanceMonitor';
import { api } from './api';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum LogCategory {
  SYSTEM = 'system',
  USER_ACTION = 'user_action',
  API = 'api',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  BUSINESS = 'business',
  UI = 'ui'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  component?: string;
  stack?: string;
  metadata?: Record<string, any>;
}

export interface ActivityLogEntry {
  action: string;
  description: string;
  category: LogCategory;
  metadata?: Record<string, any>;
  success?: boolean;
  duration?: number;
}

class LoggingService {
  private logs: LogEntry[] = [];
  private sessionId: string;
  private userId?: string;
  private maxLocalLogs: number = 1000;
  private batchSize: number = 50;
  private flushInterval: number = 30000; // 30 segundos
  private pendingLogs: LogEntry[] = [];
  private isEnabled: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupPeriodicFlush();
    this.setupErrorCapture();
    this.setupPerformanceTracking();
  }

  /**
   * Inicializa el servicio con información del usuario
   */
  initialize(userId?: string): void {
    this.userId = userId;
    this.log(LogLevel.INFO, LogCategory.SYSTEM, 'Logging service initialized', {
      userId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }

  /**
   * Método principal de logging
   */
  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    details?: Record<string, any>,
    component?: string
  ): void {
    if (!this.isEnabled) return;

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
      userId: this.userId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      component,
      metadata: this.getContextMetadata()
    };

    // Agregar a logs locales
    this.addToLocalLogs(logEntry);

    // Log en consola para desarrollo
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(logEntry);
    }

    // Agregar a cola para envío al servidor
    if (this.shouldSendToServer(level, category)) {
      this.pendingLogs.push(logEntry);
    }

    // Flush inmediato para logs críticos
    if (level === LogLevel.CRITICAL || level === LogLevel.ERROR) {
      this.flushLogs();
    }
  }

  /**
   * Métodos de conveniencia para diferentes niveles
   */
  debug(category: LogCategory, message: string, details?: Record<string, any>, component?: string): void {
    this.log(LogLevel.DEBUG, category, message, details, component);
  }

  info(category: LogCategory, message: string, details?: Record<string, any>, component?: string): void {
    this.log(LogLevel.INFO, category, message, details, component);
  }

  warn(category: LogCategory, message: string, details?: Record<string, any>, component?: string): void {
    this.log(LogLevel.WARN, category, message, details, component);
  }

  error(category: LogCategory, message: string, details?: Record<string, any>, component?: string, error?: Error): void {
    const logDetails = {
      ...details,
      ...(error && {
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack
      })
    };

    this.log(LogLevel.ERROR, category, message, logDetails, component);
  }

  critical(category: LogCategory, message: string, details?: Record<string, any>, component?: string): void {
    this.log(LogLevel.CRITICAL, category, message, details, component);
  }

  /**
   * Log de actividad de usuario para auditoría
   */
  logUserActivity(activityData: ActivityLogEntry): void {
    const startTime = performance.now();

    this.log(
      LogLevel.INFO,
      activityData.category,
      `User action: ${activityData.action}`,
      {
        action: activityData.action,
        description: activityData.description,
        success: activityData.success ?? true,
        duration: activityData.duration,
        metadata: activityData.metadata
      }
    );

    // Enviar al backend para auditoría (con manejo mejorado de errores)
    this.sendActivityToBackend(activityData).catch(error => {
      // Solo loguear errores que no sean de conectividad en desarrollo
      if (!import.meta.env.DEV || !error.message.includes('Backend no disponible')) {
        this.error(LogCategory.SYSTEM, 'Failed to send activity log to backend', { error: error.message });
      }
    });

    const endTime = performance.now();
    performanceMonitor.trackAPICall('/api/activity-logs', 'POST', endTime - startTime, 200);
  }

  /**
   * Logging de performance integrado con performanceMonitor
   */
  logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.log(
      LogLevel.INFO,
      LogCategory.PERFORMANCE,
      `Performance: ${operation}`,
      {
        operation,
        duration,
        ...metadata
      }
    );

    // Integrar con performanceMonitor existente
    performanceMonitor.trackAPICall(operation, 'PERFORMANCE', duration, 200);
  }

  /**
   * Logging de errores de seguridad
   */
  logSecurityEvent(event: string, details: Record<string, any>): void {
    this.log(
      LogLevel.WARN,
      LogCategory.SECURITY,
      `Security event: ${event}`,
      details
    );

    // Envío inmediato para eventos de seguridad
    this.flushLogs();
  }

  /**
   * Obtiene logs locales con filtros
   */
  getLogs(filters?: {
    level?: LogLevel;
    category?: LogCategory;
    component?: string;
    since?: Date;
    limit?: number;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters) {
      if (filters.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filters.level);
      }
      if (filters.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filters.category);
      }
      if (filters.component) {
        filteredLogs = filteredLogs.filter(log => log.component === filters.component);
      }
      if (filters.since) {
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= filters.since!);
      }
      if (filters.limit) {
        filteredLogs = filteredLogs.slice(-filters.limit);
      }
    }

    return filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Exporta logs para debugging
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    const logs = this.getLogs();
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else {
      const headers = ['timestamp', 'level', 'category', 'message', 'component', 'userId'];
      const csv = [
        headers.join(','),
        ...logs.map(log => [
          log.timestamp,
          log.level,
          log.category,
          `"${log.message.replace(/"/g, '""')}"`,
          log.component || '',
          log.userId || ''
        ].join(','))
      ].join('\n');
      return csv;
    }
  }

  /**
   * Obtiene estadísticas de logs
   */
  getLogStats(): {
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    logsByCategory: Record<LogCategory, number>;
    recentErrors: LogEntry[];
    performanceMetrics: any;
  } {
    const logsByLevel = {} as Record<LogLevel, number>;
    const logsByCategory = {} as Record<LogCategory, number>;

    Object.values(LogLevel).forEach(level => logsByLevel[level] = 0);
    Object.values(LogCategory).forEach(category => logsByCategory[category] = 0);

    this.logs.forEach(log => {
      logsByLevel[log.level]++;
      logsByCategory[log.category]++;
    });

    const recentErrors = this.logs
      .filter(log => log.level === LogLevel.ERROR || log.level === LogLevel.CRITICAL)
      .slice(-10);

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      logsByCategory,
      recentErrors,
      performanceMetrics: performanceMonitor.getPerformanceReport()
    };
  }

  /**
   * Limpia logs locales
   */
  clearLogs(): void {
    this.logs = [];
    this.pendingLogs = [];
    performanceMonitor.clearMetrics();
    this.info(LogCategory.SYSTEM, 'Local logs cleared');
  }

  /**
   * Habilita/deshabilita el logging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.info(LogCategory.SYSTEM, `Logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Métodos privados

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToLocalLogs(logEntry: LogEntry): void {
    this.logs.push(logEntry);
    
    // Mantener solo los últimos N logs localmente
    if (this.logs.length > this.maxLocalLogs) {
      this.logs = this.logs.slice(-this.maxLocalLogs);
    }
  }

  private logToConsole(logEntry: LogEntry): void {
    const { level, category, message, component, details } = logEntry;
    const prefix = `[${level.toUpperCase()}] [${category}]${component ? ` [${component}]` : ''}`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, details);
        break;
      case LogLevel.INFO:
        console.info(prefix, message, details);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, details);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(prefix, message, details);
        break;
    }
  }

  private shouldSendToServer(level: LogLevel, category: LogCategory): boolean {
    // Enviar al servidor logs importantes o de auditoría
    return (
      level === LogLevel.ERROR ||
      level === LogLevel.CRITICAL ||
      category === LogCategory.SECURITY ||
      category === LogCategory.USER_ACTION ||
      category === LogCategory.BUSINESS
    );
  }

  private getContextMetadata(): Record<string, any> {
    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink
      } : undefined,
      memory: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : undefined
    };
  }

  private setupPeriodicFlush(): void {
    setInterval(() => {
      if (this.pendingLogs.length > 0) {
        this.flushLogs();
      }
    }, this.flushInterval);
  }

  private setupErrorCapture(): void {
    // Capturar errores no manejados
    window.addEventListener('error', (event) => {
      this.error(
        LogCategory.SYSTEM,
        'Unhandled JavaScript error',
        {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        },
        undefined,
        event.error
      );
    });

    // Capturar promesas rechazadas
    window.addEventListener('unhandledrejection', (event) => {
      this.error(
        LogCategory.SYSTEM,
        'Unhandled promise rejection',
        {
          reason: event.reason
        }
      );
    });
  }

  private setupPerformanceTracking(): void {
    // Integrar con Performance Observer API si está disponible
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'navigation') {
              this.logPerformance('page_load', entry.duration, {
                entryType: entry.entryType,
                loadEventEnd: (entry as PerformanceNavigationTiming).loadEventEnd
              });
            }
          });
        });
        observer.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('Failed to setup PerformanceObserver:', error);
      }
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.pendingLogs.length === 0) return;
    
    // Verificar si el logging al backend está deshabilitado
    if (import.meta.env.VITE_DISABLE_BACKEND_LOGGING === 'true') {
      console.debug('🔌 Backend logging deshabilitado - limpiando cola de logs');
      this.pendingLogs.length = 0; // Limpiar la cola
      return;
    }
    
    // Verificar conectividad antes de intentar enviar logs
    if (!await this.checkBackendConnectivity()) {
      if (import.meta.env.DEV) {
        console.debug('🔌 Backend no disponible - manteniendo logs en cola');
        return;
      }
    }

    const logsToSend = this.pendingLogs.splice(0, this.batchSize);

    try {
      await api.post('/core/activity-logs/bulk/', {
        logs: logsToSend,
        sessionId: this.sessionId
      });
      
      // Si el envío fue exitoso, marcar backend como disponible
      this.isBackendAvailable = true;
      
    } catch (error) {
      // Si falla el envío, volver a agregar a la cola
      this.pendingLogs.unshift(...logsToSend);
      
      // Verificar si es un error de conectividad
      if (error instanceof Error && (
        error.message.includes('Network Error') ||
        error.message.includes('No se pudo conectar') ||
        error.message.includes('ECONNREFUSED')
      )) {
        this.isBackendAvailable = false;
        this.lastBackendCheck = Date.now();
        
        if (import.meta.env.DEV) {
          console.debug('🔌 Error de conectividad en flush - logs en cola:', error.message);
          return;
        }
      }
      
      console.error('Failed to send logs to server:', error);
    }
  }

  private isBackendAvailable: boolean = true;
  private lastBackendCheck: number = 0;
  private readonly BACKEND_CHECK_INTERVAL = 60000; // 1 minuto
  
  private async checkBackendConnectivity(): Promise<boolean> {
    const now = Date.now();
    
    // Solo verificar cada minuto
    if (now - this.lastBackendCheck < this.BACKEND_CHECK_INTERVAL) {
      return this.isBackendAvailable;
    }
    
    try {
      // Hacer una petición ligera al backend
      const response = await fetch('/api/v1/users/auth/login/', {
        method: 'HEAD',
        timeout: 3000 // 3 segundos timeout
      } as any);
      
      this.isBackendAvailable = response.status !== 0; // 0 significa no hay conexión
      this.lastBackendCheck = now;
      return this.isBackendAvailable;
    } catch (error) {
      this.isBackendAvailable = false;
      this.lastBackendCheck = now;
      return false;
    }
  }

  private async sendActivityToBackend(activityData: ActivityLogEntry): Promise<void> {
    // Verificar si el logging al backend está deshabilitado
    if (import.meta.env.VITE_DISABLE_BACKEND_LOGGING === 'true') {
      console.debug('🔌 Backend logging deshabilitado - logs solo en consola');
      return;
    }
    
    // Verificar conectividad antes de intentar enviar
    if (!await this.checkBackendConnectivity()) {
      // No lanzar error, solo fallar silenciosamente en desarrollo
      if (import.meta.env.DEV) {
        console.debug('🔌 Backend no disponible - logs solo en consola');
        return;
      }
      throw new Error('Backend no disponible');
    }
    
    try {
      await api.post('/core/activity-logs/', {
        activity_type: activityData.action,
        description: activityData.description,
        details: {
          ...activityData.metadata,
          success: activityData.success,
          duration: activityData.duration,
          category: activityData.category,
          sessionId: this.sessionId
        },
        ip_address: null, // Se obtiene en el backend
        user_agent: navigator.userAgent,
        performed_by_admin: false
      });
      
      // Si el envío fue exitoso, marcar backend como disponible
      this.isBackendAvailable = true;
      
    } catch (error) {
      // Marcar backend como no disponible por problemas de conectividad
      if (error instanceof Error && (
        error.message.includes('Network Error') ||
        error.message.includes('No se pudo conectar') ||
        error.message.includes('ECONNREFUSED')
      )) {
        this.isBackendAvailable = false;
        this.lastBackendCheck = Date.now();
        
        // En desarrollo, fallar silenciosamente
        if (import.meta.env.DEV) {
          console.debug('🔌 Error de conectividad - logs solo en consola:', error.message);
          return;
        }
      }
      
      throw new Error(`Failed to send activity log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Crear instancia singleton
export const loggingService = new LoggingService();

// Hook de React para logging
export const useLogging = (component: string) => {
  const debug = (category: LogCategory, message: string, details?: Record<string, any>) => {
    loggingService.debug(category, message, details, component);
  };

  const info = (category: LogCategory, message: string, details?: Record<string, any>) => {
    loggingService.info(category, message, details, component);
  };

  const warn = (category: LogCategory, message: string, details?: Record<string, any>) => {
    loggingService.warn(category, message, details, component);
  };

  const error = (category: LogCategory, message: string, details?: Record<string, any>, error?: Error) => {
    loggingService.error(category, message, details, component, error);
  };

  const logActivity = (activityData: ActivityLogEntry) => {
    loggingService.logUserActivity(activityData);
  };

  const logPerformance = (operation: string, duration: number, metadata?: Record<string, any>) => {
    loggingService.logPerformance(`${component}.${operation}`, duration, metadata);
  };

  return {
    debug,
    info,
    warn,
    error,
    logActivity,
    logPerformance
  };
};

// Inicializar automáticamente en desarrollo
if (process.env.NODE_ENV === 'development') {
  loggingService.initialize();
}