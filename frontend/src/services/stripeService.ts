import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import { api } from './api';
import { loggingService } from './loggingService';

export interface StripeConfig {
  publishableKey: string;
  clientSecret?: string;
}

export interface PaymentIntentData {
  amount: number;
  currency: string;
  contractId?: string;
  metadata?: Record<string, string>;
  description?: string;
}

export interface PaymentMethodData {
  type: 'card';
  card: StripeCardElement;
  billing_details?: {
    name?: string;
    email?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
}

export interface StripePaymentResult {
  success: boolean;
  paymentIntent?: any;
  error?: string;
  requiresAction?: boolean;
  clientSecret?: string;
}

export interface SetupIntentData {
  customer_id?: string;
  usage: 'off_session' | 'on_session';
  payment_method_types?: string[];
}

class StripeService {
  private stripe: Stripe | null = null;
  private publishableKey: string | null = null;

  /**
   * Inicializa Stripe con la clave pública
   */
  async initialize(config: StripeConfig): Promise<void> {
    try {
      if (!config.publishableKey) {
        throw new Error('Stripe publishable key is required');
      }

      this.publishableKey = config.publishableKey;
      this.stripe = await loadStripe(config.publishableKey);

      if (!this.stripe) {
        throw new Error('Failed to load Stripe');
      }

      loggingService.info('Stripe initialized successfully');
    } catch (error) {
      loggingService.error('Error initializing Stripe:', error);
      throw error;
    }
  }

  /**
   * Obtiene la instancia de Stripe
   */
  getStripe(): Stripe | null {
    return this.stripe;
  }

  /**
   * Crea un Payment Intent en el backend
   */
  async createPaymentIntent(data: PaymentIntentData): Promise<any> {
    try {
      const response = await api.post('/payments/stripe/create-payment-intent/', data);
      loggingService.info('Payment Intent created:', response.data.id);
      return response.data;
    } catch (error) {
      loggingService.error('Error creating Payment Intent:', error);
      throw error;
    }
  }

  /**
   * Confirma un pago con Stripe Elements
   */
  async confirmPayment(
    clientSecret: string,
    elements: StripeElements,
    paymentMethodData?: PaymentMethodData
  ): Promise<StripePaymentResult> {
    try {
      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      const result = await this.stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/app/payments/success`,
          ...paymentMethodData,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        loggingService.error('Payment confirmation error:', result.error);
        return {
          success: false,
          error: result.error.message || 'Payment failed',
        };
      }

      if (result.paymentIntent?.status === 'succeeded') {
        loggingService.info('Payment succeeded:', result.paymentIntent.id);
        return {
          success: true,
          paymentIntent: result.paymentIntent,
        };
      }

      if (result.paymentIntent?.status === 'requires_action') {
        return {
          success: false,
          requiresAction: true,
          clientSecret: result.paymentIntent.client_secret || '',
        };
      }

      return {
        success: false,
        error: 'Payment status unknown',
      };
    } catch (error) {
      loggingService.error('Error confirming payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  /**
   * Procesa un pago con método de pago guardado
   */
  async processPaymentWithSavedMethod(
    paymentMethodId: string,
    amount: number,
    currency: string = 'usd',
    metadata: Record<string, string> = {}
  ): Promise<StripePaymentResult> {
    try {
      const response = await api.post('/payments/stripe/process-payment/', {
        payment_method_id: paymentMethodId,
        amount,
        currency,
        metadata,
      });

      const { client_secret, requires_action } = response.data;

      if (requires_action) {
        if (!this.stripe) {
          throw new Error('Stripe not initialized');
        }

        const result = await this.stripe.confirmCardPayment(client_secret);

        if (result.error) {
          return {
            success: false,
            error: result.error.message || 'Payment failed',
          };
        }

        return {
          success: true,
          paymentIntent: result.paymentIntent,
        };
      }

      return {
        success: true,
        paymentIntent: response.data.payment_intent,
      };
    } catch (error) {
      loggingService.error('Error processing payment with saved method:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  /**
   * Crea un Setup Intent para guardar método de pago
   */
  async createSetupIntent(data: SetupIntentData): Promise<any> {
    try {
      const response = await api.post('/payments/stripe/create-setup-intent/', data);
      loggingService.info('Setup Intent created:', response.data.id);
      return response.data;
    } catch (error) {
      loggingService.error('Error creating Setup Intent:', error);
      throw error;
    }
  }

  /**
   * Confirma un Setup Intent
   */
  async confirmSetupIntent(
    clientSecret: string,
    elements: StripeElements
  ): Promise<StripePaymentResult> {
    try {
      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      const result = await this.stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/app/payment-methods`,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        loggingService.error('Setup Intent confirmation error:', result.error);
        return {
          success: false,
          error: result.error.message || 'Setup failed',
        };
      }

      if (result.setupIntent?.status === 'succeeded') {
        loggingService.info('Setup Intent succeeded:', result.setupIntent.id);
        return {
          success: true,
          paymentIntent: result.setupIntent,
        };
      }

      return {
        success: false,
        error: 'Setup status unknown',
      };
    } catch (error) {
      loggingService.error('Error confirming Setup Intent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Setup failed',
      };
    }
  }

