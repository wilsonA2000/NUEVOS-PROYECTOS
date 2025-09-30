/**
 * Componente de captura de cámara para autenticación biométrica.
 * 
 * Maneja la captura de:
 * - Fotos faciales (frontal y lateral)
 * - Fotos combinadas (documento + rostro)
 * - Validación en tiempo real
 * 
 * Features:
 * - Vista previa en tiempo real
 * - Guías visuales superpuestas
 * - Detección de calidad de imagen
 * - Soporte mobile y desktop
 * - Instrucciones paso a paso
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  IconButton,
  Dialog,
  DialogContent,
  Fade,
  CircularProgress,
  LinearProgress,
  Paper,
  useTheme,
  useMediaQuery,
  Chip,
  Grid
} from '@mui/material';
import {
  CameraAlt,
  Cameraswitch,
  CheckCircle,
  Error,
  Refresh,
  Fullscreen,
  FullscreenExit,
  FlashOn,
  FlashOff,
  PhotoCamera,
  Visibility,
  Warning
} from '@mui/icons-material';

interface CameraCaptureProps {
  onCapture: (frontImage: string, sideImage?: string) => void | ((image: string) => void);
  captureType: 'face' | 'combined';
  loading?: boolean;
  error?: string | null;
  instructions?: string;
}

interface CapturedImage {
  dataUrl: string;
  timestamp: number;
  quality: number;
  type: 'front' | 'side' | 'combined';
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  captureType,
  loading = false,
  error = null,
  instructions
}) => {
  console.log('🗞️ CameraCapture COMPONENT MOUNTED/RENDERED');
  console.log('🗞️ Props:', { captureType, loading, error, instructions });
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Referencias
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Estados
  const [cameraActive, setCameraActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<'front' | 'side' | 'combined'>('front');
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [imageQuality, setImageQuality] = useState<number>(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  
  // Configuración de pasos según el tipo de captura
  const getStepsConfig = () => {
    if (captureType === 'face') {
      return [
        {
          step: 'front' as const,
          title: 'Foto Frontal',
          instruction: 'Mire directamente a la cámara con expresión neutra',
          icon: '😐',
          overlay: 'face-front'
        },
        {
          step: 'side' as const,
          title: 'Foto Lateral',
          instruction: 'Gire su cabeza 90° hacia la derecha',
          icon: '🙂',
          overlay: 'face-side'
        }
      ];
    } else {
      return [
        {
          step: 'combined' as const,
          title: 'Documento + Rostro',
          instruction: 'Coloque su documento junto a su rostro y mire a la cámara',
          icon: '📄👤',
          overlay: 'combined'
        }
      ];
    }
  };

  const stepsConfig = getStepsConfig();
  const currentStepConfig = stepsConfig.find(s => s.step === currentStep) || stepsConfig[0];

  // Inicializar cámara - Versión simplificada
  const startCamera = useCallback(async () => {
    try {
      console.log('🎥 === INICIANDO CÁMARA SIMPLE ===');
      
      // Configuración ultra simple
      const constraints = {
        video: true,
        audio: false
      };

      console.log('🎥 Solicitando getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('🎥 Stream obtenido exitosamente:', stream.getTracks());
      
      streamRef.current = stream;
      setVideoReady(false);
      setCameraError(null);
      
      if (!videoRef.current) {
        console.error('🎥 ❌ videoRef.current es null en startCamera');
        setCameraError('Elemento de video no disponible');
        return;
      }
      
      console.log('🎥 ✅ videoRef disponible, configurando elemento video...');
      
      const videoElement = videoRef.current;
      
      // Limpiar listeners anteriores
      videoElement.onloadedmetadata = null;
      videoElement.oncanplay = null;
      videoElement.onerror = null;
      
      // Configuración directa
      videoElement.srcObject = stream;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = true;
      
      // Listeners para eventos del video
      videoElement.onloadedmetadata = () => {
        console.log('🎥 ✅ METADATA LOADED - Video dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
          setVideoReady(true);
          setCameraActive(true);
        }
      };
      
      videoElement.oncanplay = () => {
        console.log('🎥 ✅ CAN PLAY - Video ready for playback');
        setVideoReady(true);
        setCameraActive(true);
      };
      
      videoElement.onerror = (e) => {
        console.error('🎥 ❌ Video element error:', e);
        setCameraError('Error en el elemento de video');
      };
      
      // Intentar reproducir
      videoElement.play()
        .then(() => {
          console.log('🎥 ✅ PLAY SUCCESS - Video playing');
          setVideoReady(true);
          setCameraActive(true);
        })
        .catch((e) => {
          console.log('🎥 ⚠️ Play failed:', e.message);
          // Algunos navegadores no permiten autoplay, pero el video puede funcionar igual
          setVideoReady(true);
          setCameraActive(true);
        });
      
      // Timeout como fallback final
      setTimeout(() => {
        if (streamRef.current && videoElement.srcObject) {
          console.log('🎥 ⏰ TIMEOUT FALLBACK - Activating camera anyway');
          setVideoReady(true);
          setCameraActive(true);
        }
      }, 2000);
    } catch (err: any) {
      console.error('🎥 ❌ ERROR:', err);
      setCameraError(`Error: ${err.message}`);
      setCameraActive(false);
      setVideoReady(false);
    }
  }, [facingMode]);

  // Detener cámara
  const stopCamera = useCallback(() => {
    console.log('🎥 🛑 STOPPING CAMERA');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🎥 Track stopped:', track.kind);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setVideoReady(false);
  }, []);

  // Analizar calidad de imagen
  const analyzeImageQuality = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Análisis simple de calidad basado en brillo y contraste
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let brightness = 0;
    let contrast = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      brightness += luminance;
    }
    
    brightness /= (data.length / 4);
    
    // Calcular contraste (simplificado)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      contrast += Math.abs(luminance - brightness);
    }
    
    contrast /= (data.length / 4);
    
    // Calcular puntuación de calidad (0-100)
    const brightnessScore = Math.max(0, 100 - Math.abs(brightness - 128) * 2);
    const contrastScore = Math.min(100, contrast * 2);
    const quality = (brightnessScore + contrastScore) / 2;
    
    setImageQuality(quality);
  }, []);

  // Capturar imagen
  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Configurar canvas con resolución alta
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Aplicar flash si está habilitado
      if (flashEnabled) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Capturar imagen
      ctx.drawImage(video, 0, 0);
      
      // Aplicar mejoras de imagen
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const enhancedImageData = enhanceImage(imageData);
      ctx.putImageData(enhancedImageData, 0, 0);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      const newImage: CapturedImage = {
        dataUrl,
        timestamp: Date.now(),
        quality: imageQuality,
        type: currentStep
      };
      
      setCapturedImages(prev => [...prev, newImage]);
      
      // Proceder al siguiente paso o completar
      if (captureType === 'face' && currentStep === 'front') {
        setCurrentStep('side');
      } else {
        // Completar captura
        if (captureType === 'face') {
          const frontImage = capturedImages.find(img => img.type === 'front')?.dataUrl;
          const sideImage = newImage.dataUrl;
          
          if (frontImage && onCapture) {
            (onCapture as (front: string, side: string) => void)(frontImage, sideImage);
          }
        } else {
          if (onCapture) {
            (onCapture as (image: string) => void)(dataUrl);
          }
        }
      }
    } catch (err) {
      console.error('Error capturing image:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [videoRef, canvasRef, currentStep, capturedImages, captureType, onCapture, imageQuality, flashEnabled, isCapturing]);

  // Mejorar imagen (básico)
  const enhanceImage = (imageData: ImageData): ImageData => {
    const data = imageData.data;
    
    // Ajuste básico de contraste y brillo
    const contrast = 1.1;
    const brightness = 10;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] * contrast + brightness));     // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * contrast + brightness)); // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * contrast + brightness)); // B
    }
    
    return imageData;
  };

  // Cambiar cámara
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // Reiniciar captura
  const resetCapture = useCallback(() => {
    setCapturedImages([]);
    setCurrentStep(captureType === 'face' ? 'front' : 'combined');
  }, [captureType]);

  // Efectos
  useEffect(() => {
    if (cameraActive) {
      const interval = setInterval(analyzeImageQuality, 500);
      return () => clearInterval(interval);
    }
  }, [cameraActive, analyzeImageQuality]);

  // Inicializar cámara una sola vez cuando el componente se monte
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const initCamera = () => {
      timeoutId = setTimeout(() => {
        if (mounted) {
          console.log('🎥 Iniciando cámara después de mount');
          startCamera();
        }
      }, 100); // Dar tiempo para que se monte el DOM
    };
    
    initCamera();
    
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      stopCamera();
    };
  }, []); // Sin dependencias para evitar loops
  
  // Cambiar cámara cuando cambie facingMode
  useEffect(() => {
    if (facingMode) {
      console.log('🎥 Cambiando facingMode a:', facingMode);
      stopCamera();
      setTimeout(() => startCamera(), 200);
    }
  }, [facingMode]); // Solo depende de facingMode

  // Renderizar overlay de guías
  const renderOverlay = () => {
    const overlayStyle = {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none' as const,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };

    if (currentStepConfig.overlay === 'face-front') {
      return (
        <Box sx={overlayStyle}>
          <Box
            sx={{
              width: 200,
              height: 250,
              border: '3px solid',
              borderColor: imageQuality > 70 ? 'success.main' : imageQuality > 40 ? 'warning.main' : 'error.main',
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              backgroundColor: 'transparent',
              animation: imageQuality > 70 ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.7)' },
                '70%': { boxShadow: '0 0 0 10px rgba(76, 175, 80, 0)' },
                '100%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)' }
              }
            }}
          />
        </Box>
      );
    }

    if (currentStepConfig.overlay === 'face-side') {
      return (
        <Box sx={overlayStyle}>
          <Box
            sx={{
              width: 180,
              height: 230,
              border: '3px solid',
              borderColor: imageQuality > 70 ? 'success.main' : imageQuality > 40 ? 'warning.main' : 'error.main',
              borderRadius: '20% 80% 80% 20% / 40% 60% 40% 60%',
              backgroundColor: 'transparent',
              transform: 'rotate(-10deg)'
            }}
          />
        </Box>
      );
    }

    if (currentStepConfig.overlay === 'combined') {
      return (
        <Box sx={overlayStyle}>
          <Grid container spacing={2} alignItems="center" justifyContent="center">
            <Grid item>
              <Box
                sx={{
                  width: 120,
                  height: 80,
                  border: '2px dashed',
                  borderColor: 'primary.main',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(25, 118, 210, 0.1)'
                }}
              >
                <Typography variant="caption" color="primary.main">
                  DOCUMENTO
                </Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box
                sx={{
                  width: 100,
                  height: 120,
                  border: '2px dashed',
                  borderColor: 'secondary.main',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(156, 39, 176, 0.1)'
                }}
              >
                <Typography variant="caption" color="secondary.main">
                  ROSTRO
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      );
    }

    return null;
  };

  // DEBUG: Solo log una vez cada 10 renders para evitar spam
  const renderCount = useRef(0);
  renderCount.current++;
  if (renderCount.current % 10 === 1) {
    console.log('🗞️ CameraCapture RENDER #', renderCount.current, '- videoRef.current:', videoRef.current);
    console.log('🗞️ CameraCapture RENDER - cameraActive:', cameraActive, 'videoReady:', videoReady);
  }
  
  return (
    <Box>
      {/* DEBUG INFO - Solo mostrar si hay problema */}
      {!cameraActive && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          <Typography variant="caption">
            DEBUG: videoRef={videoRef.current ? 'OK' : 'NULL'} | active={cameraActive ? 'YES' : 'NO'} | ready={videoReady ? 'YES' : 'NO'}
          </Typography>
        </Alert>
      )}
      
      {/* Instrucciones */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {currentStepConfig.title} {currentStepConfig.icon}
        </Typography>
        <Typography variant="body2">
          {instructions || currentStepConfig.instruction}
        </Typography>
      </Alert>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Indicador de calidad */}
      <Box sx={{ mb: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="text.secondary">
            Calidad de imagen
          </Typography>
          <Chip
            size="small"
            label={`${Math.round(imageQuality)}%`}
            color={imageQuality > 70 ? 'success' : imageQuality > 40 ? 'warning' : 'error'}
          />
        </Box>
        <LinearProgress
          variant="determinate"
          value={imageQuality}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              bgcolor: imageQuality > 70 ? 'success.main' : imageQuality > 40 ? 'warning.main' : 'error.main'
            }
          }}
        />
      </Box>

      {/* Área de la cámara */}
      <Paper
        elevation={3}
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 600,
          mx: 'auto',
          bgcolor: 'black',
          borderRadius: 2,
          overflow: 'hidden',
          aspectRatio: '4/3'
        }}
      >
        {cameraActive && videoReady ? (
          <>
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                backgroundColor: '#000',
                display: 'block',
                border: '2px solid red' // Para debugging visual
              }}
              autoPlay
              playsInline
              muted
              controls={false}
              onLoadedData={() => console.log('🎥 Video loadeddata event')}
              onPlay={() => console.log('🎥 Video play event')}
              onPlaying={() => console.log('🎥 Video playing event')}
            />
            {renderOverlay()}
            
            {/* Indicador de video activo */}
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                bgcolor: 'success.main',
                color: 'white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.75rem'
              }}
            >
              🔴 EN VIVO
            </Box>
          </>
        ) : cameraActive && !videoReady ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'white',
              flexDirection: 'column'
            }}
          >
            <CircularProgress color="primary" sx={{ mb: 2 }} />
            <Typography variant="h6">
              Cargando video...
            </Typography>
            <Typography variant="body2">
              Preparando la cámara
            </Typography>
          </Box>
        ) : cameraError ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'white',
              p: 3
            }}
          >
            <Box textAlign="center">
              <Box sx={{ color: 'error.main', mb: 2 }}>
                <CameraAlt sx={{ fontSize: 64 }} />
              </Box>
              <Typography variant="h6" gutterBottom>
                Error de Cámara
              </Typography>
              <Typography variant="body2" sx={{ mb: 3 }}>
                {cameraError}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setCameraError(null);
                  startCamera();
                }}
                startIcon={<CameraAlt />}
              >
                Reintentar
              </Button>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'white'
            }}
          >
            <Box textAlign="center">
              <CameraAlt sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h6">
                Iniciando cámara...
              </Typography>
            </Box>
          </Box>
        )}

        {/* Controles superpuestos */}
        {cameraActive && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              display: 'flex',
              gap: 1
            }}
          >
            <IconButton
              onClick={() => setFlashEnabled(!flashEnabled)}
              sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
            >
              {flashEnabled ? <FlashOn /> : <FlashOff />}
            </IconButton>
            
            <IconButton
              onClick={switchCamera}
              sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
            >
              <Cameraswitch />
            </IconButton>
            
            <IconButton
              onClick={() => setFullscreen(!fullscreen)}
              sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
            >
              {fullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Box>
        )}
      </Paper>

      {/* Canvas oculto para captura */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />

      {/* Controles de captura */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Box display="flex" gap={2} justifyContent="center" alignItems="center">
          <Button
            variant="outlined"
            onClick={resetCapture}
            disabled={loading || isCapturing}
            startIcon={<Refresh />}
          >
            Reiniciar
          </Button>

          <Button
            variant="contained"
            size="large"
            onClick={captureImage}
            disabled={!cameraActive || loading || isCapturing || imageQuality < 40}
            startIcon={isCapturing ? <CircularProgress size={20} /> : <PhotoCamera />}
            sx={{
              minWidth: 160,
              height: 48,
              borderRadius: 3
            }}
          >
            {isCapturing ? 'Capturando...' : 'Capturar'}
          </Button>

          {capturedImages.length > 0 && (
            <Button
              variant="outlined"
              onClick={() => setPreviewOpen(true)}
              startIcon={<Visibility />}
            >
              Ver ({capturedImages.length})
            </Button>
          )}
        </Box>

        {/* Advertencias de calidad */}
        {imageQuality < 40 && cameraActive && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <Warning sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
              La calidad de imagen es baja. Mejore la iluminación o acérquese más a la cámara.
            </Typography>
          </Alert>
        )}
      </Box>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Imágenes Capturadas
          </Typography>
          
          <Grid container spacing={2}>
            {capturedImages.map((image, index) => (
              <Grid item xs={6} md={4} key={index}>
                <Paper sx={{ p: 1 }}>
                  <img
                    src={image.dataUrl}
                    alt={`Captura ${image.type}`}
                    style={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: 4
                    }}
                  />
                  <Typography variant="caption" display="block" textAlign="center" mt={1}>
                    {image.type} - Calidad: {Math.round(image.quality)}%
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default CameraCapture;