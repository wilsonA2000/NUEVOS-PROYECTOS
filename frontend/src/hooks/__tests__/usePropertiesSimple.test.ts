import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useProperties } from '../useProperties';
import { propertyService } from '../../services/propertyService';
import { toast } from 'react-toastify';

// Mocks
jest.mock('../../services/propertyService');
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Crear wrapper para los tests
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
  id: 1,
  title: 'Apartamento en el centro',
  description: 'Hermoso apartamento con vista al parque',
  property_type: 'apartment',
  address: 'Calle 123 #45-67',
  city: 'Bogotá',
  state: 'Cundinamarca',
  country: 'Colombia',
  postal_code: '110111',
  price: 2500000,
  bedrooms: 3,
  bathrooms: 2,
  area: 120,
  is_available: true,
  images: [
    { id: 1, image: '/media/property1.jpg', is_primary: true },
  ],
  latitude: 4.5709,
  longitude: -74.2973,
  landlord: {
    id: 1,
    first_name: 'Juan',
    last_name: 'Pérez',
    email: 'juan@example.com',
  },
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const mockPropertiesResponse = {
  results: [mockProperty],
  count: 1,
  next: null,
  previous: null,
};

describe('useProperties Hook', () => {
  const mockGetProperties = propertyService.getProperties as jest.MockedFunction<
    typeof propertyService.getProperties
  >;
  const mockToggleFavorite = propertyService.toggleFavorite as jest.MockedFunction<
    typeof propertyService.toggleFavorite
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Get Properties', () => {
    it('should fetch properties successfully', async () => {
      mockGetProperties.mockResolvedValueOnce(mockPropertiesResponse);

      const { result } = renderHook(() => useProperties(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockPropertiesResponse);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
      });

      expect(mockGetProperties).toHaveBeenCalledWith({
        page: 1,
        page_size: 12,
      });
    });

    it('should handle properties fetch error', async () => {
      const errorMessage = 'Error al cargar propiedades';
      mockGetProperties.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useProperties(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeTruthy();
        expect(result.current.data).toBeUndefined();
      });
    });

    it('should toggle favorite successfully', async () => {
      mockToggleFavorite.mockResolvedValueOnce({ is_favorite: true });

      const { result } = renderHook(() => useProperties(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.toggleFavorite(1);
      });

      expect(mockToggleFavorite).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith('Agregado a favoritos');
    });
  });
});