/**
 * Tests for LandlordContractsDashboard component
 * Covers rendering, tab navigation, metrics display, and contract management actions.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn().mockReturnValue('15 ene 2025'),
  differenceInDays: jest.fn().mockReturnValue(60),
  parseISO: jest.fn().mockReturnValue(new Date('2025-01-15T10:00:00Z')),
  startOfMonth: jest.fn().mockReturnValue(new Date('2025-01-01')),
  endOfMonth: jest.fn().mockReturnValue(new Date('2025-01-31')),
}));

jest.mock('date-fns/locale', () => ({
  es: {},
}));

// Mock useAuth hook
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'landlord-1',
      user_type: 'landlord',
      first_name: 'Admin',
      last_name: 'Test',
    },
  }),
}));

// Mock LandlordContractService
const mockGetContracts = jest.fn();
const mockGetContractStatistics = jest.fn();

jest.mock('../../../services/landlordContractService', () => ({
  LandlordContractService: {
    getContracts: (filters: any) => mockGetContracts(filters),
    getContractStatistics: () => mockGetContractStatistics(),
    approveContract: jest.fn().mockResolvedValue({}),
    publishContract: jest.fn().mockResolvedValue({}),
  },
}));

// Mock sub-components
jest.mock('../../common/LoadingSpinner', () => ({
  LoadingSpinner: (props: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'loading-spinner' },
      props.message || 'Loading...'
    ),
}));

jest.mock('../TenantInvitationSystem', () => {
  return function MockInvitationSystem() {
    return React.createElement('div', { 'data-testid': 'invitation-system' });
  };
});

import LandlordContractsDashboard from '../LandlordContractsDashboard';

const theme = createTheme();

const renderComponent = () => {
  return render(
    React.createElement(
      ThemeProvider,
      { theme },
      React.createElement(LandlordContractsDashboard)
    )
  );
};

const sampleStatistics = {
  total_contracts: 10,
  monthly_income: 15000000,
  average_rent: 1500000,
  occupancy_rate: 85.5,
  pending_signatures: 2,
  objections_pending: 1,
  by_state: {
    DRAFT: 3,
    TENANT_INVITED: 1,
    TENANT_REVIEWING: 1,
    PUBLISHED: 5,
  },
};

const sampleContracts = [
  {
    id: 'lc-001',
    current_state: 'PUBLISHED',
    property_address: 'Calle 100 #20-30',
    contract_number: 'VH-2025-001',
    monthly_rent: 2000000,
    tenant_data: { full_name: 'Juan Perez', email: 'juan@test.com' },
    tenant_email: 'juan@test.com',
    created_at: '2025-01-15T10:00:00Z',
    end_date: '2026-01-15',
    landlord_signed: true,
    published: true,
  },
  {
    id: 'lc-002',
    current_state: 'DRAFT',
    property_address: 'Carrera 7 #45-10',
    monthly_rent: 1200000,
    tenant_data: null,
    tenant_email: '',
    created_at: '2025-02-01T10:00:00Z',
    end_date: null,
    landlord_signed: false,
    published: false,
  },
];

describe('LandlordContractsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetContracts.mockResolvedValue({ contracts: sampleContracts });
    mockGetContractStatistics.mockResolvedValue(sampleStatistics);
  });

  it('should show loading spinner initially', () => {
    mockGetContracts.mockImplementation(() => new Promise(() => {}));
    mockGetContractStatistics.mockImplementation(() => new Promise(() => {}));
    renderComponent();

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should render dashboard title after loading', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Dashboard de Arrendador/i)).toBeInTheDocument();
    });
  });

  it('should display contract table headers', async () => {
    renderComponent();

    await waitFor(() => {
      // Use getAllByText since some labels appear in both table headers and filters
      expect(screen.getAllByText('Propiedad').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Estado/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Arrendatario').length).toBeGreaterThanOrEqual(
        1
      );
      expect(screen.getAllByText('Canon').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should display contract data in table', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Calle 100 #20-30')).toBeInTheDocument();
      expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    });
  });

  it('should show error alert when loading fails', async () => {
    mockGetContracts.mockRejectedValue(new Error('Network error'));
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/Error al cargar dashboard/i)
      ).toBeInTheDocument();
    });
  });

  it('should render Nuevo Contrato button', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Nuevo Contrato')).toBeInTheDocument();
    });
  });

  it('should open create dialog when Nuevo Contrato is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Nuevo Contrato')).toBeInTheDocument();
    });

    // Click the header button (not the FAB)
    const buttons = screen.getAllByText('Nuevo Contrato');
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(screen.getByText('Crear Nuevo Contrato')).toBeInTheDocument();
    });
  });

  it('should display empty state for empty tab category', async () => {
    mockGetContracts.mockResolvedValue({ contracts: [] });
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/No hay contratos en esta categoría/i)
      ).toBeInTheDocument();
    });
  });

  it('should render search and filter controls', async () => {
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Buscar por dirección/i)
      ).toBeInTheDocument();
    });
  });

  it('should render tab labels', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Todos')).toBeInTheDocument();
      expect(screen.getByText('Borradores')).toBeInTheDocument();
      expect(screen.getByText('En Proceso')).toBeInTheDocument();
    });
  });
});
