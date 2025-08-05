import axios from 'axios';
import { Message, MessageFilters } from '../types/messages';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const getMessages = async (filters?: MessageFilters): Promise<Message[]> => {
  try {
    const response = await axios.get(`${API_URL}/messages/`, {
      params: filters,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

export const createMessage = async (message: Omit<Message, 'id' | 'created_at' | 'updated_at'>): Promise<Message> => {
  try {
    const response = await axios.post(
      `${API_URL}/messages/`,
      message,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
};

export const updateMessage = async (id: number, message: Partial<Omit<Message, 'id' | 'created_at' | 'updated_at'>>): Promise<Message> => {
  try {
    const response = await axios.patch(
      `${API_URL}/messages/${id}/`,
      message,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
};

export const deleteMessage = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/messages/${id}/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}; 