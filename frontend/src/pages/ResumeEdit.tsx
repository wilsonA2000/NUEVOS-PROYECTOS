import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  AccountBalance as BankIcon,
  ContactPhone as ContactIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

// Interfaz simplificada
interface ResumeFormData {
  dateOfBirth: string;
  nationality: string;
  maritalStatus: string;
  dependents: number;
  educationLevel: string;
  institutionName: string;
  fieldOfStudy: string;
  graduationYear: number;
  currentEmployer: string;
  currentPosition: string;
  employmentType: string;
  monthlySalary: number;
  supervisorName: string;
  supervisorPhone: string;
  supervisorEmail: string;
  bankName: string;
  accountType: string;
  creditScore: number;
  monthlyExpenses: number;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  reference1Name: string;
  reference1Phone: string;
  reference1Email: string;
  reference1Relation: string;
  reference2Name: string;
  reference2Phone: string;
  reference2Email: string;
  reference2Relation: string;
  evictionHistory: boolean;
  evictionDetails: string;
  criminalRecord: boolean;
  criminalRecordDetails: string;
}

const ResumeEdit: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [verificationScore, setVerificationScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ResumeFormData>({
    dateOfBirth: '',
    nationality: 'Colombiana',
    maritalStatus: '',
    dependents: 0,
    educationLevel: '',
    institutionName: '',
    fieldOfStudy: '',
    graduationYear: 0,
    currentEmployer: '',
    currentPosition: '',
    employmentType: '',
    monthlySalary: 0,
    supervisorName: '',
    supervisorPhone: '',
    supervisorEmail: '',
    bankName: '',
    accountType: '',
    creditScore: 0,
    monthlyExpenses: 0,
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    reference1Name: '',
    reference1Phone: '',
    reference1Email: '',
    reference1Relation: '',
    reference2Name: '',
    reference2Phone: '',
    reference2Email: '',
    reference2Relation: '',
    evictionHistory: false,
    evictionDetails: '',
    criminalRecord: false,
    criminalRecordDetails: '',
  });

  useEffect(() => {
    fetchResume();
  }, []);

  useEffect(() => {
    calculateCompletion();
  }, [formData]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    // Implementación simple de notificación sin depender de hooks externos
    if (type === 'error') {
      setError(message);
    } else {
      setError(null);
      // Podrías usar alert temporal o implementar una notificación simple
      console.log('✅', message);
    }
  };

  const fetchResume = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Usar el servicio API con autenticación JWT
      const response = await api.get('/users/resume/');
      const resume = response.data;
        
        // Mapear los datos de la API al formato del formulario
        const mappedData = {
          dateOfBirth: resume.date_of_birth || '',
          nationality: resume.nationality || 'Colombiana',
          maritalStatus: resume.marital_status || '',
          dependents: resume.dependents || 0,
          educationLevel: resume.education_level || '',
          institutionName: resume.institution_name || '',
          fieldOfStudy: resume.field_of_study || '',
          graduationYear: resume.graduation_year || 0,
          currentEmployer: resume.current_employer || '',
          currentPosition: resume.current_position || '',
          employmentType: resume.employment_type || '',
          monthlySalary: resume.monthly_salary || 0,
          supervisorName: resume.supervisor_name || '',
          supervisorPhone: resume.supervisor_phone || '',
          supervisorEmail: resume.supervisor_email || '',
          bankName: resume.bank_name || '',
          accountType: resume.account_type || '',
          creditScore: resume.credit_score || 0,
          monthlyExpenses: resume.monthly_expenses || 0,
          emergencyContactName: resume.emergency_contact_name || '',
          emergencyContactPhone: resume.emergency_contact_phone || '',
          emergencyContactRelation: resume.emergency_contact_relation || '',
          reference1Name: resume.reference1_name || '',
          reference1Phone: resume.reference1_phone || '',
          reference1Email: resume.reference1_email || '',
          reference1Relation: resume.reference1_relation || '',
          reference2Name: resume.reference2_name || '',
          reference2Phone: resume.reference2_phone || '',
          reference2Email: resume.reference2_email || '',
          reference2Relation: resume.reference2_relation || '',
          evictionHistory: resume.eviction_history || false,
          evictionDetails: resume.eviction_details || '',
          criminalRecord: resume.criminal_record || false,
          criminalRecordDetails: resume.criminal_record_details || '',
        };

      setFormData(mappedData);
      setVerificationScore(resume.verification_score || 0);
    } catch (err: any) {
      console.error('Error loading resume:', err);
      if (err.response?.status === 404) {
        console.log('No existe resume, mostrando formulario vacío');
        setError(null);
      } else {
        setError('Error al cargar la hoja de vida: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletion = () => {
    const requiredFields = [
      'dateOfBirth', 'nationality', 'educationLevel', 'currentEmployer',
      'currentPosition', 'monthlySalary', 'emergencyContactName',
      'emergencyContactPhone', 'reference1Name', 'reference1Phone'
    ];

    const completed = requiredFields.filter(field => {
      const value = formData[field as keyof ResumeFormData];
      return value && value !== '' && value !== 0;
    }).length;

    const percentage = Math.round((completed / requiredFields.length) * 100);
    setCompletionPercentage(percentage);
    setVerificationScore(Math.round(percentage * 0.9));
  };

  const handleChange = (field: keyof ResumeFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Función para formatear números de teléfono (máximo 15 caracteres para cumplir con el modelo)
  const formatPhoneNumber = (phone: string | undefined): string => {
    if (!phone) return '';
    // Remover espacios y limitar a 15 caracteres
    return phone.replace(/\s+/g, '').slice(0, 15);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      
      // Mapear los datos del formulario al formato de la API
      const resumeData = {
        date_of_birth: formData.dateOfBirth || null,
        nationality: formData.nationality,
        marital_status: formData.maritalStatus,
        dependents: formData.dependents,
        education_level: formData.educationLevel,
        institution_name: formData.institutionName,
        field_of_study: formData.fieldOfStudy,
        graduation_year: formData.graduationYear || null,
        current_employer: formData.currentEmployer,
        current_position: formData.currentPosition,
        employment_type: formData.employmentType,
        monthly_salary: formData.monthlySalary || null,
        supervisor_name: formData.supervisorName,
        supervisor_phone: formatPhoneNumber(formData.supervisorPhone),
        supervisor_email: formData.supervisorEmail,
        bank_name: formData.bankName,
        account_type: formData.accountType,
        credit_score: formData.creditScore || null,
        monthly_expenses: formData.monthlyExpenses || null,
        emergency_contact_name: formData.emergencyContactName,
        emergency_contact_phone: formatPhoneNumber(formData.emergencyContactPhone),
        emergency_contact_relation: formData.emergencyContactRelation,
        reference1_name: formData.reference1Name,
        reference1_phone: formatPhoneNumber(formData.reference1Phone),
        reference1_email: formData.reference1Email,
        reference1_relation: formData.reference1Relation,
        reference2_name: formData.reference2Name,
        reference2_phone: formatPhoneNumber(formData.reference2Phone),
        reference2_email: formData.reference2Email,
        reference2_relation: formData.reference2Relation,
        eviction_history: formData.evictionHistory,
        eviction_details: formData.evictionDetails,
        criminal_record: formData.criminalRecord,
        criminal_record_details: formData.criminalRecordDetails,
      };

      // Intentar actualizar primero
      try {
        await api.put('/users/resume/', resumeData);
        showNotification('Hoja de vida actualizada exitosamente', 'success');
        navigate('/app/resume');
      } catch (updateError: any) {
        // Si el update falla (404), intentar crear
        if (updateError.response?.status === 404) {
          await api.post('/users/resume/', resumeData);
          showNotification('Hoja de vida creada exitosamente', 'success');
          navigate('/app/resume');
        } else {
          throw updateError;
        }
      }
      
    } catch (err: any) {
      console.error('Error saving resume:', err);
      showNotification('Error al guardar la hoja de vida: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box textAlign="center">
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Cargando hoja de vida...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Editar Hoja de Vida
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Completa tu información para una verificación más precisa
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={2}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                {completionPercentage}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completado
              </Typography>
            </Box>
            
            <Box textAlign="center">
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {verificationScore}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verificado
              </Typography>
            </Box>
          </Box>
        </Box>
        
        {/* Progress Bar */}
        <Box>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Progreso de completitud
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {completionPercentage}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={completionPercentage}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={3}>
              <PersonIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Información Personal</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Fecha de nacimiento"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nacionalidad"
                  value={formData.nationality}
                  onChange={(e) => handleChange('nationality', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Estado civil"
                  value={formData.maritalStatus}
                  onChange={(e) => handleChange('maritalStatus', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Número de dependientes"
                  type="number"
                  value={formData.dependents}
                  onChange={(e) => handleChange('dependents', parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 20 }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Educational Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={3}>
              <SchoolIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Información Educativa</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Nivel educativo</InputLabel>
                  <Select
                    value={formData.educationLevel}
                    label="Nivel educativo"
                    onChange={(e) => handleChange('educationLevel', e.target.value)}
                  >
                    <MenuItem value="primary">Primaria</MenuItem>
                    <MenuItem value="secondary">Secundaria</MenuItem>
                    <MenuItem value="high_school">Preparatoria</MenuItem>
                    <MenuItem value="bachelor">Licenciatura</MenuItem>
                    <MenuItem value="master">Maestría</MenuItem>
                    <MenuItem value="doctorate">Doctorado</MenuItem>
                    <MenuItem value="technical">Técnico</MenuItem>
                    <MenuItem value="other">Otro</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Institución"
                  value={formData.institutionName}
                  onChange={(e) => handleChange('institutionName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Campo de estudio"
                  value={formData.fieldOfStudy}
                  onChange={(e) => handleChange('fieldOfStudy', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Año de graduación"
                  type="number"
                  value={formData.graduationYear || ''}
                  onChange={(e) => handleChange('graduationYear', parseInt(e.target.value) || 0)}
                  inputProps={{ min: 1950, max: new Date().getFullYear() }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={3}>
              <WorkIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Información Laboral</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Empleador actual"
                  value={formData.currentEmployer}
                  onChange={(e) => handleChange('currentEmployer', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Cargo actual"
                  value={formData.currentPosition}
                  onChange={(e) => handleChange('currentPosition', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de empleo</InputLabel>
                  <Select
                    value={formData.employmentType}
                    label="Tipo de empleo"
                    onChange={(e) => handleChange('employmentType', e.target.value)}
                  >
                    <MenuItem value="full_time">Tiempo completo</MenuItem>
                    <MenuItem value="part_time">Tiempo parcial</MenuItem>
                    <MenuItem value="contract">Por contrato</MenuItem>
                    <MenuItem value="freelance">Freelance</MenuItem>
                    <MenuItem value="temporary">Temporal</MenuItem>
                    <MenuItem value="internship">Pasante</MenuItem>
                    <MenuItem value="self_employed">Trabajador independiente</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Salario mensual (COP)"
                  type="number"
                  value={formData.monthlySalary || ''}
                  onChange={(e) => handleChange('monthlySalary', parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 1000 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Nombre del supervisor"
                  value={formData.supervisorName}
                  onChange={(e) => handleChange('supervisorName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Teléfono del supervisor"
                  value={formData.supervisorPhone}
                  onChange={(e) => handleChange('supervisorPhone', e.target.value)}
                  inputProps={{ maxLength: 15 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Email del supervisor"
                  type="email"
                  value={formData.supervisorEmail}
                  onChange={(e) => handleChange('supervisorEmail', e.target.value)}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={3}>
              <BankIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Información Financiera</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre del banco"
                  value={formData.bankName}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tipo de cuenta"
                  value={formData.accountType}
                  onChange={(e) => handleChange('accountType', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Gastos mensuales (COP)"
                  type="number"
                  value={formData.monthlyExpenses || ''}
                  onChange={(e) => handleChange('monthlyExpenses', parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 1000 }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={3}>
              <ContactIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Contacto de Emergencia</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Nombre del contacto"
                  value={formData.emergencyContactName}
                  onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                  inputProps={{ maxLength: 15 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Relación"
                  value={formData.emergencyContactRelation}
                  onChange={(e) => handleChange('emergencyContactRelation', e.target.value)}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* References */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={3}>
              <PersonIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Referencias</Typography>
            </Box>
            
            {/* Reference 1 - Personal */}
            <Typography variant="subtitle1" color="primary" gutterBottom sx={{ mt: 2, fontWeight: 600 }}>
              Referencia Personal
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Nombre"
                  value={formData.reference1Name}
                  onChange={(e) => handleChange('reference1Name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={formData.reference1Phone}
                  onChange={(e) => handleChange('reference1Phone', e.target.value)}
                  inputProps={{ maxLength: 15 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.reference1Email}
                  onChange={(e) => handleChange('reference1Email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Relación"
                  value={formData.reference1Relation}
                  onChange={(e) => handleChange('reference1Relation', e.target.value)}
                />
              </Grid>
            </Grid>

            {/* Reference 2 - Familiar */}
            <Typography variant="subtitle1" color="primary" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
              Referencia Familiar
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Nombre"
                  value={formData.reference2Name}
                  onChange={(e) => handleChange('reference2Name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={formData.reference2Phone}
                  onChange={(e) => handleChange('reference2Phone', e.target.value)}
                  inputProps={{ maxLength: 15 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.reference2Email}
                  onChange={(e) => handleChange('reference2Email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Relación"
                  value={formData.reference2Relation}
                  onChange={(e) => handleChange('reference2Relation', e.target.value)}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={3}>
              <DocumentIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Información Adicional</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.evictionHistory}
                      onChange={(e) => handleChange('evictionHistory', e.target.checked)}
                    />
                  }
                  label="¿Tiene historial de desalojo?"
                />
              </Grid>
              {formData.evictionHistory && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Detalles del desalojo"
                    multiline
                    rows={3}
                    value={formData.evictionDetails}
                    onChange={(e) => handleChange('evictionDetails', e.target.value)}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.criminalRecord}
                      onChange={(e) => handleChange('criminalRecord', e.target.checked)}
                    />
                  }
                  label="¿Tiene antecedentes penales?"
                />
              </Grid>
              {formData.criminalRecord && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Detalles de antecedentes penales"
                    multiline
                    rows={3}
                    value={formData.criminalRecordDetails}
                    onChange={(e) => handleChange('criminalRecordDetails', e.target.value)}
                  />
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={() => navigate('/app/resume')}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saving}
          >
            {saving ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </Box>
      </form>
    </Container>
  );
};

export default ResumeEdit;