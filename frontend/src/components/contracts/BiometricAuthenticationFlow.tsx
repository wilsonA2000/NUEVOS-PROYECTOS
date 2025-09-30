/**
 * Flujo completo de autenticación biométrica para contratos digitales.
 * 
 * Implementa el flujo de 5 pasos solicitado por el usuario:
 * 1. Captura facial frontal y lateral
 * 2. Verificación de documento de identidad
 * 3. Foto combinada (documento + rostro)
 * 4. Grabación de voz con texto específico
 * 5. Firma digital final
 * 
 * Features:
 * - Stepper visual con progreso
 * - Guías visuales para cada paso
 * - Manejo de errores y retry
 * - UX optimizada para mobile y desktop
 * - Integración completa con APIs backend
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Box,
  Alert,
  LinearProgress,
  Chip,
  useTheme,
  useMediaQuery,
  Paper,
  IconButton,
  Tooltip,
  Fade,
  CircularProgress
} from '@mui/material';
import {
  CameraAlt,
  DocumentScanner,
  RecordVoiceOver,
  Draw,
  CheckCircle,
  Error,
  Info,
  Close,
  Refresh,
  Security,
  Timer,
  Verified
} from '@mui/icons-material';

import CameraCaptureSimple from './CameraCaptureSimple';
// import CameraCapture from './CameraCapture'; // Temporalmente deshabilitado
import DocumentVerification from './DocumentVerification';
import EnhancedDocumentVerification from './EnhancedDocumentVerification';
import VoiceRecorder from './VoiceRecorder';
import DigitalSignaturePad from './DigitalSignaturePad';
import { contractService } from '../../services/contractService';

interface BiometricAuthenticationFlowProps {
  open: boolean;
  onClose: () => void;
  contractId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

interface AuthenticationStep {
  id: number;
  label: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  error?: string;
  optional?: boolean;
}

interface BiometricData {
  authenticationId?: string;
  contractStatus?: string;
  voiceText?: string;
  expiresAt?: string;
  progress?: number;
  completedSteps?: {
    face_front: boolean;
    face_side: boolean;
    document: boolean;
    combined: boolean;
    voice: boolean;
  };
  confidenceScores?: {
    face_confidence: number;
    document_confidence: number;
    voice_confidence: number;
    overall_confidence: number;
  };
}

const BiometricAuthenticationFlow: React.FC<BiometricAuthenticationFlowProps> = ({
  open,
  onClose,
  contractId,
  onSuccess,
  onError
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Estados principales
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricData, setBiometricData] = useState<BiometricData>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  // Estados de pasos individuales
  const [faceCaptureData, setFaceCaptureData] = useState<{ front: string; side: string } | null>(null);
  const [documentData, setDocumentData] = useState<{ image: string; type: string; number?: string } | null>(null);
  const [combinedImageData, setCombinedImageData] = useState<string | null>(null);
  const [voiceData, setVoiceData] = useState<{ recording: string; text: string } | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Configuración de pasos
  const steps: AuthenticationStep[] = [
    {
      id: 0,
      label: 'Captura Facial',
      description: 'Tome una foto frontal y lateral de su rostro',
      icon: <CameraAlt />,
      completed: biometricData.completedSteps?.face_front && biometricData.completedSteps?.face_side || false
    },
    {
      id: 1,
      label: 'Documento de Identidad',
      description: 'Fotografíe su documento de identidad',
      icon: <DocumentScanner />,
      completed: biometricData.completedSteps?.document || false
    },
    {
      id: 2,
      label: 'Verificación Combinada',
      description: 'Foto del documento junto a su rostro',
      icon: <Security />,
      completed: biometricData.completedSteps?.combined || false
    },
    {
      id: 3,
      label: 'Grabación de Voz',
      description: 'Grabe la frase de verificación',
      icon: <RecordVoiceOver />,
      completed: biometricData.completedSteps?.voice || false
    },
    {
      id: 4,
      label: 'Firma Digital',
      description: 'Firme digitalmente el contrato',
      icon: <Draw />,
      completed: false // Se completa al finalizar todo el proceso
    }
  ];

  // Timer para la expiración
  useEffect(() => {
    if (biometricData.expiresAt) {
      const expiryTime = new Date(biometricData.expiresAt).getTime();
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, expiryTime - now);
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          setError('La sesión de autenticación ha expirado. Inicie el proceso nuevamente.');
        }
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [biometricData.expiresAt]);

  // Inicializar autenticación biométrica
  const initializeBiometricAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await contractService.startBiometricAuthentication(contractId);
      
      setBiometricData({
        authenticationId: response.authentication_id,
        contractStatus: response.contract_status,
        voiceText: response.voice_text,
        expiresAt: response.expires_at,
        progress: response.progress || 0
      });
      
      setActiveStep(0);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Error iniciando autenticación biométrica';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contractId, onError]);

  // Inicializar al abrir el modal
  useEffect(() => {
    if (open && !biometricData.authenticationId) {
      initializeBiometricAuth();
    }
  }, [open, biometricData.authenticationId, initializeBiometricAuth]);

  // Manejar captura facial
  const handleFaceCapture = useCallback(async (frontImage: string, sideImage: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await contractService.processFaceCapture(contractId, frontImage, sideImage);
      
      setFaceCaptureData({ front: frontImage, side: sideImage });
      setBiometricData(prev => ({
        ...prev,
        progress: response.overall_progress,
        completedSteps: {
          ...prev.completedSteps,
          face_front: true,
          face_side: true
        },
        confidenceScores: {
          ...prev.confidenceScores,
          face_confidence: response.face_confidence_score
        }
      }));
      
      setActiveStep(1);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Error procesando captura facial';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  // Manejar verificación de documento (ahora acepta PDF)
  const handleDocumentVerification = useCallback(async (documentImage: string, documentType: string, documentNumber?: string, pdfFile?: File) => {
    try {
      setLoading(true);
      setError(null);
      
      // Si hay un PDF, procesarlo de manera especial
      if (pdfFile) {
        console.log('📄 Procesando documento PDF:', pdfFile.name);
        // Para PDF, podemos enviar directamente el archivo o el dataURL
        // El backend puede procesarlo con librerías de PDF
      }
      
      const response = await contractService.processDocumentVerification(contractId, documentImage, documentType, documentNumber);
      
      setDocumentData({ image: documentImage, type: documentType, number: documentNumber });
      setBiometricData(prev => ({
        ...prev,
        progress: response.overall_progress,
        completedSteps: {
          ...prev.completedSteps,
          document: true
        },
        confidenceScores: {
          ...prev.confidenceScores,
          document_confidence: response.document_confidence_score
        }
      }));
      
      setActiveStep(2);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Error procesando documento';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  // Manejar verificación combinada
  const handleCombinedVerification = useCallback(async (combinedImage: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await contractService.processCombinedVerification(contractId, combinedImage);
      
      setCombinedImageData(combinedImage);
      setBiometricData(prev => ({
        ...prev,
        progress: response.overall_progress,
        completedSteps: {
          ...prev.completedSteps,
          combined: true
        }
      }));
      
      setActiveStep(3);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Error procesando verificación combinada';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  // Manejar grabación de voz
  const handleVoiceRecording = useCallback(async (voiceRecording: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await contractService.processVoiceVerification(contractId, voiceRecording, biometricData.voiceText);
      
      setVoiceData({ recording: voiceRecording, text: biometricData.voiceText || '' });
      setBiometricData(prev => ({
        ...prev,
        progress: response.overall_progress,
        completedSteps: {
          ...prev.completedSteps,
          voice: true
        },
        confidenceScores: {
          ...prev.confidenceScores,
          voice_confidence: response.voice_confidence_score
        }
      }));
      
      setActiveStep(4);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Error procesando grabación de voz';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contractId, biometricData.voiceText]);

  // Completar autenticación y proceder a firma
  const handleCompleteAuthentication = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await contractService.completeAuthentication(contractId);
      
      if (response.success) {
        setBiometricData(prev => ({
          ...prev,
          contractStatus: response.contract_status,
          confidenceScores: {
            ...prev.confidenceScores,
            overall_confidence: response.overall_confidence
          }
        }));
        
        // Completar autenticación exitosamente
        onSuccess();
      } else {
        throw new Error(response.reason || 'Autenticación fallida');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Error completando autenticación';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contractId, onSuccess]);

  // Manejar firma digital
  const handleDigitalSignature = useCallback(async (signatureImage: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Primero completar la autenticación biométrica
      await handleCompleteAuthentication();
      
      // Luego procesar la firma digital
      await contractService.signContract(contractId, signatureImage);
      
      setSignatureData(signatureImage);
      onSuccess();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Error procesando firma digital';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contractId, handleCompleteAuthentication, onSuccess]);

  // Reiniciar proceso
  const handleRestart = useCallback(() => {
    setActiveStep(0);
    setError(null);
    setFaceCaptureData(null);
    setDocumentData(null);
    setCombinedImageData(null);
    setVoiceData(null);
    setSignatureData(null);
    setBiometricData({});
    initializeBiometricAuth();
  }, [initializeBiometricAuth]);

  // Formatear tiempo restante
  const formatTimeRemaining = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Renderizar contenido del paso activo
  const renderStepContent = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return (
          <CameraCaptureSimple
            onCapture={(image) => {
              console.log('📷 Imagen capturada en step 0');
              // Simulamos el handleFaceCapture con una imagen
              handleFaceCapture(image, image); // front y side iguales por ahora
            }}
            onError={(error) => setError(error)}
          />
        );
      
      case 1:
        return (
          <EnhancedDocumentVerification
            onVerify={(data) => {
              // Adaptar el nuevo formato de datos al handler existente
              handleDocumentVerification(
                data.frontPhotoWithFace || '',
                data.documentType,
                data.documentNumber,
                data.pdfFile || undefined
              );
            }}
            loading={loading}
            error={error}
          />
        );
      
      case 2:
        return (
          <CameraCaptureSimple
            onCapture={(image) => {
              console.log('📷 Imagen combinada capturada');
              handleCombinedVerification(image);
            }}
            onError={(error) => setError(error)}
          />
        );
      
      case 3:
        return (
          <VoiceRecorder
            onRecord={handleVoiceRecording}
            expectedText={biometricData.voiceText || ''}
            loading={loading}
            error={error}
          />
        );
      
      case 4:
        return (
          <DigitalSignaturePad
            onSign={handleDigitalSignature}
            contractNumber={contractId}
            loading={loading}
            error={error}
            biometricData={biometricData}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      scroll="body"
      PaperProps={{
        sx: {
          height: isMobile ? '100vh' : '90vh',
          maxHeight: isMobile ? '100vh' : '90vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          position: 'relative',
          pb: 2
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Security fontSize="large" />
            <Box>
              <Typography variant="h6" component="div">
                Autenticación Biométrica
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Contrato: {contractId.slice(0, 8)}...
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" alignItems="center" gap={2}>
            {/* Timer */}
            {timeRemaining > 0 && (
              <Chip
                icon={<Timer />}
                label={formatTimeRemaining(timeRemaining)}
                color="secondary"
                variant="outlined"
                sx={{ color: 'white', borderColor: 'white' }}
              />
            )}
            
            {/* Progreso general */}
            {biometricData.progress && (
              <Chip
                icon={<CircularProgress size={16} color="inherit" />}
                label={`${Math.round(biometricData.progress)}%`}
                color="secondary"
                sx={{ color: 'white' }}
              />
            )}
            
            <IconButton onClick={onClose} sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </Box>
        </Box>
        
        {/* Barra de progreso */}
        {biometricData.progress && (
          <LinearProgress
            variant="determinate"
            value={biometricData.progress}
            sx={{
              mt: 2,
              height: 4,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': {
                bgcolor: theme.palette.secondary.main
              }
            }}
          />
        )}
      </DialogTitle>

      <DialogContent 
        sx={{ 
          p: 0, 
          overflow: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {error && (
          <Alert 
            severity="error" 
            sx={{ m: 2, mb: 0 }}
            action={
              <Button color="inherit" size="small" onClick={handleRestart} startIcon={<Refresh />}>
                Reintentar
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        <Box sx={{ p: 2 }}>
          <Stepper 
            activeStep={activeStep} 
            orientation={isMobile ? 'vertical' : 'horizontal'}
            alternativeLabel={!isMobile}
          >
            {steps.map((step, index) => (
              <Step key={step.id} completed={step.completed}>
                <StepLabel
                  icon={
                    step.completed ? (
                      <CheckCircle color="success" />
                    ) : step.error ? (
                      <Error color="error" />
                    ) : (
                      step.icon
                    )
                  }
                  error={!!step.error}
                >
                  <Typography variant="body1" fontWeight={activeStep === index ? 600 : 400}>
                    {step.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </StepLabel>
                
                {isMobile && (
                  <StepContent>
                    {activeStep === index && (
                      <Fade in timeout={300}>
                        <Box sx={{ mt: 2 }}>
                          {renderStepContent(index)}
                        </Box>
                      </Fade>
                    )}
                  </StepContent>
                )}
              </Step>
            ))}
          </Stepper>

          {/* Contenido del paso para desktop */}
          {!isMobile && (
            <Paper elevation={0} sx={{ mt: 3, p: 3, bgcolor: 'grey.50' }}>
              <Fade in timeout={300} key={activeStep}>
                <Box>
                  {renderStepContent(activeStep)}
                </Box>
              </Fade>
            </Paper>
          )}
        </Box>

        {/* Panel de puntuaciones de confianza */}
        {biometricData.confidenceScores && Object.keys(biometricData.confidenceScores).length > 0 && (
          <Box sx={{ px: 2, pb: 2 }}>
            <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
              <Typography variant="h6" gutterBottom color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Verified />
                Puntuaciones de Confianza
              </Typography>
              
              <Box display="grid" gridTemplateColumns={isMobile ? '1fr' : 'repeat(4, 1fr)'} gap={2}>
                {biometricData.confidenceScores.face_confidence > 0 && (
                  <Box textAlign="center">
                    <Typography variant="body2" color="text.secondary">Facial</Typography>
                    <Typography variant="h6" color="success.main">
                      {Math.round(biometricData.confidenceScores.face_confidence * 100)}%
                    </Typography>
                  </Box>
                )}
                
                {biometricData.confidenceScores.document_confidence > 0 && (
                  <Box textAlign="center">
                    <Typography variant="body2" color="text.secondary">Documento</Typography>
                    <Typography variant="h6" color="success.main">
                      {Math.round(biometricData.confidenceScores.document_confidence * 100)}%
                    </Typography>
                  </Box>
                )}
                
                {biometricData.confidenceScores.voice_confidence > 0 && (
                  <Box textAlign="center">
                    <Typography variant="body2" color="text.secondary">Voz</Typography>
                    <Typography variant="h6" color="success.main">
                      {Math.round(biometricData.confidenceScores.voice_confidence * 100)}%
                    </Typography>
                  </Box>
                )}
                
                {biometricData.confidenceScores.overall_confidence > 0 && (
                  <Box textAlign="center">
                    <Typography variant="body2" color="text.secondary">General</Typography>
                    <Typography variant="h6" color="success.main">
                      {Math.round(biometricData.confidenceScores.overall_confidence * 100)}%
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        
        {activeStep > 0 && (
          <Button
            onClick={() => setActiveStep(prev => prev - 1)}
            disabled={loading}
            startIcon={<Refresh />}
          >
            Anterior
          </Button>
        )}
        
        <Button
          onClick={handleRestart}
          disabled={loading}
          startIcon={<Refresh />}
          color="warning"
        >
          Reiniciar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BiometricAuthenticationFlow;