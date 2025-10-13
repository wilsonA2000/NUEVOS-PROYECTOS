/**
 * Flujo biométrico profesional - Diseño sin scroll con cámara grande
 * Cumple estándares empresariales para plataforma VeriHome
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  IconButton,
  Chip,
  Paper,
  useTheme,
  useMediaQuery,
  Stack,
  Fade
} from '@mui/material';
import {
  CameraAlt,
  DocumentScanner,
  RecordVoiceOver,
  Draw,
  ArrowBack,
  ArrowForward,
  CheckCircle,
  Security,
  Close
} from '@mui/icons-material';

import SimpleProfessionalCamera from './SimpleProfessionalCamera';
import EnhancedFaceCapture from './EnhancedFaceCapture';
import DocumentVerification from './DocumentVerification';
import EnhancedDocumentVerification from './EnhancedDocumentVerification';
import VoiceRecorder from './VoiceRecorder';
import EnhancedVoiceRecording from './EnhancedVoiceRecording';
import DigitalSignaturePad from './DigitalSignaturePad';
import EnhancedDigitalSignature from './EnhancedDigitalSignature';

interface ProfessionalBiometricFlowProps {
  contractId: string;
  onComplete: (data: any) => void;
  onCancel: () => void;
  userInfo?: {
    fullName?: string;
    documentNumber?: string;
    documentIssueDate?: string;
  };
}

interface StepConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  completed: boolean;
  data?: any;
}

const ProfessionalBiometricFlow: React.FC<ProfessionalBiometricFlowProps> = ({
  contractId,
  onComplete,
  onCancel,
  userInfo
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [steps, setSteps] = useState<StepConfig[]>([
    {
      id: 'face_capture',
      title: 'Captura Facial',
      subtitle: 'Tome una foto frontal de su rostro',
      icon: <CameraAlt />,
      completed: false
    },
    {
      id: 'document_verification', 
      title: 'Verificación de Documento',
      subtitle: 'Suba PDF y fotografíe su documento con su rostro',
      icon: <DocumentScanner />,
      completed: false
    },
    {
      id: 'voice_recording',
      title: 'Grabación de Voz',
      subtitle: 'Grabe la frase de verificación',
      icon: <RecordVoiceOver />,
      completed: false
    },
    {
      id: 'digital_signature',
      title: 'Firma Digital',
      subtitle: 'Firme digitalmente el contrato',
      icon: <Draw />,
      completed: false
    }
  ]);

  // Handlers
  const handleStepComplete = useCallback((stepIndex: number, data: any) => {
    console.log('🔥 handleStepComplete called:', { stepIndex, totalSteps: steps.length, isLastStep: stepIndex === 3 });

    // Actualizar el estado del paso
    setSteps(prev => {
      const updatedSteps = prev.map((step, index) =>
        index === stepIndex ? { ...step, completed: true, data } : step
      );

      // 🔧 FIX CRÍTICO: Usar stepIndex === 3 directamente en lugar de steps.length - 1
      // Esto evita problemas con closures stale
      if (stepIndex === 3) {
        console.log('✅ ÚLTIMO PASO DETECTADO - Preparando para completar flujo');

        // Construir allData con los pasos actualizados
        const allData = updatedSteps.reduce((acc, step, index) => ({
          ...acc,
          [step.id]: step.data
        }), {});

        console.log('📦 All biometric data collected:', allData);

        // Llamar a onComplete en el siguiente tick para evitar problemas de estado
        setTimeout(() => {
          console.log('🚀 Calling onComplete with allData');
          onComplete(allData);
        }, 0);
      } else {
        console.log('➡️ Avanzando al siguiente paso:', stepIndex + 1);
        // Ir al siguiente paso
        setCurrentStep(stepIndex + 1);
      }

      return updatedSteps;
    });
  }, [onComplete]);

  const handleFaceCapture = useCallback((image: string) => {
    handleStepComplete(0, { faceImage: image });
  }, [handleStepComplete]);

  const handleDocumentVerification = useCallback(async (data: any) => {
    console.log('📄 handleDocumentVerification - Datos recibidos:', data);

    // 🔧 CRÍTICO: Convertir File a base64 si existe
    if (data.pdfFile && data.pdfFile instanceof File) {
      console.log('🔄 Convirtiendo PDF File a base64...');
      const reader = new FileReader();
      const pdfBase64 = await new Promise<string>((resolve) => {
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(data.pdfFile);
      });

      // Reemplazar File con base64
      data.pdfFile = pdfBase64;
      console.log('✅ PDF convertido a base64, length:', pdfBase64.length);
    }

    handleStepComplete(1, data);
  }, [handleStepComplete]);

  const handleVoiceRecording = useCallback((data: any) => {
    handleStepComplete(2, data);
  }, [handleStepComplete]);

  const handleDigitalSignature = useCallback((data: any) => {
    handleStepComplete(3, data);
  }, [handleStepComplete]);

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Pool de frases educativas para verificación cultural
  const frasesEducativas = [
    "La educación es la llave dorada que abre todas las puertas del conocimiento",
    "Leer un libro es dialogar con las mentes más brillantes de la historia",
    "Colombia es tierra de grandes escritores y poetas que han enriquecido el mundo",
    "La literatura nos enseña a ver el mundo con otros ojos y sentir con otros corazones",
    "Cada libro leído es un viaje hacia nuevos horizontes de sabiduría",
    "La palabra escrita tiene el poder de transformar sociedades enteras",
    "En cada página hay un universo esperando ser descubierto por el lector",
    "La cultura es el alma de un pueblo y los libros son su memoria viva"
  ];

  // Generar frase personalizada para grabación de voz
  const generateVoiceText = () => {
    if (userInfo?.fullName && userInfo?.documentNumber && userInfo?.documentIssueDate) {
      return `Mi nombre es ${userInfo.fullName}, mi número de documento de identidad es ${userInfo.documentNumber}, expedido el ${userInfo.documentIssueDate}.`;
    }
    return "Por favor, diga su nombre completo, número de documento de identidad y fecha de expedición de la cédula.";
  };

  // Seleccionar frase educativa aleatoria
  const generateEducationalPhrase = () => {
    const randomIndex = Math.floor(Math.random() * frasesEducativas.length);
    return frasesEducativas[randomIndex];
  };

  // Renderizar contenido con layout optimizado para cada paso
  const renderStepContent = () => {
    switch (currentStepData.id) {
      case 'face_capture':
        return (
          <EnhancedFaceCapture
            onCapture={handleFaceCapture}
            onError={setError}
            currentStep={currentStep + 1}
            totalSteps={steps.length}
            stepName={currentStepData.title}
            onCancel={onCancel}
            loading={loading}
          />
        );
        
      case 'document_verification':
        return (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <EnhancedDocumentVerification
              onVerify={handleDocumentVerification}
              loading={loading}
              error={error}
              currentStep={currentStep + 1}
              totalSteps={steps.length}
              stepName={currentStepData.title}
              onBack={goToPreviousStep}
            />
          </Box>
        );
        
      case 'voice_recording':
        return (
          <EnhancedVoiceRecording
            onSuccess={handleVoiceRecording}
            onError={setError}
            currentStep={currentStep + 1}
            totalSteps={steps.length}
            stepName={currentStepData.title}
            onBack={goToPreviousStep}
            loading={loading}
            voiceText={generateVoiceText()}
            educationalPhrase={generateEducationalPhrase()}
            userInfo={userInfo}
          />
        );
        
      case 'digital_signature':
        return (
          <EnhancedDigitalSignature
            onSuccess={handleDigitalSignature}
            onError={setError}
            currentStep={currentStep + 1}
            totalSteps={steps.length}
            stepName={currentStepData.title}
            onBack={goToPreviousStep}
            loading={loading}
            contractData={{ contractId }}
          />
        );
        
      default:
        return null;
    }
  };

  // No mostrar header superior en pasos que tienen su propio layout
  const showHeader = !['face_capture', 'document_verification', 'voice_recording', 'digital_signature'].includes(currentStepData.id);

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'grey.50'
    }}>
      {/* Header Compacto - Solo mostrar si no es el paso de documento */}
      {showHeader && (
        <Paper elevation={1} sx={{ 
          borderRadius: 0,
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Box sx={{ 
            px: 3, 
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton 
                onClick={currentStep === 0 ? onCancel : goToPreviousStep}
                size="small"
              >
                {currentStep === 0 ? <Close /> : <ArrowBack />}
              </IconButton>
              <Box display="flex" alignItems="center" gap={1}>
                <Security color="primary" fontSize="small" />
                <Typography variant="h6" fontWeight="600">
                  Autenticación Biométrica
                </Typography>
              </Box>
            </Box>
            
            <Chip 
              label={`${currentStep + 1}/${steps.length}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
          
          {/* Progreso */}
          <LinearProgress 
            variant="determinate" 
            value={progress}
            sx={{ height: 3 }}
          />
        </Paper>
      )}

      {/* Contenido Principal - Ocupa todo el espacio disponible */}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0 // Importante para flex shrinking
      }}>
        {/* Info del paso - Minimalista - No mostrar en documento */}
        {showHeader && (
          <Box sx={{ 
            px: 3,
            py: 2,
            bgcolor: 'white',
            borderBottom: 1,
            borderColor: 'divider'
          }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Box sx={{ 
                p: 1, 
                borderRadius: 1, 
                bgcolor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center'
              }}>
                {currentStepData.icon}
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="600">
                  {currentStepData.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentStepData.subtitle}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Error */}
        {error && (
          <Box sx={{ px: 3, py: 1 }}>
            <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
              <Typography variant="body2">{error}</Typography>
            </Paper>
          </Box>
        )}

        {/* Contenido del Paso - OCUPA TODO EL ESPACIO RESTANTE */}
        <Box sx={{ 
          flex: 1,
          px: showHeader ? 3 : 0,
          py: showHeader ? 2 : 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          <Fade in={true} timeout={300}>
            <Box sx={{ height: '100%' }}>
              {renderStepContent()}
            </Box>
          </Fade>
        </Box>
      </Box>

      {/* Footer Minimalista - Solo para pasos que no tienen su propio layout */}
      {showHeader && (
        <Paper elevation={2} sx={{ 
          px: 3,
          py: 2,
          borderRadius: 0,
          borderTop: 1,
          borderColor: 'divider'
        }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {currentStepData.title}
          </Typography>
          
          <Box display="flex" gap={1}>
            {currentStep > 0 && (
              <Button
                startIcon={<ArrowBack />}
                onClick={goToPreviousStep}
                disabled={loading}
                variant="outlined"
                size="small"
              >
                Anterior
              </Button>
            )}
            
            <Typography variant="body2" color="text.secondary" sx={{ mx: 2 }}>
              Paso {currentStep + 1} de {steps.length}
            </Typography>
          </Box>
        </Stack>
        </Paper>
      )}
    </Box>
  );
};


export default ProfessionalBiometricFlow;