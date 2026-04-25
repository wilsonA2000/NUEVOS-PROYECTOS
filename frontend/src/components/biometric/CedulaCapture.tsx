/**
 * Captura de cédula colombiana con autocaptura asistida por OpenCV.js.
 *
 * UX inspirada en flujo Bold: skeleton overlay con marco de cédula,
 * detección automática de los 4 bordes en tiempo real, captura
 * disparada cuando el documento se mantiene estable en posición
 * durante 1.5 segundos.
 *
 * Aspecto cédula CO ISO/IEC 7810 ID-1: 85.6mm × 54mm = ratio 1.585.
 * Tolerancia ±10% para cubrir variaciones de perspectiva ligera.
 *
 * Pipeline por frame:
 *   video → canvas oculto → ImageData → cv.Mat
 *   → grayscale → Gaussian blur → Canny edges → findContours
 *   → filtro por área (>20% frame) y aspect ratio (1.4-1.8)
 *   → si hay match estable 1.5s → captura JPEG y emite onCapture
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import {
  useOpenCV,
  type OpenCVMat,
  type OpenCVMatVector,
  type OpenCVModule,
  type OpenCVRect,
} from '../../hooks/useOpenCV';

export type CedulaSide = 'anverso' | 'reverso';

export interface CedulaCaptureMetadata {
  side: CedulaSide;
  capturedAt: string;
  qualityScore: number;
  documentBounds: OpenCVRect;
  imageSize: { width: number; height: number };
  stabilityMs: number;
}

export interface CedulaCaptureProps {
  side: CedulaSide;
  onCapture: (image: string, metadata: CedulaCaptureMetadata) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  stabilityThresholdMs?: number;
  jpegQuality?: number;
}

const ID1_ASPECT_RATIO = 85.6 / 54;
const ASPECT_TOLERANCE = 0.18;
const MIN_AREA_FRACTION = 0.18;
const ANALYSIS_INTERVAL_MS = 120;

function isCedulaShape(rect: OpenCVRect, frameArea: number): boolean {
  if (rect.width === 0 || rect.height === 0) return false;
  const longSide = Math.max(rect.width, rect.height);
  const shortSide = Math.min(rect.width, rect.height);
  const ratio = longSide / shortSide;
  if (Math.abs(ratio - ID1_ASPECT_RATIO) > ASPECT_TOLERANCE) return false;
  const area = rect.width * rect.height;
  return area / frameArea >= MIN_AREA_FRACTION;
}

function detectDocumentBounds(
  cv: OpenCVModule,
  imageData: ImageData,
): OpenCVRect | null {
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const contours: OpenCVMatVector = new cv.MatVector();
  const hierarchy = new cv.Mat();

  let bestRect: OpenCVRect | null = null;

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(blurred, blurred, new cv.Size(5, 5), 0);
    // GaussianBlur in-place on gray (some builds ignore identical src/dst)
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 75, 200);
    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE,
    );

    const frameArea = imageData.width * imageData.height;
    let bestArea = 0;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      if (area / frameArea < MIN_AREA_FRACTION) {
        contour.delete();
        continue;
      }
      const rect = cv.boundingRect(contour);
      if (isCedulaShape(rect, frameArea) && area > bestArea) {
        bestRect = rect;
        bestArea = area;
      }
      contour.delete();
    }
  } finally {
    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
  }

  return bestRect;
}

function rectsAreStable(a: OpenCVRect, b: OpenCVRect, tolerancePx = 18): boolean {
  return (
    Math.abs(a.x - b.x) <= tolerancePx &&
    Math.abs(a.y - b.y) <= tolerancePx &&
    Math.abs(a.width - b.width) <= tolerancePx &&
    Math.abs(a.height - b.height) <= tolerancePx
  );
}

const SIDE_LABELS: Record<CedulaSide, { title: string; help: string }> = {
  anverso: {
    title: 'Cédula — Anverso (cara con foto)',
    help: 'Coloca la cara frontal de tu cédula dentro del marco. Mantén la cámara estable.',
  },
  reverso: {
    title: 'Cédula — Reverso',
    help: 'Voltea tu cédula y coloca la cara trasera dentro del marco.',
  },
};

const CedulaCapture: React.FC<CedulaCaptureProps> = ({
  side,
  onCapture,
  onError,
  onCancel,
  stabilityThresholdMs = 1500,
  jpegQuality = 0.92,
}) => {
  const { cv, ready: cvReady, error: cvError } = useOpenCV();
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stableSinceRef = useRef<number | null>(null);
  const lastRectRef = useRef<OpenCVRect | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastAnalysisRef = useRef<number>(0);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detected, setDetected] = useState(false);
  const [stabilityProgress, setStabilityProgress] = useState(0);
  const [captured, setCaptured] = useState(false);

  const labels = SIDE_LABELS[side];

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        setCameraError(null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error desconocido de cámara';
      setCameraError(message);
      onError?.(message);
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const captureFrame = useCallback(
    (rect: OpenCVRect, stabilityMs: number) => {
      const video = videoRef.current;
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);

      const frameArea = canvas.width * canvas.height;
      const docArea = rect.width * rect.height;
      const qualityScore = Math.min(1, docArea / frameArea / 0.45);

      const metadata: CedulaCaptureMetadata = {
        side,
        capturedAt: new Date().toISOString(),
        qualityScore,
        documentBounds: rect,
        imageSize: { width: canvas.width, height: canvas.height },
        stabilityMs,
      };

      setCaptured(true);
      stopCamera();
      onCapture(dataUrl, metadata);
    },
    [jpegQuality, onCapture, side, stopCamera],
  );

  const drawOverlay = useCallback(
    (rect: OpenCVRect | null, progress: number) => {
      const canvas = overlayCanvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const frameW = canvas.width;
      const frameH = canvas.height;
      const targetW = frameW * 0.78;
      const targetH = targetW / ID1_ASPECT_RATIO;
      const skeletonX = (frameW - targetW) / 2;
      const skeletonY = (frameH - targetH) / 2;

      ctx.lineWidth = 4;
      ctx.setLineDash(rect ? [] : [16, 12]);
      ctx.strokeStyle = rect
        ? progress > 0.95
          ? '#10b981'
          : '#facc15'
        : 'rgba(255,255,255,0.85)';
      ctx.strokeRect(skeletonX, skeletonY, targetW, targetH);

      const cornerSize = 28;
      ctx.setLineDash([]);
      ctx.lineWidth = 6;
      ctx.strokeStyle = ctx.strokeStyle;
      const corners: Array<[number, number, number, number]> = [
        [skeletonX, skeletonY, 1, 1],
        [skeletonX + targetW, skeletonY, -1, 1],
        [skeletonX, skeletonY + targetH, 1, -1],
        [skeletonX + targetW, skeletonY + targetH, -1, -1],
      ];
      for (const [cx, cy, dx, dy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + cornerSize * dy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + cornerSize * dx, cy);
        ctx.stroke();
      }

      if (rect) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = progress > 0.95 ? '#10b981' : '#3b82f6';
        ctx.setLineDash([]);
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      }
    },
    [],
  );

  const analyzeFrame = useCallback(() => {
    if (!cv || !cameraReady || captured) {
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const now = performance.now();
    if (now - lastAnalysisRef.current < ANALYSIS_INTERVAL_MS) {
      drawOverlay(lastRectRef.current, stabilityProgress);
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }
    lastAnalysisRef.current = now;

    const video = videoRef.current;
    const canvas = analysisCanvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) {
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const downscaleW = 480;
    const downscaleH = (video.videoHeight / video.videoWidth) * downscaleW;
    canvas.width = downscaleW;
    canvas.height = downscaleH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }
    ctx.drawImage(video, 0, 0, downscaleW, downscaleH);
    const imageData = ctx.getImageData(0, 0, downscaleW, downscaleH);

    const scaleX = video.videoWidth / downscaleW;
    const scaleY = video.videoHeight / downscaleH;

    let detectedRect: OpenCVRect | null = null;
    try {
      const small = detectDocumentBounds(cv, imageData);
      if (small) {
        detectedRect = {
          x: small.x * scaleX,
          y: small.y * scaleY,
          width: small.width * scaleX,
          height: small.height * scaleY,
        };
      }
    } catch (err) {
      // OpenCV puede lanzar en frames degenerados. Ignorar este frame.
    }

    if (detectedRect) {
      const previous = lastRectRef.current;
      const stable = previous && rectsAreStable(detectedRect, previous);
      lastRectRef.current = detectedRect;

      if (!stable || stableSinceRef.current === null) {
        stableSinceRef.current = now;
      }
      const stabilityMs = now - (stableSinceRef.current ?? now);
      const progress = Math.min(1, stabilityMs / stabilityThresholdMs);
      setStabilityProgress(progress);
      setDetected(true);
      drawOverlay(detectedRect, progress);

      if (stabilityMs >= stabilityThresholdMs) {
        captureFrame(detectedRect, stabilityMs);
        return;
      }
    } else {
      stableSinceRef.current = null;
      lastRectRef.current = null;
      setStabilityProgress(0);
      setDetected(false);
      drawOverlay(null, 0);
    }

    animationFrameRef.current = requestAnimationFrame(analyzeFrame);
  }, [
    cv,
    cameraReady,
    captured,
    captureFrame,
    drawOverlay,
    stabilityProgress,
    stabilityThresholdMs,
  ]);

  useEffect(() => {
    if (!cv || !cameraReady || captured) return;
    animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [cv, cameraReady, captured, analyzeFrame]);

  const retry = () => {
    setCaptured(false);
    setDetected(false);
    setStabilityProgress(0);
    stableSinceRef.current = null;
    lastRectRef.current = null;
    startCamera();
  };

  if (cvError) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color='error' gutterBottom>
          No se pudo cargar el motor de visión por computador.
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          {cvError}
        </Typography>
        {onCancel && (
          <Button onClick={onCancel} sx={{ mt: 2 }}>
            Cancelar
          </Button>
        )}
      </Paper>
    );
  }

  if (!cvReady) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={32} />
        <Typography sx={{ mt: 2 }}>
          Cargando motor de detección de documentos…
        </Typography>
      </Paper>
    );
  }

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
          <canvas
            ref={overlayCanvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          />
          <canvas ref={analysisCanvasRef} style={{ display: 'none' }} />
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
          <Box>
            <LinearProgress
              variant='determinate'
              value={stabilityProgress * 100}
              sx={{ mb: 1 }}
              color={stabilityProgress > 0.95 ? 'success' : 'primary'}
            />
            <Typography variant='caption' color='text.secondary'>
              {!detected
                ? 'Buscando cédula…'
                : stabilityProgress > 0.95
                  ? '¡Listo! Capturando…'
                  : 'Detectada — mantén firme la cámara'}
            </Typography>
          </Box>
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

        {onCancel && !captured && (
          <Button onClick={onCancel} variant='text'>
            Cancelar
          </Button>
        )}
      </Stack>
    </Paper>
  );
};

export default CedulaCapture;
