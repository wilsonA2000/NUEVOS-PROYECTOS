import React, { useState, useEffect } from 'react';
import { contractService } from '../../services/contractService';
import { useAuth } from '../../hooks/useAuth';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Paper,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/lab';
import {
  Security as SecurityIcon,
  Fingerprint as FingerprintIcon,
  Edit as SignatureIcon,
  VerifiedUser as VerifiedIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Description as ContractIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import BiometricVerification from './BiometricVerification';
import SignaturePad from './SignaturePad';

interface DigitalSignatureFlowProps {
  contractId: string;
  contractTitle: string;
  signerName: string;
  signerRole: 'landlord' | 'tenant';
  contractData?: any;
  onSigningComplete: (signatureData: CompleteSignatureData) => void;
  onCancel?: () => void;
  isOpen: boolean;
}

interface CompleteSignatureData {
  contractId: string;
  signerName: string;
  signerRole: string;
  biometricData?: any;
  signatureData: any;
  timestamp: Date;
  verificationLevel: 'basic' | 'enhanced' | 'maximum';
}

const DigitalSignatureFlow: React.FC<DigitalSignatureFlowProps> = ({
  contractId,
  contractTitle,
  signerName,
  signerRole,
  contractData,
  onSigningComplete,
  onCancel,
  isOpen
}) => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricData, setBiometricData] = useState<any>(null);
  const [signatureData, setSignatureData] = useState<any>(null);
  const [verificationLevel, setVerificationLevel] = useState<'basic' | 'enhanced' | 'maximum'>('basic');
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string>('');

  const steps = [
    {
      label: 'Revisión del Contrato',
      description: 'Revise los términos y condiciones',
      icon: <ContractIcon />
    },
    {
      label: 'Verificación de Identidad',
      description: 'Verificación biométrica opcional',
      icon: <SecurityIcon />,
      optional: true
    },
    {
      label: 'Firma Digital',
      description: 'Firme digitalmente el contrato',
      icon: <SignatureIcon />
    },
    {
      label: 'Confirmación',
      description: 'Confirme y finalice el proceso',
      icon: <VerifiedIcon />
    }
  ];

  useEffect(() => {
    if (biometricData) {
      setVerificationLevel('enhanced');
    }
    if (biometricData?.fingerprint) {
      setVerificationLevel('maximum');
    }
  }, [biometricData]);

  const handleContractReview = () => {
    if (!agreedToTerms) {
      alert('Debe aceptar los términos y condiciones para continuar');
      return;
    }
    setActiveStep(1);
  };

  const handleBiometricComplete = (data: any) => {
    setBiometricData(data);
    setActiveStep(2);
  };

  const handleSkipBiometric = () => {
    setVerificationLevel('basic');
    setActiveStep(2);
  };

  const handleSignatureComplete = (data: any) => {
    setSignatureData(data);
    setActiveStep(3);
  };

  const handleFinalSubmission = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      if (!signatureData || !user) {
        throw new Error('Datos de firma o usuario no disponibles');
      }

      // Llamar al servicio real para firmar el contrato
      const result = await contractService.signContract(
        contractId,
        signatureData,
        biometricData,
        verificationLevel
      );

      const completeData: CompleteSignatureData = {
        contractId,
        signerName,
        signerRole,
        biometricData,
        signatureData: result,
        timestamp: new Date(),
        verificationLevel
      };
      
      onSigningComplete(completeData);
      
    } catch (error: any) {
      console.error('Error submitting signature:', error);
      setError(error.response?.data?.detail || error.message || 'Error al firmar el contrato');
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < activeStep) return <CheckIcon color="success" />;
    if (stepIndex === activeStep) return steps[stepIndex].icon;
    return steps[stepIndex].icon;
  };

  const getVerificationIcon = () => {
    switch (verificationLevel) {
      case 'maximum': return <SecurityIcon color="success" />;
      case 'enhanced': return <FingerprintIcon color="primary" />;
      default: return <PersonIcon color="action" />;
    }
  };

  const getVerificationLabel = () => {
    switch (verificationLevel) {
      case 'maximum': return 'Verificación Máxima';
      case 'enhanced': return 'Verificación Mejorada';
      default: return 'Verificación Básica';
    }
  };

  const getVerificationColor = (): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (verificationLevel) {
      case 'maximum': return 'success';
      case 'enhanced': return 'primary';
      default: return 'default';
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onCancel}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1 }}>
        <VerifiedIcon sx={{ mr: 1 }} />
        Firma Digital del Contrato
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {/* Contract Info Header */}
        <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom>
                {contractTitle}
              </Typography>
              <Typography variant="body2">
                Firmante: <strong>{signerName}</strong> ({signerRole === 'landlord' ? 'Arrendador' : 'Arrendatario'})
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'right' }}>
                <Chip
                  icon={getVerificationIcon()}
                  label={getVerificationLabel()}
                  color={getVerificationColor()}
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption" display="block">
                  Nivel de Seguridad
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Step Progress */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel 
                icon={getStepIcon(index)}
                optional={step.optional ? (
                  <Typography variant="caption">Opcional</Typography>
                ) : null}
              >
                {step.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step Content */}
        <Box sx={{ minHeight: '400px' }}>
          {/* Step 0: Contract Review */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Revisión del Contrato de Arrendamiento
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                Por favor, revise cuidadosamente todos los términos y condiciones 
                antes de proceder con la firma digital.
              </Alert>

              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Información del Contrato:
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Título:</strong> {contractTitle}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Tipo:</strong> Contrato de Arrendamiento
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Fecha:</strong> {new Date().toLocaleDateString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Partes del Contrato:
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Arrendador:</strong> {signerRole === 'landlord' ? signerName : 'Por definir'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Arrendatario:</strong> {signerRole === 'tenant' ? signerName : 'Por definir'}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowContractPreview(true)}
                  startIcon={<ContractIcon />}
                >
                  Ver Contrato Completo
                </Button>
              </Box>

              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Términos y Condiciones:</strong>
                </Typography>
                <Typography variant="body2">
                  Al firmar este contrato, usted acepta que:
                </Typography>
                <ul>
                  <li>Ha leído y comprende todos los términos del contrato</li>
                  <li>Acepta los métodos de verificación de identidad utilizados</li>
                  <li>Su firma digital tendrá la misma validez legal que una firma manuscrita</li>
                  <li>Los datos biométricos se utilizarán únicamente para verificación</li>
                </ul>
              </Alert>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <Typography variant="body2">
                  Acepto los términos y condiciones del contrato y del proceso de firma digital
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'right' }}>
                <Button
                  variant="contained"
                  onClick={handleContractReview}
                  disabled={!agreedToTerms}
                  startIcon={<CheckIcon />}
                >
                  Continuar con Verificación
                </Button>
              </Box>
            </Box>
          )}

          {/* Step 1: Biometric Verification */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Verificación de Identidad (Opcional)
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                La verificación biométrica es opcional pero aumenta significativamente 
                la seguridad y validez legal de su firma.
              </Alert>

              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <BiometricVerification
                    onVerificationComplete={handleBiometricComplete}
                    onCancel={handleSkipBiometric}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Niveles de Verificación:
                      </Typography>
                      
                      <Timeline>
                        <TimelineItem>
                          <TimelineSeparator>
                            <TimelineDot color="primary">
                              <PersonIcon />
                            </TimelineDot>
                            <TimelineConnector />
                          </TimelineSeparator>
                          <TimelineContent>
                            <Typography variant="body2">
                              <strong>Básica:</strong> Solo firma digital
                            </Typography>
                          </TimelineContent>
                        </TimelineItem>
                        
                        <TimelineItem>
                          <TimelineSeparator>
                            <TimelineDot color="primary">
                              <SecurityIcon />
                            </TimelineDot>
                            <TimelineConnector />
                          </TimelineSeparator>
                          <TimelineContent>
                            <Typography variant="body2">
                              <strong>Mejorada:</strong> + Reconocimiento facial + Documento
                            </Typography>
                          </TimelineContent>
                        </TimelineItem>
                        
                        <TimelineItem>
                          <TimelineSeparator>
                            <TimelineDot color="success">
                              <FingerprintIcon />
                            </TimelineDot>
                          </TimelineSeparator>
                          <TimelineContent>
                            <Typography variant="body2">
                              <strong>Máxima:</strong> + Huella digital
                            </Typography>
                          </TimelineContent>
                        </TimelineItem>
                      </Timeline>

                      <Divider sx={{ my: 2 }} />

                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={handleSkipBiometric}
                        startIcon={<SignatureIcon />}
                      >
                        Omitir y Firmar
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Step 2: Digital Signature */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Firma Digital del Contrato
              </Typography>

              <SignaturePad
                contractId={contractId}
                signerName={signerName}
                onSignatureComplete={handleSignatureComplete}
                onCancel={() => setActiveStep(1)}
                biometricData={biometricData}
                verificationLevel={verificationLevel}
              />
            </Box>
          )}

          {/* Step 3: Confirmation */}
          {activeStep === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckIcon color="success" sx={{ mr: 1 }} />
                Confirmación de Firma
              </Typography>

              <Alert severity="success" sx={{ mb: 3 }}>
                Su firma ha sido capturada exitosamente. Por favor, revise los detalles 
                antes de finalizar el proceso.
              </Alert>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Datos de la Firma:
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Firmante:</strong> {signerName}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Rol:</strong> {signerRole === 'landlord' ? 'Arrendador' : 'Arrendatario'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Fecha y Hora:</strong> {new Date().toLocaleString()}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Nivel de Verificación:</strong> {getVerificationLabel()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Métodos de Verificación Utilizados:
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Chip
                          icon={<SignatureIcon />}
                          label="Firma Digital"
                          color="primary"
                          size="small"
                        />
                        
                        {biometricData?.facialRecognition && (
                          <Chip
                            icon={<SecurityIcon />}
                            label="Reconocimiento Facial"
                            color="primary"
                            size="small"
                          />
                        )}
                        
                        {biometricData?.documentVerification && (
                          <Chip
                            icon={<PersonIcon />}
                            label="Verificación de Documento"
                            color="primary"
                            size="small"
                          />
                        )}
                        
                        {biometricData?.fingerprint && (
                          <Chip
                            icon={<FingerprintIcon />}
                            label="Huella Digital"
                            color="success"
                            size="small"
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {error && (
                <Alert severity="error" sx={{ mt: 3, mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Alert severity="warning" sx={{ mt: 3, mb: 2 }}>
                Una vez finalizado el proceso, su firma tendrá validez legal completa 
                y no podrá ser modificada.
              </Alert>

              <Box sx={{ textAlign: 'right' }}>
                <Button
                  variant="outlined"
                  onClick={() => setActiveStep(2)}
                  sx={{ mr: 1 }}
                >
                  Revisar Firma
                </Button>
                <Button
                  variant="contained"
                  onClick={handleFinalSubmission}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <VerifiedIcon />}
                >
                  {isLoading ? 'Finalizando...' : 'Finalizar Firma'}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      {/* Contract Preview Dialog */}
      <Dialog
        open={showContractPreview}
        onClose={() => setShowContractPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Vista Previa del Contrato</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontFamily: 'monospace' }}>
            {`CONTRATO DE ARRENDAMIENTO

Entre ${signerRole === 'landlord' ? signerName : '[ARRENDADOR]'} y ${signerRole === 'tenant' ? signerName : '[ARRENDATARIO]'}

1. OBJETO DEL CONTRATO
El presente contrato tiene por objeto el arrendamiento de la propiedad ubicada en...

2. DURACIÓN
El contrato tendrá una duración de...

3. PRECIO Y FORMA DE PAGO
El canon de arrendamiento será de...

[Contenido completo del contrato...]`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowContractPreview(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default DigitalSignatureFlow;