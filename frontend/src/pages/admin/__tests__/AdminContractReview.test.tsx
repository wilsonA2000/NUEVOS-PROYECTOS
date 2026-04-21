/**
 * Tests for AdminContractReview page
 * Covers rendering, loading state, contract details, approval/rejection,
 * biometric status, parties, financial details, timeline, error state, and navigation.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminContractReview from '../AdminContractReview';

// Mock admin service
jest.mock('../../../services/adminService', () => ({
  AdminService: {
    getContractForReview: jest.fn(),
    approveContract: jest.fn(),
    rejectContract: jest.fn(),
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
      props.message || 'Loading...',
    );
  };
});

// Mock ContractApprovalModal
jest.mock('../../../components/admin/ContractApprovalModal', () => {
  return function MockApprovalModal(props: any) {
    if (!props.open) return null;
    return React.createElement(
      'div',
      { 'data-testid': 'approval-modal' },
      React.createElement('span', null, `Aprobar: ${props.contractTitle}`),
      React.createElement(
        'button',
        { onClick: () => props.onConfirm({ notes: 'Aprobado' }) },
        'Confirmar Aprobacion',
      ),
      React.createElement(
        'button',
        { onClick: props.onClose },
        'Cancelar Aprobacion',
      ),
    );
  };
});

// Mock ContractRejectionModal
jest.mock('../../../components/admin/ContractRejectionModal', () => {
  return function MockRejectionModal(props: any) {
    if (!props.open) return null;
    return React.createElement(
      'div',
      { 'data-testid': 'rejection-modal' },
      React.createElement('span', null, `Rechazar: ${props.contractTitle}`),
      React.createElement(
        'button',
        {
          onClick: () =>
            props.onConfirm({
              notes: 'Rechazado',
              requires_resubmission: true,
            }),
        },
        'Confirmar Rechazo',
      ),
      React.createElement(
        'button',
        { onClick: props.onClose },
        'Cancelar Rechazo',
      ),
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

const mockContract = {
  id: 'contract-abc-123',
  contract_number: 'VH-100',
  property_title: 'Apartamento Centro Bogota',
  property_address: 'Calle 72 #10-30, Bogota',
  landlord_name: 'Carlos Gomez',
  landlord_email: 'carlos@example.com',
  tenant_name: 'Maria Lopez',
  tenant_email: 'maria@example.com',
  current_state: 'PENDING_ADMIN',
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-20T10:00:00Z',
  days_pending: 5,
  review_cycle_count: 1,
  is_urgent: false,
  is_locked: false,
  monthly_rent: 2500000,
  start_date: '2026-02-01T00:00:00Z',
  end_date: '2027-01-31T00:00:00Z',
  deposit_amount: 5000000,
  payment_day: 5,
  has_codeudor: false,
  clauses: [
    {
      key: 'clause_1',
      title: 'Objeto del Contrato',
      content: 'El arrendador entrega en arrendamiento el inmueble descrito.',
      is_custom: false,
    },
    {
      key: 'clause_2',
      title: 'Canon de Arrendamiento',
      content: 'El canon mensual sera de $2.500.000 COP.',
      is_custom: true,
    },
  ],
  history_entries: [
    {
      id: 'hist-1',
      action_type: 'CREATE',
      action_description: 'Contrato creado',
      performed_by_name: 'Carlos Ramirez',
      user_role: 'landlord' as const,
      timestamp: '2026-01-15T10:00:00Z',
    },
    {
      id: 'hist-2',
      action_type: 'STATE_CHANGE',
      action_description: 'Enviado a revision',
      performed_by_name: 'Carlos Ramirez',
      user_role: 'landlord' as const,
      old_state: 'DRAFT',
      new_state: 'PENDING_ADMIN_REVIEW',
      timestamp: '2026-01-16T09:00:00Z',
    },
  ],
  tenant_return_notes: undefined,
};

const mockAdminPermissions = {
  canApproveContracts: true,
  canRejectContracts: true,
  canViewAuditLogs: true,
  canExportReports: true,
  canManageUsers: false,
  canAccessSecurityPanel: false,
};

const renderComponent = (
  contractId = 'contract-abc-123',
  searchParams = '',
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: [
          `/app/admin/contracts/${contractId}/review${searchParams}`,
        ],
      },
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(
          ThemeProvider,
          { theme },
          React.createElement(
            Routes,
            null,
            React.createElement(Route, {
              path: '/app/admin/contracts/:contractId/review',
              element: React.createElement(AdminContractReview),
            }),
          ),
        ),
      ),
    ),
  );
};

describe('AdminContractReview', () => {
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
      adminPermissions: mockAdminPermissions,
    });
    mockedAdminService.getContractForReview.mockResolvedValue(
      mockContract as any,
    );
    mockedAdminService.approveContract.mockResolvedValue({
      success: true,
      message: 'Contrato aprobado',
      new_state: 'DRAFT',
    });
    mockedAdminService.rejectContract.mockResolvedValue({
      success: true,
      message: 'Contrato rechazado',
      new_state: 'RETURNED',
    });
  });

  it('should show loading spinner while fetching contract data', () => {
    mockedAdminService.getContractForReview.mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    renderComponent();

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(
      screen.getByText(/Cargando detalles del contrato/i),
    ).toBeInTheDocument();
  });

  it('should display contract details after loading', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Apartamento Centro Bogota')).toBeInTheDocument();
    });

    // Property address in card subheader
    expect(screen.getByText('Calle 72 #10-30, Bogota')).toBeInTheDocument();

    // Status chip
    expect(screen.getByText('Pendiente')).toBeInTheDocument();

    // Days pending chip
    expect(screen.getByText(/5 d\u00edas pendiente/i)).toBeInTheDocument();
  });

  it('should display approve button and open approval modal on click', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Apartamento Centro Bogota')).toBeInTheDocument();
    });

    const approveButton = screen.getByRole('button', {
      name: /Aprobar Contrato/i,
    });
    expect(approveButton).toBeInTheDocument();
    expect(approveButton).not.toBeDisabled();

    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(screen.getByTestId('approval-modal')).toBeInTheDocument();
      expect(
        screen.getByText(/Aprobar: Apartamento Centro Bogota/),
      ).toBeInTheDocument();
    });
  });

  it('should display reject button and open rejection modal on click', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Apartamento Centro Bogota')).toBeInTheDocument();
    });

    const rejectButton = screen.getByRole('button', { name: /Rechazar/i });
    expect(rejectButton).toBeInTheDocument();
    expect(rejectButton).not.toBeDisabled();

    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(screen.getByTestId('rejection-modal')).toBeInTheDocument();
      expect(
        screen.getByText(/Rechazar: Apartamento Centro Bogota/),
      ).toBeInTheDocument();
    });
  });

  it('should display biometric status with re-revision chip when applicable', async () => {
    mockedAdminService.getContractForReview.mockResolvedValue({
      ...mockContract,
      current_state: 'RE_PENDING_ADMIN',
      review_cycle_count: 3,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Apartamento Centro Bogota')).toBeInTheDocument();
    });

    // Re-Revision chip
    expect(screen.getByText(/Re-Revisi\u00f3n/i)).toBeInTheDocument();

    // Cycle count chip
    expect(screen.getByText(/Ciclo de revisi\u00f3n #3/i)).toBeInTheDocument();
  });

  it('should display contract parties information', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Apartamento Centro Bogota')).toBeInTheDocument();
    });

    // Landlord info
    expect(screen.getByText('Carlos Gomez')).toBeInTheDocument();
    expect(
      screen.getAllByText('carlos@example.com').length,
    ).toBeGreaterThanOrEqual(1);

    // Tenant info
    expect(screen.getByText('Maria Lopez')).toBeInTheDocument();
    expect(screen.getByText('maria@example.com')).toBeInTheDocument();

    // Section headers
    expect(screen.getByText('Arrendador')).toBeInTheDocument();
    expect(screen.getByText('Arrendatario')).toBeInTheDocument();
  });

  it('should display financial details correctly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Apartamento Centro Bogota')).toBeInTheDocument();
    });

    // Canon Mensual label
    expect(screen.getByText('Canon Mensual')).toBeInTheDocument();

    // Deposito label
    expect(screen.getByText(/Dep\u00f3sito/i)).toBeInTheDocument();

    // Payment day
    expect(screen.getByText(/D\u00eda 5 de cada mes/i)).toBeInTheDocument();

    // Date labels
    expect(screen.getByText('Fecha Inicio')).toBeInTheDocument();
    expect(screen.getByText('Fecha Fin')).toBeInTheDocument();
  });

  it('should display workflow history timeline', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Apartamento Centro Bogota')).toBeInTheDocument();
    });

    // History section header
    expect(screen.getByText('Historial')).toBeInTheDocument();

    // History entries - use getAllByText since text may appear in multiple places
    const pageText = document.body.textContent || '';
    expect(pageText).toContain('Contrato creado');
    expect(pageText).toContain('Enviado a revision');
  });

  it('should display error state when contract is not found', async () => {
    mockedAdminService.getContractForReview.mockRejectedValue(
      new Error('No encontrado'),
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/Error al cargar el contrato/i),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/No encontrado/i)).toBeInTheDocument();

    // Back button present
    const backButton = screen.getByRole('button', {
      name: /Volver a la lista/i,
    });
    expect(backButton).toBeInTheDocument();
  });

  it('should display navigation back button and breadcrumbs', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Apartamento Centro Bogota')).toBeInTheDocument();
    });

    // Back button
    const volverButton = screen.getByRole('button', { name: /Volver/i });
    expect(volverButton).toBeInTheDocument();

    // Breadcrumbs
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Contratos')).toBeInTheDocument();
    expect(screen.getByText(/Revisi\u00f3n/i)).toBeInTheDocument();
  });

  it('should show urgent alert when contract is urgent', async () => {
    mockedAdminService.getContractForReview.mockResolvedValue({
      ...mockContract,
      is_urgent: true,
      days_pending: 10,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Apartamento Centro Bogota')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/lleva m\u00e1s de 7 d\u00edas pendiente/i),
    ).toBeInTheDocument();
  });

  it('should display codeudor information when has_codeudor is true', async () => {
    mockedAdminService.getContractForReview.mockResolvedValue({
      ...mockContract,
      has_codeudor: true,
      codeudor_name: 'Pedro Ramirez',
      codeudor_email: 'pedro@example.com',
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Apartamento Centro Bogota')).toBeInTheDocument();
    });

    expect(screen.getByText('Codeudor')).toBeInTheDocument();
    expect(screen.getByText('Pedro Ramirez')).toBeInTheDocument();
    expect(screen.getByText('pedro@example.com')).toBeInTheDocument();
  });

  it('should show empty history message when no workflow history exists', async () => {
    mockedAdminService.getContractForReview.mockResolvedValue({
      ...mockContract,
      history_entries: [],
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Apartamento Centro Bogota')).toBeInTheDocument();
    });

    expect(screen.getByText(/Sin historial previo/i)).toBeInTheDocument();
  });
});
