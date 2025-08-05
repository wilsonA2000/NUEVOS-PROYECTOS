import axios from 'axios';
import { User, LoginDto, RegisterDto } from '../types/user';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
  };
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await axios.post(`${API_URL}/users/auth/login/`, {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
};

export const register = async (email: string, password: string, name: string): Promise<AuthResponse> => {
  try {
    const response = await axios.post(`${API_URL}/users/auth/register/`, {
      email,
      password,
      name,
    });
    return response.data;
  } catch (error) {
    console.error('Error during registration:', error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      await axios.post(
        `${API_URL}/users/auth/logout/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    }
  } catch (error) {
    console.error('Error during logout:', error);
    throw error;
  }
}; 