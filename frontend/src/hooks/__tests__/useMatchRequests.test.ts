import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMatchRequests } from '../useMatchRequests';
import { matchingService } from '../../services/matchingService';
import { useAuth } from '../useAuth';

// Mock matching service
jest.mock('../../services/matchingService', () => ({
  matchingService: {
    getMyMatchRequests: jest.fn(),
    getMatchStatistics: jest.fn(),
    getDashboardData: jest.fn(),
    markMatchRequestViewed: jest.fn(),
    acceptMatchRequest: jest.fn(),
    rejectMatchRequest: jest.fn(),
    createMatchRequest: jest.fn(),
    getMatchCompatibility: jest.fn(),
    getMatchStatusColor: jest.fn().mockReturnValue('primary'),
    getMatchStatusText: jest.fn().mockReturnValue('Pendiente'),
    getPriorityColor: jest.fn().mockReturnValue('warning'),
    getPriorityText: jest.fn().mockReturnValue('Media'),
    formatCurrency: jest.fn().mockImplementation((amount: number | null) =>
      amount ? `$${amount.toLocaleString()}` : '$0',
    ),
    calculateDaysUntilExpiry: jest.fn().mockReturnValue(5),
    isMatchExpiringSoon: jest.fn().mockReturnValue(false),
  },
}));

// Mock useAuth hook
jest.mock('../useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Test wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchInterval: false },
      mutations: { retry: false },
    },
  });

  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    children,
  );
};

