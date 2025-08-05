import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  Grid,
  CircularProgress,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  Contact as ContactIcon,
  Send as SendIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';

interface ContactFormData {
  full_name: string;
  email: string;
  phone: string;
  interested_as: string;
  message: string;
  company_name?: string;
  experience_years?: number;
}

interface ContactFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ open, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<ContactFormData>({
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      interested_as: '',
      message: '',
      company_name: '',
      experience_years: 0
    }
  });

  const watchedValues = watch();
  const steps = ['Información Personal', 'Interés y Experiencia', 'Mensaje'];

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(watchedValues.full_name && watchedValues.email && watchedValues.phone);
      case 1:
        return !!(watchedValues.interested_as);
      case 2:
        return !!(watchedValues.message && watchedValues.message.length >= 20);
      default:
        return false;
    }
  };

  const onSubmit = async (data: ContactFormData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/contact/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          // Agregar metadatos adicionales
          user_agent: navigator.userAgent,
          referrer: document.referrer || window.location.href
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSubmitted(true);
        setActiveStep(0);
        reset();
        onSuccess?.();
        
        // Mostrar mensaje de éxito por unos segundos antes de cerrar
        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al enviar la solicitud');
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setError('Error de conexión. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'landlord':
        return 'Arrendador';
      case 'tenant':
        return 'Arrendatario';
      case 'service_provider':
        return 'Prestador de Servicios';
      default:
        return 'Otro';
    }
  };

  const getUserTypeDescription = (type: string) => {
    switch (type) {
      case 'landlord':
        return 'Tengo propiedades para alquilar y busco arrendatarios confiables';
      case 'tenant':
        return 'Busco una propiedad para alquilar';
      case 'service_provider':
        return 'Ofrezco servicios relacionados con propiedades (plomería, electricidad, etc.)';
      default:
        return 'Otro tipo de interés';
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="full_name"
                control={control}
                rules={{ 
                  required: 'El nombre completo es requerido',
                  minLength: { value: 2, message: 'El nombre debe tener al menos 2 caracteres' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Nombre Completo"
                    error={!!errors.full_name}
                    helperText={errors.full_name?.message}
                    InputProps={{
                      startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="email"
                control={control}
                rules={{ 
                  required: 'El email es requerido',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email inválido'
                  }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="email"
                    label="Correo Electrónico"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    InputProps={{
                      startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Controller
                name="phone"
                control={control}
                rules={{ 
                  required: 'El teléfono es requerido',
                  pattern: {
                    value: /^[+]?[\d\s\-\(\)]{10,}$/,
                    message: 'Teléfono inválido'
                  }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Teléfono"
                    placeholder="+57 300 123 4567"
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                    InputProps={{
                      startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
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
              <Controller
                name="interested_as"
                control={control}
                rules={{ required: 'Debe seleccionar una opción' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.interested_as}>
                    <InputLabel>¿Cómo te interesa unirte a VeriHome?</InputLabel>
                    <Select {...field} label="¿Cómo te interesa unirte a VeriHome?">
                      <MenuItem value="landlord">
                        <Box>
                          <Typography variant="subtitle2">Arrendador</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getUserTypeDescription('landlord')}
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="tenant">
                        <Box>
                          <Typography variant="subtitle2">Arrendatario</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getUserTypeDescription('tenant')}
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="service_provider">
                        <Box>
                          <Typography variant="subtitle2">Prestador de Servicios</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getUserTypeDescription('service_provider')}
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="other">
                        <Box>
                          <Typography variant="subtitle2">Otro</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Otro tipo de interés
                          </Typography>
                        </Box>
                      </MenuItem>
                    </Select>
                    {errors.interested_as && (
                      <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                        {errors.interested_as.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {(watchedValues.interested_as === 'landlord' || watchedValues.interested_as === 'service_provider') && (
              <>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="company_name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Nombre de Empresa (Opcional)"
                        InputProps={{
                          startAdornment: <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name="experience_years"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type="number"
                        label="Años de Experiencia"
                        inputProps={{ min: 0, max: 50 }}
                      />
                    )}
                  />
                </Grid>
              </>
            )}
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="message"
                control={control}
                rules={{ 
                  required: 'El mensaje es requerido',
                  minLength: { value: 20, message: 'El mensaje debe tener al menos 20 caracteres' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={6}
                    label="Cuéntanos más sobre tu interés"
                    placeholder="Describe por qué quieres unirte a VeriHome, tu experiencia relevante, o cualquier pregunta que tengas..."
                    error={!!errors.message}
                    helperText={errors.message?.message || `${field.value.length}/1000 caracteres`}
                    inputProps={{ maxLength: 1000 }}
                  />
                )}
              />
            </Grid>

            {watchedValues.interested_as && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Siguiente paso:</strong> Después de enviar esta solicitud, nuestro equipo 
                    revisará tu información y te contactará para programar una entrevista. Si es 
                    aprobada, recibirás un código único que te permitirá registrarte en la plataforma 
                    como <strong>{getUserTypeLabel(watchedValues.interested_as)}</strong>.
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        );

      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <Dialog open={open} onClose={() => {}} maxWidth="sm" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <ContactIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="success.main">
            ¡Solicitud Enviada Exitosamente!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gracias por tu interés en VeriHome. Hemos recibido tu solicitud y nuestro equipo 
            la revisará pronto. Te contactaremos por email para programar una entrevista.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Este diálogo se cerrará automáticamente...
          </Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ContactIcon sx={{ mr: 1 }} />
          Únete a la Comunidad VeriHome
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Para mantener la calidad y seguridad de nuestra plataforma, todos los nuevos miembros 
          pasan por un proceso de verificación que incluye una entrevista personal.
        </Typography>

        <Stepper activeStep={activeStep} sx={{ my: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {renderStepContent(activeStep)}
        </form>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Anterior
          </Button>
        )}
        
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!validateStep(activeStep)}
          >
            Siguiente
          </Button>
        ) : (
          <Button
            variant="contained"
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={loading || !validateStep(activeStep)}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {loading ? 'Enviando...' : 'Enviar Solicitud'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ContactForm;