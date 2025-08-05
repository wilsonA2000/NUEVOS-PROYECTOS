import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProperties, useProperty, useFeaturedProperties } from '../useProperties';
import { propertyService } from '../../services/propertyService';
import { useAuth } from '../useAuth';

// Mock property service
jest.mock('../../services/propertyService');
const mockPropertyService = propertyService as jest.Mocked<typeof propertyService>;

// Mock useAuth hook
jest.mock('../useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock optimized queries
jest.mock('../useOptimizedQueries', () => ({
  useDynamicQuery: jest.fn((queryKey, queryFn, options) => {
    const { useQuery } = jest.requireActual('@tanstack/react-query');
    return useQuery({ queryKey, queryFn, ...options });
  }),
  useStableQuery: jest.fn((queryKey, queryFn, options) => {
    const { useQuery } = jest.requireActual('@tanstack/react-query');
    return useQuery({ queryKey, queryFn, ...options });
  }),
  useStaticQuery: jest.fn((queryKey, queryFn, options) => {
    const { useQuery } = jest.requireActual('@tanstack/react-query');
    return useQuery({ queryKey, queryFn, ...options });
  }),
  useOptimizedMutation: jest.fn((mutationFn, options) => {
    const { useMutation } = jest.requireActual('@tanstack/react-query');
    return useMutation({ mutationFn, ...options });
  }),
  usePaginatedQuery: jest.fn((queryKey, queryFn, options) => {
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

// Test wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useProperties Hook', () => {
  const mockProperties = [
    {
      id: 1,
      title: 'Beautiful Apartment',
      description: 'Test property description',
      property_type: 'apartment',
      listing_type: 'rent',
      price: 150000,
      area: 100,
      bedrooms: 2,
      bathrooms: 2,
      address: 'Test Address',
      city: 'Bogotá',
      state: 'Cundinamarca',
      country: 'Colombia',
      landlord: 1,
      images: ['image1.jpg', 'image2.jpg'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      title: 'Modern House',
      description: 'Another test property',
      property_type: 'house',
      listing_type: 'sale',
      price: 300000,
      area: 200,
      bedrooms: 3,
      bathrooms: 3,
      address: 'Another Address',
      city: 'Medellín',
      state: 'Antioquia',
      country: 'Colombia',
      landlord: 2,
      images: ['image3.jpg'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User', role: 'tenant', is_verified: true },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn() as any,
      logout: jest.fn(),
      refreshToken: jest.fn(),
    });
  });

  describe('useProperties', () => {
    it('should fetch properties successfully', async () => {
      mockPropertyService.getProperties.mockResolvedValue(mockProperties);

      const { result } = renderHook(() => useProperties(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.properties).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              title: 'Beautiful Apartment',
              performance: expect.objectContaining({
                pricePerSqm: 1500,
                isNew: true,
              }),
            }),
            expect.objectContaining({
              id: 2,
              title: 'Modern House',
              performance: expect.objectContaining({
                pricePerSqm: 1500,
                isNew: true,
              }),
            }),
          ])
        );
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should fetch properties with filters', async () => {
      const filters = { city: 'Bogotá', min_price: 100000 };
      mockPropertyService.getProperties.mockResolvedValue([mockProperties[0]]);

      const { result } = renderHook(() => useProperties(filters), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(mockPropertyService.getProperties).toHaveBeenCalledWith(filters);
        expect(result.current.properties).toHaveLength(1);
      });
    });

    it('should not fetch when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: jest.fn() as any,
        logout: jest.fn(),
        refreshToken: jest.fn(),
      });

      const { result } = renderHook(() => useProperties(), {
        wrapper: TestWrapper,
      });

      expect(mockPropertyService.getProperties).not.toHaveBeenCalled();
      expect(result.current.properties).toBeUndefined();
    });

    it('should handle property creation successfully', async () => {
      const newProperty = { ...mockProperties[0], id: 3, title: 'New Property' };
      mockPropertyService.createProperty.mockResolvedValue(newProperty);
      mockPropertyService.getProperties.mockResolvedValue([...mockProperties, newProperty]);

      const { result } = renderHook(() => useProperties(), {
        wrapper: TestWrapper,
      });

      const propertyData = new FormData();
      propertyData.append('title', 'New Property');

      await act(async () => {
        await result.current.createProperty.mutateAsync(propertyData);
      });

      expect(mockPropertyService.createProperty).toHaveBeenCalledWith(propertyData);
      expect(result.current.createProperty.isSuccess).toBe(true);
    });

    it('should handle property creation error', async () => {
      const errorMessage = 'Failed to create property';
      mockPropertyService.createProperty.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useProperties(), {
        wrapper: TestWrapper,
      });

      const propertyData = new FormData();

      await act(async () => {
        try {
          await result.current.createProperty.mutateAsync(propertyData);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.createProperty.isError).toBe(true);
    });

    it('should handle property update', async () => {
      const updatedProperty = { ...mockProperties[0], title: 'Updated Title' };
      mockPropertyService.updateProperty.mockResolvedValue(updatedProperty);

      const { result } = renderHook(() => useProperties(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.updateProperty.mutateAsync({
          id: '1',
          data: { title: 'Updated Title' },
        });
      });

      expect(mockPropertyService.updateProperty).toHaveBeenCalledWith('1', { title: 'Updated Title' });
      expect(result.current.updateProperty.isSuccess).toBe(true);
    });

    it('should handle property deletion', async () => {
      mockPropertyService.deleteProperty.mockResolvedValue(undefined);

      const { result } = renderHook(() => useProperties(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.deleteProperty.mutateAsync('1');
      });

      expect(mockPropertyService.deleteProperty).toHaveBeenCalledWith('1');
      expect(result.current.deleteProperty.isSuccess).toBe(true);
    });

    it('should handle property search', async () => {
      const searchResults = [mockProperties[0]];
      mockPropertyService.searchProperties.mockResolvedValue(searchResults);

      const { result } = renderHook(() => useProperties(), {
        wrapper: TestWrapper,
      });

      const searchFilters = { city: 'Bogotá', property_type: 'apartment' };

      await act(async () => {
        await result.current.searchProperties.mutateAsync(searchFilters);
      });

      expect(mockPropertyService.searchProperties).toHaveBeenCalledWith(searchFilters);
      expect(result.current.searchProperties.data).toEqual(searchResults);
    });

    it('should handle toggle favorite', async () => {
      mockPropertyService.toggleFavorite.mockResolvedValue(undefined);

      const { result } = renderHook(() => useProperties(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.toggleFavorite.mutateAsync('1');
      });

      expect(mockPropertyService.toggleFavorite).toHaveBeenCalledWith('1');
      expect(result.current.toggleFavorite.isSuccess).toBe(true);
    });

    it('should handle loading state', () => {
      mockPropertyService.getProperties.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockProperties), 1000))
      );

      const { result } = renderHook(() => useProperties(), {
        wrapper: TestWrapper,
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.properties).toBeUndefined();
    });

    it('should handle error state', async () => {
      const errorMessage = 'Failed to fetch properties';
      mockPropertyService.getProperties.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useProperties(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('useProperty', () => {
    it('should fetch single property successfully', async () => {
      mockPropertyService.getProperty.mockResolvedValue(mockProperties[0]);

      const { result } = renderHook(() => useProperty('1'), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.property).toEqual(mockProperties[0]);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPropertyService.getProperty).toHaveBeenCalledWith('1');
    });

    it('should not fetch when id is not provided', () => {
      const { result } = renderHook(() => useProperty(''), {
        wrapper: TestWrapper,
      });

      expect(mockPropertyService.getProperty).not.toHaveBeenCalled();
      expect(result.current.property).toBeUndefined();
    });

    it('should handle single property error', async () => {
      mockPropertyService.getProperty.mockRejectedValue(new Error('Property not found'));

      const { result } = renderHook(() => useProperty('999'), {
        wrapper: TestWrapper,
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
      mockPropertyService.getFeaturedProperties.mockResolvedValue(featuredProperties);

      const { result } = renderHook(() => useFeaturedProperties(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.properties).toEqual(featuredProperties);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPropertyService.getFeaturedProperties).toHaveBeenCalled();
    });

    it('should handle featured properties error', async () => {
      mockPropertyService.getFeaturedProperties.mockRejectedValue(new Error('Failed to fetch featured'));

      const { result } = renderHook(() => useFeaturedProperties(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});