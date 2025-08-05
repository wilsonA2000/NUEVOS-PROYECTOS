import { api } from './api';
import { Payment, PaymentFormData, PaymentFilters } from '../types/payments';

export const getPayments = async (filters?: PaymentFilters): Promise<Payment[]> => {
  try {
    const response = await api.get(`/payments/`, {
      params: filters,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
};

export const getPayment = async (id: number): Promise<Payment> => {
  const response = await api.get(`/payments/${id}/`);
  return response.data;
};

export const cancelPayment = async (id: number): Promise<Payment> => {
  const response = await api.post(`/payments/${id}/cancel/`);
  return response.data;
}; 