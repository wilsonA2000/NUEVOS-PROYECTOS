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
      // Simular llamada a la API
      // En producción, esto sería una llamada real a la API
      const mockResume: ResumeData = {
        id: '1',
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
        criminalRecord: false,
        completionPercentage: 85,
        verificationScore: 78,
        documentCounts: {
          pending: 2,
          verified: 3,
          rejected: 0,
          expired: 1,
        },
      };
      
      setResume(mockResume);
    } catch (err) {
      error('Error al cargar la hoja de vida');
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
        <Typography variant="h4" gutterBottom>
          Error al cargar la hoja de vida
        </Typography>
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
              onClick={() => navigate('/resume/edit')}
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

      {/* Detailed Information */}
      <Grid container spacing={3}>
        {/* Personal Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PersonIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Información Personal</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Fecha de nacimiento"
                    secondary={new Date(resume.dateOfBirth).toLocaleDateString('es-ES')}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Nacionalidad"
                    secondary={resume.nationality}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Estado civil"
                    secondary={resume.maritalStatus}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Dependientes"
                    secondary={resume.dependents}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Educational Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SchoolIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Información Educativa</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Nivel educativo"
                    secondary={resume.educationLevel}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Institución"
                    secondary={resume.institutionName}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Campo de estudio"
                    secondary={resume.fieldOfStudy}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Año de graduación"
                    secondary={resume.graduationYear}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Promedio"
                    secondary={resume.gpa}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Employment Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <WorkIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Información Laboral</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Empleador actual"
                    secondary={resume.currentEmployer}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Cargo"
                    secondary={resume.currentPosition}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Tipo de empleo"
                    secondary={resume.employmentType}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Fecha de inicio"
                    secondary={new Date(resume.startDate).toLocaleDateString('es-ES')}
                  />
                </ListItem>
                {resume.endDate && (
                  <ListItem>
                    <ListItemText
                      primary="Fecha de fin"
                      secondary={new Date(resume.endDate).toLocaleDateString('es-ES')}
                    />
                  </ListItem>
                )}
                <ListItem>
                  <ListItemText
                    primary="Salario mensual"
                    secondary={`$${resume.monthlySalary.toLocaleString()}`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Financial Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <BankIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Información Financiera</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Banco"
                    secondary={resume.bankName}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Tipo de cuenta"
                    secondary={resume.accountType}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Número de cuenta"
                    secondary={resume.accountNumber}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Puntuación crediticia"
                    secondary={resume.creditScore}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Gastos mensuales"
                    secondary={`$${resume.monthlyExpenses.toLocaleString()}`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Emergency Contact */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ContactIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Contacto de Emergencia</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Nombre"
                    secondary={resume.emergencyContactName}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Teléfono"
                    secondary={resume.emergencyContactPhone}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Relación"
                    secondary={resume.emergencyContactRelation}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Dirección"
                    secondary={resume.emergencyContactAddress}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* References */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PersonIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Referencias</Typography>
              </Box>
              
              {/* Reference 1 */}
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Referencia 1
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Nombre"
                    secondary={resume.reference1Name}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Teléfono"
                    secondary={resume.reference1Phone}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Email"
                    secondary={resume.reference1Email}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Relación"
                    secondary={resume.reference1Relation}
                  />
                </ListItem>
              </List>

              {/* Reference 2 */}
              {resume.reference2Name && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Referencia 2
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Nombre"
                        secondary={resume.reference2Name}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Teléfono"
                        secondary={resume.reference2Phone}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Email"
                        secondary={resume.reference2Email}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Relación"
                        secondary={resume.reference2Relation}
                      />
                    </ListItem>
                  </List>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Additional Information */}
      {(resume.evictionHistory || resume.criminalRecord) && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Información Adicional
          </Typography>
          <Grid container spacing={2}>
            {resume.evictionHistory && (
              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: 'error.50' }}>
                  <CardContent>
                    <Typography variant="subtitle1" color="error" gutterBottom>
                      Historial de Desalojo
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {resume.evictionDetails || 'Detalles no especificados'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
            {resume.criminalRecord && (
              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: 'error.50' }}>
                  <CardContent>
                    <Typography variant="subtitle1" color="error" gutterBottom>
                      Antecedentes Penales
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {resume.criminalRecordDetails || 'Detalles no especificados'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
    </Container>
  );
};

export default Resume; 