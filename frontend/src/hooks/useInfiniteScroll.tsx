import React, { useCallback, useEffect, useRef, useState } from 'react';

interface InfiniteScrollOptions<T> {
  fetchNextPage: () => Promise<T[]>;
  hasNextPage: boolean;
  isLoading: boolean;
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
  initialData?: T[];
  onError?: (error: Error) => void;
  debounceMs?: number;
}

interface InfiniteScrollReturn<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  resetData: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
  triggerRef: React.RefObject<HTMLDivElement>;
}

export function useInfiniteScroll<T>({
  fetchNextPage,
  hasNextPage,
  isLoading,
  threshold = 300,
  rootMargin = '100px',
  enabled = true,
  initialData = [],
  onError,
  debounceMs = 200,
}: InfiniteScrollOptions<T>): InfiniteScrollReturn<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Función para cargar más datos
  const loadMore = useCallback(async () => {
    if (!enabled || isLoading || isFetchingNextPage || !hasNextPage || loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setIsFetchingNextPage(true);
    setIsError(false);
    setError(null);

    try {
      const newData = await fetchNextPage();
      setData(prev => [...prev, ...newData]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error al cargar más datos');
      setIsError(true);
      setError(error);
      onError?.(error);
    } finally {
      setIsFetchingNextPage(false);
      loadingRef.current = false;
    }
  }, [enabled, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, onError]);

  // Debounced loadMore
  const debouncedLoadMore = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      loadMore();
    }, debounceMs);
  }, [loadMore, debounceMs]);

  // Intersection Observer para detectar cuando se necesita cargar más datos
  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          debouncedLoadMore();
        }
      },
      {
        rootMargin,
        threshold: 0.1,
      }
    );

    observer.observe(trigger);

    return () => {
      observer.disconnect();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [hasNextPage, isFetchingNextPage, enabled, rootMargin, debouncedLoadMore]);

  // Scroll listener como fallback
  const handleScroll = useCallback(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    if (scrollHeight - scrollTop - clientHeight < threshold && hasNextPage && !isFetchingNextPage) {
      debouncedLoadMore();
    }
  }, [enabled, threshold, hasNextPage, isFetchingNextPage, debouncedLoadMore]);

  // Agregar scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll, enabled]);

  // Reset data
  const resetData = useCallback(() => {
    setData(initialData);
    setIsError(false);
    setError(null);
    setIsFetchingNextPage(false);
    loadingRef.current = false;
  }, [initialData]);

  // Manual fetch function
  const manualFetch = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      loadMore();
    }
  }, [loadMore, isFetchingNextPage, hasNextPage]);

  return {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage: manualFetch,
    resetData,
    containerRef,
    triggerRef,
  };
}

// Hook específico para propiedades con infinite scroll
export function useInfiniteProperties(filters?: Record<string, any>) {
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [allData, setAllData] = useState<any[]>([]);

  const fetchNextPage = useCallback(async () => {
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { propertyService } = await import('../services/propertyService');
      
      const response = await propertyService.getProperties({
        ...filters,
        page,
        page_size: 12,
      });

      const newProperties = response.results || response;
      const hasNextPage = response.next ? true : newProperties.length === 12;
      
      setHasMore(hasNextPage);
      setPage(prev => prev + 1);
      
      return newProperties;
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
  }, [filters, page]);

  const resetProperties = useCallback(() => {
    setPage(1);
    setHasMore(true);
    setAllData([]);
  }, []);

  // Reset cuando cambien los filtros
  useEffect(() => {
    resetProperties();
  }, [JSON.stringify(filters)]);

  const infiniteScroll = useInfiniteScroll({
    fetchNextPage,
    hasNextPage: hasMore,
    isLoading: false,
    threshold: 200,
    onError: (error) => console.error('Infinite scroll error:', error),
  });

  return {
    ...infiniteScroll,
    properties: infiniteScroll.data,
    resetProperties,
  };
}

// Hook para mensajes con infinite scroll
export function useInfiniteMessages(conversationId?: number) {
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNextPage = useCallback(async () => {
    if (!conversationId) return [];

    try {
      const { messageService } = await import('../services/messageService');
      
      const response = await messageService.getMessages(conversationId, {
        page,
        page_size: 20,
      });

      const newMessages = response.results || response;
      const hasNextPage = response.next ? true : newMessages.length === 20;
      
      setHasMore(hasNextPage);
      setPage(prev => prev + 1);
      
      return newMessages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }, [conversationId, page]);

  const resetMessages = useCallback(() => {
    setPage(1);
    setHasMore(true);
  }, []);

  // Reset cuando cambie la conversación
  useEffect(() => {
    resetMessages();
  }, [conversationId]);

  return useInfiniteScroll({
    fetchNextPage,
    hasNextPage: hasMore,
    isLoading: false,
    enabled: !!conversationId,
    threshold: 100,
    rootMargin: '50px',
  });
}

// Hook para contratos con infinite scroll
export function useInfiniteContracts(filters?: Record<string, any>) {
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNextPage = useCallback(async () => {
    try {
      const { contractService } = await import('../services/contractService');
      
      const response = await contractService.getContracts({
        ...filters,
        page,
        page_size: 15,
      });

      const newContracts = response.results || response;
      const hasNextPage = response.next ? true : newContracts.length === 15;
      
      setHasMore(hasNextPage);
      setPage(prev => prev + 1);
      
      return newContracts;
    } catch (error) {
      console.error('Error fetching contracts:', error);
      throw error;
    }
  }, [filters, page]);

  const resetContracts = useCallback(() => {
    setPage(1);
    setHasMore(true);
  }, []);

  // Reset cuando cambien los filtros
  useEffect(() => {
    resetContracts();
  }, [JSON.stringify(filters)]);

  return {
    ...useInfiniteScroll({
      fetchNextPage,
      hasNextPage: hasMore,
      isLoading: false,
      threshold: 300,
    }),
    resetContracts,
  };
}

// Componente de trigger para infinite scroll
interface InfiniteScrollTriggerProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const InfiniteScrollTrigger = React.forwardRef<
  HTMLDivElement,
  InfiniteScrollTriggerProps
>(({ hasNextPage, isFetchingNextPage, children, className, style }, ref) => {
  if (!hasNextPage) return null;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        padding: '20px',
        textAlign: 'center',
        ...style,
      }}
    >
      {children || (
        <div>
          {isFetchingNextPage ? 'Cargando más...' : 'Cargar más'}
        </div>
      )}
    </div>
  );
});

InfiniteScrollTrigger.displayName = 'InfiniteScrollTrigger';