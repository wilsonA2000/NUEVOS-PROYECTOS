/**
 * usePropertyTable - Custom hook for managing property table state
 * Handles sorting, selection, pagination, and bulk operations
 */

import { useState, useCallback, useMemo } from 'react';
import { Property } from '../types/property';
import { SortableColumns, SortOrder } from '../components/properties/PropertyTable';

interface UsePropertyTableOptions {
  initialSortBy?: SortableColumns;
  initialSortOrder?: SortOrder;
  initialRowsPerPage?: number;
  enableSelection?: boolean;
  enableVirtualization?: boolean;
}

export const usePropertyTable = (
  properties: Property[],
  options: UsePropertyTableOptions = {}
) => {
  const {
    initialSortBy = 'created_at',
    initialSortOrder = 'desc',
    initialRowsPerPage = 20,
    enableSelection = false,
    enableVirtualization = false,
  } = options;

  // State
  const [sortBy, setSortBy] = useState<SortableColumns>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [selected, setSelected] = useState<string[]>([]);

  // Sorting function
  const sortProperties = useCallback((properties: Property[], sortBy: SortableColumns, sortOrder: SortOrder) => {
    return [...properties].sort((a, b) => {
      let aValue: any = a[sortBy as keyof Property];
      let bValue: any = b[sortBy as keyof Property];

      // Handle special cases
      switch (sortBy) {
        case 'price':
          aValue = a.rent_price || a.sale_price || 0;
          bValue = b.rent_price || b.sale_price || 0;
          break;
        case 'title':
        case 'property_type':
        case 'city':
        case 'status':
          aValue = String(aValue || '').toLowerCase();
          bValue = String(bValue || '').toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(aValue || 0);
          bValue = new Date(bValue || 0);
          break;
        default:
          // For numeric values
          if (typeof aValue === 'number' && typeof bValue === 'number') {
            // Already numbers, use as-is
          } else {
            // Convert to strings for comparison
            aValue = String(aValue || '').toLowerCase();
            bValue = String(bValue || '').toLowerCase();
          }
      }

      // Compare values
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, []);

  // Memoized sorted and paginated properties
  const { sortedProperties, paginatedProperties, totalCount } = useMemo(() => {
    const sorted = sortProperties(properties, sortBy, sortOrder);
    const total = sorted.length;
    
    // Apply pagination only if not using virtualization
    const paginated = enableVirtualization 
      ? sorted 
      : sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    
    return {
      sortedProperties: sorted,
      paginatedProperties: paginated,
      totalCount: total,
    };
  }, [properties, sortBy, sortOrder, page, rowsPerPage, sortProperties, enableVirtualization]);

  // Handlers
  const handleSort = useCallback((column: SortableColumns) => {
    if (sortBy === column) {
      setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    // Reset to first page when sorting changes
    setPage(0);
  }, [sortBy]);

  const handlePageChange = useCallback((_event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  }, []);

  const handleSelectionChange = useCallback((newSelected: string[]) => {
    if (enableSelection) {
      setSelected(newSelected);
    }
  }, [enableSelection]);

  const handleSelectAll = useCallback(() => {
    if (enableSelection) {
      const allIds = paginatedProperties.map(p => p.id.toString());
      const isAllSelected = allIds.every(id => selected.includes(id));
      
      if (isAllSelected) {
        // Deselect all from current page
        setSelected(prev => prev.filter(id => !allIds.includes(id)));
      } else {
        // Select all from current page (merge with existing selection)
        setSelected(prev => {
          const newSelection = [...prev];
          allIds.forEach(id => {
            if (!newSelection.includes(id)) {
              newSelection.push(id);
            }
          });
          return newSelection;
        });
      }
    }
  }, [enableSelection, paginatedProperties, selected]);

  const clearSelection = useCallback(() => {
    setSelected([]);
  }, []);

  // Selection state helpers
  const isSelected = useCallback((id: string) => selected.includes(id), [selected]);
  const isAllSelected = useMemo(() => {
    if (!enableSelection || paginatedProperties.length === 0) return false;
    return paginatedProperties.every(p => selected.includes(p.id.toString()));
  }, [enableSelection, paginatedProperties, selected]);
  
  const isIndeterminate = useMemo(() => {
    if (!enableSelection || paginatedProperties.length === 0) return false;
    const currentPageIds = paginatedProperties.map(p => p.id.toString());
    const selectedFromCurrentPage = currentPageIds.filter(id => selected.includes(id));
    return selectedFromCurrentPage.length > 0 && selectedFromCurrentPage.length < currentPageIds.length;
  }, [enableSelection, paginatedProperties, selected]);

  // Performance metrics
  const metrics = useMemo(() => ({
    totalProperties: properties.length,
    filteredProperties: sortedProperties.length,
    selectedProperties: selected.length,
    currentPage: page + 1,
    totalPages: Math.ceil(totalCount / rowsPerPage),
  }), [properties.length, sortedProperties.length, selected.length, page, totalCount, rowsPerPage]);

  return {
    // Data
    properties: paginatedProperties,
    allProperties: sortedProperties,
    totalCount,
    
    // Sorting state
    sortBy,
    sortOrder,
    handleSort,
    
    // Pagination state
    page,
    rowsPerPage,
    handlePageChange,
    handleRowsPerPageChange,
    
    // Selection state (only when enabled)
    selected: enableSelection ? selected : [],
    handleSelectionChange,
    handleSelectAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isIndeterminate,
    
    // Metrics
    metrics,
    
    // Config
    enableSelection,
    enableVirtualization,
  };
};

export default usePropertyTable;