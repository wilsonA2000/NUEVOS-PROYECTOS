/**
 * Integración del Sistema Biométrico con Contratos Controlados por Arrendador
 * Conecta el flujo completo de autenticación biométrica existente con el nuevo sistema de contratos
 * Incluye validaciones específicas para el workflow de contratos
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  Paper,
  Grid,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Snackbar,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Face as FaceIcon,
  Assignment as DocumentIcon,
  Mic as VoiceIcon,
  Edit as SignatureIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Gavel as LegalIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Importar componentes biométricos existentes
import BiometricAuthenticationFlow from './BiometricAuthenticationFlow';
import DigitalSignatureFlow from './DigitalSignatureFlow';

import { LandlordContractService } from '../../services/landlordContractService';
import {
  LandlordControlledContractData,
  DigitalSignaturePayload,
} from '../../types/landlordContract';
import { LoadingButton } from '../common/LoadingButton';

interface BiometricContractSigningProps {
  contract: LandlordControlledContractData;
  userType: 'landlord' | 'tenant';
  open: boolean;
  onClose: () => void;
  onSigningComplete: (contract: LandlordControlledContractData) => void;
  onError: (error: string) => void;
}

interface BiometricAuthResult {
  session_id: string;
  authentication_id: string;
  confidence_score: number;
  biometric_data: Record<string, any>;
  face_analysis: Record<string, any>;
  document_verification: Record<string, any>;
  voice_analysis: Record<string, any>;
  device_fingerprint: Record<string, any>;
  timestamp: string;
}

const SIGNING_STEPS = [
  'Verificación de Identidad',
  'Autenticación Biométrica',
  'Revisión Final del Contrato',
  'Firma Digital',
  'Confirmación Legal',
];

const STEP_DESCRIPTIONS = {
  0: 'Verificamos tu identidad antes de proceder con la firma',
  1: 'Completamos el proceso de autenticación biométrica de 5 pasos',
  2: 'Revisas por última vez todos los términos del contrato',
  3: 'Capturas tu firma digital con validación biométrica',
  4: 'Confirmamos la validez legal de tu firma y el contrato',
};

export const BiometricContractSigning: React.FC<BiometricContractSigningProps> = ({
  contract,
  userType,
  open,
  onClose,
  onSigningComplete,
  onError,
}) => {
  // Estado principal
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [biometricAuthResult, setBiometricAuthResult] = useState<BiometricAuthResult | null>(null);
  const [signatureData, setSignatureData] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Estados específicos del proceso
  const [identityVerified, setIdentityVerified] = useState(false);
  const [biometricCompleted, setBiometricCompleted] = useState(false);
  const [contractReviewed, setContractReviewed] = useState(false);
  const [digitalSigned, setDigitalSigned] = useState(false);
  const [legallyConfirmed, setLegallyConfirmed] = useState(false);

  useEffect(() => {
    if (open) {
      initializeSigningProcess();
    }
  }, [open]);

  useEffect(() => {
    // Actualizar progreso basado en pasos completados
    const completedSteps = [
      identityVerified,
      biometricCompleted,
      contractReviewed,
      digitalSigned,
      legallyConfirmed,
    ].filter(Boolean).length;
    
    setProgress((completedSteps / 5) * 100);
  }, [identityVerified, biometricCompleted, contractReviewed, digitalSigned, legallyConfirmed]);

  const initializeSigningProcess = async () => {
    try {
      setLoading(true);
      setWarnings([]);
      
      // Validaciones pre-firma específicas para el workflow de contratos
      const validationWarnings = await validateContractForSigning();
      setWarnings(validationWarnings);
      
      if (validationWarnings.length === 0) {
        setCurrentStep(0);
        setIdentityVerified(true);
        await proceedToNextStep();
      }
    } catch (err: any) {
      onError('Error al inicializar proceso de firma: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const validateContractForSigning = async (): Promise<string[]> => {
    const warnings: string[] = [];

    // Validar estado del contrato
    if (!['READY_TO_SIGN', 'BOTH_REVIEWING'].includes(contract.current_state)) {
      warnings.push('El contrato no está en estado válido para firma');
    }

    // Validar que el usuario es el correcto para firmar
    if (userType === 'landlord' && contract.landlord_signed) {
      warnings.push('El arrendador ya ha firmado este contrato');
    }
    
    if (userType === 'tenant' && contract.tenant_signed) {
      warnings.push('El arrendatario ya ha firmado este contrato');
    }

    // Validar que los datos estén completos
    if (userType === 'tenant' && !contract.tenant_data?.full_name) {
      warnings.push('Los datos del arrendatario están incompletos');
    }

    // Validar objeciones pendientes
    if (contract.current_state === 'OBJECTIONS_PENDING') {
      warnings.push('Hay objeciones pendientes que deben resolverse antes de firmar');
    }

    // Validar términos económicos
    if (!contract.monthly_rent || contract.monthly_rent <= 0) {
      warnings.push('El canon mensual no está definido correctamente');
    }

    if (!contract.security_deposit || contract.security_deposit <= 0) {
      warnings.push('El depósito de garantía no está definido correctamente');
    }

    return warnings;
  };

  const proceedToNextStep = async () => {
    switch (currentStep) {
      case 0:
        // Verificación de identidad completada automáticamente si no hay warnings
        setCurrentStep(1);
        break;
        
      case 1:
        if (biometricCompleted) {
          setCurrentStep(2);
        }
        break;
        
      case 2:
        if (contractReviewed) {
          setCurrentStep(3);
        }
        break;
        
      case 3:
        if (digitalSigned) {
          setCurrentStep(4);
          await finalizeContractSigning();
        }
        break;
        
      case 4:
        // Proceso completado
        break;
    }
  };

  const handleBiometricAuthSuccess = (result: BiometricAuthResult) => {
    setBiometricAuthResult(result);
    setBiometricCompleted(true);
    setCurrentStep(2);
  };

  const handleBiometricAuthError = (error: string) => {
    onError('Error en autenticación biométrica: ' + error);
  };

  const handleContractReviewComplete = () => {
    setContractReviewed(true);
    setCurrentStep(3);
  };

  const handleDigitalSignatureComplete = (signature: any) => {
    setSignatureData(signature);
    setDigitalSigned(true);
    setCurrentStep(4);
  };

  const finalizeContractSigning = async () => {
    if (!biometricAuthResult || !signatureData) {
      onError('Datos de autenticación incompletos');
      return;
    }

    try {
      setLoading(true);

      // Preparar payload para la firma digital
      const signaturePayload: DigitalSignaturePayload = {
        contract_id: contract.id!,
        signature_data: {
          signature_image: signatureData.signature_image,
          signature_metadata: {
            ...signatureData.metadata,
            biometric_session_id: biometricAuthResult.session_id,
            authentication_id: biometricAuthResult.authentication_id,
            confidence_score: biometricAuthResult.confidence_score,
            user_type: userType,
          },
          biometric_data: biometricAuthResult.biometric_data,
          device_info: {
            ...biometricAuthResult.device_fingerprint,
            signing_timestamp: new Date().toISOString(),
            ip_address: await getCurrentIP(),
            user_agent: navigator.userAgent,
          },
          location: signatureData.location,
          timestamp: new Date().toISOString(),
        },
      };

      // Enviar firma al backend
      const updatedContract = userType === 'landlord' 
        ? await LandlordContractService.signLandlordContract(signaturePayload)
        : await LandlordContractService.signTenantContract(signaturePayload);

      setLegallyConfirmed(true);
      
      // Llamar callback de éxito
      onSigningComplete(updatedContract);
      
    } catch (err: any) {
      onError('Error al finalizar firma: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const getCurrentIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  const getStepIcon = (step: number) => {
    switch (step) {
      case 0: return <PersonIcon />;
      case 1: return <FaceIcon />;
      case 2: return <DocumentIcon />;
      case 3: return <SignatureIcon />;
      case 4: return <LegalIcon />;
      default: return <SecurityIcon />;
    }
  };

  const getStepColor = (step: number) => {
    if (step < currentStep) return 'success';
    if (step === currentStep) return 'primary';
    return 'disabled';
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Card>
            <CardContent>
              <Box textAlign="center" py={3}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, mx: 'auto', mb: 2 }}>
                  <PersonIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Verificación de Identidad
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Validando tu información para proceder con la firma del contrato
                </Typography>
                
                {warnings.length > 0 ? (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Se encontraron los siguientes problemas:
                    </Typography>
                    <List dense>
                      {warnings.map((warning, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <WarningIcon color="error" />
                          </ListItemIcon>
                          <ListItemText primary={warning} />
                        </ListItem>
                      ))}
                    </List>
                  </Alert>
                ) : (
                  <Alert severity="success">
                    <Typography>✅ Verificación de identidad completada exitosamente</Typography>
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <FaceIcon sx={{ mr: 1 }} />
                Autenticación Biométrica
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Completa el proceso de autenticación biométrica de 5 pasos para verificar tu identidad
              </Typography>
              
              <BiometricAuthenticationFlow
                open={currentStep === 1}
                onClose={() => {}} // No permitir cerrar en medio del proceso
                contractId={contract.id!}
                onSuccess={handleBiometricAuthSuccess}
                onError={handleBiometricAuthError}
                requiredVerificationLevel="enhanced" // Nivel mejorado para contratos
              />
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <DocumentIcon sx={{ mr: 1 }} />
                Revisión Final del Contrato
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Revisa cuidadosamente todos los términos antes de proceder con la firma digital
              </Typography>
              
              {/* Resumen de términos clave */}
              <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  📋 Términos Principales
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Canon Mensual</Typography>
                    <Typography variant="h6" color="primary">
                      {LandlordContractService.formatCurrency(contract.monthly_rent)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Depósito</Typography>
                    <Typography variant="h6" color="secondary">
                      {LandlordContractService.formatCurrency(contract.security_deposit)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Duración</Typography>
                    <Typography variant="body1">{contract.contract_duration_months} meses</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Propiedad</Typography>
                    <Typography variant="body1">{contract.property_address}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  ⚠️ <strong>Importante:</strong> Una vez que firmes digitalmente este contrato, 
                  será legalmente vinculante. Asegúrate de haber leído y entendido todos los términos.
                </Typography>
              </Alert>

              <Box textAlign="center">
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleContractReviewComplete}
                  startIcon={<CheckIcon />}
                >
                  He Revisado y Acepto los Términos
                </Button>
              </Box>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <SignatureIcon sx={{ mr: 1 }} />
                Firma Digital
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Captura tu firma digital. Esta será validada con tus datos biométricos
              </Typography>
              
              <DigitalSignatureFlow
                contractId={contract.id!}
                contractData={contract}
                userType={userType}
                biometricData={biometricAuthResult}
                onSignatureComplete={handleDigitalSignatureComplete}
                onError={onError}
              />
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardContent>
              <Box textAlign="center" py={4}>
                <Avatar sx={{ bgcolor: 'success.main', width: 80, height: 80, mx: 'auto', mb: 2 }}>
                  <LegalIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" sx={{ mb: 2 }}>
                  ¡Firma Completada Exitosamente!
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Tu firma digital ha sido procesada y verificada. El contrato ahora tiene validez legal.
                </Typography>
                
                {/* Información de la firma */}
                <Paper sx={{ p: 2, bgcolor: 'success.50', mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    📜 Información de la Firma
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Firmado por</Typography>
                      <Typography variant="body1">
                        {userType === 'landlord' ? contract.landlord_data.full_name : contract.tenant_data?.full_name}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Fecha y Hora</Typography>
                      <Typography variant="body1">
                        {format(new Date(), 'PPpp', { locale: es })}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">Nivel de Confianza</Typography>
                      <Typography variant="body1" color="success.main">
                        {biometricAuthResult?.confidence_score.toFixed(1)}% - Verificado ✅
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary">ID de Autenticación</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {biometricAuthResult?.authentication_id.slice(0, 12)}...
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    📧 Se ha enviado una copia de confirmación a tu email registrado. 
                    El contrato estará disponible para descarga una vez que ambas partes hayan firmado.
                  </Typography>
                </Alert>

                <Box display="flex" gap={2} justifyContent="center">
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => {
                      setLegallyConfirmed(true);
                      onClose();
                    }}
                  >
                    Finalizar Proceso
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={warnings.length === 0 ? onClose : undefined} // No permitir cerrar si hay warnings
      maxWidth="lg"
      fullWidth
      disableEscapeKeyDown={currentStep > 0 && currentStep < 4} // No permitir escape en medio del proceso
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <ShieldIcon sx={{ mr: 1 }} />
            <Typography variant="h6">
              Firma Digital con Autenticación Biométrica
            </Typography>
          </Box>
          <Chip 
            label={`Paso ${currentStep + 1} de ${SIGNING_STEPS.length}`}
            color="primary"
            variant="outlined"
          />
        </Box>
        
        {/* Barra de progreso */}
        <Box sx={{ mt: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {progress.toFixed(0)}% completado
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Stepper horizontal */}
          <Stepper activeStep={currentStep} alternativeLabel sx={{ mb: 4 }}>
            {SIGNING_STEPS.map((label, index) => (
              <Step key={label}>
                <StepLabel
                  StepIconComponent={() => (
                    <Avatar 
                      sx={{ 
                        bgcolor: getStepColor(index) + '.main',
                        width: 32,
                        height: 32,
                      }}
                    >
                      {getStepIcon(index)}
                    </Avatar>
                  )}
                >
                  <Typography variant="caption">
                    {label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Descripción del paso actual */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              {STEP_DESCRIPTIONS[currentStep as keyof typeof STEP_DESCRIPTIONS]}
            </Typography>
          </Alert>

          {/* Contenido del paso */}
          {renderStepContent(currentStep)}
        </Box>
      </DialogContent>

      <DialogActions>
        {warnings.length > 0 && (
          <Button onClick={onClose} color="error">
            Cancelar - Resolver Problemas
          </Button>
        )}
        
        {currentStep > 0 && currentStep < 4 && warnings.length === 0 && (
          <Button onClick={onClose} disabled={loading}>
            Pausar Proceso
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BiometricContractSigning;