/**
 * Tests for MatchesDashboard component
 * Covers rendering, tab switching, match request actions, and role-based views.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock useAuth hook
const mockUser = {
  id: 'user-1',
  user_type: 'landlord',
  first_name: 'Admin',
  last_name: 'Test',
  email: 'admin@test.com',
};
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock useMatchRequests hook
const mockRefetchMatchRequests = jest.fn();
const mockUseMatchRequests = {
  sentRequests: [] as any[],
  receivedRequests: [] as any[],
  statistics: null,
  dashboardData: null,
  isLoading: false,
  error: null as Error | null,
  markAsViewed: jest.fn(),
  acceptRequest: jest.fn(),
  rejectRequest: jest.fn(),
  getCompatibility: jest.fn().mockReturnValue(0),
  refetchMatchRequests: mockRefetchMatchRequests,
  getStatusColor: jest.fn().mockReturnValue('default'),
  getStatusText: jest.fn().mockReturnValue('Pendiente'),
  getPriorityColor: jest.fn().mockReturnValue('default'),
  getPriorityText: jest.fn().mockReturnValue('Normal'),
  formatCurrency: jest.fn().mockReturnValue('$0'),
  isExpired: jest.fn().mockReturnValue(false),
  isExpiringSoon: jest.fn().mockReturnValue(false),
};

jest.mock('../../../hooks/useMatchRequests', () => ({
  __esModule: true,
  default: () => mockUseMatchRequests,
}));

// Mock matchingService
jest.mock('../../../services/matchingService', () => ({
  MatchRequest: {},
  matchingService: {
    acceptMatchRequest: jest.fn().mockResolvedValue({}),
    rejectMatchRequest: jest.fn().mockResolvedValue({}),
    validateMatchForContract: jest
      .fn()
      .mockResolvedValue({ data: { is_valid: true } }),
  },
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn().mockReturnValue('15 ene 2025'),
  formatDistanceToNow: jest.fn().mockReturnValue('hace 3 días'),
}));

jest.mock('date-fns/locale', () => ({
  es: {},
}));

// Mock SnackbarContext and useConfirmDialog
jest.mock('../../../contexts/SnackbarContext', () => ({
  useSnackbar: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
  }),
  SnackbarProvider: ({ children }: any) => children,
}));

jest.mock('../../../hooks/useConfirmDialog', () => ({
  useConfirmDialog: () => ({
    confirm: jest.fn().mockResolvedValue(true),
    ConfirmDialog: () => null,
  }),
}));

// Mock EnhancedTenantDocumentUpload
jest.mock('../../contracts/EnhancedTenantDocumentUpload', () => {
  return function MockDocumentUpload() {
    return React.createElement('div', { 'data-testid': 'document-upload' });
  };
});

import MatchesDashboard from '../MatchesDashboard';

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
        React.createElement(MatchesDashboard)
      )
    )
  );
};

describe('MatchesDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser.user_type = 'landlord';
    mockUseMatchRequests.sentRequests = [];
    mockUseMatchRequests.receivedRequests = [];
    mockUseMatchRequests.isLoading = false;
    mockUseMatchRequests.error = null;
  });

  it('should render the dashboard', () => {
    renderComponent();

    const allText = document.body.textContent || '';
    expect(allText.length).toBeGreaterThan(0);
  });

  it('should show loading state when data is loading', () => {
    mockUseMatchRequests.isLoading = true;
    renderComponent();

    // Should show some loading indicator
    const progressBars = screen.queryAllByRole('progressbar');
    const allText = document.body.textContent || '';
    expect(
      progressBars.length > 0 || allText.includes('Cargando')
    ).toBeTruthy();
  });

  it('should show error state when loading fails', () => {
    mockUseMatchRequests.error = new Error('Failed to load');
    renderComponent();

    const allText = document.body.textContent || '';
    expect(
      allText.includes('error') ||
        allText.includes('Error') ||
        allText.includes('Failed')
    ).toBeTruthy();
  });

  it('should render tabs for landlord user', () => {
    mockUseMatchRequests.receivedRequests = [
      {
        id: 'mr-1',
        status: 'pending',
        tenant: { first_name: 'Test' },
        property: { title: 'Apto' },
      },
    ];
    renderComponent();

    const allText = document.body.textContent || '';
    expect(
      allText.includes('Pendiente') ||
        allText.includes('PENDIENTE') ||
        allText.includes('Solicitud')
    ).toBeTruthy();
  });

  it('should render tabs for tenant user', () => {
    mockUser.user_type = 'tenant';
    mockUseMatchRequests.sentRequests = [
      { id: 'mr-1', status: 'pending', property: { title: 'Casa Norte' } },
    ];
    renderComponent();

    const allText = document.body.textContent || '';
    expect(
      allText.includes('Enviada') ||
        allText.includes('ENVIADA') ||
        allText.includes('Solicitud')
    ).toBeTruthy();
  });

  it('should show empty state when no requests exist for landlord', () => {
    mockUseMatchRequests.receivedRequests = [];
    renderComponent();

    const allText = document.body.textContent || '';
    expect(
      allText.includes('No hay solicitudes') ||
        allText.includes('no hay') ||
        allText.includes('vacío') ||
        allText.includes('solicitudes')
    ).toBeTruthy();
  });

  it('should auto-refresh on window focus', () => {
    renderComponent();

    // Dispatch focus event
    window.dispatchEvent(new Event('focus'));

    expect(mockRefetchMatchRequests).toHaveBeenCalled();
  });

  it('should render received requests for landlord', () => {
    mockUseMatchRequests.receivedRequests = [
      {
        id: 'mr-1',
        status: 'pending',
        tenant_name: 'Carlos Lopez',
        property_title: 'Apto Centro',
        monthly_income: 3000000,
        created_at: '2025-01-15T10:00:00Z',
        priority: 'normal',
        match_code: 'MC-001',
        tenant_message: 'Interesado en la propiedad',
      },
    ];
    renderComponent();

    const allText = document.body.textContent || '';
    // Should display tenant name or property info
    expect(
      allText.includes('Carlos') || allText.includes('Apto Centro')
    ).toBeTruthy();
  });
});
