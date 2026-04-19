import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Tabs,
  Tab,
  Alert,
  Divider,
  Chip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Payment as PaymentIcon,
  AccountBalance as AccountBalanceIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js/pure';
import { usePayments } from '../../hooks/usePayments';
import { usePaymentProcessing } from '../../hooks/usePaymentProcessing';
import { Payment, CreatePaymentDto, UpdatePaymentDto } from '../../types/payment';
import { StripePaymentForm } from './StripePaymentForm';
import { PayPalPaymentButton } from './PayPalPaymentButton';
import { loggingService, LogCategory } from '../../services/loggingService';

interface PaymentFormProps {
  payment?: Payment;
  isEdit?: boolean;
  amount?: number;
  currency?: string;
  contractId?: string;
  description?: string;
  onPaymentSuccess?: (result: any) => void;
  onPaymentError?: (error: string) => void;
  enableRealPayments?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`payment-tabpanel-${index}`}
      aria-labelledby={`payment-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Helper functions to safely get payment config from environment variables
const getStripePublishableKey = (): string => {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      'VITE_STRIPE_PUBLISHABLE_KEY is not configured. ' +
      'Please add it to your .env file. ' +
      'For testing, use a test key starting with "pk_test_"',
    );
  }
  return key;
};

const getPayPalClientId = (): string => {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      'VITE_PAYPAL_CLIENT_ID is not configured. ' +
      'Please add it to your .env file. ' +
      'For testing, use a sandbox client ID',
    );
  }
  return clientId;
};

// Configuración de las pasarelas (variables de entorno requeridas)
const PAYMENT_CONFIG = {
  stripe: {
    publishableKey: getStripePublishableKey(),
  },
  paypal: {
    clientId: getPayPalClientId(),
    environment: (import.meta.env.MODE === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
  },
};

export const PaymentForm: React.FC<PaymentFormProps> = ({
  payment,
  isEdit = false,
  amount: propAmount,
  currency = 'USD',
  contractId: propContractId,
  description,
  onPaymentSuccess,
  onPaymentError,
  enableRealPayments = false,
}) => {
  const navigate = useNavigate();
  const { createTransaction, updateTransaction } = usePayments();
  const [formData, setFormData] = useState<any>(
    payment || {
      contract_id: propContractId ? parseInt(propContractId) : 0,
      amount: propAmount || 0,
      due_date: '',
      notes: '',
      payment_method: 'stripe',
    },
  );
  
  // Estados para las pasarelas de pago reales
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(0); // 0: Formulario tradicional, 1: Stripe, 2: PayPal
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [showRealPayments, setShowRealPayments] = useState(enableRealPayments);
  
  const {
    paymentState,
    initializeStripe,
    initializePayPal,
    processStripePayment,
    processPayPalPayment,
    validatePaymentData,
    resetPaymentState,
  } = usePaymentProcessing();

  // Inicializar Stripe
  useEffect(() => {
    if (showRealPayments && PAYMENT_CONFIG.stripe.publishableKey) {
      const promise = loadStripe(PAYMENT_CONFIG.stripe.publishableKey);
      setStripePromise(promise);
      
      initializeStripe(PAYMENT_CONFIG.stripe.publishableKey).catch((error) => {
        loggingService.error(LogCategory.SYSTEM, 'Error initializing Stripe', { error });
      });
    }
  }, [showRealPayments, initializeStripe]);

  // Inicializar PayPal
  useEffect(() => {
    if (showRealPayments && PAYMENT_CONFIG.paypal.clientId) {
      initializePayPal(PAYMENT_CONFIG.paypal.clientId, PAYMENT_CONFIG.paypal.environment);
    }
  }, [showRealPayments, initializePayPal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData((prev: Record<string, unknown>) => ({
      ...prev,
      [name as string]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit && payment) {
        await updateTransaction.mutateAsync({ id: payment.id.toString(), data: formData });
      } else {
        await createTransaction.mutateAsync(formData);
      }
      navigate('/app/payments');
    } catch (error) {
    }
  };

  const handleStripePaymentSuccess = (result: any) => {
    loggingService.info(LogCategory.BUSINESS, 'Stripe payment successful', { result });
    resetPaymentState();
    if (onPaymentSuccess) {
      onPaymentSuccess(result);
    } else {
      navigate('/app/payments/success');
    }
  };

  const handleStripePaymentError = (error: string) => {
    loggingService.error(LogCategory.BUSINESS, 'Stripe payment error', { error });
    if (onPaymentError) {
      onPaymentError(error);
    }
  };

  const handlePayPalPaymentSuccess = (result: any) => {
    loggingService.info(LogCategory.BUSINESS, 'PayPal payment successful', { result });
    resetPaymentState();
    if (onPaymentSuccess) {
      onPaymentSuccess(result);
    } else {
      navigate('/app/payments/success');
    }
  };

  const handlePayPalPaymentError = (error: string) => {
    loggingService.error(LogCategory.BUSINESS, 'PayPal payment error', { error });
    if (onPaymentError) {
      onPaymentError(error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedPaymentMethod(newValue);
    resetPaymentState();
  };

  // Determinar si mostrar pasarelas reales
  const shouldShowRealPayments = showRealPayments && propAmount && propAmount > 0;
  const paymentAmount = propAmount || formData.amount;

  // Función para renderizar el formulario tradicional
  const renderTraditionalForm = () => {
    return (
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="ID de Contrato"
              name="contract_id"
              value={formData.contract_id}
              onChange={handleChange}
              required
              disabled={!!propContractId}
              helperText={propContractId ? 'Heredado del contexto' : ''}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Monto"
              name="amount"
              type="number"
              value={formData.amount || 0}
              onChange={handleChange}
              required
              disabled={!!propAmount}
              helperText={propAmount ? 'Heredado del contexto' : ''}
              InputProps={{
                startAdornment: '$',
              }}
            />
          </Grid>
          {shouldShowRealPayments && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Información del Pago Real:</strong>
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip size="small" label={`Monto: ${currency} ${(paymentAmount || 0).toFixed(2)}`} sx={{ mr: 1 }} />
                  <Chip size="small" label={`Contrato: ${propContractId || 'N/A'}`} sx={{ mr: 1 }} />
                  {description && <Chip size="small" label={`Desc: ${description}`} />}
                </Box>
              </Alert>
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Fecha de Vencimiento"
              name="due_date"
              type="date"
              value={formData.due_date || ''}
              onChange={handleChange}
              required
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          {isEdit && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Fecha de Pago"
                  name="payment_date"
                  type="date"
                  value={formData.payment_date || ''}
                  onChange={handleChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Método de Pago</InputLabel>
                  <Select
                    name="payment_method"
                    value={formData.payment_method || ''}
                    onChange={(e) => handleChange(e as any)}
                    label="Método de Pago"
                  >
                    <MenuItem value="cash">Efectivo</MenuItem>
                    <MenuItem value="bank_transfer">Transferencia Bancaria</MenuItem>
                    <MenuItem value="credit_card">Tarjeta de Crédito</MenuItem>
                    <MenuItem value="stripe">Stripe</MenuItem>
                    <MenuItem value="paypal">PayPal</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Referencia"
                  name="reference"
                  value={(formData as UpdatePaymentDto).reference || ''}
                  onChange={handleChange}
                />
              </Grid>
            </>
          )}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notas"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              multiline
              rows={4}
            />
          </Grid>
          
          {!shouldShowRealPayments && paymentAmount > 0 && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  💡 <strong>Sugerencia:</strong> Active "Procesamiento Real" para usar las pasarelas de pago integradas (Stripe/PayPal)
                </Typography>
              </Alert>
            </Grid>
          )}
          
          <Grid item xs={12}>
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => navigate('/app/payments')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={createTransaction.isPending || updateTransaction.isPending}
              >
                {isEdit ? 'Actualizar' : 'Crear'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">
            {isEdit ? 'Editar Pago' : shouldShowRealPayments ? 'Procesar Pago' : 'Nuevo Pago'}
          </Typography>
          {!isEdit && (
            <FormControlLabel
              control={
                <Switch
                  checked={showRealPayments}
                  onChange={(e) => setShowRealPayments(e.target.checked)}
                  disabled={!propAmount || propAmount <= 0}
                />
              }
              label="Procesamiento Real"
            />
          )}
        </Box>

        {shouldShowRealPayments && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Está a punto de procesar un pago real por{' '}
              <strong>
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: currency,
                }).format(paymentAmount)}
              </strong>
              {description && <span> - {description}</span>}
            </Typography>
          </Alert>
        )}

        {shouldShowRealPayments ? (
          // Mostrar pasarelas de pago reales
          <Box>
            <Tabs value={selectedPaymentMethod} onChange={handleTabChange} aria-label="payment methods">
              <Tab 
                icon={<CreditCardIcon />} 
                label="Tarjeta de Crédito" 
                id="payment-tab-0" 
                aria-controls="payment-tabpanel-0" 
              />
              <Tab 
                icon={<PaymentIcon />} 
                label="PayPal" 
                id="payment-tab-1" 
                aria-controls="payment-tabpanel-1" 
              />
              <Tab 
                icon={<AccountBalanceIcon />} 
                label="Formulario Tradicional" 
                id="payment-tab-2" 
                aria-controls="payment-tabpanel-2" 
              />
            </Tabs>

            <TabPanel value={selectedPaymentMethod} index={0}>
              {stripePromise && (
                <StripePaymentForm
                  stripePromise={stripePromise}
                  amount={paymentAmount}
                  currency={currency}
                  contractId={propContractId}
                  description={description}
                  onSuccess={handleStripePaymentSuccess}
                  onError={handleStripePaymentError}
                  onCancel={() => setSelectedPaymentMethod(2)}
                  showSaveCard={true}
                  enableSeparateFields={false}
                />
              )}
            </TabPanel>

            <TabPanel value={selectedPaymentMethod} index={1}>
              <PayPalPaymentButton
                clientId={PAYMENT_CONFIG.paypal.clientId}
                environment={PAYMENT_CONFIG.paypal.environment}
                amount={paymentAmount}
                currency={currency}
                contractId={propContractId}
                description={description}
                onSuccess={handlePayPalPaymentSuccess}
                onError={handlePayPalPaymentError}
                onCancel={() => setSelectedPaymentMethod(2)}
                showSubscriptions={false}
                style={{
                  layout: 'vertical',
                  color: 'gold',
                  shape: 'rect',
                  label: 'pay',
                  tagline: false,
                  height: 45,
                }}
              />
            </TabPanel>

            <TabPanel value={selectedPaymentMethod} index={2}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  El formulario tradicional no procesa pagos reales. Use las pestañas anteriores para procesamiento en vivo.
                </Typography>
              </Alert>
              {renderTraditionalForm()}
            </TabPanel>
          </Box>
        ) : (
          // Mostrar formulario tradicional
          renderTraditionalForm()
        )}
      </CardContent>
    </Card>
  );
};