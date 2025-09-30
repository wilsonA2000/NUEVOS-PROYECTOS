import React, { useState, useEffect } from 'react';
import {
  Box, Stepper, Step, StepLabel, Card, CardContent,
  Typography, Button, Alert, CircularProgress, Grid,
  Chip, Avatar, List, ListItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Accordion, AccordionSummary, AccordionDetails,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Divider, Stack
} from '@mui/material';
import {
  CheckCircle, Warning, Error as ErrorIcon, CloudUpload,
  Description, Gavel, Payment, Home, ExpandMore,
  Security, AssignmentTurnedIn, Schedule, AttachMoney,
  VerifiedUser, Article, Fingerprint, CameraAlt
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface MatchContractFlowProps {
  matchId: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  match_data: {
    tenant: any;
    landlord: any;
    property: any;
    financial_info: any;
  };
}

interface ContractDraft {
  id: string;
  contract_type: string;
  status: string;
  monthly_rent: number;
  security_deposit: number;
  start_date: string;
  end_date: string;
  clauses: any[];
  milestones: any[];
}

const MatchContractFlow: React.FC<MatchContractFlowProps> = ({ matchId }) => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [contractDraft, setContractDraft] = useState<ContractDraft | null>(null);
  const [verificationStatus, setVerificationStatus] = useState({
    tenant: false,
    landlord: false
  });
  const [documents, setDocuments] = useState<{[key: string]: File}>({});

  const steps = [
    'Validación del Match',
    'Verificación de Identidades',
    'Generación del Contrato',
    'Revisión de Términos',
    'Firma Digital',
    'Activación'
  ];

  useEffect(() => {
    validateMatch();
  }, [matchId]);

  const validateMatch = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`/api/v1/matching/matches/${matchId}/validate-for-contract/`);
      setValidation(response.data);
      
      if (response.data.valid) {
        setActiveStep(1);
      }
    } catch (error) {
      console.error('Error validating match:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIdentityVerification = async (userType: 'tenant' | 'landlord') => {
    try {
      const formData = new FormData();
      formData.append('user_type', userType);
      formData.append('id_document', documents[`${userType}_id`]);
      formData.append('selfie', documents[`${userType}_selfie`]);

      const response = await axios.post(
        `/api/v1/contracts/verify-identity/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.verified) {
        setVerificationStatus(prev => ({
          ...prev,
          [userType]: true
        }));
      }
    } catch (error) {
      console.error('Error verifying identity:', error);
    }
  };

  const generateContractDraft = async () => {
    try {
      const response = await axios.post(`/api/v1/matching/matches/${matchId}/create-contract/`, {
        contract_type: 'ARR_VIV_URB',
        additional_data: {
          payment_day: 5,
          include_utilities: false,
          guarantee_type: 'CODEUDOR'
        }
      });
      
      setContractDraft(response.data);
      setActiveStep(3);
    } catch (error) {
      console.error('Error generating contract:', error);
    }
  };

  const renderValidationStep = () => {
    if (!validation) return <CircularProgress />;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Validación del Match para Contrato
        </Typography>
        
        {validation.valid ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="subtitle1">
              ✅ El match está listo para convertirse en contrato
            </Typography>
          </Alert>
        ) : (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle1">
              ❌ El match no puede convertirse en contrato aún
            </Typography>
          </Alert>
        )}

        {validation.errors.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="error" gutterBottom>
              Errores a resolver:
            </Typography>
            <List dense>
              {validation.errors.map((error, idx) => (
                <ListItem key={idx}>
                  <ListItemIcon>
                    <ErrorIcon color="error" />
                  </ListItemIcon>
                  <ListItemText primary={error} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {validation.warnings.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="warning.main" gutterBottom>
              Advertencias:
            </Typography>
            <List dense>
              {validation.warnings.map((warning, idx) => (
                <ListItem key={idx}>
                  <ListItemIcon>
                    <Warning color="warning" />
                  </ListItemIcon>
                  <ListItemText primary={warning} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {validation.match_data && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    <Home sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Propiedad
                  </Typography>
                  <Typography variant="body2">
                    {validation.match_data.property.title}
                  </Typography>
                  <Typography variant="h6" color="primary">
                    ${validation.match_data.property.price.toLocaleString()} COP/mes
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    <AttachMoney sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Información Financiera
                  </Typography>
                  <Typography variant="body2">
                    Ingresos inquilino: ${validation.match_data.financial_info.tenant_income.toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    Ratio ingreso/arriendo: {(validation.match_data.financial_info.tenant_income / validation.match_data.financial_info.monthly_rent).toFixed(1)}x
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={() => setActiveStep(1)}
            disabled={!validation.valid}
          >
            Continuar con Verificación
          </Button>
        </Box>
      </Box>
    );
  };

  const renderVerificationStep = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Verificación de Identidades
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          Ambas partes deben verificar su identidad antes de proceder con el contrato
        </Alert>

        <Grid container spacing={3}>
          {/* Verificación Arrendador */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  <VerifiedUser sx={{ mr: 1 }} />
                  Arrendador
                </Typography>
                
                {verificationStatus.landlord ? (
                  <Alert severity="success">
                    <CheckCircle sx={{ mr: 1 }} />
                    Identidad verificada
                  </Alert>
                ) : (
                  <Stack spacing={2}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CameraAlt />}
                      fullWidth
                    >
                      Subir Documento ID
                      <input
                        hidden
                        accept="image/*"
                        type="file"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setDocuments(prev => ({
                              ...prev,
                              landlord_id: e.target.files![0]
                            }));
                          }
                        }}
                      />
                    </Button>
                    
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<Fingerprint />}
                      fullWidth
                    >
                      Tomar Selfie
                      <input
                        hidden
                        accept="image/*"
                        capture="user"
                        type="file"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setDocuments(prev => ({
                              ...prev,
                              landlord_selfie: e.target.files![0]
                            }));
                          }
                        }}
                      />
                    </Button>
                    
                    <Button
                      variant="contained"
                      onClick={() => handleIdentityVerification('landlord')}
                      disabled={!documents.landlord_id || !documents.landlord_selfie}
                    >
                      Verificar Identidad
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Verificación Inquilino */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  <VerifiedUser sx={{ mr: 1 }} />
                  Inquilino
                </Typography>
                
                {verificationStatus.tenant ? (
                  <Alert severity="success">
                    <CheckCircle sx={{ mr: 1 }} />
                    Identidad verificada
                  </Alert>
                ) : (
                  <Stack spacing={2}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CameraAlt />}
                      fullWidth
                    >
                      Subir Documento ID
                      <input
                        hidden
                        accept="image/*"
                        type="file"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setDocuments(prev => ({
                              ...prev,
                              tenant_id: e.target.files![0]
                            }));
                          }
                        }}
                      />
                    </Button>
                    
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<Fingerprint />}
                      fullWidth
                    >
                      Tomar Selfie
                      <input
                        hidden
                        accept="image/*"
                        capture="user"
                        type="file"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setDocuments(prev => ({
                              ...prev,
                              tenant_selfie: e.target.files![0]
                            }));
                          }
                        }}
                      />
                    </Button>
                    
                    <Button
                      variant="contained"
                      onClick={() => handleIdentityVerification('tenant')}
                      disabled={!documents.tenant_id || !documents.tenant_selfie}
                    >
                      Verificar Identidad
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setActiveStep(0)}>
            Atrás
          </Button>
          <Button
            variant="contained"
            onClick={generateContractDraft}
            disabled={!verificationStatus.tenant || !verificationStatus.landlord}
          >
            Generar Contrato
          </Button>
        </Box>
      </Box>
    );
  };

  const renderContractReview = () => {
    if (!contractDraft) return <CircularProgress />;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Revisión del Contrato de Arrendamiento
        </Typography>

        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            Este contrato cumple con la Ley 820 de 2003 sobre arrendamiento de vivienda urbana en Colombia
          </Typography>
        </Alert>

        {/* Información General */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              <Description sx={{ mr: 1 }} />
              Información General
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Tipo de Contrato
                </Typography>
                <Typography variant="body1">
                  Arrendamiento de Vivienda Urbana
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Duración
                </Typography>
                <Typography variant="body1">
                  {new Date(contractDraft.start_date).toLocaleDateString()} - {new Date(contractDraft.end_date).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Canon Mensual
                </Typography>
                <Typography variant="body1" color="primary">
                  ${contractDraft.monthly_rent.toLocaleString()} COP
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Depósito
                </Typography>
                <Typography variant="body1">
                  ${contractDraft.security_deposit.toLocaleString()} COP
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Cláusulas Legales */}
        <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
          <Gavel sx={{ mr: 1 }} />
          Cláusulas Legales Obligatorias
        </Typography>
        
        {contractDraft.clauses.map((clause, index) => (
          <Accordion key={index}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>
                Cláusula {index + 1}: {clause.title}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2">
                {clause.content}
              </Typography>
              {clause.legal_reference && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Referencia Legal: {clause.legal_reference}
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))}

        {/* Hitos de Pago */}
        <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
          <Payment sx={{ mr: 1 }} />
          Calendario de Pagos
        </Typography>
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Concepto</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contractDraft.milestones.slice(0, 3).map((milestone, index) => (
                <TableRow key={index}>
                  <TableCell>{milestone.description}</TableCell>
                  <TableCell>{new Date(milestone.due_date).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    ${milestone.amount?.toLocaleString() || '-'} COP
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={milestone.status}
                      size="small"
                      color="default"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setActiveStep(2)}>
            Atrás
          </Button>
          <Button
            variant="contained"
            onClick={() => setActiveStep(4)}
          >
            Proceder a Firma
          </Button>
        </Box>
      </Box>
    );
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderValidationStep();
      case 1:
        return renderVerificationStep();
      case 3:
        return renderContractReview();
      default:
        return <Typography>Paso en desarrollo...</Typography>;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Crear Contrato desde Match Aceptado
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Proceso seguro y legal para formalizar el arrendamiento
          </Typography>
        </CardContent>
      </Card>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card>
        <CardContent sx={{ p: 3 }}>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Indicadores de Seguridad */}
      <Grid container spacing={2} sx={{ mt: 3 }}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <Security color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="subtitle2">
                Cumplimiento Legal
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ley 820 de 2003
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <VerifiedUser color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="subtitle2">
                Identidades Verificadas
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Validación biométrica
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <AssignmentTurnedIn color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="subtitle2">
                Firma Digital Segura
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Legalmente vinculante
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MatchContractFlow;