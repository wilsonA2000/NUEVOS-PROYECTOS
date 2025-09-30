import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Card,
  CardContent,
  Chip,
  Fade,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Verified as VerifiedIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Business as BusinessIcon,
  Home as HomeIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { api } from '../../services/api';

interface InterviewCodeData {
  interview_code: string;
}

// Estructura exacta del backend
interface ValidationResult {
  is_valid: boolean;
  message: string;
  code_data?: {
    code: string;
    user_type: 'landlord' | 'tenant' | 'service_provider';
    email: string;
    is_active: boolean;
    valid_until: string | null;
  };
}

interface InterviewCodeValidatorProps {
  onValidCode?: (result: ValidationResult) => void;
  onInvalidCode?: (error: string) => void;
  compact?: boolean;
}

const InterviewCodeValidator: React.FC<InterviewCodeValidatorProps> = ({
  onValidCode,
  onInvalidCode,
  compact = false,
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    type: 'success' | 'error' | null;
    data: ValidationResult | null;
    message: string;
  }>({ type: null, data: null, message: '' });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<InterviewCodeData>();

  const watchCode = watch('interview_code');

  const validateCode = async (data: InterviewCodeData) => {
    setIsValidating(true);
    setValidationResult({ type: null, data: null, message: '' });

    try {
      const response = await api.post('/users/auth/validate-interview-code/', {
        interview_code: data.interview_code.toUpperCase(),
      });

      const result: ValidationResult = response.data;

      setValidationResult({
        type: 'success',
        data: result,
        message: result.message,
      });

      // Callback para código válido
      if (onValidCode) {
        onValidCode(result);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          'Código de entrevista inválido o expirado';
      
      setValidationResult({
        type: 'error',
        data: null,
        message: errorMessage,
      });

      // Callback para código inválido
      if (onInvalidCode) {
        onInvalidCode(errorMessage);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const clearValidation = () => {
    setValidationResult({ type: null, data: null, message: '' });
    reset();
  };

  const getUserTypeConfig = (userType: string) => {
    switch (userType) {
      case 'landlord':
        return {
          icon: <BusinessIcon />,
          label: 'Arrendador',
          color: '#2563eb' as const,
          bgColor: '#eff6ff' as const,
        };
      case 'tenant':
        return {
          icon: <HomeIcon />,
          label: 'Arrendatario',
          color: '#059669' as const,
          bgColor: '#ecfdf5' as const,
        };
      case 'service_provider':
        return {
          icon: <BuildIcon />,
          label: 'Prestador de Servicios',
          color: '#dc2626' as const,
          bgColor: '#fef2f2' as const,
        };
      default:
        return {
          icon: <VerifiedIcon />,
          label: userType,
          color: '#6b7280' as const,
          bgColor: '#f9fafb' as const,
        };
    }
  };

  // Formatear código: 8 caracteres alfanuméricos (BACKEND REAL)
  const formatCode = (value: string) => {
    return value
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase()
      .substring(0, 8); // Backend usa max_length=10, pero genera 8 caracteres
  };

  if (compact) {
    return (
      <Box sx={{ width: '100%' }}>
        <Controller
          name="interview_code"
          control={control}
          rules={{
            required: 'Código requerido',
            minLength: { value: 8, message: 'El código debe tener 8 caracteres' },
            maxLength: { value: 8, message: 'El código debe tener 8 caracteres' },
            pattern: {
              value: /^[A-Z0-9]{8}$/,
              message: 'Solo letras y números (8 caracteres)',
            },
          }}
          render={({ field: { onChange, value, ...field } }) => (
            <TextField
              {...field}
              value={value || ''}
              onChange={(e) => onChange(formatCode(e.target.value))}
              fullWidth
              size="small"
              label="Código de entrevista"
              placeholder="ABCD1234"
              error={!!errors.interview_code}
              helperText={errors.interview_code?.message}
              disabled={isValidating}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleSubmit(validateCode)}
                      disabled={isValidating || !watchCode || watchCode.length !== 8}
                      size="small"
                    >
                      {isValidating ? (
                        <CircularProgress size={16} />
                      ) : (
                        <SearchIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 'var(--border-radius-md)',
                },
              }}
            />
          )}
        />

        {validationResult.type && (
          <Fade in={true}>
            <Alert 
              severity={validationResult.type}
              size="small"
              sx={{ mt: 1, borderRadius: 'var(--border-radius-sm)' }}
            >
              {validationResult.message}
            </Alert>
          </Fade>
        )}
      </Box>
    );
  }

  return (
    <Card 
      elevation={0}
      sx={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius-lg)',
      }}
    >
      <CardContent sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <VerifiedIcon 
            sx={{ 
              fontSize: 48, 
              color: 'var(--color-primary)',
              mb: 2,
            }} 
          />
          <Typography 
            variant="h5" 
            component="h2"
            sx={{
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              mb: 1,
            }}
          >
            Validar Código de Entrevista
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'var(--color-text-secondary)',
              maxWidth: 400,
              mx: 'auto',
            }}
          >
            Ingresa tu código de entrevista de 8 caracteres para verificar tu elegibilidad.
          </Typography>
        </Box>

        {/* Formulario */}
        <Box component="form" onSubmit={handleSubmit(validateCode)}>
          <Box sx={{ mb: 3 }}>
            <Controller
              name="interview_code"
              control={control}
              rules={{
                required: 'El código de entrevista es requerido',
                minLength: { value: 8, message: 'El código debe tener exactamente 8 caracteres' },
                maxLength: { value: 8, message: 'El código debe tener exactamente 8 caracteres' },
                pattern: {
                  value: /^[A-Z0-9]{8}$/,
                  message: 'Solo letras mayúsculas y números (8 caracteres)',
                },
              }}
              render={({ field: { onChange, value, ...field } }) => (
                <TextField
                  {...field}
                  value={value || ''}
                  onChange={(e) => onChange(formatCode(e.target.value))}
                  fullWidth
                  label="Código de entrevista *"
                  placeholder="ABCD1234"
                  error={!!errors.interview_code}
                  helperText={errors.interview_code?.message || 'Formato: 8 caracteres alfanuméricos'}
                  disabled={isValidating}
                  InputProps={{
                    endAdornment: validationResult.type && (
                      <InputAdornment position="end">
                        <IconButton onClick={clearValidation} size="small">
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                    style: {
                      fontSize: '1.2rem',
                      letterSpacing: '0.1em',
                      fontFamily: 'monospace',
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 'var(--border-radius-md)',
                      backgroundColor: 'var(--color-background)',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'var(--color-primary)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'var(--color-primary)',
                      },
                    },
                  }}
                />
              )}
            />
          </Box>

          {/* Status Alert */}
          {validationResult.type && (
            <Box sx={{ mb: 3 }}>
              <Fade in={true}>
                <Alert 
                  severity={validationResult.type}
                  sx={{
                    borderRadius: 'var(--border-radius-md)',
                    '& .MuiAlert-icon': {
                      fontSize: '1.5rem',
                    },
                  }}
                  icon={validationResult.type === 'success' ? <VerifiedIcon /> : <CancelIcon />}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {validationResult.message}
                  </Typography>

                  {/* Información adicional para códigos válidos */}
                  {validationResult.type === 'success' && validationResult.data?.code_data && (
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Tipo de usuario:
                        </Typography>
                        <Chip
                          icon={getUserTypeConfig(validationResult.data.code_data.user_type).icon}
                          label={getUserTypeConfig(validationResult.data.code_data.user_type).label}
                          size="small"
                          sx={{
                            backgroundColor: getUserTypeConfig(validationResult.data.code_data.user_type).bgColor,
                            color: getUserTypeConfig(validationResult.data.code_data.user_type).color,
                            fontWeight: 500,
                          }}
                        />
                      </Box>
                      
                      {validationResult.data.code_data.email && (
                        <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                          Email autorizado: {validationResult.data.code_data.email}
                        </Typography>
                      )}
                      
                      {validationResult.data.code_data.valid_until && (
                        <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                          Válido hasta: {new Date(validationResult.data.code_data.valid_until).toLocaleDateString('es-ES')}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Alert>
              </Fade>
            </Box>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={isValidating || !watchCode || watchCode.length !== 8}
            startIcon={
              isValidating ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SearchIcon />
              )
            }
            sx={{
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
              borderRadius: 'var(--border-radius-md)',
              background: 'var(--color-primary)',
              boxShadow: 'var(--shadow-md)',
              textTransform: 'none',
              '&:hover': {
                background: 'var(--color-primary-dark)',
                boxShadow: 'var(--shadow-lg)',
                transform: 'translateY(-1px)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
              '&:disabled': {
                background: 'var(--color-muted)',
                color: 'var(--color-text-muted)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {isValidating ? 'Validando código...' : 'Validar código'}
          </Button>
        </Box>

        {/* Info adicional */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem',
            }}
          >
            ¿No tienes un código? Contacta con nuestro equipo para solicitar una entrevista.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default InterviewCodeValidator;