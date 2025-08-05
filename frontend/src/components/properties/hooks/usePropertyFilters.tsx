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
  min_price: '',
  max_price: '',
  city: '',
  min_bedrooms: '',
  max_bedrooms: '',
  min_bathrooms: '',
  max_bathrooms: '',
  min_area: '',
  max_area: '',
  has_parking: undefined,
  has_pool: undefined,
  allows_pets: undefined,
  is_furnished: undefined,
  status: '',
};

export const usePropertyFilters = (): UsePropertyFiltersReturn => {
  const [filters, setFilters] = useState<PropertySearchFilters>(initialFilters);

  const updateFilter = useCallback((key: keyof PropertySearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'search' || key === 'property_type' || key === 'city' || key === 'status') {
        return value !== '';
      }
      return value !== '' && value !== undefined;
    });
  }, [filters]);

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
  };
};