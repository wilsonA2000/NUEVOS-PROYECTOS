import React, { useState, useEffect } from 'react';
import {
  PayPalScriptProvider,
  PayPalButtons,
  usePayPalScriptReducer,
} from '@paypal/react-paypal-js';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Button,
  FormControlLabel,
  Switch,
  Grid,
  Chip,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { paypalService, PayPalPaymentResult } from '../../services/paypalService';
import { loggingService } from '../../services/loggingService';

export interface PayPalPaymentButtonProps {
  amount: number;
  currency?: string;
  contractId?: string;
  description?: string;
  onSuccess: (result: PayPalPaymentResult) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  showSubscriptions?: boolean;
  subscriptionPlanId?: string;
  environment?: 'sandbox' | 'production';
  clientId: string;
  style?: {
    layout?: 'vertical' | 'horizontal';
    color?: 'gold' | 'blue' | 'silver' | 'white' | 'black';
    shape?: 'rect' | 'pill';
    label?: 'paypal' | 'checkout' | 'buynow' | 'pay' | 'installment' | 'subscribe' | 'donate';
    tagline?: boolean;
    height?: number;
  };
}

interface PayPalButtonContentProps extends Omit<PayPalPaymentButtonProps, 'clientId' | 'environment'> {}

const PayPalButtonContent: React.FC<PayPalButtonContentProps> = ({
  amount,
  currency = 'USD',
  contractId,
  description,
  onSuccess,
  onError,
  onCancel,
  disabled = false,
  showSubscriptions = false,
  subscriptionPlanId,
  style = {},
}) => {
  const [{ isResolved, isPending, isRejected }] = usePayPalScriptReducer();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [enableSubscription, setEnableSubscription] = useState(false);

  const buttonStyle = {
    layout: 'vertical',
    color: 'gold',
    shape: 'rect',
    label: 'pay',
    tagline: false,
    height: 40,
    ...style,
  };

  const createOrder = async () => {
    try {
      setIsProcessing(true);
      setOrderCreated(false);

      const orderData = {
        amount,
        currency: currency.toUpperCase(),
        description: description || `Pago por ${amount} ${currency}`,
        contractId,
        metadata: {
          contractId: contractId || '',
          source: 'paypal_button',
        },
        items: [
          {
            name: description || 'Pago VeriHome',
            quantity: 1,
            unit_amount: {
              currency_code: currency.toUpperCase(),
              value: amount.toFixed(2),
            },
            description: description || `Pago por contrato ${contractId}`,
          },
        ],
      };

      const order = await paypalService.createOrder(orderData);
      setOrderCreated(true);
      loggingService.info('PayPal order created:', order.id);
      
      return order.id;
    } catch (error) {
      loggingService.error('Error creating PayPal order:', error);
      onError('Error al crear la orden de PayPal');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const onApprove = async (data: any) => {
    try {
      setIsProcessing(true);

      const result = await paypalService.captureOrder(data.orderID);

      if (result.success) {
        loggingService.info('PayPal payment captured:', data.orderID);
        onSuccess(result);
      } else {
        loggingService.error('PayPal capture failed:', result.error);
        onError(result.error || 'Error al capturar el pago');
      }
    } catch (error) {
      loggingService.error('Error capturing PayPal payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar el pago';
      onError(paypalService.handlePayPalError({ message: errorMessage }));
    } finally {
      setIsProcessing(false);
    }
  };

  const onErrorHandler = (error: any) => {
    loggingService.error('PayPal button error:', error);
    onError(paypalService.handlePayPalError(error));
    setIsProcessing(false);
  };

  const onCancelHandler = () => {
    loggingService.info('PayPal payment cancelled');
    setIsProcessing(false);
    if (onCancel) {
      onCancel();
    }
  };

  const createSubscription = async () => {
    try {
      if (!subscriptionPlanId) {
        throw new Error('Subscription plan ID is required');
      }

      setIsProcessing(true);

      const subscriptionData = {
        planId: subscriptionPlanId,
        subscriber: {
          email_address: 'customer@example.com', // Debería venir de props
        },
        application_context: {
          brand_name: 'VeriHome',
          locale: 'es-ES',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: `${window.location.origin}/app/payments/success`,
          cancel_url: `${window.location.origin}/app/payments/cancel`,
        },
      };

      const subscription = await paypalService.createSubscription(subscriptionData);
      loggingService.info('PayPal subscription created:', subscription.id);
      
      return subscription.id;
    } catch (error) {
      loggingService.error('Error creating PayPal subscription:', error);
      onError('Error al crear la suscripción');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  if (isPending) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="center" py={4}>
            <CircularProgress sx={{ mr: 2 }} />
            <Typography>Cargando PayPal...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (isRejected) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            <Typography variant="h6">Error al cargar PayPal</Typography>
            <Typography variant="body2">
              No se pudo cargar el SDK de PayPal. Por favor, verifique su conexión a internet e intente nuevamente.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!isResolved) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="center" py={4}>
            <CircularProgress sx={{ mr: 2 }} />
            <Typography>Inicializando PayPal...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={3}>
          <PaymentIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Pagar con PayPal</Typography>
        </Box>

        {/* Resumen del pago */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1">
            <strong>Total a pagar: </strong>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency,
            }).format(amount)}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Alert>

        {/* Opciones de suscripción */}
        {showSubscriptions && subscriptionPlanId && (
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={enableSubscription}
                  onChange={(e) => setEnableSubscription(e.target.checked)}
                  disabled={disabled || isProcessing}
                />
              }
              label="Configurar como pago recurrente"
            />
            {enableSubscription && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  Este pago se configurará como una suscripción recurrente
                </Typography>
              </Alert>
            )}
          </Box>
        )}

        {/* Estados del proceso */}
        {isProcessing && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center">
              <CircularProgress size={20} sx={{ mr: 1 }} />
              <Typography variant="body2">
                {orderCreated ? 'Procesando pago...' : 'Creando orden...'}
              </Typography>
            </Box>
          </Alert>
        )}

        {/* Botones de PayPal */}
        <Box sx={{ mb: 3 }}>
          {enableSubscription && subscriptionPlanId ? (
            <PayPalButtons
              style={buttonStyle}
              disabled={disabled || isProcessing}
              createSubscription={createSubscription}
              onApprove={onApprove}
              onError={onErrorHandler}
              onCancel={onCancelHandler}
            />
          ) : (
            <PayPalButtons
              style={buttonStyle}
              disabled={disabled || isProcessing}
              createOrder={createOrder}
              onApprove={onApprove}
              onError={onErrorHandler}
              onCancel={onCancelHandler}
            />
          )}
        </Box>

        {/* Información de seguridad y métodos de pago */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <Alert severity="success" sx={{ height: '100%' }}>
              <Box display="flex" alignItems="center">
                <SecurityIcon sx={{ mr: 1 }} />
                <Typography variant="body2">
                  Pagos seguros protegidos por PayPal
                </Typography>
              </Box>
            </Alert>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Alert severity="info" sx={{ height: '100%' }}>
              <Box display="flex" alignItems="center">
                <CheckCircleIcon sx={{ mr: 1 }} />
                <Typography variant="body2">
                  No se comparten datos de tarjeta
                </Typography>
              </Box>
            </Alert>
          </Grid>
        </Grid>

        {/* Métodos de pago aceptados */}
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Métodos de pago aceptados:
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Chip size="small" label="PayPal Balance" />
            <Chip size="small" label="Tarjetas de Crédito" />
            <Chip size="small" label="Transferencia Bancaria" />
            <Chip size="small" label="PayPal Credit" />
          </Box>
        </Box>

        {/* Botón de cancelación */}
        {onCancel && (
          <Box display="flex" justifyContent="center" mt={2}>
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={disabled || isProcessing}
            >
              Cancelar
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export const PayPalPaymentButton: React.FC<PayPalPaymentButtonProps> = ({
  clientId,
  environment = 'sandbox',
  ...props
}) => {
  const [scriptOptions, setScriptOptions] = useState({
    'client-id': clientId,
    currency: props.currency || 'USD',
    intent: props.showSubscriptions ? 'subscription' : 'capture',
    'enable-funding': 'card',
    'disable-funding': '',
    'data-sdk-integration-source': 'react-paypal-js',
  });

  useEffect(() => {
    setScriptOptions((prev) => ({
      ...prev,
      currency: props.currency || 'USD',
      intent: props.showSubscriptions && props.subscriptionPlanId ? 'subscription' : 'capture',
    }));
  }, [props.currency, props.showSubscriptions, props.subscriptionPlanId]);

  return (
    <PayPalScriptProvider options={scriptOptions}>
      <PayPalButtonContent {...props} />
    </PayPalScriptProvider>
  );
};