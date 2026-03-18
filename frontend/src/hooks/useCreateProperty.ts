import { useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyService } from '../services/propertyService';
import { Property, CreatePropertyDto } from '../types/property';

/**
 * Hook específico para crear propiedades con manejo robusto de errores
 */
export const useCreateProperty = () => {
  const queryClient = useQueryClient();

  return useMutation<Property, Error, FormData | CreatePropertyDto>({
    mutationFn: propertyService.createProperty,
    onSuccess: (data) => {
      // Verificar queryClient de forma segura
      if (queryClient && typeof queryClient.invalidateQueries === 'function') {
        try {
          queryClient.invalidateQueries({ queryKey: ['properties'] });
          queryClient.invalidateQueries({ queryKey: ['property-stats'] });
          queryClient.invalidateQueries({ queryKey: ['featured-properties'] });
          queryClient.invalidateQueries({ queryKey: ['trending-properties'] });
          
          // Refetch después de un pequeño delay
          setTimeout(() => {
            if (queryClient && typeof queryClient.refetchQueries === 'function') {
              queryClient.refetchQueries({ queryKey: ['properties'] });
            }
          }, 100);
        } catch (error) {
          // Cache invalidation error silently handled
        }
      } else {
        // queryClient not available for cache invalidation
      }
    },
    onError: (error: any) => {
      // Mutation error handled by React Query
    },
  });
};