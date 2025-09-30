import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { userService } from '../services/userService';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'landlord' | 'tenant' | 'service_provider';
  is_verified: boolean;
  profile?: any;
}

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/users/me/');
      setUser(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.patch('/users/me/', userData);
      setUser(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    fetchUser,
    updateUser,
    refetch: fetchUser
  };
};