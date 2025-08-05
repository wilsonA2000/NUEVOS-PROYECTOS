import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSettings,
  updateSettings,
  resetSettings,
} from '../lib/api';

interface Settings {
  id: number;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  company_logo?: string;
  currency: string;
  timezone: string;
  date_format: string;
  language: string;
  notification_settings: {
    email_notifications: boolean;
    push_notifications: boolean;
    sms_notifications: boolean;
  };
  payment_settings: {
    payment_methods: string[];
    late_fee_percentage: number;
    grace_period_days: number;
  };
  maintenance_settings: {
    auto_assign: boolean;
    default_priority: string;
    notification_threshold: number;
  };
  created_at: string;
  updated_at: string;
}

export const useSettings = () => {
  const queryClient = useQueryClient();

  const settings = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const update = useMutation<Settings, Error, Partial<Settings>>({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const reset = useMutation<Settings, Error, void>({
    mutationFn: resetSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  return {
    settings,
    update,
    reset,
  };
}; 