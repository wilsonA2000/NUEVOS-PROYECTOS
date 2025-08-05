/**
 * Middleware de auditoría para el frontend de VeriHome
 * Intercepta y registra automáticamente eventos importantes
 */

import { loggingService, LogLevel, LogCategory } from '../services/loggingService';
import { performanceMonitor } from './performanceMonitor';

// Configuración del middleware
interface AuditConfig {
  logUserActions: boolean;
  logNavigations: boolean;
  logAPIRequests: boolean;
  logErrors: boolean;
  logPerformance: boolean;
  sensitiveFields: string[];
  ignoredPaths: string[];
}

const defaultConfig: AuditConfig = {
  logUserActions: true,
  logNavigations: true,
  logAPIRequests: true,
  logErrors: true,
  logPerformance: true,
  sensitiveFields: ['password', 'token', 'secret', 'key', 'auth'],
  ignoredPaths: ['/health', '/ping', '/status']
};

class AuditMiddleware {
  private config: AuditConfig;
  private isInitialized: boolean = false;

  constructor(config: Partial<AuditConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Inicializa el middleware de auditoría
   */
  initialize(): void {
    if (this.isInitialized) return;

    this.setupNavigationLogging();
    this.setupUserActionLogging();
    this.setupErrorLogging();
    this.setupPerformanceLogging();

    this.isInitialized = true;
    
    loggingService.info(
      LogCategory.SYSTEM, 
      'Audit middleware initialized',
      { config: this.config }
    );
  }

  /**
   * Configura el logging de navegación
   */
  private setupNavigationLogging(): void {
    if (!this.config.logNavigations) return;

    // Interceptar cambios de ruta
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(state: any, title: string, url?: string | URL | null) {
      loggingService.logUserActivity({
        action: 'navigation',
        description: `Navigated to ${url || 'unknown'}`,
        category: LogCategory.UI,
        metadata: {
          from: window.location.href,
          to: url?.toString(),
          state,
          title
        }
      });

      return originalPushState.apply(history, [state, title, url]);
    };

    history.replaceState = function(state: any, title: string, url?: string | URL | null) {
      loggingService.logUserActivity({
        action: 'navigation_replace',
        description: `Replaced route to ${url || 'unknown'}`,
        category: LogCategory.UI,
        metadata: {
          from: window.location.href,
          to: url?.toString(),
          state,
          title
        }
      });

      return originalReplaceState.apply(history, [state, title, url]);
    };

    // Logging del evento popstate (back/forward buttons)
    window.addEventListener('popstate', (event) => {
      loggingService.logUserActivity({
        action: 'navigation_back_forward',
        description: `Browser back/forward navigation`,
        category: LogCategory.UI,
        metadata: {
          url: window.location.href,
          state: event.state
        }
      });
    });
  }

  /**
   * Configura el logging de acciones de usuario
   */
  private setupUserActionLogging(): void {
    if (!this.config.logUserActions) return;

    // Interceptar clics en elementos importantes
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      // Solo registrar clics en elementos interactivos importantes
      if (this.isImportantElement(target)) {
        const elementInfo = this.getElementInfo(target);
        
        loggingService.logUserActivity({
          action: 'click',
          description: `Clicked on ${elementInfo.type}: ${elementInfo.text}`,
          category: LogCategory.USER_ACTION,
          metadata: {
            elementType: elementInfo.type,
            elementText: elementInfo.text,
            elementId: elementInfo.id,
            elementClass: elementInfo.className,
            position: { x: event.clientX, y: event.clientY }
          }
        });
      }
    });

    // Interceptar envíos de formularios
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      const formData = new FormData(form);
      const sanitizedData = this.sanitizeFormData(formData);

