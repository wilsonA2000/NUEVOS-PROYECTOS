import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';

// Configuración avanzada de cache para diferentes tipos de datos
const CACHE_STRATEGIES = {
  // Datos que cambian frecuentemente
  realtime: {
    staleTime: 0,
    cacheTime: 5 * 60 * 1000, // 5 min
    refetchInterval: 30 * 1000, // 30 seg
  },
  // Datos dinámicos pero menos frecuentes
  dynamic: {
    staleTime: 2 * 60 * 1000, // 2 min
    cacheTime: 15 * 60 * 1000, // 15 min
    refetchInterval: false,
  },
  // Datos semi-estáticos
  stable: {
    staleTime: 10 * 60 * 1000, // 10 min
    cacheTime: 30 * 60 * 1000, // 30 min
    refetchInterval: false,
  },
  // Datos estáticos
  static: {
    staleTime: 60 * 60 * 1000, // 1 hora
    cacheTime: 24 * 60 * 60 * 1000, // 24 horas
    refetchInterval: false,
  },
};

// Cache global para queries
const queryCache = new QueryCache({
  onError: (error, query) => {
    if (error instanceof Error) {
    }
  },
  onSuccess: (data, query) => {
    // Log successful queries in development
    if (process.env.NODE_ENV === 'development') {
    }
  },
});

// Cache global para mutations
const mutationCache = new MutationCache({
  onError: (error, mutation) => {
    if (error instanceof Error) {
    }
  },
  onSuccess: (data, mutation) => {
    if (process.env.NODE_ENV === 'development') {
    }
  },
});

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      // Configuración base optimizada
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      refetchOnMount: true,
      retry: (failureCount, error) => {
        // No reintentar para errores 4xx
        if (error instanceof Error && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        return failureCount < 3;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Configuración por defecto - se puede sobrescribir
      staleTime: CACHE_STRATEGIES.dynamic.staleTime,
      gcTime: CACHE_STRATEGIES.dynamic.cacheTime,
      // Network mode handling
      networkMode: 'online',
      // Configurar timeout
      meta: {
        errorMessage: 'Error al cargar datos',
      },
    },
    mutations: {
      retry: false,
      networkMode: 'online',
      onError: error => {},
    },
  },
});

// Exportar estrategias de cache para uso en hooks
export { CACHE_STRATEGIES };

// Funciones de utilidad para cache
export const cacheUtils = {
  // Invalidar queries por patrón
  invalidateQueries: (queryKey: readonly unknown[]) => {
    return queryClient.invalidateQueries({ queryKey });
  },

  // Refetch queries por patrón
  refetchQueries: (queryKey: readonly unknown[]) => {
    return queryClient.refetchQueries({ queryKey });
  },

  // Limpiar cache completamente
  clearCache: () => {
    queryClient.clear();
  },

  // Obtener datos del cache sin activar query
  getCachedData: <T>(queryKey: readonly unknown[]) => {
    return queryClient.getQueryData<T>(queryKey);
  },

  // Establecer datos en cache manualmente
  setCachedData: <T>(
    queryKey: readonly unknown[],
    data: T,
    options?: { staleTime?: number },
  ) => {
    queryClient.setQueryData(queryKey, data);
    if (options?.staleTime) {
      queryClient.setQueryDefaults(queryKey, {
        staleTime: options.staleTime,
      });
    }
  },

  // Prefetch de datos
  prefetchQuery: <T>(
    queryKey: readonly unknown[],
    queryFn: () => Promise<T>,
    options?: { staleTime?: number },
  ) => {
    return queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: options?.staleTime || CACHE_STRATEGIES.dynamic.staleTime,
    });
  },

  // Eliminar queries específicas del cache
  removeQueries: (queryKey: readonly unknown[]) => {
    queryClient.removeQueries({ queryKey });
  },

  // Cancelar queries en progreso
  cancelQueries: (queryKey: readonly unknown[]) => {
    return queryClient.cancelQueries({ queryKey });
  },
};
