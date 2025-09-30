import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Avatar,
  Box,
  Divider,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  IconButton,
  Card,
  CardContent,
  InputAdornment,
  Tabs,
  Tab,
  Chip,
  Tooltip,
  CircularProgress,
  Snackbar,
  LinearProgress,
} from '@mui/material';
import {
  PhotoCamera as CameraIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  Business as BusinessIcon,
  AttachMoney as MoneyIcon,
  Home as HomeIcon,
  Pets as PetsIcon,
  FamilyRestroom as FamilyIcon,
  CheckCircle as VerifiedIcon,
  Info as InfoIcon,
  TrendingUp as ProgressIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { api } from '../../services/api';
import { formatDate } from '../../utils/formatters';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { success, error: showError } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [originalData, setOriginalData] = useState<any>({});
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());

  // Función para calcular el porcentaje de completitud
  const calculateCompletionPercentage = (data: any): number => {
    const requiredFields = [
      'first_name', 'last_name', 'phone_number', 'date_of_birth', 'gender',
      'nationality', 'marital_status', 'country', 'state', 'city', 
      'current_address', 'employment_status', 'monthly_income'
    ];
    
    const roleSpecificFields: { [key: string]: string[] } = {
      landlord: ['total_properties', 'years_experience'],
      tenant: ['budget_range', 'family_size'],
      service_provider: ['service_category', 'hourly_rate', 'business_name']
    };
    
    const userType = user?.user_type || 'tenant';
    const allRequiredFields = [
      ...requiredFields, 
      ...(roleSpecificFields[userType] || [])
    ];
    
    const completedFields = allRequiredFields.filter(field => {
      const value = data[field];
      return value !== null && value !== '' && value !== undefined && value !== 0;
    });
    
    return Math.round((completedFields.length / allRequiredFields.length) * 100);
  };

  const [formData, setFormData] = useState({
    // Información básica
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    whatsapp: '',
    date_of_birth: '',
    gender: '',
    nationality: 'Colombiana',
    marital_status: '',
    
    // Ubicación
    country: 'Colombia',
    state: '',
    city: '',
    postal_code: '',
    current_address: '',
    
    // Información laboral
    employment_status: '',
    monthly_income: 0,
    currency: 'COP',
    employer_name: '',
    job_title: '',
    years_employed: 0,
    
    // Información adicional
    family_size: 1,
    pets: false,
    rental_history: false,
    
    // Específico por tipo de usuario
    // Arrendador
    total_properties: 0,
    years_experience: 0,
    company_name: '',
    
    // Prestador de servicios
    business_name: '',
    service_category: '',
    hourly_rate: 0,
    hourly_rate_currency: 'COP',
    
    // Arrendatario
    budget_range: 'medium',
    move_in_date: '',
    
    // Marketing
    source: 'direct',
    marketing_consent: false,
  });

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/profile/');
      const userData = response.data;
      
      const profileData = {
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone_number: userData.phone_number || '',
        whatsapp: userData.whatsapp || '',
        date_of_birth: userData.date_of_birth || '',
        gender: userData.gender || '',
        nationality: userData.nationality || 'Colombiana',
        marital_status: userData.marital_status || '',
        country: userData.country || 'Colombia',
        state: userData.state || '',
        city: userData.city || '',
        postal_code: userData.postal_code || '',
        current_address: userData.current_address || '',
        employment_status: userData.employment_status || '',
        monthly_income: userData.monthly_income || 0,
        currency: userData.currency || 'COP',
        employer_name: userData.employer_name || '',
        job_title: userData.job_title || '',
        years_employed: userData.years_employed || 0,
        family_size: userData.family_size || 1,
        pets: userData.pets || false,
        rental_history: userData.rental_history || false,
        total_properties: userData.total_properties || 0,
        years_experience: userData.years_experience || 0,
        company_name: userData.company_name || '',
        business_name: userData.business_name || '',
        service_category: userData.service_category || '',
        hourly_rate: userData.hourly_rate || 0,
        hourly_rate_currency: userData.hourly_rate_currency || 'COP',
        budget_range: userData.budget_range || 'medium',
        move_in_date: userData.move_in_date || '',
        source: userData.source || 'direct',
        marketing_consent: userData.marketing_consent || false,
      };
      
      setFormData(profileData);
      setOriginalData(profileData); // Guardar datos originales
      setModifiedFields(new Set()); // Limpiar campos modificados
      
      if (userData.avatar) {
        setAvatarPreview(`http://localhost:8001${userData.avatar}`);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showError('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let newValue: any;
    if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      newValue = parseFloat(value) || 0;
    } else {
      newValue = value;
    }
    
    // Actualizar formData
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    // Trackear campo modificado si es diferente del valor original
    if (originalData[name] !== newValue) {
      setModifiedFields(prev => new Set(prev).add(name));
    } else {
      setModifiedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(name);
        return newSet;
      });
    }
  };

  const handleSelectChange = (name: string) => (event: any) => {
    const newValue = event.target.value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    // Trackear campo modificado si es diferente del valor original
    if (originalData[name] !== newValue) {
      setModifiedFields(prev => new Set(prev).add(name));
    } else {
      setModifiedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(name);
        return newSet;
      });
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        
        // Upload to server
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', file);
        await api.post('/users/avatar/', avatarFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        success('Avatar actualizado correctamente');
      } catch (error) {
        console.error('Error uploading avatar:', error);
        showError('Error al subir el avatar');
        setAvatarPreview(null); // Reset preview on error
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Solo enviar campos que han sido modificados
      const modifiedData: any = {};
      modifiedFields.forEach(fieldName => {
        let value = formData[fieldName];
        
        // Convertir strings vacíos a null para fechas
        if ((fieldName === 'move_in_date' || fieldName === 'date_of_birth') && value === '') {
          value = null;
        }
        
        // Campos que aceptan strings vacíos (blank=True en el modelo)
        const blankStringFields = [
          'postal_code', 'current_address', 'employer_name', 'job_title', 
          'company_name', 'business_name', 'service_category'
        ];
        
        // Convertir null a string vacío para campos que solo aceptan blank=True
        if (blankStringFields.includes(fieldName) && (value === null || value === undefined)) {
          value = '';
        }
        
        modifiedData[fieldName] = value;
      });
      
      // Si no hay campos modificados, mostrar mensaje
      if (Object.keys(modifiedData).length === 0) {
        showError('No hay cambios para guardar');
        setLoading(false);
        return;
      }
      
      console.log('Campos modificados a enviar:', JSON.stringify(modifiedData, null, 2));
      console.log('Número de campos modificados:', Object.keys(modifiedData).length);
      
      await api.patch('/users/profile/', modifiedData);
      
      // Actualizar datos originales con los nuevos valores
      setOriginalData(prev => ({ ...prev, ...modifiedData }));
      setModifiedFields(new Set()); // Limpiar campos modificados
      
      setSaveSuccess(true);
      success('Perfil actualizado correctamente');
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      console.log('Error response data:', error.response?.data);
      showError('Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(originalData); // Restaurar datos originales
    setModifiedFields(new Set()); // Limpiar campos modificados
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading && !formData.email) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <Box position="relative" mr={3}>
              <Avatar
                src={avatarPreview || undefined}
                alt={`${formData.first_name} ${formData.last_name}`}
                sx={{ width: 100, height: 100 }}
              />
              {isEditing && (
                <>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="avatar-upload"
                    type="file"
                    onChange={handleAvatarChange}
                  />
                  <label htmlFor="avatar-upload">
                    <IconButton
                      color="primary"
                      aria-label="upload picture"
                      component="span"
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'background.paper' },
                      }}
                    >
                      <CameraIcon />
                    </IconButton>
                  </label>
                </>
              )}
            </Box>
            <Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h4">
                  {formData.first_name} {formData.last_name}
                </Typography>
                {user?.is_verified && (
                  <Tooltip title="Usuario Verificado">
                    <VerifiedIcon color="success" />
                  </Tooltip>
                )}
              </Box>
              <Typography variant="body1" color="text.secondary">
                {formData.email}
              </Typography>
              <Box display="flex" gap={1} mt={1}>
                <Chip 
                  label={user?.user_type || 'Usuario'} 
                  size="small" 
                  color="primary" 
                />
                {user?.interview_code && (
                  <Chip 
                    label={`Rating: ${user.initial_rating}/10`} 
                    size="small" 
                    variant="outlined" 
                  />
                )}
              </Box>
              
              {/* Barra de progreso de completitud */}
              <Box mt={2} width="100%" maxWidth={400}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <ProgressIcon color="action" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    Completitud del perfil: {calculateCompletionPercentage(formData)}%
                  </Typography>
                  {isEditing && modifiedFields.size > 0 && (
                    <Chip 
                      label={`${modifiedFields.size} cambio${modifiedFields.size !== 1 ? 's' : ''} pendiente${modifiedFields.size !== 1 ? 's' : ''}`}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  )}
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={calculateCompletionPercentage(formData)} 
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      backgroundColor: calculateCompletionPercentage(formData) === 100 
                        ? '#4caf50' 
                        : calculateCompletionPercentage(formData) >= 70 
                        ? '#ff9800' 
                        : '#f44336'
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {calculateCompletionPercentage(formData) === 100 
                    ? '¡Perfil completo! 🎉' 
                    : `Completa tu perfil para mejorar tu visibilidad`
                  }
                </Typography>
              </Box>
            </Box>
          </Box>
          
          <Box>
            {isEditing ? (
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSubmit}
                  disabled={loading || modifiedFields.size === 0}
                >
                  Guardar {modifiedFields.size > 0 && `(${modifiedFields.size} ${modifiedFields.size === 1 ? 'campo' : 'campos'})`}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </Box>
            ) : (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setIsEditing(true)}
              >
                Editar Perfil
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Success Alert */}
      <Snackbar
        open={saveSuccess}
        autoHideDuration={3000}
        onClose={() => setSaveSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          ¡Perfil actualizado exitosamente!
        </Alert>
      </Snackbar>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTabs-flexContainer': {
              gap: 1,
            },
            '& .MuiTab-root': {
              minWidth: 'auto',
              textTransform: 'none',
              fontSize: '0.875rem',
              px: 2,
            },
          }}
        >
          <Tab label="Personal" icon={<PersonIcon />} iconPosition="start" />
          <Tab label="Ubicación" icon={<LocationIcon />} iconPosition="start" />
          <Tab label="Laboral" icon={<WorkIcon />} iconPosition="start" />
          {user?.user_type === 'landlord' && (
            <Tab label="Arrendador" icon={<BusinessIcon />} iconPosition="start" />
          )}
          {user?.user_type === 'tenant' && (
            <Tab label="Arrendatario" icon={<HomeIcon />} iconPosition="start" />
          )}
          {user?.user_type === 'service_provider' && (
            <Tab label="Servicios" icon={<BusinessIcon />} iconPosition="start" />
          )}
        </Tabs>
      </Paper>

      <form onSubmit={handleSubmit}>
        {/* Personal Information Tab */}
        <TabPanel value={tabValue} index={0}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Información Personal
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nombre"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Apellidos"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  disabled={!isEditing}
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
                  disabled
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="El email no puede ser modificado">
                          <InfoIcon color="action" fontSize="small" />
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="WhatsApp"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  disabled={!isEditing}
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
                  disabled={!isEditing}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!isEditing}>
                  <InputLabel>Género</InputLabel>
                  <Select
                    name="gender"
                    value={formData.gender}
                    onChange={handleSelectChange('gender')}
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
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!isEditing}>
                  <InputLabel>Estado Civil</InputLabel>
                  <Select
                    name="marital_status"
                    value={formData.marital_status}
                    onChange={handleSelectChange('marital_status')}
                  >
                    <MenuItem value="single">Soltero/a</MenuItem>
                    <MenuItem value="married">Casado/a</MenuItem>
                    <MenuItem value="divorced">Divorciado/a</MenuItem>
                    <MenuItem value="widowed">Viudo/a</MenuItem>
                    <MenuItem value="other">Otro</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Tamaño de Familia"
                  name="family_size"
                  type="number"
                  value={formData.family_size}
                  onChange={handleChange}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FamilyIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="center" height="100%">
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="pets"
                        checked={formData.pets}
                        onChange={handleChange}
                        disabled={!isEditing}
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <PetsIcon />
                        <span>Tiene mascotas</span>
                      </Box>
                    }
                  />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="rental_history"
                      checked={formData.rental_history}
                      onChange={handleChange}
                      disabled={!isEditing}
                    />
                  }
                  label="Tiene historial de arrendamiento previo"
                />
              </Grid>
            </Grid>
          </Paper>
        </TabPanel>

        {/* Location Tab */}
        <TabPanel value={tabValue} index={1}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Información de Ubicación
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="País"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Estado/Departamento"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ciudad"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Código Postal"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Dirección Actual"
                  name="current_address"
                  value={formData.current_address}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </Grid>
            </Grid>
          </Paper>
        </TabPanel>

        {/* Employment Tab */}
        <TabPanel value={tabValue} index={2}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Información Laboral
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!isEditing}>
                  <InputLabel>Estado Laboral</InputLabel>
                  <Select
                    name="employment_status"
                    value={formData.employment_status}
                    onChange={handleSelectChange('employment_status')}
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
                  label="Ingresos Mensuales"
                  name="monthly_income"
                  type="number"
                  value={formData.monthly_income}
                  onChange={handleChange}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MoneyIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nombre del Empleador"
                  name="employer_name"
                  value={formData.employer_name}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Cargo"
                  name="job_title"
                  value={formData.job_title}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Años de Empleo"
                  name="years_employed"
                  type="number"
                  value={formData.years_employed}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!isEditing}>
                  <InputLabel>Moneda</InputLabel>
                  <Select
                    name="currency"
                    value={formData.currency}
                    onChange={handleSelectChange('currency')}
                  >
                    <MenuItem value="COP">Pesos Colombianos</MenuItem>
                    <MenuItem value="USD">Dólares Americanos</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </TabPanel>

        {/* Landlord Information Tab */}
        {user?.user_type === 'landlord' && (
          <TabPanel value={tabValue} index={3}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Información como Arrendador
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Total de Propiedades"
                    name="total_properties"
                    type="number"
                    value={formData.total_properties}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Años de Experiencia"
                    name="years_experience"
                    type="number"
                    value={formData.years_experience}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nombre de la Empresa"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    helperText="Si administra propiedades a través de una empresa"
                  />
                </Grid>
              </Grid>
            </Paper>
          </TabPanel>
        )}

        {/* Tenant Preferences Tab */}
        {user?.user_type === 'tenant' && (
          <TabPanel value={tabValue} index={3}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Preferencias como Arrendatario
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!isEditing}>
                    <InputLabel>Rango de Presupuesto</InputLabel>
                    <Select
                      name="budget_range"
                      value={formData.budget_range}
                      onChange={handleSelectChange('budget_range')}
                    >
                      <MenuItem value="low">Económico</MenuItem>
                      <MenuItem value="medium">Medio</MenuItem>
                      <MenuItem value="high">Alto</MenuItem>
                      <MenuItem value="luxury">Premium</MenuItem>
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
                    disabled={!isEditing}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </TabPanel>
        )}

        {/* Service Provider Information Tab */}
        {user?.user_type === 'service_provider' && (
          <TabPanel value={tabValue} index={3}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Información como Prestador de Servicios
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nombre del Negocio"
                    name="business_name"
                    value={formData.business_name}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!isEditing}>
                    <InputLabel>Categoría de Servicio</InputLabel>
                    <Select
                      name="service_category"
                      value={formData.service_category}
                      onChange={handleSelectChange('service_category')}
                    >
                      <MenuItem value="maintenance">Mantenimiento</MenuItem>
                      <MenuItem value="cleaning">Limpieza</MenuItem>
                      <MenuItem value="security">Seguridad</MenuItem>
                      <MenuItem value="gardening">Jardinería</MenuItem>
                      <MenuItem value="electrical">Electricidad</MenuItem>
                      <MenuItem value="plumbing">Plomería</MenuItem>
                      <MenuItem value="painting">Pintura</MenuItem>
                      <MenuItem value="moving">Mudanzas</MenuItem>
                      <MenuItem value="other">Otro</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Tarifa por Hora"
                    name="hourly_rate"
                    type="number"
                    value={formData.hourly_rate}
                    onChange={handleChange}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MoneyIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!isEditing}>
                    <InputLabel>Moneda de Tarifa</InputLabel>
                    <Select
                      name="hourly_rate_currency"
                      value={formData.hourly_rate_currency}
                      onChange={handleSelectChange('hourly_rate_currency')}
                    >
                      <MenuItem value="COP">Pesos Colombianos</MenuItem>
                      <MenuItem value="USD">Dólares Americanos</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>
          </TabPanel>
        )}
      </form>

      {/* Marketing Section (siempre al final) */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Preferencias de Marketing
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={!isEditing}>
              <InputLabel>¿Cómo nos conociste?</InputLabel>
              <Select
                name="source"
                value={formData.source}
                onChange={handleSelectChange('source')}
              >
                <MenuItem value="direct">Directo</MenuItem>
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
                  checked={formData.marketing_consent}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              }
              label="Acepto recibir comunicaciones de marketing y novedades de VeriHome"
            />
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Profile;