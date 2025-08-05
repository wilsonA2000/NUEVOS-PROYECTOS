import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PropertyList from '../PropertyList';
import { propertyService } from '../../../services/propertyService';
import { AuthProvider } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';

// Mocks
jest.mock('../../../services/propertyService');
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock de Mapbox
jest.mock('mapbox-gl', () => ({
  Map: jest.fn(() => ({
    on: jest.fn(),
    remove: jest.fn(),
    addControl: jest.fn(),
  })),
  NavigationControl: jest.fn(),
  Marker: jest.fn(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
  })),
}));

const createWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockProperties = [
  {
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
  },
  {
    id: 2,
    title: 'Casa amplia en zona residencial',
    description: 'Casa familiar con jardín',
    property_type: 'house',
    address: 'Carrera 10 #20-30',
    city: 'Medellín',
    state: 'Antioquia',
    country: 'Colombia',
    postal_code: '050001',
    price: 3500000,
    bedrooms: 4,
    bathrooms: 3,
    area: 200,
    is_available: true,
    images: [
      { id: 2, image: '/media/property2.jpg', is_primary: true },
    ],
    latitude: 6.2442,
    longitude: -75.5812,
    landlord: {
      id: 2,
      first_name: 'María',
      last_name: 'González',
      email: 'maria@example.com',
    },
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
  },
];

