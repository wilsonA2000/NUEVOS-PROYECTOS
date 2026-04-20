import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePaymentProcessing } from '../usePaymentProcessing';
import { stripeService } from '../../services/stripeService';
import { paypalService } from '../../services/paypalService';
import { paymentService } from '../../services/paymentService';

// Mock services
jest.mock('../../services/stripeService');
jest.mock('../../services/paypalService');
jest.mock('../../services/paymentService');
jest.mock('../../services/loggingService', () => ({
  loggingService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  LogCategory: {
    API: 'API',
  },
}));

const mockStripeService = stripeService as jest.Mocked<typeof stripeService>;
const mockPaypalService = paypalService as jest.Mocked<typeof paypalService>;
const mockPaymentService = paymentService as jest.Mocked<typeof paymentService>;

// Test wrapper with fresh QueryClient per test
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePaymentProcessing Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPaymentService.getTransactionReport.mockResolvedValue([]);
    mockStripeService.getSavedPaymentMethods.mockResolvedValue([]);
    mockPaypalService.getTransactionHistory.mockResolvedValue([]);
  });

  it('should return initial payment state', () => {
    const { result } = renderHook(() => usePaymentProcessing(), {
      wrapper: createWrapper(),
    });

    expect(result.current.paymentState).toEqual({
      isProcessing: false,
      error: null,
      success: false,
      paymentId: null,
      requiresAction: false,
      clientSecret: null,
    });
  });

  it('should validate payment data correctly for valid data', () => {
    const { result } = renderHook(() => usePaymentProcessing(), {
      wrapper: createWrapper(),
    });

    const validData = { amount: 100, currency: 'USD' };
    const validation = result.current.validatePaymentData(validData);

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should reject invalid payment data with zero amount', () => {
    const { result } = renderHook(() => usePaymentProcessing(), {
      wrapper: createWrapper(),
    });

    const invalidData = { amount: 0, currency: 'USD' };
    const validation = result.current.validatePaymentData(invalidData);

    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should reject payment data with invalid currency code', () => {
    const { result } = renderHook(() => usePaymentProcessing(), {
      wrapper: createWrapper(),
    });

    const invalidData = { amount: 100, currency: 'US' };
    const validation = result.current.validatePaymentData(invalidData);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Código de moneda inválido');
  });

  it('should reject payment data exceeding max amount', () => {
    const { result } = renderHook(() => usePaymentProcessing(), {
      wrapper: createWrapper(),
    });

    const invalidData = { amount: 1000000, currency: 'USD' };
    const validation = result.current.validatePaymentData(invalidData);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('El monto excede el límite máximo');
  });

  it('should reset payment state', () => {
    const { result } = renderHook(() => usePaymentProcessing(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.resetPaymentState();
    });

    expect(result.current.paymentState).toEqual({
      isProcessing: false,
      error: null,
      success: false,
      paymentId: null,
      requiresAction: false,
      clientSecret: null,
    });
  });

  it('should initialize stripe successfully', async () => {
    mockStripeService.initialize.mockResolvedValue(undefined as any);

    const { result } = renderHook(() => usePaymentProcessing(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.initializeStripe('pk_test_123');
    });

    expect(mockStripeService.initialize).toHaveBeenCalledWith({
      publishableKey: 'pk_test_123',
    });
  });

  it('should throw error when processing stripe payment without initialization', async () => {
    const { result } = renderHook(() => usePaymentProcessing(), {
      wrapper: createWrapper(),
    });

    const paymentData = { amount: 100, currency: 'USD' };

    await expect(
      result.current.processStripePayment(paymentData),
    ).rejects.toThrow('Stripe not initialized');
  });

  it('should throw error when processing paypal payment without initialization', async () => {
    const { result } = renderHook(() => usePaymentProcessing(), {
      wrapper: createWrapper(),
    });

    const paymentData = { amount: 100, currency: 'USD' };

    await expect(
      result.current.processPayPalPayment(paymentData),
    ).rejects.toThrow('PayPal not initialized');
  });

  it('should handle stripe error via handlePaymentError', () => {
    mockStripeService.handleStripeError.mockReturnValue(
      'Stripe error occurred',
    );

    const { result } = renderHook(() => usePaymentProcessing(), {
      wrapper: createWrapper(),
    });

    const errorMsg = result.current.handlePaymentError(
      new Error('test'),
      'stripe',
    );
    expect(errorMsg).toBe('Stripe error occurred');
    expect(mockStripeService.handleStripeError).toHaveBeenCalled();
  });

  it('should handle paypal error via handlePaymentError', () => {
    mockPaypalService.handlePayPalError.mockReturnValue(
      'PayPal error occurred',
    );

    const { result } = renderHook(() => usePaymentProcessing(), {
      wrapper: createWrapper(),
    });

    const errorMsg = result.current.handlePaymentError(
      new Error('test'),
      'paypal',
    );
    expect(errorMsg).toBe('PayPal error occurred');
    expect(mockPaypalService.handlePayPalError).toHaveBeenCalled();
  });

  it('should load transaction history', async () => {
    const mockTransactions = [
      { id: 'txn-1', amount: 100, status: 'completed' },
      { id: 'txn-2', amount: 200, status: 'pending' },
    ];
    mockPaymentService.getTransactionReport.mockResolvedValue(
      mockTransactions as any,
    );

    const { result } = renderHook(() => usePaymentProcessing(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.transactionHistory).toEqual(mockTransactions);
    });
  });
});
