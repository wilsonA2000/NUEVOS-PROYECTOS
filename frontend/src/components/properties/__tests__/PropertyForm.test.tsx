import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PropertyForm from '../PropertyForm';
import { theme } from '../../../lib/theme';

// Mock mapbox and related dependencies
jest.mock('mapbox-gl', () => ({
  __esModule: true,
  default: {
    accessToken: '',
    Map: jest.fn(() => ({
      on: jest.fn(),
      remove: jest.fn(),
      flyTo: jest.fn(),
    })),
    Marker: jest.fn(() => ({
      setLngLat: jest.fn().mockReturnThis(),
      addTo: jest.fn().mockReturnThis(),
      on: jest.fn(),
      getLngLat: jest.fn(() => ({ lng: -74.2973, lat: 4.5709 })),
    })),
  },
}));

jest.mock('@mapbox/mapbox-gl-geocoder', () => {
  return jest.fn().mockImplementation(() => ({
    addTo: jest.fn(),
    on: jest.fn(),
  }));
});

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: () => <div data-testid="marker" />,
  useMapEvents: () => null,
}));

jest.mock('leaflet', () => ({
  Icon: {
    Default: {
      mergeOptions: jest.fn(),
    },
  },
}));

// Mock axios for address search
jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({
    data: {
      features: [
        {
          id: '1',
          place_name: 'Calle 100, Bogotá, Colombia',
          center: [-74.2973, 4.5709],
          context: [
            { id: 'place.1', text: 'Bogotá' },
            { id: 'region.1', text: 'Cundinamarca' },
            { id: 'country.1', text: 'Colombia' },
          ],
        },
      ],
    },
  }),
}));

// Mock environment variables
const mockEnv = {
  VITE_MAPBOX_TOKEN: 'test-token',
  VITE_DEFAULT_COUNTRY: 'CO',
  VITE_DEFAULT_LAT: '4.5709',
  VITE_DEFAULT_LNG: '-74.2973',
  VITE_DEFAULT_ZOOM: '6',
};

Object.defineProperty(import.meta, 'env', {
  value: mockEnv,
  writable: true,
});

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
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
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          {children}
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('PropertyForm Component', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSubmit.mockResolvedValue({ id: 1, title: 'Test Property' });
  });

  it('should render all required form fields', () => {
    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    // Basic fields
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo de propiedad/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo de listado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/estado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dirección/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ciudad/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/área total/i)).toBeInTheDocument();
    
    // Buttons
    expect(screen.getByRole('button', { name: /crear propiedad/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /capturar ubicación/i })).toBeInTheDocument();
  });

  it('should show validation errors for required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', { name: /crear propiedad/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/el título es requerido/i)).toBeInTheDocument();
      expect(screen.getByText(/el tipo es requerido/i)).toBeInTheDocument();
      expect(screen.getByText(/el tipo de listado es requerido/i)).toBeInTheDocument();
      expect(screen.getByText(/el área total es requerida/i)).toBeInTheDocument();
    });
  });

  it('should update form fields correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const titleInput = screen.getByLabelText(/título/i);
    const descriptionInput = screen.getByLabelText(/descripción/i);

    await user.type(titleInput, 'Hermoso Apartamento');
    await user.type(descriptionInput, 'Descripción de prueba');

    expect(titleInput).toHaveValue('Hermoso Apartamento');
    expect(descriptionInput).toHaveValue('Descripción de prueba');
  });

  it('should handle property type and listing type selection', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    // Select property type
    const propertyTypeSelect = screen.getByLabelText(/tipo de propiedad/i);
    await user.click(propertyTypeSelect);
    
    await waitFor(() => {
      expect(screen.getByText('Apartamento')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Apartamento'));

    // Select listing type
    const listingTypeSelect = screen.getByLabelText(/tipo de listado/i);
    await user.click(listingTypeSelect);
    
    await waitFor(() => {
      expect(screen.getByText('Renta')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Renta'));

    // Check that rent price field appears when listing type is rent
    await waitFor(() => {
      expect(screen.getByLabelText(/precio renta/i)).toBeInTheDocument();
    });
  });

  it('should validate numeric fields correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const areaInput = screen.getByLabelText(/área total/i);
    
    // Test with invalid input (letters)
    await user.type(areaInput, 'abc');
    expect(areaInput).toHaveValue(''); // Should filter out non-numeric

    // Test with valid input
    await user.clear(areaInput);
    await user.type(areaInput, '120.5');
    expect(areaInput).toHaveValue('120.5');
  });

  it('should handle image upload', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const imageInput = screen.getByLabelText(/subir fotos/i).querySelector('input[type="file"]') as HTMLInputElement;
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    await user.upload(imageInput, file);
    
    await waitFor(() => {
      expect(screen.getByAltText(/foto 1/i)).toBeInTheDocument();
    });
  });

  it('should handle video mode switching', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    // Should start with URL mode
    expect(screen.getByLabelText(/url de youtube/i)).toBeInTheDocument();

    // Switch to file mode
    const fileButton = screen.getByRole('button', { name: /subir video/i });
    await user.click(fileButton);

    // URL input should still be visible as we clicked the file upload button
    expect(screen.getByLabelText(/url de youtube/i)).toBeInTheDocument();
  });

  it('should validate video file upload', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const videoInput = screen.getByRole('button', { name: /subir video/i }).querySelector('input[type="file"]') as HTMLInputElement;
    
    // Test with invalid file type
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    await user.upload(videoInput, invalidFile);
    
    await waitFor(() => {
      expect(screen.getByText(/tipo de video no permitido/i)).toBeInTheDocument();
    });
  });

  it('should handle form submission successfully', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    // Fill required fields
    await user.type(screen.getByLabelText(/título/i), 'Test Property');
    
    // Select property type
    await user.click(screen.getByLabelText(/tipo de propiedad/i));
    await user.click(screen.getByText('Apartamento'));
    
    // Select listing type
    await user.click(screen.getByLabelText(/tipo de listado/i));
    await user.click(screen.getByText('Renta'));
    
    // Fill area
    await user.type(screen.getByLabelText(/área total/i), '100');
    
    // Fill rent price (appears after selecting rent)
    await waitFor(() => {
      expect(screen.getByLabelText(/precio renta/i)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/precio renta/i), '1500000');

    // Submit form
    await user.click(screen.getByRole('button', { name: /crear propiedad/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('should handle location capture', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const addressInput = screen.getByLabelText(/dirección/i);
    const captureButton = screen.getByRole('button', { name: /capturar ubicación/i });

    await user.type(addressInput, 'Calle 100, Bogotá');
    await user.click(captureButton);

    await waitFor(() => {
      expect(screen.getByText(/ubicación capturada/i)).toBeInTheDocument();
    });
  });

  it('should display loading state during submission', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} isLoading={true} />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', { name: /creando/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Creando...')).toBeInTheDocument();
  });

  it('should display error message when provided', () => {
    const errorMessage = 'Error al crear la propiedad';
    
    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} error={errorMessage} />
      </TestWrapper>
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should navigate back when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    await user.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/app/properties');
  });

  it('should handle checkbox toggles correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const petsCheckbox = screen.getByRole('checkbox', { name: /mascotas/i });
    const furnishedCheckbox = screen.getByRole('checkbox', { name: /amueblada/i });

    expect(petsCheckbox).not.toBeChecked();
    expect(furnishedCheckbox).not.toBeChecked();

    await user.click(petsCheckbox);
    await user.click(furnishedCheckbox);

    expect(petsCheckbox).toBeChecked();
    expect(furnishedCheckbox).toBeChecked();
  });
});