import { api } from './api';

export const ratingService = {
  getRatings: async (): Promise<any[]> => {
    const response = await api.get('/ratings/ratings/');
    return response.data;
  },

  getRating: async (id: string): Promise<any> => {
    const response = await api.get(`/ratings/ratings/${id}/`);
    return response.data;
  },

  createRating: async (data: any): Promise<any> => {
    const response = await api.post('/ratings/ratings/', data);
    return response.data;
  },

  updateRating: async (id: string, data: any): Promise<any> => {
    const response = await api.put(`/ratings/ratings/${id}/`, data);
    return response.data;
  },

  deleteRating: async (id: string): Promise<void> => {
    await api.delete(`/ratings/ratings/${id}/`);
  },
}; 