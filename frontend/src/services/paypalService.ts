import { api } from './api';
import { loggingService } from './loggingService';

export interface PayPalConfig {
  clientId: string;
  currency?: string;
  environment?: 'sandbox' | 'production';
}

export interface PayPalOrderData {
  amount: number;
  currency: string;
  description?: string;
  contractId?: string;
  metadata?: Record<string, string>;
  items?: PayPalItem[];
}

export interface PayPalItem {
  name: string;
  quantity: number;
  unit_amount: {
    currency_code: string;
    value: string;
  };
  description?: string;
}

export interface PayPalPaymentResult {
  success: boolean;
  orderId?: string;
  paymentId?: string;
  error?: string;
  details?: any;
}

export interface PayPalSubscriptionData {
  planId: string;
  subscriber?: {
    name?: {
      given_name?: string;
      surname?: string;
    };
    email_address?: string;
  };
  application_context?: {
    brand_name?: string;
    locale?: string;
    shipping_preference?: 'GET_FROM_FILE' | 'NO_SHIPPING' | 'SET_PROVIDED_ADDRESS';
    user_action?: 'SUBSCRIBE_NOW' | 'CONTINUE';
    payment_method?: {
      payer_selected?: 'PAYPAL';
      payee_preferred?: 'IMMEDIATE_PAYMENT_REQUIRED' | 'UNRESTRICTED';
    };
    return_url?: string;
    cancel_url?: string;
  };
}

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  summary: string;
  resource: any;
  create_time: string;
  event_version: string;
  resource_version: string;
}

class PayPalService {
  private config: PayPalConfig | null = null;

  /**
   * Inicializa PayPal con la configuración
   */
  initialize(config: PayPalConfig): void {
    if (!config.clientId) {
      throw new Error('PayPal client ID is required');
    }

    this.config = {
      ...config,
      currency: config.currency || 'USD',
      environment: config.environment || 'sandbox',
    };

    loggingService.info('PayPal initialized successfully');
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): PayPalConfig | null {
    return this.config;
  }

  /**
   * Crea una orden de PayPal
   */
  async createOrder(orderData: PayPalOrderData): Promise<any> {
    try {
      const response = await api.post('/payments/paypal/create-order/', {
        ...orderData,
        currency: orderData.currency || this.config?.currency || 'USD',
      });

      loggingService.info('PayPal order created:', response.data.id);
      return response.data;
    } catch (error) {
      loggingService.error('Error creating PayPal order:', error);
      throw error;
    }
  }

  /**
   * Captura una orden de PayPal
   */
  async captureOrder(orderId: string): Promise<PayPalPaymentResult> {
    try {
      const response = await api.post(`/payments/paypal/capture-order/${orderId}/`);

      if (response.data.status === 'COMPLETED') {
        loggingService.info('PayPal order captured:', orderId);
        return {
          success: true,
          orderId,
          paymentId: response.data.purchase_units?.[0]?.payments?.captures?.[0]?.id,
          details: response.data,
        };
      }

      return {
        success: false,
        error: 'Order capture failed',
        details: response.data,
      };
    } catch (error) {
      loggingService.error('Error capturing PayPal order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Capture failed',
      };
    }
  }

  /**
   * Obtiene los detalles de una orden
   */
  async getOrderDetails(orderId: string): Promise<any> {
    try {
      const response = await api.get(`/payments/paypal/orders/${orderId}/`);
      return response.data;
    } catch (error) {
      loggingService.error('Error getting PayPal order details:', error);
      throw error;
    }
  }

  /**
   * Crea un reembolso
   */
  async createRefund(
    captureId: string,
    amount?: { currency_code: string; value: string },
    note?: string
  ): Promise<any> {
    try {
      const response = await api.post('/payments/paypal/refunds/', {
        capture_id: captureId,
        amount,
        note_to_payer: note,
      });

      loggingService.info('PayPal refund created:', response.data.id);
      return response.data;
    } catch (error) {
      loggingService.error('Error creating PayPal refund:', error);
      throw error;
    }
  }

  /**
   * Crea un plan de suscripción
   */
  async createSubscriptionPlan(planData: {
    name: string;
    description: string;
    billing_cycles: Array<{
      frequency: {
        interval_unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
        interval_count: number;
      };
      tenure_type: 'REGULAR' | 'TRIAL';
      sequence: number;
      total_cycles: number;
      pricing_scheme: {
        fixed_pricing: {
          currency_code: string;
          value: string;
        };
      };
    }>;
    payment_preferences: {
      auto_bill_outstanding: boolean;
      setup_fee?: {
        currency_code: string;
        value: string;
      };
      setup_fee_failure_action?: 'CONTINUE' | 'CANCEL';
      payment_failure_threshold?: number;
    };
    taxes?: {
      percentage: string;
      inclusive: boolean;
    };
  }): Promise<any> {
    try {
      const response = await api.post('/payments/paypal/subscription-plans/', planData);
      loggingService.info('PayPal subscription plan created:', response.data.id);
      return response.data;
    } catch (error) {
      loggingService.error('Error creating PayPal subscription plan:', error);
      throw error;
    }
  }

  /**
   * Crea una suscripción
   */
  async createSubscription(subscriptionData: PayPalSubscriptionData): Promise<any> {
    try {
      const response = await api.post('/payments/paypal/subscriptions/', subscriptionData);
      loggingService.info('PayPal subscription created:', response.data.id);
      return response.data;
    } catch (error) {
      loggingService.error('Error creating PayPal subscription:', error);
      throw error;
    }
  }

