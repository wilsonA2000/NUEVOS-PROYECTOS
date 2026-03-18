import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyService } from '../services/propertyService';
import { Property, CreatePropertyDto, UpdatePropertyDto, PropertySearchFilters, PropertyStats, PropertyFiltersResponse } from '../types/property';
import { useAuth } from './useAuth';
import { useDynamicQuery, useStableQuery, useStaticQuery, useOptimizedMutation, usePaginatedQuery } from './useOptimizedQueries';
import { cacheUtils } from '../lib/queryClient';

export const useProperties = (filters?: PropertySearchFilters) => {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  if (!queryClient) {
    throw new Error('QueryClient no está disponible. Verifica que QueryClientProvider esté configurado.');
  }

  // Apply role-based filtering
  const roleBasedFilters = React.useMemo(() => {
    const combinedFilters = { ...filters };

    // For tenants, only show available properties
    if (user?.user_type === 'tenant') {
      combinedFilters.status = 'available';
    }

    return combinedFilters;
  }, [filters, user?.user_type]);

  const { data: properties, isLoading, error } = useDynamicQuery<Property[]>(
    ['properties', 'list', JSON.stringify(roleBasedFilters), user?.user_type],
    () => {
      return propertyService.getProperties(roleBasedFilters);
    },
    {
      enabled: isAuthenticated,
      select: (data) => {
        // Apply additional client-side filtering for enhanced security
        let filteredData = data;

        // For tenants, ensure only available properties are shown
        if (user?.user_type === 'tenant') {
          filteredData = data?.filter(property => property.status === 'available') || [];
        }

        // Optimizar datos de propiedades
        return filteredData?.map(property => ({
          ...property,
          // Precargar imágenes optimizadas
          images: property.images?.map((img: any) => {
            const imgUrl = typeof img === 'string' ? img : img?.image || img?.image_url || img;
            if (typeof imgUrl === 'string') {
              return {
                original: imgUrl,
                webp: imgUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp'),
                thumbnail: imgUrl.replace(/\.(jpg|jpeg|png)$/i, '_thumb.webp'),
              };
            }
            return img; // Return as-is if not a processable string
          }),
          // Calcular métricas de rendimiento
          performance: {
            pricePerSqm: null,
            isNew: property.created_at ? new Date(property.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : false,
          },
        }));
      },
    } as any,
  );

  const createProperty = useMutation<Property, Error, FormData | CreatePropertyDto>({
    mutationFn: propertyService.createProperty,
    onSuccess: () => {
      if (!queryClient) {
        return;
      }

      try {
        // Invalidar todas las queries que empiecen con 'properties'
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        // También invalidar queries relacionadas
        queryClient.invalidateQueries({ queryKey: ['property-stats'] });
        queryClient.invalidateQueries({ queryKey: ['featured-properties'] });
        queryClient.invalidateQueries({ queryKey: ['trending-properties'] });

        // Forzar refetch de properties
        setTimeout(() => {
          if (queryClient) {
            queryClient.refetchQueries({ queryKey: ['properties'] });
          }
        }, 100);
      } catch {
        // Cache invalidation failed silently
      }
    },
  });

  const updateProperty = useMutation<Property, Error, { id: string; data: UpdatePropertyDto }>({
    mutationFn: ({ id, data }: { id: string; data: UpdatePropertyDto }) =>
      propertyService.updateProperty(id, data),
    onSuccess: () => {
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        queryClient.invalidateQueries({ queryKey: ['property-stats'] });
      }
    },
  });

  const deleteProperty = useMutation<void, Error, string>({
    mutationFn: propertyService.deleteProperty,
    onSuccess: () => {
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        queryClient.invalidateQueries({ queryKey: ['property-stats'] });
      }
    },
  });

  const searchProperties = useMutation<Property[], Error, PropertySearchFilters>({
    mutationFn: propertyService.searchProperties,
  });

  const toggleFavorite = useMutation<{ message: string }, Error, string>({
    mutationFn: (propertyId: string) => propertyService.toggleFavorite(propertyId),
    onSuccess: () => {
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        queryClient.invalidateQueries({ queryKey: ['favorites'] });
      }
    },
  });

  return {
    properties,
    isLoading,
    error,
    createProperty,
    updateProperty,
    deleteProperty,
    searchProperties,
    toggleFavorite,
  };
};

export const useProperty = (id: string) => {
  const { data: property, isLoading, error } = useQuery<Property>({
    queryKey: ['property', id],
    queryFn: () => propertyService.getProperty(id),
    enabled: !!id,
  });

  return {
    property,
    isLoading,
    error,
  };
};

export const useFeaturedProperties = () => {
  const { data: properties, isLoading, error } = useQuery<Property[]>({
    queryKey: ['featured-properties'],
    queryFn: propertyService.getFeaturedProperties,
  });

  return {
    properties,
    isLoading,
    error,
  };
};

export const useTrendingProperties = () => {
  const { data: properties, isLoading, error } = useQuery<Property[]>({
    queryKey: ['trending-properties'],
    queryFn: propertyService.getTrendingProperties,
  });

  return {
    properties,
    isLoading,
    error,
  };
};

export const usePropertyFilters = () => {
  const { data: filters, isLoading, error } = useQuery<PropertyFiltersResponse>({
    queryKey: ['property-filters'],
    queryFn: propertyService.getPropertyFilters,
  });

  return {
    filters,
    isLoading,
    error,
  };
};

export const usePropertyStats = () => {
  const { data: stats, isLoading, error } = useQuery<PropertyStats>({
    queryKey: ['property-stats'],
    queryFn: propertyService.getPropertyStats,
  });

  return {
    stats,
    isLoading,
    error,
  };
};

export const useFavorites = () => {
  const { data: favorites, isLoading, error } = useQuery<Property[]>({
    queryKey: ['favorites'],
    queryFn: propertyService.getFavorites,
  });

  return {
    favorites,
    isLoading,
    error,
  };
};