  /**
   * Obtiene los métodos de pago guardados
   */
  async getSavedPaymentMethods(): Promise<any[]> {
    try {
      const response = await api.get('/payments/stripe/payment-methods/');
      return response.data;
    } catch (error) {
      loggingService.error('Error getting saved payment methods:', error);
      throw error;
    }
  }

  /**
   * Elimina un método de pago guardado
   */
  async removePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await api.delete(`/payments/stripe/payment-methods/${paymentMethodId}/`);
      loggingService.info('Payment method removed:', paymentMethodId);
    } catch (error) {
      loggingService.error('Error removing payment method:', error);
      throw error;
    }
  }

  /**
   * Crea un reembolso
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  ): Promise<any> {
    try {
      const response = await api.post('/payments/stripe/refunds/', {
        payment_intent_id: paymentIntentId,
        amount,
        reason,
      });
      loggingService.info('Refund created:', response.data.id);
      return response.data;
    } catch (error) {
      loggingService.error('Error creating refund:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de transacciones
   */
  async getTransactionHistory(limit: number = 10): Promise<any[]> {
    try {
      const response = await api.get('/payments/stripe/transactions/', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      loggingService.error('Error getting transaction history:', error);
      throw error;
    }
  }

  /**
   * Valida un número de tarjeta en tiempo real
   */
  validateCardNumber(cardNumber: string): { isValid: boolean; brand?: string } {
    // Eliminar espacios y caracteres no numéricos
    const cleanNumber = cardNumber.replace(/\D/g, '');

    // Validación básica de longitud
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      return { isValid: false };
    }

    // Algoritmo de Luhn
    const luhnCheck = (num: string): boolean => {
      let sum = 0;
      let shouldDouble = false;

      for (let i = num.length - 1; i >= 0; i--) {
        let digit = parseInt(num.charAt(i));

        if (shouldDouble) {
          digit *= 2;
          if (digit > 9) {
            digit -= 9;
          }
        }

        sum += digit;
        shouldDouble = !shouldDouble;
      }

      return sum % 10 === 0;
    };

    const isValid = luhnCheck(cleanNumber);

    // Detectar marca de tarjeta
    let brand: string | undefined;
    if (cleanNumber.match(/^4/)) {
      brand = 'visa';
    } else if (cleanNumber.match(/^5[1-5]/)) {
      brand = 'mastercard';
    } else if (cleanNumber.match(/^3[47]/)) {
      brand = 'amex';
    } else if (cleanNumber.match(/^6011|^65/)) {
      brand = 'discover';
    }

    return { isValid, brand };
  }

  /**
   * Formatea número de tarjeta para mostrar
   */
  formatCardNumber(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\D/g, '');
    const groups = cleanNumber.match(/.{1,4}/g) || [];
    return groups.join(' ').substr(0, 19); // Máximo 19 caracteres (16 dígitos + 3 espacios)
  }

  /**
   * Maneja errores específicos de Stripe
   */
  handleStripeError(error: any): string {
    const errorMessages: Record<string, string> = {
      card_declined: 'Su tarjeta fue rechazada. Intente con otra tarjeta.',
      expired_card: 'Su tarjeta ha expirado. Verifique la fecha de vencimiento.',
      incorrect_cvc: 'El código de seguridad es incorrecto.',
      processing_error: 'Error al procesar el pago. Intente nuevamente.',
      incorrect_number: 'El número de tarjeta es incorrecto.',
      insufficient_funds: 'Fondos insuficientes en la tarjeta.',
      authentication_required: 'Se requiere autenticación adicional.',
    };

    return errorMessages[error.code] || error.message || 'Error desconocido en el pago';
  }
}

export const stripeService = new StripeService();