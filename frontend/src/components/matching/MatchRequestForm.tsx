import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Grid,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Card,
  CardContent,
  InputAdornment
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
  Home as HomeIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  Pets as PetsIcon,
  SmokingRooms as SmokingIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';

interface MatchRequestFormProps {
  open: boolean;
  onClose: () => void;
  property: Property;
  onSubmit: (data: MatchRequestData) => Promise<void>;
  isLoading?: boolean;
}

interface Property {
  id: string;
  title: string;
  rent_price: number;
  city: string;
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

interface MatchRequestData {
  property: string;
  tenant_message: string;
  tenant_phone: string;
  tenant_email: string;
  monthly_income: number;
  employment_type: string;
  preferred_move_in_date: string;
  lease_duration_months: number;
  has_rental_references: boolean;
  has_employment_proof: boolean;
  has_credit_check: boolean;
  number_of_occupants: number;
  has_pets: boolean;
  pet_details: string;
  smoking_allowed: boolean;
  priority: string;
}

const MatchRequestForm: React.FC<MatchRequestFormProps> = ({
  open,
  onClose,
  property,
  onSubmit,
  isLoading = false
}) => {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [estimatedScore, setEstimatedScore] = useState(0);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset
  } = useForm<MatchRequestData>({
    defaultValues: {
      property: property.id,
      tenant_message: '',
      tenant_phone: '',
      tenant_email: '',
      monthly_income: 0,
      employment_type: 'employed',
      preferred_move_in_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lease_duration_months: 12,
      has_rental_references: false,
      has_employment_proof: false,
      has_credit_check: false,
      number_of_occupants: 1,
      has_pets: false,
      pet_details: '',
      smoking_allowed: false,
      priority: 'medium'
    }
  });

  const watchedValues = watch();

  // Calcular puntaje estimado en tiempo real
  React.useEffect(() => {
    calculateEstimatedScore();
  }, [watchedValues]);

  const calculateEstimatedScore = () => {
    let score = 0;

    // Ingresos vs renta (30 puntos)
    if (watchedValues.monthly_income && property.rent_price) {
      const incomeRatio = watchedValues.monthly_income / property.rent_price;
      if (incomeRatio >= 4) score += 30;
      else if (incomeRatio >= 3) score += 25;
      else if (incomeRatio >= 2.5) score += 20;
      else if (incomeRatio >= 2) score += 15;
    }

    // Referencias y documentos (25 puntos)
    if (watchedValues.has_rental_references) score += 10;
    if (watchedValues.has_employment_proof) score += 10;
    if (watchedValues.has_credit_check) score += 5;

    // Mascotas compatibilidad (15 puntos)
    if (watchedValues.has_pets === property.pets_allowed) score += 15;
    else if (!watchedValues.has_pets) score += 10;

    // Duración del contrato (10 puntos)
    if (watchedValues.lease_duration_months >= 6 && watchedValues.lease_duration_months <= 24) {
      score += 10;
    }

    // Mensaje personalizado (10 puntos)
    if (watchedValues.tenant_message.length > 100) score += 10;
    else if (watchedValues.tenant_message.length > 50) score += 5;

    // Empleo estable (10 puntos)
    if (['employed', 'self_employed'].includes(watchedValues.employment_type)) {
      score += 10;
    }

    setEstimatedScore(Math.min(score, 100));
  };

  const handleFormSubmit = async (data: MatchRequestData) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (error) {
      console.error('Error enviando solicitud de match:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelente compatibilidad';
    if (score >= 60) return 'Buena compatibilidad';
    if (score >= 40) return 'Compatibilidad moderada';
    return 'Baja compatibilidad';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1 }}>
        <SendIcon sx={{ mr: 1 }} />
        Enviar Solicitud de Match
      </DialogTitle>

