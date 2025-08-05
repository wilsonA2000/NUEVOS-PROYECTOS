import React, { useState, useCallback, useEffect } from 'react';
import {
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  InputAdornment,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Check as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { debounce } from 'lodash';

interface InterviewCodeData {
  interview_code: string;
  candidate_name: string;
  candidate_email: string;
  approved_user_type: string;
  interview_rating: number;
  status: string;
  expires_at: string;
  is_approved: boolean;
}

interface InterviewCodeValidatorProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange: (isValid: boolean, codeData?: InterviewCodeData) => void;
  error?: string;
  disabled?: boolean;
}

const InterviewCodeValidator: React.FC<InterviewCodeValidatorProps> = ({
  value,
  onChange,
  onValidationChange,
  error,
  disabled = false
}) => {
  const [validating, setValidating] = useState(false);
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    message: string;
    codeData?: InterviewCodeData;
  }>({ isValid: false, message: '' });

  // Función para validar el código con el backend
  const validateCode = async (code: string) => {
    if (!code || code.length < 8) {
      setValidationState({ isValid: false, message: '' });
      onValidationChange(false);
      return;
    }

    try {
      setValidating(true);
      const response = await fetch('/api/v1/auth/validate-interview-code/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interview_code: code })
      });

      const data = await response.json();

      if (response.ok && data.is_valid) {
        setValidationState({
          isValid: true,
          message: 'Código válido',
          codeData: data.code_data
        });
        onValidationChange(true, data.code_data);
      } else {
        setValidationState({
          isValid: false,
          message: data.message || 'Código inválido',
        });
        onValidationChange(false);
      }
    } catch (error) {
      console.error('Error validating interview code:', error);
      setValidationState({
        isValid: false,
        message: 'Error de conexión. Intente nuevamente.',
      });
      onValidationChange(false);
    } finally {
      setValidating(false);
    }
  };

  // Debounce para evitar demasiadas llamadas al API
  const debouncedValidate = useCallback(
    debounce((code: string) => {
      validateCode(code);
    }, 500),
    []
  );

  useEffect(() => {
    if (value) {
      debouncedValidate(value);
    } else {
      setValidationState({ isValid: false, message: '' });
      onValidationChange(false);
    }

    return () => {
      debouncedValidate.cancel();
    };
  }, [value, debouncedValidate, onValidationChange]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    onChange(newValue);
  };

  const formatCodeDisplay = (code: string) => {
    // Formato: VH-XXXX-YYYY
    if (code.length <= 2) return code;
    if (code.length <= 7) return `${code.slice(0, 2)}-${code.slice(2)}`;
    return `${code.slice(0, 2)}-${code.slice(2, 6)}-${code.slice(6)}`;
  };

  const getValidationIcon = () => {
    if (validating) {
      return <CircularProgress size={20} />;
    }
    if (validationState.isValid) {
      return <CheckIcon color="success" />;
    }
    if (validationState.message && !validationState.isValid) {
      return <ErrorIcon color="error" />;
    }
    return <SecurityIcon color="action" />;
  };

  const getValidationColor = () => {
    if (validationState.isValid) return 'success';
    if (validationState.message && !validationState.isValid) return 'error';
    return 'primary';
  };

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'landlord':
        return 'Arrendador';
      case 'tenant':
        return 'Arrendatario';
      case 'service_provider':
        return 'Prestador de Servicios';
      default:
        return userType;
    }
  };

  const getRatingStars = (rating: number) => {
    return '⭐'.repeat(rating);
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  return (
    <Box>
      <TextField
        fullWidth
        label="Código de Entrevista"
        value={formatCodeDisplay(value)}
        onChange={handleInputChange}
        error={!!error || (validationState.message && !validationState.isValid)}
        helperText={
          error || 
          validationState.message || 
          'Ingrese el código único proporcionado después de su entrevista'
        }
        disabled={disabled}
        placeholder="VH-XXXX-YYYY"
        inputProps={{
          maxLength: 12,
          style: { 
            textTransform: 'uppercase',
            fontSize: '1.1rem',
            fontFamily: 'monospace',
            letterSpacing: '0.1em'
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              {getValidationIcon()}
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="Revalidar código">
                <IconButton
                  onClick={() => validateCode(value)}
                  disabled={!value || validating}
                  size="small"
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          )
        }}
        color={getValidationColor() as any}
        focused={validationState.isValid}
      />

      {/* Información del código válido */}
      {validationState.isValid && validationState.codeData && (
        <Card sx={{ mt: 2, border: '1px solid', borderColor: 'success.main' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h6" color="success.main">
                Código Verificado
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip
                label={`Tipo: ${getUserTypeLabel(validationState.codeData.approved_user_type)}`}
                color="primary"
                size="small"
              />
              <Chip
                label={`Calificación: ${getRatingStars(validationState.codeData.interview_rating)} (${validationState.codeData.interview_rating}/10)`}
                color="success"
                size="small"
              />
              <Chip
                label={validationState.codeData.status.toUpperCase()}
                color="info"
                size="small"
              />
            </Box>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Candidato:</strong> {validationState.codeData.candidate_name}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Email asociado:</strong> {validationState.codeData.candidate_email}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Expira:</strong> {new Date(validationState.codeData.expires_at).toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Typography>

            {isExpiringSoon(validationState.codeData.expires_at) && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  ⚠️ Este código expira pronto. Complete su registro lo antes posible.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Información sobre el proceso */}
      {!value && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <InfoIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            <strong>¿No tienes un código?</strong> Primero debes contactarnos y completar 
            una entrevista. El código será enviado por correo electrónico si eres aprobado.
          </Typography>
        </Alert>
      )}

      {/* Estados de validación */}
      {validating && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <CircularProgress size={16} sx={{ mr: 1 }} />
          <Typography variant="caption" color="text.secondary">
            Validando código...
          </Typography>
        </Box>
      )}

      {/* Ayuda sobre el formato */}
      {value && value.length > 0 && value.length < 8 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          El código debe tener el formato: VH-XXXX-YYYY (12 caracteres)
        </Typography>
      )}
    </Box>
  );
};

export default InterviewCodeValidator;