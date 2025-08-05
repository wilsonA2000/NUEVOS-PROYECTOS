import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  LinearProgress,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Upload as UploadIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Home as HomeIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

interface CVDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  verification_status: 'pending' | 'verified' | 'rejected' | 'expired';
  uploaded_at: string;
  verified_at?: string;
  expiry_date?: string;
  verification_notes?: string;
}

interface VerificationResult {
  overall_score: number;
  status: 'pending' | 'approved' | 'conditional' | 'rejected';
  personal_info: {
    full_name_verified: boolean;
    id_number_verified: boolean;
    date_of_birth_verified: boolean;
    address_verified: boolean;
  };
  employment: {
    current_employer_verified: boolean;
    employment_duration: number;
    monthly_income_verified: boolean;
    employment_type: string;
  };
  education: {
    highest_degree: string;
    institution_verified: boolean;
    graduation_year: number;
  };
  rental_history: {
    previous_landlord_contacts: number;
    references_verified: number;
    payment_history_score: number;
  };
  financial_status: {
    credit_score?: number;
    debt_to_income_ratio?: number;
    bank_account_verified: boolean;
  };
  recommendations: string[];
  red_flags: string[];
}

interface CVVerificationSystemProps {
  tenantId: string;
  matchRequestId?: string;
  onVerificationComplete?: (result: VerificationResult) => void;
}

