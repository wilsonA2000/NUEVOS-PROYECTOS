import { api } from './api';
import { Contract, ContractFormData, ContractFilters } from '../types/contracts';

export const getContracts = async (filters?: ContractFilters): Promise<Contract[]> => {
  try {
    const response = await api.get(`/contracts/`, {
      params: filters,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching contracts:', error);
    throw error;
  }
};

export const getContract = async (id: number): Promise<Contract> => {
  const response = await api.get(`/contracts/${id}/`);
  return response.data;
};

export const terminateContract = async (id: number, reason: string): Promise<Contract> => {
  const response = await api.post(`/contracts/${id}/terminate/`, { reason });
  return response.data;
};

export const renewContract = async (id: number, newEndDate: string): Promise<Contract> => {
  const response = await api.post(`/contracts/${id}/renew/`, { end_date: newEndDate });
  return response.data;
}; 