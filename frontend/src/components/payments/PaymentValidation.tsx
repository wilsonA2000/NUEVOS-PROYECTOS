import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  Chip,
  LinearProgress,
  FormHelperText,
  InputAdornment,
  Grid,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { stripeService } from '../../services/stripeService';

export interface CardValidationState {
  number: {
    value: string;
    isValid: boolean;
    brand?: string;
    error?: string;
  };
  expiry: {
    value: string;
    isValid: boolean;
    error?: string;
  };
  cvc: {
    value: string;
    isValid: boolean;
    error?: string;
  };
  name: {
    value: string;
    isValid: boolean;
    error?: string;
  };
  zip: {
    value: string;
    isValid: boolean;
    error?: string;
  };
}

export interface PaymentValidationProps {
  onValidationChange: (isValid: boolean, data: CardValidationState) => void;
  disabled?: boolean;
  initialData?: Partial<CardValidationState>;
}

export const PaymentValidation: React.FC<PaymentValidationProps> = ({
  onValidationChange,
  disabled = false,
  initialData,
}) => {
  const [validationState, setValidationState] = useState<CardValidationState>({
    number: { value: '', isValid: false },
    expiry: { value: '', isValid: false },
    cvc: { value: '', isValid: false },
    name: { value: '', isValid: false },
    zip: { value: '', isValid: false },
    ...initialData,
  });

  const [overallScore, setOverallScore] = useState(0);
  const [securityLevel, setSecurityLevel] = useState<'low' | 'medium' | 'high'>('low');

  // Validar número de tarjeta
  const validateCardNumber = (number: string): { isValid: boolean; brand?: string; error?: string } => {
    if (!number) {
      return { isValid: false, error: 'Número de tarjeta requerido' };
    }

    // Usar el servicio de Stripe para validación
    const validation = stripeService.validateCardNumber(number);
    
    if (!validation.isValid) {
      return { isValid: false, error: 'Número de tarjeta inválido' };
    }

    // Validar longitud según la marca
    const cleanNumber = number.replace(/\D/g, '');
    if (validation.brand === 'amex' && cleanNumber.length !== 15) {
      return { isValid: false, brand: validation.brand, error: 'American Express debe tener 15 dígitos' };
    } else if (validation.brand !== 'amex' && cleanNumber.length !== 16) {
      return { isValid: false, brand: validation.brand, error: 'La tarjeta debe tener 16 dígitos' };
    }

    return { isValid: true, brand: validation.brand };
  };

  // Validar fecha de vencimiento
  const validateExpiry = (expiry: string): { isValid: boolean; error?: string } => {
    if (!expiry) {
      return { isValid: false, error: 'Fecha de vencimiento requerida' };
    }

    const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    if (!regex.test(expiry)) {
      return { isValid: false, error: 'Formato inválido (MM/YY)' };
    }

    const [month, year] = expiry.split('/');
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;

    const expiryYear = parseInt(year);
    const expiryMonth = parseInt(month);

    if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
      return { isValid: false, error: 'Tarjeta vencida' };
    }

    if (expiryYear > currentYear + 10) {
      return { isValid: false, error: 'Fecha muy lejana en el futuro' };
    }

    return { isValid: true };
  };

  // Validar CVC
  const validateCVC = (cvc: string, brand?: string): { isValid: boolean; error?: string } => {
    if (!cvc) {
      return { isValid: false, error: 'CVC requerido' };
    }

    const cleanCVC = cvc.replace(/\D/g, '');
    
    if (brand === 'amex' && cleanCVC.length !== 4) {
      return { isValid: false, error: 'American Express requiere 4 dígitos' };
    } else if (brand !== 'amex' && cleanCVC.length !== 3) {
      return { isValid: false, error: 'CVC debe tener 3 dígitos' };
    }

    return { isValid: true };
  };

  // Validar nombre del titular
  const validateName = (name: string): { isValid: boolean; error?: string } => {
    if (!name) {
      return { isValid: false, error: 'Nombre del titular requerido' };
    }

    if (name.length < 2) {
      return { isValid: false, error: 'Nombre muy corto' };
    }

    if (name.length > 50) {
      return { isValid: false, error: 'Nombre muy largo' };
    }

    const regex = /^[a-zA-ZÀ-ÿ\s]+$/;
    if (!regex.test(name)) {
      return { isValid: false, error: 'Solo se permiten letras' };
    }

    return { isValid: true };
  };

  // Validar código postal
  const validateZip = (zip: string): { isValid: boolean; error?: string } => {
    if (!zip) {
      return { isValid: false, error: 'Código postal requerido' };
    }

    // Validar para diferentes formatos (US, CA, UK, etc.)
    const usZip = /^\d{5}(-\d{4})?$/;
    const caZip = /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/;
    const ukZip = /^[A-Za-z]{1,2}\d[A-Za-z\d]? \d[A-Za-z]{2}$/;
    const generalZip = /^[\d\w\s-]{3,10}$/;

    if (usZip.test(zip) || caZip.test(zip) || ukZip.test(zip) || generalZip.test(zip)) {
      return { isValid: true };
    }

    return { isValid: false, error: 'Código postal inválido' };
  };

  // Formatear número de tarjeta
  const formatCardNumber = (value: string): string => {
    return stripeService.formatCardNumber(value);
  };

  // Formatear fecha de vencimiento
  const formatExpiry = (value: string): string => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length >= 3) {
      return `${cleanValue.slice(0, 2)}/${cleanValue.slice(2, 4)}`;
    }
    return cleanValue;
  };

  // Formatear CVC
  const formatCVC = (value: string): string => {
    return value.replace(/\D/g, '').slice(0, 4);
  };

  // Manejar cambios en los campos
  const handleFieldChange = (field: keyof CardValidationState, value: string) => {
    let formattedValue = value;
    let validation: { isValid: boolean; brand?: string; error?: string } = { isValid: false };

    switch (field) {
      case 'number':
        formattedValue = formatCardNumber(value);
        validation = validateCardNumber(formattedValue);
        break;
      case 'expiry':
        formattedValue = formatExpiry(value);
        validation = validateExpiry(formattedValue);
        break;
      case 'cvc':
        formattedValue = formatCVC(value);
        validation = validateCVC(formattedValue, validationState.number.brand);
        break;
      case 'name':
        validation = validateName(value);
        break;
      case 'zip':
        validation = validateZip(value);
        break;
    }

    const newState = {
      ...validationState,
      [field]: {
        value: formattedValue,
        isValid: validation.isValid,
        brand: validation.brand,
        error: validation.error,
      },
    };

    setValidationState(newState);
  };

  // Calcular puntuación de seguridad
  useEffect(() => {
    const fields = Object.values(validationState);
    const validFields = fields.filter(field => field.isValid).length;
    const totalFields = fields.length;
    const score = (validFields / totalFields) * 100;
    
    setOverallScore(score);
    
    if (score >= 80) {
      setSecurityLevel('high');
    } else if (score >= 50) {
      setSecurityLevel('medium');
    } else {
      setSecurityLevel('low');
    }

    // Notificar al componente padre
    const isOverallValid = validFields === totalFields;
    onValidationChange(isOverallValid, validationState);
  }, [validationState, onValidationChange]);

  // Obtener icono de marca de tarjeta
  const getBrandIcon = (brand?: string) => {
    switch (brand) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      case 'discover':
        return '💳';
      default:
        return <CreditCardIcon />;
    }
  };

  // Obtener color de seguridad
  const getSecurityColor = () => {
    switch (securityLevel) {
      case 'high':
        return 'success';
      case 'medium':
        return 'warning';
      default:
        return 'error';
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <SecurityIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Validación de Tarjeta</Typography>
        </Box>

        {/* Indicador de seguridad */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="body2">Nivel de Seguridad</Typography>
            <Chip
              size="small"
              label={`${securityLevel.toUpperCase()} (${Math.round(overallScore)}%)`}
              color={getSecurityColor()}
              icon={
                securityLevel === 'high' ? <CheckCircleIcon /> :
                securityLevel === 'medium' ? <WarningIcon /> : <ErrorIcon />
              }
            />
          </Box>
          <LinearProgress
            variant="determinate"
            value={overallScore}
            color={getSecurityColor()}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Grid container spacing={3}>
          {/* Número de tarjeta */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Número de Tarjeta"
              value={validationState.number.value}
              onChange={(e) => handleFieldChange('number', e.target.value)}
              disabled={disabled}
              error={!!validationState.number.error}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {getBrandIcon(validationState.number.brand)}
                  </InputAdornment>
                ),
                endAdornment: validationState.number.isValid && (
                  <InputAdornment position="end">
                    <CheckCircleIcon color="success" />
                  </InputAdornment>
                ),
              }}
              placeholder="1234 5678 9012 3456"
              inputProps={{ maxLength: 19 }}
            />
            {validationState.number.error && (
              <FormHelperText error>{validationState.number.error}</FormHelperText>
            )}
            {validationState.number.brand && !validationState.number.error && (
              <FormHelperText>
                {validationState.number.brand.toUpperCase()} detectada
              </FormHelperText>
            )}
          </Grid>

          {/* Fecha de vencimiento */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Fecha de Vencimiento"
              value={validationState.expiry.value}
              onChange={(e) => handleFieldChange('expiry', e.target.value)}
              disabled={disabled}
              error={!!validationState.expiry.error}
              InputProps={{
                endAdornment: validationState.expiry.isValid && (
                  <InputAdornment position="end">
                    <CheckCircleIcon color="success" />
                  </InputAdornment>
                ),
              }}
              placeholder="MM/YY"
              inputProps={{ maxLength: 5 }}
            />
            {validationState.expiry.error && (
              <FormHelperText error>{validationState.expiry.error}</FormHelperText>
            )}
          </Grid>

          {/* CVC */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="CVC"
              value={validationState.cvc.value}
              onChange={(e) => handleFieldChange('cvc', e.target.value)}
              disabled={disabled}
              error={!!validationState.cvc.error}
              InputProps={{
                endAdornment: validationState.cvc.isValid && (
                  <InputAdornment position="end">
                    <CheckCircleIcon color="success" />
                  </InputAdornment>
                ),
              }}
              placeholder={validationState.number.brand === 'amex' ? '1234' : '123'}
              inputProps={{ maxLength: 4 }}
            />
            {validationState.cvc.error && (
              <FormHelperText error>{validationState.cvc.error}</FormHelperText>
            )}
          </Grid>

          {/* Nombre del titular */}
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="Nombre del Titular"
              value={validationState.name.value}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              disabled={disabled}
              error={!!validationState.name.error}
              InputProps={{
                endAdornment: validationState.name.isValid && (
                  <InputAdornment position="end">
                    <CheckCircleIcon color="success" />
                  </InputAdornment>
                ),
              }}
              placeholder="Juan Pérez"
            />
            {validationState.name.error && (
              <FormHelperText error>{validationState.name.error}</FormHelperText>
            )}
          </Grid>

          {/* Código postal */}
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Código Postal"
              value={validationState.zip.value}
              onChange={(e) => handleFieldChange('zip', e.target.value)}
              disabled={disabled}
              error={!!validationState.zip.error}
              InputProps={{
                endAdornment: validationState.zip.isValid && (
                  <InputAdornment position="end">
                    <CheckCircleIcon color="success" />
                  </InputAdornment>
                ),
              }}
              placeholder="12345"
            />
            {validationState.zip.error && (
              <FormHelperText error>{validationState.zip.error}</FormHelperText>
            )}
          </Grid>
        </Grid>

        {/* Alertas de seguridad */}
        <Box sx={{ mt: 3 }}>
          {securityLevel === 'low' && (
            <Alert severity="error">
              <Typography variant="body2">
                Complete todos los campos para proceder con el pago
              </Typography>
            </Alert>
          )}
          {securityLevel === 'medium' && (
            <Alert severity="warning">
              <Typography variant="body2">
                Verifique que todos los datos sean correctos
              </Typography>
            </Alert>
          )}
          {securityLevel === 'high' && (
            <Alert severity="success">
              <Typography variant="body2">
                ✅ Datos validados correctamente. Puede proceder con el pago.
              </Typography>
            </Alert>
          )}
        </Box>

        {/* Información de seguridad */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            🔒 Sus datos están protegidos con encriptación SSL de 256 bits y no se almacenan en nuestros servidores
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};