import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMaintenanceRequests,
  getMaintenanceRequest,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
  assignMaintenanceRequest,
  completeMaintenanceRequest,
} from '../lib/api';

interface MaintenanceRequest {
  id: number;
  property_id: number;
  tenant_id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: number;
  scheduled_date?: string;
  completed_date?: string;
  created_at: string;
  updated_at: string;
}

interface MaintenanceFilters {
  status?: string;
  priority?: string;
  property_id?: number;
  tenant_id?: number;
  assigned_to?: number;
}

export const useMaintenance = (filters?: MaintenanceFilters) => {
  const queryClient = useQueryClient();

  const requests = useQuery<MaintenanceRequest[]>({
    queryKey: ['maintenanceRequests', filters],
    queryFn: () => getMaintenanceRequests(filters),
  });

  const create = useMutation<
    MaintenanceRequest,
    Error,
    Omit<MaintenanceRequest, 'id' | 'status' | 'created_at' | 'updated_at'>
  >({
    mutationFn: createMaintenanceRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRequests'] });
    },
  });

  const update = useMutation<
    MaintenanceRequest,
    Error,
    {
      id: number;
      data: Partial<Omit<MaintenanceRequest, 'id' | 'created_at' | 'updated_at'>>;
    }
  >({
    mutationFn: ({ id, data }) => updateMaintenanceRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRequests'] });
    },
  });

  const remove = useMutation<void, Error, number>({
    mutationFn: deleteMaintenanceRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRequests'] });
    },
  });

  const assign = useMutation<
    MaintenanceRequest,
    Error,
    { id: number; assigned_to: number; scheduled_date: string }
  >({
    mutationFn: ({ id, assigned_to, scheduled_date }) =>
      assignMaintenanceRequest(id, assigned_to, scheduled_date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRequests'] });
    },
  });

  const complete = useMutation<MaintenanceRequest, Error, number>({
    mutationFn: completeMaintenanceRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRequests'] });
    },
  });

  return {
    requests,
    create,
    update,
    remove,
    assign,
    complete,
  };
}; 