import { api } from './api';
import { Property, CreatePropertyDto, UpdatePropertyDto, PropertySearchFilters } from '../types/property';

export const propertyService = {
  getProperties: async (filters?: PropertySearchFilters): Promise<Property[]> => {
    try {

const response = await api.get('/properties/properties/', { params: filters });

return response.data.results || response.data;
    } catch (error: any) {
      console.error('❌ PropertyService: Error obteniendo propiedades:', error);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }
      throw error;
    }
  },

  getProperty: async (id: string): Promise<Property> => {
    const response = await api.get(`/properties/properties/${id}/`);
    return response.data;
  },

  createProperty: async (data: CreatePropertyDto | FormData): Promise<Property> => {
    try {
      console.log('🚀 PropertyService: Iniciando creación de propiedad');
      
      if (data instanceof FormData) {
        console.log('📦 PropertyService: Enviando FormData');
        // Debug FormData contents
        for (let [key, value] of data.entries()) {
          if (value instanceof File) {
            console.log(`📄 FormData: ${key} = File(${value.name}, ${value.size} bytes)`);
          } else {
            console.log(`📝 FormData: ${key} = ${value}`);
          }
        }
      } else {
        console.log('📦 PropertyService: Datos a enviar:', data);
      }

      const response = await api.post('/properties/properties/', data, 
        data instanceof FormData ? { 
          headers: { 
            'Content-Type': 'multipart/form-data' 
          } 
        } : undefined
      );

      console.log('✅ PropertyService: Propiedad creada exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ PropertyService: Error creando propiedad:', error);
      console.error('   Response:', error.response?.data);
      console.error('   Status:', error.response?.status);
      console.error('   Request config:', error.config);
      throw error;
    }
  },

  updateProperty: async (id: string, data: UpdatePropertyDto): Promise<Property> => {
    const response = await api.put(`/properties/properties/${id}/`, data);
    return response.data;
  },

  deleteProperty: async (id: string): Promise<void> => {
    await api.delete(`/properties/properties/${id}/`);
  },

  searchProperties: async (filters: PropertySearchFilters): Promise<Property[]> => {
    const response = await api.get('/properties/search/', { params: filters });
    return response.data.results || response.data;
  },

  getFeaturedProperties: async (): Promise<Property[]> => {
    const response = await api.get('/properties/featured/');
    return response.data.results || response.data;
  },

  getTrendingProperties: async (): Promise<Property[]> => {
    const response = await api.get('/properties/trending/');
    return response.data.results || response.data;
  },

  getPropertyFilters: async () => {
    const response = await api.get('/properties/filters/');
    return response.data;
  },

  getPropertyStats: async () => {
    const response = await api.get('/properties/stats/');
    return response.data;
  },

  toggleFavorite: async (propertyId: string): Promise<{ message: string }> => {
    const response = await api.post(`/properties/properties/${propertyId}/toggle-favorite/`);
    return response.data;
  },

  getFavorites: async (): Promise<Property[]> => {
    const response = await api.get('/properties/favorites/');
    return response.data.results || response.data;
  },

  contactLandlord: async (propertyId: string, data: any): Promise<{ message: string }> => {
    try {

const response = await api.post(`/properties/properties/${propertyId}/contact-landlord/`, data);

return response.data;
    } catch (error: any) {
      console.error('❌ PropertyService: Error contactando arrendador:', error);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }
      throw error;
    }
  },
}; 