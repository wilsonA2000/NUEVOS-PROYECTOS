/**
 * Flujo de autenticación biométrica específico para CODEUDOR
 * 
 * Extends BiometricAuthenticationFlow with codeudor-specific features:
 * - Independent biometric session for cosigner
 * - Integration with guarantee system
 * - Codeudor-specific text for voice verification
 * - Separate biometric authentication tracking
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
  CircularProgress,
  Divider
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
  Verified,
  AccountCircle,
  Shield
} from '@mui/icons-material';

import CameraCaptureSimple from './CameraCaptureSimple';
import EnhancedDocumentVerification from './EnhancedDocumentVerification';
import VoiceRecorder from './VoiceRecorder';
import DigitalSignaturePad from './DigitalSignaturePad';
import { contractService } from '../../services/contractService';

interface CodeudorBiometricFlowProps {
  open: boolean;
  onClose: () => void;
  contractId: string;
  codeudorData: {
    full_name: string;
    document_type: string;
    document_number: string;
    email: string;
    phone: string;
    guarantee_type: 'codeudor_salario' | 'codeudor_finca_raiz';
  };
  onSuccess: (codeudorBiometricData: any) => void;
  onError: (error: string) => void;
}

interface CodeudorAuthStep {
  id: number;
  label: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  error?: string;
  optional?: boolean;
}

interface CodeudorBiometricData {
  codeudorAuthenticationId?: string;
  contractId: string;
  codeudorType: 'codeudor_salario' | 'codeudor_finca_raiz';
  voiceText?: string;
  expiresAt?: string;
  progress?: number;
  completedSteps?: {
    codeudor_face_front: boolean;
    codeudor_face_side: boolean;
    codeudor_document: boolean;
    codeudor_combined: boolean;
    codeudor_voice: boolean;
  };
  confidenceScores?: {
    codeudor_face_confidence: number;
    codeudor_document_confidence: number;
    codeudor_voice_confidence: number;
    codeudor_overall_confidence: number;
  };
}

const CodeudorBiometricFlow: React.FC<CodeudorBiometricFlowProps> = ({
  open,
  onClose,
  contractId,
  codeudorData,
  onSuccess,
  onError
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // States
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [biometricData, setBiometricData] = useState<CodeudorBiometricData>({
    contractId,
    codeudorType: codeudorData.guarantee_type,
    progress: 0,
    completedSteps: {
      codeudor_face_front: false,
      codeudor_face_side: false,
      codeudor_document: false,
      codeudor_combined: false,
      codeudor_voice: false,
    },
    confidenceScores: {
      codeudor_face_confidence: 0,
      codeudor_document_confidence: 0,
      codeudor_voice_confidence: 0,
      codeudor_overall_confidence: 0,
    }
  });
  const [sessionExpired, setSessionExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes

  // Codeudor-specific steps
  const [steps, setSteps] = useState<CodeudorAuthStep[]>([
    {
      id: 0,
      label: 'Captura Facial Frontal',
      description: 'Tome una foto frontal clara de su rostro como codeudor',
      icon: <CameraAlt />,
      completed: false
    },
    {
      id: 1,
      label: 'Captura Facial Lateral',
      description: 'Tome una foto de perfil lateral derecho',
      icon: <CameraAlt />,
      completed: false
    },
    {
      id: 2,
      label: 'Verificación de Documento',
      description: `Capture su ${codeudorData.document_type} número ${codeudorData.document_number}`,
      icon: <DocumentScanner />,
      completed: false
    },
    {
      id: 3,
      label: 'Foto Combinada',
      description: 'Tome una foto sosteniendo su documento junto a su rostro',
      icon: <Verified />,
      completed: false
    },
    {
      id: 4,
      label: 'Verificación de Voz',
      description: 'Grabe la frase específica del contrato',
      icon: <RecordVoiceOver />,
      completed: false
    }
  ]);

  // Timer countdown
  useEffect(() => {
    if (!open || sessionExpired) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setSessionExpired(true);
          onError('La sesión de autenticación biométrica del codeudor ha expirado');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, sessionExpired, onError]);

  // Initialize codeudor biometric session
  useEffect(() => {
    if (open && !biometricData.codeudorAuthenticationId) {
      initializeCodeudorBiometricSession();
    }
  }, [open]);

  const initializeCodeudorBiometricSession = async () => {
    try {
      setLoading(true);
      
      // Create specialized payload for codeudor biometric authentication
      const response = await contractService.startBiometricAuthentication({
        contract_id: contractId,
        user_type: 'codeudor',
        codeudor_info: {
          full_name: codeudorData.full_name,
          document_type: codeudorData.document_type,
          document_number: codeudorData.document_number,
          email: codeudorData.email,
          phone: codeudorData.phone,
          guarantee_type: codeudorData.guarantee_type
        }
      });

      if (response.authentication_id) {
        setBiometricData(prev => ({
          ...prev,
          codeudorAuthenticationId: response.authentication_id,
          voiceText: response.voice_text || `Como codeudor ${codeudorData.guarantee_type === 'codeudor_salario' ? 'personal' : 'con finca raíz'}, acepto solidariamente las obligaciones del contrato de arrendamiento número ${response.contract_number}`,
          expiresAt: response.expires_at
        }));

        console.log('✅ Codeudor biometric session initialized:', response.authentication_id);
      }
    } catch (error) {
      console.error('❌ Error initializing codeudor biometric session:', error);
      onError('Error al inicializar la sesión biométrica del codeudor');
    } finally {
      setLoading(false);
    }
  };

  const handleStepCompletion = useCallback(async (stepId: number, data?: any) => {
    try {
      setLoading(true);
      
      let response;
      let stepName = '';

      switch (stepId) {
        case 0: // Face front capture
          stepName = 'codeudor_face_front';
          response = await contractService.processFaceCapture({
            authentication_id: biometricData.codeudorAuthenticationId!,
            face_image: data.imageData,
            capture_type: 'front',
            user_type: 'codeudor'
          });
          break;

        case 1: // Face side capture
          stepName = 'codeudor_face_side';
          response = await contractService.processFaceCapture({
            authentication_id: biometricData.codeudorAuthenticationId!,
            face_image: data.imageData,
            capture_type: 'side',
            user_type: 'codeudor'
          });
          break;

        case 2: // Document verification
          stepName = 'codeudor_document';
          response = await contractService.processDocumentVerification({
            authentication_id: biometricData.codeudorAuthenticationId!,
            document_image: data.documentImage,
            document_type: codeudorData.document_type,
            expected_document_number: codeudorData.document_number,
            user_type: 'codeudor'
          });
          break;

        case 3: // Combined capture
          stepName = 'codeudor_combined';
          response = await contractService.processCombinedCapture({
            authentication_id: biometricData.codeudorAuthenticationId!,
            combined_image: data.combinedImage,
            user_type: 'codeudor'
          });
          break;

        case 4: // Voice recording
          stepName = 'codeudor_voice';
          response = await contractService.processVoiceCapture({
            authentication_id: biometricData.codeudorAuthenticationId!,
            voice_recording: data.audioBlob,
            expected_text: biometricData.voiceText!,
            user_type: 'codeudor'
          });
          break;
      }

      if (response && response.success) {
        // Update completed steps
        setBiometricData(prev => ({
          ...prev,
          completedSteps: {
            ...prev.completedSteps!,
            [stepName]: true
          },
          confidenceScores: {
            ...prev.confidenceScores!,
            [`${stepName}_confidence`]: response.confidence_score || 0
          },
          progress: Math.round(((activeStep + 1) / steps.length) * 100)
        }));

        // Update step status
        setSteps(prev => prev.map(step => 
          step.id === stepId 
            ? { ...step, completed: true, error: undefined }
            : step
        ));

        // Move to next step or complete
        if (stepId < steps.length - 1) {
          setActiveStep(stepId + 1);
        } else {
          await completeCodeudorBiometricAuth();
        }

        console.log(`✅ Codeudor step ${stepId} completed:`, response);
      } else {
        throw new Error(response?.message || `Error en paso ${stepId + 1}`);
      }

    } catch (error) {
      console.error(`❌ Error in codeudor step ${stepId}:`, error);
      
      setSteps(prev => prev.map(step => 
        step.id === stepId 
          ? { ...step, error: error instanceof Error ? error.message : String(error) }
          : step
      ));
      
      onError(`Error en el paso ${stepId + 1}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [activeStep, biometricData, codeudorData, steps.length, onError]);

  const completeCodeudorBiometricAuth = async () => {
    try {
      setLoading(true);
      
      const response = await contractService.completeAuthentication({
        authentication_id: biometricData.codeudorAuthenticationId!,
        user_type: 'codeudor'
      });

      if (response.success) {
        // Calculate overall confidence
        const overallConfidence = Object.values(biometricData.confidenceScores!).reduce((a, b) => a + b, 0) / 4;
        
        const finalBiometricData = {
          ...biometricData,
          confidenceScores: {
            ...biometricData.confidenceScores!,
            codeudor_overall_confidence: overallConfidence
          }
        };

        console.log('✅ Codeudor biometric authentication completed:', finalBiometricData);
        onSuccess(finalBiometricData);
        
        // Close dialog after success
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error completing codeudor biometric auth:', error);
      onError('Error al completar la autenticación biométrica del codeudor');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryStep = (stepId: number) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, error: undefined }
        : step
    ));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStepContent = (stepId: number) => {
    if (loading) {
      return (
        <Box display="flex" flexDirection="column" alignItems="center" py={4}>
          <CircularProgress size={60} />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Procesando verificación biométrica del codeudor...
          </Typography>
        </Box>
      );
    }

    const currentStep = steps[stepId];
    if (currentStep?.error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            {currentStep.error}
          </Typography>
          <Button 
            size="small" 
            startIcon={<Refresh />}
            onClick={() => handleRetryStep(stepId)}
          >
            Reintentar
          </Button>
        </Alert>
      );
    }

    switch (stepId) {
      case 0:
      case 1:
        return (
          <CameraCaptureSimple
            onCapture={(imageData) => handleStepCompletion(stepId, { imageData })}
            captureType={stepId === 0 ? 'front' : 'side'}
            userType="codeudor"
            instructions={stepId === 0 
              ? `${codeudorData.full_name}, posicione su rostro en el centro del marco`
              : `${codeudorData.full_name}, muestre su perfil derecho`
            }
          />
        );

      case 2:
        return (
          <EnhancedDocumentVerification
            onDocumentCapture={(documentImage) => handleStepCompletion(stepId, { documentImage })}
            expectedDocumentType={codeudorData.document_type}
            expectedDocumentNumber={codeudorData.document_number}
            userType="codeudor"
            holderName={codeudorData.full_name}
          />
        );

      case 3:
        return (
          <CameraCaptureSimple
            onCapture={(imageData) => handleStepCompletion(stepId, { combinedImage: imageData })}
            captureType="combined"
            userType="codeudor"
            instructions={`${codeudorData.full_name}, sostenga su documento junto a su rostro`}
          />
        );

      case 4:
        return (
          <VoiceRecorder
            onRecordingComplete={(audioBlob) => handleStepCompletion(stepId, { audioBlob })}
            expectedText={biometricData.voiceText || ''}
            userType="codeudor"
            userName={codeudorData.full_name}
          />
        );

      default:
        return null;
    }
  };

  if (sessionExpired) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Error color="error" sx={{ mr: 1 }} />
            Sesión Expirada
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error">
            La sesión de autenticación biométrica del codeudor ha expirado.
            Por favor, inicie el proceso nuevamente.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="primary">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      disableEscapeKeyDown
    >
      <DialogTitle>
        <Box display="flex" justifyContent="between" alignItems="center">
          <Box display="flex" alignItems="center">
            <Shield color="primary" sx={{ mr: 2 }} />
            <Box>
              <Typography variant="h6" component="div">
                Verificación Biométrica del Codeudor
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {codeudorData.full_name} • {codeudorData.document_type} {codeudorData.document_number}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Garantía: {codeudorData.guarantee_type === 'codeudor_salario' ? 'Personal con Salario' : 'Real con Finca Raíz'}
              </Typography>
            </Box>
          </Box>
          
          {/* Timer and progress */}
          <Box display="flex" alignItems="center" gap={2}>
            <Chip
              icon={<Timer />}
              label={formatTime(timeRemaining)}
              color={timeRemaining < 300 ? "error" : "default"}
              size="small"
            />
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
        
        {/* Progress indicator */}
        <Box sx={{ mt: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={biometricData.progress || 0}
            sx={{ height: 6, borderRadius: 3 }}
          />
          <Typography variant="caption" color="text.secondary">
            Progreso: {biometricData.progress || 0}% • Paso {activeStep + 1} de {steps.length}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Stepper 
          activeStep={activeStep} 
          orientation={isMobile ? "vertical" : "horizontal"}
          sx={{ p: 3 }}
        >
          {steps.map((step, index) => (
            <Step key={step.id} completed={step.completed}>
              <StepLabel
                error={!!step.error}
                icon={
                  step.completed ? (
                    <CheckCircle color="success" />
                  ) : step.error ? (
                    <Error color="error" />
                  ) : (
                    step.icon
                  )
                }
              >
                <Typography variant="subtitle2">
                  {step.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </StepLabel>
              
              {isMobile && (
                <StepContent>
                  {index === activeStep && renderStepContent(index)}
                </StepContent>
              )}
            </Step>
          ))}
        </Stepper>

        {/* Desktop step content */}
        {!isMobile && (
          <Paper elevation={0} sx={{ p: 3, m: 3, mt: 0, bgcolor: 'background.default' }}>
            {renderStepContent(activeStep)}
          </Paper>
        )}

        {/* Confidence scores */}
        {Object.values(biometricData.completedSteps || {}).some(Boolean) && (
          <Box sx={{ p: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Puntuaciones de Confianza del Codeudor
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              {biometricData.completedSteps?.codeudor_face_front && (
                <Chip 
                  size="small" 
                  label={`Rostro: ${Math.round((biometricData.confidenceScores?.codeudor_face_confidence || 0) * 100)}%`}
                  color={biometricData.confidenceScores!.codeudor_face_confidence > 0.8 ? "success" : "warning"}
                />
              )}
              {biometricData.completedSteps?.codeudor_document && (
                <Chip 
                  size="small" 
                  label={`Documento: ${Math.round((biometricData.confidenceScores?.codeudor_document_confidence || 0) * 100)}%`}
                  color={biometricData.confidenceScores!.codeudor_document_confidence > 0.8 ? "success" : "warning"}
                />
              )}
              {biometricData.completedSteps?.codeudor_voice && (
                <Chip 
                  size="small" 
                  label={`Voz: ${Math.round((biometricData.confidenceScores?.codeudor_voice_confidence || 0) * 100)}%`}
                  color={biometricData.confidenceScores!.codeudor_voice_confidence > 0.8 ? "success" : "warning"}
                />
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          color="inherit"
        >
          Cancelar
        </Button>
        
        {activeStep > 0 && (
          <Button 
            onClick={() => setActiveStep(prev => prev - 1)}
            disabled={loading}
          >
            Anterior
          </Button>
        )}
        
        {/* Show completion status */}
        {steps.every(step => step.completed) && (
          <Alert severity="success" sx={{ ml: 2 }}>
            <Typography variant="body2">
              ✅ Verificación biométrica del codeudor completada exitosamente
            </Typography>
          </Alert>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CodeudorBiometricFlow;