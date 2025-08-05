import React, { useRef, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  Fingerprint as FingerprintIcon,
  ContactMail as DocumentIcon,
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface BiometricVerificationProps {
  onVerificationComplete: (verificationData: BiometricData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface BiometricData {
  facialRecognition?: {
    imageData: string;
    confidence: number;
    landmarks: FacialLandmarks;
    timestamp: Date;
  };
  documentVerification?: {
    frontImage: string;
    backImage?: string;
    extractedData: DocumentData;
    confidence: number;
    timestamp: Date;
  };
  fingerprint?: {
    template: string;
    quality: number;
    timestamp: Date;
  };
  deviceFingerprint: {
    userAgent: string;
    screenResolution: string;
    timezone: string;
    language: string;
    platform: string;
  };
}

interface FacialLandmarks {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  nose: { x: number; y: number };
  mouth: { x: number; y: number };
}

interface DocumentData {
  documentType: string;
  documentNumber: string;
  fullName: string;
  dateOfBirth?: string;
  expirationDate?: string;
  issuingAuthority?: string;
}

const BiometricVerification: React.FC<BiometricVerificationProps> = ({
  onVerificationComplete,
  onCancel,
  isLoading = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedData, setCapturedData] = useState<Partial<BiometricData>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationResults, setVerificationResults] = useState<{
    facial: boolean | null;
    document: boolean | null;
    fingerprint: boolean | null;
  }>({
    facial: null,
    document: null,
    fingerprint: null
  });

  const steps = [
    {
      label: 'Verificación Facial',
      description: 'Capture una foto clara de su rostro',
      icon: <CameraIcon />
    },
    {
      label: 'Verificación de Documento',
      description: 'Escanee su documento de identidad',
      icon: <DocumentIcon />
    },
    {
      label: 'Huella Digital (Opcional)',
      description: 'Capture su huella digital',
      icon: <FingerprintIcon />
    }
  ];

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('No se pudo acceder a la cámara. Verifique los permisos.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  };

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const performFacialRecognition = async () => {
    setIsProcessing(true);
    
    try {
      const imageData = await capturePhoto();
      if (!imageData) throw new Error('No se pudo capturar la imagen');

      // Simular procesamiento de reconocimiento facial
      // NOTA: En producción, esto se conectaría con APIs reales de reconocimiento facial
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generar datos realistas pero simulados
      const confidence = 0.92 + Math.random() * 0.05; // Entre 0.92 y 0.97
      const mockLandmarks: FacialLandmarks = {
        leftEye: { x: 145 + Math.random() * 10, y: 115 + Math.random() * 10 },
        rightEye: { x: 195 + Math.random() * 10, y: 115 + Math.random() * 10 },
        nose: { x: 170 + Math.random() * 10, y: 145 + Math.random() * 10 },
        mouth: { x: 170 + Math.random() * 10, y: 175 + Math.random() * 10 }
      };

      const facialData = {
        imageData,
        confidence,
        landmarks: mockLandmarks,
        timestamp: new Date(),
        verificationMethod: 'simulated_facial_recognition',
        deviceInfo: {
          camera: 'front-facing',
          resolution: '1280x720',
          lighting: 'adequate'
        }
      };

      setCapturedData(prev => ({
        ...prev,
        facialRecognition: facialData
      }));

      setVerificationResults(prev => ({ ...prev, facial: true }));
      setActiveStep(1);
      
    } catch (error) {
      console.error('Error in facial recognition:', error);
      setVerificationResults(prev => ({ ...prev, facial: false }));
    } finally {
      setIsProcessing(false);
      stopCamera();
    }
  };

  const captureDocument = async (side: 'front' | 'back' = 'front') => {
    setIsProcessing(true);
    
    try {
      await startCamera();
      // Give user time to position document
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const imageData = await capturePhoto();
      if (!imageData) throw new Error('No se pudo capturar el documento');

      // Simular procesamiento OCR
      // NOTA: En producción, esto se conectaría con APIs reales de OCR y verificación de documentos
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Generar datos de documento simulados pero realistas
      const documentTypes = ['Cédula de Ciudadanía', 'Pasaporte', 'Cédula de Extranjería'];
      const selectedType = documentTypes[Math.floor(Math.random() * documentTypes.length)];
      
      const mockDocumentData: DocumentData = {
        documentType: selectedType,
        documentNumber: Math.floor(Math.random() * 99999999999).toString(),
        fullName: 'Usuario VeriHome', // En producción sería extraído del documento
        dateOfBirth: '1990-05-15',
        expirationDate: '2030-05-15',
        issuingAuthority: selectedType === 'Pasaporte' ? 'Ministerio de Relaciones Exteriores' : 'Registraduría Nacional'
      };

      const documentVerification = {
        frontImage: imageData,
        extractedData: mockDocumentData,
        confidence: 0.92,
        timestamp: new Date()
      };

      setCapturedData(prev => ({
        ...prev,
        documentVerification
      }));

      setVerificationResults(prev => ({ ...prev, document: true }));
      setActiveStep(2);
      
    } catch (error) {
      console.error('Error in document capture:', error);
      setVerificationResults(prev => ({ ...prev, document: false }));
    } finally {
      setIsProcessing(false);
      stopCamera();
    }
  };

  const captureFingerprint = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate fingerprint capture
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock fingerprint data
      const fingerprintData = {
        template: 'FINGERPRINT_TEMPLATE_HASH_' + Date.now(),
        quality: 0.88,
        timestamp: new Date()
      };

      setCapturedData(prev => ({
        ...prev,
        fingerprint: fingerprintData
      }));

      setVerificationResults(prev => ({ ...prev, fingerprint: true }));
      
    } catch (error) {
      console.error('Error in fingerprint capture:', error);
      setVerificationResults(prev => ({ ...prev, fingerprint: false }));
    } finally {
      setIsProcessing(false);
    }
  };

  const completeVerification = () => {
    const deviceFingerprint = {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform
    };

    const finalData: BiometricData = {
      ...capturedData,
      deviceFingerprint
    } as BiometricData;

    onVerificationComplete(finalData);
  };

  const getStepIcon = (stepIndex: number) => {
    const isCompleted = stepIndex === 0 ? verificationResults.facial :
                      stepIndex === 1 ? verificationResults.document :
                      verificationResults.fingerprint;
    
    if (isCompleted === true) return <CheckIcon color="success" />;
    if (isCompleted === false) return <WarningIcon color="error" />;
    return steps[stepIndex].icon;
  };

  const canComplete = verificationResults.facial === true && 
                     verificationResults.document === true;

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SecurityIcon sx={{ mr: 1 }} />
        Verificación Biométrica de Identidad
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Para garantizar la seguridad del contrato, necesitamos verificar su identidad 
        mediante métodos biométricos. Este proceso es seguro y cumple con estándares internacionales.
      </Alert>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <strong>Modo de Desarrollo:</strong> La verificación biométrica actual es simulada para propósitos de demostración.
        En producción, esto se conectaría con APIs reales de reconocimiento facial, OCR y verificación de documentos.
      </Alert>

      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel icon={getStepIcon(index)}>
              <Typography variant="subtitle1">{step.label}</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {step.description}
              </Typography>

              {/* Facial Recognition Step */}
              {index === 0 && (
                <Box>
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={8}>
                          {isCameraActive ? (
                            <Box sx={{ position: 'relative', textAlign: 'center' }}>
                              <video
                                ref={videoRef}
                                autoPlay
                                muted
                                style={{
                                  width: '100%',
                                  maxWidth: '400px',
                                  borderRadius: '8px',
                                  border: '2px solid #ddd'
                                }}
                              />
                              <canvas ref={canvasRef} style={{ display: 'none' }} />
                              {isProcessing && (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    bgcolor: 'rgba(0,0,0,0.7)',
                                    color: 'white',
                                    p: 2,
                                    borderRadius: 1
                                  }}
                                >
                                  <CircularProgress size={24} sx={{ mr: 1 }} />
                                  Procesando...
                                </Box>
                              )}
                            </Box>
                          ) : (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                              <CameraIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                              <Typography variant="body2" color="text.secondary">
                                Camera inactiva
                              </Typography>
                            </Box>
                          )}
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Instrucciones:</strong>
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            • Mire directamente a la cámara<br/>
                            • Mantenga buena iluminación<br/>
                            • No use lentes oscuros<br/>
                            • Manténgase quieto durante la captura
                          </Typography>
                          
                          {verificationResults.facial === true && (
                            <Chip
                              icon={<CheckIcon />}
                              label="Verificación Exitosa"
                              color="success"
                              sx={{ mb: 1 }}
                            />
                          )}
                          
                          {verificationResults.facial === false && (
                            <Chip
                              icon={<WarningIcon />}
                              label="Verificación Fallida"
                              color="error"
                              sx={{ mb: 1 }}
                            />
                          )}
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {!isCameraActive ? (
                      <Button
                        variant="outlined"
                        startIcon={<CameraIcon />}
                        onClick={startCamera}
                        disabled={isProcessing}
                      >
                        Activar Cámara
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="contained"
                          startIcon={isProcessing ? <CircularProgress size={20} /> : <CameraIcon />}
                          onClick={performFacialRecognition}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Procesando...' : 'Capturar Rostro'}
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={stopCamera}
                          disabled={isProcessing}
                        >
                          Detener Cámara
                        </Button>
                      </>
                    )}
                    
                    {verificationResults.facial === false && (
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => setVerificationResults(prev => ({ ...prev, facial: null }))}
                      >
                        Reintentar
                      </Button>
                    )}
                  </Box>
                </Box>
              )}

              {/* Document Verification Step */}
              {index === 1 && (
                <Box>
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={8}>
                          {isCameraActive ? (
                            <Box sx={{ position: 'relative', textAlign: 'center' }}>
                              <video
                                ref={videoRef}
                                autoPlay
                                muted
                                style={{
                                  width: '100%',
                                  maxWidth: '400px',
                                  borderRadius: '8px',
                                  border: '2px solid #ddd'
                                }}
                              />
                              {isProcessing && (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    bgcolor: 'rgba(0,0,0,0.7)',
                                    color: 'white',
                                    p: 2,
                                    borderRadius: 1
                                  }}
                                >
                                  <CircularProgress size={24} sx={{ mr: 1 }} />
                                  Procesando OCR...
                                </Box>
                              )}
                            </Box>
                          ) : (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                              <DocumentIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                              <Typography variant="body2" color="text.secondary">
                                Cámara para documento
                              </Typography>
                            </Box>
                          )}
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Tipos de documento aceptados:</strong>
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            • Cédula de Ciudadanía<br/>
                            • Pasaporte<br/>
                            • Cédula de Extranjería<br/>
                            • Tarjeta de Identidad
                          </Typography>
                          
                          {capturedData.documentVerification && (
                            <Alert severity="success" sx={{ mb: 1 }}>
                              <Typography variant="caption">
                                <strong>Documento extraído:</strong><br/>
                                {capturedData.documentVerification.extractedData.documentType}<br/>
                                {capturedData.documentVerification.extractedData.fullName}
                              </Typography>
                            </Alert>
                          )}
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={isProcessing ? <CircularProgress size={20} /> : <DocumentIcon />}
                      onClick={() => captureDocument('front')}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Procesando...' : 'Escanear Documento'}
                    </Button>
                    
                    {verificationResults.document === false && (
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => setVerificationResults(prev => ({ ...prev, document: null }))}
                      >
                        Reintentar
                      </Button>
                    )}
                  </Box>
                </Box>
              )}

              {/* Fingerprint Step */}
              {index === 2 && (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    La verificación de huella digital es opcional pero proporciona 
                    seguridad adicional.
                  </Alert>
                  
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <FingerprintIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                    <Typography variant="body2" gutterBottom>
                      Coloque su dedo en el sensor de huella digital
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Button
                      variant="contained"
                      startIcon={isProcessing ? <CircularProgress size={20} /> : <FingerprintIcon />}
                      onClick={captureFingerprint}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Capturando...' : 'Capturar Huella'}
                    </Button>
                    
                    <Button
                      variant="outlined"
                      onClick={() => setActiveStep(3)}
                    >
                      Omitir
                    </Button>
                  </Box>
                </Box>
              )}
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {/* Completion Actions */}
      {canComplete && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckIcon sx={{ mr: 1 }} />
            Verificación Completada
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Su identidad ha sido verificada exitosamente. Puede proceder con la firma del contrato.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            {onCancel && (
              <Button variant="outlined" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={isLoading ? <CircularProgress size={20} /> : <SecurityIcon />}
              onClick={completeVerification}
              disabled={isLoading}
            >
              {isLoading ? 'Finalizando...' : 'Continuar con Firma'}
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default BiometricVerification;