const CVVerificationSystem: React.FC<CVVerificationSystemProps> = ({
  tenantId,
  matchRequestId,
  onVerificationComplete
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [documents, setDocuments] = useState<CVDocument[]>([]);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<CVDocument | null>(null);

  const verificationSteps = [
    'Documentos Requeridos',
    'Verificación de Identidad',
    'Verificación Laboral',
    'Historial de Arrendamiento',
    'Análisis Financiero',
    'Resultado Final'
  ];

  const requiredDocuments = [
    {
      type: 'identity',
      label: 'Cédula de Ciudadanía',
      description: 'Documento de identidad vigente',
      required: true
    },
    {
      type: 'employment_letter',
      label: 'Carta Laboral',
      description: 'Certificación laboral con menos de 30 días',
      required: true
    },
    {
      type: 'pay_stubs',
      label: 'Comprobantes de Pago',
      description: 'Últimos 3 meses de nómina',
      required: true
    },
    {
      type: 'bank_statements',
      label: 'Extractos Bancarios',
      description: 'Últimos 3 meses de movimientos',
      required: true
    },
    {
      type: 'rental_references',
      label: 'Referencias de Arrendamiento',
      description: 'Contactos de arrendadores anteriores',
      required: false
    },
    {
      type: 'education_certificate',
      label: 'Certificado de Educación',
      description: 'Título profesional o técnico',
      required: false
    }
  ];

  useEffect(() => {
    fetchDocuments();
    fetchVerificationStatus();
  }, [tenantId]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/v1/verification/tenants/${tenantId}/documents/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchVerificationStatus = async () => {
    try {
      const response = await fetch(`/api/v1/verification/tenants/${tenantId}/status/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVerificationResult(data);
        
        // Determinar el paso actual basado en el estado
        if (data.status === 'pending') {
          setActiveStep(getStepFromStatus(data));
        } else {
          setActiveStep(5); // Resultado final
        }
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
    }
  };

  const getStepFromStatus = (result: VerificationResult): number => {
    if (!result.personal_info.full_name_verified) return 1;
    if (!result.employment.current_employer_verified) return 2;
    if (result.rental_history.references_verified === 0) return 3;
    if (!result.financial_status.bank_account_verified) return 4;
    return 5;
  };

  const startVerification = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/verification/tenants/${tenantId}/start/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          match_request_id: matchRequestId
        })
      });

      if (response.ok) {
        const result = await response.json();
        setVerificationResult(result);
        setActiveStep(5);
        onVerificationComplete?.(result);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al iniciar verificación');
      }
    } catch (error) {
      console.error('Error starting verification:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentStatus = (docType: string): CVDocument | null => {
    return documents.find(doc => doc.document_type === docType) || null;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <VerifiedIcon sx={{ color: 'success.main' }} />;
      case 'pending':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'rejected':
      case 'expired':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      default:
        return <UploadIcon sx={{ color: 'text.secondary' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
      case 'expired':
        return 'error';
      default:
        return 'default';
    }
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'conditional':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'info';
    }
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excelente';
    if (score >= 80) return 'Muy Bueno';
    if (score >= 70) return 'Bueno';
    if (score >= 60) return 'Aceptable';
    return 'Insuficiente';
  };

  const canStartVerification = () => {
    const requiredDocs = requiredDocuments.filter(doc => doc.required);
    return requiredDocs.every(doc => {
      const docStatus = getDocumentStatus(doc.type);
      return docStatus && docStatus.verification_status !== 'rejected';
    });
  };

  const renderDocumentsList = () => (
    <List>
      {requiredDocuments.map((docReq) => {
        const document = getDocumentStatus(docReq.type);
        return (
          <React.Fragment key={docReq.type}>
            <ListItem>
              <ListItemIcon>
                {getStatusIcon(document?.verification_status || 'none')}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2">
                      {docReq.label}
                    </Typography>
                    {docReq.required && (
                      <Chip label="Requerido" size="small" color="primary" />
                    )}
                    {document && (
                      <Chip
                        label={document.verification_status}
                        size="small"
                        color={getStatusColor(document.verification_status) as any}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {docReq.description}
                    </Typography>
                    {document && (
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={() => {
                            setSelectedDocument(document);
                            setShowDetailDialog(true);
                          }}
                        >
                          Ver
                        </Button>
                        <Button
                          size="small"
                          startIcon={<DownloadIcon />}
                          href={document.file_url}
                          target="_blank"
                        >
                          Descargar
                        </Button>
                      </Box>
                    )}
                  </Box>
                }
              />
            </ListItem>
            <Divider />
          </React.Fragment>
        );
      })}
    </List>
  );

  const renderVerificationResult = () => {
    if (!verificationResult) return null;

    return (
      <Box>
        {/* Resultado general */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Resultado de Verificación
              </Typography>
              <Chip
                label={verificationResult.status.toUpperCase()}
                color={getOverallStatusColor(verificationResult.status) as any}
                size="large"
              />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="h4" color="primary">
                {verificationResult.overall_score}%
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Puntuación General - {getScoreLabel(verificationResult.overall_score)}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={verificationResult.overall_score}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Detalles por categoría */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Información Personal
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      {verificationResult.personal_info.full_name_verified ? <CheckIcon color="success" /> : <CloseIcon color="error" />}
                    </ListItemIcon>
                    <ListItemText primary="Nombre completo verificado" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {verificationResult.personal_info.id_number_verified ? <CheckIcon color="success" /> : <CloseIcon color="error" />}
                    </ListItemIcon>
                    <ListItemText primary="Número de identificación" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {verificationResult.personal_info.address_verified ? <CheckIcon color="success" /> : <CloseIcon color="error" />}
                    </ListItemIcon>
                    <ListItemText primary="Dirección verificada" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <WorkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Información Laboral
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      {verificationResult.employment.current_employer_verified ? <CheckIcon color="success" /> : <CloseIcon color="error" />}
                    </ListItemIcon>
                    <ListItemText 
                      primary="Empleador actual verificado"
                      secondary={`Tipo: ${verificationResult.employment.employment_type}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {verificationResult.employment.monthly_income_verified ? <CheckIcon color="success" /> : <CloseIcon color="error" />}
                    </ListItemIcon>
                    <ListItemText primary="Ingresos verificados" />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary={`Duración del empleo: ${verificationResult.employment.employment_duration} meses`}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <HomeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Historial de Arrendamiento
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary={`Referencias verificadas: ${verificationResult.rental_history.references_verified}/${verificationResult.rental_history.previous_landlord_contacts}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary={`Puntuación de historial de pagos: ${verificationResult.rental_history.payment_history_score}%`}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Educación y Finanzas
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary={`Título: ${verificationResult.education.highest_degree}`}
                      secondary={`Institución verificada: ${verificationResult.education.institution_verified ? 'Sí' : 'No'}`}
                    />
                  </ListItem>
                  {verificationResult.financial_status.credit_score && (
                    <ListItem>
                      <ListItemText 
                        primary={`Puntaje crediticio: ${verificationResult.financial_status.credit_score}`}
                      />
                    </ListItem>
                  )}
                  <ListItem>
                    <ListItemIcon>
                      {verificationResult.financial_status.bank_account_verified ? <CheckIcon color="success" /> : <CloseIcon color="error" />}
                    </ListItemIcon>
                    <ListItemText primary="Cuenta bancaria verificada" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Recomendaciones y alertas */}
        {(verificationResult.recommendations.length > 0 || verificationResult.red_flags.length > 0) && (
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={3}>
              {verificationResult.recommendations.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Alert severity="info">
                    <Typography variant="h6" gutterBottom>
                      Recomendaciones
                    </Typography>
                    <ul>
                      {verificationResult.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </Alert>
                </Grid>
              )}
              
              {verificationResult.red_flags.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Alert severity="warning">
                    <Typography variant="h6" gutterBottom>
                      Puntos de Atención
                    </Typography>
                    <ul>
                      {verificationResult.red_flags.map((flag, index) => (
                        <li key={index}>{flag}</li>
                      ))}
                    </ul>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Sistema de Verificación de CV
          </Typography>
          
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {verificationSteps.map((label) => (
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

          {activeStep < 5 ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Documentos Requeridos
              </Typography>
              {renderDocumentsList()}
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={startVerification}
                  disabled={!canStartVerification() || loading}
                  startIcon={loading ? <LinearProgress /> : <VerifiedIcon />}
                >
                  {loading ? 'Verificando...' : 'Iniciar Verificación'}
                </Button>
              </Box>
            </Box>
          ) : (
            renderVerificationResult()
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalles del documento */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalles del Documento
        </DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedDocument.file_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Tipo: {selectedDocument.document_type}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Estado: {selectedDocument.verification_status}
              </Typography>
              {selectedDocument.verification_notes && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    {selectedDocument.verification_notes}
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>
            Cerrar
          </Button>
          {selectedDocument && (
            <Button
              variant="contained"
              href={selectedDocument.file_url}
              target="_blank"
              startIcon={<DownloadIcon />}
            >
              Descargar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CVVerificationSystem;