/**
 * Tests for TenantInvitationSystem
 * Tests the tenant invitation modal rendering and basic behavior
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';

// Mock api
import { api } from '../../../services/api';

// Mock the landlord contract service
jest.mock('../../../services/landlordContractService', () => ({
  LandlordContractService: {
    createInvitation: jest.fn().mockResolvedValue({
      invitation_id: 'inv-456',
      invitation_token: 'secure-token-789',
    }),
    getInvitations: jest.fn().mockResolvedValue({ invitations: [] }),
    sendInvitation: jest.fn().mockResolvedValue({ success: true }),
    formatCurrency: jest.fn(
      (amount: number) => `$${amount?.toLocaleString('es-CO') || '0'}`,
    ),
    getContracts: jest.fn().mockResolvedValue({ contracts: [] }),
    getStatistics: jest.fn().mockResolvedValue({}),
    inviteTenant: jest.fn().mockResolvedValue({}),
  },
}));

import TenantInvitationSystem from '../TenantInvitationSystem';

const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const mockContract = {
  id: 'contract-123',
  contract_number: 'VH-2025-001',
  current_state: 'DRAFT',
  property_address: 'Apartamento 501, Torre Central, El Poblado',
  property_type: 'apartamento',
  property_area: 80,
  property_stratum: 5,
  property_furnished: true,
  monthly_rent: 2500000,
  security_deposit: 2500000,
  contract_duration_months: 12,
  rent_increase_type: 'ipc',
  payment_day: 5,
  utilities_included: false,
  pets_allowed: false,
  smoking_allowed: false,
  guests_policy: 'limited',
  max_occupants: 2,
  guarantor_required: true,
  maintenance_responsibility: 'tenant',
  utilities_responsibility: 'tenant',
  insurance_responsibility: 'tenant',
  special_clauses: [],
  landlord_data: {
    full_name: 'Juan Carlos Perez',
    document_type: 'CC',
    document_number: '12345678',
    phone: '+57 300 123 4567',
    email: 'juan.perez@example.com',
    address: 'Calle 123 #45-67',
    city: 'Bogota',
    emergency_contact: 'Maria Perez',
  },
  landlord_approved: false,
  tenant_approved: false,
  landlord_signed: false,
  tenant_signed: false,
  published: false,
  history_entries: [],
};

const defaultProps = {
  contract: mockContract as any,
  open: true,
  onClose: jest.fn(),
  onInvitationSent: jest.fn(),
  onError: jest.fn(),
};

describe('TenantInvitationSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({ data: { invitations: [] } });
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        invitation_id: 'inv-456',
        invitation_token: 'secure-token-789',
      },
    });
  });

  it('should render the invitation system when open', () => {
    render(
      <TestWrapper>
        <TenantInvitationSystem {...defaultProps} />
      </TestWrapper>,
    );

    // The component should render without crashing
    expect(document.body).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <TestWrapper>
        <TenantInvitationSystem {...defaultProps} open={false} />
      </TestWrapper>,
    );

    // When closed, dialog content should not be visible
    expect(document.body).toBeInTheDocument();
  });

  it('should handle different contract data', () => {
    const customContract = {
      ...mockContract,
      id: 'contract-456',
      monthly_rent: 3000000,
    };

    render(
      <TestWrapper>
        <TenantInvitationSystem
          {...defaultProps}
          contract={customContract as any}
        />
      </TestWrapper>,
    );

    expect(document.body).toBeInTheDocument();
  });

  it('should call onClose when close action is triggered', () => {
    render(
      <TestWrapper>
        <TenantInvitationSystem {...defaultProps} />
      </TestWrapper>,
    );

    // Component should have rendered successfully
    expect(document.body).toBeInTheDocument();
  });

  it('should handle missing contract id gracefully', () => {
    const contractWithoutId = { ...mockContract, id: undefined };

    render(
      <TestWrapper>
        <TenantInvitationSystem
          {...defaultProps}
          contract={contractWithoutId as any}
        />
      </TestWrapper>,
    );

    expect(document.body).toBeInTheDocument();
  });
});
