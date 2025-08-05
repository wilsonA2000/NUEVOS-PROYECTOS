import { api } from './api';
import { Payment, CreatePaymentDto, UpdatePaymentDto } from '../types/payment';

export const paymentService = {
  getTransactions: async (): Promise<any[]> => {
    const response = await api.get('/payments/transactions/');
    return response.data;
  },

  getTransaction: async (id: string): Promise<any> => {
    const response = await api.get(`/payments/transactions/${id}/`);
    return response.data;
  },

  createTransaction: async (data: any): Promise<any> => {
    const response = await api.post('/payments/transactions/', data);
    return response.data;
  },

  updateTransaction: async (id: string, data: any): Promise<any> => {
    const response = await api.put(`/payments/transactions/${id}/`, data);
    return response.data;
  },

  deleteTransaction: async (id: string): Promise<void> => {
    await api.delete(`/payments/transactions/${id}/`);
  },

  getPaymentMethods: async (): Promise<any[]> => {
    const response = await api.get('/payments/payment-methods/');
    return response.data;
  },

  getPaymentMethod: async (id: string): Promise<any> => {
    const response = await api.get(`/payments/payment-methods/${id}/`);
    return response.data;
  },

  createPaymentMethod: async (data: any): Promise<any> => {
    const response = await api.post('/payments/payment-methods/', data);
    return response.data;
  },

  updatePaymentMethod: async (id: string, data: any): Promise<any> => {
    const response = await api.put(`/payments/payment-methods/${id}/`, data);
    return response.data;
  },

  deletePaymentMethod: async (id: string): Promise<void> => {
    await api.delete(`/payments/payment-methods/${id}/`);
  },

  addPaymentMethod: async (data: any): Promise<any> => {
    const response = await api.post('/payments/payment-methods/add/', data);
    return response.data;
  },

  verifyPaymentMethod: async (id: string, verificationData: any): Promise<any> => {
    const response = await api.post(`/payments/payment-methods/${id}/verify/`, verificationData);
    return response.data;
  },

  setDefaultPaymentMethod: async (id: string): Promise<any> => {
    const response = await api.post(`/payments/payment-methods/${id}/set-default/`);
    return response.data;
  },

  getInvoices: async (): Promise<any[]> => {
    const response = await api.get('/payments/invoices/');
    return response.data;
  },

  getInvoice: async (id: string): Promise<any> => {
    const response = await api.get(`/payments/invoices/${id}/`);
    return response.data;
  },

  createInvoice: async (data: any): Promise<any> => {
    const response = await api.post('/payments/invoices/', data);
    return response.data;
  },

  updateInvoice: async (id: string, data: any): Promise<any> => {
    const response = await api.put(`/payments/invoices/${id}/`, data);
    return response.data;
  },

  deleteInvoice: async (id: string): Promise<void> => {
    await api.delete(`/payments/invoices/${id}/`);
  },

  createInvoiceCustom: async (data: any): Promise<any> => {
    const response = await api.post('/payments/invoices/create/', data);
    return response.data;
  },

  payInvoice: async (id: string, paymentData: any): Promise<any> => {
    const response = await api.post(`/payments/invoices/${id}/pay/`, paymentData);
    return response.data;
  },

  sendInvoice: async (id: string, sendData: any): Promise<any> => {
    const response = await api.post(`/payments/invoices/${id}/send/`, sendData);
    return response.data;
  },

  getEscrowAccounts: async (): Promise<any[]> => {
    const response = await api.get('/payments/escrow-accounts/');
    return response.data;
  },

  getEscrowAccount: async (id: string): Promise<any> => {
    const response = await api.get(`/payments/escrow-accounts/${id}/`);
    return response.data;
  },

  createEscrowAccount: async (data: any): Promise<any> => {
    const response = await api.post('/payments/escrow-accounts/', data);
    return response.data;
  },

  updateEscrowAccount: async (id: string, data: any): Promise<any> => {
    const response = await api.put(`/payments/escrow-accounts/${id}/`, data);
    return response.data;
  },

  deleteEscrowAccount: async (id: string): Promise<void> => {
    await api.delete(`/payments/escrow-accounts/${id}/`);
  },

  fundEscrow: async (id: string, fundData: any): Promise<any> => {
    const response = await api.post(`/payments/escrow/${id}/fund/`, fundData);
    return response.data;
  },

  releaseEscrow: async (id: string, releaseData: any): Promise<any> => {
    const response = await api.post(`/payments/escrow/${id}/release/`, releaseData);
    return response.data;
  },

  getPaymentPlans: async (): Promise<any[]> => {
    const response = await api.get('/payments/payment-plans/');
    return response.data;
  },

  getPaymentPlan: async (id: string): Promise<any> => {
    const response = await api.get(`/payments/payment-plans/${id}/`);
    return response.data;
  },

  createPaymentPlan: async (data: any): Promise<any> => {
    const response = await api.post('/payments/payment-plans/', data);
    return response.data;
  },

  updatePaymentPlan: async (id: string, data: any): Promise<any> => {
    const response = await api.put(`/payments/payment-plans/${id}/`, data);
    return response.data;
  },

  deletePaymentPlan: async (id: string): Promise<void> => {
    await api.delete(`/payments/payment-plans/${id}/`);
  },

  getInstallments: async (): Promise<any[]> => {
    const response = await api.get('/payments/installments/');
    return response.data;
  },

  getInstallment: async (id: string): Promise<any> => {
    const response = await api.get(`/payments/installments/${id}/`);
    return response.data;
  },

  createInstallment: async (data: any): Promise<any> => {
    const response = await api.post('/payments/installments/', data);
    return response.data;
  },

  updateInstallment: async (id: string, data: any): Promise<any> => {
    const response = await api.put(`/payments/installments/${id}/`, data);
    return response.data;
  },

  deleteInstallment: async (id: string): Promise<void> => {
    await api.delete(`/payments/installments/${id}/`);
  },

  processPayment: async (paymentData: any): Promise<any> => {
    const response = await api.post('/payments/process/', paymentData);
    return response.data;
  },

  quickPay: async (quickPayData: any): Promise<any> => {
    const response = await api.post('/payments/quick-pay/', quickPayData);
    return response.data;
  },

  getBalance: async (): Promise<any> => {
    const response = await api.get('/payments/stats/balance/');
    return response.data;
  },

  getPaymentDashboardStats: async (): Promise<any> => {
    const response = await api.get('/payments/stats/dashboard/');
    return response.data;
  },

  getTransactionReport: async (params?: any): Promise<any> => {
    const response = await api.get('/payments/reports/transactions/', { params });
    return response.data;
  },

  stripeWebhook: async (webhookData: any): Promise<any> => {
    const response = await api.post('/payments/webhooks/stripe/', webhookData);
    return response.data;
  },

  paypalWebhook: async (webhookData: any): Promise<any> => {
    const response = await api.post('/payments/webhooks/paypal/', webhookData);
    return response.data;
  },

  getPayments: async (): Promise<Payment[]> => {
    const response = await api.get('/payments');
    return response.data;
  },

  getPayment: async (id: string): Promise<Payment> => {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },

  createPayment: async (data: CreatePaymentDto): Promise<Payment> => {
    const response = await api.post('/payments', data);
    return response.data;
  },

  updatePayment: async (id: string, data: UpdatePaymentDto): Promise<Payment> => {
    const response = await api.put(`/payments/${id}`, data);
    return response.data;
  },

  deletePayment: async (id: string): Promise<void> => {
    await api.delete(`/payments/${id}`);
  },

  // ============ MÉTODOS ESPECÍFICOS DE STRIPE ============

  // Configuración de Stripe
  getStripeConfig: async (): Promise<{ publishableKey: string }> => {
    const response = await api.get('/payments/stripe/config/');
    return response.data;
  },

  // Payment Intents
  createStripePaymentIntent: async (data: {
    amount: number;
    currency: string;
    contractId?: string;
    metadata?: Record<string, string>;
    description?: string;
  }): Promise<any> => {
    const response = await api.post('/payments/stripe/create-payment-intent/', data);
    return response.data;
  },

  confirmStripePayment: async (paymentIntentId: string, paymentMethodId?: string): Promise<any> => {
    const response = await api.post(`/payments/stripe/confirm-payment/${paymentIntentId}/`, {
      payment_method_id: paymentMethodId,
    });
    return response.data;
  },

  // Setup Intents para guardar métodos de pago
  createStripeSetupIntent: async (data: {
    customer_id?: string;
    usage: 'off_session' | 'on_session';
    payment_method_types?: string[];
  }): Promise<any> => {
    const response = await api.post('/payments/stripe/create-setup-intent/', data);
    return response.data;
  },

  // Métodos de pago de Stripe
  getStripePaymentMethods: async (customerId?: string): Promise<any[]> => {
    const response = await api.get('/payments/stripe/payment-methods/', {
      params: { customer_id: customerId },
    });
    return response.data;
  },

  attachStripePaymentMethod: async (paymentMethodId: string, customerId: string): Promise<any> => {
    const response = await api.post('/payments/stripe/attach-payment-method/', {
      payment_method_id: paymentMethodId,
      customer_id: customerId,
    });
    return response.data;
  },

  detachStripePaymentMethod: async (paymentMethodId: string): Promise<any> => {
    const response = await api.post('/payments/stripe/detach-payment-method/', {
      payment_method_id: paymentMethodId,
    });
    return response.data;
  },

  setDefaultStripePaymentMethod: async (customerId: string, paymentMethodId: string): Promise<any> => {
    const response = await api.post('/payments/stripe/set-default-payment-method/', {
      customer_id: customerId,
      payment_method_id: paymentMethodId,
    });
    return response.data;
  },

  // Clientes de Stripe
  createStripeCustomer: async (data: {
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
  }): Promise<any> => {
    const response = await api.post('/payments/stripe/customers/', data);
    return response.data;
  },

  getStripeCustomer: async (customerId: string): Promise<any> => {
    const response = await api.get(`/payments/stripe/customers/${customerId}/`);
    return response.data;
  },

  updateStripeCustomer: async (customerId: string, data: any): Promise<any> => {
    const response = await api.put(`/payments/stripe/customers/${customerId}/`, data);
    return response.data;
  },

  // Reembolsos de Stripe
  createStripeRefund: async (data: {
    payment_intent_id: string;
    amount?: number;
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, string>;
  }): Promise<any> => {
    const response = await api.post('/payments/stripe/refunds/', data);
    return response.data;
  },

  getStripeRefund: async (refundId: string): Promise<any> => {
    const response = await api.get(`/payments/stripe/refunds/${refundId}/`);
    return response.data;
  },

  // Transacciones de Stripe
  getStripeTransactions: async (params?: {
    limit?: number;
    starting_after?: string;
    ending_before?: string;
    created?: any;
  }): Promise<any> => {
    const response = await api.get('/payments/stripe/transactions/', { params });
    return response.data;
  },

  // ============ MÉTODOS ESPECÍFICOS DE PAYPAL ============

  // Configuración de PayPal
  getPayPalConfig: async (): Promise<{ clientId: string; environment: string }> => {
    const response = await api.get('/payments/paypal/config/');
    return response.data;
  },

  // Órdenes de PayPal
  createPayPalOrder: async (data: {
    amount: number;
    currency: string;
    description?: string;
    contractId?: string;
    metadata?: Record<string, string>;
    items?: Array<{
      name: string;
      quantity: number;
      unit_amount: {
        currency_code: string;
        value: string;
      };
      description?: string;
    }>;
  }): Promise<any> => {
    const response = await api.post('/payments/paypal/create-order/', data);
    return response.data;
  },

  capturePayPalOrder: async (orderId: string): Promise<any> => {
    const response = await api.post(`/payments/paypal/capture-order/${orderId}/`);
    return response.data;
  },

  getPayPalOrderDetails: async (orderId: string): Promise<any> => {
    const response = await api.get(`/payments/paypal/orders/${orderId}/`);
    return response.data;
  },

  // Suscripciones de PayPal
  createPayPalSubscriptionPlan: async (planData: any): Promise<any> => {
    const response = await api.post('/payments/paypal/subscription-plans/', planData);
    return response.data;
  },

  createPayPalSubscription: async (subscriptionData: any): Promise<any> => {
    const response = await api.post('/payments/paypal/subscriptions/', subscriptionData);
    return response.data;
  },

  getPayPalSubscription: async (subscriptionId: string): Promise<any> => {
    const response = await api.get(`/payments/paypal/subscriptions/${subscriptionId}/`);
    return response.data;
  },

  cancelPayPalSubscription: async (subscriptionId: string, reason?: string): Promise<any> => {
    const response = await api.post(`/payments/paypal/subscriptions/${subscriptionId}/cancel/`, {
      reason: reason || 'User requested cancellation',
    });
    return response.data;
  },

  // Reembolsos de PayPal
  createPayPalRefund: async (data: {
    capture_id: string;
    amount?: {
      currency_code: string;
      value: string;
    };
    note_to_payer?: string;
  }): Promise<any> => {
    const response = await api.post('/payments/paypal/refunds/', data);
    return response.data;
  },

  getPayPalRefund: async (refundId: string): Promise<any> => {
    const response = await api.get(`/payments/paypal/refunds/${refundId}/`);
    return response.data;
  },

  // Transacciones de PayPal
  getPayPalTransactions: async (params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<any> => {
    const response = await api.get('/payments/paypal/transactions/', { params });
    return response.data;
  },

  // Payouts de PayPal
  createPayPalPayout: async (payoutData: any): Promise<any> => {
    const response = await api.post('/payments/paypal/payouts/', payoutData);
    return response.data;
  },

  getPayPalPayoutDetails: async (payoutBatchId: string): Promise<any> => {
    const response = await api.get(`/payments/paypal/payouts/${payoutBatchId}/`);
    return response.data;
  },

  // Balance de PayPal
  getPayPalBalance: async (): Promise<any> => {
    const response = await api.get('/payments/paypal/balance/');
    return response.data;
  },

  // Webhooks de PayPal
  verifyPayPalWebhook: async (webhookData: any): Promise<any> => {
    const response = await api.post('/payments/paypal/verify-webhook/', webhookData);
    return response.data;
  },

  processPayPalWebhook: async (webhookEvent: any): Promise<any> => {
    const response = await api.post('/payments/paypal/process-webhook/', webhookEvent);
    return response.data;
  },

  // ============ MÉTODOS UNIFICADOS DE MÚLTIPLES PASARELAS ============

  // Configuración de múltiples pasarelas
  getPaymentGatewaysConfig: async (): Promise<{
    stripe: { publishableKey: string; enabled: boolean };
    paypal: { clientId: string; environment: string; enabled: boolean };
  }> => {
    const response = await api.get('/payments/gateways/config/');
    return response.data;
  },

  // Procesamiento unificado
  processUnifiedPayment: async (data: {
    gateway: 'stripe' | 'paypal';
    amount: number;
    currency: string;
    payment_method_data?: any;
    contractId?: string;
    metadata?: Record<string, string>;
  }): Promise<any> => {
    const response = await api.post('/payments/process-unified/', data);
    return response.data;
  },

  // Estadísticas de múltiples pasarelas
  getPaymentGatewayStats: async (params?: {
    start_date?: string;
    end_date?: string;
    gateway?: 'stripe' | 'paypal';
  }): Promise<any> => {
    const response = await api.get('/payments/gateways/stats/', { params });
    return response.data;
  },

  // Reembolso unificado
  createUnifiedRefund: async (data: {
    payment_id: string;
    gateway: 'stripe' | 'paypal';
    amount?: number;
    reason?: string;
  }): Promise<any> => {
    const response = await api.post('/payments/refunds/unified/', data);
    return response.data;
  },

  // Validación de pagos
  validatePaymentAmount: async (amount: number, currency: string): Promise<{
    isValid: boolean;
    errors: string[];
    formattedAmount: string;
  }> => {
    const response = await api.post('/payments/validate-amount/', { amount, currency });
    return response.data;
  },

  // Comisiones y tarifas
  calculatePaymentFees: async (data: {
    gateway: 'stripe' | 'paypal';
    amount: number;
    currency: string;
    payment_method?: string;
  }): Promise<{
    amount: number;
    fees: {
      gateway_fee: number;
      platform_fee: number;
      total_fee: number;
    };
    net_amount: number;
  }> => {
    const response = await api.post('/payments/calculate-fees/', data);
    return response.data;
  },

  // Reporte consolidado
  getConsolidatedPaymentReport: async (params?: {
    start_date?: string;
    end_date?: string;
    format?: 'json' | 'csv' | 'pdf';
  }): Promise<any> => {
    const response = await api.get('/payments/reports/consolidated/', { params });
    return response.data;
  },

  // Métricas de conversión
  getPaymentConversionMetrics: async (params?: {
    period?: 'day' | 'week' | 'month';
    gateway?: 'stripe' | 'paypal';
  }): Promise<{
    total_attempts: number;
    successful_payments: number;
    failed_payments: number;
    conversion_rate: number;
    average_amount: number;
    top_failure_reasons: Array<{ reason: string; count: number }>;
  }> => {
    const response = await api.get('/payments/metrics/conversion/', { params });
    return response.data;
  },
}; 