import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropertyForm from '../../components/properties/PropertyForm';
import { useCreateProperty } from '../../hooks/useCreateProperty';
import { useUpdateProperty } from '../../hooks/useUpdateProperty';
import { useProperty } from '../../hooks/useProperties';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

const PropertyFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  
  // Determinar si estamos en modo edición
  const isEditMode = Boolean(id);
  
  // Cargar datos de la propiedad si estamos en modo edición
  const { property, isLoading: isLoadingProperty, error: propertyError } = useProperty(id || '');

  const handleSubmit = async (formData: FormData): Promise<any> => {
    try {
      let result;
      
      if (isEditMode && id) {
        // Modo edición - actualizar propiedad existente usando hook
        result = await updateProperty.mutateAsync({ id, data: formData });
        console.log('✅ Propiedad actualizada exitosamente:', result);
      } else {
        // Modo creación - crear nueva propiedad
        result = await createProperty.mutateAsync(formData);
        console.log('✅ Propiedad creada exitosamente:', result);
      }
      
      return result;
    } catch (error: any) {
      console.error(`❌ PropertyFormPage: Error ${isEditMode ? 'actualizando' : 'creando'} propiedad:`, error.response?.data || error.message);
      console.error('📊 PropertyFormPage: Error completo:', error);
      
      throw error;
    }
  };

  // Estado de carga mientras se obtienen los datos de la propiedad
  if (isEditMode && isLoadingProperty) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="400px">
        <CircularProgress size={40} />
        <Typography sx={{ mt: 2 }}>Cargando datos de la propiedad...</Typography>
      </Box>
    );
  }

  // Error al cargar la propiedad
  if (isEditMode && propertyError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error cargando la propiedad: {propertyError.message}
        </Alert>
      </Box>
    );
  }

  // Propiedad no encontrada
  if (isEditMode && !property) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Propiedad no encontrada
        </Alert>
      </Box>
    );
  }

  return (
    <PropertyForm
      onSubmit={handleSubmit}
      isLoading={isEditMode ? updateProperty.isPending : createProperty.isPending}
      error={isEditMode ? updateProperty.error?.message : createProperty.error?.message}
      initialData={isEditMode ? property : undefined}
      isEditMode={isEditMode}
    />
  );
};

export default PropertyFormPage; 