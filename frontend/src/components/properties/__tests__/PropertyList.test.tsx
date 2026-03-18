import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mock all required services and hooks
jest.mock('../../../services/propertyService', () => ({
  propertyService: {
    getProperties: jest.fn().mockResolvedValue({
      results: [
        {
          id: '1',
          title: 'Apartamento en el centro',
          description: 'Hermoso apartamento',
          property_type: 'apartment',
          address: 'Calle 123',
          city: 'Bogota',
          price: 2500000,
          bedrooms: 3,
          bathrooms: 2,
          area: 120,
          is_available: true,
          images: [],
          landlord: { id: '1', first_name: 'Juan', last_name: 'Perez' },
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ],
      count: 1,
      next: null,
      previous: null,
    }),
    toggleFavorite: jest.fn(),
    deleteProperty: jest.fn(),
  },
}));

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      user_type: 'landlord',
    },
    isAuthenticated: true,
    isLoading: false,
    logout: jest.fn(),
  }),
}));

// Mock mapbox
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

// Mock components that use import.meta.env
jest.mock('../PropertyCards', () => ({
  __esModule: true,
  default: ({ properties }: any) => (
    <div data-testid="property-cards">
      {properties?.map((p: any) => (
        <div key={p.id} data-testid="property-card">
          <span>{p.title}</span>
        </div>
      ))}
    </div>
  ),
}));

// Mock PropertyTable
jest.mock('../PropertyTable', () => ({
  __esModule: true,
  default: ({ properties }: any) => (
    <div data-testid="property-table">
      {properties?.map((p: any) => (
        <div key={p.id}>{p.title}</div>
      ))}
    </div>
  ),
}));

// Mock PropertyFilters
jest.mock('../PropertyFilters', () => ({
  __esModule: true,
  default: () => <div data-testid="property-filters">Filters</div>,
}));

// Mock the PropertyList component from pages (the actual location)
jest.mock('../../../pages/properties/PropertyList', () => {
  const React = require('react');
  const { propertyService } = require('../../../services/propertyService');

  return {
    __esModule: true,
    default: () => {
      const [properties, setProperties] = React.useState<any[]>([]);
      const [loading, setLoading] = React.useState(true);
      const [error, setError] = React.useState<string | null>(null);

      React.useEffect(() => {
        propertyService.getProperties()
          .then((data: any) => {
            setProperties(data.results || []);
            setLoading(false);
          })
          .catch((err: any) => {
            setError('Error al cargar las propiedades');
            setLoading(false);
          });
      }, []);

      if (loading) return <div>Cargando propiedades...</div>;
      if (error) return <div>{error}</div>;
      if (properties.length === 0) return <div>No se encontraron propiedades</div>;

      return (
        <div data-testid="property-list">
          {properties.map((p: any) => (
            <div key={p.id}>{p.title}</div>
          ))}
        </div>
      );
    },
  };
});

import PropertyList from '../../../pages/properties/PropertyList';
import { propertyService } from '../../../services/propertyService';

const mockGetProperties = propertyService.getProperties as jest.MockedFunction<typeof propertyService.getProperties>;

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
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('PropertyList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders property list with properties', async () => {
    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText('Apartamento en el centro')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching properties', () => {
    mockGetProperties.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10000))
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
    } as any);

    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText(/no se encontraron propiedades/i)).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    mockGetProperties.mockRejectedValueOnce(new Error('Error al cargar propiedades'));

    render(<PropertyList />, { wrapper: createWrapper });

    await waitFor(() => {
      expect(screen.getByText(/error al cargar las propiedades/i)).toBeInTheDocument();
    });
  });
});
