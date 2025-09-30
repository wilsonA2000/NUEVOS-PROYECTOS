/**
 * Componente de cámara profesional simplificado - Sin problemas de refs
 */

import React, { useRef, useState, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress, Dialog, IconButton } from '@mui/material';
import { CameraAlt, Check, Replay, Fullscreen, FullscreenExit, Close } from '@mui/icons-material';

interface SimpleProfessionalCameraProps {
  onCapture: (image: string) => void;
  onError?: (error: string) => void;
  instructions: string;
  key?: string; // Para forzar re-render si es necesario
  mode?: 'face' | 'document'; // Modo de captura
  height?: string; // Altura personalizada
}

const SimpleProfessionalCamera: React.FC<SimpleProfessionalCameraProps> = ({
  onCapture,
  onError,
  instructions,
  mode = 'face',
  height
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'active' | 'error' | 'preview' | 'accepted'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const startCamera = async () => {
    console.log('📹 SIMPLE: Iniciando cámara...');
    setStatus('loading');
    setErrorMessage('');

    try {
      console.log('📹 SIMPLE: Solicitando getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      console.log('📹 SIMPLE: Stream obtenido:', stream);
      streamRef.current = stream;

      // Esperar a que el videoRef esté disponible
      let attempts = 0;
      while (!videoRef.current && attempts < 20) {
        console.log(`📹 SIMPLE: Esperando videoRef... intento ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (videoRef.current) {
        console.log('📹 SIMPLE: VideoRef disponible, asignando stream...');
        videoRef.current.srcObject = stream;
        
        // Configurar video
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;

        // Event listeners
        videoRef.current.onloadedmetadata = () => {
          console.log('📹 SIMPLE: Video metadata loaded');
          setStatus('active');
        };

        videoRef.current.oncanplay = () => {
          console.log('📹 SIMPLE: Video can play');
          setStatus('active');
        };

        videoRef.current.onerror = (e) => {
          console.error('📹 SIMPLE: Video error:', e);
          setStatus('error');
          setErrorMessage('Error al reproducir video');
        };

        // Intentar reproducir
        try {
          await videoRef.current.play();
          console.log('📹 SIMPLE: Video playing successfully');
          setStatus('active');
        } catch (playError) {
          console.log('📹 SIMPLE: Play error (normal):', playError);
          // Continuar, a veces el video se reproduce sin play()
        }

        // También configurar el video del modal si está disponible
        if (modalVideoRef.current && isFullscreen) {
          modalVideoRef.current.srcObject = stream;
          modalVideoRef.current.autoplay = true;
          modalVideoRef.current.playsInline = true;
          modalVideoRef.current.muted = true;
          try {
            await modalVideoRef.current.play();
          } catch (playError) {
            console.log('📹 MODAL: Play error (normal):', playError);
          }
        }

      } else {
        console.error('📹 SIMPLE: VideoRef nunca estuvo disponible');
        setStatus('error');
        setErrorMessage('Elemento de video no disponible');
      }

    } catch (err: any) {
      console.error('📹 SIMPLE: Error completo:', err);
      setStatus('error');

      // Manejo específico de errores de cámara
      let userFriendlyMessage = '';

      if (err.name === 'NotAllowedError') {
        userFriendlyMessage = '❌ Permisos de cámara denegados. Por favor, permite el acceso a la cámara y recarga la página.';
      } else if (err.name === 'NotFoundError') {
        userFriendlyMessage = '📷 No se encontró ninguna cámara en tu dispositivo.';
      } else if (err.name === 'NotReadableError') {
        userFriendlyMessage = '🔒 La cámara está siendo usada por otra aplicación. Cierra otras apps que usen la cámara.';
      } else if (err.name === 'OverconstrainedError') {
        userFriendlyMessage = '⚙️ Configuración de cámara no compatible. Intentando con configuración básica...';
      } else if (err.name === 'AbortError') {
        userFriendlyMessage = '⏹️ Acceso a cámara cancelado.';
      } else {
        userFriendlyMessage = `❓ Error de cámara: ${err.message}`;
      }

      console.error('📹 SIMPLE: Error específico:', err.name, '-', userFriendlyMessage);
      setErrorMessage(userFriendlyMessage);
      if (onError) onError(userFriendlyMessage);
    }
  };

  const captureImage = () => {
    console.log('📹 SIMPLE: captureImage llamado, status actual:', status);
    
    // Determinar qué video usar y validar
    let activeVideo;
    if (isFullscreen && modalVideoRef.current) {
      activeVideo = modalVideoRef.current;
      console.log('📹 SIMPLE: Usando modalVideoRef para captura');
    } else {
      activeVideo = videoRef.current;
      console.log('📹 SIMPLE: Usando videoRef para captura');
    }
    
    if (!activeVideo || status !== 'active') {
      console.log('📹 SIMPLE: No se puede capturar - activeVideo:', !!activeVideo, 'status:', status, 'isFullscreen:', isFullscreen);
      return;
    }

    // Verificar que el video tenga dimensiones válidas
    console.log('📹 SIMPLE: Verificando dimensiones - width:', activeVideo.videoWidth, 'height:', activeVideo.videoHeight);
    
    if (activeVideo.videoWidth === 0 || activeVideo.videoHeight === 0) {
      console.log('📹 SIMPLE: Video sin dimensiones válidas - Intentando usar el otro video...');
      
      // Si el video activo no tiene dimensiones, intentar con el otro
      const fallbackVideo = isFullscreen ? videoRef.current : modalVideoRef.current;
      if (fallbackVideo && fallbackVideo.videoWidth > 0 && fallbackVideo.videoHeight > 0) {
        console.log('📹 SIMPLE: Usando video fallback con dimensiones:', fallbackVideo.videoWidth, 'x', fallbackVideo.videoHeight);
        activeVideo = fallbackVideo;
      } else {
        console.log('📹 SIMPLE: Ningún video tiene dimensiones válidas');
        return;
      }
    }

    try {
      const canvas = document.createElement('canvas');
      
      canvas.width = activeVideo.videoWidth;
      canvas.height = activeVideo.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(activeVideo, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        console.log('📹 SIMPLE: Imagen capturada exitosamente');
        console.log('📹 SIMPLE: DataURL length:', dataUrl.length);
        console.log('📹 SIMPLE: Canvas dimensions:', canvas.width, 'x', canvas.height);
        
        if (dataUrl.length > 100) { // Verificar que realmente se capturó algo
          setCapturedImage(dataUrl);
          setStatus('preview');
          console.log('📹 SIMPLE: Estado cambiado a preview');
          stopCamera(false); // Detener la cámara pero NO resetear el estado
        } else {
          console.error('📹 SIMPLE: Imagen capturada está vacía o es inválida');
          if (onError) onError('Error: Imagen capturada es inválida');
        }
      }
    } catch (err: any) {
      console.error('📹 SIMPLE: Error al capturar:', err);
      if (onError) onError('Error al capturar imagen');
    }
  };

  const acceptPhoto = () => {
    if (capturedImage) {
      console.log('📹 SIMPLE: Foto aceptada, enviando al padre...');
      setStatus('accepted');
      // Pequeño delay para asegurar que el usuario vea el feedback
      setTimeout(() => {
        onCapture(capturedImage);
      }, 1500); // 1.5 segundos para que el usuario vea el mensaje de confirmación
    }
  };

  const retakePhoto = () => {
    setCapturedImage('');
    startCamera();
  };

  const stopCamera = (resetStatus = true) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    // Solo resetear el estado si se indica explícitamente
    if (resetStatus) {
      setStatus('idle');
    }
  };

  useEffect(() => {
    console.log('📹 SIMPLE: useEffect - Componente montado/actualizado');
    return () => {
      console.log('📹 SIMPLE: useEffect - Componente desmontándose');
      stopCamera();
    };
  }, []);

  // Debug: Log del render
  console.log('📹 SIMPLE: Renderizando - Status:', status, 'CapturedImage:', !!capturedImage);

  // Efecto para sincronizar video en modal
  useEffect(() => {
    const setupModalVideo = async () => {
      if (isFullscreen && modalVideoRef.current && streamRef.current) {
        console.log('📹 MODAL: Configurando video en modal...');
        console.log('📹 MODAL: Stream disponible:', !!streamRef.current);
        console.log('📹 MODAL: ModalVideoRef disponible:', !!modalVideoRef.current);
        
        const modalVideo = modalVideoRef.current;
        modalVideo.srcObject = streamRef.current;
        modalVideo.autoplay = true;
        modalVideo.playsInline = true;
        modalVideo.muted = true;
        
        // Event listeners para el video del modal
        modalVideo.onloadedmetadata = () => {
          console.log('📹 MODAL: Video metadata loaded - dimensions:', modalVideo.videoWidth, 'x', modalVideo.videoHeight);
        };

        modalVideo.oncanplay = () => {
          console.log('📹 MODAL: Video can play - dimensions:', modalVideo.videoWidth, 'x', modalVideo.videoHeight);
        };

        modalVideo.onerror = (e) => {
          console.error('📹 MODAL: Video error:', e);
        };

        try {
          await modalVideo.play();
          console.log('📹 MODAL: Video playing successfully');
          
          // Esperar un poco más para que el video se establezca completamente
          setTimeout(() => {
            console.log('📹 MODAL: Video final dimensions:', modalVideo.videoWidth, 'x', modalVideo.videoHeight);
          }, 500);
        } catch (e) {
          console.log('📹 MODAL: Play error:', e);
        }
      } else {
        console.log('📹 MODAL: No se puede configurar - isFullscreen:', isFullscreen, 'modalVideoRef:', !!modalVideoRef.current, 'streamRef:', !!streamRef.current);
      }
    };

    if (isFullscreen) {
      // Delay más largo para asegurar que el modal esté completamente renderizado
      setTimeout(setupModalVideo, 200);
    }
  }, [isFullscreen]);

  // Determinar dimensiones según el modo
  const getContainerHeight = (isInModal = false) => {
    if (isInModal) return '100vh';
    if (height) return height;
    return mode === 'document' ? '450px' : '300px';
  };

  const getVideoHeight = (isInModal = false) => {
    if (isInModal) return '100vh';
    if (height) return height;
    return mode === 'document' ? '500px' : '400px'; // Aumentado para mejor visibilidad
  };

  // Componente de renderizado de cámara reutilizable
  const renderCameraContent = (isInModal = false) => (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: getContainerHeight(isInModal)
    }}>
      {/* Área Principal de Video - Adaptable según el modo */}
      <Box sx={{ 
        height: getVideoHeight(isInModal),
        position: 'relative',
        borderRadius: isInModal ? 0 : 2, // Sin bordes en modal
        overflow: 'hidden',
        bgcolor: '#000000',
        background: status !== 'active' ? 'linear-gradient(135deg, #455a64 0%, #607d8b 100%)' : '#000000'
      }}>
        {/* Video Element */}
        <video
          ref={isInModal ? modalVideoRef : videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: status === 'active' ? 'block' : 'none',
            backgroundColor: '#000000',
            border: status === 'active' ? '2px solid #4caf50' : 'none' // Verde cuando activo
          }}
          autoPlay
          playsInline
          muted
        />

        {/* Indicador de cámara activa */}
        {status === 'active' && (
          <Box sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            bgcolor: '#4caf50',
            color: 'white',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            fontSize: '0.75rem',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            🟢 EN VIVO
          </Box>
        )}

        {/* Estado: Idle */}
        {status === 'idle' && (
          <Box sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            textAlign: 'center',
            p: 4
          }}>
            <Box sx={{ 
              p: 4, 
              borderRadius: 3, 
              bgcolor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              maxWidth: 400
            }}>
              <CameraAlt sx={{ fontSize: 64, mb: 2, color: 'white' }} />
              <Typography variant="h5" gutterBottom fontWeight="600">
                Cámara Lista
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  mb: 3, 
                  color: 'rgba(255,255,255,0.95)',
                  fontWeight: '500',
                  lineHeight: 1.6,
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}
              >
                {instructions}
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={startCamera}
                startIcon={<CameraAlt />}
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  fontWeight: '600',
                  px: 4,
                  py: 1.5,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  '&:hover': {
                    bgcolor: 'grey.100',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.2)'
                  }
                }}
              >
                Iniciar Cámara
              </Button>
            </Box>
          </Box>
        )}

        {/* Estado: Loading */}
        {status === 'loading' && (
          <Box sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            textAlign: 'center'
          }}>
            <CircularProgress sx={{ color: 'white', mb: 3 }} size={60} />
            <Typography variant="h6" gutterBottom fontWeight="600">
              Iniciando Cámara...
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Solicitando permisos de cámara
            </Typography>
          </Box>
        )}

        {/* Estado: Error */}
        {status === 'error' && (
          <Box sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            textAlign: 'center',
            p: 3
          }}>
            <Typography variant="h6" gutterBottom color="error.light">
              Error de Cámara
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
              {errorMessage}
            </Typography>
            <Button
              variant="outlined"
              onClick={startCamera}
              sx={{ color: 'white', borderColor: 'white' }}
            >
              Reintentar
            </Button>
          </Box>
        )}

        {/* Indicador EN VIVO */}
        {status === 'active' && (
          <Box sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            bgcolor: 'rgba(0,0,0,0.7)',
            color: 'white',
            px: 2,
            py: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <Box sx={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              bgcolor: '#4caf50',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 }
              }
            }} />
            <Typography variant="caption" fontWeight="600">
              EN VIVO
            </Typography>
          </Box>
        )}

        {/* Botón de pantalla completa - Solo en vista normal */}
        {!isInModal && status === 'active' && (
          <IconButton
            onClick={() => {
              console.log('📹 SIMPLE: Abriendo modal fullscreen...');
              setIsFullscreen(true);
            }}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
            }}
          >
            <Fullscreen />
          </IconButton>
        )}

        {/* Estado: Preview o Accepted */}
        {(status === 'preview' || status === 'accepted') && capturedImage && (
          <Box sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'black'
          }}>
            <img 
              src={capturedImage} 
              alt="Foto capturada"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
            <Box sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              bgcolor: status === 'accepted' ? 'rgba(76, 175, 80, 0.9)' : 'rgba(0,0,0,0.7)',
              color: 'white',
              px: 2,
              py: 1,
              borderRadius: 2
            }}>
              <Typography variant="caption" fontWeight="600">
                {status === 'accepted' ? '✓ FOTO ACEPTADA' : 'VISTA PREVIA'}
              </Typography>
            </Box>

            {/* Botón de pantalla completa en preview - Solo en vista normal */}
            {!isInModal && (
              <IconButton
                onClick={() => {
                  console.log('📹 SIMPLE: Abriendo modal fullscreen desde preview...');
                  setIsFullscreen(true);
                }}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  bgcolor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                }}
              >
                <Fullscreen />
              </IconButton>
            )}
          </Box>
        )}

        {/* Botones superpuestos en el área de video - Solo en modal */}
        {isInModal && (
          <Box sx={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 2,
            zIndex: 10
          }}>
            {/* Botón de Captura */}
            {status === 'active' && (
              <Button
                variant="contained"
                size="large"
                onClick={captureImage}
                startIcon={<CameraAlt />}
                sx={{
                  px: 6,
                  py: 2,
                  borderRadius: 3,
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)'
                  }
                }}
              >
                Capturar Foto
              </Button>
            )}

            {/* Botones de Preview */}
            {status === 'preview' && (
              <>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={retakePhoto}
                  startIcon={<Replay />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    fontSize: '1rem',
                    fontWeight: '600',
                    borderWidth: 2,
                    bgcolor: 'rgba(255,255,255,0.9)',
                    '&:hover': {
                      borderWidth: 2,
                      bgcolor: 'rgba(255,255,255,1)'
                    }
                  }}
                >
                  Tomar Otra
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={acceptPhoto}
                  startIcon={<Check />}
                  color="success"
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    fontSize: '1rem',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 6px 16px rgba(76, 175, 80, 0.4)'
                    }
                  }}
                >
                  Aceptar Foto
                </Button>
              </>
            )}
          </Box>
        )}
      </Box>

      {/* Botones externos - Solo en vista normal */}
      {!isInModal && (
        <>
          {/* Botón de Captura */}
          {status === 'active' && (
            <Box sx={{ 
              pt: 3,
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Button
                variant="contained"
                size="large"
                onClick={captureImage}
                startIcon={<CameraAlt />}
                sx={{
                  px: 6,
                  py: 2,
                  borderRadius: 3,
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)'
                  }
                }}
              >
                Capturar Foto
              </Button>
            </Box>
          )}

          {/* Botones de Preview */}
          {status === 'preview' && (
            <Box sx={{ 
              pt: 3,
              display: 'flex',
              justifyContent: 'center',
              gap: 2
            }}>
              <Button
                variant="outlined"
                size="large"
                onClick={retakePhoto}
                startIcon={<Replay />}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  fontSize: '1rem',
                  fontWeight: '600',
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2
                  }
                }}
              >
                Tomar Otra
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={acceptPhoto}
                startIcon={<Check />}
                color="success"
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 16px rgba(76, 175, 80, 0.4)'
                  }
                }}
              >
                Aceptar Foto
              </Button>
            </Box>
          )}

          {/* Mensaje cuando la foto ha sido aceptada */}
          {status === 'accepted' && (
            <Box sx={{ 
              pt: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2
            }}>
              <Typography variant="body1" color="success.main" fontWeight="600">
                ✓ Foto aceptada exitosamente
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Procesando... El sistema avanzará automáticamente al siguiente paso.
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );

  return (
    <>
      {/* Vista normal compacta */}
      {renderCameraContent(false)}

      {/* Modal de pantalla completa */}
      <Dialog
        open={isFullscreen}
        onClose={() => {
          console.log('📹 MODAL: Cerrando modal fullscreen...');
          setIsFullscreen(false);
        }}
        maxWidth={false}
        fullScreen
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: 'black',
            color: 'white',
            margin: 0,
            maxHeight: '100vh',
            height: '100vh'
          }
        }}
      >
        {/* Header del modal */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          bgcolor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(10px)'
        }}>
          <Typography variant="h6" sx={{ color: 'white' }}>
            Vista Ampliada - Captura Facial
          </Typography>
          <IconButton
            onClick={() => {
              console.log('📹 MODAL: Cerrando modal con botón close...');
              setIsFullscreen(false);
            }}
            sx={{ color: 'white' }}
          >
            <Close />
          </IconButton>
        </Box>

        {/* Contenido del modal - Sin contenedor adicional */}
        {renderCameraContent(true)}
      </Dialog>
    </>
  );
};

export default SimpleProfessionalCamera;