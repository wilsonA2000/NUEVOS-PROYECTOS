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
  Divider,
  Alert,
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
import { useNotification } from '../hooks/useNotification';

interface ResumeFormData {
  dateOfBirth: string;
  nationality: string;
  maritalStatus: string;
  dependents: number;
  educationLevel: string;
  institutionName: string;
  fieldOfStudy: string;
  graduationYear: number;
  gpa: number;
  currentEmployer: string;
  currentPosition: string;
  employmentType: string;
  startDate: string;
  endDate: string;
  monthlySalary: number;
  supervisorName: string;
  supervisorPhone: string;
  supervisorEmail: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  creditScore: number;
  monthlyExpenses: number;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  emergencyContactAddress: string;
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
  const { success, error } = useNotification();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [verificationScore, setVerificationScore] = useState(0);

  const [formData, setFormData] = useState<ResumeFormData>({
    dateOfBirth: '',
    nationality: 'Mexicana',
    maritalStatus: '',
    dependents: 0,
    educationLevel: '',
    institutionName: '',
    fieldOfStudy: '',
    graduationYear: 0,
    gpa: 0,
    currentEmployer: '',
    currentPosition: '',
    employmentType: '',
    startDate: '',
    endDate: '',
    monthlySalary: 0,
    supervisorName: '',
    supervisorPhone: '',
    supervisorEmail: '',
    bankName: '',
    accountType: '',
    accountNumber: '',
    creditScore: 0,
    monthlyExpenses: 0,
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    emergencyContactAddress: '',
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

  const fetchResume = async () => {
    try {
      setLoading(true);
      // Simular llamada a la API
      // En producción, esto sería una llamada real a la API
      const mockResume = {
        dateOfBirth: '1990-05-15',
        nationality: 'Mexicana',
        maritalStatus: 'Soltero',
        dependents: 0,
        educationLevel: 'Licenciatura',
        institutionName: 'Universidad Nacional Autónoma de México',
        fieldOfStudy: 'Ingeniería en Sistemas',
        graduationYear: 2015,
        gpa: 8.5,
        currentEmployer: 'Tech Solutions S.A.',
        currentPosition: 'Desarrollador Senior',
        employmentType: 'Tiempo completo',
        startDate: '2020-03-01',
        endDate: '',
        monthlySalary: 45000,
        supervisorName: 'María González',
        supervisorPhone: '+52 55 1234 5678',
        supervisorEmail: 'maria.gonzalez@techsolutions.com',
        bankName: 'Banco Azteca',
        accountType: 'Cuenta de cheques',
        accountNumber: '****1234',
        creditScore: 750,
        monthlyExpenses: 25000,
        emergencyContactName: 'Juan Pérez',
        emergencyContactPhone: '+52 55 9876 5432',
        emergencyContactRelation: 'Hermano',
        emergencyContactAddress: 'Av. Reforma 123, CDMX',
        reference1Name: 'Ana López',
        reference1Phone: '+52 55 1111 2222',
        reference1Email: 'ana.lopez@email.com',
        reference1Relation: 'Ex compañera de trabajo',
        reference2Name: 'Carlos Ruiz',
        reference2Phone: '+52 55 3333 4444',
        reference2Email: 'carlos.ruiz@email.com',
        reference2Relation: 'Amigo',
        evictionHistory: false,
        evictionDetails: '',
        criminalRecord: false,
        criminalRecordDetails: '',
      };

      setFormData(mockResume);
    } catch (err) {
      error('Error al cargar la hoja de vida');
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
    setVerificationScore(Math.round(percentage * 0.9)); // Simular puntuación de verificación
  };

  const handleChange = (field: keyof ResumeFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      success('Hoja de vida actualizada exitosamente');
      navigate('/resume');
    } catch (err) {
      error('Error al guardar la hoja de vida');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
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
                    <MenuItem value="Primaria">Primaria</MenuItem>
                    <MenuItem value="Secundaria">Secundaria</MenuItem>
                    <MenuItem value="Preparatoria">Preparatoria</MenuItem>
                    <MenuItem value="Licenciatura">Licenciatura</MenuItem>
                    <MenuItem value="Maestría">Maestría</MenuItem>
                    <MenuItem value="Doctorado">Doctorado</MenuItem>
                    <MenuItem value="Técnico">Técnico</MenuItem>
                    <MenuItem value="Otro">Otro</MenuItem>
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
                  value={formData.graduationYear}
                  onChange={(e) => handleChange('graduationYear', parseInt(e.target.value) || 0)}
                  inputProps={{ min: 1950, max: new Date().getFullYear() }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Promedio (GPA)"
                  type="number"
                  value={formData.gpa}
                  onChange={(e) => handleChange('gpa', parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 10, step: 0.01 }}
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
                    <MenuItem value="Tiempo completo">Tiempo completo</MenuItem>
                    <MenuItem value="Tiempo parcial">Tiempo parcial</MenuItem>
                    <MenuItem value="Por contrato">Por contrato</MenuItem>
                    <MenuItem value="Freelance">Freelance</MenuItem>
                    <MenuItem value="Temporal">Temporal</MenuItem>
                    <MenuItem value="Pasante">Pasante</MenuItem>
                    <MenuItem value="Trabajador independiente">Trabajador independiente</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Salario mensual"
                  type="number"
                  value={formData.monthlySalary}
                  onChange={(e) => handleChange('monthlySalary', parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Fecha de inicio"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Fecha de fin (opcional)"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre del supervisor"
                  value={formData.supervisorName}
                  onChange={(e) => handleChange('supervisorName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Teléfono del supervisor"
                  value={formData.supervisorPhone}
                  onChange={(e) => handleChange('supervisorPhone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
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
                  label="Número de cuenta"
                  value={formData.accountNumber}
                  onChange={(e) => handleChange('accountNumber', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Puntuación crediticia"
                  type="number"
                  value={formData.creditScore}
                  onChange={(e) => handleChange('creditScore', parseInt(e.target.value) || 0)}
                  inputProps={{ min: 300, max: 850 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Gastos mensuales"
                  type="number"
                  value={formData.monthlyExpenses}
                  onChange={(e) => handleChange('monthlyExpenses', parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 0.01 }}
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
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre del contacto"
                  value={formData.emergencyContactName}
                  onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Relación"
                  value={formData.emergencyContactRelation}
                  onChange={(e) => handleChange('emergencyContactRelation', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Dirección"
                  value={formData.emergencyContactAddress}
                  onChange={(e) => handleChange('emergencyContactAddress', e.target.value)}
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
              <Typography variant="h6">Referencias Personales</Typography>
            </Box>
            
            {/* Reference 1 */}
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Referencia 1
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre"
                  value={formData.reference1Name}
                  onChange={(e) => handleChange('reference1Name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={formData.reference1Phone}
                  onChange={(e) => handleChange('reference1Phone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.reference1Email}
                  onChange={(e) => handleChange('reference1Email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Relación"
                  value={formData.reference1Relation}
                  onChange={(e) => handleChange('reference1Relation', e.target.value)}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Reference 2 */}
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Referencia 2 (opcional)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre"
                  value={formData.reference2Name}
                  onChange={(e) => handleChange('reference2Name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={formData.reference2Phone}
                  onChange={(e) => handleChange('reference2Phone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.reference2Email}
                  onChange={(e) => handleChange('reference2Email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
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
              <DescriptionIcon sx={{ mr: 1 }} />
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
            onClick={() => navigate('/resume')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </Box>
      </form>
    </Container>
  );
};

export default ResumeEdit; 