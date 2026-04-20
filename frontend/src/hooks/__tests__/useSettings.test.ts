import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSettings } from '../useSettings';
import { getSettings, updateSettings } from '../../lib/api';

// Mock lib/api
jest.mock('../../lib/api', () => ({
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
}));

const mockGetSettings = getSettings as jest.MockedFunction<typeof getSettings>;
const mockUpdateSettings = updateSettings as jest.MockedFunction<
  typeof updateSettings
>;

// Test wrapper with fresh QueryClient per test
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useSettings Hook', () => {
  const mockSettings = {
    id: 1,
    company_name: 'VeriHome',
    company_email: 'info@verihome.com',
    company_phone: '+57 300 1234567',
    company_address: 'Bogota, Colombia',
    currency: 'COP',
    timezone: 'America/Bogota',
    date_format: 'DD/MM/YYYY',
    language: 'es',
    notification_settings: {
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
    },
    payment_settings: {
      payment_methods: ['stripe', 'paypal'],
      late_fee_percentage: 5,
      grace_period_days: 5,
    },
    maintenance_settings: {
      auto_assign: false,
      default_priority: 'medium',
      notification_threshold: 24,
    },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSettings.mockResolvedValue(mockSettings as any);
  });

  it('should fetch settings on mount', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.settings.data).toEqual(mockSettings);
    });

    expect(mockGetSettings).toHaveBeenCalled();
  });

  it('should expose loading state', () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.settings.isLoading !== undefined).toBe(true);
  });

  it('should handle settings fetch error', async () => {
    mockGetSettings.mockRejectedValue(new Error('Failed to fetch settings'));

    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.settings.error).toBeTruthy();
    });
  });

  it('should update settings via mutation', async () => {
    const updatedSettings = { ...mockSettings, company_name: 'VeriHome Pro' };
    mockUpdateSettings.mockResolvedValue(updatedSettings as any);

    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.settings.data).toBeDefined();
    });

    await act(async () => {
      await result.current.update.mutateAsync({ company_name: 'VeriHome Pro' });
    });

    expect(mockUpdateSettings).toHaveBeenCalledTimes(1);
    expect(mockUpdateSettings.mock.calls[0][0]).toEqual({
      company_name: 'VeriHome Pro',
    });
    await waitFor(() => {
      expect(result.current.update.isSuccess).toBe(true);
    });
  });

  it('should handle update error', async () => {
    mockUpdateSettings.mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.update.mutateAsync({ company_name: '' });
      } catch {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.update.isError).toBe(true);
    });
  });

  it('should expose reset mutation', () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.reset).toBeDefined();
    expect(result.current.reset.mutateAsync).toBeDefined();
  });

  it('should reset settings via mutation', async () => {
    const defaultSettings = { ...mockSettings, company_name: 'Default' };

    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.reset.mutateAsync();
    });

    await waitFor(() => {
      expect(result.current.reset.isSuccess).toBe(true);
    });
  });

  it('should update notification settings', async () => {
    const updatedNotifSettings = {
      notification_settings: {
        email_notifications: false,
        push_notifications: true,
        sms_notifications: true,
      },
    };
    mockUpdateSettings.mockResolvedValue({
      ...mockSettings,
      ...updatedNotifSettings,
    } as any);

    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.settings.data).toBeDefined();
    });

    await act(async () => {
      await result.current.update.mutateAsync(updatedNotifSettings);
    });

    expect(mockUpdateSettings).toHaveBeenCalledTimes(1);
    expect(mockUpdateSettings.mock.calls[0][0]).toEqual(updatedNotifSettings);
    await waitFor(() => {
      expect(result.current.update.isSuccess).toBe(true);
    });
  });

  it('should return settings data structure with all expected fields', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.settings.data).toBeDefined();
    });

    const data = result.current.settings.data;
    expect(data).toHaveProperty('company_name');
    expect(data).toHaveProperty('currency');
    expect(data).toHaveProperty('notification_settings');
    expect(data).toHaveProperty('payment_settings');
    expect(data).toHaveProperty('maintenance_settings');
  });
});
