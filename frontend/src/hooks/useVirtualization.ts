import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  estimatedItemHeight?: number;
  getItemHeight?: (index: number) => number;
}

interface VirtualItem {
  index: number;
  start: number;
  end: number;
  size: number;
}

export function useVirtualization<T>(
  items: T[],
  options: VirtualizationOptions
) {
  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    estimatedItemHeight,
    getItemHeight,
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Calcular la altura total del scroll
  const totalHeight = useMemo(() => {
    if (getItemHeight) {
      return items.reduce((total, _, index) => total + getItemHeight(index), 0);
    }
    return items.length * itemHeight;
  }, [items.length, itemHeight, getItemHeight]);

  // Calcular elementos visibles
  const virtualItems = useMemo(() => {
    const itemCount = items.length;
    if (itemCount === 0) return [];

    const visibleRange = getVisibleRange(
      scrollTop,
      containerHeight,
      itemCount,
      itemHeight,
      getItemHeight
    );

    const start = Math.max(0, visibleRange.start - overscan);
    const end = Math.min(itemCount - 1, visibleRange.end + overscan);

    const virtualItems: VirtualItem[] = [];
    let currentStart = 0;

    for (let i = start; i <= end; i++) {
      const size = getItemHeight ? getItemHeight(i) : itemHeight;
      
      // Calcular posición real del item
      if (getItemHeight) {
        currentStart = items.slice(0, i).reduce((total, _, index) => total + getItemHeight(index), 0);
      } else {
        currentStart = i * itemHeight;
      }

      virtualItems.push({
        index: i,
        start: currentStart,
        end: currentStart + size,
        size,
      });
    }

    return virtualItems;
  }, [scrollTop, containerHeight, items.length, itemHeight, overscan, getItemHeight]);

  // Handler para el scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    setScrollTop(scrollTop);
    setIsScrolling(true);

    // Detectar cuando termina el scroll
    const scrollTimeout = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    return () => clearTimeout(scrollTimeout);
  }, []);

  // Scroll a un elemento específico
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    const element = document.getElementById(`virtual-item-${index}`);
    if (element) {
      const itemStart = getItemHeight 
        ? items.slice(0, index).reduce((total, _, i) => total + getItemHeight(i), 0)
        : index * itemHeight;

      let scrollTo = itemStart;

      if (align === 'center') {
        scrollTo = itemStart - containerHeight / 2 + itemHeight / 2;
      } else if (align === 'end') {
        scrollTo = itemStart - containerHeight + itemHeight;
      }

      element.scrollTop = Math.max(0, scrollTo);
    }
  }, [items, itemHeight, containerHeight, getItemHeight]);

  return {
    virtualItems,
    totalHeight,
    scrollTop,
    isScrolling,
    handleScroll,
    scrollToIndex,
  };
}

function getVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemCount: number,
  itemHeight: number,
  getItemHeight?: (index: number) => number
): { start: number; end: number } {
  if (getItemHeight) {
    // Para alturas variables, buscar por aproximación
    let start = 0;
    let end = itemCount - 1;
    let currentHeight = 0;

    // Encontrar el primer elemento visible
    for (let i = 0; i < itemCount; i++) {
      const height = getItemHeight(i);
      if (currentHeight + height > scrollTop) {
        start = i;
        break;
      }
      currentHeight += height;
    }

    // Encontrar el último elemento visible
    currentHeight = 0;
    for (let i = 0; i < itemCount; i++) {
      const height = getItemHeight(i);
      currentHeight += height;
      if (currentHeight > scrollTop + containerHeight) {
        end = i;
        break;
      }
    }

    return { start, end };
  }

  // Para alturas fijas
  const start = Math.floor(scrollTop / itemHeight);
  const end = Math.min(
    itemCount - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight)
  );

  return { start, end };
}

// Hook para infinite scroll
interface InfiniteScrollOptions {
  loadMore: () => Promise<void>;
  hasNextPage: boolean;
  isLoading: boolean;
  threshold?: number;
}

export function useInfiniteScroll(options: InfiniteScrollOptions) {
  const { loadMore, hasNextPage, isLoading, threshold = 300 } = options;
  const [isFetching, setIsFetching] = useState(false);

  const handleScroll = useCallback(
    async (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      
      if (
        scrollHeight - scrollTop - clientHeight < threshold &&
        hasNextPage &&
        !isLoading &&
        !isFetching
      ) {
        setIsFetching(true);
        try {
          await loadMore();
        } finally {
          setIsFetching(false);
        }
      }
    },
    [loadMore, hasNextPage, isLoading, isFetching, threshold]
  );

  return { handleScroll, isFetching };
}

// Hook para detectar scroll direction
export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [lastScrollTop, setLastScrollTop] = useState(0);

  const updateScrollDirection = useCallback((scrollTop: number) => {
    if (scrollTop > lastScrollTop) {
      setScrollDirection('down');
    } else if (scrollTop < lastScrollTop) {
      setScrollDirection('up');
    }
    setLastScrollTop(scrollTop);
  }, [lastScrollTop]);

  return { scrollDirection, updateScrollDirection };
}

// Componente de lista virtualizada
interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number, isScrolling: boolean) => React.ReactNode;
  overscan?: number;
  onScrollEnd?: () => void;
  getItemHeight?: (index: number) => number;
  estimatedItemHeight?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 5,
  onScrollEnd,
  getItemHeight,
  estimatedItemHeight,
  className,
  style,
}: VirtualizedListProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  const { virtualItems, totalHeight, isScrolling, handleScroll } = useVirtualization(
    items,
    {
      itemHeight,
      containerHeight: height,
      overscan,
      estimatedItemHeight,
      getItemHeight,
    }
  );

  const onScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      handleScroll(event);
      
      // Detectar scroll end
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        onScrollEnd?.();
      }
    },
    [handleScroll, onScrollEnd]
  );

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height,
        overflow: 'auto',
        position: 'relative',
        ...style,
      }}
      onScroll={onScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.index}
            id={`virtual-item-${virtualItem.index}`}
            style={{
              position: 'absolute',
              top: virtualItem.start,
              height: virtualItem.size,
              width: '100%',
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index, isScrolling)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook para memoización inteligente de items
export function useSmartMemo<T>(
  items: T[],
  dependencies: any[] = []
): T[] {
  return useMemo(() => items, [items.length, ...dependencies]);
}

// Hook para paginación virtual
interface VirtualPaginationOptions {
  pageSize: number;
  totalItems: number;
  initialPage?: number;
}

export function useVirtualPagination(options: VirtualPaginationOptions) {
  const { pageSize, totalItems, initialPage = 1 } = options;
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);
  
  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);
  
  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);
  
  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}