import { paymentService } from '../paymentService';
import { api } from '../api';
import { jest } from '@jest/globals';

// Mock the API
jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPayment = {
    id: '1',
    amount: 1000,
    currency: 'EUR',
    status: 'completed' as const,
    payment_method: 'card',
    description: 'Monthly rent payment',
    contract_id: '1',
    payer_id: '2',
    recipient_id: '1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    due_date: '2024-01-01',
    paid_at: '2024-01-01T12:00:00Z'
  };

  const mockCreatePaymentDto = {
    amount: 1200,
    currency: 'EUR',
    description: 'Security deposit',
    contract_id: '1',
    recipient_id: '1',
    due_date: '2024-02-01'
  };

  describe('getPayments', () => {
    it('should fetch all payments successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockPayment] });

      const result = await paymentService.getPayments();

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/payments/');
      expect(result).toEqual([mockPayment]);
    });

    it('should fetch payments with filters', async () => {
      const filters = {
        status: 'pending',
        contract_id: '1',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      mockedApi.get.mockResolvedValueOnce({ data: [mockPayment] });

      const result = await paymentService.getPayments(filters);

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/payments/', { params: filters });
      expect(result).toEqual([mockPayment]);
    });

    it('should handle API errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(paymentService.getPayments()).rejects.toThrow('API Error');
    });
  });

  describe('getPayment', () => {
    it('should fetch single payment successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockPayment });

      const result = await paymentService.getPayment('1');

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/payments/1/');
      expect(result).toEqual(mockPayment);
    });
  });

  describe('createPayment', () => {
    it('should create payment successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockPayment });

      const result = await paymentService.createPayment(mockCreatePaymentDto);

      expect(mockedApi.post).toHaveBeenCalledWith('/payments/payments/', mockCreatePaymentDto);
      expect(result).toEqual(mockPayment);
    });

    it('should handle validation errors', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { amount: ['This field is required'] }
        }
      };

      mockedApi.post.mockRejectedValueOnce(mockError);

      await expect(paymentService.createPayment(mockCreatePaymentDto)).rejects.toThrow();
    });
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const paymentData = {
        payment_method_id: 'pm_123456',
        confirm: true
      };

      const processedPayment = { ...mockPayment, status: 'completed' as const };
      mockedApi.post.mockResolvedValueOnce({ data: processedPayment });

      const result = await paymentService.processPayment('1', paymentData);

      expect(mockedApi.post).toHaveBeenCalledWith('/payments/1/process/', paymentData);
      expect(result).toEqual(processedPayment);
    });

    it('should handle payment processing errors', async () => {
      const paymentData = {
        payment_method_id: 'pm_invalid',
        confirm: true
      };

      const mockError = {
        response: {
          status: 402,
          data: { error: 'Payment failed: insufficient funds' }
        }
      };

      mockedApi.post.mockRejectedValueOnce(mockError);

      await expect(paymentService.processPayment('1', paymentData)).rejects.toThrow();
    });
  });

  describe('refundPayment', () => {
    it('should refund payment successfully', async () => {
      const refundData = {
        amount: 500,
        reason: 'Partial refund for early termination'
      };

      mockedApi.post.mockResolvedValueOnce({ data: { refund_id: 'ref_123', status: 'succeeded' } });

      const result = await paymentService.refundPayment('1', refundData);

      expect(mockedApi.post).toHaveBeenCalledWith('/payments/1/refund/', refundData);
      expect(result).toEqual({ refund_id: 'ref_123', status: 'succeeded' });
    });
  });

  describe('getPaymentMethods', () => {
    it('should fetch payment methods successfully', async () => {
      const paymentMethods = [
        { id: 'pm_1', type: 'card', last4: '4242', brand: 'visa' },
        { id: 'pm_2', type: 'bank_account', last4: '1234', bank_name: 'Chase' }
      ];

      mockedApi.get.mockResolvedValueOnce({ data: paymentMethods });

      const result = await paymentService.getPaymentMethods();

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/payment-methods/');
      expect(result).toEqual(paymentMethods);
    });
  });

  describe('addPaymentMethod', () => {
    it('should add payment method successfully', async () => {
      const paymentMethodData = {
        type: 'card',
        token: 'tok_123456'
      };

      const newPaymentMethod = { id: 'pm_new', type: 'card', last4: '1234', brand: 'mastercard' };
      mockedApi.post.mockResolvedValueOnce({ data: newPaymentMethod });

      const result = await paymentService.addPaymentMethod(paymentMethodData);

      expect(mockedApi.post).toHaveBeenCalledWith('/payments/payment-methods/', paymentMethodData);
      expect(result).toEqual(newPaymentMethod);
    });
  });

  describe('removePaymentMethod', () => {
    it('should remove payment method successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: { success: true } });

      const result = await paymentService.removePaymentMethod('pm_1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/payments/payment-methods/pm_1/');
      expect(result).toEqual({ success: true });
    });
  });

  describe('getEscrowAccounts', () => {
    it('should fetch escrow accounts successfully', async () => {
      const escrowAccounts = [
        { id: 'esc_1', balance: 2000, currency: 'EUR', contract_id: '1' }
      ];

      mockedApi.get.mockResolvedValueOnce({ data: escrowAccounts });

      const result = await paymentService.getEscrowAccounts();

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/escrow/');
      expect(result).toEqual(escrowAccounts);
    });
  });

  describe('depositToEscrow', () => {
    it('should deposit to escrow successfully', async () => {
      const depositData = {
        amount: 1000,
        contract_id: '1',
        description: 'Security deposit'
      };

      mockedApi.post.mockResolvedValueOnce({ data: { transaction_id: 'txn_123', status: 'completed' } });

      const result = await paymentService.depositToEscrow(depositData);

      expect(mockedApi.post).toHaveBeenCalledWith('/payments/escrow/deposit/', depositData);
      expect(result).toEqual({ transaction_id: 'txn_123', status: 'completed' });
    });
  });

  describe('releaseEscrow', () => {
    it('should release escrow funds successfully', async () => {
      const releaseData = {
        escrow_id: 'esc_1',
        amount: 1000,
        recipient_id: '1',
        reason: 'Contract completion'
      };

      mockedApi.post.mockResolvedValueOnce({ data: { transaction_id: 'txn_456', status: 'completed' } });

      const result = await paymentService.releaseEscrow(releaseData);

      expect(mockedApi.post).toHaveBeenCalledWith('/payments/escrow/release/', releaseData);
      expect(result).toEqual({ transaction_id: 'txn_456', status: 'completed' });
    });
  });

  describe('getPaymentStats', () => {
    it('should fetch payment statistics successfully', async () => {
      const stats = {
        total_payments: 100,
        completed_payments: 95,
        pending_payments: 3,
        failed_payments: 2,
        total_amount: 95000,
        average_payment: 950
      };

      mockedApi.get.mockResolvedValueOnce({ data: stats });

      const result = await paymentService.getPaymentStats();

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/stats/');
      expect(result).toEqual(stats);
    });
  });

  describe('createPaymentPlan', () => {
    it('should create payment plan successfully', async () => {
      const planData = {
        contract_id: '1',
        total_amount: 12000,
        installments: 12,
        frequency: 'monthly',
        start_date: '2024-01-01'
      };

      const paymentPlan = {
        id: 'plan_1',
        ...planData,
        payments: []
      };

      mockedApi.post.mockResolvedValueOnce({ data: paymentPlan });

      const result = await paymentService.createPaymentPlan(planData);

      expect(mockedApi.post).toHaveBeenCalledWith('/payments/plans/', planData);
      expect(result).toEqual(paymentPlan);
    });
  });

  describe('getTransactionHistory', () => {
    it('should fetch transaction history successfully', async () => {
      const transactions = [
        {
          id: 'txn_1',
          type: 'payment',
          amount: 1000,
          status: 'completed',
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockedApi.get.mockResolvedValueOnce({ data: transactions });

      const result = await paymentService.getTransactionHistory();

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/transactions/');
      expect(result).toEqual(transactions);
    });

    it('should fetch transaction history with filters', async () => {
      const filters = {
        type: 'payment',
        status: 'completed',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      mockedApi.get.mockResolvedValueOnce({ data: [] });

      await paymentService.getTransactionHistory(filters);

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/transactions/', { params: filters });
    });
  });
});