describe('useMatchRequests Hook', () => {
  const mockMatchRequests = [
    {
      id: 'match-1',
      match_code: 'MR-001',
      property: 'prop-1',
      property_title: 'Apartamento Centro',
      tenant: 'tenant-1',
      tenant_name: 'Juan Perez',
      landlord: 'landlord-1',
      status: 'pending' as const,
      priority: 'medium' as const,
      tenant_message: 'Interesado en el apartamento',
      tenant_phone: '+57 300 123 4567',
      tenant_email: 'juan@example.com',
      monthly_income: 5000000,
      employment_type: 'employee',
      created_at: '2025-01-01T10:00:00Z',
      expires_at: '2025-02-01T10:00:00Z',
    },
    {
      id: 'match-2',
      match_code: 'MR-002',
      property: 'prop-2',
      tenant: 'tenant-2',
      tenant_name: 'Maria Garcia',
      landlord: 'landlord-1',
      status: 'accepted' as const,
      priority: 'high' as const,
      tenant_message: 'Me gustaria visitar',
      tenant_phone: '+57 301 987 6543',
      tenant_email: 'maria@example.com',
      monthly_income: 6000000,
      employment_type: 'independent',
      created_at: '2025-01-02T10:00:00Z',
      expires_at: '2025-02-02T10:00:00Z',
    },
  ];

  const mockStatistics = {
    pending: 3,
    viewed: 1,
    accepted: 2,
    rejected: 1,
    expired: 0,
    response_rate: 75,
    acceptance_rate: 50,
    avg_response_time: 24,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'landlord@example.com', first_name: 'Test', last_name: 'Landlord', role: 'landlord', user_type: 'landlord', is_verified: true },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn() as any,
      logout: jest.fn(),
      refreshToken: jest.fn(),
    });

    (matchingService.getMyMatchRequests as jest.Mock).mockResolvedValue({
      data: { results: mockMatchRequests },
    });
    (matchingService.getMatchStatistics as jest.Mock).mockResolvedValue({
      data: mockStatistics,
    });
    (matchingService.getDashboardData as jest.Mock).mockResolvedValue({
      data: { user_type: 'landlord', recent_requests: [], unread_notifications: 0, statistics: mockStatistics },
    });
  });

  it('should fetch match requests when user is authenticated', async () => {
    const { result } = renderHook(() => useMatchRequests(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.matchRequests).toEqual(mockMatchRequests);
    });

    expect(result.current.isLoading).toBe(false);
    expect(matchingService.getMyMatchRequests).toHaveBeenCalled();
  });

  it('should return empty array when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn() as any,
      logout: jest.fn(),
      refreshToken: jest.fn(),
    });

    const { result } = renderHook(() => useMatchRequests(), {
      wrapper: TestWrapper,
    });

    expect(result.current.matchRequests).toEqual([]);
    expect(matchingService.getMyMatchRequests).not.toHaveBeenCalled();
  });

  it('should separate received requests for landlord users', async () => {
    const { result } = renderHook(() => useMatchRequests(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.receivedRequests).toEqual(mockMatchRequests);
      expect(result.current.sentRequests).toEqual([]);
    });
  });

  it('should separate sent requests for tenant users', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, email: 'tenant@example.com', first_name: 'Test', last_name: 'Tenant', role: 'tenant', user_type: 'tenant', is_verified: true },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn() as any,
      logout: jest.fn(),
      refreshToken: jest.fn(),
    });

    const { result } = renderHook(() => useMatchRequests(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.sentRequests).toEqual(mockMatchRequests);
      expect(result.current.receivedRequests).toEqual([]);
    });
  });

  it('should accept a match request', async () => {
    (matchingService.acceptMatchRequest as jest.Mock).mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useMatchRequests(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.matchRequests).toHaveLength(2);
    });

    await act(async () => {
      await result.current.acceptRequest('match-1', 'Bienvenido');
    });

    expect(matchingService.acceptMatchRequest).toHaveBeenCalledWith('match-1', { message: 'Bienvenido' });
  });

  it('should reject a match request', async () => {
    (matchingService.rejectMatchRequest as jest.Mock).mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useMatchRequests(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.matchRequests).toHaveLength(2);
    });

    await act(async () => {
      await result.current.rejectRequest('match-1', 'No cumple requisitos');
    });

    expect(matchingService.rejectMatchRequest).toHaveBeenCalledWith('match-1', { message: 'No cumple requisitos' });
  });

  it('should create a match request', async () => {
    (matchingService.createMatchRequest as jest.Mock).mockResolvedValue({ data: { id: 'match-3' } });

    const { result } = renderHook(() => useMatchRequests(), {
      wrapper: TestWrapper,
    });

    const newRequest = {
      property: 'prop-3',
      tenant_message: 'Estoy interesado',
      tenant_phone: '+57 300 111 2222',
      tenant_email: 'new@example.com',
      monthly_income: 4000000,
      employment_type: 'employee',
      lease_duration_months: 12,
      has_rental_references: true,
      has_employment_proof: true,
      has_credit_check: false,
      number_of_occupants: 2,
      has_pets: false,
      smoking_allowed: false,
    };

    await act(async () => {
      await result.current.createMatchRequest(newRequest);
    });

    expect(matchingService.createMatchRequest).toHaveBeenCalledWith(newRequest);
  });

  it('should provide UI helper functions', async () => {
    const { result } = renderHook(() => useMatchRequests(), {
      wrapper: TestWrapper,
    });

    expect(result.current.getStatusColor('pending')).toBe('primary');
    expect(result.current.getStatusText('pending')).toBe('Pendiente');
    expect(result.current.getPriorityColor('medium')).toBe('warning');
    expect(result.current.formatCurrency(2500000)).toContain('2,500,000');
  });

  it('should check expiry status', async () => {
    const { result } = renderHook(() => useMatchRequests(), {
      wrapper: TestWrapper,
    });

    const futureDate = new Date(Date.now() + 86400000 * 10).toISOString();
    expect(result.current.isExpired(futureDate)).toBe(false);
    expect(result.current.isExpiringSoon(futureDate)).toBe(false);
  });

  it('should fetch statistics', async () => {
    const { result } = renderHook(() => useMatchRequests(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.statistics).toBeTruthy();
    });

    expect(matchingService.getMatchStatistics).toHaveBeenCalled();
  });
});
