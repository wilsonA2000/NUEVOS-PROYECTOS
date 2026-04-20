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

  const mockTransaction = {
    id: '1',
    amount: 1000,
    currency: 'COP',
    status: 'completed',
    description: 'Monthly rent payment',
    created_at: '2024-01-01T00:00:00Z',
  };

  describe('getTransactions', () => {
    it('should fetch all transactions successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockTransaction] });

      const result = await paymentService.getTransactions();

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/transactions/');
      expect(result).toEqual([mockTransaction]);
    });
  });

  describe('getTransaction', () => {
    it('should fetch single transaction successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockTransaction });

      const result = await paymentService.getTransaction('1');

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/transactions/1/');
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('createTransaction', () => {
    it('should create transaction successfully', async () => {
      const createData = { amount: 1200, description: 'Security deposit' };
      mockedApi.post.mockResolvedValueOnce({
        data: { id: '2', ...createData },
      });

      const result = await paymentService.createTransaction(createData);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/payments/transactions/',
        createData
      );
      expect(result).toEqual({ id: '2', ...createData });
    });
  });

  describe('updateTransaction', () => {
    it('should update transaction successfully', async () => {
      const updateData = { description: 'Updated description' };
      mockedApi.put.mockResolvedValueOnce({
        data: { ...mockTransaction, ...updateData },
      });

      const result = await paymentService.updateTransaction('1', updateData);

      expect(mockedApi.put).toHaveBeenCalledWith(
        '/payments/transactions/1/',
        updateData
      );
      expect(result).toEqual({ ...mockTransaction, ...updateData });
    });
  });

  describe('deleteTransaction', () => {
    it('should delete transaction successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: {} });

      await paymentService.deleteTransaction('1');

      expect(mockedApi.delete).toHaveBeenCalledWith(
        '/payments/transactions/1/'
      );
    });
  });

  describe('getPaymentMethods', () => {
    it('should fetch payment methods successfully', async () => {
      const paymentMethods = [
        { id: 'pm_1', type: 'card', last4: '4242', brand: 'visa' },
      ];

      mockedApi.get.mockResolvedValueOnce({ data: paymentMethods });

      const result = await paymentService.getPaymentMethods();

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/payment-methods/');
      expect(result).toEqual(paymentMethods);
    });
  });

  describe('addPaymentMethod', () => {
    it('should add payment method successfully', async () => {
      const paymentMethodData = { type: 'card', token: 'tok_123456' };
      const newPaymentMethod = {
        id: 'pm_new',
        type: 'card',
        last4: '1234',
        brand: 'mastercard',
      };

      mockedApi.post.mockResolvedValueOnce({ data: newPaymentMethod });

      const result = await paymentService.addPaymentMethod(paymentMethodData);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/payments/payment-methods/add/',
        paymentMethodData
      );
      expect(result).toEqual(newPaymentMethod);
    });
  });

  describe('deletePaymentMethod', () => {
    it('should delete payment method successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: {} });

      await paymentService.deletePaymentMethod('pm_1');

      expect(mockedApi.delete).toHaveBeenCalledWith(
        '/payments/payment-methods/pm_1/'
      );
    });
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const paymentData = { amount: 1000, payment_method_id: 'pm_123' };
      const processedPayment = { id: 'pay_1', status: 'completed' };

      mockedApi.post.mockResolvedValueOnce({ data: processedPayment });

      const result = await paymentService.processPayment(paymentData);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/payments/process/',
        paymentData
      );
      expect(result).toEqual(processedPayment);
    });
  });

  describe('getEscrowAccounts', () => {
    it('should fetch escrow accounts successfully', async () => {
      const escrowAccounts = [
        { id: 'esc_1', balance: 2000, currency: 'COP', contract_id: '1' },
      ];

      mockedApi.get.mockResolvedValueOnce({ data: escrowAccounts });

      const result = await paymentService.getEscrowAccounts();

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/escrow-accounts/');
      expect(result).toEqual(escrowAccounts);
    });
  });

  describe('fundEscrow', () => {
    it('should fund escrow account successfully', async () => {
      const fundData = { amount: 1000, description: 'Security deposit' };

      mockedApi.post.mockResolvedValueOnce({
        data: { transaction_id: 'txn_123', status: 'completed' },
      });

      const result = await paymentService.fundEscrow('esc_1', fundData);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/payments/escrow/esc_1/fund/',
        fundData
      );
      expect(result).toEqual({
        transaction_id: 'txn_123',
        status: 'completed',
      });
    });
  });

  describe('releaseEscrow', () => {
    it('should release escrow funds successfully', async () => {
      const releaseData = { amount: 1000, reason: 'Contract completion' };

      mockedApi.post.mockResolvedValueOnce({
        data: { transaction_id: 'txn_456', status: 'completed' },
      });

      const result = await paymentService.releaseEscrow('esc_1', releaseData);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/payments/escrow/esc_1/release/',
        releaseData
      );
      expect(result).toEqual({
        transaction_id: 'txn_456',
        status: 'completed',
      });
    });
  });

  describe('createPaymentPlan', () => {
    it('should create payment plan successfully', async () => {
      const planData = {
        contract_id: '1',
        total_amount: 12000,
        installments: 12,
        frequency: 'monthly',
        start_date: '2024-01-01',
      };

      const paymentPlan = { id: 'plan_1', ...planData };

      mockedApi.post.mockResolvedValueOnce({ data: paymentPlan });

      const result = await paymentService.createPaymentPlan(planData);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/payments/payment-plans/',
        planData
      );
      expect(result).toEqual(paymentPlan);
    });
  });

  describe('getInvoices', () => {
    it('should fetch invoices successfully', async () => {
      const invoices = [{ id: 'inv_1', amount: 1000, status: 'paid' }];

      mockedApi.get.mockResolvedValueOnce({ data: invoices });

      const result = await paymentService.getInvoices();

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/invoices/');
      expect(result).toEqual(invoices);
    });
  });

  describe('getBalance', () => {
    it('should fetch balance successfully', async () => {
      const balance = { available: 5000, pending: 1000, currency: 'COP' };

      mockedApi.get.mockResolvedValueOnce({ data: balance });

      const result = await paymentService.getBalance();

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/stats/balance/');
      expect(result).toEqual(balance);
    });
  });

  describe('getPaymentDashboardStats', () => {
    it('should fetch payment dashboard stats successfully', async () => {
      const stats = {
        total_payments: 100,
        completed_payments: 95,
        pending_payments: 3,
        failed_payments: 2,
      };

      mockedApi.get.mockResolvedValueOnce({ data: stats });

      const result = await paymentService.getPaymentDashboardStats();

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/stats/dashboard/');
      expect(result).toEqual(stats);
    });
  });

  describe('getTransactionReport', () => {
    it('should fetch transaction report successfully', async () => {
      const report = { transactions: [], summary: {} };

      mockedApi.get.mockResolvedValueOnce({ data: report });

      const result = await paymentService.getTransactionReport();

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/payments/reports/transactions/',
        { params: undefined }
      );
      expect(result).toEqual(report);
    });

    it('should fetch transaction report with params', async () => {
      const params = { start_date: '2024-01-01', end_date: '2024-12-31' };

      mockedApi.get.mockResolvedValueOnce({ data: [] });

      await paymentService.getTransactionReport(params);

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/payments/reports/transactions/',
        { params }
      );
    });
  });

  describe('Stripe methods', () => {
    it('should get Stripe config', async () => {
      const config = { publishableKey: 'pk_test_123' };
      mockedApi.get.mockResolvedValueOnce({ data: config });

      const result = await paymentService.getStripeConfig();

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/stripe/config/');
      expect(result).toEqual(config);
    });

    it('should create Stripe payment intent', async () => {
      const intentData = { amount: 1000, currency: 'cop' };
      const intent = { client_secret: 'pi_123_secret', id: 'pi_123' };
      mockedApi.post.mockResolvedValueOnce({ data: intent });

      const result = await paymentService.createStripePaymentIntent(intentData);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/payments/stripe/create-payment-intent/',
        intentData
      );
      expect(result).toEqual(intent);
    });
  });

  describe('PayPal methods', () => {
    it('should get PayPal config', async () => {
      const config = { clientId: 'client_123', environment: 'sandbox' };
      mockedApi.get.mockResolvedValueOnce({ data: config });

      const result = await paymentService.getPayPalConfig();

      expect(mockedApi.get).toHaveBeenCalledWith('/payments/paypal/config/');
      expect(result).toEqual(config);
    });

    it('should create PayPal order', async () => {
      const orderData = { amount: 1000, currency: 'USD' };
      const order = { id: 'order_123', status: 'CREATED' };
      mockedApi.post.mockResolvedValueOnce({ data: order });

      const result = await paymentService.createPayPalOrder(orderData);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/payments/paypal/create-order/',
        orderData
      );
      expect(result).toEqual(order);
    });
  });
});
