import React, { useState, useEffect } from 'react';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from '@stripe/react-stripe-js';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Grid,
  Switch,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  FormHelperText,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { stripeService, StripePaymentResult } from '../../services/stripeService';
import { loggingService } from '../../services/loggingService';

export interface StripePaymentFormProps {
  amount: number;
  currency?: string;
  contractId?: string;
  description?: string;
  onSuccess: (result: StripePaymentResult) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  showSaveCard?: boolean;
  customerEmail?: string;
  enableSeparateFields?: boolean;
}

interface BillingDetails {
  name: string;
  email: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      '::placeholder': {
        color: '#aab7c4',
      },
      iconColor: '#666EE8',
    },
    invalid: {
      color: '#9e2146',
      iconColor: '#fa755a',
    },
  },
  hidePostalCode: false,
};

const SEPARATE_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

const StripePaymentFormContent: React.FC<StripePaymentFormProps> = ({
  amount,
  currency = 'USD',
  contractId,
  description,
  onSuccess,
  onError,
  onCancel,
  disabled = false,
  showSaveCard = true,
  customerEmail,
  enableSeparateFields = false,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [billingDetails, setBillingDetails] = useState<BillingDetails>({
    name: '',
    email: customerEmail || '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US',
    },
  });

  // Estados para validación de campos separados
  const [cardNumberComplete, setCardNumberComplete] = useState(false);
  const [cardExpiryComplete, setCardExpiryComplete] = useState(false);
  const [cardCvcComplete, setCardCvcComplete] = useState(false);
  const [cardNumberError, setCardNumberError] = useState<string | null>(null);
  const [cardExpiryError, setCardExpiryError] = useState<string | null>(null);
  const [cardCvcError, setCardCvcError] = useState<string | null>(null);

  useEffect(() => {
    // Crear Payment Intent al montar el componente
    const createPaymentIntent = async () => {
      try {
        const paymentIntent = await stripeService.createPaymentIntent({
          amount: Math.round(amount * 100), // Convertir a centavos
          currency: currency.toLowerCase(),
          contractId,
          description,
          metadata: {
            contractId: contractId || '',
            saveCard: saveCard.toString(),
          },
        });

        setClientSecret(paymentIntent.client_secret);
      } catch (error) {
        loggingService.error('Error creating payment intent:', error);
        onError('Error al inicializar el pago');
      }
    };

    if (amount > 0) {
      createPaymentIntent();
    }
  }, [amount, currency, contractId, description, saveCard]);

  const handleCardChange = (event: any) => {
    if (enableSeparateFields) {
      // Manejo para campos separados
      switch (event.elementType) {
        case 'cardNumber':
          setCardNumberComplete(event.complete);
          setCardNumberError(event.error?.message || null);
          break;
        case 'cardExpiry':
          setCardExpiryComplete(event.complete);
          setCardExpiryError(event.error?.message || null);
          break;
        case 'cardCvc':
          setCardCvcComplete(event.complete);
          setCardCvcError(event.error?.message || null);
          break;
      }

      setCardComplete(cardNumberComplete && cardExpiryComplete && cardCvcComplete);
    } else {
      // Manejo para campo único
      setCardComplete(event.complete);
      setCardError(event.error?.message || null);
    }
  };

  const handleBillingDetailsChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setBillingDetails((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof BillingDetails],
          [child]: value,
        },
      }));
    } else {
      setBillingDetails((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      onError('Stripe no está disponible');
      return;
    }

    if (!cardComplete) {
      onError('Por favor complete la información de la tarjeta');
      return;
    }

    if (!billingDetails.name || !billingDetails.email) {
      onError('Por favor complete la información de facturación');
      return;
    }

    setIsProcessing(true);

    try {
      const cardElement = enableSeparateFields
        ? elements.getElement(CardNumberElement)
        : elements.getElement(CardElement);

      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const result = await stripeService.confirmPayment(clientSecret, elements, {
        type: 'card',
        card: cardElement,
        billing_details: {
          name: billingDetails.name,
          email: billingDetails.email,
          address: {
            line1: billingDetails.address.line1,
            line2: billingDetails.address.line2,
            city: billingDetails.address.city,
            state: billingDetails.address.state,
            postal_code: billingDetails.address.postal_code,
            country: billingDetails.address.country,
          },
        },
      });

      if (result.success) {
        onSuccess(result);
      } else if (result.requiresAction) {
        // El pago requiere autenticación adicional (3D Secure)
        onError('Se requiere autenticación adicional. Por favor, complete la verificación.');
      } else {
        onError(result.error || 'Error al procesar el pago');
      }
    } catch (error) {
      loggingService.error('Error processing payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar el pago';
      onError(stripeService.handleStripeError({ message: errorMessage }));
    } finally {
      setIsProcessing(false);
    }
  };

  const renderCardFields = () => {
    if (enableSeparateFields) {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Número de Tarjeta
            </Typography>
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: cardNumberError ? 'error.main' : 'grey.300',
                borderRadius: 1,
                backgroundColor: 'background.paper',
              }}
            >
              <CardNumberElement
                options={SEPARATE_ELEMENT_OPTIONS}
                onChange={handleCardChange}
              />
            </Box>
            {cardNumberError && (
              <FormHelperText error>{cardNumberError}</FormHelperText>
            )}
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" gutterBottom>
              Fecha de Vencimiento
            </Typography>
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: cardExpiryError ? 'error.main' : 'grey.300',
                borderRadius: 1,
                backgroundColor: 'background.paper',
              }}
            >
              <CardExpiryElement
                options={SEPARATE_ELEMENT_OPTIONS}
                onChange={handleCardChange}
              />
            </Box>
            {cardExpiryError && (
              <FormHelperText error>{cardExpiryError}</FormHelperText>
            )}
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" gutterBottom>
              CVC
            </Typography>
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: cardCvcError ? 'error.main' : 'grey.300',
                borderRadius: 1,
                backgroundColor: 'background.paper',
              }}
            >
              <CardCvcElement
                options={SEPARATE_ELEMENT_OPTIONS}
                onChange={handleCardChange}
              />
            </Box>
            {cardCvcError && (
              <FormHelperText error>{cardCvcError}</FormHelperText>
            )}
          </Grid>
        </Grid>
      );
    }

    return (
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          <CreditCardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Información de la Tarjeta
        </Typography>
        <Box
          sx={{
            p: 2,
            border: 1,
            borderColor: cardError ? 'error.main' : 'grey.300',
            borderRadius: 1,
            backgroundColor: 'background.paper',
          }}
        >
          <CardElement options={CARD_ELEMENT_OPTIONS} onChange={handleCardChange} />
        </Box>
        {cardError && <FormHelperText error>{cardError}</FormHelperText>}
      </Box>
    );
  };

  return (
    <Card>
      <CardContent>
        <Box component="form" onSubmit={handleSubmit}>
          <Box display="flex" alignItems="center" mb={3}>
            <SecurityIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6">Pago Seguro con Stripe</Typography>
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

          {/* Información de facturación */}
          <Typography variant="subtitle1" gutterBottom>
            Información de Facturación
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre completo"
                value={billingDetails.name}
                onChange={(e) => handleBillingDetailsChange('name', e.target.value)}
                required
                disabled={disabled || isProcessing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={billingDetails.email}
                onChange={(e) => handleBillingDetailsChange('email', e.target.value)}
                required
                disabled={disabled || isProcessing}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección"
                value={billingDetails.address.line1}
                onChange={(e) => handleBillingDetailsChange('address.line1', e.target.value)}
                disabled={disabled || isProcessing}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Ciudad"
                value={billingDetails.address.city}
                onChange={(e) => handleBillingDetailsChange('address.city', e.target.value)}
                disabled={disabled || isProcessing}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Estado"
                value={billingDetails.address.state}
                onChange={(e) => handleBillingDetailsChange('address.state', e.target.value)}
                disabled={disabled || isProcessing}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Código Postal"
                value={billingDetails.address.postal_code}
                onChange={(e) => handleBillingDetailsChange('address.postal_code', e.target.value)}
                disabled={disabled || isProcessing}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Campos de tarjeta */}
          <Box sx={{ mb: 3 }}>{renderCardFields()}</Box>

          {/* Opción para guardar tarjeta */}
          {showSaveCard && (
            <FormControlLabel
              control={
                <Switch
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                  disabled={disabled || isProcessing}
                />
              }
              label="Guardar esta tarjeta para futuros pagos"
              sx={{ mb: 2 }}
            />
          )}

          {/* Indicadores de seguridad */}
          <Alert severity="success" sx={{ mb: 3 }}>
            <Box display="flex" alignItems="center">
              <CheckCircleIcon sx={{ mr: 1 }} />
              <Typography variant="body2">
                Sus datos están protegidos con encriptación SSL de 256 bits y cumplimiento PCI DSS
              </Typography>
            </Box>
          </Alert>

          {/* Botones de acción */}
          <Box display="flex" gap={2} justifyContent="flex-end">
            {onCancel && (
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={disabled || isProcessing}
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={disabled || isProcessing || !cardComplete || !stripe || !elements}
              startIcon={
                isProcessing ? (
                  <CircularProgress size={20} />
                ) : (
                  <CreditCardIcon />
                )
              }
            >
              {isProcessing ? 'Procesando...' : `Pagar ${currency} ${amount.toFixed(2)}`}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export const StripePaymentForm: React.FC<StripePaymentFormProps & {
  stripePromise: Promise<any>;
}> = ({ stripePromise, ...props }) => {
  return (
    <Elements stripe={stripePromise}>
      <StripePaymentFormContent {...props} />
    </Elements>
  );
};