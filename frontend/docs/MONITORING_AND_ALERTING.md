# VeriHome Monitoring and Alerting Configuration

**Version**: 1.0.0  
**Last Updated**: 2024-01-01  
**Environment**: Production, Staging, Development

## Table of Contents

1. [Overview](#overview)
2. [Monitoring Stack](#monitoring-stack)
3. [Application Monitoring](#application-monitoring)
4. [Infrastructure Monitoring](#infrastructure-monitoring)
5. [Business Metrics Monitoring](#business-metrics-monitoring)
6. [Alerting Configuration](#alerting-configuration)
7. [Dashboard Configuration](#dashboard-configuration)
8. [Log Management](#log-management)
9. [Performance Monitoring](#performance-monitoring)
10. [Security Monitoring](#security-monitoring)
11. [Runbooks and Procedures](#runbooks-and-procedures)

---

## Overview

This document outlines the comprehensive monitoring and alerting strategy for VeriHome, ensuring system reliability, performance optimization, and proactive issue detection.

### Monitoring Objectives
- **Availability**: 99.9% uptime target
- **Performance**: Page load times < 2 seconds
- **Error Rate**: < 0.1% error rate
- **Response Time**: API responses < 500ms
- **User Experience**: Real user monitoring (RUM)
- **Business Metrics**: Key performance indicators (KPIs)

### Key Stakeholders
- **DevOps Team**: Infrastructure and system monitoring
- **Development Team**: Application performance and errors
- **Product Team**: User experience and business metrics
- **Support Team**: User-facing issues and customer impact
- **Business Team**: Revenue and conversion metrics

---

## Monitoring Stack

### Core Monitoring Tools

```yaml
monitoring_stack:
  application_monitoring:
    - tool: "Sentry"
      purpose: "Error tracking and performance monitoring"
      retention: "90 days"
    
    - tool: "Google Analytics 4"
      purpose: "User behavior and conversion tracking"
      retention: "14 months"
    
    - tool: "Hotjar"
      purpose: "User experience and session recordings"
      retention: "12 months"

  infrastructure_monitoring:
    - tool: "Prometheus + Grafana"
      purpose: "Metrics collection and visualization"
      retention: "30 days"
    
    - tool: "Uptime Robot"
      purpose: "External uptime monitoring"
      retention: "6 months"
    
    - tool: "AWS CloudWatch"
      purpose: "AWS services monitoring"
      retention: "15 months"

  log_management:
    - tool: "ELK Stack (Elasticsearch, Logstash, Kibana)"
      purpose: "Centralized logging and analysis"
      retention: "30 days"
    
    - tool: "Winston.js"
      purpose: "Application logging"
      format: "JSON structured logs"

  alerting:
    - tool: "PagerDuty"
      purpose: "Incident management and escalation"
      integration: "All monitoring tools"
    
    - tool: "Slack"
      purpose: "Team notifications"
      channels: "#alerts, #monitoring, #incidents"
```

---

## Application Monitoring

### Frontend Application Monitoring

#### Sentry Configuration
```typescript
// src/lib/monitoring.ts
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new BrowserTracing({
      routingInstrumentation: Sentry.reactRouterV6Instrumentation(
        React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes
      ),
    }),
  ],
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  beforeSend(event) {
    // Filter out non-critical errors
    if (event.level === "warning") return null;
    
    // Remove sensitive data
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    
    return event;
  },
});

// Performance monitoring
export const performanceMonitor = {
  startTransaction: (name: string) => {
    return Sentry.startTransaction({ name });
  },
  
  measurePageLoad: () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    Sentry.addBreadcrumb({
      category: 'performance',
      data: {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstContentfulPaint: navigation.loadEventEnd - navigation.fetchStart,
      },
      level: 'info',
    });
  },
  
  trackApiCall: (endpoint: string, duration: number, status: number) => {
    Sentry.addBreadcrumb({
      category: 'api',
      data: { endpoint, duration, status },
      level: status >= 400 ? 'error' : 'info',
    });
  },
};
```

#### Custom Metrics Collection
```typescript
// src/utils/metricsCollector.ts
interface CustomMetric {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
}

class MetricsCollector {
  private metrics: CustomMetric[] = [];
  private flushInterval = 30000; // 30 seconds

  constructor() {
    this.startFlushTimer();
  }

  record(name: string, value: number, tags: Record<string, string> = {}) {
    this.metrics.push({
      name,
      value,
      tags: {
        ...tags,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.VITE_APP_VERSION || '1.0.0',
      },
      timestamp: new Date(),
    });
  }

  // Track user interactions
  trackUserAction(action: string, component: string, additionalData?: any) {
    this.record('user_action', 1, {
      action,
      component,
      ...additionalData,
    });
  }

  // Track business events
  trackBusinessEvent(event: string, value?: number, metadata?: any) {
    this.record('business_event', value || 1, {
      event,
      ...metadata,
    });
  }

  // Track performance metrics
  trackPerformance(metric: string, duration: number, route?: string) {
    this.record('performance', duration, {
      metric,
      route: route || window.location.pathname,
    });
  }

  private async flush() {
    if (this.metrics.length === 0) return;

    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: this.metrics }),
      });
      
      this.metrics = [];
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  private startFlushTimer() {
    setInterval(() => this.flush(), this.flushInterval);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
  }
}

export const metricsCollector = new MetricsCollector();
```

### User Experience Monitoring

#### Real User Monitoring (RUM)
```typescript
// src/utils/rumMonitoring.ts
interface PerformanceMetrics {
  pageLoadTime: number;
  timeToFirstByte: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

class RUMMonitoring {
  collectPerformanceMetrics(): PerformanceMetrics {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    return {
      pageLoadTime: navigation.loadEventEnd - navigation.loadEventStart,
      timeToFirstByte: navigation.responseStart - navigation.requestStart,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      largestContentfulPaint: 0, // Requires Largest Contentful Paint API
      cumulativeLayoutShift: 0, // Requires Layout Instability API
      firstInputDelay: 0, // Requires First Input Delay API
    };
  }

  trackUserJourney() {
    const events: Array<{event: string, timestamp: number, url: string}> = [];
    
    // Track page views
    const trackPageView = () => {
      events.push({
        event: 'page_view',
        timestamp: Date.now(),
        url: window.location.href,
      });
    };

    // Track clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      events.push({
        event: 'click',
        timestamp: Date.now(),
        url: window.location.href,
      });
    });

    // Track form submissions
    document.addEventListener('submit', (e) => {
      events.push({
        event: 'form_submit',
        timestamp: Date.now(),
        url: window.location.href,
      });
    });

    window.addEventListener('beforeunload', () => {
      // Send user journey data
      navigator.sendBeacon('/api/user-journey', JSON.stringify(events));
    });
  }
}

export const rumMonitoring = new RUMMonitoring();
```

---

## Infrastructure Monitoring

### Docker Container Monitoring

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: cadvisor
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro

volumes:
  prometheus_data:
  grafana_data:
```

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'verihome-frontend'
    static_configs:
      - targets: ['frontend:80']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'verihome-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

---

## Business Metrics Monitoring

### Key Performance Indicators (KPIs)

```typescript
// src/analytics/businessMetrics.ts
interface BusinessMetrics {
  // User acquisition
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  newRegistrations: number;
  registrationConversionRate: number;

  // Property metrics
  propertiesListed: number;
  propertiesViewed: number;
  applicationsSubmitted: number;
  contractsSigned: number;

  // Financial metrics
  revenue: number;
  averageRent: number;
  paymentSuccessRate: number;
  churnRate: number;

  // Engagement metrics
  averageSessionDuration: number;
  pageViewsPerSession: number;
  bounceRate: number;
  returnUserRate: number;
}

class BusinessMetricsTracker {
  private analytics: any; // Google Analytics or similar

  trackUserRegistration(userType: 'tenant' | 'owner' | 'service_provider') {
    this.analytics.track('User Registration', {
      userType,
      timestamp: new Date(),
      source: document.referrer,
    });

    // Custom metric for internal tracking
    metricsCollector.trackBusinessEvent('user_registration', 1, { userType });
  }

  trackPropertyListing(propertyData: any) {
    this.analytics.track('Property Listed', {
      propertyType: propertyData.type,
      price: propertyData.price,
      location: propertyData.city,
    });

    metricsCollector.trackBusinessEvent('property_listed', 1, {
      type: propertyData.type,
      priceRange: this.getPriceRange(propertyData.price),
    });
  }

  trackApplicationSubmission(applicationData: any) {
    this.analytics.track('Application Submitted', {
      propertyId: applicationData.propertyId,
      applicantType: applicationData.userType,
    });

    metricsCollector.trackBusinessEvent('application_submitted', 1);
  }

  trackPayment(paymentData: any) {
    this.analytics.track('Payment Processed', {
      amount: paymentData.amount,
      paymentMethod: paymentData.method,
      success: paymentData.status === 'completed',
    });

    metricsCollector.trackBusinessEvent('payment_processed', paymentData.amount, {
      method: paymentData.method,
      status: paymentData.status,
    });
  }

  trackUserEngagement(event: string, metadata?: any) {
    this.analytics.track(event, {
      ...metadata,
      timestamp: new Date(),
      url: window.location.href,
    });
  }

  private getPriceRange(price: number): string {
    if (price < 1000) return 'under_1000';
    if (price < 2000) return '1000_2000';
    if (price < 3000) return '2000_3000';
    if (price < 5000) return '3000_5000';
    return 'over_5000';
  }
}

export const businessMetrics = new BusinessMetricsTracker();
```

---

## Alerting Configuration

### Alert Rules

```yaml
# alerts.yml
groups:
  - name: verihome_frontend_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}% for the last 5 minutes"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: LowAvailability
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "Service {{ $labels.instance }} has been down for more than 1 minute"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 90%"

      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is above 80%"

      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space"
          description: "Disk space is below 10%"

  - name: business_metric_alerts
    rules:
      - alert: LowUserRegistrations
        expr: increase(user_registrations_total[1h]) < 5
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Low user registration rate"
          description: "Only {{ $value }} users registered in the last hour"

      - alert: HighPaymentFailureRate
        expr: rate(payment_failures_total[5m]) / rate(payment_attempts_total[5m]) > 0.1
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "High payment failure rate"
          description: "Payment failure rate is {{ $value }}%"
```

### PagerDuty Integration

```yaml
# alertmanager.yml
global:
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
    - match:
        severity: warning
      receiver: 'slack-warnings'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://127.0.0.1:5001/'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        description: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

  - name: 'slack-warnings'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: 'VeriHome Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

### Notification Channels

```typescript
// src/monitoring/notifications.ts
interface Alert {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  metadata?: any;
  timestamp: Date;
}

class AlertNotificationService {
  async sendAlert(alert: Alert) {
    const channels = this.getNotificationChannels(alert.severity);
    
    await Promise.all(
      channels.map(channel => this.sendToChannel(channel, alert))
    );
  }

  private getNotificationChannels(severity: Alert['severity']) {
    const channels = [];
    
    switch (severity) {
      case 'critical':
        channels.push('pagerduty', 'slack', 'email');
        break;
      case 'warning':
        channels.push('slack', 'email');
        break;
      case 'info':
        channels.push('slack');
        break;
    }
    
    return channels;
  }

  private async sendToChannel(channel: string, alert: Alert) {
    switch (channel) {
      case 'slack':
        await this.sendSlackNotification(alert);
        break;
      case 'email':
        await this.sendEmailNotification(alert);
        break;
      case 'pagerduty':
        await this.sendPagerDutyAlert(alert);
        break;
    }
  }

  private async sendSlackNotification(alert: Alert) {
    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) return;

    const color = {
      critical: 'danger',
      warning: 'warning',
      info: 'good'
    }[alert.severity];

    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color,
          title: `VeriHome ${alert.severity.toUpperCase()} Alert`,
          text: alert.message,
          timestamp: alert.timestamp.getTime() / 1000,
          fields: Object.entries(alert.metadata || {}).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true,
          })),
        }],
      }),
    });
  }

  private async sendEmailNotification(alert: Alert) {
    // Email notification implementation
  }

  private async sendPagerDutyAlert(alert: Alert) {
    // PagerDuty integration implementation
  }
}

export const alertService = new AlertNotificationService();
```

---

## Dashboard Configuration

### Grafana Dashboards

#### Application Performance Dashboard
```json
{
  "dashboard": {
    "title": "VeriHome Application Performance",
    "panels": [
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{ method }} {{ route }}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"4..\"}[5m])",
            "legendFormat": "4xx errors"
          },
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      }
    ]
  }
}
```

#### Business Metrics Dashboard
```json
{
  "dashboard": {
    "title": "VeriHome Business Metrics",
    "panels": [
      {
        "title": "User Registrations",
        "type": "stat",
        "targets": [
          {
            "expr": "increase(user_registrations_total[24h])",
            "legendFormat": "Daily Registrations"
          }
        ]
      },
      {
        "title": "Properties Listed",
        "type": "graph",
        "targets": [
          {
            "expr": "increase(properties_listed_total[1h])",
            "legendFormat": "Properties/hour"
          }
        ]
      },
      {
        "title": "Revenue",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(payment_amount_total)",
            "legendFormat": "Total Revenue"
          }
        ]
      }
    ]
  }
}
```

---

## Log Management

### Centralized Logging Setup

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.14.0
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:7.14.0
    container_name: logstash
    volumes:
      - ./logstash/config:/usr/share/logstash/pipeline
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:7.14.0
    container_name: kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

  filebeat:
    image: docker.elastic.co/beats/filebeat:7.14.0
    container_name: filebeat
    volumes:
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    depends_on:
      - logstash

volumes:
  es_data:
```

### Application Logging

```typescript
// src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'verihome-frontend',
    environment: process.env.NODE_ENV,
    version: process.env.VITE_APP_VERSION,
  },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Structured logging helpers
export const log = {
  info: (message: string, metadata?: any) => logger.info(message, metadata),
  warn: (message: string, metadata?: any) => logger.warn(message, metadata),
  error: (message: string, error?: Error, metadata?: any) => {
    logger.error(message, { error: error?.stack, ...metadata });
  },
  debug: (message: string, metadata?: any) => logger.debug(message, metadata),
  
  // Business event logging
  business: (event: string, data?: any) => {
    logger.info('Business Event', { 
      event, 
      data, 
      category: 'business' 
    });
  },
  
  // Performance logging
  performance: (metric: string, value: number, metadata?: any) => {
    logger.info('Performance Metric', { 
      metric, 
      value, 
      ...metadata, 
      category: 'performance' 
    });
  },
  
  // Security logging
  security: (event: string, data?: any) => {
    logger.warn('Security Event', { 
      event, 
      data, 
      category: 'security' 
    });
  },
};
```

---

## Performance Monitoring

### Web Vitals Tracking

```typescript
// src/utils/webVitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

interface VitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

class WebVitalsMonitor {
  constructor() {
    this.initializeVitalsTracking();
  }

  private initializeVitalsTracking() {
    const sendToAnalytics = (metric: VitalMetric) => {
      // Send to Google Analytics
      if (window.gtag) {
        window.gtag('event', metric.name, {
          value: Math.round(metric.value),
          metric_rating: metric.rating,
          metric_delta: metric.delta,
        });
      }

      // Send to custom analytics
      metricsCollector.trackPerformance(metric.name, metric.value);
      
      // Log for debugging
      log.performance(`Web Vital: ${metric.name}`, {
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
      });
    };

    getCLS(sendToAnalytics);
    getFID(sendToAnalytics);
    getFCP(sendToAnalytics);
    getLCP(sendToAnalytics);
    getTTFB(sendToAnalytics);
  }

  trackCustomPerformance() {
    // Track bundle size impact
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      log.performance('Network Information', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      });
    }

    // Track memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      log.performance('Memory Usage', {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      });
    }
  }
}

export const webVitalsMonitor = new WebVitalsMonitor();
```

---

## Security Monitoring

### Security Event Tracking

```typescript
// src/security/monitoring.ts
interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  metadata?: any;
}

class SecurityMonitor {
  trackSecurityEvent(event: SecurityEvent) {
    // Log security event
    log.security(`Security Event: ${event.type}`, {
      severity: event.severity,
      description: event.description,
      userAgent: event.userAgent,
      userId: event.userId,
      metadata: event.metadata,
    });

    // Send to SIEM if critical
    if (event.severity === 'critical') {
      this.alertSecurityTeam(event);
    }

    // Track in metrics
    metricsCollector.record('security_event', 1, {
      type: event.type,
      severity: event.severity,
    });
  }

  monitorLoginAttempts() {
    // Track failed login attempts
    document.addEventListener('login_failed', (e: any) => {
      this.trackSecurityEvent({
        type: 'failed_login',
        severity: 'medium',
        description: 'Failed login attempt',
        userAgent: navigator.userAgent,
        metadata: { email: e.detail.email },
      });
    });

    // Track successful logins
    document.addEventListener('login_success', () => {
      this.trackSecurityEvent({
        type: 'successful_login',
        severity: 'low',
        description: 'Successful login',
        userAgent: navigator.userAgent,
      });
    });
  }

  monitorSuspiciousActivity() {
    // Monitor rapid form submissions
    let formSubmissions = 0;
    const resetCounter = () => { formSubmissions = 0; };
    
    document.addEventListener('submit', () => {
      formSubmissions++;
      if (formSubmissions > 10) {
        this.trackSecurityEvent({
          type: 'rapid_form_submission',
          severity: 'high',
          description: 'Rapid form submissions detected',
          metadata: { count: formSubmissions },
        });
      }
    });

    setInterval(resetCounter, 60000); // Reset every minute
  }

  private async alertSecurityTeam(event: SecurityEvent) {
    await alertService.sendAlert({
      severity: 'critical',
      message: `Security Alert: ${event.type} - ${event.description}`,
      metadata: event,
      timestamp: new Date(),
    });
  }
}

export const securityMonitor = new SecurityMonitor();
```

---

## Runbooks and Procedures

### Incident Response Procedures

#### High Error Rate Response
```markdown
## High Error Rate Incident Response

### Immediate Actions (0-5 minutes)
1. Acknowledge alert in PagerDuty
2. Check Grafana dashboard for affected components
3. Review recent deployments in #deployments channel
4. Check service status page for upstream dependencies

### Investigation (5-15 minutes)
1. Review error logs in Kibana
2. Check database performance metrics
3. Verify third-party service status (Stripe, SendGrid, etc.)
4. Review application logs for error patterns

### Mitigation Steps
1. If deployment-related: Rollback to previous version
2. If database-related: Scale database resources
3. If third-party related: Enable fallback mechanisms
4. If traffic-related: Enable auto-scaling

### Communication
1. Update #incidents channel with status
2. Create status page incident if user-facing
3. Notify stakeholders via predetermined escalation matrix
4. Post resolution summary in #incidents
```

#### Service Outage Response
```markdown
## Service Outage Response

### Critical Steps (0-2 minutes)
1. Verify outage scope using external monitoring
2. Check infrastructure status (AWS, CDN, DNS)
3. Attempt service restart if safe to do so
4. Escalate to infrastructure team if needed

### Recovery Actions
1. Identify root cause from monitoring data
2. Implement fix or workaround
3. Verify service restoration
4. Monitor for 30 minutes post-recovery

### Post-Incident
1. Conduct incident review within 24 hours
2. Document lessons learned
3. Create action items for prevention
4. Update runbooks if needed
```

### Monitoring Maintenance

#### Daily Monitoring Checklist
- [ ] Review overnight alerts and incidents
- [ ] Check dashboard for anomalies
- [ ] Verify backup completion status
- [ ] Review performance trends
- [ ] Check SSL certificate expiration dates
- [ ] Verify external service integrations

#### Weekly Monitoring Tasks
- [ ] Review and tune alert thresholds
- [ ] Clean up old logs and metrics
- [ ] Update monitoring documentation
- [ ] Test backup restoration procedures
- [ ] Review incident patterns and trends
- [ ] Update on-call schedules

#### Monthly Monitoring Review
- [ ] Analyze monitoring cost and optimization
- [ ] Review monitoring tool effectiveness
- [ ] Update business metrics tracking
- [ ] Conduct monitoring infrastructure health check
- [ ] Review and update runbooks
- [ ] Training for new team members

---

## Configuration Files

### Environment-Specific Monitoring

```bash
# Production environment variables
MONITORING_ENABLED=true
SENTRY_DSN=https://your-sentry-dsn
SENTRY_ENVIRONMENT=production
GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
LOG_LEVEL=info
METRICS_ENDPOINT=https://metrics.verihome.com
ALERTS_WEBHOOK=https://hooks.slack.com/your-webhook
PAGERDUTY_SERVICE_KEY=your-pagerduty-key
```

### Monitoring Scripts

```bash
#!/bin/bash
# scripts/health-check.sh

# Basic health check script
check_frontend() {
    curl -f http://localhost:3000/health || exit 1
}

check_metrics() {
    curl -f http://localhost:9090/api/v1/query?query=up || exit 1
}

check_logs() {
    [ -f /var/log/verihome/error.log ] || exit 1
}

# Run all checks
check_frontend
check_metrics  
check_logs

echo "All health checks passed"
```

---

**Monitoring Configuration Status**: ✅ **Ready for Production**

**Next Steps**:
1. Deploy monitoring stack to production
2. Configure alert thresholds based on baseline metrics
3. Train team on monitoring tools and procedures
4. Conduct incident response drills

**Document Owner**: DevOps Team  
**Last Updated**: 2024-01-01  
**Next Review**: 2024-02-01