describe('PropertyList Component', () => {
  const mockGetProperties = propertyService.getProperties as jest.MockedFunction<
    typeof propertyService.getProperties
  >;
  const mockToggleFavorite = propertyService.toggleFavorite as jest.MockedFunction<
    typeof propertyService.toggleFavorite
  >;
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('renders property list with properties', async () => {
    mockGetProperties.mockResolvedValueOnce({
      results: mockProperties,
      count: 2,
      next: null,
      previous: null,
    });

    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText('Apartamento en el centro')).toBeInTheDocument();
      expect(screen.getByText('Casa amplia en zona residencial')).toBeInTheDocument();
    });

    // Verificar detalles de las propiedades
    expect(screen.getByText('$2,500,000 COP/mes')).toBeInTheDocument();
    expect(screen.getByText('$3,500,000 COP/mes')).toBeInTheDocument();
    expect(screen.getByText('3 habitaciones')).toBeInTheDocument();
    expect(screen.getByText('4 habitaciones')).toBeInTheDocument();
  });

  it('shows loading state while fetching properties', () => {
    mockGetProperties.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<PropertyList />, { wrapper: createWrapper });

    expect(screen.getByText(/cargando propiedades/i)).toBeInTheDocument();
  });

  it('shows empty state when no properties found', async () => {
    mockGetProperties.mockResolvedValueOnce({
      results: [],
      count: 0,
      next: null,
      previous: null,
    });

    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText(/no se encontraron propiedades/i)).toBeInTheDocument();
    });
  });

  it('handles property filtering by type', async () => {
    mockGetProperties.mockResolvedValueOnce({
      results: mockProperties,
      count: 2,
      next: null,
      previous: null,
    });

    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText('Apartamento en el centro')).toBeInTheDocument();
    });

    // Filtrar por tipo de propiedad
    const typeFilter = screen.getByLabelText(/tipo de propiedad/i);
    await user.selectOptions(typeFilter, 'apartment');

    await waitFor(() => {
      expect(mockGetProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          property_type: 'apartment',
        })
      );
    });
  });

  it('handles property search', async () => {
    mockGetProperties.mockResolvedValueOnce({
      results: mockProperties,
      count: 2,
      next: null,
      previous: null,
    });

    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText('Apartamento en el centro')).toBeInTheDocument();
    });

    // Buscar por término
    const searchInput = screen.getByPlaceholderText(/buscar propiedades/i);
    await user.type(searchInput, 'apartamento');

    // Esperar el debounce
    await waitFor(() => {
      expect(mockGetProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'apartamento',
        })
      );
    }, { timeout: 1000 });
  });

  it('handles price range filtering', async () => {
    mockGetProperties.mockResolvedValueOnce({
      results: mockProperties,
      count: 2,
      next: null,
      previous: null,
    });

    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText('Apartamento en el centro')).toBeInTheDocument();
    });

    // Filtrar por rango de precio
    const minPriceInput = screen.getByLabelText(/precio mínimo/i);
    const maxPriceInput = screen.getByLabelText(/precio máximo/i);
    
    await user.type(minPriceInput, '2000000');
    await user.type(maxPriceInput, '3000000');

    const applyFiltersButton = screen.getByRole('button', { name: /aplicar filtros/i });
    await user.click(applyFiltersButton);

    await waitFor(() => {
      expect(mockGetProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          min_price: 2000000,
          max_price: 3000000,
        })
      );
    });
  });

  it('handles sorting properties', async () => {
    mockGetProperties.mockResolvedValueOnce({
      results: mockProperties,
      count: 2,
      next: null,
      previous: null,
    });

    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText('Apartamento en el centro')).toBeInTheDocument();
    });

    // Cambiar orden
    const sortSelect = screen.getByLabelText(/ordenar por/i);
    await user.selectOptions(sortSelect, 'price_asc');

    await waitFor(() => {
      expect(mockGetProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          ordering: 'price',
        })
      );
    });
  });

  it('toggles between grid and list view', async () => {
    mockGetProperties.mockResolvedValueOnce({
      results: mockProperties,
      count: 2,
      next: null,
      previous: null,
    });

    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText('Apartamento en el centro')).toBeInTheDocument();
    });

    // Verificar vista de cuadrícula por defecto
    expect(screen.getByTestId('property-grid')).toBeInTheDocument();

    // Cambiar a vista de lista
    const listViewButton = screen.getByRole('button', { name: /vista de lista/i });
    await user.click(listViewButton);

    expect(screen.getByTestId('property-list')).toBeInTheDocument();
  });

  it('navigates to property detail on click', async () => {
    mockGetProperties.mockResolvedValueOnce({
      results: mockProperties,
      count: 2,
      next: null,
      previous: null,
    });

    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText('Apartamento en el centro')).toBeInTheDocument();
    });

    const propertyCard = screen.getByText('Apartamento en el centro').closest('article');
    const viewDetailsButton = within(propertyCard!).getByRole('button', { name: /ver detalles/i });
    
    await user.click(viewDetailsButton);

    expect(mockNavigate).toHaveBeenCalledWith('/properties/1');
  });

  it('handles favorite toggle for authenticated users', async () => {
    // Mock usuario autenticado
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      user_type: 'tenant',
    };

    // Actualizar el contexto de autenticación
    jest.spyOn(React, 'useContext').mockImplementation((context) => {
      if (context === AuthProvider) {
        return { user: mockUser, isAuthenticated: true };
      }
      return jest.requireActual('react').useContext(context);
    });

    mockGetProperties.mockResolvedValueOnce({
      results: mockProperties,
      count: 2,
      next: null,
      previous: null,
    });

    mockToggleFavorite.mockResolvedValueOnce({ is_favorite: true });

    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText('Apartamento en el centro')).toBeInTheDocument();
    });

    const propertyCard = screen.getByText('Apartamento en el centro').closest('article');
    const favoriteButton = within(propertyCard!).getByLabelText(/agregar a favoritos/i);
    
    await user.click(favoriteButton);

    await waitFor(() => {
      expect(mockToggleFavorite).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith('Agregado a favoritos');
    });
  });

  it('shows login prompt for unauthenticated users trying to favorite', async () => {
    mockGetProperties.mockResolvedValueOnce({
      results: mockProperties,
      count: 2,
      next: null,
      previous: null,
    });

    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText('Apartamento en el centro')).toBeInTheDocument();
    });

    const propertyCard = screen.getByText('Apartamento en el centro').closest('article');
    const favoriteButton = within(propertyCard!).getByLabelText(/agregar a favoritos/i);
    
    await user.click(favoriteButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Debes iniciar sesión para guardar favoritos');
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('handles pagination', async () => {
    mockGetProperties.mockResolvedValueOnce({
      results: mockProperties,
      count: 20,
      next: '/api/v1/properties/?page=2',
      previous: null,
    });

    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText('Apartamento en el centro')).toBeInTheDocument();
    });

    // Verificar que se muestra la paginación
    expect(screen.getByText(/mostrando 1-2 de 20/i)).toBeInTheDocument();

    // Ir a la siguiente página
    const nextButton = screen.getByRole('button', { name: /siguiente/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(mockGetProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });

  it('handles error state', async () => {
    mockGetProperties.mockRejectedValueOnce(new Error('Error al cargar propiedades'));

    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText(/error al cargar las propiedades/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    });
  });

  it('retries loading properties after error', async () => {
    mockGetProperties
      .mockRejectedValueOnce(new Error('Error al cargar propiedades'))
      .mockResolvedValueOnce({
        results: mockProperties,
        count: 2,
        next: null,
        previous: null,
      });

    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText(/error al cargar las propiedades/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /reintentar/i });
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Apartamento en el centro')).toBeInTheDocument();
    });
  });

  it('toggles map view', async () => {
    mockGetProperties.mockResolvedValueOnce({
      results: mockProperties,
      count: 2,
      next: null,
      previous: null,
    });

    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText('Apartamento en el centro')).toBeInTheDocument();
    });

    // Mostrar mapa
    const mapToggleButton = screen.getByRole('button', { name: /mostrar mapa/i });
    await user.click(mapToggleButton);

    expect(screen.getByTestId('property-map')).toBeInTheDocument();

    // Ocultar mapa
    await user.click(screen.getByRole('button', { name: /ocultar mapa/i }));
    expect(screen.queryByTestId('property-map')).not.toBeInTheDocument();
  });
});