      loggingService.logUserActivity({
        action: 'form_submit',
        description: `Form submitted: ${form.id || form.className || 'unnamed'}`,
        category: LogCategory.USER_ACTION,
        metadata: {
          formId: form.id,
          formClass: form.className,
          formMethod: form.method,
          formAction: form.action,
          fieldCount: sanitizedData.size
        }
      });
    });

    // Interceptar cambios importantes en inputs
    document.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      
      if (this.isImportantInput(target)) {
        loggingService.debug(
          LogCategory.USER_ACTION,
          `Input changed: ${target.type} ${target.name || target.id}`,
          {
            inputType: target.type,
            inputName: target.name,
            inputId: target.id,
            hasValue: !!target.value
          }
        );
      }
    });
  }

  /**
   * Configura el logging de errores
   */
  private setupErrorLogging(): void {
    if (!this.config.logErrors) return;

    // Ya está configurado en loggingService, pero podemos agregar más contexto
    window.addEventListener('error', (event) => {
      loggingService.error(
        LogCategory.SYSTEM,
        'JavaScript error intercepted by audit middleware',
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          message: event.message,
          stack: event.error?.stack
        },
        'AuditMiddleware',
        event.error
      );
    });

    // Interceptar errores de recursos (imágenes, scripts, etc.)
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        const element = event.target as HTMLElement;
        loggingService.error(
          LogCategory.SYSTEM,
          'Resource loading error',
          {
            elementType: element.tagName,
            resourceUrl: (element as any).src || (element as any).href,
            elementId: element.id,
            elementClass: element.className
          },
          'AuditMiddleware'
        );
      }
    }, true);
  }

  /**
   * Configura el logging de rendimiento
   */
  private setupPerformanceLogging(): void {
    if (!this.config.logPerformance) return;

    // Interceptar métricas de Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            loggingService.logPerformance(
              'largest_contentful_paint',
              entry.startTime,
              {
                element: (entry as any).element?.tagName,
                url: (entry as any).url,
                size: (entry as any).size
              }
            );
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            loggingService.logPerformance(
              'first_input_delay',
              (entry as any).processingStart - entry.startTime,
              {
                inputType: (entry as any).name,
                processingStart: (entry as any).processingStart,
                startTime: entry.startTime
              }
            );
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift (CLS)
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            loggingService.logPerformance(
              'cumulative_layout_shift',
              (entry as any).value,
              {
                hadRecentInput: (entry as any).hadRecentInput,
                sources: (entry as any).sources?.map((source: any) => ({
                  node: source.node?.tagName,
                  currentRect: source.currentRect,
                  previousRect: source.previousRect
                }))
              }
            );
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

      } catch (error) {
        console.warn('Failed to setup performance observers:', error);
      }
    }

    // Logging de carga de página
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        loggingService.logPerformance(
          'page_load_complete',
          navigation.loadEventEnd - navigation.navigationStart,
          {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
            firstPaint: this.getFirstPaint(),
            firstContentfulPaint: this.getFirstContentfulPaint(),
            resources: performance.getEntriesByType('resource').length
          }
        );
      }, 0);
    });
  }

  /**
   * Interceptor para requests de API
   */
  interceptAPIRequest(config: any): any {
    if (!this.config.logAPIRequests) return config;

    const startTime = performance.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Sanitizar datos sensibles
    const sanitizedData = this.sanitizeData(config.data);

    loggingService.info(
      LogCategory.API,
      `API Request: ${config.method?.toUpperCase()} ${config.url}`,
      {
        requestId,
        method: config.method,
        url: config.url,
        hasData: !!config.data,
        headers: this.sanitizeHeaders(config.headers),
        params: config.params
      },
      'APIInterceptor'
    );

    // Agregar metadata para el response
    config.metadata = { requestId, startTime };

    return config;
  }

  /**
   * Interceptor para responses de API
   */
  interceptAPIResponse(response: any): any {
    if (!this.config.logAPIRequests) return response;

    const endTime = performance.now();
    const duration = endTime - (response.config.metadata?.startTime || endTime);
    const requestId = response.config.metadata?.requestId;

    loggingService.info(
      LogCategory.API,
      `API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
      {
        requestId,
        status: response.status,
        statusText: response.statusText,
        duration,
        responseSize: JSON.stringify(response.data).length,
        headers: this.sanitizeHeaders(response.headers)
      },
      'APIInterceptor'
    );

    // Integrar con performanceMonitor existente
    performanceMonitor.trackAPICall(
      response.config.url,
      response.config.method?.toUpperCase() || 'GET',
      duration,
      response.status
    );

    return response;
  }

  /**
   * Interceptor para errores de API
   */
  interceptAPIError(error: any): Promise<any> {
    if (!this.config.logAPIRequests) return Promise.reject(error);

    const endTime = performance.now();
    const duration = endTime - (error.config?.metadata?.startTime || endTime);
    const requestId = error.config?.metadata?.requestId;

    loggingService.error(
      LogCategory.API,
      `API Error: ${error.response?.status || 'Network'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      {
        requestId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        duration,
        errorMessage: error.message,
        errorCode: error.code,
        responseData: error.response?.data
      },
      'APIInterceptor',
      error
    );

    return Promise.reject(error);
  }

  // Métodos auxiliares

  private isImportantElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    
    return (
      tagName === 'button' ||
      tagName === 'a' ||
      (tagName === 'input' && ['submit', 'button'].includes((element as HTMLInputElement).type)) ||
      role === 'button' ||
      element.hasAttribute('data-audit-log') ||
      element.closest('[data-audit-important]') !== null
    );
  }

  private isImportantInput(input: HTMLInputElement): boolean {
    const type = input.type;
    const name = input.name;
    
    return (
      ['email', 'password', 'search', 'tel'].includes(type) ||
      name.includes('search') ||
      input.hasAttribute('data-audit-log')
    );
  }

  private getElementInfo(element: HTMLElement) {
    return {
      type: element.tagName.toLowerCase(),
      text: element.textContent?.trim().substring(0, 50) || '',
      id: element.id,
      className: element.className
    };
  }

  private sanitizeFormData(formData: FormData): Map<string, boolean> {
    const sanitized = new Map<string, boolean>();
    
    for (const [key] of formData.entries()) {
      // Solo registrar si el campo existe, no el valor
      const isSensitive = this.config.sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      );
      sanitized.set(key, !isSensitive);
    }
    
    return sanitized;
  }

  private sanitizeData(data: any): any {
    if (!data) return data;
    
    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const isSensitive = this.config.sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        );
        sanitized[key] = isSensitive ? '[SANITIZED]' : value;
      }
      return sanitized;
    }
    
    return '[DATA]';
  }

  private sanitizeHeaders(headers: any): any {
    if (!headers) return headers;
    
    const sanitized: any = {};
    for (const [key, value] of Object.entries(headers)) {
      const isSensitive = this.config.sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      ) || key.toLowerCase().includes('authorization');
      
      sanitized[key] = isSensitive ? '[SANITIZED]' : value;
    }
    return sanitized;
  }

  private getFirstPaint(): number | undefined {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint?.startTime;
  }

  private getFirstContentfulPaint(): number | undefined {
    const paintEntries = performance.getEntriesByType('paint');
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return firstContentfulPaint?.startTime;
  }
}

// Crear instancia singleton
export const auditMiddleware = new AuditMiddleware();

// Hook para React components
export const useAuditTrack = (componentName: string) => {
  const trackEvent = (action: string, details?: Record<string, any>) => {
    loggingService.logUserActivity({
      action,
      description: `${componentName}: ${action}`,
      category: LogCategory.USER_ACTION,
      metadata: {
        component: componentName,
        ...details
      }
    });
  };

  const trackError = (error: Error, context?: Record<string, any>) => {
    loggingService.error(
      LogCategory.UI,
      `Error in ${componentName}`,
      {
        component: componentName,
        ...context
      },
      componentName,
      error
    );
  };

  const trackPerformance = (operation: string, duration: number, metadata?: Record<string, any>) => {
    loggingService.logPerformance(
      `${componentName}.${operation}`,
      duration,
      {
        component: componentName,
        ...metadata
      }
    );
  };

  return {
    trackEvent,
    trackError,
    trackPerformance
  };
};

// Inicializar automáticamente
if (typeof window !== 'undefined') {
  auditMiddleware.initialize();
}