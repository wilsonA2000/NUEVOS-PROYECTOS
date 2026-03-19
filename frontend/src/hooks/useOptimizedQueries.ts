import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { CACHE_STRATEGIES } from '../lib/queryClient';

// Types para las diferentes estrategias de cache
type CacheStrategy = keyof typeof CACHE_STRATEGIES;

// Hook base optimizado para queries
export function useOptimizedQuery<TData = unknown, TError = Error>(
  queryKey: (string | number)[],
  queryFn: () => Promise<TData>,
  cacheStrategy: CacheStrategy = 'dynamic',
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>,
) {
  const strategy = CACHE_STRATEGIES[cacheStrategy];
  
  return useQuery({
    queryKey,
    queryFn,
    ...strategy,
    ...options,
    meta: {
      cacheStrategy,
      ...options?.meta,
    },
  } as any);
}

// Hook para datos en tiempo real (notificaciones, mensajes)
export function useRealtimeQuery<TData = unknown, TError = Error>(
  queryKey: (string | number)[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>,
) {
  return useOptimizedQuery(queryKey, queryFn, 'realtime', {
    ...options,
    refetchOnWindowFocus: true,
    refetchOnReconnect: 'always',
  });
}

// Hook para datos dinámicos (propiedades, contratos)
export function useDynamicQuery<TData = unknown, TError = Error>(
  queryKey: (string | number)[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>,
) {
  return useOptimizedQuery(queryKey, queryFn, 'dynamic', options);
}

// Hook para datos estables (perfiles de usuario, configuraciones)
export function useStableQuery<TData = unknown, TError = Error>(
  queryKey: (string | number)[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>,
) {
  return useOptimizedQuery(queryKey, queryFn, 'stable', options);
}

// Hook para datos estáticos (catálogos, opciones de configuración)
export function useStaticQuery<TData = unknown, TError = Error>(
  queryKey: (string | number)[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>,
) {
  return useOptimizedQuery(queryKey, queryFn, 'static', options);
}

// Hook optimizado para mutations con invalidación inteligente
export function useOptimizedMutation<TData = unknown, TError = Error, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> & {
    invalidateQueries?: string[][];
    updateQueries?: Array<{
      queryKey: string[];
      updater: (oldData: any, newData: TData) => any;
    }>;
    optimisticUpdate?: {
      queryKey: string[];
      updater: (oldData: any, variables: TVariables) => any;
    };
  },
) {
  const queryClient = useQueryClient();
  
  return useMutation<TData, TError, TVariables>({
    mutationFn,
    ...options,
    onSuccess: (data, variables, context) => {
      // Invalidar queries especificadas
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }

      // Actualizar queries específicas
      if (options?.updateQueries) {
        options.updateQueries.forEach(({ queryKey, updater }) => {
          queryClient.setQueryData(queryKey, (oldData: any) =>
            updater(oldData, data),
          );
        });
      }

      // Ejecutar callback original
      if (options?.onSuccess) {
        (options.onSuccess as any)(data, variables, context);
      }
    },
    onMutate: async (variables) => {
      // Actualización optimista
      if (options?.optimisticUpdate) {
        const { queryKey, updater } = options.optimisticUpdate;

        // Cancelar queries en progreso
        await queryClient.cancelQueries({ queryKey });

        // Obtener datos actuales
        const previousData = queryClient.getQueryData(queryKey);

        // Aplicar actualización optimista
        queryClient.setQueryData(queryKey, (oldData: any) =>
          updater(oldData, variables),
        );

        // Retornar contexto para rollback
        const context: any = { previousData };
        if (options?.onMutate) {
          const mutateContext = await (options.onMutate as any)(variables);
          return { ...context, ...(mutateContext || {}) };
        }
        return context;
      }

      if (options?.onMutate) {
        const mutateContext = await (options.onMutate as any)(variables);
        return mutateContext;
      }
      return undefined;
    },
    onError: (error, variables, context) => {
      // Rollback en caso de error con actualización optimista
      if (options?.optimisticUpdate && context && typeof context === 'object' && 'previousData' in context) {
        const { queryKey } = options.optimisticUpdate;
        queryClient.setQueryData(queryKey, (context as any).previousData);
      }

      if (options?.onError) {
        (options.onError as any)(error, variables, context);
      }
    },
  });
}

// Hook para pagination optimizada
export function usePaginatedQuery<TData = unknown, TError = Error>(
  baseQueryKey: (string | number)[],
  queryFn: (page: number, limit: number) => Promise<TData>,
  options?: {
    initialPage?: number;
    pageSize?: number;
    cacheStrategy?: CacheStrategy;
    keepPreviousData?: boolean;
  },
) {
  const {
    initialPage = 1,
    pageSize = 10,
    cacheStrategy = 'dynamic',
    keepPreviousData = true,
  } = options || {};
  
  const queryClient = useQueryClient();
  
  const prefetchNextPage = (currentPage: number) => {
    const nextPage = currentPage + 1;
    const nextQueryKey = [...baseQueryKey, 'page', nextPage, 'limit', pageSize];
    
    queryClient.prefetchQuery({
      queryKey: nextQueryKey,
      queryFn: () => queryFn(nextPage, pageSize),
      staleTime: CACHE_STRATEGIES[cacheStrategy].staleTime,
    });
  };
  
  return {
    prefetchNextPage,
    usePageQuery: (page: number) => {
      const queryKey = [...baseQueryKey, 'page', page, 'limit', pageSize];
      
      return useOptimizedQuery(
        queryKey,
        () => queryFn(page, pageSize),
        cacheStrategy,
        {
          placeholderData: keepPreviousData ? (previousData) => previousData : undefined,
        },
      );
    },
  };
}

// Hook para infinite queries optimizado
export function useOptimizedInfiniteQuery<TData = unknown, TError = Error>(
  queryKey: (string | number)[],
  queryFn: ({ pageParam }: { pageParam: number }) => Promise<TData>,
  options?: {
    cacheStrategy?: CacheStrategy;
    getNextPageParam?: (lastPage: TData, pages: TData[]) => number | undefined;
    getPreviousPageParam?: (firstPage: TData, pages: TData[]) => number | undefined;
  },
) {
  const { cacheStrategy = 'dynamic', ...restOptions } = options || {};
  const strategy = CACHE_STRATEGIES[cacheStrategy];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const data = await queryFn({ pageParam: 1 as number });
      return data;
    },
    ...strategy,
    ...restOptions,
    meta: {
      cacheStrategy,
      type: 'infinite',
    },
  } as any);
}

