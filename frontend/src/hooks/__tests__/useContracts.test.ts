import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useContracts } from '../useContracts';
import contractService from '../../services/contractService';
import { useAuth } from '../useAuth';

// Mock contract service
jest.mock('../../services/contractService');
const mockContractService = contractService as jest.Mocked<
  typeof contractService
>;

// Mock useAuth hook
jest.mock('../useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Test wrapper - create a fresh QueryClient per test
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

describe('useContracts Hook', () => {
  const mockContracts = [
    {
      id: 'contract-1',
      title: 'Test Contract 1',
      property_id: 'prop-1',
      landlord_id: 'landlord-1',
      tenant_id: 'tenant-1',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      monthly_rent: 2500000,
      status: 'draft' as const,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'contract-2',
      title: 'Test Contract 2',
      property_id: 'prop-2',
      landlord_id: 'landlord-1',
      tenant_id: 'tenant-2',
      start_date: '2025-02-01',
      end_date: '2026-01-31',
      monthly_rent: 3000000,
      status: 'active' as const,
      created_at: '2025-02-01T00:00:00Z',
      updated_at: '2025-02-01T00:00:00Z',
    },
  ];

  const mockStats = {
    total_contracts: 10,
    active_contracts: 7,
    pending_signatures: 2,
    expiring_soon: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'landlord',
        is_verified: true,
      },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn() as any,
      logout: jest.fn(),
      refreshToken: jest.fn(),
    });
    // Default mocks for queries that run on mount
    mockContractService.getContracts.mockResolvedValue(mockContracts as any);
    mockContractService.getTemplates.mockResolvedValue([]);
    mockContractService.getExpiringContracts.mockResolvedValue([]);
    mockContractService.getPendingSignatures.mockResolvedValue([]);
    mockContractService.getContractStats.mockResolvedValue(mockStats as any);
  });

  it('should fetch contracts successfully when authenticated', async () => {
    const { result } = renderHook(() => useContracts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.contracts).toEqual(mockContracts);
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockContractService.getContracts).toHaveBeenCalled();
  });

  it('should not fetch contracts when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn() as any,
      logout: jest.fn(),
      refreshToken: jest.fn(),
    });

    const { result } = renderHook(() => useContracts(), {
      wrapper: createWrapper(),
    });

    expect(mockContractService.getContracts).not.toHaveBeenCalled();
    expect(result.current.contracts).toBeUndefined();
  });

  it('should fetch contract stats', async () => {
    const { result } = renderHook(() => useContracts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.contractStats).toEqual(mockStats);
    });

    expect(mockContractService.getContractStats).toHaveBeenCalled();
  });

  it('should handle contract creation via mutation', async () => {
    const newContract = {
      ...mockContracts[0],
      id: 'contract-3',
      title: 'New Contract',
    };
    mockContractService.createContract.mockResolvedValue(newContract as any);

    const { result } = renderHook(() => useContracts(), {
      wrapper: createWrapper(),
    });

    const createData = {
      title: 'New Contract',
      property_id: 'prop-1',
      tenant_id: 'tenant-1',
      start_date: '2025-03-01',
      end_date: '2026-02-28',
      monthly_rent: 2000000,
    };

    await act(async () => {
      await result.current.createContract.mutateAsync(createData as any);
    });

    expect(mockContractService.createContract).toHaveBeenCalled();
    expect(mockContractService.createContract.mock.calls[0][0]).toEqual(
      createData
    );
    await waitFor(() => {
      expect(result.current.createContract.isSuccess).toBe(true);
    });
  });

  it('should handle contract update via mutation', async () => {
    const updatedContract = { ...mockContracts[0], title: 'Updated Title' };
    mockContractService.updateContract.mockResolvedValue(
      updatedContract as any
    );

    const { result } = renderHook(() => useContracts(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.updateContract.mutateAsync({
        id: 'contract-1',
        data: { title: 'Updated Title' },
      });
    });

    expect(mockContractService.updateContract).toHaveBeenCalledWith(
      'contract-1',
      { title: 'Updated Title' }
    );
    await waitFor(() => {
      expect(result.current.updateContract.isSuccess).toBe(true);
    });
  });

  it('should handle contract deletion via mutation', async () => {
    mockContractService.deleteContract.mockResolvedValue(undefined);

    const { result } = renderHook(() => useContracts(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.deleteContract.mutateAsync('contract-1');
    });

    expect(mockContractService.deleteContract).toHaveBeenCalled();
    expect(mockContractService.deleteContract.mock.calls[0][0]).toBe(
      'contract-1'
    );
    await waitFor(() => {
      expect(result.current.deleteContract.isSuccess).toBe(true);
    });
  });

  it('should handle sign contract mutation', async () => {
    mockContractService.signContract.mockResolvedValue({
      success: true,
    } as any);

    const { result } = renderHook(() => useContracts(), {
      wrapper: createWrapper(),
    });

    const signatureData = {
      signature: 'base64-signature',
      timestamp: '2025-01-01T12:00:00Z',
    };

    await act(async () => {
      await result.current.signContract.mutateAsync({
        contractId: 'contract-1',
        signatureData,
      });
    });

    expect(mockContractService.signContract).toHaveBeenCalledWith(
      'contract-1',
      signatureData
    );
    await waitFor(() => {
      expect(result.current.signContract.isSuccess).toBe(true);
    });
  });

  it('should handle activate contract mutation', async () => {
    mockContractService.activateContract.mockResolvedValue({
      status: 'active',
    } as any);

    const { result } = renderHook(() => useContracts(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.activateContract.mutateAsync('contract-1');
    });

    // activateContract is passed directly as mutationFn, so react-query may pass extra args
    expect(mockContractService.activateContract).toHaveBeenCalled();
    expect(mockContractService.activateContract.mock.calls[0][0]).toBe(
      'contract-1'
    );
    await waitFor(() => {
      expect(result.current.activateContract.isSuccess).toBe(true);
    });
  });

  it('should handle error state when fetching contracts fails', async () => {
    const errorMessage = 'Failed to fetch contracts';
    mockContractService.getContracts.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useContracts(), {
      wrapper: createWrapper(),
    });

    // The source hook has retry: 2 with retryDelay: 1000, so we need to wait longer
    // for all retries to exhaust before the error state is set.
    await waitFor(
      () => {
        expect(result.current.contracts).toBeUndefined();
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 10000 }
    );
  });

  it('should handle contract creation error', async () => {
    mockContractService.createContract.mockRejectedValue(
      new Error('Creation failed')
    );

    const { result } = renderHook(() => useContracts(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.createContract.mutateAsync({} as any);
      } catch {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.createContract.isError).toBe(true);
    });
  });
});
