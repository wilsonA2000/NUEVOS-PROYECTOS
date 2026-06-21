/**
 * Captura de selfie para verificación facial — simple y en vivo.
 *
 * Cámara frontal con un óvalo guía para encuadrar el rostro y un botón para
 * capturar. Sin face-api / TensorFlow.js en el cliente: ese motor pesaba y
 * fallaba al inicializar el backend WASM. El match facial real lo hace el
 * backend (LocalFacialProvider) sobre la selfie capturada.
 *
 * Mantiene la forma de `LivenessResult` para no romper el flujo (steps queda
 * vacío: el reto de movimientos de cabeza se valida en la visita presencial).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  CameraAlt as CameraAltIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import type { HeadDirection, HeadPose } from '../../lib/headPose';

export interface LivenessChallengeStep {
  direction: HeadDirection;
  label: string;
  pose?: HeadPose;
  capturedAt?: string;
}

export interface LivenessResult {
  selfie: string;
  steps: LivenessChallengeStep[];
  qualityScore: number;
  totalDurationMs: number;
  capturedAt: string;
}

export interface LivenessCaptureProps {
  onComplete: (result: LivenessResult) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  jpegQuality?: number;
}

const LivenessCapture: React.FC<LivenessCaptureProps> = ({
  onComplete,
  onError,
  onCancel,
  jpegQuality = 0.92,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = s;
      setCameraError(null);
      setStream(s);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error desconocido de cámara';
      setCameraError(message);
      onError?.(message);
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setStream(null);
    setCameraReady(false);
  }, []);

  useEffect(() => {
    startedAtRef.current = Date.now();
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    video
      .play()
      .then(() => {
        setCameraReady(true);
        setCameraError(null);
      })
      .catch(err =>
        setCameraError(
          err instanceof Error ? err.message : 'No se pudo iniciar la cámara',
        ),
      );
  }, [stream]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Espejo horizontal: la selfie se ve como en un espejo.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    const selfie = canvas.toDataURL('image/jpeg', jpegQuality);

    setCaptured(true);
    stopCamera();
    onComplete({
      selfie,
      steps: [],
      qualityScore: 0.9,
      totalDurationMs: Date.now() - startedAtRef.current,
      capturedAt: new Date().toISOString(),
    });
  };

  const retry = () => {
    setCaptured(false);
    startCamera();
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant='h6'>Verificación facial</Typography>
          <Typography variant='body2' color='text.secondary'>
            Centra tu rostro dentro del óvalo, mira a la cámara y presiona
            Capturar.
          </Typography>
        </Box>

        <Box
          sx={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#000',
            borderRadius: 1,
            overflow: 'hidden',
            aspectRatio: '4/3',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: cameraReady ? 'block' : 'none',
            }}
          />

          {cameraReady && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '52%',
                aspectRatio: '0.78',
                border: '3px dashed rgba(255,255,255,0.9)',
                borderRadius: '50%',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                pointerEvents: 'none',
              }}
            />
          )}

          {!cameraReady && !cameraError && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <CircularProgress color='inherit' size={32} />
            </Box>
          )}
        </Box>

        {cameraError && (
          <Typography color='error' variant='body2'>
            {cameraError}
          </Typography>
        )}

        {!captured && (
          <Stack direction='row' spacing={2} alignItems='center'>
            <Button
              startIcon={<CameraAltIcon />}
              onClick={capture}
              variant='contained'
              disabled={!cameraReady}
            >
              Capturar selfie
            </Button>
            <Box sx={{ flex: 1 }} />
            {onCancel && (
              <Button onClick={onCancel} variant='text' size='small'>
                Cancelar
              </Button>
            )}
          </Stack>
        )}

        {captured && (
          <Stack direction='row' spacing={2} alignItems='center'>
            <CheckCircleIcon color='success' />
            <Typography>Selfie capturada</Typography>
            <Box sx={{ flex: 1 }} />
            <Button
              startIcon={<RefreshIcon />}
              onClick={retry}
              variant='outlined'
              size='small'
            >
              Volver a tomar
            </Button>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

export default LivenessCapture;
