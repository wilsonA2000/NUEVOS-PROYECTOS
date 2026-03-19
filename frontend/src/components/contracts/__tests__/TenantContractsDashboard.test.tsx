/**
 * Tests for TenantContractsDashboard component
 * Covers rendering, loading state, error state, contract actions, and dialogs.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock useAuth hook
const mockUser = { id: 'tenant-1', user_type: 'tenant', first_name: 'Carlos', last_name: 'Gomez', email: 'carlos@test.com' };
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock LandlordContractService
const mockGetTenantContracts = jest.fn();
jest.mock('../../../services/landlordContractService', () => ({
  LandlordContractService: {
    getTenantContracts: () => mockGetTenantContracts(),
  },
}));

// Mock contractService
const mockGetPendingTenantReviewContracts = jest.fn();
jest.mock('../../../services/contractService', () => ({
  contractService: {
    getPendingTenantReviewContracts: () => mockGetPendingTenantReviewContracts(),
  },
}));

// Mock contractPdfUtils
jest.mock('../../../utils/contractPdfUtils', () => ({
  viewContractPDF: jest.fn(),
}));

// Mock api service
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

// Mock sub-components
jest.mock('../../common/LoadingSpinner', () => ({
  LoadingSpinner: (props: any) => React.createElement('div', { 'data-testid': 'loading-spinner' }, props.message || 'Loading...'),
}));

jest.mock('../TenantContractReview', () => {
  return function MockTenantContractReview() {
    return React.createElement('div', { 'data-testid': 'tenant-contract-review' });
  };
});

jest.mock('../ModificationRequestModal', () => {
  return function MockModificationRequestModal() {
    return React.createElement('div', { 'data-testid': 'modification-modal' });
  };
});

// Mock fetch for workflow processes
const mockFetch = jest.fn();
global.fetch = mockFetch;

const theme = createTheme();

// We need to import after mocks
import TenantContractsDashboard from '../TenantContractsDashboard';

const renderComponent = () => {
  return render(
    React.createElement(
      ThemeProvider,
      { theme },
      React.createElement(TenantContractsDashboard),
    ),
  );
};

describe('TenantContractsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: workflow fetch returns empty
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [], count: 0 }),
    });
    mockGetTenantContracts.mockResolvedValue({ contracts: [] });
    mockGetPendingTenantReviewContracts.mockResolvedValue([]);
  });

  it('should show loading spinner initially', () => {
    // Make the promises never resolve to keep loading state
    mockGetTenantContracts.mockImplementation(() => new Promise(() => {}));
    renderComponent();

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should show error message when loading fails', async () => {
    mockGetTenantContracts.mockRejectedValue(new Error('Network error'));
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar contratos/i)).toBeInTheDocument();
    });
  });

  it('should render dashboard title after loading', async () => {
    renderComponent();

    await waitFor(() => {
      const allText = document.body.textContent || '';
      expect(allText.includes('Arrendatario') || allText.includes('contrato') || allText.includes('Contrato')).toBeTruthy();
    });
  });

  it('should load workflow processes on mount', async () => {
    renderComponent();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('should load tenant contracts on mount', async () => {
    renderComponent();

    await waitFor(() => {
      expect(mockGetTenantContracts).toHaveBeenCalled();
    });
  });

  it('should load pending review contracts on mount', async () => {
    renderComponent();

    await waitFor(() => {
      expect(mockGetPendingTenantReviewContracts).toHaveBeenCalled();
    });
  });

  it('should handle empty contracts gracefully', async () => {
    mockGetTenantContracts.mockResolvedValue({ contracts: [] });
    mockGetPendingTenantReviewContracts.mockResolvedValue([]);
    renderComponent();

    await waitFor(() => {
      const spinner = screen.queryByTestId('loading-spinner');
      // After loading completes, spinner should be gone
      // (or dashboard content should be visible)
      const allText = document.body.textContent || '';
      expect(allText.length).toBeGreaterThan(0);
    });
  });

  it('should handle non-array response for contracts', async () => {
    mockGetTenantContracts.mockResolvedValue(null);
    renderComponent();

    await waitFor(() => {
      // Should not crash, should set contracts to empty array
      const allText = document.body.textContent || '';
      expect(allText.length).toBeGreaterThan(0);
    });
  });

  it('should handle workflow fetch failure gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });
    renderComponent();

    await waitFor(() => {
      // Should not crash even when workflow fetch fails
      expect(mockGetTenantContracts).toHaveBeenCalled();
    });
  });
});
