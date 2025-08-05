import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

interface CacheItem {
  data: any;
  timestamp: number;
  etag?: string;
}

interface CacheConfig {
  ttl?: number; // Time to live en millisegundos
  useEtag?: boolean;
  storage?: 'memory' | 'sessionStorage' | 'localStorage';
}

class ApiCache {
  private memoryCache: Map<string, CacheItem> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutos por defecto
  
  /**
   * Genera una clave única para la cache basada en la configuración de la petición
   */
  private getCacheKey(config: AxiosRequestConfig): string {
    const { method = 'GET', url, params, data } = config;
    const paramString = params ? JSON.stringify(params) : '';
    const dataString = data ? JSON.stringify(data) : '';
    return `${method}:${url}:${paramString}:${dataString}`;
  }
  
  /**
   * Obtiene un item de la cache
   */
  private getFromCache(key: string, storage: CacheConfig['storage'] = 'memory'): CacheItem | null {
    if (storage === 'memory') {
      return this.memoryCache.get(key) || null;
    }
    
    const storageApi = storage === 'localStorage' ? localStorage : sessionStorage;
    const cached = storageApi.getItem(key);
    
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        storageApi.removeItem(key);
        return null;
      }
    }
    
    return null;
  }
  
  /**
   * Guarda un item en la cache
   */
  private setInCache(key: string, item: CacheItem, storage: CacheConfig['storage'] = 'memory'): void {
    if (storage === 'memory') {
      this.memoryCache.set(key, item);
    } else {
      const storageApi = storage === 'localStorage' ? localStorage : sessionStorage;
      try {
        storageApi.setItem(key, JSON.stringify(item));
      } catch (e) {
        // Si el storage está lleno, limpiar items antiguos
        console.warn('Storage full, clearing old cache items');
        this.clearOldItems(storage);
        try {
          storageApi.setItem(key, JSON.stringify(item));
        } catch {
          console.error('Unable to cache item');
        }
      }
    }
  }
  
  /**
   * Limpia items antiguos de la cache
   */
  private clearOldItems(storage: CacheConfig['storage'] = 'memory'): void {
    const now = Date.now();
    
    if (storage === 'memory') {
      for (const [key, item] of this.memoryCache.entries()) {
        if (now - item.timestamp > this.defaultTTL) {
          this.memoryCache.delete(key);
        }
      }
    } else {
      const storageApi = storage === 'localStorage' ? localStorage : sessionStorage;
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < storageApi.length; i++) {
        const key = storageApi.key(i);
        if (key?.startsWith('api-cache:')) {
          const item = this.getFromCache(key, storage);
          if (item && now - item.timestamp > this.defaultTTL) {
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => storageApi.removeItem(key));
    }
  }
  
  /**
   * Interceptor para cachear respuestas
   */
  createCacheInterceptor(cacheConfig: CacheConfig = {}) {
    const { ttl = this.defaultTTL, useEtag = false, storage = 'memory' } = cacheConfig;
    
    return {
      request: (config: AxiosRequestConfig) => {
        // Solo cachear métodos GET
        if (config.method?.toUpperCase() !== 'GET') {
          return config;
        }
        
        // Skip cache si se especifica
        if (config.headers?.['Cache-Control'] === 'no-cache') {
          return config;
        }
        
        const cacheKey = `api-cache:${this.getCacheKey(config)}`;
        const cached = this.getFromCache(cacheKey, storage);
        
        if (cached) {
          const age = Date.now() - cached.timestamp;
          
          // Si el cache no ha expirado, devolver los datos cacheados
          if (age < ttl) {
            console.log(`🎯 ApiCache: Cache HIT para ${config.url} (age: ${Math.round(age/1000)}s)`);
            // Crear una respuesta falsa con los datos cacheados
            const cachedResponse: AxiosResponse = {
              data: cached.data,
              status: 200,
              statusText: 'OK (from cache)',
              headers: { 'x-cache': 'HIT' },
              config: config,
            };
            
            // Resolver la promesa inmediatamente con los datos cacheados
            return Promise.reject({ 
              __cached: true, 
              response: cachedResponse 
            });
          }
          
          // Si usamos ETags y tenemos uno, agregarlo a los headers
          if (useEtag && cached.etag) {
            config.headers = {
              ...config.headers,
              'If-None-Match': cached.etag,
            };
          }
        }
        
        // Guardar la key en la config para usarla en la respuesta
        config.metadata = {
          ...config.metadata,
          cacheKey,
          cacheConfig: { ttl, storage },
        };
        
        return config;
      },
      
      response: (response: AxiosResponse) => {
        const { cacheKey, cacheConfig } = response.config.metadata || {};
        
        // Solo cachear respuestas exitosas de métodos GET
        if (
          response.config.method?.toUpperCase() === 'GET' &&
          response.status === 200 &&
          cacheKey &&
          cacheConfig
        ) {
          const cacheItem: CacheItem = {
            data: response.data,
            timestamp: Date.now(),
            etag: response.headers.etag,
          };
          
          this.setInCache(cacheKey, cacheItem, cacheConfig.storage);

}
        
        return response;
      },
      
      responseError: (error: any) => {
        // Si es una respuesta cacheada, devolverla como éxito
        if (error.__cached) {
          return Promise.resolve(error.response);
        }
        
        // Si recibimos un 304 (Not Modified), usar el cache
        if (error.response?.status === 304) {
          const { cacheKey } = error.config.metadata || {};
          if (cacheKey) {
            const cached = this.getFromCache(cacheKey, error.config.metadata?.cacheConfig?.storage);
            if (cached) {

return Promise.resolve({
                ...error.response,
                data: cached.data,
                headers: { ...error.response.headers, 'x-cache': 'REVALIDATED' },
              });
            }
          }
        }
        
        return Promise.reject(error);
      },
    };
  }
  
  /**
   * Limpia toda la cache
   */
  clearAll(): void {
    this.memoryCache.clear();
    
    // Limpiar storage
    ['localStorage', 'sessionStorage'].forEach(storageType => {
      const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith('api-cache:')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => storage.removeItem(key));
    });

}
  
  /**
   * Invalida una entrada específica de la cache
   */
  invalidate(url: string, method: string = 'GET'): void {
    // Buscar y eliminar todas las entradas que coincidan con la URL
    const pattern = `api-cache:${method}:${url}`;
    
    // Memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Storage cache
    ['localStorage', 'sessionStorage'].forEach(storageType => {
      const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.includes(pattern)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => storage.removeItem(key));
    });

}
}

// Exportar instancia singleton
export const apiCache = new ApiCache();

// Ejemplo de uso con axios
export const setupAxiosCache = (axiosInstance: typeof axios, config?: CacheConfig) => {
  const interceptor = apiCache.createCacheInterceptor(config);
  
  // Request interceptor
  axiosInstance.interceptors.request.use(
    async (config) => {
      try {
        return await interceptor.request(config);
      } catch (error: any) {
        if (error.__cached) {
          // Manejar respuesta cacheada
          return Promise.reject(error);
        }
        throw error;
      }
    },
    (error) => Promise.reject(error)
  );
  
  // Response interceptor
  axiosInstance.interceptors.response.use(
    (response) => interceptor.response(response),
    (error) => interceptor.responseError(error)
  );
};