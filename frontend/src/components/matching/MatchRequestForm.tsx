import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  MenuItem,
  InputAdornment,
  Chip,
  Stack,
  Fade,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogContent,
  IconButton,
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  AttachMoney as MoneyIcon,
  Description as DescriptionIcon,
  DateRange as DateIcon,
  Pets as PetsIcon,
  CheckCircle as CheckIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';

// Interfaces exactas del backend
interface Property {
  id: string;
  title: string;
  rent_price: number;
  city: string;
  state: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  total_area: number;
  pets_allowed: boolean;
  landlord: {
    name: string;
    email: string;
  };
}

interface MatchRequestFormData {
  property: string;
  tenant_message: string;
  tenant_phone?: string;
  tenant_email?: string;
  monthly_income?: number;
  employment_type?: 'employed' | 'self_employed' | 'freelancer' | 'student' | 'retired' | 'unemployed' | 'other';
  preferred_move_in_date?: string;
  lease_duration_months: number;
  has_rental_references: boolean;
  has_employment_proof: boolean;
  has_credit_check: boolean;
  number_of_occupants: number;
  has_pets: boolean;
  pet_details?: string;
  smoking_allowed: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface MatchRequestFormProps {
  property: Property;
  open: boolean;
  onSubmit: (data: MatchRequestFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const MatchRequestForm: React.FC<MatchRequestFormProps> = ({
  property,
  open,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
  } = useForm<MatchRequestFormData>({
    defaultValues: {
      property: property.id,
      tenant_message: '',
      tenant_phone: '',
      tenant_email: '',
      monthly_income: undefined,
      employment_type: 'employed',
      preferred_move_in_date: '',
      lease_duration_months: 12,
      number_of_occupants: 1,
      has_rental_references: false,
      has_employment_proof: false,
      has_credit_check: false,
      has_pets: false,
      pet_details: '',
      smoking_allowed: false,
      priority: 'medium',
    },
  });

  const watchHasPets = watch('has_pets');
  const watchMonthlyIncome = watch('monthly_income');

  const steps = [
    { label: 'Información Personal', description: 'Datos básicos y contacto' },
    { label: 'Situación Financiera', description: 'Ingresos y empleo' },
    { label: 'Preferencias', description: 'Detalles de la solicitud' },
    { label: 'Mensaje', description: 'Carta de presentación' },
  ];

  const employmentTypes = [
    { value: 'employed', label: 'Empleado' },
    { value: 'self_employed', label: 'Independiente' },
    { value: 'freelancer', label: 'Freelancer' },
    { value: 'student', label: 'Estudiante' },
    { value: 'retired', label: 'Pensionado' },
    { value: 'unemployed', label: 'Desempleado' },
    { value: 'other', label: 'Otro' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Baja', description: 'Sin prisa' },
    { value: 'medium', label: 'Media', description: 'Tiempo normal' },
    { value: 'high', label: 'Alta', description: 'Urgente' },
    { value: 'urgent', label: 'Urgente', description: 'Necesidad inmediata' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getIncomeToRentRatio = () => {
    if (!watchMonthlyIncome || !property.rent_price) return null;
    return (watchMonthlyIncome / property.rent_price).toFixed(1);
  };

  const getIncomeRatioColor = () => {
    const ratio = parseFloat(getIncomeToRentRatio() || '0');
    if (ratio >= 3) return '#10b981'; // Verde
    if (ratio >= 2.5) return '#f59e0b'; // Amarillo
    return '#ef4444'; // Rojo
  };

  const getIncomeAdvice = () => {
    const ratio = parseFloat(getIncomeToRentRatio() || '0');
    if (ratio >= 3) return 'Excelente capacidad de pago';
    if (ratio >= 2.5) return 'Buena capacidad de pago';
    if (ratio >= 2) return 'Capacidad de pago aceptable';
    return 'Se recomienda tener ingresos 3 veces el valor del arriendo';
  };

  const handleStepNext = async () => {
    const isValid = await trigger();
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleStepBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onFormSubmit = async (data: MatchRequestFormData) => {
    try {
      await onSubmit(data);
      setSubmitStatus({
        type: 'success',
        message: '¡Solicitud enviada exitosamente! El arrendador será notificado.',
      });
    } catch (error: any) {
      setSubmitStatus({
        type: 'error',
        message: 'Error al enviar la solicitud. Por favor verifica los datos e intenta nuevamente.',
      });
      console.error('Error enviando solicitud de match:', error);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Información de Contacto
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="tenant_phone"
                control={control}
                rules={{
                  pattern: {
                    value: /^[+]?[\d\s\-()]{10,}$/,
                    message: 'Teléfono inválido',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Teléfono de contacto"
                    placeholder="+57 300 123 4567"
                    error={!!errors.tenant_phone}
                    helperText={errors.tenant_phone?.message || 'Opcional - Para contacto directo'}
                    disabled={isSubmitting}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: 'var(--color-text-secondary)' }} />
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
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="tenant_email"
                control={control}
                rules={{
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email inválido',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Email alternativo"
                    type="email"
                    placeholder="contacto@email.com"
                    error={!!errors.tenant_email}
                    helperText={errors.tenant_email?.message || 'Opcional - Si es diferente al de tu cuenta'}
                    disabled={isSubmitting}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 'var(--border-radius-md)',
                      },
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="number_of_occupants"
                control={control}
                rules={{
                  required: 'Número de ocupantes requerido',
                  min: { value: 1, message: 'Mínimo 1 ocupante' },
                  max: { value: 20, message: 'Máximo 20 ocupantes' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Número de ocupantes *"
                    type="number"
                    error={!!errors.number_of_occupants}
                    helperText={errors.number_of_occupants?.message}
                    disabled={isSubmitting}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 'var(--border-radius-md)',
                      },
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="preferred_move_in_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Fecha preferida de mudanza"
                    type="date"
                    error={!!errors.preferred_move_in_date}
                    helperText={errors.preferred_move_in_date?.message || 'Fecha ideal para mudarte'}
                    disabled={isSubmitting}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 'var(--border-radius-md)',
                      },
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="lease_duration_months"
                control={control}
                rules={{
                  required: 'Duración del contrato requerida',
                  min: { value: 1, message: 'Mínimo 1 mes' },
                  max: { value: 60, message: 'Máximo 60 meses' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Duración deseada del contrato (meses) *"
                    type="number"
                    error={!!errors.lease_duration_months}
                    helperText={errors.lease_duration_months?.message || 'Por cuánto tiempo planeas alquilar'}
                    disabled={isSubmitting}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 'var(--border-radius-md)',
                      },
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Situación Financiera
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="monthly_income"
                control={control}
                rules={{
                  min: { value: 0, message: 'Los ingresos no pueden ser negativos' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Ingresos mensuales"
                    type="number"
                    placeholder="2000000"
                    error={!!errors.monthly_income}
                    helperText={errors.monthly_income?.message || 'Tus ingresos mensuales brutos'}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      // Convert empty string to undefined, otherwise parse as number
                      const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                      field.onChange(value);
                    }}
                    value={field.value || ''}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MoneyIcon sx={{ color: 'var(--color-text-secondary)' }} />
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
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="employment_type"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    select
                    label="Tipo de empleo"
                    error={!!errors.employment_type}
                    helperText={errors.employment_type?.message || 'Tu situación laboral actual'}
                    disabled={isSubmitting}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 'var(--border-radius-md)',
                      },
                    }}
                  >
                    {employmentTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Income Analysis */}
            {watchMonthlyIncome && (
              <Grid item xs={12}>
                <Alert
                  severity={getIncomeToRentRatio() && parseFloat(getIncomeToRentRatio()!) >= 2.5 ? 'success' : 'warning'}
                  sx={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                    Análisis de Capacidad de Pago
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Relación ingresos/arriendo: <strong>{getIncomeToRentRatio()}x</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ color: getIncomeRatioColor() }}>
                    {getIncomeAdvice()}
                  </Typography>
                </Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Documentación y Referencias
              </Typography>
              
              <Stack spacing={2}>
                <Controller
                  name="has_rental_references"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          {...field}
                          checked={field.value}
                          disabled={isSubmitting}
                        />
                      }
                      label="Tengo referencias de alquileres anteriores"
                    />
                  )}
                />

                <Controller
                  name="has_employment_proof"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          {...field}
                          checked={field.value}
                          disabled={isSubmitting}
                        />
                      }
                      label="Tengo comprobantes de ingresos"
                    />
                  )}
                />

                <Controller
                  name="has_credit_check"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          {...field}
                          checked={field.value}
                          disabled={isSubmitting}
                        />
                      }
                      label="Autorizo verificación crediticia"
                    />
                  )}
                />
              </Stack>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Preferencias y Estilo de Vida
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Stack spacing={2}>
                <Controller
                  name="has_pets"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          {...field}
                          checked={field.value}
                          disabled={isSubmitting}
                        />
                      }
                      label="Tengo mascotas"
                    />
                  )}
                />

                <Controller
                  name="smoking_allowed"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          {...field}
                          checked={field.value}
                          disabled={isSubmitting}
                        />
                      }
                      label="Soy fumador"
                    />
                  )}
                />
              </Stack>
            </Grid>

            {watchHasPets && (
              <Grid item xs={12}>
                <Controller
                  name="pet_details"
                  control={control}
                  rules={{
                    required: watchHasPets ? 'Detalles de mascotas requeridos' : false,
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      multiline
                      rows={3}
                      label="Detalles de mascotas *"
                      placeholder="Describe tus mascotas: tipo, raza, tamaño, cantidad, vacunas, etc."
                      error={!!errors.pet_details}
                      helperText={errors.pet_details?.message}
                      disabled={isSubmitting}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 'var(--border-radius-md)',
                        },
                      }}
                    />
                  )}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Prioridad de la Solicitud
              </Typography>
              
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Box>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {priorityOptions.map((option) => (
                        <Chip
                          key={option.value}
                          label={option.label}
                          onClick={() => field.onChange(option.value)}
                          variant={field.value === option.value ? 'filled' : 'outlined'}
                          sx={{
                            backgroundColor: field.value === option.value ? 'var(--color-primary)' : 'transparent',
                            color: field.value === option.value ? 'white' : 'var(--color-text-primary)',
                            borderColor: 'var(--color-border)',
                            '&:hover': {
                              backgroundColor: field.value === option.value ? 'var(--color-primary-dark)' : 'var(--color-background)',
                            },
                          }}
                        />
                      ))}
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 1, color: 'var(--color-text-secondary)' }}>
                      {priorityOptions.find(p => p.value === field.value)?.description}
                    </Typography>
                  </Box>
                )}
              />
            </Grid>

            {/* Property Compatibility Check */}
            <Grid item xs={12}>
              <Alert
                severity={!property.pets_allowed && watchHasPets ? 'warning' : 'info'}
                sx={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  Compatibilidad con la Propiedad
                </Typography>
                {!property.pets_allowed && watchHasPets && (
                  <Typography variant="body2" sx={{ color: 'var(--color-warning)' }}>
                    ⚠️ Esta propiedad no permite mascotas
                  </Typography>
                )}
                {property.pets_allowed && watchHasPets && (
                  <Typography variant="body2" sx={{ color: 'var(--color-success)' }}>
                    ✅ Esta propiedad permite mascotas
                  </Typography>
                )}
              </Alert>
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Carta de Presentación
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="tenant_message"
                control={control}
                rules={{
                  required: 'El mensaje es requerido',
                  minLength: {
                    value: 10,
                    message: 'El mensaje debe tener al menos 10 caracteres',
                  },
                  maxLength: {
                    value: 1000,
                    message: 'El mensaje no puede exceder 1000 caracteres',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={8}
                    label="Mensaje para el arrendador *"
                    placeholder="Hola, estoy muy interesado en su propiedad. Me gustaría presentarme y contarle por qué sería un inquilino ideal...

Puedes incluir:
• Por qué te interesa esta propiedad específica
• Un poco sobre tu situación personal/familiar
• Tu historial como inquilino
• Cualquier información adicional relevante"
                    error={!!errors.tenant_message}
                    helperText={
                      errors.tenant_message?.message ||
                      `${field.value?.length || 0}/1000 caracteres - Presenta tu mejor perfil`
                    }
                    disabled={isSubmitting}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                          <DescriptionIcon sx={{ color: 'var(--color-text-secondary)' }} />
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
            </Grid>

            <Grid item xs={12}>
              <Alert
                severity="info"
                sx={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  💡 Consejos para tu mensaje:
                </Typography>
                <Typography variant="body2" component="div">
                  • Sé genuino y profesional<br />
                  • Menciona por qué te interesa esta propiedad específica<br />
                  • Destaca tu estabilidad financiera y laboral<br />
                  • Comparte referencias o experiencias positivas como inquilino<br />
                  • Mantén un tono respetuoso y amigable
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  if (submitStatus.type === 'success') {
    return (
      <Dialog
        open={open}
        onClose={onCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          }
        }}
      >
        <DialogContent sx={{ p: 4, textAlign: 'center' }}>
          <CheckIcon
            sx={{
              fontSize: 64,
              color: 'var(--color-success, #10b981)',
              mb: 2,
            }}
          />
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            ¡Solicitud Enviada!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: 'var(--color-text-secondary, #6b7280)' }}>
            {submitStatus.message}
          </Typography>
          <Button
            variant="contained"
            onClick={onCancel}
            sx={{
              backgroundColor: 'var(--color-primary, #3b82f6)',
              '&:hover': {
                backgroundColor: 'var(--color-primary-dark, #2563eb)',
              },
            }}
          >
            Cerrar
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        }
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <IconButton
          onClick={onCancel}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 1,
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            Solicitud de Match
          </Typography>
          <Typography variant="body1" sx={{ color: 'var(--color-text-secondary)' }}>
            Envía tu solicitud para: <strong>{property.title}</strong>
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
            {property.city}, {property.state} • {formatCurrency(property.rent_price)}/mes
          </Typography>
        </Box>

        {/* Progress Stepper */}
        <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                optional={
                  <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                    {step.description}
                  </Typography>
                }
              >
                {step.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Form Content */}
        <Box component="form" onSubmit={handleSubmit(onFormSubmit)}>
          <Fade in={true} key={currentStep}>
            <Box sx={{ minHeight: 400 }}>
              {renderStepContent(currentStep)}
            </Box>
          </Fade>

          {/* Status Alert */}
          {submitStatus.type === 'error' && (
            <Alert
              severity="error"
              sx={{
                mt: 3,
                borderRadius: 'var(--border-radius-md)',
              }}
            >
              {submitStatus.message}
            </Alert>
          )}

          {/* Navigation */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Box>
              {currentStep > 0 && (
                <Button
                  variant="outlined"
                  startIcon={<BackIcon />}
                  onClick={handleStepBack}
                  disabled={isSubmitting}
                  sx={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    '&:hover': {
                      borderColor: 'var(--color-primary)',
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  Anterior
                </Button>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={isSubmitting}
                sx={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  '&:hover': {
                    borderColor: 'var(--color-error)',
                    color: 'var(--color-error)',
                  },
                }}
              >
                Cancelar
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button
                  variant="contained"
                  endIcon={<ForwardIcon />}
                  onClick={handleStepNext}
                  disabled={isSubmitting}
                  sx={{
                    backgroundColor: 'var(--color-primary)',
                    '&:hover': {
                      backgroundColor: 'var(--color-primary-dark)',
                    },
                  }}
                >
                  Siguiente
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={
                    isSubmitting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <SendIcon />
                    )
                  }
                  disabled={isSubmitting}
                  sx={{
                    backgroundColor: 'var(--color-primary)',
                    '&:hover': {
                      backgroundColor: 'var(--color-primary-dark)',
                    },
                  }}
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default MatchRequestForm;