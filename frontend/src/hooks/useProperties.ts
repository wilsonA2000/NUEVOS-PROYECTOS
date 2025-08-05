import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyService } from '../services/propertyService';
import { Property, CreatePropertyDto, UpdatePropertyDto, PropertySearchFilters, PropertyStats, PropertyFiltersResponse } from '../types/property';
import { useAuth } from './useAuth';
import { useDynamicQuery, useStableQuery, useStaticQuery, useOptimizedMutation, usePaginatedQuery } from './useOptimizedQueries';
import { cacheUtils } from '../lib/queryClient';

export const useProperties = (filters?: PropertySearchFilters) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  // Verificación robusta del queryClient - solo log en desarrollo
  if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_QUERIES) {
    console.log('🔍 useProperties: queryClient inicializado:', !!queryClient);
    console.log('🔍 useProperties: typeof queryClient:', typeof queryClient);
  }
  
  if (!queryClient) {
    console.error('❌ useProperties: queryClient es null/undefined');
    throw new Error('QueryClient no está disponible. Verifica que QueryClientProvider esté configurado.');
  }

  const { data: properties, isLoading, error } = useDynamicQuery<Property[]>(
    ['properties', 'list', filters],
    () => {

return propertyService.getProperties(filters);
    },
    {
      enabled: isAuthenticated,
      select: (data) => {
        // Optimizar datos de propiedades
        return data?.map(property => ({
          ...property,
          // Precargar imágenes optimizadas
          images: property.images?.map((img: string) => ({
            original: img,
            webp: img.replace(/\.(jpg|jpeg|png)$/i, '.webp'),
            thumbnail: img.replace(/\.(jpg|jpeg|png)$/i, '_thumb.webp'),
          })),
          // Calcular métricas de rendimiento
          performance: {
            pricePerSqm: property.price && property.area ? property.price / property.area : null,
            isNew: property.created_at ? new Date(property.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : false,
          },
        }));
      },
      onSuccess: (data) => {

// Prefetch propiedades relacionadas
        data?.slice(0, 3).forEach(property => {
          cacheUtils.prefetchQuery(
            ['property', 'detail', property.id],
            () => propertyService.getProperty(property.id.toString())
          );
        });
      },
      onError: (error) => {
        console.error('❌ useProperties: Error loading properties:', error);
      }
    }
  );

  const createProperty = useMutation<Property, Error, FormData | CreatePropertyDto>({
    mutationFn: propertyService.createProperty,
    onSuccess: (data) => {
      console.log('✅ Propiedad creada exitosamente, invalidando caché:', data);
      console.log('🔍 onSuccess: queryClient tipo:', typeof queryClient);
      console.log('🔍 onSuccess: queryClient existe:', !!queryClient);
      
      // Verificación más robusta
      if (!queryClient) {
        console.error('❌ onSuccess: queryClient es null/undefined!');
        console.error('❌ onSuccess: No se puede invalidar caché');
        return;
      }
      
      try {
        // Invalidar todas las queries que empiecen con 'properties'
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        // También invalidar queries relacionadas
        queryClient.invalidateQueries({ queryKey: ['property-stats'] });
        queryClient.invalidateQueries({ queryKey: ['featured-properties'] });
        queryClient.invalidateQueries({ queryKey: ['trending-properties'] });
        
        console.log('✅ Caché invalidado correctamente');
        
        // Forzar refetch de properties
        setTimeout(() => {
          if (queryClient) {
            queryClient.refetchQueries({ queryKey: ['properties'] });
          }
        }, 100);
      } catch (error) {
        console.error('❌ Error invalidando caché:', error);
      }
    },
    onError: (error) => {
      console.error('❌ Error en createProperty mutation:', error);
      console.error('   Error details:', error.message);
      console.error('   Error response:', error.response?.data);
    }
  });

  const updateProperty = useMutation<Property, Error, { id: string; data: UpdatePropertyDto }>({
    mutationFn: ({ id, data }: { id: string; data: UpdatePropertyDto }) =>
      propertyService.updateProperty(id, data),
    onSuccess: (data) => {
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        queryClient.invalidateQueries({ queryKey: ['property-stats'] });
      }
    },
  });

  const deleteProperty = useMutation<void, Error, string>({
    mutationFn: propertyService.deleteProperty,
    onSuccess: (data) => {
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        queryClient.invalidateQueries({ queryKey: ['property-stats'] });
      }
    },
  });

  const searchProperties = useMutation<Property[], Error, PropertySearchFilters>({
    mutationFn: propertyService.searchProperties,
  });

  const toggleFavorite = useMutation<void, Error, string>({
    mutationFn: propertyService.toggleFavorite,
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