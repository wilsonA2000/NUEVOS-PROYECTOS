import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useProperties,
  useProperty,
  useFeaturedProperties,
} from '../useProperties';
import { propertyService } from '../../services/propertyService';

// Mock property service
jest.mock('../../services/propertyService');
const mockPropertyService = propertyService as jest.Mocked<
  typeof propertyService
>;

// Mock useAuth hook
jest.mock('../useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: '1',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      user_type: 'tenant',
      is_verified: true,
    },
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
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useProperties Hook', () => {
  const mockProperties = [
    {
      id: '1',
      title: 'Beautiful Apartment',
      description: 'Test property description',
      property_type: 'apartment',
      listing_type: 'rent',
      price: 150000,
      area: 100,
      bedrooms: 2,
      bathrooms: 2,
      address: 'Test Address',
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
      description: 'Another test property',
      property_type: 'house',
      listing_type: 'sale',
      price: 300000,
      area: 200,
      bedrooms: 3,
      bathrooms: 3,
      address: 'Another Address',
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
      user: {
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'tenant',
        is_verified: true,
      } as any,
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

  describe('useProperties', () => {
    it('should fetch properties successfully', async () => {
      mockPropertyService.getProperties.mockResolvedValue(
        mockProperties as any,
      );

      const { result } = renderHook(() => useProperties(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.properties).toBeDefined();
      expect(result.current.error).toBe(null);
    });

    it('should fetch properties with filters', async () => {
      const filters = { city: 'Bogota', min_price: 100000 };
      mockPropertyService.getProperties.mockResolvedValue([
        mockProperties[0],
      ] as any);

      const { result } = renderHook(() => useProperties(filters), {
        wrapper: createTestWrapper(),
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
        wrapper: createTestWrapper(),
      });

      expect(mockPropertyService.getProperties).not.toHaveBeenCalled();
      expect(result.current.properties).toBeUndefined();
    });

    it('should handle property creation successfully', async () => {
      const newProperty = {
        ...mockProperties[0],
        id: '3',
        title: 'New Property',
      };
      mockPropertyService.createProperty.mockResolvedValue(newProperty as any);
      mockPropertyService.getProperties.mockResolvedValue(
        mockProperties as any,
      );

      const { result } = renderHook(() => useProperties(), {
        wrapper: createTestWrapper(),
      });

      const propertyData = new FormData();
      propertyData.append('title', 'New Property');

      await act(async () => {
        await result.current.createProperty.mutateAsync(propertyData);
      });

      expect(mockPropertyService.createProperty).toHaveBeenCalled();
    });

    it('should handle property creation error', async () => {
      mockPropertyService.createProperty.mockRejectedValue(
        new Error('Failed to create property'),
      );
      mockPropertyService.getProperties.mockResolvedValue(
        mockProperties as any,
      );

      const { result } = renderHook(() => useProperties(), {
        wrapper: createTestWrapper(),
      });

      await act(async () => {
        try {
          await result.current.createProperty.mutateAsync(new FormData());
        } catch {
          // Expected
        }
      });

      expect(mockPropertyService.createProperty).toHaveBeenCalled();
    });

    it('should handle property update', async () => {
      const updatedProperty = { ...mockProperties[0], title: 'Updated Title' };
      mockPropertyService.updateProperty.mockResolvedValue(
        updatedProperty as any,
      );
      mockPropertyService.getProperties.mockResolvedValue(
        mockProperties as any,
      );

      const { result } = renderHook(() => useProperties(), {
        wrapper: createTestWrapper(),
      });

      await act(async () => {
        await result.current.updateProperty.mutateAsync({
          id: '1',
          data: { title: 'Updated Title' },
        });
      });

      expect(mockPropertyService.updateProperty).toHaveBeenCalledWith('1', {
        title: 'Updated Title',
      });
    });

    it('should handle property deletion', async () => {
      mockPropertyService.deleteProperty.mockResolvedValue(undefined as any);
      mockPropertyService.getProperties.mockResolvedValue(
        mockProperties as any,
      );

      const { result } = renderHook(() => useProperties(), {
        wrapper: createTestWrapper(),
      });

      await act(async () => {
        await result.current.deleteProperty.mutateAsync('1');
      });

      expect(mockPropertyService.deleteProperty).toHaveBeenCalled();
    });

    it('should handle property search', async () => {
      const searchResults = [mockProperties[0]];
      mockPropertyService.searchProperties.mockResolvedValue(
        searchResults as any,
      );
      mockPropertyService.getProperties.mockResolvedValue(
        mockProperties as any,
      );

      const { result } = renderHook(() => useProperties(), {
        wrapper: createTestWrapper(),
      });

      const searchFilters = { city: 'Bogota', property_type: 'apartment' };

      await act(async () => {
        await result.current.searchProperties.mutateAsync(searchFilters as any);
      });

      expect(mockPropertyService.searchProperties).toHaveBeenCalled();
    });

    it('should handle toggle favorite', async () => {
      mockPropertyService.toggleFavorite.mockResolvedValue({
        message: 'Added to favorites',
      } as any);
      mockPropertyService.getProperties.mockResolvedValue(
        mockProperties as any,
      );

      const { result } = renderHook(() => useProperties(), {
        wrapper: createTestWrapper(),
      });

      await act(async () => {
        await result.current.toggleFavorite.mutateAsync('1');
      });

      expect(mockPropertyService.toggleFavorite).toHaveBeenCalled();
    });

    it('should handle error state', async () => {
      mockPropertyService.getProperties.mockRejectedValue(
        new Error('Failed to fetch properties'),
      );

      const { result } = renderHook(() => useProperties(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('useProperty', () => {
    it('should fetch single property successfully', async () => {
      mockPropertyService.getProperty.mockResolvedValue(
        mockProperties[0] as any,
      );

      const { result } = renderHook(() => useProperty('1'), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.property).toEqual(mockProperties[0]);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPropertyService.getProperty).toHaveBeenCalledWith('1');
    });

    it('should not fetch when id is not provided', () => {
      const { result } = renderHook(() => useProperty(''), {
        wrapper: createTestWrapper(),
      });

      expect(mockPropertyService.getProperty).not.toHaveBeenCalled();
      expect(result.current.property).toBeUndefined();
    });

    it('should handle single property error', async () => {
      mockPropertyService.getProperty.mockRejectedValue(
        new Error('Property not found'),
      );

      const { result } = renderHook(() => useProperty('999'), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('useFeaturedProperties', () => {
    it('should fetch featured properties successfully', async () => {
      const featuredProperties = [mockProperties[0]];
      mockPropertyService.getFeaturedProperties.mockResolvedValue(
        featuredProperties as any,
      );

      const { result } = renderHook(() => useFeaturedProperties(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.properties).toEqual(featuredProperties);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPropertyService.getFeaturedProperties).toHaveBeenCalled();
    });

    it('should handle featured properties error', async () => {
      mockPropertyService.getFeaturedProperties.mockRejectedValue(
        new Error('Failed to fetch featured'),
      );

      const { result } = renderHook(() => useFeaturedProperties(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
