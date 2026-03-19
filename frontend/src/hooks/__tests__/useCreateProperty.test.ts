import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateProperty } from '../useCreateProperty';
import { propertyService } from '../../services/propertyService';

// Mock property service
jest.mock('../../services/propertyService');
const mockPropertyService = propertyService as jest.Mocked<typeof propertyService>;

// Test wrapper with fresh QueryClient per test
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
};

describe('useCreateProperty Hook', () => {
  const mockProperty = {
    id: 'prop-1',
    title: 'New Apartment',
    description: 'A beautiful apartment',
    property_type: 'apartment',
    listing_type: 'rent',
    price: 2500000,
    area: 85,
    bedrooms: 2,
    bathrooms: 1,
    address: 'Calle 100 #15-20',
    city: 'Bogota',
    state: 'Cundinamarca',
    country: 'Colombia',
    landlord: 'user-1',
    status: 'available',
    images: [],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a mutation object', () => {
    const { result } = renderHook(() => useCreateProperty(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.mutate).toBeDefined();
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isPending).toBe(false);
  });

  it('should create a property with FormData successfully', async () => {
    mockPropertyService.createProperty.mockResolvedValue(mockProperty as any);

    const { result } = renderHook(() => useCreateProperty(), {
      wrapper: createWrapper(),
    });

    const formData = new FormData();
    formData.append('title', 'New Apartment');
    formData.append('price', '2500000');

    await act(async () => {
      await result.current.mutateAsync(formData);
    });

    expect(mockPropertyService.createProperty).toHaveBeenCalledTimes(1);
    expect(mockPropertyService.createProperty.mock.calls[0][0]).toBe(formData);
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should create a property with DTO object successfully', async () => {
    mockPropertyService.createProperty.mockResolvedValue(mockProperty as any);

    const { result } = renderHook(() => useCreateProperty(), {
      wrapper: createWrapper(),
    });

    const propertyData = {
      title: 'New Apartment',
      description: 'A beautiful apartment',
      property_type: 'apartment',
      listing_type: 'rent',
      price: 2500000,
    };

    await act(async () => {
      await result.current.mutateAsync(propertyData as any);
    });

    expect(mockPropertyService.createProperty).toHaveBeenCalledTimes(1);
    expect(mockPropertyService.createProperty.mock.calls[0][0]).toEqual(propertyData);
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should return created property data on success', async () => {
    mockPropertyService.createProperty.mockResolvedValue(mockProperty as any);

    const { result } = renderHook(() => useCreateProperty(), {
      wrapper: createWrapper(),
    });

    let createdProperty: any;
    await act(async () => {
      createdProperty = await result.current.mutateAsync(new FormData());
    });

    expect(createdProperty).toEqual(mockProperty);
  });

  it('should handle creation error', async () => {
    mockPropertyService.createProperty.mockRejectedValue(new Error('Creation failed'));

    const { result } = renderHook(() => useCreateProperty(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync(new FormData());
      } catch {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should set error state with proper error object', async () => {
    const error = new Error('Validation failed: title is required');
    mockPropertyService.createProperty.mockRejectedValue(error);

    const { result } = renderHook(() => useCreateProperty(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync(new FormData());
      } catch {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe('Validation failed: title is required');
    });
  });

  it('should reset after a new mutation attempt', async () => {
    mockPropertyService.createProperty
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce(mockProperty as any);

    const { result } = renderHook(() => useCreateProperty(), {
      wrapper: createWrapper(),
    });

    // First attempt: error
    await act(async () => {
      try {
        await result.current.mutateAsync(new FormData());
      } catch {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Second attempt: success
    await act(async () => {
      await result.current.mutateAsync(new FormData());
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });
  });

  it('should call createProperty service with correct arguments', async () => {
    mockPropertyService.createProperty.mockResolvedValue(mockProperty as any);

    const { result } = renderHook(() => useCreateProperty(), {
      wrapper: createWrapper(),
    });

    const formData = new FormData();
    formData.append('title', 'Test Property');
    formData.append('city', 'Medellin');
    formData.append('price', '3000000');

    await act(async () => {
      await result.current.mutateAsync(formData);
    });

    expect(mockPropertyService.createProperty).toHaveBeenCalledTimes(1);
    const callArg = mockPropertyService.createProperty.mock.calls[0][0];
    expect(callArg).toBe(formData);
  });
});
