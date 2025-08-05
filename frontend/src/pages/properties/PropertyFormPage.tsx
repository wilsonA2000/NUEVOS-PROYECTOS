import React from 'react';
import { useNavigate } from 'react-router-dom';
import PropertyForm from '../../components/properties/PropertyForm';
import { useCreateProperty } from '../../hooks/useCreateProperty';

const PropertyFormPage: React.FC = () => {
  const navigate = useNavigate();
  const createProperty = useCreateProperty();

  const handleSubmit = async (formData: FormData): Promise<any> => {
    try {
      const result = await createProperty.mutateAsync(formData);
      
      // Retornar el resultado para que PropertyForm lo pueda usar
      return result;
    } catch (error: any) {
      console.error('❌ PropertyFormPage: Error creando propiedad:', error.response?.data || error.message);
      console.error('📊 PropertyFormPage: Error completo:', error);
      
      // Re-lanzar el error para que el formulario lo maneje
      throw error;
    }
  };

  return (
    <PropertyForm
      onSubmit={handleSubmit}
      isLoading={createProperty.isPending}
      error={createProperty.error?.message}
    />
  );
};

export default PropertyFormPage; 