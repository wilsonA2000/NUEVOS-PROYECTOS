/**
 * Tests for ContractDetail component
 * Covers rendering, loading/error states, action buttons, and contract info display.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ContractDetail } from '../ContractDetail';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'contract-001' }),
}));

// Mock useContracts hook
const mockUseContracts = {
  contracts: [] as any[],
  isLoading: false,
  error: null as Error | null,
};

jest.mock('../../../hooks/useContracts', () => ({
  useContracts: () => mockUseContracts,
}));

// Mock contractPdfUtils
jest.mock('../../../utils/contractPdfUtils', () => ({
  viewContractPDF: jest.fn(),
}));

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
        React.createElement(ContractDetail)
      )
    )
  );
};

const sampleContract = {
  id: 'contract-001',
  status: 'active',
  property: { title: 'Apartamento Centro', address: 'Calle 45 #12-34' },
  secondary_party: {
    first_name: 'Juan',
    last_name: 'Perez',
    email: 'juan@test.com',
  },
  start_date: '2025-01-01',
  end_date: '2026-01-01',
  monthly_rent: 1500000,
  deposit_amount: 3000000,
  total_value: 18000000,
  terms: 'Contrato de arrendamiento estándar',
};

describe('ContractDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContracts.contracts = [];
    mockUseContracts.isLoading = false;
    mockUseContracts.error = null;
  });

  it('should display loading state when data is loading', () => {
    mockUseContracts.isLoading = true;
    renderComponent();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display error state when there is an error', () => {
    mockUseContracts.error = new Error('Network error');
    renderComponent();

    expect(
      screen.getByText(/Error al cargar el contrato/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Network error/i)).toBeInTheDocument();
  });

  it('should display not found message when contract does not exist', () => {
    mockUseContracts.contracts = [];
    renderComponent();

    expect(screen.getByText(/Contrato no encontrado/i)).toBeInTheDocument();
  });

  it('should render contract information when contract is found', () => {
    mockUseContracts.contracts = [sampleContract];
    renderComponent();

    expect(screen.getByText(/Contrato #contract-001/i)).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('should display property information', () => {
    mockUseContracts.contracts = [sampleContract];
    renderComponent();

    expect(screen.getByText('Apartamento Centro')).toBeInTheDocument();
  });

  it('should display tenant information', () => {
    mockUseContracts.contracts = [sampleContract];
    renderComponent();

    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
  });

  it('should display contract terms', () => {
    mockUseContracts.contracts = [sampleContract];
    renderComponent();

    expect(
      screen.getByText('Contrato de arrendamiento estándar')
    ).toBeInTheDocument();
  });

  it('should navigate back when Volver button is clicked', () => {
    mockUseContracts.contracts = [sampleContract];
    renderComponent();

    const backButton = screen.getByText('Volver');
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/app/contracts');
  });

  it('should navigate to edit when Editar button is clicked', () => {
    mockUseContracts.contracts = [sampleContract];
    renderComponent();

    const editButton = screen.getByText('Editar');
    fireEvent.click(editButton);

    expect(mockNavigate).toHaveBeenCalledWith(
      '/app/contracts/contract-001/edit'
    );
  });

  it('should call viewContractPDF when PDF button is clicked', () => {
    const { viewContractPDF } = require('../../../utils/contractPdfUtils');
    mockUseContracts.contracts = [sampleContract];
    renderComponent();

    const pdfButton = screen.getByText(/Ver PDF del Contrato/i);
    fireEvent.click(pdfButton);

    expect(viewContractPDF).toHaveBeenCalledWith('contract-001');
  });
});
