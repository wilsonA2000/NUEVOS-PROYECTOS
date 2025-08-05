import React, { useState } from 'react';
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
  Warning as WarningIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { RegisterDto } from '../../types/user';
import { SuccessModal } from '../../components/SuccessModal';
import TermsModal from '../../components/modals/TermsModal';
import PrivacyModal from '../../components/modals/PrivacyModal';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState<RegisterDto>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    user_type: 'tenant',
    interview_code: '',
    phone_number: '',
    whatsapp: '',
    country: 'Colombia',
    state: '',
    city: '',
    postal_code: '',
    date_of_birth: '',
    gender: '',
    nationality: '',
    marital_status: '',
    employment_status: '',
    monthly_income: 0,
    currency: 'COP',
    employer_name: '',
    job_title: '',
    years_employed: 0,
    source: '',
    hourly_rate_currency: 'COP',
    terms_accepted: false,
    privacy_policy_accepted: false,
    marketing_consent: false,
  });
  const [error, setError] = useState<string>('');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  
  // Estados para validación de código de entrevista
  const [codeValidating, setCodeValidating] = useState(false);
  const [codeValidation, setCodeValidation] = useState<{
    isValid: boolean;
    message: string;
    codeData?: any;
  }>({ isValid: false, message: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<{ name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    
    // Manejar cambio en código de entrevista con validación especial
    if (name === 'interview_code') {
      handleInterviewCodeChange(e as React.ChangeEvent<HTMLInputElement>);
      return;
    }
    
    setFormData((prev) => ({ ...prev, [name as string]: value }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleRedirect = () => {
    setSuccessModalOpen(false);
    navigate('/');
  };

  const handleTermsAccept = () => {
    setFormData((prev) => ({ ...prev, terms_accepted: true }));
  };

  const handlePrivacyAccept = () => {
    setFormData((prev) => ({ ...prev, privacy_policy_accepted: true }));
  };

  // Validar código de entrevista
  const validateInterviewCode = async (code: string) => {
    if (!code || code.length < 8) {
      setCodeValidation({ isValid: false, message: '' });
      return;
    }

    try {
      setCodeValidating(true);
      const formattedCode = formatCodeForAPI(code);
      
      // Usar axios configurado en lugar de fetch directo
      const { api } = await import('../../services/api');
      const response = await api.post('/users/auth/validate-interview-code/', {
        interview_code: formattedCode
      });

      const data = response.data;

      if (response.status === 200 && data.is_valid) {
        setCodeValidation({
          isValid: true,
          message: '✅ Código válido y verificado',
          codeData: data.code_data
        });
      } else {
        let errorMessage = data.message || '❌ Error de código: Por favor ingrese un código de entrevista válido';
        
        if (response.status === 404) {
          errorMessage = '❌ Error de código: Por favor ingrese un código de entrevista válido';
        } else if (data.message?.includes('expirado')) {
          errorMessage = '⏰ Código expirado: Por favor solicite un nuevo código';
        } else if (data.message?.includes('usado')) {
          errorMessage = '🔒 Código ya utilizado: Este código ya fue usado anteriormente';
        } else if (data.message?.includes('aprobado')) {
          errorMessage = '⚠️ Código no aprobado: El código no está autorizado para su uso';
        } else {
          errorMessage = '❌ Error de código: Por favor ingrese un código de entrevista válido';
        }
        
        setCodeValidation({
          isValid: false,
          message: errorMessage,
        });
      }
    } catch (error: any) {
      console.error('Error validating interview code:', error);
      
      // Manejar errores de axios
      let errorMessage = '❌ Error de código: Por favor ingrese un código de entrevista válido';
      
      if (error.response?.status === 404) {
        errorMessage = '❌ Error de código: Por favor ingrese un código de entrevista válido';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (!error.response) {
        errorMessage = '❌ Error de conexión: Verifica tu conexión a internet';
      }
      
      setCodeValidation({
        isValid: false,
        message: errorMessage,
      });
    } finally {
      setCodeValidating(false);
    }
  };

  const handleInterviewCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-alphanumeric characters first, then format
    const cleanValue = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Limit to 10 characters (VH + 8 chars)
    const limitedValue = cleanValue.substring(0, 10);
    
    // Store the clean value without dashes for validation
    setFormData((prev) => ({ ...prev, interview_code: limitedValue }));
    
    // Auto-validar si el código tiene la longitud correcta (8+ chars)
    if (limitedValue.length >= 8) {
      setTimeout(() => validateInterviewCode(limitedValue), 500);
    } else {
      setCodeValidation({ 
        isValid: false, 
        message: limitedValue.length > 0 ? 'El código debe tener al menos 8 caracteres' : '' 
      });
    }
  };

  const formatCodeDisplay = (code: string) => {
    // Remove any existing dashes first
    const cleanCode = code.replace(/-/g, '');
    
    if (cleanCode.length <= 2) return cleanCode;
    if (cleanCode.length <= 6) return `${cleanCode.slice(0, 2)}-${cleanCode.slice(2)}`;
    return `${cleanCode.slice(0, 2)}-${cleanCode.slice(2, 6)}-${cleanCode.slice(6)}`;
  };

  const formatCodeForAPI = (code: string) => {
    // Format code for API (with dashes as stored in database)
    const cleanCode = code.replace(/-/g, '');
    
    if (cleanCode.length <= 2) return cleanCode;
    if (cleanCode.length <= 6) return `${cleanCode.slice(0, 2)}-${cleanCode.slice(2)}`;
    return `${cleanCode.slice(0, 2)}-${cleanCode.slice(2, 6)}-${cleanCode.slice(6)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones básicas
    if (!formData.terms_accepted || !formData.privacy_policy_accepted) {
      setError('Debes aceptar los términos y condiciones y la política de privacidad.');
      return;
    }

    try {
      await register.mutateAsync(formData);
      // El éxito se maneja en el contexto de autenticación
      // que redirige a login con el mensaje de confirmación
    } catch (err: any) {
      console.error('Error en registro:', err);
      
      // El error ya viene procesado desde authService.ts
      if (err instanceof Error) {
        setError(err.message);
      } else if (err.response?.status === 400) {
        const errorMessage = err.response.data?.error || err.response.data?.detail || 'Datos inválidos';
        setError(errorMessage);
      } else if (err.response?.status === 409) {
        setError('Ya existe un usuario con este email.');
      } else {
        setError('Error al registrar usuario. Por favor, intenta nuevamente.');
      }
    }
  };

  const renderBasicInfo = () => (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon />
          <Typography variant="h6">Información Personal</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
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
              label="WhatsApp (opcional)"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Fecha de Nacimiento"
              name="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Género</InputLabel>
              <Select
                name="gender"
                value={formData.gender || ''}
                label="Género"
                onChange={handleSelectChange}
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
              label="Nacionalidad"
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Estado Civil</InputLabel>
              <Select
                name="marital_status"
                value={formData.marital_status || ''}
                label="Estado Civil"
                onChange={handleSelectChange}
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
  );

  const renderLocationInfo = () => (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationIcon />
          <Typography variant="h6">Ubicación</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="País"
              name="country"
              value={formData.country}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Departamento</InputLabel>
              <Select
                name="state"
                value={formData.state}
                label="Departamento"
                onChange={handleSelectChange}
              >
                <MenuItem value="Antioquia">Antioquia</MenuItem>
                <MenuItem value="Atlántico">Atlántico</MenuItem>
                <MenuItem value="Bogotá D.C.">Bogotá D.C.</MenuItem>
                <MenuItem value="Bolívar">Bolívar</MenuItem>
                <MenuItem value="Boyacá">Boyacá</MenuItem>
                <MenuItem value="Caldas">Caldas</MenuItem>
                <MenuItem value="Caquetá">Caquetá</MenuItem>
                <MenuItem value="Cauca">Cauca</MenuItem>
                <MenuItem value="Cesar">Cesar</MenuItem>
                <MenuItem value="Chocó">Chocó</MenuItem>
                <MenuItem value="Córdoba">Córdoba</MenuItem>
                <MenuItem value="Cundinamarca">Cundinamarca</MenuItem>
                <MenuItem value="Guainía">Guainía</MenuItem>
                <MenuItem value="Guaviare">Guaviare</MenuItem>
                <MenuItem value="Huila">Huila</MenuItem>
                <MenuItem value="La Guajira">La Guajira</MenuItem>
                <MenuItem value="Magdalena">Magdalena</MenuItem>
                <MenuItem value="Meta">Meta</MenuItem>
                <MenuItem value="Nariño">Nariño</MenuItem>
                <MenuItem value="Norte de Santander">Norte de Santander</MenuItem>
                <MenuItem value="Putumayo">Putumayo</MenuItem>
                <MenuItem value="Quindío">Quindío</MenuItem>
                <MenuItem value="Risaralda">Risaralda</MenuItem>
                <MenuItem value="San Andrés y Providencia">San Andrés y Providencia</MenuItem>
                <MenuItem value="Santander">Santander</MenuItem>
                <MenuItem value="Sucre">Sucre</MenuItem>
                <MenuItem value="Tolima">Tolima</MenuItem>
                <MenuItem value="Valle del Cauca">Valle del Cauca</MenuItem>
                <MenuItem value="Vaupés">Vaupés</MenuItem>
                <MenuItem value="Vichada">Vichada</MenuItem>
              </Select>
            </FormControl>
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
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Código Postal"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
            />
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );

  const renderEmploymentInfo = () => (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WorkIcon />
          <Typography variant="h6">Información Laboral</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Estado Laboral</InputLabel>
              <Select
                name="employment_status"
                value={formData.employment_status || ''}
                label="Estado Laboral"
                onChange={handleSelectChange}
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
            <FormControl fullWidth>
              <InputLabel>Moneda</InputLabel>
              <Select
                name="currency"
                value={formData.currency || 'COP'}
                label="Moneda"
                onChange={handleSelectChange}
              >
                <MenuItem value="COP">Pesos Colombianos (COP)</MenuItem>
                <MenuItem value="USD">Dólares Americanos (USD)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={`Ingresos Mensuales (${formData.currency || 'COP'})`}
              name="monthly_income"
              type="number"
              value={formData.monthly_income || ''}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Nombre del Empleador"
              name="employer_name"
              value={formData.employer_name}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Cargo"
              name="job_title"
              value={formData.job_title}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Años de Empleo"
              name="years_employed"
              type="number"
              value={formData.years_employed || ''}
              onChange={handleChange}
            />
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );

  const renderUserTypeSpecificInfo = () => {
    switch (formData.user_type) {
      case 'landlord':
        return (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HomeIcon />
                <Typography variant="h6">Información de Arrendador</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nombre de la Empresa"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Total de Propiedades"
                    name="total_properties"
                    type="number"
                    value={formData.total_properties || ''}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Años de Experiencia"
                    name="years_experience"
                    type="number"
                    value={formData.years_experience || ''}
                    onChange={handleChange}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        );

      case 'tenant':
        return (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HomeIcon />
                <Typography variant="h6">Información de Arrendatario</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Dirección Actual"
                    name="current_address"
                    value={formData.current_address}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="rental_history"
                        checked={formData.rental_history || false}
                        onChange={handleCheckboxChange}
                      />
                    }
                    label="Tengo historial de renta"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="pets"
                        checked={formData.pets || false}
                        onChange={handleCheckboxChange}
                      />
                    }
                    label="Tengo mascotas"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Puntuación Crediticia"
                    name="credit_score"
                    type="number"
                    value={formData.credit_score || ''}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Tamaño de Familia"
                    name="family_size"
                    type="number"
                    value={formData.family_size || ''}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Rango de Presupuesto</InputLabel>
                    <Select
                      name="budget_range"
                      value={formData.budget_range || ''}
                      label="Rango de Presupuesto"
                      onChange={handleSelectChange}
                    >
                      <MenuItem value="low">Bajo (hasta $1,500,000 COP)</MenuItem>
                      <MenuItem value="medium">Medio ($1,500,000 - $3,000,000 COP)</MenuItem>
                      <MenuItem value="high">Alto ($3,000,000 - $5,000,000 COP)</MenuItem>
                      <MenuItem value="luxury">Lujo (más de $5,000,000 COP)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Fecha de Mudanza Deseada"
                    name="move_in_date"
                    type="date"
                    value={formData.move_in_date}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Duración del Contrato</InputLabel>
                    <Select
                      name="lease_duration"
                      value={formData.lease_duration || ''}
                      label="Duración del Contrato"
                      onChange={handleSelectChange}
                    >
                      <MenuItem value="short_term">Corto plazo (1-6 meses)</MenuItem>
                      <MenuItem value="long_term">Largo plazo (1+ años)</MenuItem>
                      <MenuItem value="flexible">Flexible</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        );

      case 'service_provider':
        return (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon />
                <Typography variant="h6">Información de Prestador de Servicios</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nombre del Negocio"
                    name="business_name"
                    value={formData.business_name}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Categoría de Servicio</InputLabel>
                    <Select
                      name="service_category"
                      value={formData.service_category || ''}
                      label="Categoría de Servicio"
                      onChange={handleSelectChange}
                    >
                      <MenuItem value="maintenance">Mantenimiento</MenuItem>
                      <MenuItem value="cleaning">Limpieza</MenuItem>
                      <MenuItem value="security">Seguridad</MenuItem>
                      <MenuItem value="landscaping">Jardinería</MenuItem>
                      <MenuItem value="plumbing">Plomería</MenuItem>
                      <MenuItem value="electrical">Electricidad</MenuItem>
                      <MenuItem value="painting">Pintura</MenuItem>
                      <MenuItem value="carpentry">Carpintería</MenuItem>
                      <MenuItem value="legal">Servicios Legales</MenuItem>
                      <MenuItem value="real_estate">Asesoría Inmobiliaria</MenuItem>
                      <MenuItem value="other">Otros</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Tarifa por Hora"
                    name="hourly_rate"
                    type="number"
                    value={formData.hourly_rate || ''}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Moneda de Tarifa</InputLabel>
                    <Select
                      name="hourly_rate_currency"
                      value={formData.hourly_rate_currency || 'COP'}
                      label="Moneda de Tarifa"
                      onChange={handleSelectChange}
                    >
                      <MenuItem value="COP">Pesos Colombianos (COP)</MenuItem>
                      <MenuItem value="USD">Dólares Americanos (USD)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Años de Experiencia"
                    name="years_experience"
                    type="number"
                    value={formData.years_experience || ''}
                    onChange={handleChange}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        );

      default:
        return null;
    }
  };

  const renderPreferences = () => (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          <Typography variant="h6">Preferencias y Configuración</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>¿Cómo se enteró de nosotros?</InputLabel>
              <Select
                name="source"
                value={formData.source || ''}
                label="¿Cómo se enteró de nosotros?"
                onChange={handleSelectChange}
              >
                <MenuItem value="google">Google</MenuItem>
                <MenuItem value="facebook">Facebook</MenuItem>
                <MenuItem value="instagram">Instagram</MenuItem>
                <MenuItem value="referral">Recomendación</MenuItem>
                <MenuItem value="advertisement">Anuncio</MenuItem>
                <MenuItem value="other">Otro</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  name="marketing_consent"
                  checked={formData.marketing_consent || false}
                  onChange={handleCheckboxChange}
                />
              }
              label="Acepto recibir comunicaciones de marketing y ofertas especiales"
            />
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );

  const renderTermsAndConditions = () => (
    <Box sx={{ mt: 3, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#fafafa' }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
        Términos y Condiciones
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Es obligatorio leer y aceptar los términos y condiciones para continuar con el registro.
          </Typography>
        </Alert>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                name="terms_accepted"
                checked={formData.terms_accepted || false}
                onChange={handleCheckboxChange}
                required
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">
                  He leído y acepto los{' '}
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setTermsModalOpen(true)}
                    sx={{ p: 0, minWidth: 'auto', textTransform: 'none', textDecoration: 'underline' }}
                  >
                    términos y condiciones
                  </Button>
                </Typography>
                {formData.terms_accepted && (
                  <Chip label="Aceptado" size="small" color="success" />
                )}
              </Box>
            }
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                name="privacy_policy_accepted"
                checked={formData.privacy_policy_accepted || false}
                onChange={handleCheckboxChange}
                required
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">
                  He leído y acepto la{' '}
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setPrivacyModalOpen(true)}
                    sx={{ p: 0, minWidth: 'auto', textTransform: 'none', textDecoration: 'underline' }}
                  >
                    política de privacidad
                  </Button>
                  {' '}ajustada a la Ley 1581 de 2012
                </Typography>
                {formData.privacy_policy_accepted && (
                  <Chip label="Aceptado" size="small" color="success" />
                )}
              </Box>
            }
          />
        </Grid>
      </Grid>

      {(!formData.terms_accepted || !formData.privacy_policy_accepted) && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Debes aceptar tanto los términos y condiciones como la política de privacidad para continuar.
          </Typography>
        </Alert>
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 800, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <CardContent>
          <Typography variant="h4" align="center" gutterBottom>
            Crear Cuenta
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Completa la información para crear tu cuenta en VeriHome
          </Typography>

          <form onSubmit={handleSubmit}>
            {/* Código de entrevista - siempre visible */}
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Código de Entrevista
              </Typography>
              <TextField
                fullWidth
                label="Código de Entrevista"
                name="interview_code"
                value={formatCodeDisplay(formData.interview_code)}
                onChange={handleInterviewCodeChange}
                required
                error={Boolean(codeValidation.message && !codeValidation.isValid)}
                helperText={
                  codeValidation.message || 
                  'Ingresa el código de entrevista válido proporcionado por el administrador'
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
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip 
                        title={
                          codeValidating ? "Validando código..." :
                          codeValidation.isValid ? "Código válido y verificado" :
                          formData.interview_code.length >= 8 ? "Haga clic para validar el código" :
                          "Ingrese el código completo para validar"
                        }
                        disableHoverListener={!formData.interview_code || codeValidating || formData.interview_code.length < 8}
                      >
                        <span>
                          <IconButton
                            onClick={() => validateInterviewCode(formData.interview_code)}
                            disabled={!formData.interview_code || codeValidating || formData.interview_code.length < 8}
                            size="small"
                            sx={{
                              color: codeValidation.isValid ? 'success.main' : 
                                     (formData.interview_code.length >= 8 ? 'primary.main' : 'action.disabled'),
                              '&:hover': {
                                backgroundColor: codeValidation.isValid ? 'success.light' : 'primary.light'
                              }
                            }}
                          >
                            {codeValidating ? (
                              <CircularProgress size={20} />
                            ) : codeValidation.isValid ? (
                              <CheckIcon />
                            ) : formData.interview_code.length >= 8 ? (
                              <SecurityIcon />
                            ) : (
                              <WarningIcon color="disabled" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </InputAdornment>
                  )
                }}
              />
            </Box>

            {/* Tipo de usuario - siempre visible */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Tipo de Usuario
              </Typography>
              <FormControl fullWidth required>
                <InputLabel>Tipo de usuario</InputLabel>
                <Select
                  name="user_type"
                  value={formData.user_type}
                  label="Tipo de usuario"
                  onChange={handleSelectChange}
                >
                  <MenuItem value="landlord">Arrendador</MenuItem>
                  <MenuItem value="tenant">Arrendatario</MenuItem>
                  <MenuItem value="service_provider">Prestador de Servicios</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Secciones expandibles */}
            {renderBasicInfo()}
            {renderLocationInfo()}
            {renderEmploymentInfo()}
            {renderUserTypeSpecificInfo()}
            {renderPreferences()}
            {renderTermsAndConditions()}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{ mt: 3 }}
              disabled={register.isPending || !formData.terms_accepted || !formData.privacy_policy_accepted || !codeValidation.isValid}
            >
              {register.isPending ? 'Registrando...' : 'Registrarse'}
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link
                component={RouterLink}
                to="/login"
                variant="body2"
              >
                ¿Ya tienes una cuenta? Inicia sesión
              </Link>
            </Box>
          </form>
        </CardContent>
      </Card>
      
      {/* Modales */}
      <TermsModal
        open={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        onAccept={handleTermsAccept}
      />
      
      <PrivacyModal
        open={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
        onAccept={handlePrivacyAccept}
      />
      
      {successModalOpen && (
        <SuccessModal
          open={successModalOpen}
          onClose={() => setSuccessModalOpen(false)}
          onRedirect={handleRedirect}
        />
      )}
    </Box>
  );
}; 