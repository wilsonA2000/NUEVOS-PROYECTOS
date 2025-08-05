import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stripeService, StripePaymentResult } from '../services/stripeService';
import { paypalService, PayPalPaymentResult } from '../services/paypalService';
import { paymentService } from '../services/paymentService';
import { loggingService } from '../services/loggingService';

export type PaymentProvider = 'stripe' | 'paypal';

export interface PaymentData {
  amount: number;
  currency: string;
  contractId?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentMethodInfo {
  id: string;
  type: string;
  last4?: string;
  brand?: string;
  exp_month?: number;
  exp_year?: number;
  email?: string;
  isDefault: boolean;
  provider: PaymentProvider;
}

export interface PaymentState {
  isProcessing: boolean;
  error: string | null;
  success: boolean;
  paymentId: string | null;
  requiresAction: boolean;
  clientSecret: string | null;
}

export interface PaymentConfig {
  stripePublishableKey?: string;
  paypalClientId?: string;
  environment?: 'sandbox' | 'production';
}

export interface UsePaymentProcessingReturn {
  // Estado del pago
  paymentState: PaymentState;
  
  // Configuración
  initializeStripe: (publishableKey: string) => Promise<void>;
  initializePayPal: (clientId: string, environment?: 'sandbox' | 'production') => void;
  
  // Procesamiento de pagos
  processStripePayment: (data: PaymentData) => Promise<StripePaymentResult>;
  processPayPalPayment: (data: PaymentData) => Promise<PayPalPaymentResult>;
  
  // Métodos de pago guardados
  savedPaymentMethods: PaymentMethodInfo[];
  loadSavedPaymentMethods: () => void;
  removePaymentMethod: (id: string, provider: PaymentProvider) => Promise<void>;
  setDefaultPaymentMethod: (id: string, provider: PaymentProvider) => Promise<void>;
  
  // Reembolsos
  createRefund: (paymentId: string, provider: PaymentProvider, amount?: number) => Promise<void>;
  
  // Historial de transacciones
  transactionHistory: any[];
  loadTransactionHistory: () => void;
  
  // Validación
  validatePaymentData: (data: PaymentData) => { isValid: boolean; errors: string[] };
  
  // Estados de carga
  isLoadingMethods: boolean;
  isLoadingHistory: boolean;
  isRefunding: boolean;
  
  // Reset
  resetPaymentState: () => void;
  
