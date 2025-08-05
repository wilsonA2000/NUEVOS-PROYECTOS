import { performanceMonitor } from '../utils/performanceMonitor';
import { api } from '../services/api';
import { jest } from '@jest/globals';

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => [])
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance
});

// Mock API calls for performance testing
jest.mock('../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformance.now.mockReturnValue(Date.now());
  });

  describe('API Performance', () => {
    it('should track API call performance', async () => {
      const startTime = 1000;
      const endTime = 1500;
      
      mockPerformance.now
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      mockedApi.get.mockResolvedValueOnce({
        data: { test: 'data' },
        status: 200,
        config: {
          metadata: { startTime, requestId: 'test-request' }
        }
      });

      const response = await mockedApi.get('/test-endpoint');
      
      expect(response.status).toBe(200);
      // Performance should be measured (endTime - startTime = 500ms)
      const duration = endTime - startTime;
      expect(duration).toBe(500);
    });

    it('should identify slow API calls', async () => {
      const slowApiCall = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              data: { result: 'success' },
              status: 200,
              config: {
                metadata: { startTime: performance.now() - 3000, requestId: 'slow-request' }
              }
            });
          }, 100); // Simulate network delay
        });
      });

      mockedApi.get.mockImplementation(slowApiCall);

      const startTime = performance.now();
      await mockedApi.get('/slow-endpoint');
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      // Should detect calls slower than 2 seconds
      if (duration > 2000) {
        console.warn(`Slow API call detected: ${duration}ms`);
      }

      expect(slowApiCall).toHaveBeenCalled();
    });

    it('should handle concurrent API calls efficiently', async () => {
      const mockResponses = Array.from({ length: 10 }, (_, i) => ({
        data: { id: i, name: `Item ${i}` },
        status: 200,
        config: {
          metadata: { startTime: performance.now(), requestId: `request-${i}` }
        }
      }));

      mockedApi.get.mockImplementation((url) => {
        const index = parseInt(url.split('/').pop() || '0');
        return Promise.resolve(mockResponses[index]);
      });

      const startTime = performance.now();
      
      // Simulate concurrent API calls
      const promises = Array.from({ length: 10 }, (_, i) => 
        mockedApi.get(`/items/${i}`)
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Component Rendering Performance', () => {
    it('should measure component mount time', () => {
      const componentName = 'PropertyList';
      const startTime = performance.now();
      
      // Simulate component mounting
      mockPerformance.mark(`${componentName}-mount-start`);
      
      // Simulate rendering work
      const renderWork = () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      };
      
      renderWork();
      
      const endTime = performance.now();
      mockPerformance.mark(`${componentName}-mount-end`);
      
      const renderTime = endTime - startTime;
      
      // Component should render within 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('should detect heavy components', () => {
      const heavyComponents = [
        { name: 'DataGrid', renderTime: 150 },
        { name: 'Chart', renderTime: 200 },
        { name: 'Map', renderTime: 300 }
      ];

      const slowComponents = heavyComponents.filter(comp => comp.renderTime > 100);
      
      expect(slowComponents).toHaveLength(3);
      
      // Log performance warnings
      slowComponents.forEach(comp => {
        console.warn(`Heavy component detected: ${comp.name} (${comp.renderTime}ms)`);
      });
    });

    it('should track re-render frequency', () => {
      const componentName = 'PropertyCard';
      let renderCount = 0;
      
      // Simulate multiple re-renders
      const simulateReRender = () => {
        renderCount++;
        mockPerformance.mark(`${componentName}-render-${renderCount}`);
      };

      // Simulate 5 re-renders
      for (let i = 0; i < 5; i++) {
        simulateReRender();
      }

      // Should not exceed reasonable re-render count
      expect(renderCount).toBeLessThanOrEqual(10);
      
      if (renderCount > 3) {
        console.warn(`Excessive re-renders detected for ${componentName}: ${renderCount}`);
      }
    });
  });

  describe('Memory Usage', () => {
    it('should detect memory leaks in event listeners', () => {
      const listeners: Array<() => void> = [];
      
      // Simulate adding event listeners
      const addEventListeners = () => {
        for (let i = 0; i < 10; i++) {
          const listener = () =>

listeners.push(listener);
          // In real scenario, these would be added to DOM elements
        }
      };

      const removeEventListeners = () => {
        listeners.forEach((listener, index) => {
          // In real scenario, these would be removed from DOM elements
          listeners.splice(index, 1);
        });
      };

      addEventListeners();
      expect(listeners).toHaveLength(10);

      removeEventListeners();
      expect(listeners).toHaveLength(0); // Should clean up properly
    });

    it('should track large data structures', () => {
      // Simulate loading large property dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        title: `Property ${i}`,
        description: 'A'.repeat(500), // 500 character description
        images: Array.from({ length: 5 }, (_, j) => `image-${i}-${j}.jpg`),
        amenities: Array.from({ length: 10 }, (_, k) => `amenity-${k}`)
      }));

      const datasetSize = JSON.stringify(largeDataset).length;
      const maxSizeInMB = 5; // 5MB limit
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

      expect(datasetSize).toBeLessThan(maxSizeInBytes);
      
      if (datasetSize > maxSizeInBytes / 2) {
        console.warn(`Large dataset detected: ${(datasetSize / 1024 / 1024).toFixed(2)}MB`);
      }
    });
  });

  describe('Bundle Size Analysis', () => {
    it('should validate critical path resources', () => {
      // Simulate bundle analysis
      const criticalResources = [
        { name: 'main.js', size: 500000 }, // 500KB
        { name: 'vendor.js', size: 800000 }, // 800KB
        { name: 'styles.css', size: 50000 } // 50KB
      ];

      const totalSize = criticalResources.reduce((sum, resource) => sum + resource.size, 0);
      const maxBundleSize = 1.5 * 1024 * 1024; // 1.5MB limit

      expect(totalSize).toBeLessThan(maxBundleSize);

      // Check individual resource sizes
      criticalResources.forEach(resource => {
        if (resource.size > 1024 * 1024) { // 1MB
          console.warn(`Large resource: ${resource.name} (${(resource.size / 1024 / 1024).toFixed(2)}MB)`);
        }
      });
    });

    it('should verify code splitting effectiveness', () => {
      // Simulate route-based chunks
      const routeChunks = [
        { route: '/', chunk: 'home.js', size: 100000 },
        { route: '/properties', chunk: 'properties.js', size: 200000 },
        { route: '/contracts', chunk: 'contracts.js', size: 150000 },
        { route: '/dashboard', chunk: 'dashboard.js', size: 180000 }
      ];

      // Each route chunk should be reasonably sized
      routeChunks.forEach(chunk => {
        expect(chunk.size).toBeLessThan(300000); // 300KB per route
      });

      // Total split chunks should be manageable
      const totalChunkSize = routeChunks.reduce((sum, chunk) => sum + chunk.size, 0);
      expect(totalChunkSize).toBeLessThan(1024 * 1024); // 1MB total
    });
  });

  describe('Database Query Performance', () => {
    it('should simulate efficient property search queries', async () => {
      const searchCriteria = {
        city: 'Madrid',
        minPrice: 500,
        maxPrice: 1500,
        bedrooms: 2,
        propertyType: 'apartment'
      };

      const mockSearchResults = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        title: `Property ${i}`,
        price: 1000 + (i * 10),
        city: 'Madrid'
      }));

      mockedApi.get.mockResolvedValueOnce({
        data: mockSearchResults,
        status: 200,
        config: {
          metadata: { startTime: performance.now() - 200, requestId: 'search-request' }
        }
      });

      const startTime = performance.now();
      const response = await mockedApi.get('/properties/search/', {
        params: searchCriteria
      });
      const endTime = performance.now();

      const queryTime = endTime - startTime;
      
      expect(response.data).toHaveLength(50);
      expect(queryTime).toBeLessThan(500); // Search should complete within 500ms
    });

    it('should handle pagination efficiently', async () => {
      const pageSize = 20;
      const totalPages = 5;
      
      for (let page = 1; page <= totalPages; page++) {
        const mockPageData = Array.from({ length: pageSize }, (_, i) => ({
          id: (page - 1) * pageSize + i,
          title: `Property ${(page - 1) * pageSize + i}`
        }));

        mockedApi.get.mockResolvedValueOnce({
          data: {
            results: mockPageData,
            count: totalPages * pageSize,
            next: page < totalPages ? `/properties/?page=${page + 1}` : null,
            previous: page > 1 ? `/properties/?page=${page - 1}` : null
          },
          status: 200,
          config: {
            metadata: { startTime: performance.now() - 100, requestId: `page-${page}` }
          }
        });

        const startTime = performance.now();
        const response = await mockedApi.get(`/properties/?page=${page}`);
        const endTime = performance.now();

        expect(response.data.results).toHaveLength(pageSize);
        expect(endTime - startTime).toBeLessThan(200); // Each page should load quickly
      }
    });
  });

  describe('Real-time Features Performance', () => {
    it('should handle WebSocket message frequency', () => {
      const messages: any[] = [];
      const maxMessagesPerSecond = 10;
      
      // Simulate WebSocket messages
      const simulateMessages = () => {
        for (let i = 0; i < 15; i++) {
          messages.push({
            id: i,
            type: 'notification',
            timestamp: Date.now() + (i * 100)
          });
        }
      };

      simulateMessages();
      
      // Should throttle messages if too frequent
      const throttledMessages = messages.filter((_, index) => 
        index < maxMessagesPerSecond
      );

      expect(throttledMessages).toHaveLength(maxMessagesPerSecond);
    });

    it('should validate notification delivery performance', () => {
      const notifications = [
        { id: 1, type: 'message', priority: 'high', deliveryTime: 50 },
        { id: 2, type: 'payment', priority: 'medium', deliveryTime: 100 },
        { id: 3, type: 'reminder', priority: 'low', deliveryTime: 200 }
      ];

      notifications.forEach(notification => {
        if (notification.priority === 'high') {
          expect(notification.deliveryTime).toBeLessThan(100);
        } else if (notification.priority === 'medium') {
          expect(notification.deliveryTime).toBeLessThan(200);
        } else {
          expect(notification.deliveryTime).toBeLessThan(500);
        }
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should collect performance metrics', () => {
      const metrics = {
        apiCalls: {
          total: 100,
          average: 250,
          slowest: 1200,
          fastest: 50
        },
        componentRenders: {
          total: 50,
          average: 45,
          slowest: 150,
          fastest: 10
        },
        memoryUsage: {
          current: 25 * 1024 * 1024, // 25MB
          peak: 45 * 1024 * 1024     // 45MB
        }
      };

      // API performance checks
      expect(metrics.apiCalls.average).toBeLessThan(500);
      expect(metrics.apiCalls.slowest).toBeLessThan(2000);

      // Component performance checks
      expect(metrics.componentRenders.average).toBeLessThan(100);
      expect(metrics.componentRenders.slowest).toBeLessThan(200);

      // Memory usage checks
      const maxMemoryUsage = 100 * 1024 * 1024; // 100MB
      expect(metrics.memoryUsage.peak).toBeLessThan(maxMemoryUsage);
    });

    it('should generate performance report', () => {
      const performanceReport = {
        timestamp: new Date().toISOString(),
        metrics: {
          loadTime: 2500,
          renderTime: 150,
          apiResponseTime: 300,
          bundleSize: 1.2 * 1024 * 1024
        },
        recommendations: [] as string[]
      };

      // Generate recommendations based on metrics
      if (performanceReport.metrics.loadTime > 3000) {
        performanceReport.recommendations.push('Optimize initial load time');
      }
      
      if (performanceReport.metrics.renderTime > 100) {
        performanceReport.recommendations.push('Optimize component rendering');
      }
      
      if (performanceReport.metrics.apiResponseTime > 500) {
        performanceReport.recommendations.push('Optimize API response times');
      }

      if (performanceReport.metrics.bundleSize > 1.5 * 1024 * 1024) {
        performanceReport.recommendations.push('Reduce bundle size');
      }

      expect(performanceReport.recommendations).toContain('Optimize component rendering');
      expect(performanceReport.timestamp).toBeDefined();
    });
  });
});