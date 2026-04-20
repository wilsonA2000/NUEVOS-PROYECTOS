import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useProperties } from '../useProperties';
import { propertyService } from '../../services/propertyService';

// Mocks
jest.mock('../../services/propertyService');

// Mock useAuth
jest.mock('../useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: '1',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      user_type: 'landlord',
      is_verified: true,
    },
    isAuthenticated: true,
    isLoading: false,
    login: { mutateAsync: jest.fn() },
    register: { mutateAsync: jest.fn() },
    logout: jest.fn(),
    updateUser: jest.fn(),
    resetInactivityTimer: jest.fn(),
    extendSession: jest.fn(),
    showSessionWarning: false,
    errorModal: { open: false, error: '', title: '' },
    showErrorModal: jest.fn(),
    hideErrorModal: jest.fn(),
    token: 'test-token',
  })),
}));

// Mock optimized queries
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

const mockPropertyService = propertyService as jest.Mocked<
  typeof propertyService
>;

// Create fresh wrapper per test
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockProperty = {
  id: '1',
  title: 'Apartamento en el centro',
  description: 'Hermoso apartamento con vista al parque',
  property_type: 'apartment',
  address: 'Calle 123 #45-67',
  city: 'Bogota',
  state: 'Cundinamarca',
  country: 'Colombia',
  postal_code: '110111',
  price: 2500000,
  bedrooms: 3,
  bathrooms: 2,
  area: 120,
  is_available: true,
  status: 'available',
  images: [{ id: '1', image: '/media/property1.jpg', is_primary: true }],
  latitude: 4.5709,
  longitude: -74.2973,
  landlord: {
    id: '1',
    first_name: 'Juan',
    last_name: 'Perez',
    email: 'juan@example.com',
  },
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('useProperties Hook (Simple)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Get Properties', () => {
    it('should fetch properties successfully', async () => {
      mockPropertyService.getProperties.mockResolvedValueOnce([
        mockProperty,
      ] as any);

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

    it('should handle properties fetch error', async () => {
      mockPropertyService.getProperties.mockRejectedValueOnce(
        new Error('Error al cargar propiedades'),
      );

      const { result } = renderHook(() => useProperties(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.properties).toBeUndefined();
    });

    it('should toggle favorite via mutation', async () => {
      mockPropertyService.getProperties.mockResolvedValueOnce([
        mockProperty,
      ] as any);
      mockPropertyService.toggleFavorite.mockResolvedValueOnce({
        message: 'Added to favorites',
      } as any);

      const { result } = renderHook(() => useProperties(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleFavorite.mutateAsync('1');
      });

      expect(mockPropertyService.toggleFavorite).toHaveBeenCalled();
    });
  });
});
