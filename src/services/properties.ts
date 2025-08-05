import { api } from './api';
import { Property, PropertyFormData, PropertyFilters } from '../types/properties';

export const getProperties = async (filters?: PropertyFilters): Promise<Property[]> => {
  try {
    console.log('🔍 Obteniendo propiedades con filtros:', filters);
    const response = await api.get(`/properties/properties/`, {
      params: filters,
    });
    console.log('✅ Propiedades obtenidas exitosamente:', response.data);
    return response.data.results || response.data;
  } catch (error: any) {
    console.error('❌ Error obteniendo propiedades:', error);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    throw error;
  }
};

export const getProperty = async (id: number): Promise<Property> => {
  try {
    const response = await api.get(`/properties/properties/${id}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching property:', error);
    throw error;
  }
}; 