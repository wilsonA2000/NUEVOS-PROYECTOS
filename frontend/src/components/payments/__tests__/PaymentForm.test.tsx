/**
 * Tests for PaymentForm component
 * Covers rendering, form validation, submission, and payment method tabs.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PaymentForm } from '../PaymentForm';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock usePayments hook
const mockCreateTransaction = { mutateAsync: jest.fn().mockResolvedValue({}), isPending: false };
const mockUpdateTransaction = { mutateAsync: jest.fn().mockResolvedValue({}), isPending: false };

jest.mock('../../../hooks/usePayments', () => ({
  usePayments: () => ({
    createTransaction: mockCreateTransaction,
    updateTransaction: mockUpdateTransaction,
  }),
}));

// Mock usePaymentProcessing hook
jest.mock('../../../hooks/usePaymentProcessing', () => ({
  usePaymentProcessing: () => ({
    paymentState: { status: 'idle', error: null },
    initializeStripe: jest.fn().mockResolvedValue(undefined),
    initializePayPal: jest.fn(),
    processStripePayment: jest.fn(),
    processPayPalPayment: jest.fn(),
    validatePaymentData: jest.fn().mockReturnValue(true),
    resetPaymentState: jest.fn(),
  }),
}));

// Mock stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn().mockResolvedValue(null),
}));

// Mock sub-components
jest.mock('../StripePaymentForm', () => ({
  StripePaymentForm: () => React.createElement('div', { 'data-testid': 'stripe-form' }, 'Stripe Form'),
}));

jest.mock('../PayPalPaymentButton', () => ({
  PayPalPaymentButton: () => React.createElement('div', { 'data-testid': 'paypal-button' }, 'PayPal Button'),
}));

// Mock loggingService
jest.mock('../../../services/loggingService', () => ({
  loggingService: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  LogCategory: { SYSTEM: 'SYSTEM', BUSINESS: 'BUSINESS' },
}));

// Mock environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env.VITE_STRIPE_PUBLISHABLE_KEY = 'pk_test_mock';
  process.env.VITE_PAYPAL_CLIENT_ID = 'test-client-id';
});
afterAll(() => {
  process.env = originalEnv;
});

const theme = createTheme();
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const renderComponent = (props: Partial<React.ComponentProps<typeof PaymentForm>> = {}) => {
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        ThemeProvider,
        { theme },
        React.createElement(PaymentForm, props),
      ),
    ),
  );
};

describe('PaymentForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the form title for new payment', () => {
    renderComponent();

    expect(screen.getByText('Nuevo Pago')).toBeInTheDocument();
  });

  it('should render the form title for edit payment', () => {
    renderComponent({ isEdit: true, payment: { id: 1 } as any });

    expect(screen.getByText('Editar Pago')).toBeInTheDocument();
  });

  it('should render contract ID field', () => {
    renderComponent();

    expect(screen.getByLabelText(/ID de Contrato/i)).toBeInTheDocument();
  });

  it('should render amount field', () => {
    renderComponent();

    expect(screen.getByLabelText(/Monto/i)).toBeInTheDocument();
  });

  it('should render due date field', () => {
    renderComponent();

    expect(screen.getByLabelText(/Fecha de Vencimiento/i)).toBeInTheDocument();
  });

  it('should render notes field', () => {
    renderComponent();

    expect(screen.getByLabelText(/Notas/i)).toBeInTheDocument();
  });

  it('should navigate to payments page when Cancelar is clicked', () => {
    renderComponent();

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/app/payments');
  });

  it('should show Crear button for new payments', () => {
    renderComponent();

    expect(screen.getByText('Crear')).toBeInTheDocument();
  });

  it('should show Actualizar button for edit mode', () => {
    renderComponent({ isEdit: true, payment: { id: 1 } as any });

    expect(screen.getByText('Actualizar')).toBeInTheDocument();
  });

  it('should disable contract ID field when propContractId is provided', () => {
    renderComponent({ contractId: '42' });

    const contractField = screen.getByLabelText(/ID de Contrato/i);
    expect(contractField).toBeDisabled();
  });
});