      <DialogContent sx={{ px: 3 }}>
        {/* Información de la propiedad */}
        <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <HomeIcon sx={{ mr: 1 }} />
              <Typography variant="h6">{property.title}</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2">
                  <strong>Precio:</strong> ${property.rent_price?.toLocaleString()}/mes
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2">
                  <strong>Ubicación:</strong> {property.city}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2">
                  <strong>Habitaciones:</strong> {property.bedrooms}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2">
                  <strong>Área:</strong> {property.total_area}m²
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Puntaje de compatibilidad estimado */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Chip
            icon={<StarIcon />}
            label={`${estimatedScore}% - ${getScoreLabel(estimatedScore)}`}
            color={getScoreColor(estimatedScore) as any}
            size="large"
            sx={{ fontSize: '1rem', py: 2 }}
          />
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Puntaje estimado de compatibilidad
          </Typography>
        </Box>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Grid container spacing={3}>
            {/* Mensaje personalizado */}
            <Grid item xs={12}>
              <Controller
                name="tenant_message"
                control={control}
                rules={{ 
                  required: 'El mensaje es requerido',
                  minLength: { value: 10, message: 'El mensaje debe tener al menos 10 caracteres' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={4}
                    label="Mensaje para el arrendador"
                    placeholder="Cuéntale al arrendador por qué estás interesado en esta propiedad..."
                    error={!!errors.tenant_message}
                    helperText={errors.tenant_message?.message || `${field.value.length}/1000 caracteres`}
                    inputProps={{ maxLength: 1000 }}
                  />
                )}
              />
            </Grid>

            {/* Información de contacto */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="tenant_phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Teléfono de contacto"
                    placeholder="Ej: +57 300 123 4567"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">📞</InputAdornment>
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="tenant_email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="email"
                    label="Email de contacto"
                    placeholder="email@ejemplo.com"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">📧</InputAdornment>
                    }}
                  />
                )}
              />
            </Grid>

            {/* Información financiera */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="monthly_income"
                control={control}
                rules={{ 
                  required: 'Los ingresos mensuales son requeridos',
                  min: { value: 0, message: 'Los ingresos no pueden ser negativos' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Ingresos mensuales"
                    error={!!errors.monthly_income}
                    helperText={errors.monthly_income?.message}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><MoneyIcon /></InputAdornment>
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
                  <FormControl fullWidth>
                    <InputLabel>Tipo de empleo</InputLabel>
                    <Select {...field} label="Tipo de empleo">
                      <MenuItem value="employed">Empleado</MenuItem>
                      <MenuItem value="self_employed">Independiente</MenuItem>
                      <MenuItem value="freelancer">Freelancer</MenuItem>
                      <MenuItem value="student">Estudiante</MenuItem>
                      <MenuItem value="retired">Pensionado</MenuItem>
                      <MenuItem value="unemployed">Desempleado</MenuItem>
                      <MenuItem value="other">Otro</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Preferencias de mudanza */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="preferred_move_in_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="date"
                    label="Fecha preferida de mudanza"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><ScheduleIcon /></InputAdornment>
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="lease_duration_months"
                control={control}
                rules={{ 
                  min: { value: 1, message: 'Mínimo 1 mes' },
                  max: { value: 60, message: 'Máximo 60 meses' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Duración deseada del contrato (meses)"
                    error={!!errors.lease_duration_months}
                    helperText={errors.lease_duration_months?.message}
                  />
                )}
              />
            </Grid>

            {/* Información adicional */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="number_of_occupants"
                control={control}
                rules={{ 
                  min: { value: 1, message: 'Mínimo 1 ocupante' },
                  max: { value: 20, message: 'Máximo 20 ocupantes' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Número de ocupantes"
                    error={!!errors.number_of_occupants}
                    helperText={errors.number_of_occupants?.message}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><PersonIcon /></InputAdornment>
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Prioridad de la solicitud</InputLabel>
                    <Select {...field} label="Prioridad de la solicitud">
                      <MenuItem value="low">Baja</MenuItem>
                      <MenuItem value="medium">Media</MenuItem>
                      <MenuItem value="high">Alta</MenuItem>
                      <MenuItem value="urgent">Urgente</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Verificaciones y referencias */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <WorkIcon sx={{ mr: 1 }} />
                Referencias y Documentación
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Controller
                    name="has_rental_references"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Checkbox {...field} checked={field.value} />}
                        label="Tengo referencias de alquiler"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Controller
                    name="has_employment_proof"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Checkbox {...field} checked={field.value} />}
                        label="Tengo comprobante de ingresos"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Controller
                    name="has_credit_check"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Checkbox {...field} checked={field.value} />}
                        label="Autorizo verificación crediticia"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Información sobre mascotas */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PetsIcon sx={{ mr: 1 }} />
                Información sobre Mascotas
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="has_pets"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Checkbox {...field} checked={field.value} />}
                        label="Tengo mascotas"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="smoking_allowed"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Checkbox {...field} checked={field.value} />}
                        label="Soy fumador"
                      />
                    )}
                  />
                </Grid>
                {watchedValues.has_pets && (
                  <Grid item xs={12}>
                    <Controller
                      name="pet_details"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          multiline
                          rows={2}
                          label="Detalles sobre mascotas"
                          placeholder="Tipo, raza, tamaño, edad, etc."
                        />
                      )}
                    />
                  </Grid>
                )}
              </Grid>
            </Grid>

            {/* Alertas de compatibilidad */}
            {watchedValues.has_pets && !property.pets_allowed && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  Esta propiedad no permite mascotas. Tu solicitud puede ser rechazada.
                </Alert>
              </Grid>
            )}

            {watchedValues.monthly_income && property.rent_price && 
             (watchedValues.monthly_income / property.rent_price) < 2.5 && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  Tus ingresos son menores a 2.5 veces el valor de la renta. 
                  Considera proporcionar referencias adicionales.
                </Alert>
              </Grid>
            )}
          </Grid>
        </form>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          startIcon={<CloseIcon />}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit(handleFormSubmit)}
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={20} /> : <SendIcon />}
          disabled={isLoading}
        >
          {isLoading ? 'Enviando...' : 'Enviar Solicitud'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MatchRequestForm;