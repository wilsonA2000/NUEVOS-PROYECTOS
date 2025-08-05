import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  Grid,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  SelectChangeEvent,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  OutlinedInput,
  FormHelperText,
  Divider,
  InputAdornment,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  Home as HomeIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { RegisterDto } from '../../types/user';
import { SuccessModal } from '../../components/SuccessModal';
import TermsModal from '../../components/modals/TermsModal';
import PrivacyModal from '../../components/modals/PrivacyModal';

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

export const RegisterWithCode: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  // Estados del formulario
  const [formData, setFormData] = useState<RegisterDto>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    user_type: 'tenant',
    phone_number: '',
    city: '',
    address: '',
    business_name: '',
    business_description: '',
    experience_years: 0,
    service_types: [],
    portfolio_urls: [],
    emergency_contact_name: '',
    emergency_contact_phone: '',
    profile_image: undefined,
    document_verification: {
      has_rut: false,
      has_cedula: false,
      has_references: false,
      has_certificates: false,
    },
    preferences: {
      notifications_email: true,
      notifications_push: true,
      marketing_emails: false,
    },
    terms_accepted: false,
    privacy_accepted: false,
  });

  // Estados para el código de entrevista
  const [interviewCode, setInterviewCode] = useState('');
  const [codeValidating, setCodeValidating] = useState(false);
  const [codeValidation, setCodeValidation] = useState<{
    isValid: boolean;
    message: string;
    codeData?: InterviewCodeData;
  }>({ isValid: false, message: '' });

  // Estados generales
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Validar código de entrevista
  const validateInterviewCode = async (code: string) => {
    if (!code || code.length < 8) {
      setCodeValidation({ isValid: false, message: '' });
      return;
    }

    try {
      setCodeValidating(true);
      const response = await fetch('/api/v1/auth/validate-interview-code/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interview_code: code })
      });

      const data = await response.json();

      if (response.ok && data.is_valid) {
        setCodeValidation({
          isValid: true,
          message: 'Código válido',
          codeData: data.code_data
        });

        // Pre-llenar formulario con datos del código
        if (data.code_data) {
          setFormData(prev => ({
            ...prev,
            email: data.code_data.candidate_email,
            user_type: data.code_data.approved_user_type,
            first_name: data.code_data.candidate_name.split(' ')[0] || '',
            last_name: data.code_data.candidate_name.split(' ').slice(1).join(' ') || '',
          }));
        }
      } else {
        // Mensajes específicos según el tipo de error
        let errorMessage = data.message || 'Código inválido';
        
        if (response.status === 404) {
          errorMessage = '❌ Código no encontrado en el sistema';
        } else if (data.message?.includes('expirado')) {
          errorMessage = '⏰ El código ha expirado';
        } else if (data.message?.includes('usado')) {
          errorMessage = '🔒 El código ya fue utilizado';
        } else if (data.message?.includes('aprobado')) {
          errorMessage = '⚠️ El código aún no ha sido aprobado por el administrador';
        } else if (data.message?.includes('intentos')) {
          errorMessage = '🚫 Máximo de intentos excedido';
        }
        
        setCodeValidation({
          isValid: false,
          message: errorMessage,
        });
      }
    } catch (error) {
      console.error('Error validating interview code:', error);
      setCodeValidation({
        isValid: false,
        message: '🌐 Error de conexión. Verifique su internet e intente nuevamente.',
      });
    } finally {
      setCodeValidating(false);
    }
  };

  // Debounce para el código
  useEffect(() => {
    const timer = setTimeout(() => {
      if (interviewCode) {
        validateInterviewCode(interviewCode);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [interviewCode]);

  const handleInterviewCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setInterviewCode(value);
  };

  const formatCodeDisplay = (code: string) => {
    if (code.length <= 2) return code;
    if (code.length <= 7) return `${code.slice(0, 2)}-${code.slice(2)}`;
    return `${code.slice(0, 2)}-${code.slice(2, 6)}-${code.slice(6)}`;
  };

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'landlord': return 'Arrendador';
      case 'tenant': return 'Arrendatario';
      case 'service_provider': return 'Prestador de Servicios';
      default: return userType;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!codeValidation.isValid) {
      setError('Debe ingresar un código de entrevista válido');
      return;
    }

    if (!formData.terms_accepted || !formData.privacy_accepted) {
      setError('Debe aceptar los términos y condiciones y la política de privacidad');
      return;
    }

    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      setError('Todos los campos obligatorios deben ser completados');
      return;
    }

    try {
      setIsLoading(true);

      // Incluir el código de entrevista en el registro
      const registrationData = {
        ...formData,
        interview_code: interviewCode,
      };

      await register.mutateAsync(registrationData);
      setShowSuccess(true);
    } catch (err: any) {
      console.error('Error en registro:', err);
      
      if (err.response?.status === 400) {
        const errorData = err.response.data;
        if (errorData.email) {
          setError('Este email ya está registrado');
        } else if (errorData.interview_code) {
          setError('El código de entrevista ha expirado o ya fue usado');
        } else {
          setError(errorData.message || 'Error en los datos del formulario');
        }
      } else if (err.response?.status === 429) {
        setError('Demasiados intentos. Por favor, espera un momento.');
      } else {
        setError('Error al crear la cuenta. Por favor, intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getCodeValidationIcon = () => {
    if (codeValidating) return <CircularProgress size={20} />;
    if (codeValidation.isValid) return <CheckIcon color="success" />;
    if (codeValidation.message && !codeValidation.isValid) return <ErrorIcon color="error" />;
    return <SecurityIcon color="action" />;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        py: 4,
      }}
    >
      <Card sx={{ maxWidth: 800, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom textAlign="center">
            Registro con Código de Entrevista
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
            Completa tu registro usando el código único recibido después de tu entrevista
          </Typography>

          {/* Sección del código de entrevista */}
          <Card sx={{ mb: 3, border: codeValidation.isValid ? '2px solid #4caf50' : '1px solid #e0e0e0', borderRadius: 2 }}>
            <CardContent sx={{ pb: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'text.primary' }}>
                <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
                Código de Entrevista VeriHome
              </Typography>
              
              <TextField
                fullWidth
                label="Código de Entrevista"
                value={formatCodeDisplay(interviewCode)}
                onChange={handleInterviewCodeChange}
                error={codeValidation.message && !codeValidation.isValid}
                helperText={
                  codeValidation.message || 
                  'Ingrese el código único proporcionado por VeriHome después de su entrevista'
                }
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
                      {getCodeValidationIcon()}
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={
                        codeValidating ? "Validando código..." :
                        codeValidation.isValid ? "Código válido y verificado" :
                        interviewCode.length >= 8 ? "Haga clic para validar el código" :
                        "Ingrese el código completo para validar"
                      }>
                        <IconButton
                          onClick={() => validateInterviewCode(interviewCode)}
                          disabled={!interviewCode || codeValidating || interviewCode.length < 8}
                          size="small"
                          sx={{
                            color: codeValidation.isValid ? 'success.main' : 
                                   (interviewCode.length >= 8 ? 'primary.main' : 'action.disabled'),
                            '&:hover': {
                              backgroundColor: codeValidation.isValid ? 'success.light' : 'primary.light'
                            }
                          }}
                        >
                          {codeValidating ? (
                            <CircularProgress size={20} />
                          ) : codeValidation.isValid ? (
                            <CheckIcon />
                          ) : (
                            <SecurityIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 2 }}
              />

              {/* Información del código validado */}
              {codeValidation.isValid && codeValidation.codeData && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckIcon color="success" />
                    Código Verificado Exitosamente
                  </Typography>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>📝 Candidato:</strong> {codeValidation.codeData.candidate_name}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>📧 Email:</strong> {codeValidation.codeData.candidate_email}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>🔐 Código:</strong> {codeValidation.codeData.interview_code}
                    </Typography>
                    {codeValidation.codeData.expires_at && (
                      <Typography variant="body2" gutterBottom>
                        <strong>⏰ Expira:</strong> {new Date(codeValidation.codeData.expires_at).toLocaleDateString('es-ES')}
                      </Typography>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                    <Chip
                      icon={<PersonIcon />}
                      label={`Tipo: ${getUserTypeLabel(codeValidation.codeData.approved_user_type)}`}
                      color="primary"
                      variant="filled"
                    />
                    {codeValidation.codeData.interview_rating && (
                      <Chip
                        icon={<CheckIcon />}
                        label={`Calificación: ${'⭐'.repeat(codeValidation.codeData.interview_rating)} (${codeValidation.codeData.interview_rating}/10)`}
                        color="success"
                        variant="filled"
                      />
                    )}
                    <Chip
                      icon={<SecurityIcon />}
                      label={`Estado: ${codeValidation.codeData.status || 'Activo'}`}
                      color="info"
                      variant="outlined"
                    />
                    {codeValidation.codeData.is_approved && (
                      <Chip
                        icon={<CheckIcon />}
                        label="Aprobado por Administrador"
                        color="success"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1, border: '1px solid', borderColor: 'success.main' }}>
                    <Typography variant="body2" sx={{ color: 'success.dark', fontWeight: 'bold' }}>
                      ✅ Código válido y verificado contra la base de datos
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'success.dark' }}>
                      Este código fue generado automáticamente por el panel de administración de Django 
                      y está asociado al correo electrónico del candidato.
                    </Typography>
                  </Box>
                </Alert>
              )}
              
              {/* Información cuando el código no es válido */}
              {codeValidation.message && !codeValidation.isValid && interviewCode.length >= 8 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ErrorIcon color="error" />
                    Código No Válido
                  </Typography>
                  
                  <Typography variant="body2" gutterBottom>
                    {codeValidation.message}
                  </Typography>
                  
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1, border: '1px solid', borderColor: 'error.main' }}>
                    <Typography variant="body2" sx={{ color: 'error.dark', fontWeight: 'bold', mb: 1 }}>
                      🔍 Verificaciones realizadas:
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'error.dark', display: 'block' }}>
                      ✓ Formato de código verificado<br/>
                      ✓ Consulta en base de datos realizada<br/>
                      ✓ Validación contra correo electrónico del candidato<br/>
                      ✓ Verificación de estado de aprobación del administrador
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    📋 Pasos a seguir:
                  </Typography>
                  <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
                    <li>Verifique que el código esté escrito correctamente</li>
                    <li>Asegúrese de usar el código más reciente recibido</li>
                    <li>Contacte al administrador si el problema persiste</li>
                    <li>Verifique que el código no haya expirado</li>
                  </Typography>
                </Alert>
              )}
              
              {/* Información para códigos incompletos */}
              {interviewCode.length > 0 && interviewCode.length < 8 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    📝 Ingrese el código completo (formato: VH-XXXX-YYYY)
                  </Typography>
                  <Typography variant="caption">
                    El código debe tener al menos 8 caracteres para poder validarlo.
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Formulario de registro - Solo se muestra si el código es válido */}
          {codeValidation.isValid && (
            <form onSubmit={handleSubmit}>
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {/* Información Personal */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Información Personal
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Nombre"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Apellido"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled // Pre-llenado por el código
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Teléfono"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Contraseña"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        helperText="Mínimo 8 caracteres"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Tipo de Usuario</InputLabel>
                        <Select
                          name="user_type"
                          value={formData.user_type}
                          onChange={handleSelectChange}
                          label="Tipo de Usuario"
                          disabled // Pre-determinado por el código
                        >
                          <MenuItem value="landlord">Arrendador</MenuItem>
                          <MenuItem value="tenant">Arrendatario</MenuItem>
                          <MenuItem value="service_provider">Prestador de Servicios</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              {/* Información de Ubicación */}
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Ubicación
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Ciudad"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Dirección"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        multiline
                        rows={2}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              {/* Términos y Condiciones */}
              <Box sx={{ mt: 4 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="terms_accepted"
                      checked={formData.terms_accepted}
                      onChange={handleChange}
                      required
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Acepto los{' '}
                      <Link
                        component="button"
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        sx={{ textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        términos y condiciones
                      </Link>
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      name="privacy_accepted"
                      checked={formData.privacy_accepted}
                      onChange={handleChange}
                      required
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Acepto la{' '}
                      <Link
                        component="button"
                        type="button"
                        onClick={() => setShowPrivacyModal(true)}
                        sx={{ textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        política de privacidad
                      </Link>
                    </Typography>
                  }
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading || !codeValidation.isValid}
                sx={{ mt: 3, py: 1.5 }}
              >
                {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
              </Button>
            </form>
          )}

          {/* Enlace al login */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2">
              ¿Ya tienes una cuenta?{' '}
              <Link component={RouterLink} to="/login">
                Inicia sesión aquí
              </Link>
            </Typography>
          </Box>

          {/* Información para usuarios sin código */}
          {!interviewCode && (
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>¿No tienes un código de entrevista?</strong><br />
                Primero debes contactarnos y completar una entrevista. 
                El código será enviado por correo electrónico si eres aprobado.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      <SuccessModal
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          navigate('/login', {
            state: {
              message: 'Cuenta creada exitosamente. Se ha enviado un correo de confirmación.'
            }
          });
        }}
        title="¡Cuenta creada exitosamente!"
        message="Se ha enviado un correo de confirmación a tu email. Por favor, verifica tu cuenta para poder iniciar sesión."
      />

      <TermsModal
        open={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      <PrivacyModal
        open={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </Box>
  );
};