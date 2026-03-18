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
  code: string;
  interview_code: string;
  candidate_name: string;
  candidate_email: string;
  approved_user_type: string;
  interview_rating: number;
  status: string;
  expires_at: string;
  is_approved: boolean;
  email?: string;
  user_type?: string;
  valid_until?: string;
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
    interview_code: '',
    phone_number: '',
    whatsapp: '',
    date_of_birth: '',
    gender: 'prefer_not_to_say',
    nationality: 'Colombiana',
    marital_status: 'single',
    country: 'Colombia',
    state: '',
    city: '',
    postal_code: '',
    employment_status: 'employed',
    monthly_income: 0,
    currency: 'COP',
    employer_name: '',
    job_title: '',
    years_employed: 0,
    company_name: '',
    property_types: [],
    total_properties: 0,
    years_experience: 0,
    current_address: '',
    rental_history: false,
    credit_score: 0,
    pets: false,
    family_size: 1,
    service_category: '',
    specialties: [],
    business_name: '',
    hourly_rate: 0,
    hourly_rate_currency: 'COP',
    service_areas: [],
    preferred_property_types: [],
    budget_range: 'medium',
    preferred_locations: [],
    move_in_date: '',
    lease_duration: 'long_term',
    source: 'direct',
    marketing_consent: false,
    terms_accepted: false,
    privacy_policy_accepted: false,
    // Nuevos campos específicos para arrendatarios
    occupants_count: 1,
    reason_for_moving: '',
    location_preferences: '',
    // Nuevos campos específicos para arrendadores
    landlord_type: '',
    has_property_management: false,
    accepts_pets: false,
    // Nuevos campos específicos para prestadores de servicios
    provider_type: '',
    service_availability: '',
    has_insurance: false,
    provides_equipment: false,
    coverage_area: '',
  });

  // Estados para el código de entrevista
  const [interviewCode, setInterviewCode] = useState('');
  const [codeValidating, setCodeValidating] = useState(false);
  const [codeValidation, setCodeValidation] = useState<{
    isValid: boolean;
    message: string;
    codeData?: InterviewCodeData;
  }>({ isValid: false, message: '' });

  // Estado para confirmación de contraseña
  const [password2, setPassword2] = useState('');
  
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
      const response = await fetch('/api/v1/users/auth/validate-interview-code/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interview_code: code }),
      });

      const data = await response.json();

      if (response.ok && data.is_valid) {
        setCodeValidation({
          isValid: true,
          message: 'Código válido',
          codeData: data.code_data,
        });

        // Pre-llenar formulario con datos del código
        if (data.code_data) {
          setFormData(prev => ({
            ...prev,
            email: data.code_data.email || '',
            user_type: data.code_data.user_type || 'tenant',
            interview_code: code, // Sincronizar el código en formData
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
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setInterviewCode(value);
  };

  const formatCodeDisplay = (code: string) => {
    return code;
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

    if (!formData.terms_accepted || !formData.privacy_policy_accepted) {
      setError('Debe aceptar los términos y condiciones y la política de privacidad');
      return;
    }

    // Validaciones básicas
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      setError('Todos los campos obligatorios deben ser completados');
      return;
    }
    
    // Validación de contraseñas
    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    
    if (formData.password !== password2) {
      setError('Las contraseñas no coinciden');
      return;
    }

    // Validaciones adicionales
    if (!formData.phone_number || !formData.city || !formData.state || !formData.current_address) {
      setError('Por favor complete la información de contacto y ubicación');
      return;
    }

    if (!formData.date_of_birth) {
      setError('La fecha de nacimiento es requerida');
      return;
    }

    // Validar edad mínima (18 años)
    const birthDate = new Date(formData.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      setError('Debe ser mayor de 18 años para registrarse');
      return;
    }

    // Validaciones específicas por tipo de usuario
    if (formData.user_type === 'landlord') {
      if (formData.total_properties === 0) {
        setError('Los arrendadores deben tener al menos una propiedad');
        return;
      }
    }

    if (formData.user_type === 'service_provider') {
      if (!formData.business_name || !formData.service_category || formData.hourly_rate === 0) {
        setError('Complete la información del negocio y servicios');
        return;
      }
    }

    if (formData.monthly_income === 0) {
      setError('Los ingresos mensuales son requeridos');
      return;
    }

    try {
      setIsLoading(true);

      // Incluir el código de entrevista en el registro
      const registrationData = {
        ...formData,
        interview_code: interviewCode,
        // Asegurar que se envíen todos los campos, incluso los vacíos
        address: formData.current_address, // Mapear current_address a address
      };
      
      await register.mutateAsync(registrationData);
      setShowSuccess(true);
    } catch (err: any) {
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
            Completa tu registro usando el código único recibido después de tu entrevista.<br />
            <strong>Proporcionamos un registro completo para garantizar la seguridad y confianza entre todos los miembros de nuestra comunidad.</strong>
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
                error={Boolean(codeValidation.message && !codeValidation.isValid)}
                helperText={
                  codeValidation.message || 
                  'Ingrese el código único proporcionado por VeriHome después de su entrevista'
                }
                placeholder="Ej: ABC12345"
                inputProps={{
                  maxLength: 8,
                  style: { 
                    textTransform: 'uppercase',
                    fontSize: '1.1rem',
                    fontFamily: 'monospace',
                    letterSpacing: '0.1em',
                  },
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
                        codeValidating ? 'Validando código...' :
                        codeValidation.isValid ? 'Código válido y verificado' :
                        interviewCode.length >= 8 ? 'Haga clic para validar el código' :
                        'Ingrese el código completo para validar'
                      }>
                        <IconButton
                          onClick={() => validateInterviewCode(interviewCode)}
                          disabled={!interviewCode || codeValidating || interviewCode.length < 8}
                          size="small"
                          sx={{
                            color: codeValidation.isValid ? 'success.main' : 
                                   (interviewCode.length >= 8 ? 'primary.main' : 'action.disabled'),
                            '&:hover': {
                              backgroundColor: codeValidation.isValid ? 'success.light' : 'primary.light',
                            },
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
                  ),
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
                      <strong>🔐 Código:</strong> {codeValidation.codeData.code}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>👤 Tipo de Usuario:</strong> {getUserTypeLabel(codeValidation.codeData.user_type)}
                    </Typography>
                    {codeValidation.codeData.email && (
                      <Typography variant="body2" gutterBottom>
                        <strong>📧 Email:</strong> {codeValidation.codeData.email}
                      </Typography>
                    )}
                    {codeValidation.codeData.valid_until && (
                      <Typography variant="body2" gutterBottom>
                        <strong>⏰ Expira:</strong> {new Date(codeValidation.codeData.valid_until).toLocaleDateString('es-ES')}
                      </Typography>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                    <Chip
                      icon={<PersonIcon />}
                      label={`Tipo: ${getUserTypeLabel(codeValidation.codeData.user_type)}`}
                      color="primary"
                      variant="filled"
                    />
                    <Chip
                      icon={<CheckIcon />}
                      label="Código Activo"
                      color="success"
                      variant="filled"
                    />
                    <Chip
                      icon={<SecurityIcon />}
                      label="Estado: Activo"
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
                    📝 Ingrese el código completo (8 caracteres alfanuméricos)
                  </Typography>
                  <Typography variant="caption">
                    El código debe tener al menos 8 caracteres para poder validarlo.
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Formulario de registro */}
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
                    
                    {/* Sección de Contraseña - Separador visual */}
                    <Grid item xs={12}>
                      <Divider>
                        <Chip 
                          label="Configura tu contraseña" 
                          icon={<SecurityIcon />}
                          color="primary"
                          variant="outlined"
                        />
                      </Divider>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Contraseña"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        helperText="Mínimo 8 caracteres"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SecurityIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Confirmar Contraseña"
                        name="password2"
                        type="password"
                        value={password2}
                        onChange={(e) => setPassword2(e.target.value)}
                        required
                        error={password2 !== '' && password2 !== formData.password}
                        helperText={password2 !== '' && password2 !== formData.password ? 'Las contraseñas no coinciden' : 'Repite la contraseña'}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SecurityIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
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
                        label="Departamento/Estado"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        required
                        helperText="Ej: Antioquia, Cundinamarca, Valle del Cauca"
                      />
                    </Grid>
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
                        name="current_address"
                        value={formData.current_address}
                        onChange={handleChange}
                        multiline
                        rows={2}
                        required
                        helperText="Dirección donde actualmente reside"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              {/* Información de Verificación y Seguridad */}
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Información de Verificación
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Fecha de Nacimiento"
                        name="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={handleChange}
                        required
                        InputLabelProps={{ shrink: true }}
                        helperText="Mínimo 18 años para registrarse"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Género</InputLabel>
                        <Select
                          name="gender"
                          value={formData.gender}
                          onChange={handleSelectChange}
                          label="Género"
                        >
                          <MenuItem value="male">Masculino</MenuItem>
                          <MenuItem value="female">Femenino</MenuItem>
                          <MenuItem value="other">Otro</MenuItem>
                          <MenuItem value="prefer_not_to_say">Prefiero no decir</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="WhatsApp"
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={handleChange}
                        helperText="Para comunicación rápida"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Estado Civil</InputLabel>
                        <Select
                          name="marital_status"
                          value={formData.marital_status}
                          onChange={handleSelectChange}
                          label="Estado Civil"
                        >
                          <MenuItem value="single">Soltero/a</MenuItem>
                          <MenuItem value="married">Casado/a</MenuItem>
                          <MenuItem value="divorced">Divorciado/a</MenuItem>
                          <MenuItem value="widowed">Viudo/a</MenuItem>
                          <MenuItem value="other">Otro</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              {/* Información Laboral y Financiera */}
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    <WorkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Información Laboral y Financiera
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Estado Laboral</InputLabel>
                        <Select
                          name="employment_status"
                          value={formData.employment_status}
                          onChange={handleSelectChange}
                          label="Estado Laboral"
                        >
                          <MenuItem value="employed">Empleado</MenuItem>
                          <MenuItem value="self_employed">Trabajador Independiente</MenuItem>
                          <MenuItem value="student">Estudiante</MenuItem>
                          <MenuItem value="unemployed">Desempleado</MenuItem>
                          <MenuItem value="retired">Jubilado</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Empresa/Empleador"
                        name="employer_name"
                        value={formData.employer_name}
                        onChange={handleChange}
                        required={formData.employment_status === 'employed'}
                        helperText="Nombre de la empresa donde trabaja"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Cargo/Posición"
                        name="job_title"
                        value={formData.job_title}
                        onChange={handleChange}
                        required={formData.employment_status === 'employed'}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Años en el Empleo Actual"
                        name="years_employed"
                        type="number"
                        value={formData.years_employed}
                        onChange={handleChange}
                        inputProps={{ min: 0, max: 50 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Ingresos Mensuales"
                        name="monthly_income"
                        type="number"
                        value={formData.monthly_income}
                        onChange={handleChange}
                        required
                        inputProps={{ min: 0 }}
                        helperText="Ingresos mensuales brutos en COP"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Número de Familiares"
                        name="family_size"
                        type="number"
                        value={formData.family_size}
                        onChange={handleChange}
                        required
                        inputProps={{ min: 1, max: 20 }}
                        helperText="Personas que vivirían en la propiedad"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              {/* Información Específica por Tipo de Usuario */}
              {formData.user_type === 'tenant' && (
                <Accordion sx={{ mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">
                      <HomeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Información Específica para Arrendatarios
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Rango de Presupuesto</InputLabel>
                          <Select
                            name="budget_range"
                            value={formData.budget_range}
                            onChange={handleSelectChange}
                            label="Rango de Presupuesto"
                          >
                            <MenuItem value="low">Económico (Hasta $1,500,000)</MenuItem>
                            <MenuItem value="medium">Medio ($1,500,000 - $3,000,000)</MenuItem>
                            <MenuItem value="high">Alto ($3,000,000 - $5,000,000)</MenuItem>
                            <MenuItem value="luxury">Premium (Más de $5,000,000)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Fecha Deseada de Ingreso"
                          name="move_in_date"
                          type="date"
                          value={formData.move_in_date}
                          onChange={handleChange}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              name="pets"
                              checked={formData.pets}
                              onChange={handleChange}
                            />
                          }
                          label="Tengo mascotas"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              name="rental_history"
                              checked={formData.rental_history}
                              onChange={handleChange}
                            />
                          }
                          label="Tengo historial de arrendamiento"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Número de personas a vivir"
                          name="occupants_count"
                          type="number"
                          value={formData.occupants_count || 1}
                          onChange={handleChange}
                          inputProps={{ min: 1, max: 10 }}
                          helperText="¿Cuántas personas vivirán en la propiedad?"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Razón de mudanza</InputLabel>
                          <Select
                            name="reason_for_moving"
                            value={formData.reason_for_moving || ''}
                            onChange={handleSelectChange}
                            label="Razón de mudanza"
                          >
                            <MenuItem value="first_time">Primera vez viviendo solo/a</MenuItem>
                            <MenuItem value="work_relocation">Cambio de trabajo</MenuItem>
                            <MenuItem value="family_growth">Crecimiento familiar</MenuItem>
                            <MenuItem value="better_location">Mejor ubicación</MenuItem>
                            <MenuItem value="other">Otra razón</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          label="Preferencias de ubicación"
                          name="location_preferences"
                          value={formData.location_preferences || ''}
                          onChange={handleChange}
                          helperText="¿Qué barrios o zonas prefieres? ¿Cerca de qué lugares?"
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              )}

              {formData.user_type === 'landlord' && (
                <Accordion sx={{ mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">
                      <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Información Específica para Arrendadores
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Número de Propiedades que Administra"
                          name="total_properties"
                          type="number"
                          value={formData.total_properties}
                          onChange={handleChange}
                          required
                          inputProps={{ min: 0, max: 100 }}
                          helperText="¿Cuántas propiedades administra actualmente?"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Años como Arrendador"
                          name="landlord_years_experience"
                          type="number"
                          value={formData.years_experience}
                          onChange={(e) => setFormData(prev => ({ ...prev, years_experience: parseInt(e.target.value) || 0 }))}
                          required
                          inputProps={{ min: 0, max: 50 }}
                          helperText="Años de experiencia alquilando propiedades"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Tipo de Arrendador</InputLabel>
                          <Select
                            name="landlord_type"
                            value={formData.landlord_type || ''}
                            onChange={handleSelectChange}
                            label="Tipo de Arrendador"
                          >
                            <MenuItem value="individual">Propietario Individual</MenuItem>
                            <MenuItem value="company">Empresa Inmobiliaria</MenuItem>
                            <MenuItem value="investor">Inversionista</MenuItem>
                            <MenuItem value="property_manager">Administrador de Propiedades</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Empresa/Negocio (opcional)"
                          name="company_name"
                          value={formData.company_name}
                          onChange={handleChange}
                          helperText="Nombre de su empresa inmobiliaria"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              name="has_property_management"
                              checked={formData.has_property_management || false}
                              onChange={handleChange}
                            />
                          }
                          label="¿Cuenta con servicio de administración?"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              name="accepts_pets"
                              checked={formData.accepts_pets || false}
                              onChange={handleChange}
                            />
                          }
                          label="¿Acepta mascotas en sus propiedades?"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>Tipos de Propiedades que Maneja</InputLabel>
                          <Select
                            multiple
                            name="property_types"
                            value={formData.property_types as string[]}
                            onChange={(e) => {
                              const value = e.target.value;
                              setFormData(prev => ({ ...prev, property_types: typeof value === 'string' ? value.split(',') : value }));
                            }}
                            input={<OutlinedInput label="Tipos de Propiedades que Maneja" />}
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {(selected as string[]).map((value) => (
                                  <Chip key={value} label={value} />
                                ))}
                              </Box>
                            )}
                          >
                            <MenuItem value="Apartamento">Apartamento</MenuItem>
                            <MenuItem value="Casa">Casa</MenuItem>
                            <MenuItem value="Oficina">Oficina</MenuItem>
                            <MenuItem value="Local Comercial">Local Comercial</MenuItem>
                            <MenuItem value="Bodega">Bodega</MenuItem>
                            <MenuItem value="Finca">Finca</MenuItem>
                          </Select>
                          <FormHelperText>Seleccione todos los tipos de propiedades que administra</FormHelperText>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              )}

              {formData.user_type === 'service_provider' && (
                <Accordion sx={{ mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">
                      <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Información Específica para Prestadores de Servicios
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Nombre del Negocio/Empresa"
                          name="business_name"
                          value={formData.business_name}
                          onChange={handleChange}
                          required
                          helperText="Nombre comercial de su negocio"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                          <InputLabel>Categoría Principal de Servicio</InputLabel>
                          <Select
                            name="service_category"
                            value={formData.service_category}
                            onChange={handleSelectChange}
                            label="Categoría Principal de Servicio"
                          >
                            <MenuItem value="maintenance">Mantenimiento General</MenuItem>
                            <MenuItem value="cleaning">Servicios de Limpieza</MenuItem>
                            <MenuItem value="security">Seguridad y Vigilancia</MenuItem>
                            <MenuItem value="gardening">Jardinería y Paisajismo</MenuItem>
                            <MenuItem value="electrical">Servicios Eléctricos</MenuItem>
                            <MenuItem value="plumbing">Plomería y Fontanería</MenuItem>
                            <MenuItem value="painting">Pintura y Decoración</MenuItem>
                            <MenuItem value="moving">Mudanzas y Transporte</MenuItem>
                            <MenuItem value="renovation">Remodelación y Construcción</MenuItem>
                            <MenuItem value="technology">Tecnología y Telecomunicaciones</MenuItem>
                            <MenuItem value="other">Otro Servicio</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Tarifa por Hora (COP)"
                          name="hourly_rate"
                          type="number"
                          value={formData.hourly_rate}
                          onChange={handleChange}
                          required
                          inputProps={{ min: 0 }}
                          helperText="Tarifa base en pesos colombianos"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Años de Experiencia en Servicios"
                          name="service_years_experience"
                          type="number"
                          value={formData.years_experience}
                          onChange={(e) => setFormData(prev => ({ ...prev, years_experience: parseInt(e.target.value) || 0 }))}
                          required
                          inputProps={{ min: 0, max: 50 }}
                          helperText="Años de experiencia en el sector de servicios"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Tipo de Prestador</InputLabel>
                          <Select
                            name="provider_type"
                            value={formData.provider_type || ''}
                            onChange={handleSelectChange}
                            label="Tipo de Prestador"
                          >
                            <MenuItem value="individual">Trabajador Independiente</MenuItem>
                            <MenuItem value="small_company">Pequeña Empresa (2-10 empleados)</MenuItem>
                            <MenuItem value="company">Empresa Establecida (10+ empleados)</MenuItem>
                            <MenuItem value="contractor">Contratista Especializado</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Disponibilidad de Servicio</InputLabel>
                          <Select
                            name="service_availability"
                            value={formData.service_availability || ''}
                            onChange={handleSelectChange}
                            label="Disponibilidad de Servicio"
                          >
                            <MenuItem value="business_hours">Horario Comercial (8am-6pm)</MenuItem>
                            <MenuItem value="extended_hours">Horario Extendido (7am-8pm)</MenuItem>
                            <MenuItem value="emergency">Disponible 24/7 (Emergencias)</MenuItem>
                            <MenuItem value="flexible">Horario Flexible</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              name="has_insurance"
                              checked={formData.has_insurance || false}
                              onChange={handleChange}
                            />
                          }
                          label="¿Cuenta con seguro de responsabilidad civil?"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              name="provides_equipment"
                              checked={formData.provides_equipment || false}
                              onChange={handleChange}
                            />
                          }
                          label="¿Proporciona herramientas y equipos?"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>Especialidades Adicionales</InputLabel>
                          <Select
                            multiple
                            name="specialties"
                            value={(formData.specialties || []) as string[]}
                            onChange={(e) => {
                              const value = e.target.value;
                              setFormData(prev => ({ ...prev, specialties: typeof value === 'string' ? value.split(',') : value }));
                            }}
                            input={<OutlinedInput label="Especialidades Adicionales" />}
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {(selected as string[]).map((value) => (
                                  <Chip key={value} label={value} />
                                ))}
                              </Box>
                            )}
                          >
                            <MenuItem value="emergency_service">Servicio de Emergencia</MenuItem>
                            <MenuItem value="warranty_service">Servicio con Garantía</MenuItem>
                            <MenuItem value="eco_friendly">Servicios Ecológicos</MenuItem>
                            <MenuItem value="certified_technician">Técnico Certificado</MenuItem>
                            <MenuItem value="multilingual">Atención Multiidioma</MenuItem>
                            <MenuItem value="online_quote">Cotización en Línea</MenuItem>
                          </Select>
                          <FormHelperText>Seleccione las especialidades que mejor describan su servicio</FormHelperText>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          label="Zona de Cobertura"
                          name="coverage_area"
                          value={formData.coverage_area || ''}
                          onChange={handleChange}
                          helperText="¿En qué barrios o zonas de la ciudad presta sus servicios?"
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              )}

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
                      name="privacy_policy_accepted"
                      checked={formData.privacy_policy_accepted}
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
              message: 'Cuenta creada exitosamente. Se ha enviado un correo de confirmación.',
            },
          });
        }}
        title="¡Cuenta creada exitosamente!"
        message="Se ha enviado un correo de confirmación a tu email. Por favor, verifica tu cuenta para poder iniciar sesión."
      />

      <TermsModal
        open={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setFormData(prev => ({ ...prev, terms_accepted: true }));
          setShowTermsModal(false);
        }}
      />

      <PrivacyModal
        open={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAccept={() => {
          setFormData(prev => ({ ...prev, privacy_policy_accepted: true }));
          setShowPrivacyModal(false);
        }}
      />
    </Box>
  );
};