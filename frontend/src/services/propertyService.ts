import { api } from './api';
import {
  Property,
  CreatePropertyDto,
  UpdatePropertyDto,
  PropertySearchFilters,
} from '../types/property';

export const propertyService = {
  getProperties: async (
    filters?: PropertySearchFilters,
  ): Promise<Property[]> => {
    const response = await api.get('/properties/', { params: filters });

    return response.data.results || response.data;
  },

  getProperty: async (id: string): Promise<Property> => {
    const response = await api.get(`/properties/${id}/`);
    return response.data;
  },

  createProperty: async (
    data: CreatePropertyDto | FormData,
  ): Promise<Property> => {
    const response = await api.post(
      '/properties/',
      data,
      data instanceof FormData
        ? {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        : undefined,
    );

    return response.data;
  },

  updateProperty: async (
    id: string,
    data: UpdatePropertyDto | FormData,
  ): Promise<Property> => {
    const response = await api.put(
      `/properties/${id}/`,
      data,
      data instanceof FormData
        ? {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        : undefined,
    );

    return response.data;
  },

  deleteProperty: async (id: string): Promise<void> => {
    await api.delete(`/properties/${id}/`);
  },

  searchProperties: async (
    filters: PropertySearchFilters,
  ): Promise<Property[]> => {
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
    const response = await api.post(
      `/properties/${propertyId}/toggle-favorite/`,
    );
    return response.data;
  },

  getFavorites: async (): Promise<Property[]> => {
    const response = await api.get('/properties/favorites/');
    return response.data.results || response.data;
  },

  contactLandlord: async (
    propertyId: string,
    data: any,
  ): Promise<{ message: string }> => {
    const response = await api.post(
      `/properties/${propertyId}/contact-landlord/`,
      data,
    );

    return response.data;
  },
};
