/**
 * Versión ultra-simplificada de CameraCapture para debugging
 * Sin dependencias complejas, sin loops, solo lo esencial
 */

import React, { useRef, useEffect, useState } from 'react';
import { Box, Button, Alert, Typography, Paper } from '@mui/material';

interface CameraCaptureSimpleProps {
  onCapture: (image: string) => void;
  onError?: (error: string) => void;
}

const CameraCaptureSimple: React.FC<CameraCaptureSimpleProps> = ({ 
  onCapture, 
  onError, 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStream, setHasStream] = useState(false);

  // Función simple para iniciar cámara
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false, 
      });
      
      streamRef.current = stream;
      setHasStream(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsActive(true);
        setError(null);
      } else {
        setError('Video element no disponible');
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
      if (onError) onError(err.message);
    }
  };

  // Función para capturar imagen
  const captureImage = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      onCapture(dataUrl);
    }
  };

  // Función para detener cámara
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
    setHasStream(false);
  };

  // Effect simple - solo al montar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []); // SIN dependencias para evitar loops

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Cámara Simple - Debug
      </Typography>
      
      {/* Estado Debug */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Estado: videoRef={videoRef.current ? '✅' : '❌'} | 
          stream={hasStream ? '✅' : '❌'} | 
          active={isActive ? '✅' : '❌'}
        </Typography>
      </Alert>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Área de Video */}
      <Paper sx={{ mb: 2, bgcolor: 'black', borderRadius: 2, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '300px',
            objectFit: 'cover',
            display: 'block',
          }}
          autoPlay
          playsInline
          muted
        />
      </Paper>

      {/* Controles */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          onClick={startCamera}
          disabled={isActive}
        >
          Iniciar Cámara
        </Button>
        
        <Button 
          variant="outlined" 
          onClick={captureImage}
          disabled={!isActive}
        >
          Capturar
        </Button>
        
        <Button 
          variant="outlined" 
          color="error"
          onClick={stopCamera}
          disabled={!isActive}
        >
          Detener
        </Button>
      </Box>
    </Box>
  );
};

export default CameraCaptureSimple;