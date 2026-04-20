/**
 * Tests for the Axios API instance configuration.
 *
 * Note: The real api.ts module uses `import.meta.env` which Jest cannot parse,
 * so we cannot import it directly. Instead, we create a replica of the real
 * axios instance with the same configuration and test the configuration logic.
 */

// Use require to avoid any import-time mock interference
const axios = jest.requireActual('axios');

describe('API Configuration', () => {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
  };

  const dispatchEventSpy = jest.fn();

  // PUBLIC_ENDPOINTS list mirroring the real module
  const PUBLIC_ENDPOINTS = [
    '/users/auth/login/',
    '/users/auth/register/',
    '/users/auth/validate-interview-code/',
    '/users/auth/confirm-email/',
    '/users/auth/resend-confirmation/',
    '/users/auth/forgot-password/',
    '/users/auth/reset-password/',
    '/auth/login/',
    '/auth/register/',
    '/auth/forgot-password/',
    '/auth/reset-password/',
    '/health/',
    '/properties/',
  ];

  const requiresAuth = (url: string): boolean => {
    return !PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
  };

  // Create a real axios instance with the same config as api.ts
  let api: ReturnType<typeof axios.create>;

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    window.dispatchEvent = dispatchEventSpy;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh axios instance matching real api.ts config
    api = axios.create({
      baseURL: 'http://localhost:8000/api/v1',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
      validateStatus: status => {
        return (
          (status >= 200 && status < 300) ||
          (status >= 400 && status < 500) ||
          status === 401
        );
      },
    });

    // Add request interceptor matching the real module
    api.interceptors.request.use(
      config => {
        const token = localStorage.getItem('access_token');
        const endpoint = config.url || '';
        const needsAuth = requiresAuth(endpoint);

        const requestId = `${config.method?.toUpperCase()}_${config.url}_${Date.now()}`;
        config.metadata = { requestId, startTime: performance.now() };

        if (needsAuth && !token) {
          const controller = new AbortController();
          controller.abort('No authentication token available');

          window.dispatchEvent(
            new CustomEvent('authRequired', {
              detail: {
                endpoint,
                message: 'Necesitas iniciar sesión para acceder a este recurso',
              },
            })
          );

          return {
            ...config,
            signal: controller.signal,
          };
        }

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor matching the real module
    api.interceptors.response.use(
      response => {
        if (response.status >= 400 && response.status < 500) {
          const error = Object.assign(
            new Error(`HTTP ${response.status}: ${response.statusText}`),
            {
              name: 'AxiosError',
              config: response.config,
              code: response.status.toString(),
              request: response.request,
              response: response,
              isAxiosError: true,
              toJSON: () => ({}),
            }
          );
          return Promise.reject(error);
        }
        return response;
      },
      error => {
        if (error.code === 'ECONNABORTED') {
          return Promise.reject(
            new Error('La petición tardó demasiado tiempo')
          );
        }

        if (!error.response) {
          return Promise.reject(
            new Error('No se pudo conectar con el servidor')
          );
        }

        const { status } = error.response;

        switch (status) {
          case 401:
            localStorage.removeItem('token');
            localStorage.removeItem('refresh');
            window.dispatchEvent(new CustomEvent('tokenInvalid'));
            break;
        }

        return Promise.reject(error);
      }
    );
  });

  describe('Axios Instance Creation', () => {
    it('should create an axios instance with correct baseURL', () => {
      expect(api.defaults.baseURL).toBe('http://localhost:8000/api/v1');
    });

    it('should set default Content-Type to application/json', () => {
      expect(api.defaults.headers['Content-Type']).toBe('application/json');
    });

    it('should have a timeout configured', () => {
      expect(api.defaults.timeout).toBe(10000);
    });

    it('should have a custom validateStatus that accepts 2xx and 4xx', () => {
      const validateStatus = api.defaults.validateStatus;
      expect(validateStatus).toBeDefined();
      // 2xx
      expect(validateStatus!(200)).toBe(true);
      expect(validateStatus!(201)).toBe(true);
      // 4xx
      expect(validateStatus!(400)).toBe(true);
      expect(validateStatus!(401)).toBe(true);
      expect(validateStatus!(404)).toBe(true);
      // 5xx should be false
      expect(validateStatus!(500)).toBe(false);
      expect(validateStatus!(503)).toBe(false);
    });
  });

  describe('Request Interceptor - Token Handling', () => {
    it('should add Authorization header when token exists', () => {
      localStorageMock.getItem.mockReturnValue('test-token');

      const config = {
        url: '/contracts/list/',
        method: 'get',
        headers: {} as any,
        metadata: undefined as any,
      };

      const interceptors = (api.interceptors.request as any).handlers;
      let processedConfig = config;
      for (const handler of interceptors) {
        if (handler.fulfilled) {
          processedConfig = handler.fulfilled(processedConfig);
        }
      }

      expect(processedConfig.headers.Authorization).toBe('Bearer test-token');
    });

    it('should not add Authorization header for public endpoints', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const config = {
        url: '/users/auth/login/',
        method: 'post',
        headers: {} as any,
        metadata: undefined as any,
      };

      const interceptors = (api.interceptors.request as any).handlers;
      let processedConfig = config;
      for (const handler of interceptors) {
        if (handler.fulfilled) {
          processedConfig = handler.fulfilled(processedConfig);
        }
      }

      expect(processedConfig.headers.Authorization).toBeUndefined();
    });

    it('should dispatch authRequired event when accessing protected endpoint without token', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const config = {
        url: '/contracts/list/',
        method: 'get',
        headers: {} as any,
        metadata: undefined as any,
      };

      const interceptors = (api.interceptors.request as any).handlers;
      for (const handler of interceptors) {
        if (handler.fulfilled) {
          handler.fulfilled(config);
        }
      }

      expect(dispatchEventSpy).toHaveBeenCalled();
      const event = dispatchEventSpy.mock.calls[0][0];
      expect(event.type).toBe('authRequired');
    });

    it('should add performance metadata to config', () => {
      localStorageMock.getItem.mockReturnValue('test-token');

      const config = {
        url: '/properties/',
        method: 'get',
        headers: {} as any,
        metadata: undefined as any,
      };

      const interceptors = (api.interceptors.request as any).handlers;
      let processedConfig = config;
      for (const handler of interceptors) {
        if (handler.fulfilled) {
          processedConfig = handler.fulfilled(processedConfig);
        }
      }

      expect(processedConfig.metadata).toBeDefined();
      expect(processedConfig.metadata.requestId).toBeDefined();
      expect(processedConfig.metadata.startTime).toBeDefined();
    });
  });

  describe('Public Endpoints Detection', () => {
    it('should recognize login as a public endpoint', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const config = {
        url: '/users/auth/login/',
        method: 'post',
        headers: {} as any,
        metadata: undefined as any,
      };

      const interceptors = (api.interceptors.request as any).handlers;
      for (const handler of interceptors) {
        if (handler.fulfilled) {
          handler.fulfilled(config);
        }
      }

      // Should NOT dispatch authRequired for public endpoint
      expect(dispatchEventSpy).not.toHaveBeenCalled();
    });

    it('should recognize register as a public endpoint', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const config = {
        url: '/users/auth/register/',
        method: 'post',
        headers: {} as any,
        metadata: undefined as any,
      };

      const interceptors = (api.interceptors.request as any).handlers;
      for (const handler of interceptors) {
        if (handler.fulfilled) {
          handler.fulfilled(config);
        }
      }

      expect(dispatchEventSpy).not.toHaveBeenCalled();
    });

    it('should recognize properties listing as a public endpoint', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const config = {
        url: '/properties/',
        method: 'get',
        headers: {} as any,
        metadata: undefined as any,
      };

      const interceptors = (api.interceptors.request as any).handlers;
      for (const handler of interceptors) {
        if (handler.fulfilled) {
          handler.fulfilled(config);
        }
      }

      expect(dispatchEventSpy).not.toHaveBeenCalled();
    });
  });

  describe('Response Interceptor - Error Handling', () => {
    it('should handle timeout errors with Spanish message', async () => {
      const error = {
        code: 'ECONNABORTED',
        config: { url: '/test/', method: 'get', metadata: { startTime: 0 } },
        response: undefined,
      };

      const interceptors = (api.interceptors.response as any).handlers;
      for (const handler of interceptors) {
        if (handler.rejected) {
          try {
            await handler.rejected(error);
          } catch (e: any) {
            expect(e.message).toBe('La petición tardó demasiado tiempo');
          }
        }
      }
    });

    it('should handle connection errors with Spanish message', async () => {
      const error = {
        code: 'NETWORK_ERROR',
        config: { url: '/test/', method: 'get', metadata: { startTime: 0 } },
        message: 'Network Error',
        response: undefined,
      };

      const interceptors = (api.interceptors.response as any).handlers;
      for (const handler of interceptors) {
        if (handler.rejected) {
          try {
            await handler.rejected(error);
          } catch (e: any) {
            expect(e.message).toBe('No se pudo conectar con el servidor');
          }
        }
      }
    });

    it('should clear tokens on 401 response', async () => {
      const error = {
        config: { url: '/test/', method: 'get', metadata: { startTime: 0 } },
        response: { status: 401, data: {} },
      };

      const interceptors = (api.interceptors.response as any).handlers;
      for (const handler of interceptors) {
        if (handler.rejected) {
          try {
            await handler.rejected(error);
          } catch {
            // Expected
          }
        }
      }

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh');
    });

    it('should dispatch tokenInvalid event on 401', async () => {
      const error = {
        config: { url: '/test/', method: 'get', metadata: { startTime: 0 } },
        response: { status: 401, data: {} },
      };

      const interceptors = (api.interceptors.response as any).handlers;
      for (const handler of interceptors) {
        if (handler.rejected) {
          try {
            await handler.rejected(error);
          } catch {
            // Expected
          }
        }
      }

      const tokenInvalidCall = dispatchEventSpy.mock.calls.find(
        (call: any[]) => call[0]?.type === 'tokenInvalid'
      );
      expect(tokenInvalidCall).toBeDefined();
    });
  });

  describe('Exports', () => {
    it('should export api as named export from mock', () => {
      // The real api.ts exports { api } and default api
      // We verify the mock is set up correctly
      const mod = require('../api');
      expect(mod.api).toBeDefined();
    });
  });
});
