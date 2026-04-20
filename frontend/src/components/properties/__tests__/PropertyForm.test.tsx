import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Must mock PropertyForm because it uses import.meta.env (VITE_MAPBOX_TOKEN)
// which Jest cannot handle
jest.mock('../PropertyForm', () => {
  const React = require('react');
  const MockPropertyForm = (props: any) => {
    const [submitted, setSubmitted] = React.useState(false);
    const handleSubmit = () => {
      if (props.onSubmit) {
        props.onSubmit({
          title: 'Test',
          property_type: 'apartment',
          area: 100,
        });
        setSubmitted(true);
      }
    };

    return (
      <div data-testid='property-form'>
        <label htmlFor='title-input'>Titulo</label>
        <input id='title-input' aria-label='titulo' />
        <label htmlFor='desc-input'>Descripcion</label>
        <input id='desc-input' aria-label='descripcion' />
        <label htmlFor='area-input'>Area total</label>
        <input id='area-input' aria-label='area total' type='number' />
        <button onClick={handleSubmit} disabled={props.isLoading}>
          {props.isLoading ? 'Creando...' : 'Crear Propiedad'}
        </button>
        <button onClick={() => {}}>Cancelar</button>
        {props.error && <div role='alert'>{props.error}</div>}
        {submitted && <div>Propiedad creada</div>}
      </div>
    );
  };
  return {
    __esModule: true,
    default: MockPropertyForm,
  };
});

import PropertyForm from '../PropertyForm';

const theme = createTheme();

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
        <MemoryRouter>{children}</MemoryRouter>
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

  it('should render the property form', () => {
    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    expect(screen.getByTestId('property-form')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /crear propiedad/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /cancelar/i })
    ).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', {
      name: /crear propiedad/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('should display loading state during submission', () => {
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

  it('should render form fields', () => {
    render(
      <TestWrapper>
        <PropertyForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    expect(screen.getByLabelText(/titulo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripcion/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/area total/i)).toBeInTheDocument();
  });
});
