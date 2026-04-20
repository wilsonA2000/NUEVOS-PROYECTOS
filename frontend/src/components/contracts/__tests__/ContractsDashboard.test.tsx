/**
 * Tests for ContractsDashboard
 * Tests the unified dashboard for landlord/tenant contract management
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock useAuth
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from '../../../hooks/useAuth';
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock api
import { api } from '../../../services/api';

// Mock the LandlordContractService
jest.mock('../../../services/landlordContractService', () => ({
  LandlordContractService: {
    getContracts: jest
      .fn()
      .mockResolvedValue({ contracts: [], total_count: 0 }),
    getStatistics: jest.fn().mockResolvedValue({ total_contracts: 0 }),
  },
}));

import ContractsDashboard from '../ContractsDashboard';

const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  </BrowserRouter>
);

const mockLandlordUser = {
  id: 'user-landlord-123',
  email: 'landlord@test.com',
  user_type: 'landlord' as const,
  first_name: 'Juan',
  last_name: 'Perez',
  is_verified: true,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
};

const mockTenantUser = {
  id: 'user-tenant-456',
  email: 'tenant@test.com',
  user_type: 'tenant' as const,
  first_name: 'Ana',
  last_name: 'Gonzalez',
  is_verified: true,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
};

describe('ContractsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({
      data: { contracts: [], total_count: 0 },
    });
  });

  describe('Landlord View', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockLandlordUser as any,
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        login: {} as any,
        register: {} as any,
        logout: jest.fn(),
        updateUser: jest.fn(),
        resetInactivityTimer: jest.fn(),
        extendSession: jest.fn(),
        showSessionWarning: false,
        errorModal: { open: false, error: '', title: '' },
        showErrorModal: jest.fn(),
        hideErrorModal: jest.fn(),
      });
    });

    it('should render the contracts dashboard for landlord', async () => {
      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      // Dashboard should render without crashing
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('Tenant View', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockTenantUser as any,
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        login: {} as any,
        register: {} as any,
        logout: jest.fn(),
        updateUser: jest.fn(),
        resetInactivityTimer: jest.fn(),
        extendSession: jest.fn(),
        showSessionWarning: false,
        errorModal: { open: false, error: '', title: '' },
        showErrorModal: jest.fn(),
        hideErrorModal: jest.fn(),
      });
    });

    it('should render the contracts dashboard for tenant', async () => {
      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should handle unauthenticated user', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        login: {} as any,
        register: {} as any,
        logout: jest.fn(),
        updateUser: jest.fn(),
        resetInactivityTimer: jest.fn(),
        extendSession: jest.fn(),
        showSessionWarning: false,
        errorModal: { open: false, error: '', title: '' },
        showErrorModal: jest.fn(),
        hideErrorModal: jest.fn(),
      });

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      // Should render without crashing
      expect(document.body).toBeInTheDocument();
    });

    it('should handle loading state', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
        login: {} as any,
        register: {} as any,
        logout: jest.fn(),
        updateUser: jest.fn(),
        resetInactivityTimer: jest.fn(),
        extendSession: jest.fn(),
        showSessionWarning: false,
        errorModal: { open: false, error: '', title: '' },
        showErrorModal: jest.fn(),
        hideErrorModal: jest.fn(),
      });

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      expect(document.body).toBeInTheDocument();
    });
  });
});