  // Manejo de errores
  handlePaymentError: (error: any, provider: PaymentProvider) => string;
}

export const usePaymentProcessing = (config?: PaymentConfig): UsePaymentProcessingReturn => {
  const queryClient = useQueryClient();
  
  const [paymentState, setPaymentState] = useState<PaymentState>({
    isProcessing: false,
    error: null,
    success: false,
    paymentId: null,
    requiresAction: false,
    clientSecret: null,
  });

  const [isStripeInitialized, setIsStripeInitialized] = useState(false);
  const [isPayPalInitialized, setIsPayPalInitialized] = useState(false);

  // Inicialización automática si se proporciona configuración
  useEffect(() => {
    if (config?.stripePublishableKey && !isStripeInitialized) {
      initializeStripe(config.stripePublishableKey);
    }
    if (config?.paypalClientId && !isPayPalInitialized) {
      initializePayPal(config.paypalClientId, config.environment);
    }
  }, [config]);

  // Query para métodos de pago guardados
  const {
    data: savedPaymentMethods = [],
    isLoading: isLoadingMethods,
    refetch: refetchPaymentMethods,
  } = useQuery({
    queryKey: ['savedPaymentMethods'],
    queryFn: async () => {
      const [stripeMethods, paypalMethods] = await Promise.allSettled([
        stripeService.getSavedPaymentMethods(),
        paypalService.getTransactionHistory(), // PayPal no guarda métodos, pero podemos obtener historial
      ]);

      const methods: PaymentMethodInfo[] = [];

      // Agregar métodos de Stripe
      if (stripeMethods.status === 'fulfilled') {
        stripeMethods.value.forEach((method: any) => {
          methods.push({
            id: method.id,
            type: method.type,
            last4: method.card?.last4,
            brand: method.card?.brand,
            exp_month: method.card?.exp_month,
            exp_year: method.card?.exp_year,
            isDefault: method.is_default || false,
            provider: 'stripe',
          });
        });
      }

      return methods;
    },
    enabled: isStripeInitialized,
  });

  // Query para historial de transacciones
  const {
    data: transactionHistory = [],
    isLoading: isLoadingHistory,
    refetch: refetchTransactionHistory,
  } = useQuery({
    queryKey: ['transactionHistory'],
    queryFn: async () => {
      const transactions = await paymentService.getTransactionReport();
      return transactions;
    },
  });

  // Mutación para reembolsos
  const refundMutation = useMutation({
    mutationFn: async ({ paymentId, provider, amount }: { 
      paymentId: string; 
      provider: PaymentProvider; 
      amount?: number;
    }) => {
      if (provider === 'stripe') {
        return await stripeService.createRefund(paymentId, amount);
      } else {
        return await paypalService.createRefund(paymentId, 
          amount ? { currency_code: 'USD', value: amount.toString() } : undefined
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactionHistory'] });
    },
  });

  // Inicializar Stripe
  const initializeStripe = useCallback(async (publishableKey: string) => {
    try {
      await stripeService.initialize({ publishableKey });
      setIsStripeInitialized(true);
      loggingService.info('Stripe initialized in usePaymentProcessing');
    } catch (error) {
      loggingService.error('Error initializing Stripe:', error);
      throw error;
    }
  }, []);

  // Inicializar PayPal
  const initializePayPal = useCallback((clientId: string, environment: 'sandbox' | 'production' = 'sandbox') => {
    try {
      paypalService.initialize({ clientId, environment });
      setIsPayPalInitialized(true);
      loggingService.info('PayPal initialized in usePaymentProcessing');
    } catch (error) {
      loggingService.error('Error initializing PayPal:', error);
      throw error;
    }
  }, []);

  // Procesar pago con Stripe
  const processStripePayment = useCallback(async (data: PaymentData): Promise<StripePaymentResult> => {
    if (!isStripeInitialized) {
      throw new Error('Stripe not initialized');
    }

    setPaymentState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const validation = validatePaymentData(data);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Crear Payment Intent
      const paymentIntent = await stripeService.createPaymentIntent({
        amount: Math.round(data.amount * 100), // Convertir a centavos
        currency: data.currency.toLowerCase(),
        contractId: data.contractId,
        description: data.description,
        metadata: data.metadata,
      });

      setPaymentState(prev => ({ 
        ...prev, 
        clientSecret: paymentIntent.client_secret 
      }));

      // El pago se completará en el componente StripePaymentForm
      return {
        success: true,
        paymentIntent,
      };
    } catch (error) {
      const errorMessage = handlePaymentError(error, 'stripe');
      setPaymentState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: errorMessage 
      }));
      throw error;
    }
  }, [isStripeInitialized]);

  // Procesar pago con PayPal
  const processPayPalPayment = useCallback(async (data: PaymentData): Promise<PayPalPaymentResult> => {
    if (!isPayPalInitialized) {
      throw new Error('PayPal not initialized');
    }

    setPaymentState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const validation = validatePaymentData(data);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const order = await paypalService.createOrder({
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        contractId: data.contractId,
        description: data.description,
        metadata: data.metadata,
      });

      setPaymentState(prev => ({ 
        ...prev, 
        paymentId: order.id,
        isProcessing: false 
      }));

      return {
        success: true,
        orderId: order.id,
      };
    } catch (error) {
      const errorMessage = handlePaymentError(error, 'paypal');
      setPaymentState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: errorMessage 
      }));
      throw error;
    }
  }, [isPayPalInitialized]);

  // Cargar métodos de pago guardados
  const loadSavedPaymentMethods = useCallback(() => {
    refetchPaymentMethods();
  }, [refetchPaymentMethods]);

  // Eliminar método de pago
  const removePaymentMethod = useCallback(async (id: string, provider: PaymentProvider) => {
    try {
      if (provider === 'stripe') {
        await stripeService.removePaymentMethod(id);
      }
      // PayPal no permite eliminar métodos guardados directamente
      queryClient.invalidateQueries({ queryKey: ['savedPaymentMethods'] });
    } catch (error) {
      loggingService.error('Error removing payment method:', error);
      throw error;
    }
  }, [queryClient]);

  // Establecer método de pago por defecto
  const setDefaultPaymentMethod = useCallback(async (id: string, provider: PaymentProvider) => {
    try {
      if (provider === 'stripe') {
        await paymentService.setDefaultPaymentMethod(id);
      }
      queryClient.invalidateQueries({ queryKey: ['savedPaymentMethods'] });
    } catch (error) {
      loggingService.error('Error setting default payment method:', error);
      throw error;
    }
  }, [queryClient]);

  // Crear reembolso
  const createRefund = useCallback(async (paymentId: string, provider: PaymentProvider, amount?: number) => {
    try {
      await refundMutation.mutateAsync({ paymentId, provider, amount });
    } catch (error) {
      loggingService.error('Error creating refund:', error);
      throw error;
    }
  }, [refundMutation]);

  // Cargar historial de transacciones
  const loadTransactionHistory = useCallback(() => {
    refetchTransactionHistory();
  }, [refetchTransactionHistory]);

  // Validar datos de pago
  const validatePaymentData = useCallback((data: PaymentData): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!data.amount || data.amount <= 0) {
      errors.push('El monto debe ser mayor a 0');
    }

    if (!data.currency || data.currency.length !== 3) {
      errors.push('Código de moneda inválido');
    }

    if (data.amount > 999999) {
      errors.push('El monto excede el límite máximo');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  // Reset del estado de pago
  const resetPaymentState = useCallback(() => {
    setPaymentState({
      isProcessing: false,
      error: null,
      success: false,
      paymentId: null,
      requiresAction: false,
      clientSecret: null,
    });
  }, []);

  // Manejo de errores
  const handlePaymentError = useCallback((error: any, provider: PaymentProvider): string => {
    if (provider === 'stripe') {
      return stripeService.handleStripeError(error);
    } else {
      return paypalService.handlePayPalError(error);
    }
  }, []);

  return {
    paymentState,
    initializeStripe,
    initializePayPal,
    processStripePayment,
    processPayPalPayment,
    savedPaymentMethods,
    loadSavedPaymentMethods,
    removePaymentMethod,
    setDefaultPaymentMethod,
    createRefund,
    transactionHistory,
    loadTransactionHistory,
    validatePaymentData,
    isLoadingMethods,
    isLoadingHistory,
    isRefunding: refundMutation.isPending,
    resetPaymentState,
    handlePaymentError,
  };
};