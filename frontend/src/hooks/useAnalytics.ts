import { useQuery } from '@tanstack/react-query';
import {
  getPropertyAnalytics,
  getPaymentAnalytics,
  getMaintenanceAnalytics,
  getOccupancyAnalytics,
} from '../lib/api';

interface PropertyAnalytics {
  total_properties: number;
  available_properties: number;
  rented_properties: number;
  maintenance_properties: number;
  average_rent: number;
  total_value: number;
}

interface PaymentAnalytics {
  total_revenue: number;
  pending_payments: number;
  overdue_payments: number;
  average_payment_time: number;
  payment_methods: {
    method: string;
    count: number;
    amount: number;
  }[];
}

interface MaintenanceAnalytics {
  total_requests: number;
  pending_requests: number;
  completed_requests: number;
  average_completion_time: number;
  priority_distribution: {
    priority: string;
    count: number;
  }[];
}

interface OccupancyAnalytics {
  occupancy_rate: number;
  average_tenancy_duration: number;
  renewal_rate: number;
  vacancy_rate: number;
}

export const useAnalytics = () => {
  const propertyAnalytics = useQuery<PropertyAnalytics>({
    queryKey: ['propertyAnalytics'],
    queryFn: getPropertyAnalytics,
  });

  const paymentAnalytics = useQuery<PaymentAnalytics>({
    queryKey: ['paymentAnalytics'],
    queryFn: getPaymentAnalytics,
  });

  const maintenanceAnalytics = useQuery<MaintenanceAnalytics>({
    queryKey: ['maintenanceAnalytics'],
    queryFn: getMaintenanceAnalytics,
  });

  const occupancyAnalytics = useQuery<OccupancyAnalytics>({
    queryKey: ['occupancyAnalytics'],
    queryFn: getOccupancyAnalytics,
  });

  return {
    propertyAnalytics,
    paymentAnalytics,
    maintenanceAnalytics,
    occupancyAnalytics,
    isLoading:
      propertyAnalytics.isLoading ||
      paymentAnalytics.isLoading ||
      maintenanceAnalytics.isLoading ||
      occupancyAnalytics.isLoading,
    isError:
      propertyAnalytics.isError ||
      paymentAnalytics.isError ||
      maintenanceAnalytics.isError ||
      occupancyAnalytics.isError,
  };
}; 