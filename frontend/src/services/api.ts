import axios from 'axios';
import { performanceMonitor } from '../utils/performanceMonitor';
import { auditMiddleware } from '../utils/auditMiddleware';
import { setupAxiosCache } from './apiCache';

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Configuración adicional para mejor manejo de errores
  timeout: 10000, // 10 segundos
  validateStatus: (status) => {
    // Considerar válidos: 2xx (éxito), 4xx (errores del cliente), 401 (autenticación)
    // Esto permite manejar errores de validación (400) como respuestas válidas
    return (status >= 200 && status < 300) || (status >= 400 && status < 500) || status === 401;
  },
});

// Lista de endpoints que no requieren autenticación
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
  '/properties/', // Lista pública de propiedades
];

// Función para verificar si un endpoint requiere autenticación
const requiresAuth = (url: string): boolean => {
  return !PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

// Request interceptor to add auth token and start performance tracking
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    const endpoint = config.url || '';
    const needsAuth = requiresAuth(endpoint);
    
    // Logs deshabilitados en producción
    //

//

//

//

// Start performance tracking
    const requestId = `${config.method?.toUpperCase()}_${config.url}_${Date.now()}`;
    config.metadata = { requestId, startTime: performance.now() };
    
    // Si el endpoint requiere autenticación pero no hay token
    if (needsAuth && !token) {
      // console.error('❌ API Interceptor: Intento de acceso a endpoint protegido sin token');
      // Cancelar la petición y redirigir a login
      const controller = new AbortController();
      controller.abort('No authentication token available');
      
      // Disparar evento para que AuthContext maneje la redirección
      window.dispatchEvent(new CustomEvent('authRequired', { 
        detail: { 
          endpoint, 
          message: 'Necesitas iniciar sesión para acceder a este recurso' 
        } 
      }));
      
      return {
        ...config,
        signal: controller.signal
      };
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      //

} else if (!needsAuth) {
      //

}
    
    return config;
  },
  (error) => {
    // console.error('❌ API Interceptor: Error en request:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and track performance
api.interceptors.response.use(
  (response) => {
    // Track API performance
    if (response.config.metadata) {
      const { startTime } = response.config.metadata;
      const duration = performance.now() - startTime;
      const endpoint = response.config.url || '';
      const method = response.config.method || '';
      
      performanceMonitor.trackAPICall(endpoint, method.toUpperCase(), duration, response.status);
    }
    
    // Para códigos 4xx, rechazar como error para que sea manejado por el catch
    if (response.status >= 400 && response.status < 500) {
      console.error('🔥 API ERROR DETAILS:', {
        status: response.status,
        statusText: response.statusText,
        url: response.config.url,
        method: response.config.method,
        data: response.data,
        headers: response.headers
      });
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.response = response;
      error.config = response.config;
      return Promise.reject(error);
    }
    
    return response;
  },
  (error) => {
    // Track performance for failed requests
    if (error.config?.metadata) {
      const { startTime } = error.config.metadata;
      const duration = performance.now() - startTime;
      const endpoint = error.config.url || '';
      const method = error.config.method || '';
      const status = error.response?.status || 0;
      
      performanceMonitor.trackAPICall(endpoint, method.toUpperCase(), duration, status);
    }
    
    // Manejar errores de red
    if (error.code === 'ECONNABORTED') {
      // console.error('Timeout en la petición:', error.config.url);
      return Promise.reject(new Error('La petición tardó demasiado tiempo'));
    }

    // Manejar errores de conexión
    if (!error.response) {
      // console.error('Error de conexión:', error.message);
      return Promise.reject(new Error('No se pudo conectar con el servidor'));
    }

    const { status, data } = error.response;

    // Manejar errores específicos
    switch (status) {
      case 401:
        // Token expired or invalid
        //

localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        // Disparar evento personalizado para notificar al AuthContext
        window.dispatchEvent(new CustomEvent('tokenInvalid'));
        break;
      case 403:
        // console.error('Acceso denegado:', data);
        break;
      case 404:
        // console.error('Recurso no encontrado:', error.config.url);
        break;
      case 500:
        // console.error('Error interno del servidor:', data);
        break;
      default:
        // console.error(`Error ${status}:`, data);
    }

    // Return the audit-processed error
    return auditMiddleware.interceptAPIError(error);
  }
);

// Configurar cache para endpoints específicos
setupAxiosCache(api, {
  ttl: 5 * 60 * 1000, // 5 minutos
  storage: 'sessionStorage', // Usar sessionStorage para que se limpie al cerrar el navegador
  useEtag: true // Soportar ETags para revalidación
});

// Exportar función para invalidar cache cuando sea necesario
export { apiCache } from './apiCache';

// Export the main API instance
export default api;
/* Cache busted: 2025-08-06T04:42:27.049Z - API_CONFIG */

/* FORCE RELOAD 1754456937872 - API_CONFIG - Nuclear fix applied */

/* DEBUG ERROR LOGGING 1754468245892 - Enhanced error details for HTTP 400 debugging */
