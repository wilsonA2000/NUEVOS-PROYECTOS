/**
 * Tests for PaymentList component
 * Covers rendering, loading/error states, empty state, and transaction display.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PaymentList } from '../PaymentList';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock useAuth hook
const mockUseAuth = {
  isAuthenticated: true,
  isLoading: false,
};

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock usePayments hook
const mockDeleteTransaction = { mutateAsync: jest.fn() };
const mockUsePayments = {
  transactions: [] as any[],
  balance: null as any,
  isLoading: false,
  error: null as Error | null,
  deleteTransaction: mockDeleteTransaction,
};

jest.mock('../../../hooks/usePayments', () => ({
  usePayments: () => mockUsePayments,
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
        React.createElement(PaymentList)
      )
    )
  );
};

const sampleTransactions = [
  {
    id: 'tx-001',
    amount: 1500000,
    description: 'Pago mensual enero',
    status: 'completed',
    type: 'rent',
    created_at: '2025-01-15',
    payment_method: 'bank_transfer',
  },
  {
    id: 'tx-002',
    amount: 500000,
    description: 'Depósito de seguridad',
    status: 'pending',
    type: 'deposit',
    created_at: '2025-02-01',
    payment_method: 'stripe',
  },
];

describe('PaymentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.isAuthenticated = true;
    mockUseAuth.isLoading = false;
    mockUsePayments.transactions = [];
    mockUsePayments.balance = null;
    mockUsePayments.isLoading = false;
    mockUsePayments.error = null;
  });

  it('should show loading spinner when auth is loading', () => {
    mockUseAuth.isLoading = true;
    renderComponent();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show warning when not authenticated', () => {
    mockUseAuth.isAuthenticated = false;
    renderComponent();

    expect(
      screen.getByText(/Debes iniciar sesión para ver los pagos/i)
    ).toBeInTheDocument();
  });

  it('should show loading spinner when payments are loading', () => {
    mockUsePayments.isLoading = true;
    renderComponent();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show error message when loading fails', () => {
    mockUsePayments.error = new Error('Connection failed');
    renderComponent();

    expect(screen.getByText(/Error al cargar los pagos/i)).toBeInTheDocument();
  });

  it('should show empty state when no transactions exist', () => {
    mockUsePayments.transactions = [];
    renderComponent();

    expect(
      screen.getByText(/No hay transacciones disponibles/i)
    ).toBeInTheDocument();
  });

  it('should render the Pagos title', () => {
    renderComponent();

    expect(screen.getByText('Pagos')).toBeInTheDocument();
  });

  it('should render Nuevo Pago button', () => {
    renderComponent();

    expect(screen.getByText('Nuevo Pago')).toBeInTheDocument();
  });

  it('should navigate to new payment page when button is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByText('Nuevo Pago'));
    expect(mockNavigate).toHaveBeenCalledWith('/app/payments/new');
  });

  it('should render transaction cards when transactions exist', () => {
    mockUsePayments.transactions = sampleTransactions;
    renderComponent();

    expect(screen.getByText('Pago mensual enero')).toBeInTheDocument();
    expect(screen.getByText('Depósito de seguridad')).toBeInTheDocument();
  });

  it('should display balance card when balance is available', () => {
    mockUsePayments.balance = { current: 5000000, pending: 1500000 };
    renderComponent();

    expect(screen.getByText(/Balance Actual/i)).toBeInTheDocument();
  });
});
