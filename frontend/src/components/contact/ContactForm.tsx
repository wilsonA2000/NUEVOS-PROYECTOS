import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Typography,
  Card,
  CardContent,
  Fade,
  useTheme,
} from '@mui/material';
import { 
  Send as SendIcon, 
  CheckCircle as CheckIcon,
  ContactSupport as ContactIcon 
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { api } from '../../services/api';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  inquiry_type: 'general' | 'property' | 'technical' | 'partnership';
}

const ContactForm: React.FC = () => {
  const theme = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    defaultValues: {
      inquiry_type: 'general',
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      await api.post('/users/contact/', data);
      setSubmitStatus({
        type: 'success',
        message: '¡Mensaje enviado exitosamente! Te contactaremos dentro de las próximas 24 horas.',
      });
      reset();
    } catch (error: any) {
      setSubmitStatus({
        type: 'error',
        message: 'Error al enviar el mensaje. Por favor verifica tus datos e intenta nuevamente.',
      });
      console.error('Error enviando formulario de contacto:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inquiryTypes = [
    { value: 'general', label: 'Consulta General' },
    { value: 'property', label: 'Propiedades / Alquileres' },
    { value: 'technical', label: 'Soporte Técnico' },
    { value: 'partnership', label: 'Alianzas / Negocios' },
  ];

  return (
    <Card 
      elevation={0}
      sx={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius-lg)',
        overflow: 'hidden',
      }}
    >
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <ContactIcon 
            sx={{ 
              fontSize: 48, 
              color: 'var(--color-primary)',
              mb: 2,
            }} 
          />
          <Typography 
            variant="h4" 
            component="h2"
            sx={{
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              mb: 1,
            }}
          >
            Contáctanos
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'var(--color-text-secondary)',
              maxWidth: 500,
              mx: 'auto',
            }}
          >
            Completa el formulario y te responderemos lo antes posible. 
            Estamos aquí para ayudarte con todas tus necesidades inmobiliarias.
          </Typography>
        </Box>

        {/* Formulario */}
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Nombre */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="name"
                control={control}
                rules={{ 
                  required: 'El nombre es requerido',
                  minLength: { value: 2, message: 'Mínimo 2 caracteres' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Nombre completo *"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    disabled={isSubmitting}
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
            </Grid>

            {/* Email */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="email"
                control={control}
                rules={{
                  required: 'El email es requerido',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email inválido',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Correo electrónico *"
                    type="email"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    disabled={isSubmitting}
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
            </Grid>

            {/* Teléfono */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="phone"
                control={control}
                rules={{ 
                  required: 'El teléfono es requerido',
                  pattern: {
                    value: /^[+]?[\d\s\-()]{10,}$/,
                    message: 'Teléfono inválido'
                  }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Teléfono *"
                    placeholder="+57 300 123 4567"
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                    disabled={isSubmitting}
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
            </Grid>

            {/* Tipo de consulta */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="inquiry_type"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    select
                    label="Tipo de consulta"
                    disabled={isSubmitting}
                    SelectProps={{ native: true }}
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
                  >
                    {inquiryTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Asunto */}
            <Grid item xs={12}>
              <Controller
                name="subject"
                control={control}
                rules={{ 
                  required: 'El asunto es requerido',
                  minLength: { value: 5, message: 'Mínimo 5 caracteres' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Asunto *"
                    error={!!errors.subject}
                    helperText={errors.subject?.message}
                    disabled={isSubmitting}
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
            </Grid>

            {/* Mensaje */}
            <Grid item xs={12}>
              <Controller
                name="message"
                control={control}
                rules={{
                  required: 'El mensaje es requerido',
                  minLength: {
                    value: 20,
                    message: 'El mensaje debe tener al menos 20 caracteres',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={4}
                    label="Mensaje *"
                    placeholder="Describe tu consulta o necesidad en detalle..."
                    error={!!errors.message}
                    helperText={errors.message?.message}
                    disabled={isSubmitting}
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
            </Grid>

            {/* Status Alert */}
            {submitStatus.type && (
              <Grid item xs={12}>
                <Fade in={true}>
                  <Alert 
                    severity={submitStatus.type}
                    sx={{
                      borderRadius: 'var(--border-radius-md)',
                      '& .MuiAlert-icon': {
                        fontSize: '1.5rem',
                      },
                    }}
                    icon={submitStatus.type === 'success' ? <CheckIcon /> : undefined}
                  >
                    {submitStatus.message}
                  </Alert>
                </Fade>
              </Grid>
            )}

            {/* Submit Button */}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isSubmitting}
                startIcon={
                  isSubmitting ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SendIcon />
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
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {isSubmitting ? 'Enviando mensaje...' : 'Enviar mensaje'}
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Footer info */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem',
            }}
          >
            * Campos obligatorios. Tiempo de respuesta típico: 24 horas.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ContactForm;