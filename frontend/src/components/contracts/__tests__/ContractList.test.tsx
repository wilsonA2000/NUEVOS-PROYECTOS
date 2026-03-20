/**
 * Tests for ContractList component
 * Covers rendering, filtering by status, empty states, and menu actions.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ContractList } from '../ContractList';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock useAuth hook
const mockUseAuth = {
  user: { id: 'user-1', user_type: 'landlord', first_name: 'Admin', last_name: 'Test', email: 'admin@test.com' },
  isAuthenticated: true,
  isLoading: false,
};

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock useContracts hook
const mockDeleteContract = { mutateAsync: jest.fn() };
const mockUseContracts = {
  contracts: [] as any[],
  isLoading: false,
  error: null as Error | null,
  deleteContract: mockDeleteContract,
};

jest.mock('../../../hooks/useContracts', () => ({
  useContracts: () => mockUseContracts,
}));

// Mock contractService
jest.mock('../../../services/contractService', () => ({
  contractService: {
    sendContractForReview: jest.fn(),
  },
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

// Mock TenantContractsDashboard
jest.mock('../TenantContractsDashboard', () => {
  return function MockTenantDashboard() {
    return React.createElement('div', { 'data-testid': 'tenant-dashboard' }, 'Tenant Dashboard');
  };
});

const theme = createTheme();
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const renderComponent = () => {
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        ThemeProvider,
        { theme },
        React.createElement(ContractList),
      ),
    ),
  );
};

const activeContract = {
  id: 'c-001',
  status: 'active',
  property: { title: 'Casa Norte', address: 'Calle 100 #20-30' },
  secondary_party: { first_name: 'Maria', last_name: 'Lopez', email: 'maria@test.com' },
  start_date: '2025-01-01',
  monthly_rent: 2000000,
};

const expiredContract = {
  id: 'c-002',
  status: 'expired',
  property: { title: 'Apto Sur', address: 'Carrera 7 #45-10' },
  secondary_party: { first_name: 'Pedro', last_name: 'Garcia', email: 'pedro@test.com' },
  start_date: '2024-01-01',
  monthly_rent: 1200000,
};

describe('ContractList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.user = { id: 'user-1', user_type: 'landlord', first_name: 'Admin', last_name: 'Test', email: 'admin@test.com' };
    mockUseAuth.isAuthenticated = true;
    mockUseAuth.isLoading = false;
    mockUseContracts.contracts = [];
    mockUseContracts.isLoading = false;
    mockUseContracts.error = null;
  });

  it('should show loading spinner when auth is loading', () => {
    mockUseAuth.isLoading = true;
    renderComponent();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show warning when not authenticated', () => {
    mockUseAuth.isAuthenticated = false;
    renderComponent();

    expect(screen.getByText(/Debes iniciar sesión/i)).toBeInTheDocument();
  });

  it('should render TenantContractsDashboard for tenant users', () => {
    mockUseAuth.user = { ...mockUseAuth.user, user_type: 'tenant' };
    renderComponent();

    expect(screen.getByTestId('tenant-dashboard')).toBeInTheDocument();
  });

  it('should show loading spinner when contracts are loading', () => {
    mockUseContracts.isLoading = true;
    renderComponent();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display error message when loading fails', () => {
    mockUseContracts.error = new Error('Server error');
    renderComponent();

    expect(screen.getByText(/Error al cargar los contratos/i)).toBeInTheDocument();
  });

  it('should show empty state when no contracts match final statuses', () => {
    mockUseContracts.contracts = [{ id: 'c-draft', status: 'draft' }];
    renderComponent();

    expect(screen.getByText(/No tienes contratos activos o finalizados/i)).toBeInTheDocument();
  });

  it('should render active contracts as cards', () => {
    mockUseContracts.contracts = [activeContract];
    renderComponent();

    expect(screen.getByText(/Contrato #c-001/i)).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('should display Candidatos Aprobados button for landlords', () => {
    mockUseContracts.contracts = [activeContract];
    renderComponent();

    const candidatesButton = screen.getByText('Candidatos Aprobados');
    expect(candidatesButton).toBeInTheDocument();
  });

  it('should show the title Contratos', () => {
    mockUseContracts.contracts = [activeContract];
    renderComponent();

    expect(screen.getByText('Contratos')).toBeInTheDocument();
  });

  it('should show empty state text when contracts array is empty', () => {
    mockUseContracts.contracts = [];
    renderComponent();

    expect(screen.getByText(/No hay contratos disponibles/i)).toBeInTheDocument();
  });
});
