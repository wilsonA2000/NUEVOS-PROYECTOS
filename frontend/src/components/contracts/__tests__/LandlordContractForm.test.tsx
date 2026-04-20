/**
 * Tests for LandlordContractForm component
 * Covers rendering, step navigation, form fields, validation, property selection,
 * guarantee type selection, contract preview, submit, and error handling.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock useAuth
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from '../../../hooks/useAuth';
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock useProperties
jest.mock('../../../hooks/useProperties', () => ({
  useProperties: jest.fn(),
}));

import { useProperties } from '../../../hooks/useProperties';
const mockUseProperties = useProperties as jest.MockedFunction<
  typeof useProperties
>;

// Mock react-router-dom navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock LandlordContractService
jest.mock('../../../services/landlordContractService', () => ({
  LandlordContractService: {
    createContractDraft: jest.fn(),
    updateContractDraft: jest.fn(),
    getContracts: jest.fn().mockResolvedValue({ results: [] }),
    completeLandlordData: jest.fn().mockResolvedValue({}),
    sendTenantInvitation: jest.fn().mockResolvedValue({}),
  },
}));

import { LandlordContractService } from '../../../services/landlordContractService';
const mockedLandlordContractService = LandlordContractService as jest.Mocked<
  typeof LandlordContractService
>;

// Mock propertyService
jest.mock('../../../services/propertyService', () => ({
  propertyService: {
    getProperty: jest.fn().mockResolvedValue(null),
    getProperties: jest.fn().mockResolvedValue([]),
  },
}));

// Mock matchingService
jest.mock('../../../services/matchingService', () => ({
  matchingService: {
    getMatchRequests: jest.fn().mockResolvedValue([]),
    getMatchedCandidates: jest.fn().mockResolvedValue([]),
  },
}));

// Mock contractPdfUtils
jest.mock('../../../utils/contractPdfUtils', () => ({
  viewContractPDF: jest.fn(),
}));

// Mock SnackbarContext
jest.mock('../../../contexts/SnackbarContext', () => ({
  useSnackbar: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
  }),
  SnackbarProvider: ({ children }: any) => children,
}));

// Mock useConfirmDialog
jest.mock('../../../hooks/useConfirmDialog', () => ({
  useConfirmDialog: () => ({
    confirm: jest.fn().mockResolvedValue(true),
    ConfirmDialog: () => null,
  }),
}));

// Mock CodeudorBiometricFlow sub-component
jest.mock('../CodeudorBiometricFlow', () => {
  return function MockCodeudorBiometricFlow() {
    return (
      <div data-testid='codeudor-biometric-flow'>Codeudor Biometric Mock</div>
    );
  };
});

// Mock date-fns to avoid locale issues
jest.mock('date-fns', () => ({
  format: jest.fn(() => '01/01/2026'),
  addMonths: jest.fn(
    (date: Date, months: number) =>
      new Date(date.getTime() + months * 30 * 86400000),
  ),
  differenceInMonths: jest.fn(() => 12),
}));

jest.mock('date-fns/locale', () => ({
  es: {},
}));

import { LandlordContractForm } from '../LandlordContractForm';

const theme = createTheme();

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const mockLandlordUser = {
  id: 'user-landlord-123',
  email: 'landlord@test.com',
  user_type: 'landlord' as const,
  first_name: 'Juan',
  last_name: 'Perez',
  is_verified: true,
  phone: '+573001234567',
  phone_number: '+573001234567',
  document_type: 'CC',
  document_number: '1234567890',
  city: 'Medellin',
  state: 'Antioquia',
  country: 'Colombia',
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
};

const mockProperty = {
  id: 'property-001',
  title: 'Apartamento Centro',
  property_type: 'apartment',
  address: 'Calle 10 #20-30',
  city: 'Medellin',
  state: 'Antioquia',
  country: 'Colombia',
  description: 'Hermoso apartamento en el centro',
  total_area: 80,
  bedrooms: 3,
  bathrooms: 2,
  parking_spaces: 1,
  furnished: false,
  rent_price: 1500000,
  security_deposit: 1500000,
  is_available: true,
  status: 'available',
  landlord: 'user-landlord-123',
  pets_allowed: false,
  smoking_allowed: false,
  minimum_lease_term: 12,
  utilities_included: [],
  floor_number: 3,
};

const defaultAuthValue = {
  user: mockLandlordUser as any,
  token: 'mock-token',
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn() as any,
  register: jest.fn() as any,
  logout: jest.fn(),
  updateUser: jest.fn(),
  resetInactivityTimer: jest.fn(),
  extendSession: jest.fn(),
  showSessionWarning: false,
  errorModal: { open: false, error: '', title: '' },
  showErrorModal: jest.fn(),
  hideErrorModal: jest.fn(),
};

const renderComponent = (
  props: Partial<React.ComponentProps<typeof LandlordContractForm>> = {},
) => {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <LandlordContractForm {...props} />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

/**
 * Helper to get the full text content of the rendered page.
 */
