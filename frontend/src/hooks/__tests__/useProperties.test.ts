import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProperties, useProperty, useFeaturedProperties } from '../useProperties';
import { propertyService } from '../../services/propertyService';

// Mock property service
jest.mock('../../services/propertyService');
const mockPropertyService = propertyService as jest.Mocked<typeof propertyService>;

// Mock useAuth hook
jest.mock('../useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: '1', email: 'test@example.com', first_name: 'Test', last_name: 'User', user_type: 'landlord', is_verified: true },
    isAuthenticated: true,
    isLoading: false,
    login: { mutateAsync: jest.fn() },
    logout: jest.fn(),
  })),
}));

import { useAuth } from '../useAuth';
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock optimized queries - delegate to real react-query hooks
jest.mock('../useOptimizedQueries', () => ({
  useDynamicQuery: jest.fn((queryKey: any, queryFn: any, options: any) => {
    const { useQuery } = jest.requireActual('@tanstack/react-query');
    return useQuery({ queryKey, queryFn, ...options });
  }),
  useStableQuery: jest.fn((queryKey: any, queryFn: any, options: any) => {
    const { useQuery } = jest.requireActual('@tanstack/react-query');
    return useQuery({ queryKey, queryFn, ...options });
  }),
  useStaticQuery: jest.fn((queryKey: any, queryFn: any, options: any) => {
    const { useQuery } = jest.requireActual('@tanstack/react-query');
    return useQuery({ queryKey, queryFn, ...options });
  }),
  useOptimizedMutation: jest.fn((mutationFn: any, options: any) => {
    const { useMutation } = jest.requireActual('@tanstack/react-query');
    return useMutation({ mutationFn, ...options });
  }),
  usePaginatedQuery: jest.fn((queryKey: any, queryFn: any, options: any) => {
    const { useQuery } = jest.requireActual('@tanstack/react-query');
    return useQuery({ queryKey, queryFn, ...options });
  }),
}));

// Mock cache utils
jest.mock('../../lib/queryClient', () => ({
  cacheUtils: {
    prefetchQuery: jest.fn(),
  },
}));

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

