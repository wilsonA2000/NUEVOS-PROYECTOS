import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  AccountBalance as BankIcon,
  ContactPhone as ContactIcon,
  Description as DocumentIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../hooks/useNotification';
import { api } from '../services/api';

interface ResumeData {
  id: string;
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
  endDate?: string;
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
  reference2Name?: string;
  reference2Phone?: string;
  reference2Email?: string;
  reference2Relation?: string;
  evictionHistory: boolean;
  evictionDetails?: string;
  criminalRecord: boolean;
  criminalRecordDetails?: string;
  completionPercentage: number;
  verificationScore: number;
  documentCounts: {
    pending: number;
    verified: number;
    rejected: number;
    expired: number;
  };
}

const Resume: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { error } = useNotification();
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResume();
  }, []);

  const fetchResume = async () => {
    try {
      setLoading(true);
      
      // Llamada real a la API
      const response = await api.get('/users/resume/');
      const resumeData = response.data;
      
      // Mapear los datos de la API al formato del componente
      const mappedResume: ResumeData = {
        id: resumeData.id || 'new',
        dateOfBirth: resumeData.date_of_birth || '',
        nationality: resumeData.nationality || 'Colombiana',
        maritalStatus: resumeData.marital_status || '',
        dependents: resumeData.dependents || 0,
        educationLevel: resumeData.education_level || '',
        institutionName: resumeData.institution_name || '',
        fieldOfStudy: resumeData.field_of_study || '',
        graduationYear: resumeData.graduation_year || 0,
        gpa: resumeData.gpa || 0,
        currentEmployer: resumeData.current_employer || '',
        currentPosition: resumeData.current_position || '',
        employmentType: resumeData.employment_type || '',
        startDate: resumeData.start_date || '',
        monthlySalary: resumeData.monthly_salary || 0,
        supervisorName: resumeData.supervisor_name || '',
        supervisorPhone: resumeData.supervisor_phone || '',
        supervisorEmail: resumeData.supervisor_email || '',
        bankName: resumeData.bank_name || '',
        accountType: resumeData.account_type || '',
        accountNumber: resumeData.account_number || '',
        creditScore: resumeData.credit_score || 0,
        monthlyExpenses: resumeData.monthly_expenses || 0,
        emergencyContactName: resumeData.emergency_contact_name || '',
        emergencyContactPhone: resumeData.emergency_contact_phone || '',
        emergencyContactRelation: resumeData.emergency_contact_relation || '',
        emergencyContactAddress: resumeData.emergency_contact_address || '',
        reference1Name: resumeData.reference1_name || '',
        reference1Phone: resumeData.reference1_phone || '',
        reference1Email: resumeData.reference1_email || '',
        reference1Relation: resumeData.reference1_relation || '',
        reference2Name: resumeData.reference2_name || '',
        reference2Phone: resumeData.reference2_phone || '',
        reference2Email: resumeData.reference2_email || '',
        reference2Relation: resumeData.reference2_relation || '',
        evictionHistory: resumeData.eviction_history || false,
        evictionDetails: resumeData.eviction_details || '',
        criminalRecord: resumeData.criminal_record || false,
        criminalRecordDetails: resumeData.criminal_record_details || '',
        completionPercentage: resumeData.verification_score || 0,
        verificationScore: resumeData.verification_score || 0,
        documentCounts: {
          pending: 2,  // Estos podrían calcularse de los documentos reales
          verified: 3,
          rejected: 0,
          expired: 1,
        },
      };
      
      setResume(mappedResume);
    } catch (err: any) {
      console.error('Error loading resume:', err);
      if (err.response?.status === 404) {
        // Si no existe resume, mostrar mensaje apropiado
        console.log('No existe resume, usuario debe crear uno');
        setResume(null);
      } else {
        error('Error al cargar la hoja de vida: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const getDocumentStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckIcon color="success" />;
      case 'pending':
        return <PendingIcon color="warning" />;
      case 'rejected':
        return <ErrorIcon color="error" />;
      case 'expired':
        return <ScheduleIcon color="action" />;
      default:
        return <PendingIcon color="action" />;
    }
  };

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      case 'expired':
        return 'default';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  if (!resume) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            No tienes hoja de vida
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Crea tu hoja de vida para mejorar tu perfil en la plataforma
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<EditIcon />}
            onClick={() => navigate('/app/resume/edit')}
          >
            Crear Hoja de Vida
          </Button>
        </Paper>
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
              Mi Hoja de Vida
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Información detallada para verificación en la plataforma
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={2}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                {resume.completionPercentage}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completado
              </Typography>
            </Box>
            
            <Box textAlign="center">
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {resume.verificationScore}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verificado
              </Typography>
            </Box>
            
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate('/app/resume/edit')}
            >
              Editar
            </Button>
          </Box>
        </Box>
        
        {/* Progress Bar */}
        <Box>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Progreso de completitud
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {resume.completionPercentage}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={resume.completionPercentage}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </Paper>

      {/* Document Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Estado de Documentos
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'warning.50', textAlign: 'center' }}>
              <CardContent>
                <Typography variant="h4" color="warning.main" fontWeight="bold">
                  {resume.documentCounts.pending}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pendientes
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'success.50', textAlign: 'center' }}>
              <CardContent>
                <Typography variant="h4" color="success.main" fontWeight="bold">
                  {resume.documentCounts.verified}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Verificados
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'error.50', textAlign: 'center' }}>
              <CardContent>
                <Typography variant="h4" color="error.main" fontWeight="bold">
                  {resume.documentCounts.rejected}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rechazados
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'grey.50', textAlign: 'center' }}>
              <CardContent>
                <Typography variant="h4" color="text.secondary" fontWeight="bold">
                  {resume.documentCounts.expired}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expirados
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Detailed Information - Reorganized for better visual hierarchy */}
      <Grid container spacing={3}>
        
        {/* Row 1: Personal & Educational Information */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom sx={{ mt: 2, mb: 2, fontWeight: 600 }}>
            Información Básica
          </Typography>
        </Grid>
        
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" color="primary.main">Información Personal</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Fecha de nacimiento</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {resume.dateOfBirth ? new Date(resume.dateOfBirth).toLocaleDateString('es-ES') : 'No especificado'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Nacionalidad</Typography>
                  <Typography variant="body1" fontWeight={500}>{resume.nationality || 'No especificado'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Estado civil</Typography>
                  <Typography variant="body1" fontWeight={500}>{resume.maritalStatus || 'No especificado'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Dependientes</Typography>
                  <Typography variant="body1" fontWeight={500}>{resume.dependents || 0}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SchoolIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" color="primary.main">Información Educativa</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Nivel educativo</Typography>
                  <Typography variant="body1" fontWeight={500}>{resume.educationLevel || 'No especificado'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Institución</Typography>
                  <Typography variant="body1" fontWeight={500}>{resume.institutionName || 'No especificado'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Campo de estudio</Typography>
                  <Typography variant="body1" fontWeight={500}>{resume.fieldOfStudy || 'No especificado'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Año de graduación</Typography>
                  <Typography variant="body1" fontWeight={500}>{resume.graduationYear || 'No especificado'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Row 2: Employment & Financial Information */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom sx={{ mt: 3, mb: 2, fontWeight: 600 }}>
            Información Profesional y Financiera
          </Typography>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <WorkIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" color="primary.main">Información Laboral</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Empleador actual</Typography>
                  <Typography variant="body1" fontWeight={500}>{resume.currentEmployer || 'No especificado'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Cargo</Typography>
                  <Typography variant="body1" fontWeight={500}>{resume.currentPosition || 'No especificado'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Tipo de empleo</Typography>
                  <Typography variant="body1" fontWeight={500}>{resume.employmentType || 'No especificado'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Salario mensual</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {resume.monthlySalary ? `$${resume.monthlySalary.toLocaleString()} COP` : 'No especificado'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <BankIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" color="primary.main">Información Financiera</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Banco</Typography>
                  <Typography variant="body1" fontWeight={500}>{resume.bankName || 'No especificado'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Tipo de cuenta</Typography>
                  <Typography variant="body1" fontWeight={500}>{resume.accountType || 'No especificado'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Gastos mensuales</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {resume.monthlyExpenses ? `$${resume.monthlyExpenses.toLocaleString()} COP` : 'No especificado'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Row 3: Contact & References */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom sx={{ mt: 3, mb: 2, fontWeight: 600 }}>
            Contactos y Referencias
          </Typography>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ContactIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" color="primary.main">Contacto de Emergencia</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Nombre</Typography>
                  <Typography variant="body1" fontWeight={500}>{resume.emergencyContactName || 'No especificado'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Teléfono</Typography>
                  <Typography variant="body1" fontWeight={500}>{resume.emergencyContactPhone || 'No especificado'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Relación</Typography>
                  <Typography variant="body1" fontWeight={500}>{resume.emergencyContactRelation || 'No especificado'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" color="primary.main">Referencias</Typography>
              </Box>
              
              {/* Reference 1 */}
              <Box mb={2}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Referencia Personal
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Nombre</Typography>
                    <Typography variant="body1" fontWeight={500}>{resume.reference1Name || 'No especificado'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Teléfono</Typography>
                    <Typography variant="body1" fontWeight={500}>{resume.reference1Phone || 'No especificado'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Relación</Typography>
                    <Typography variant="body1" fontWeight={500}>{resume.reference1Relation || 'No especificado'}</Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Reference 2 */}
              {resume.reference2Name && (
                <Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Referencia Familiar
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Nombre</Typography>
                      <Typography variant="body1" fontWeight={500}>{resume.reference2Name}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Teléfono</Typography>
                      <Typography variant="body1" fontWeight={500}>{resume.reference2Phone}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Relación</Typography>
                      <Typography variant="body1" fontWeight={500}>{resume.reference2Relation}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Additional Information */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Información Adicional
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: resume.evictionHistory ? 'error.50' : 'success.50' }}>
              <CardContent>
                <Typography 
                  variant="subtitle1" 
                  color={resume.evictionHistory ? 'error' : 'success'} 
                  gutterBottom
                >
                  Historial de Desalojo
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {resume.evictionHistory ? 'Sí' : 'No'}
                </Typography>
                {resume.evictionHistory && resume.evictionDetails && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                    Detalles: {resume.evictionDetails}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: resume.criminalRecord ? 'error.50' : 'success.50' }}>
              <CardContent>
                <Typography 
                  variant="subtitle1" 
                  color={resume.criminalRecord ? 'error' : 'success'} 
                  gutterBottom
                >
                  Antecedentes Penales
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {resume.criminalRecord ? 'Sí' : 'No'}
                </Typography>
                {resume.criminalRecord && resume.criminalRecordDetails && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                    Detalles: {resume.criminalRecordDetails}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Resume; 