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
      console.log('✅ useCreateProperty: Propiedad creada exitosamente:', data);
      
      // Verificar queryClient de forma segura
      if (queryClient && typeof queryClient.invalidateQueries === 'function') {
        try {
          queryClient.invalidateQueries({ queryKey: ['properties'] });
          queryClient.invalidateQueries({ queryKey: ['property-stats'] });
          queryClient.invalidateQueries({ queryKey: ['featured-properties'] });
          queryClient.invalidateQueries({ queryKey: ['trending-properties'] });
          
          console.log('✅ useCreateProperty: Caché invalidado correctamente');
          
          // Refetch después de un pequeño delay
          setTimeout(() => {
            if (queryClient && typeof queryClient.refetchQueries === 'function') {
              queryClient.refetchQueries({ queryKey: ['properties'] });
            }
          }, 100);
        } catch (error) {
          console.error('❌ useCreateProperty: Error invalidando caché:', error);
        }
      } else {
        console.warn('⚠️ useCreateProperty: queryClient no disponible para invalidar caché');
      }
    },
    onError: (error) => {
      console.error('❌ useCreateProperty: Error en mutation:', error);
      console.error('   Error details:', error.message);
      console.error('   Error response:', error.response?.data);
    }
  });
};