// Hooks específicos para entidades de VeriHome
export const usePropertiesQuery = (filters?: Record<string, any>) => {
  return useDynamicQuery(
    ['properties', 'list', ...(filters ? [JSON.stringify(filters)] : [])],
    () => import('../services/propertyService').then(m => m.propertyService.getProperties(filters)),
    {
      enabled: true,
      select: (data: any) => ({
        ...data,
        results: data.results?.map((property: any) => ({
          ...property,
          // Procesar datos de la propiedad
          images: property.images?.map((img: string) => ({
            url: img,
            optimized: typeof img === 'string' ? img.replace(/\.(jpg|jpeg|png)$/i, '.webp') : img, // Optimización de imágenes
          })),
        })),
      }),
    },
  );
};

export const useContractsQuery = (userId?: number) => {
  return useDynamicQuery(
    ['contracts', 'list', userId ?? 0],
    () => import('../services/contractService').then(m => m.contractService.getContracts()),
    {
      enabled: !!userId,
    },
  );
};

export const useMessagesQuery = (conversationId?: number) => {
  return useRealtimeQuery(
    ['messages', 'conversation', conversationId ?? 0],
    () => import('../services/messageService').then(m => m.messageService.getMessages(String(conversationId!))),
    {
      enabled: !!conversationId,
      refetchInterval: 10000, // Refresh cada 10 segundos
    },
  );
};

export const useUserProfileQuery = (userId: number) => {
  return useStableQuery(
    ['user', 'profile', userId],
    () => import('../services/authService').then(m => m.authService.getCurrentUser()),
    {
      enabled: !!userId,
    },
  );
};

export const useNotificationsQuery = () => {
  return useRealtimeQuery(
    ['notifications', 'unread'],
    () => import('../services/notificationService').then(m => m.notificationService?.getNotifications?.(1) || Promise.resolve([])),
    {
      refetchInterval: 30000, // Refresh cada 30 segundos
    },
  );
};