/**
 * Configuración de Setup para Tests de Integración
 * Configura el entorno de testing para pruebas de integración
 * Incluye mocks globales, configuraciones y utilidades
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from '../__mocks__/server';

// Configurar React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 10000, // 10 segundos para tests de integración
  computedStyleSupportsPseudoElements: false
});

// =====================================================================
// CONFIGURACIÓN GLOBAL DE MOCKS
// =====================================================================

// Mock de localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock de sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Mock de window.location
delete (window as any).location;
window.location = {
  ...window.location,
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: ''
} as any;

// Mock de window.history
Object.defineProperty(window, 'history', {
  value: {
    pushState: jest.fn(),
    replaceState: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    go: jest.fn(),
    length: 1,
    state: null
  },
  writable: true
});

// Mock de console para tests más limpios
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Restaurar console en modo debug
if (process.env.DEBUG_TESTS === 'true') {
  global.console = originalConsole;
}

// =====================================================================
// CONFIGURACIÓN DE APIS DEL NAVEGADOR
// =====================================================================

// Mock de MediaDevices API
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
      getVideoTracks: () => [{ getSettings: () => ({ width: 640, height: 480 }) }],
      getAudioTracks: () => [{ stop: jest.fn() }]
    }),
    enumerateDevices: jest.fn().mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Front Camera' },
      { deviceId: 'microphone1', kind: 'audioinput', label: 'Default Microphone' }
    ]),
    getDisplayMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    })
  }
});

// Mock de Geolocation API
Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: {
    getCurrentPosition: jest.fn().mockImplementation((success) => {
      success({
        coords: {
          latitude: 4.5709,
          longitude: -74.2973,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      });
    }),
    watchPosition: jest.fn(),
    clearWatch: jest.fn()
  }
});

// Mock de MediaRecorder
global.MediaRecorder = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  state: 'inactive',
  ondataavailable: null,
  onstop: null,
  onerror: null,
  onstart: null,
  onpause: null,
  onresume: null
})) as any;

(MediaRecorder as any).isTypeSupported = jest.fn().mockReturnValue(true);

// Mock de IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: []
}));

// Mock de ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock de MutationObserver
global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn().mockReturnValue([])
}));

// =====================================================================
// CONFIGURACIÓN DE CANVAS Y GRÁFICOS
// =====================================================================

// Mock de HTMLCanvasElement
const mockCanvas = {
  getContext: jest.fn(() => ({
    fillStyle: '',
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    strokeStyle: '',
    lineWidth: 1,
    clearRect: jest.fn(),
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1
    })),
    putImageData: jest.fn(),
    createImageData: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    measureText: jest.fn(() => ({ width: 100 })),
    font: '12px Arial'
  })),
  toDataURL: jest.fn(() => 'data:image/png;base64,mock-canvas-data'),
  toBlob: jest.fn((callback) => {
    callback(new Blob(['mock-canvas-blob'], { type: 'image/png' }));
  }),
  width: 640,
  height: 480
};

HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
HTMLCanvasElement.prototype.toDataURL = mockCanvas.toDataURL;
HTMLCanvasElement.prototype.toBlob = mockCanvas.toBlob;

// =====================================================================
// CONFIGURACIÓN DE FILE API
// =====================================================================

// Mock de FileReader
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsDataURL: jest.fn(function(this: any) {
    setTimeout(() => {
      this.result = 'data:image/png;base64,mock-file-data';
      this.onload?.({ target: this });
    }, 100);
  }),
  readAsArrayBuffer: jest.fn(function(this: any) {
    setTimeout(() => {
      this.result = new ArrayBuffer(8);
      this.onload?.({ target: this });
    }, 100);
  }),
  readAsText: jest.fn(function(this: any) {
    setTimeout(() => {
      this.result = 'mock-text-content';
      this.onload?.({ target: this });
    }, 100);
  }),
  abort: jest.fn(),
  result: null,
  error: null,
  readyState: 0,
  onload: null,
  onerror: null,
  onabort: null,
  onloadstart: null,
  onloadend: null,
  onprogress: null
})) as any;

// Mock de File y Blob
global.File = jest.fn().mockImplementation((chunks, filename, options) => ({
  name: filename,
  size: chunks.reduce((size: number, chunk: any) => size + (chunk.length || 0), 0),
  type: options?.type || '',
  lastModified: Date.now(),
  stream: jest.fn(),
  text: jest.fn().mockResolvedValue('mock-file-content'),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
  slice: jest.fn()
})) as any;

// Mock de URL API
global.URL.createObjectURL = jest.fn(() => 'blob:mock-object-url-' + Math.random());
global.URL.revokeObjectURL = jest.fn();

// =====================================================================
// CONFIGURACIÓN DE PERFORMANCE API
// =====================================================================

// Mock de Performance API
global.performance.mark = jest.fn();
global.performance.measure = jest.fn();
global.performance.getEntriesByName = jest.fn(() => []);
global.performance.getEntriesByType = jest.fn(() => []);
global.performance.clearMarks = jest.fn();
global.performance.clearMeasures = jest.fn();

// Mock de memory info si está disponible
if ('memory' in performance) {
  (performance as any).memory = {
    usedJSHeapSize: 10000000,
    totalJSHeapSize: 50000000,
    jsHeapSizeLimit: 100000000
  };
}

// =====================================================================
// CONFIGURACIÓN DE MSW (Mock Service Worker)
// =====================================================================

// Configurar MSW para tests de integración
beforeAll(() => {
  // Iniciar servidor de mocks
  server.listen({
    onUnhandledRequest: 'warn'
  });
});

afterEach(() => {
  // Resetear handlers después de cada test
  server.resetHandlers();
  
  // Limpiar localStorage
  localStorageMock.clear();
  
  // Limpiar mocks
  jest.clearAllMocks();
});

afterAll(() => {
  // Cerrar servidor de mocks
  server.close();
  
  // Restaurar console
  global.console = originalConsole;
});

// =====================================================================
// CONFIGURACIÓN DE TIMEOUTS Y TIMERS
// =====================================================================

// Configurar timeouts para tests de integración
jest.setTimeout(30000); // 30 segundos para tests de integración

// Mock de timers para control de tiempo en tests
beforeEach(() => {
  jest.useFakeTimers({
    advanceTimers: false,
    doNotFake: ['performance', 'Date']
  });
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// =====================================================================
// UTILIDADES GLOBALES PARA TESTS
// =====================================================================

// Función para esperar por condiciones asíncronas
global.waitForCondition = async (condition: () => boolean, timeout = 5000) => {
  const startTime = Date.now();
  
  while (!condition() && (Date.now() - startTime) < timeout) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  if (!condition()) {
    throw new Error(`Condition not met within ${timeout}ms`);
  }
};

// Función para simular delays
global.simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Función para crear mock events
global.createMockEvent = (type: string, properties: any = {}) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, properties);
  return event;
};

// Función para limpiar todos los mocks
global.cleanupAllMocks = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  jest.restoreAllMocks();
  localStorageMock.clear();
};

// =====================================================================
// CONFIGURACIÓN DE ERROR HANDLING
// =====================================================================

// Capturar errores no manejados en tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Mock de error reporting
global.reportError = jest.fn();

// Configurar error boundaries para tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

// =====================================================================
// CONFIGURACIÓN DE TYPESCRIPT
// =====================================================================

// Declaraciones de tipos globales para utilidades de test
declare global {
  var waitForCondition: (condition: () => boolean, timeout?: number) => Promise<void>;
  var simulateDelay: (ms: number) => Promise<void>;
  var createMockEvent: (type: string, properties?: any) => Event;
  var cleanupAllMocks: () => void;
  var reportError: jest.Mock;
  
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// =====================================================================
// CONFIGURACIÓN FINAL
// =====================================================================

console.log('✅ Integration test setup completed');
console.log(`📊 Jest timeout: ${(jest as any).getTimeout?.() || 'default'}ms`);
console.log(`🔧 Debug mode: ${process.env.DEBUG_TESTS === 'true' ? 'enabled' : 'disabled'}`);

export {};