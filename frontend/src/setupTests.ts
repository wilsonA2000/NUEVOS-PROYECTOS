import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
// import { server } from './__mocks__/server';

// Mock API service
jest.mock('./services/api', () => require('./__mocks__/api'));

// Mock environment variables
(global as any).import = {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:8001/api/v1',
      VITE_MAPBOX_TOKEN: 'test-token',
      VITE_DEFAULT_COUNTRY: 'CO',
      VITE_DEFAULT_LAT: '4.5709',
      VITE_DEFAULT_LNG: '-74.2973',
      VITE_DEFAULT_ZOOM: '6'
    }
  }
};

// Configure testing-library
configure({
  testIdAttribute: 'data-testid',
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// beforeAll(() => server.listen());
// afterEach(() => server.resetHandlers());
// afterAll(() => server.close()); 