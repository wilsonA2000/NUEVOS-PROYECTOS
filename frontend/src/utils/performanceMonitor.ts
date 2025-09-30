/**
 * Performance monitoring utilities for VeriHome
 * Tracks component loading times, API response times, and user interactions
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private componentRenderTimes: Map<string, number[]> = new Map();

  /**
   * Start timing a specific operation
   */
  startTiming(name: string, metadata?: Record<string, any>): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
  }

  /**
   * End timing for a specific operation
   */
  endTiming(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric '${name}' not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;

    // Log slow operations (> 100ms)
    if (duration > 100) {
      console.warn(`🐌 Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metric.metadata);
    }

    return duration;
  }

  /**
   * Track component render time
   */
  trackComponentRender(componentName: string, renderTime: number): void {
    if (!this.componentRenderTimes.has(componentName)) {
      this.componentRenderTimes.set(componentName, []);
    }
    
    const times = this.componentRenderTimes.get(componentName)!;
    times.push(renderTime);
    
    // Keep only last 50 render times
    if (times.length > 50) {
      times.shift();
    }

    // Log if render time is concerning (> 50ms es realmente problemático)
    if (renderTime > 50) {
      console.warn(`🎨 Slow component render: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Track API call performance
   */
  trackAPICall(endpoint: string, method: string, duration: number, status: number): void {
    const metricName = `api_${method}_${endpoint}`;
    
    // Log API performance - Ajustar umbrales para reducir ruido
    // Solo loguear llamadas muy lentas o con errores
    if (duration > 5000) { // 5 segundos es realmente lento
      console.warn(`🌐 Slow API call: ${method} ${endpoint} took ${duration.toFixed(2)}ms (Status: ${status})`);
    } else if (status >= 400) { // Loguear errores independiente de la duración
      console.info(`🌐 API error: ${method} ${endpoint} - Status: ${status} (${duration.toFixed(2)}ms)`);
    }
    // No loguear llamadas normales (< 5s y status OK)

    // Store metric for analysis
    this.metrics.set(`${metricName}_${Date.now()}`, {
      name: metricName,
      startTime: 0,
      endTime: duration,
      duration,
      metadata: { endpoint, method, status }
    });
  }

  /**
   * Get performance summary for a component
   */
  getComponentStats(componentName: string): {
    averageRenderTime: number;
    maxRenderTime: number;
    minRenderTime: number;
    totalRenders: number;
  } | null {
    const times = this.componentRenderTimes.get(componentName);
    if (!times || times.length === 0) return null;

    return {
      averageRenderTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      maxRenderTime: Math.max(...times),
      minRenderTime: Math.min(...times),
      totalRenders: times.length
    };
  }

  /**
   * Get all current metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.componentRenderTimes.clear();
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    slowOperations: PerformanceMetric[];
    componentStats: Record<string, any>;
    totalMetrics: number;
  } {
    const allMetrics = this.getAllMetrics();
    const slowOperations = allMetrics.filter(m => m.duration && m.duration > 100);
    
    const componentStats: Record<string, any> = {};
    Array.from(this.componentRenderTimes.keys()).forEach(componentName => {
      componentStats[componentName] = this.getComponentStats(componentName);
    });

    return {
      slowOperations,
      componentStats,
      totalMetrics: allMetrics.length
    };
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for tracking component performance
 */
export const usePerformanceTracking = (componentName: string) => {
  const trackRender = (renderTime: number) => {
    performanceMonitor.trackComponentRender(componentName, renderTime);
  };

  const startOperation = (operationName: string, metadata?: Record<string, any>) => {
    performanceMonitor.startTiming(`${componentName}_${operationName}`, metadata);
  };

  const endOperation = (operationName: string) => {
    return performanceMonitor.endTiming(`${componentName}_${operationName}`);
  };

  return {
    trackRender,
    startOperation,
    endOperation
  };
};

/**
 * Decorator for timing functions
 */
export const timeFunction = (name: string) => {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      performanceMonitor.startTiming(name);
      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.endTiming(name);
        return result;
      } catch (error) {
        performanceMonitor.endTiming(name);
        throw error;
      }
    };

    return descriptor;
  };
};

/**
 * Log performance report to console (development only)
 */
export const logPerformanceReport = () => {
  if (process.env.NODE_ENV !== 'development') return;

  const report = performanceMonitor.getPerformanceReport();
  
  console.group('📊 Performance Report');

  if (report.slowOperations.length > 0) {
    console.group('🐌 Slow Operations (>100ms)');
    report.slowOperations.forEach(op => {
      console.log(`${op.operation}: ${op.duration}ms`, op.metadata);
    });
    console.groupEnd();
  }

  if (Object.keys(report.componentStats).length > 0) {
    console.group('🎨 Component Performance');
    Object.entries(report.componentStats).forEach(([component, stats]: [string, any]) => {
      if (stats && stats.avgRenderTime !== undefined && stats.maxRenderTime !== undefined) {
        console.log(`${component}:`, {
          avg: `${stats.avgRenderTime.toFixed(2)}ms`,
          max: `${stats.maxRenderTime.toFixed(2)}ms`,
          renders: stats.totalRenders
        });
      }
    });
    console.groupEnd();
  }
  
  console.groupEnd();
};

// Automatically log performance report every 30 seconds in development
// Temporarily disabled to prevent errors
// if (process.env.NODE_ENV === 'development') {
//   setInterval(logPerformanceReport, 30000);
// }
/* Cache busted: 2025-08-06T04:42:27.079Z - PERFORMANCE_MONITOR */
