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
      console.log('✅ useUpdateProperty: Propiedad actualizada exitosamente:', data);
      
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
          
          console.log('✅ useUpdateProperty: Caché invalidado correctamente');
          
          // Refetch después de un pequeño delay
          setTimeout(() => {
            if (queryClient && typeof queryClient.refetchQueries === 'function') {
              queryClient.refetchQueries({ queryKey: ['properties'] });
              queryClient.refetchQueries({ queryKey: ['property', variables.id] });
            }
          }, 100);
        } catch (error) {
          console.error('❌ useUpdateProperty: Error invalidando caché:', error);
        }
      } else {
        console.warn('⚠️ useUpdateProperty: queryClient no disponible para invalidar caché');
      }
    },
    onError: (error: any) => {
      console.error('❌ useUpdateProperty: Error en mutation:', error);
      console.error('   Error details:', error.message);
      console.error('   Error response:', error.response?.data);
    }
  });
};