  /**
   * Cancela una suscripción
   */
  async cancelSubscription(subscriptionId: string, reason?: string): Promise<void> {
    try {
      await api.post(`/payments/paypal/subscriptions/${subscriptionId}/cancel/`, {
        reason: reason || 'User requested cancellation',
      });
      loggingService.info('PayPal subscription cancelled:', subscriptionId);
    } catch (error) {
      loggingService.error('Error cancelling PayPal subscription:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de transacciones
   */
  async getTransactionHistory(
    startDate?: string,
    endDate?: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const params: any = { limit };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await api.get('/payments/paypal/transactions/', { params });
      return response.data;
    } catch (error) {
      loggingService.error('Error getting PayPal transaction history:', error);
      throw error;
    }
  }

  /**
   * Verifica un webhook de PayPal
   */
  async verifyWebhook(
    webhookEvent: PayPalWebhookEvent,
    webhookId: string,
    certId: string,
    authAlgo: string,
    transmission: string,
    headers: Record<string, string>
  ): Promise<boolean> {
    try {
      const response = await api.post('/payments/paypal/verify-webhook/', {
        webhook_event: webhookEvent,
        webhook_id: webhookId,
        cert_id: certId,
        auth_algo: authAlgo,
        transmission_id: transmission,
        headers,
      });

      return response.data.verification_status === 'SUCCESS';
    } catch (error) {
      loggingService.error('Error verifying PayPal webhook:', error);
      return false;
    }
  }

  /**
   * Procesa un webhook de PayPal
   */
  async processWebhook(webhookEvent: PayPalWebhookEvent): Promise<void> {
    try {
      await api.post('/payments/paypal/process-webhook/', webhookEvent);
      loggingService.info('PayPal webhook processed:', webhookEvent.id);
    } catch (error) {
      loggingService.error('Error processing PayPal webhook:', error);
      throw error;
    }
  }

  /**
   * Obtiene la información del balance
   */
  async getBalance(): Promise<any> {
    try {
      const response = await api.get('/payments/paypal/balance/');
      return response.data;
    } catch (error) {
      loggingService.error('Error getting PayPal balance:', error);
      throw error;
    }
  }

  /**
   * Realiza una transferencia (payout)
   */
  async createPayout(payoutData: {
    sender_batch_header: {
      sender_batch_id: string;
      email_subject?: string;
      email_message?: string;
    };
    items: Array<{
      recipient_type: 'EMAIL' | 'PHONE' | 'PAYPAL_ID';
      amount: {
        value: string;
        currency: string;
      };
      note?: string;
      sender_item_id?: string;
      receiver: string;
      notification_language?: string;
    }>;
  }): Promise<any> {
    try {
      const response = await api.post('/payments/paypal/payouts/', payoutData);
      loggingService.info('PayPal payout created:', response.data.batch_header.payout_batch_id);
      return response.data;
    } catch (error) {
      loggingService.error('Error creating PayPal payout:', error);
      throw error;
    }
  }

  /**
   * Obtiene los detalles de un payout
   */
  async getPayoutDetails(payoutBatchId: string): Promise<any> {
    try {
      const response = await api.get(`/payments/paypal/payouts/${payoutBatchId}/`);
      return response.data;
    } catch (error) {
      loggingService.error('Error getting PayPal payout details:', error);
      throw error;
    }
  }

  /**
   * Cancela un payout item
   */
  async cancelPayoutItem(payoutItemId: string): Promise<any> {
    try {
      const response = await api.post(`/payments/paypal/payout-items/${payoutItemId}/cancel/`);
      loggingService.info('PayPal payout item cancelled:', payoutItemId);
      return response.data;
    } catch (error) {
      loggingService.error('Error cancelling PayPal payout item:', error);
      throw error;
    }
  }

  /**
   * Valida un email de PayPal
   */
  validatePayPalEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Formatea cantidad para PayPal
   */
  formatAmount(amount: number, currency: string = 'USD'): { currency_code: string; value: string } {
    return {
      currency_code: currency.toUpperCase(),
      value: amount.toFixed(2),
    };
  }

  /**
   * Maneja errores específicos de PayPal
   */
  handlePayPalError(error: any): string {
    const errorMessages: Record<string, string> = {
      INSTRUMENT_DECLINED: 'El método de pago fue rechazado. Intente con otro.',
      INSUFFICIENT_FUNDS: 'Fondos insuficientes en la cuenta.',
      INVALID_ACCOUNT_STATUS: 'Estado de cuenta inválido.',
      LIMIT_EXCEEDED: 'Límite de transacción excedido.',
      TRANSACTION_REFUSED: 'Transacción rechazada por PayPal.',
      COMPLIANCE_VIOLATION: 'Violación de políticas de cumplimiento.',
      DUPLICATE_INVOICE_ID: 'ID de factura duplicado.',
      CHECKOUT_SESSION_EXPIRED: 'La sesión de pago ha expirado.',
    };

    // Si el error tiene un código específico
    if (error.details && Array.isArray(error.details)) {
      const detail = error.details[0];
      return errorMessages[detail.issue] || detail.description || 'Error en el pago con PayPal';
    }

    // Si es un error genérico
    return error.message || 'Error desconocido en PayPal';
  }

  /**
   * Convierte código de moneda a símbolo
   */
  getCurrencySymbol(currencyCode: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
      AUD: 'A$',
      CHF: 'Fr',
      CNY: '¥',
      SEK: 'kr',
      NZD: 'NZ$',
    };

    return symbols[currencyCode.toUpperCase()] || currencyCode;
  }
}

export const paypalService = new PayPalService();