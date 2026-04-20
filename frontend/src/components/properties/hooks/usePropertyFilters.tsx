/**
 * Custom hook for managing property list filters
 * Extracted from PropertyList.tsx for better organization
 */

import { useState, useMemo, useCallback } from 'react';
import { PropertySearchFilters } from '../../../types/property';

interface UsePropertyFiltersReturn {
  filters: PropertySearchFilters;
  updateFilter: (key: keyof PropertySearchFilters, value: any) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

const initialFilters: PropertySearchFilters = {
  search: '',
  property_type: '',
  min_price: undefined,
  max_price: undefined,
  city: '',
  min_bedrooms: undefined,
  max_bedrooms: undefined,
  min_bathrooms: undefined,
  max_bathrooms: undefined,
  min_area: undefined,
  max_area: undefined,
  has_parking: undefined,
  has_pool: undefined,
  allows_pets: undefined,
  is_furnished: undefined,
  status: '',
};

export const usePropertyFilters = (): UsePropertyFiltersReturn => {
  const [filters, setFilters] = useState<PropertySearchFilters>(initialFilters);

  const updateFilter = useCallback(
    (key: keyof PropertySearchFilters, value: any) => {
      setFilters(prev => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (
        key === 'search' ||
        key === 'property_type' ||
        key === 'city' ||
        key === 'status'
      ) {
        return value !== '';
      }
      return value !== undefined;
    });
  }, [filters]);

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
  };
};
