import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  InputLabel,
  FormHelperText,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from '@mui/material';
import {
  AccountBalance as BankIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import api from '../../services/api';

export interface PSECheckoutProps {
  amount: number;
  currency?: string;
  description?: string;
  onSuccess: (result: PSEPaymentResult) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  customerEmail?: string;
  customerName?: string;
  redirectUrl?: string;
}

export interface PSEPaymentResult {
  transaction_id: number;
  reference: string;
  status: string;
  redirect_url: string;
  wompi_transaction_id: string;
}

interface PSEBank {
  financial_institution_code: string;
  financial_institution_name: string;
}

interface PSEFormData {
  bankCode: string;
  documentType: string;
  documentNumber: string;
  phone: string;
}

const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PP', label: 'Pasaporte' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
];

const PSECheckout: React.FC<PSECheckoutProps> = ({
  amount,
  currency = 'COP',
  description = 'Pago VeriHome',
  onSuccess,
  onError,
  onCancel,
  disabled = false,
  customerEmail,

  redirectUrl,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [banks, setBanks] = useState<PSEBank[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<PSEFormData>({
    bankCode: '',
    documentType: 'CC',
    documentNumber: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Partial<PSEFormData>>({});
  const [generalError, setGeneralError] = useState<string>('');

  const steps = ['Seleccionar Banco', 'Datos del Pagador', 'Confirmar'];

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      setLoadingBanks(true);

      const { data } = await api.get('/payments/pse/banks/');
      setBanks(data.banks || []);
    } catch (error) {
      setGeneralError('No se pudieron cargar los bancos. Intenta nuevamente.');
    } finally {
      setLoadingBanks(false);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<PSEFormData> = {};

    if (step === 0) {
      if (!formData.bankCode) {
        newErrors.bankCode = 'Selecciona tu banco';
      }
    } else if (step === 1) {
      if (!formData.documentNumber) {
        newErrors.documentNumber = 'Ingresa tu número de documento';
      } else if (formData.documentNumber.length < 5) {
        newErrors.documentNumber = 'Número de documento inválido';
      }

      if (!formData.phone) {
        newErrors.phone = 'Ingresa tu número de teléfono';
      } else if (!/^[0-9]{10}$/.test(formData.phone)) {
        newErrors.phone = 'Teléfono debe tener 10 dígitos';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      if (activeStep === steps.length - 1) {
        handleSubmit();
      } else {
        setActiveStep(prevStep => prevStep + 1);
      }
    }
  };

  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setGeneralError('');

      const payload = {
        amount: amount,
        payment_method: 'PSE',
        description: description,
        bank_code: formData.bankCode,
        document_type: formData.documentType,
        document_number: formData.documentNumber,
        phone: formData.phone,
        redirect_url:
          redirectUrl || `${window.location.origin}/payments/return`,
      };

      const { data } = await api.post('/payments/wompi/initiate/', payload);

      if (data.success && data.redirect_url) {
        // Call success callback
        onSuccess({
          transaction_id: data.transaction_id,
          reference: data.reference,
          status: data.status,
          redirect_url: data.redirect_url,
          wompi_transaction_id: data.wompi_transaction_id,
        });

        // Redirect to PSE bank
        window.location.href = data.redirect_url;
      } else {
        throw new Error(data.error || 'No se recibió URL de redirección');
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'Error al procesar el pago PSE';
      setGeneralError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography
              variant='h6'
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <BankIcon color='primary' />
              Selecciona tu Banco
            </Typography>
            <Typography variant='body2' color='text.secondary' gutterBottom>
              Serás redirigido a la página de tu banco para completar el pago de
              forma segura.
            </Typography>

            <FormControl fullWidth margin='normal' error={!!errors.bankCode}>
              <InputLabel>Banco *</InputLabel>
              <Select
                value={formData.bankCode}
                onChange={e =>
                  setFormData({ ...formData, bankCode: e.target.value })
                }
                label='Banco *'
                disabled={loadingBanks || disabled}
              >
                {loadingBanks ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Cargando bancos...
                  </MenuItem>
                ) : (
                  banks.map(bank => (
                    <MenuItem
                      key={bank.financial_institution_code}
                      value={bank.financial_institution_code}
                    >
                      {bank.financial_institution_name}
                    </MenuItem>
                  ))
                )}
              </Select>
              {errors.bankCode && (
                <FormHelperText>{errors.bankCode}</FormHelperText>
              )}
            </FormControl>

            <Alert severity='info' sx={{ mt: 2 }}>
              Asegúrate de tener habilitada la banca en línea con tu banco
            </Alert>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant='h6' gutterBottom>
              Información del Pagador
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth error={!!errors.documentType}>
                  <InputLabel>Tipo de Documento *</InputLabel>
                  <Select
                    value={formData.documentType}
                    onChange={e =>
                      setFormData({ ...formData, documentType: e.target.value })
                    }
                    label='Tipo de Documento *'
                    disabled={disabled}
                  >
                    {DOCUMENT_TYPES.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label='Número de Documento *'
                  value={formData.documentNumber}
                  onChange={e =>
                    setFormData({ ...formData, documentNumber: e.target.value })
                  }
                  error={!!errors.documentNumber}
                  helperText={errors.documentNumber}
                  disabled={disabled}
                  placeholder='Ej: 1234567890'
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label='Teléfono *'
                  value={formData.phone}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      phone: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  error={!!errors.phone}
                  helperText={errors.phone || 'Formato: 3001234567'}
                  disabled={disabled}
                  placeholder='3001234567'
                  inputProps={{ maxLength: 10 }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label='Email'
                  value={customerEmail || ''}
                  disabled
                  helperText='Email registrado en tu cuenta'
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 2: {
        const selectedBank = banks.find(
          b => b.financial_institution_code === formData.bankCode,
        );
        return (
          <Box>
            <Typography
              variant='h6'
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <CheckCircleIcon color='success' />
              Confirma tu Pago
            </Typography>

            <Card
              variant='outlined'
              sx={{ mt: 2, bgcolor: 'background.default' }}
            >
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant='body2' color='text.secondary'>
                      Monto a Pagar
                    </Typography>
                    <Typography variant='h5' color='primary' fontWeight='bold'>
                      {formatCurrency(amount)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant='body2' color='text.secondary'>
                      Banco
                    </Typography>
                    <Typography variant='body1' fontWeight='medium'>
                      {selectedBank?.financial_institution_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant='body2' color='text.secondary'>
                      Documento
                    </Typography>
                    <Typography variant='body1'>
                      {formData.documentType} {formData.documentNumber}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant='body2' color='text.secondary'>
                      Concepto
                    </Typography>
                    <Typography variant='body1'>{description}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Alert severity='warning' sx={{ mt: 2 }}>
              <Typography variant='body2' fontWeight='medium'>
                Serás redirigido a la página de tu banco
              </Typography>
              <Typography variant='caption'>
                No cierres esta ventana hasta completar el pago
              </Typography>
            </Alert>
          </Box>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <PaymentIcon color='primary' fontSize='large' />
          <Box>
            <Typography variant='h5' fontWeight='bold'>
              Pago PSE
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Pago seguro con tu banco
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {generalError && (
          <Alert
            severity='error'
            sx={{ mb: 3 }}
            onClose={() => setGeneralError('')}
          >
            {generalError}
          </Alert>
        )}

        {renderStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0 || loading}
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            Atrás
          </Button>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {onCancel && (
              <Button variant='outlined' onClick={onCancel} disabled={loading}>
                Cancelar
              </Button>
            )}

            <Button
              variant='contained'
              onClick={handleNext}
              disabled={disabled || loading || loadingBanks}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading
                ? 'Procesando...'
                : activeStep === steps.length - 1
                  ? 'Pagar'
                  : 'Siguiente'}
            </Button>
          </Box>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <SecurityIcon
            fontSize='small'
            color='action'
            sx={{ mr: 0.5, verticalAlign: 'middle' }}
          />
          <Typography variant='caption' color='text.secondary'>
            Conexión segura a través de Wompi
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PSECheckout;