describe('useProperties Hook', () => {
  const mockProperties = [
    {
      id: '1',
      title: 'Beautiful Apartment',
      description: 'A great apartment in Bogota',
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
      landlord: '1',
      status: 'available',
      images: ['image1.jpg', 'image2.jpg'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Modern House',
      description: 'A modern house in Medellin',
      property_type: 'house',
      listing_type: 'sale',
      price: 500000000,
      area: 200,
      bedrooms: 4,
      bathrooms: 3,
      address: 'Carrera 43A #1-50',
      city: 'Medellin',
      state: 'Antioquia',
      country: 'Colombia',
      landlord: '2',
      status: 'available',
      images: ['image3.jpg'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com', first_name: 'Test', last_name: 'User', user_type: 'landlord', is_verified: true } as any,
      isAuthenticated: true,
      isLoading: false,
      login: { mutateAsync: jest.fn() } as any,
      register: { mutateAsync: jest.fn() } as any,
      logout: jest.fn(),
      updateUser: jest.fn(),
      resetInactivityTimer: jest.fn(),
      extendSession: jest.fn(),
      showSessionWarning: false,
      errorModal: { open: false, error: '', title: '' },
      showErrorModal: jest.fn(),
      hideErrorModal: jest.fn(),
      token: 'test-token',
    });
  });

  it('should fetch properties successfully', async () => {
    mockPropertyService.getProperties.mockResolvedValue(mockProperties as any);

    const { result } = renderHook(() => useProperties(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.properties).toBeDefined();
    expect(result.current.error).toBe(null);
    expect(mockPropertyService.getProperties).toHaveBeenCalled();
  });

  it('should apply filters when provided', async () => {
    const filters = { city: 'Bogota', min_price: 100000 };
    mockPropertyService.getProperties.mockResolvedValue([mockProperties[0]] as any);

    const { result } = renderHook(() => useProperties(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPropertyService.getProperties).toHaveBeenCalled();
  });

  it('should not fetch when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: { mutateAsync: jest.fn() } as any,
      register: { mutateAsync: jest.fn() } as any,
      logout: jest.fn(),
      updateUser: jest.fn(),
      resetInactivityTimer: jest.fn(),
      extendSession: jest.fn(),
      showSessionWarning: false,
      errorModal: { open: false, error: '', title: '' },
      showErrorModal: jest.fn(),
      hideErrorModal: jest.fn(),
      token: null,
    });

    const { result } = renderHook(() => useProperties(), {
      wrapper: createWrapper(),
    });

    expect(mockPropertyService.getProperties).not.toHaveBeenCalled();
    expect(result.current.properties).toBeUndefined();
  });

  it('should handle property creation via mutation', async () => {
    const newProperty = { ...mockProperties[0], id: '3', title: 'New Property' };
    mockPropertyService.createProperty.mockResolvedValue(newProperty as any);
    mockPropertyService.getProperties.mockResolvedValue(mockProperties as any);

    const { result } = renderHook(() => useProperties(), {
      wrapper: createWrapper(),
    });

    const formData = new FormData();
    formData.append('title', 'New Property');

    await act(async () => {
      await result.current.createProperty.mutateAsync(formData);
    });

    expect(mockPropertyService.createProperty).toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.createProperty.isSuccess).toBe(true);
    });
  });

  it('should handle property update via mutation', async () => {
    const updatedProperty = { ...mockProperties[0], title: 'Updated Title' };
    mockPropertyService.updateProperty.mockResolvedValue(updatedProperty as any);
    mockPropertyService.getProperties.mockResolvedValue(mockProperties as any);

    const { result } = renderHook(() => useProperties(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.updateProperty.mutateAsync({
        id: '1',
        data: { title: 'Updated Title' },
      });
    });

    expect(mockPropertyService.updateProperty).toHaveBeenCalledWith('1', { title: 'Updated Title' });
    await waitFor(() => {
      expect(result.current.updateProperty.isSuccess).toBe(true);
    });
  });

  it('should handle property deletion via mutation', async () => {
    mockPropertyService.deleteProperty.mockResolvedValue(undefined as any);
    mockPropertyService.getProperties.mockResolvedValue(mockProperties as any);

    const { result } = renderHook(() => useProperties(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.deleteProperty.mutateAsync('1');
    });

    expect(mockPropertyService.deleteProperty).toHaveBeenCalled();
    expect(mockPropertyService.deleteProperty.mock.calls[0][0]).toBe('1');
    await waitFor(() => {
      expect(result.current.deleteProperty.isSuccess).toBe(true);
    });
  });

  it('should handle search properties via mutation', async () => {
    const searchResults = [mockProperties[0]];
    mockPropertyService.searchProperties.mockResolvedValue(searchResults as any);
    mockPropertyService.getProperties.mockResolvedValue(mockProperties as any);

    const { result } = renderHook(() => useProperties(), {
      wrapper: createWrapper(),
    });

    const searchFilters = { city: 'Bogota', property_type: 'apartment' };

    await act(async () => {
      await result.current.searchProperties.mutateAsync(searchFilters as any);
    });

    expect(mockPropertyService.searchProperties).toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.searchProperties.isSuccess).toBe(true);
    });
  });

  it('should handle toggle favorite via mutation', async () => {
    mockPropertyService.toggleFavorite.mockResolvedValue({ message: 'Added to favorites' } as any);
    mockPropertyService.getProperties.mockResolvedValue(mockProperties as any);

    const { result } = renderHook(() => useProperties(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.toggleFavorite.mutateAsync('1');
    });

    expect(mockPropertyService.toggleFavorite).toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.toggleFavorite.isSuccess).toBe(true);
    });
  });

  it('should handle error state when fetching fails', async () => {
    mockPropertyService.getProperties.mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() => useProperties(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle creation error', async () => {
    mockPropertyService.createProperty.mockRejectedValue(new Error('Creation failed'));
    mockPropertyService.getProperties.mockResolvedValue(mockProperties as any);

    const { result } = renderHook(() => useProperties(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.createProperty.mutateAsync(new FormData());
      } catch {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.createProperty.isError).toBe(true);
    });
  });
});

describe('useProperty Hook', () => {
  const mockProperty = {
    id: '1',
    title: 'Test Property',
    description: 'Test description',
    property_type: 'apartment',
    price: 2500000,
    city: 'Bogota',
    status: 'available',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch a single property by id', async () => {
    mockPropertyService.getProperty.mockResolvedValue(mockProperty as any);

    const { result } = renderHook(() => useProperty('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.property).toEqual(mockProperty);
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPropertyService.getProperty).toHaveBeenCalledWith('1');
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useProperty(''), {
      wrapper: createWrapper(),
    });

    expect(mockPropertyService.getProperty).not.toHaveBeenCalled();
    expect(result.current.property).toBeUndefined();
  });
});

describe('useFeaturedProperties Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch featured properties', async () => {
    const featured = [{ id: '1', title: 'Featured', status: 'available' }];
    mockPropertyService.getFeaturedProperties.mockResolvedValue(featured as any);

    const { result } = renderHook(() => useFeaturedProperties(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.properties).toEqual(featured);
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPropertyService.getFeaturedProperties).toHaveBeenCalled();
  });
});
