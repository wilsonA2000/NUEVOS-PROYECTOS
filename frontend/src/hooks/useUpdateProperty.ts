import { useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyService } from '../services/propertyService';
import { Property, UpdatePropertyDto } from '../types/property';

interface UpdatePropertyParams {
  id: string;
  data: FormData | UpdatePropertyDto;
}

/**
 * Hook específico para actualizar propiedades con manejo robusto de errores
 */
export const useUpdateProperty = () => {
  const queryClient = useQueryClient();

  return useMutation<Property, Error, UpdatePropertyParams>({
    mutationFn: ({ id, data }) => propertyService.updateProperty(id, data),
    onSuccess: (data, variables) => {
      // Verificar queryClient de forma segura
      if (queryClient && typeof queryClient.invalidateQueries === 'function') {
        try {
          // Invalidar caché específico de la propiedad
          queryClient.invalidateQueries({ queryKey: ['property', variables.id] });
          
          // Invalidar listas y estadísticas
          queryClient.invalidateQueries({ queryKey: ['properties'] });
          queryClient.invalidateQueries({ queryKey: ['property-stats'] });
          queryClient.invalidateQueries({ queryKey: ['featured-properties'] });
          queryClient.invalidateQueries({ queryKey: ['trending-properties'] });
          
          // Refetch después de un pequeño delay
          setTimeout(() => {
            if (queryClient && typeof queryClient.refetchQueries === 'function') {
              queryClient.refetchQueries({ queryKey: ['properties'] });
              queryClient.refetchQueries({ queryKey: ['property', variables.id] });
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