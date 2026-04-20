/**
 * Tests for AdminDashboard page
 * Covers rendering, loading state, data display, error handling, and navigation.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../AdminDashboard';

// Mock admin service
jest.mock('../../../services/adminService', () => ({
  AdminService: {
    getContractStats: jest.fn(),
    getPendingContracts: jest.fn(),
  },
}));

// Mock useAdminAuth hook
jest.mock('../../../hooks/useAdminAuth', () => ({
  useAdminAuth: jest.fn(),
}));

// Mock LoadingSpinner
jest.mock('../../../components/common/LoadingSpinner', () => {
  return function MockLoadingSpinner(props: any) {
    return React.createElement(
      'div',
      { 'data-testid': 'loading-spinner' },
      props.message || 'Loading...'
    );
  };
});

import { AdminService } from '../../../services/adminService';
import { useAdminAuth } from '../../../hooks/useAdminAuth';

const mockedAdminService = AdminService as jest.Mocked<typeof AdminService>;
const mockedUseAdminAuth = useAdminAuth as jest.MockedFunction<
  typeof useAdminAuth
>;

const theme = createTheme();

const renderComponent = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(
          ThemeProvider,
          { theme },
          React.createElement(AdminDashboard)
        )
      )
    )
  );
};

describe('AdminDashboard', () => {
  const mockStats = {
    total_contracts: 50,
    pending_review: 5,
    approved_today: 3,
    rejected_today: 1,
    avg_review_time_hours: 24,
    urgent_contracts: 2,
    by_state: { DRAFT: 5, PUBLISHED: 10 },
  };

  const mockPendingContracts = [
    {
      id: 'contract-1',
      contract_number: 'VH-001',
      property_address: 'Calle 123, Bogota',
      landlord_name: 'Juan Perez',
      landlord_email: 'juan@example.com',
      created_at: '2025-01-01T00:00:00Z',
      days_pending: 10,
      is_urgent: true,
      monthly_rent: 2500000,
    },
    {
      id: 'contract-2',
      contract_number: 'VH-002',
      property_address: 'Carrera 45, Medellin',
      landlord_name: 'Maria Garcia',
      landlord_email: 'maria@example.com',
      created_at: '2025-01-05T00:00:00Z',
      days_pending: 3,
      is_urgent: false,
      monthly_rent: 3000000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAdminAuth.mockReturnValue({
      isAdmin: true,
      isStaff: true,
      isSuperuser: false,
      isLoading: false,
      error: null,
      checkAdminAccess: jest.fn().mockReturnValue(true),
      redirectIfNotAdmin: jest.fn(),
      adminPermissions: {
        canApproveContracts: true,
        canRejectContracts: true,
        canViewAuditLogs: true,
        canExportReports: true,
        canManageUsers: false,
        canAccessSecurityPanel: false,
      },
    });
    mockedAdminService.getContractStats.mockResolvedValue(mockStats);
    mockedAdminService.getPendingContracts.mockResolvedValue(
      mockPendingContracts
    );
  });

  it('should show loading spinner while fetching data', () => {
    mockedAdminService.getContractStats.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderComponent();

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should render dashboard title after loading', async () => {
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/Dashboard de Administraci/i)
      ).toBeInTheDocument();
    });
  });

  it('should display stat cards with correct values', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // pending_review
      expect(screen.getByText('2')).toBeInTheDocument(); // urgent_contracts
      expect(screen.getByText('3')).toBeInTheDocument(); // approved_today
      expect(screen.getByText('1')).toBeInTheDocument(); // rejected_today
    });
  });

  it('should display pending contracts heading', async () => {
    renderComponent();

    // Wait for stats to fully load (stat value appears only after data loads)
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // pending_review value
    });

    // Check that the stat card label and/or section heading with "Pendientes" exists
    const pendingElements = screen.getAllByText(/Pendientes/i);
    expect(pendingElements.length).toBeGreaterThan(0);
  });

  it('should display urgent alert when urgent contracts exist', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/contrato\(s\) llevan m/i)).toBeInTheDocument();
    });
  });

  it('should not display urgent alert when no urgent contracts', async () => {
    mockedAdminService.getContractStats.mockResolvedValue({
      ...mockStats,
      urgent_contracts: 0,
    });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/Dashboard de Administraci/i)
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/contrato\(s\) llevan m/i)
    ).not.toBeInTheDocument();
  });

  it('should display error alert when stats fetch fails', async () => {
    mockedAdminService.getContractStats.mockRejectedValue(
      new Error('Server error')
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar/i)).toBeInTheDocument();
    });
  });

  it('should display empty state when no pending contracts', async () => {
    mockedAdminService.getPendingContracts.mockResolvedValue([]);

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/No hay contratos pendientes/i)
      ).toBeInTheDocument();
    });
  });
});
