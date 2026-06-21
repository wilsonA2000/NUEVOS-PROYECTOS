/**
 * Captura de cédula colombiana — simple y en vivo.
 *
 * Muestra la cámara con un marco guía (aspecto ID-1, ratio 1.585) para que el
 * usuario acomode la cédula y capture con un botón. Sin OpenCV ni workers: la
 * detección automática pesaba 11MB y congelaba la página. El backend valida el
 * documento con OCR sobre la imagen capturada.
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

export type CedulaSide = 'anverso' | 'reverso';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CedulaCaptureMetadata {
  side: CedulaSide;
  capturedAt: string;
  qualityScore: number;
  documentBounds: Rect;
  imageSize: { width: number; height: number };
  stabilityMs: number;
}

export interface CedulaCaptureProps {
  side: CedulaSide;
  onCapture: (image: string, metadata: CedulaCaptureMetadata) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  jpegQuality?: number;
}

const ID1_ASPECT_RATIO = 85.6 / 54; // 1.585

const SIDE_LABELS: Record<CedulaSide, { title: string; help: string }> = {
  anverso: {
    title: 'Cédula — Anverso (cara con foto)',
    help: 'Coloca la cara frontal de tu cédula dentro del marco y presiona Capturar.',
  },
  reverso: {
    title: 'Cédula — Reverso',
    help: 'Voltea tu cédula, colócala dentro del marco y presiona Capturar.',
  },
};

const CedulaCapture: React.FC<CedulaCaptureProps> = ({
  side,
  onCapture,
  onError,
  onCancel,
  jpegQuality = 0.92,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState(false);

  const labels = SIDE_LABELS[side];

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
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
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setCameraReady(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Atar el stream al <video> en cuanto ambos existan.
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
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);

    // Bounds = el marco guía (78% del ancho, aspecto ID-1) centrado.
    const targetW = canvas.width * 0.78;
    const targetH = targetW / ID1_ASPECT_RATIO;
    const bounds: Rect = {
      x: (canvas.width - targetW) / 2,
      y: (canvas.height - targetH) / 2,
      width: targetW,
      height: targetH,
    };

    const metadata: CedulaCaptureMetadata = {
      side,
      capturedAt: new Date().toISOString(),
      qualityScore: 1,
      documentBounds: bounds,
      imageSize: { width: canvas.width, height: canvas.height },
      stabilityMs: 0,
    };

    setCaptured(true);
    stopCamera();
    onCapture(dataUrl, metadata);
  };

  const retry = () => {
    setCaptured(false);
    startCamera();
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant='h6'>{labels.title}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {labels.help}
          </Typography>
        </Box>

        <Box
          sx={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#000',
            borderRadius: 1,
            overflow: 'hidden',
            aspectRatio: '16/9',
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
              display: cameraReady ? 'block' : 'none',
            }}
          />

          {/* Marco guía (CSS, sin procesamiento): el usuario acomoda la cédula */}
          {cameraReady && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '78%',
                aspectRatio: `${ID1_ASPECT_RATIO}`,
                border: '3px dashed rgba(255,255,255,0.9)',
                borderRadius: 1,
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
              Capturar
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
            <Typography>Captura completada</Typography>
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

export default CedulaCapture;
