import { api } from './api';
import { Message, MessageFilters } from '../types/messages';

export const getMessages = async (filters?: MessageFilters): Promise<Message[]> => {
  try {
    const response = await api.get(`/messages/`, {
      params: filters,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

export const createMessage = async (message: Omit<Message, 'id' | 'created_at' | 'updated_at'>): Promise<Message> => {
  try {
    const response = await api.post(`/messages/`, message);
    return response.data;
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
};

export const updateMessage = async (id: number, message: Partial<Omit<Message, 'id' | 'created_at' | 'updated_at'>>): Promise<Message> => {
  try {
    const response = await api.patch(`/messages/${id}/`, message);
    return response.data;
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
}; 