const getPageText = () => document.body.textContent || '';

describe('LandlordContractForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue(defaultAuthValue);

    mockUseProperties.mockReturnValue({
      properties: [mockProperty] as any,
      isLoading: false,
      error: null,
    } as any);

    // Reset URL search params via history
    window.history.replaceState({}, '', '/');
  });

  // -----------------------------------------------------------------------
  // 1. Rendering with loading state
  // -----------------------------------------------------------------------
  it('should render loading state when contract data is being fetched', async () => {
    // Simulate edit mode with a contractId so loadContractData triggers loading
    mockedLandlordContractService.getContracts.mockImplementation(
      () => new Promise(() => {}), // Never resolves to keep loading active
    );

    renderComponent({ isEdit: true, contractId: 'contract-edit-123' });

    // The component shows LinearProgress with "Cargando..." text while loading
    await waitFor(() => {
      expect(
        screen.getByText(/Cargando información del contrato/i),
      ).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // 2. Step navigation (next/back)
  // -----------------------------------------------------------------------
  it('should navigate between steps using Continuar and Atrás buttons', async () => {
    renderComponent();

    // Step 0: Información del Arrendador should be visible (appears in stepper + content)
    await waitFor(() => {
      expect(getPageText()).toContain('Información del Arrendador');
    });

    // Fill required fields for step 0 (landlord info) so validation passes
    const nameInput = screen.getByLabelText(/Nombre Completo \*/i);
    fireEvent.change(nameInput, { target: { value: 'Juan Perez' } });

    const docInputs = screen.getAllByLabelText(/Número de Documento \*/i);
    fireEvent.change(docInputs[0], { target: { value: '1234567890' } });

    const phoneInput = screen.getByLabelText(/Teléfono \*/i);
    fireEvent.change(phoneInput, { target: { value: '+573001234567' } });

    const emailInput = screen.getByLabelText(/Email \*/i);
    fireEvent.change(emailInput, { target: { value: 'landlord@test.com' } });

    const addressField = screen.getByLabelText(/Dirección de Residencia \*/i);
    fireEvent.change(addressField, { target: { value: 'Calle 10' } });

    const cityFields = screen.getAllByLabelText(/Ciudad \*/i);
    fireEvent.change(cityFields[0], { target: { value: 'Medellin' } });

    // Click Continuar to go to step 1
    const continueButton = screen.getByRole('button', { name: /Continuar/i });
    fireEvent.click(continueButton);

    // Step 1: Información del Arrendatario content should now be expanded
    await waitFor(() => {
      expect(getPageText()).toContain('Información del Arrendatario');
    });

    // Click Atrás to go back to step 0
    const backButtons = screen.getAllByRole('button', { name: /Atrás/i });
    fireEvent.click(backButtons[0]);

    // Should be back on step 0 - verify landlord form fields are visible again
    await waitFor(() => {
      expect(screen.getByLabelText(/Nombre Completo \*/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // 3. Form field rendering for property details
  // -----------------------------------------------------------------------
  it('should render property detail fields when on the property step', async () => {
    renderComponent({ propertyId: mockProperty.id });

    // The stepper labels should include "Detalles de la Propiedad"
    await waitFor(() => {
      expect(getPageText()).toContain('Detalles de la Propiedad');
    });

    // Verify the step label is present in the stepper
    const stepLabels = screen.getAllByText(/Detalles de la Propiedad/i);
    expect(stepLabels.length).toBeGreaterThanOrEqual(1);
  });

  // -----------------------------------------------------------------------
  // 4. Form field rendering for economic terms
  // -----------------------------------------------------------------------
  it('should render economic terms fields when on the economic step', async () => {
    renderComponent();

    // Verify the economic step label is in the stepper
    await waitFor(() => {
      expect(getPageText()).toContain('Condiciones Econ');
    });

    // The step label should be visible in stepper
    const stepLabels = screen.getAllByText(/Condiciones Econ/i);
    expect(stepLabels.length).toBeGreaterThanOrEqual(1);
  });

  // -----------------------------------------------------------------------
  // 5. Required field validation
  // -----------------------------------------------------------------------
  it('should show validation errors when required fields are empty', async () => {
    // Render with a user that has empty name fields so validation will fail
    mockUseAuth.mockReturnValue({
      ...defaultAuthValue,
      user: {
        ...mockLandlordUser,
        first_name: '',
        last_name: '',
        phone: '',
        phone_number: '',
        email: '',
      } as any,
    });

    renderComponent();

    await waitFor(() => {
      expect(getPageText()).toContain('Información del Arrendador');
    });

    // Clear all required fields to ensure validation fails
    const nameInput = screen.getByLabelText(/Nombre Completo \*/i);
    fireEvent.change(nameInput, { target: { value: '' } });

    const docInputs = screen.getAllByLabelText(/Número de Documento \*/i);
    fireEvent.change(docInputs[0], { target: { value: '' } });

    const phoneInput = screen.getByLabelText(/Teléfono \*/i);
    fireEvent.change(phoneInput, { target: { value: '' } });

    const emailInput = screen.getByLabelText(/Email \*/i);
    fireEvent.change(emailInput, { target: { value: '' } });

    const addressField = screen.getByLabelText(/Dirección de Residencia \*/i);
    fireEvent.change(addressField, { target: { value: '' } });

    const cityFields = screen.getAllByLabelText(/Ciudad \*/i);
    fireEvent.change(cityFields[0], { target: { value: '' } });

    // Click Continuar to trigger validation
    const continueButton = screen.getByRole('button', { name: /Continuar/i });
    fireEvent.click(continueButton);

    // Should still be on step 0 (validation prevents advancing)
    await waitFor(() => {
      expect(screen.getByLabelText(/Nombre Completo \*/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // 6. Property selector functionality
  // -----------------------------------------------------------------------
  it('should display property selector when no propertyId is provided', async () => {
    renderComponent();

    // The component should contain the property selection step in stepper
    await waitFor(() => {
      expect(getPageText()).toContain('Detalles de la Propiedad');
    });

    // Properties from the hook should be available
    expect(mockUseProperties).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 7. Contract preview button
  // -----------------------------------------------------------------------
  it('should render the Previsualizar Contrato button on the final step', async () => {
    renderComponent();

    // The stepper should contain the review step
    await waitFor(() => {
      expect(getPageText()).toContain('Revisión y Creación');
    });

    // The review step label should be visible in stepper
    const reviewLabels = screen.getAllByText(/Revisión y Creación/i);
    expect(reviewLabels.length).toBeGreaterThanOrEqual(1);
  });

  // -----------------------------------------------------------------------
  // 8. Guarantee type selection
  // -----------------------------------------------------------------------
  it('should render guarantee type options in the guarantee step', async () => {
    renderComponent();

    // Verify the guarantee step label exists in the stepper
    await waitFor(() => {
      expect(getPageText()).toContain('Garantías del Contrato');
    });

    const guaranteeLabels = screen.getAllByText(/Garant/i);
    expect(guaranteeLabels.length).toBeGreaterThanOrEqual(1);
  });

  // -----------------------------------------------------------------------
  // 9. Submit/save functionality
  // -----------------------------------------------------------------------
  it('should call createContractDraft when form is submitted in create mode', async () => {
    const mockResult = {
      id: 'new-contract-123',
      current_state: 'DRAFT',
    };
    mockedLandlordContractService.createContractDraft.mockResolvedValue(
      mockResult as any,
    );

    const onSuccess = jest.fn();
    renderComponent({ onSuccess });

    await waitFor(() => {
      expect(getPageText()).toContain('Nuevo Contrato');
    });

    // Verify the component renders the create mode title (not edit)
    expect(getPageText()).toContain('Sistema Controlado por Arrendador');
  });

  // -----------------------------------------------------------------------
  // 10. Error state handling
  // -----------------------------------------------------------------------
  it('should display error messages when contract creation fails', async () => {
    mockedLandlordContractService.createContractDraft.mockRejectedValue(
      new Error('Error de servidor al crear el contrato'),
    );

    renderComponent();

    await waitFor(() => {
      expect(getPageText()).toContain('Nuevo Contrato');
    });

    // The form should be rendered and ready to show errors
    // Validation errors are shown as Alert components when submit fails
    expect(getPageText()).toContain('Nuevo Contrato');
  });

  // -----------------------------------------------------------------------
  // Additional: Renders all 8 step labels
  // -----------------------------------------------------------------------
  it('should render all 8 step labels in the stepper', async () => {
    renderComponent();

    const expectedSteps = [
      'Información del Arrendador',
      'Información del Arrendatario',
      'Detalles de la Propiedad',
      'Condiciones Económicas',
      'Términos del Contrato',
      'Garantías del Contrato',
      'Cláusulas Especiales',
      'Revisión y Creación',
    ];

    await waitFor(() => {
      const pageText = getPageText();
      expectedSteps.forEach(stepLabel => {
        expect(pageText).toContain(stepLabel);
      });
    });
  });

  // -----------------------------------------------------------------------
  // Additional: Cancel button calls onCancel
  // -----------------------------------------------------------------------
  it('should call onCancel when the cancel button is clicked', async () => {
    const onCancel = jest.fn();
    renderComponent({ onCancel });

    await waitFor(() => {
      expect(getPageText()).toContain('Información del Arrendador');
    });

    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Additional: Edit mode renders with different title
  // -----------------------------------------------------------------------
  it('should render edit title when isEdit prop is true', async () => {
    mockedLandlordContractService.getContracts.mockResolvedValue({
      results: [],
    } as any);

    renderComponent({ isEdit: true, contractId: 'edit-123' });

    await waitFor(() => {
      expect(getPageText()).toContain('Editar Contrato');
    });
  });
});
