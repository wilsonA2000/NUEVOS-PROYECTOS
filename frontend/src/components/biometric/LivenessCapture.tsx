/**
 * Liveness facial activo con secuencia de head turns.
 *
 * UX: cámara frontal del usuario, indicaciones secuenciales en
 * pantalla (mira al frente → izquierda → derecha → arriba → abajo →
 * frente). En cada paso, los 68 landmarks de face-api.js alimentan
 * `estimateHeadPose` y `classifyDirection`. Para avanzar, la
 * dirección esperada debe mantenerse durante `holdMs` (default 600ms).
 *
 * Anti-spoofing: la heurística NO es a prueba de deepfake. Es prueba
 * suficiente contra el ataque más común (foto estática). El módulo
 * anti-deepfake con EfficientNet se integra en una fase posterior.
 *
 * Output:
 *   - Selfie frontal final (data URL JPEG)
 *   - Lista de poses capturadas en cada paso (auditable)
 *   - Quality score 0-1 derivado de detección estable + tiempo total
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
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

import { useFaceApi } from '../../hooks/useFaceApi';
import {
  classifyDirection,
  DEFAULT_THRESHOLDS,
  estimateHeadPose,
  type HeadDirection,
  type HeadPose,
} from '../../lib/headPose';

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
  challenge?: HeadDirection[];
  holdMs?: number;
  maxDurationMs?: number;
}

const DEFAULT_CHALLENGE: HeadDirection[] = [
  'center',
  'left',
  'right',
  'up',
  'down',
  'center',
];

const DIRECTION_LABEL: Record<HeadDirection, string> = {
  center: 'Mira al frente',
  left: 'Gira la cabeza a la izquierda',
  right: 'Gira la cabeza a la derecha',
  up: 'Mira hacia arriba',
  down: 'Mira hacia abajo',
};

const DIRECTION_ARROW: Record<HeadDirection, string> = {
  center: '●',
  left: '◀',
  right: '▶',
  up: '▲',
  down: '▼',
};

const ANALYSIS_INTERVAL_MS = 140;

const LivenessCapture: React.FC<LivenessCaptureProps> = ({
  onComplete,
  onError,
  onCancel,
  challenge = DEFAULT_CHALLENGE,
  holdMs = 600,
  maxDurationMs = 60_000,
}) => {
  const { faceapi, ready: apiReady, error: apiError } = useFaceApi();
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastAnalysisRef = useRef<number>(0);
  const stepStartRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const stepsCompletedRef = useRef<LivenessChallengeStep[]>([]);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [currentDirection, setCurrentDirection] = useState<HeadDirection>('center');
  const [completed, setCompleted] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const expectedDirection = challenge[stepIndex];

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
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
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    startCamera();
    startTimeRef.current = performance.now();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const captureSelfie = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.92);
  }, []);

  const finishWith = useCallback(
    (steps: LivenessChallengeStep[]) => {
      const selfie = captureSelfie();
      if (!selfie) {
        onError?.('No se pudo capturar la selfie final');
        return;
      }
      const totalDurationMs = performance.now() - startTimeRef.current;
      const qualityScore = Math.max(
        0,
        Math.min(1, 1 - totalDurationMs / maxDurationMs),
      );
      stopCamera();
      setCompleted(true);
      onComplete({
        selfie,
        steps,
        qualityScore,
        totalDurationMs,
        capturedAt: new Date().toISOString(),
      });
    },
    [captureSelfie, maxDurationMs, onComplete, onError, stopCamera],
  );

  const drawOverlay = useCallback((pose: HeadPose | null) => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.28;

    ctx.lineWidth = 5;
    ctx.strokeStyle = pose ? '#10b981' : 'rgba(255,255,255,0.9)';
    ctx.setLineDash(pose ? [] : [12, 8]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius, radius * 1.3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }, []);

  const analyzeFrame = useCallback(async () => {
    if (!faceapi || !cameraReady || completed) {
      animationRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      animationRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const now = performance.now();
    if (now - startTimeRef.current > maxDurationMs) {
      setTimedOut(true);
      stopCamera();
      onError?.('Liveness expiró antes de completar la secuencia');
      return;
    }

    if (now - lastAnalysisRef.current < ANALYSIS_INTERVAL_MS) {
      animationRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }
    lastAnalysisRef.current = now;

    try {
      const detection = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5,
          }),
        )
        .withFaceLandmarks()
        .run();

      if (!detection) {
        drawOverlay(null);
        stepStartRef.current = null;
        setHoldProgress(0);
        animationRef.current = requestAnimationFrame(analyzeFrame);
        return;
      }

      const pose = estimateHeadPose(detection.landmarks);
      drawOverlay(pose);
      const direction = classifyDirection(pose);
      setCurrentDirection(direction);

      if (direction === expectedDirection) {
        if (stepStartRef.current === null) stepStartRef.current = now;
        const heldFor = now - stepStartRef.current;
        const progress = Math.min(1, heldFor / holdMs);
        setHoldProgress(progress);

        if (heldFor >= holdMs) {
          const completedStep: LivenessChallengeStep = {
            direction: expectedDirection!,
            label: DIRECTION_LABEL[expectedDirection!],
            pose,
            capturedAt: new Date().toISOString(),
          };
          stepsCompletedRef.current = [
            ...stepsCompletedRef.current,
            completedStep,
          ];
          stepStartRef.current = null;
          setHoldProgress(0);

          const nextIndex = stepIndex + 1;
          if (nextIndex >= challenge.length) {
            finishWith(stepsCompletedRef.current);
            return;
          }
          setStepIndex(nextIndex);
        }
      } else {
        stepStartRef.current = null;
        setHoldProgress(0);
      }
    } catch {
      // descartar este frame
    }

    animationRef.current = requestAnimationFrame(analyzeFrame);
  }, [
    faceapi,
    cameraReady,
    completed,
    expectedDirection,
    holdMs,
    maxDurationMs,
    challenge.length,
    stepIndex,
    finishWith,
    onError,
    stopCamera,
    drawOverlay,
  ]);

  useEffect(() => {
    if (!faceapi || !cameraReady || completed) return;
    animationRef.current = requestAnimationFrame(analyzeFrame);
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [faceapi, cameraReady, completed, analyzeFrame]);

  const retry = () => {
    setCompleted(false);
    setTimedOut(false);
    setStepIndex(0);
    setHoldProgress(0);
    stepsCompletedRef.current = [];
    stepStartRef.current = null;
    startTimeRef.current = performance.now();
    startCamera();
  };

  if (apiError) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color='error' gutterBottom>
          No se pudo cargar el motor de detección facial.
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          {apiError}
        </Typography>
        {onCancel && (
          <Button onClick={onCancel} sx={{ mt: 2 }}>
            Cancelar
          </Button>
        )}
      </Paper>
    );
  }

  if (!apiReady) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={32} />
        <Typography sx={{ mt: 2 }}>Cargando motor de liveness…</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant='h6'>Verificación de identidad — Liveness</Typography>
          <Typography variant='body2' color='text.secondary'>
            Sigue las instrucciones en pantalla. Mantén el rostro dentro
            del óvalo.
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
              display: cameraReady ? 'block' : 'none',
              transform: 'scaleX(-1)',
            }}
          />
          <canvas
            ref={overlayRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              transform: 'scaleX(-1)',
            }}
          />
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
          {expectedDirection && !completed && cameraReady && (
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                left: 0,
                right: 0,
                textAlign: 'center',
                color: '#fff',
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              }}
            >
              <Typography variant='h2' sx={{ lineHeight: 1, mb: 0.5 }}>
                {DIRECTION_ARROW[expectedDirection]}
              </Typography>
              <Typography variant='h6'>
                {DIRECTION_LABEL[expectedDirection]}
              </Typography>
            </Box>
          )}
        </Box>

        {cameraError && (
          <Typography color='error' variant='body2'>
            {cameraError}
          </Typography>
        )}

        {!completed && cameraReady && (
          <Box>
            <Stack direction='row' spacing={1} sx={{ mb: 1 }}>
              {challenge.map((dir, idx) => (
                <Chip
                  key={`${dir}-${idx}`}
                  label={DIRECTION_ARROW[dir]}
                  size='small'
                  color={
                    idx < stepIndex
                      ? 'success'
                      : idx === stepIndex
                        ? 'primary'
                        : 'default'
                  }
                  variant={idx === stepIndex ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
            <LinearProgress
              variant='determinate'
              value={holdProgress * 100}
              color={holdProgress > 0.95 ? 'success' : 'primary'}
              sx={{ mb: 1 }}
            />
            <Typography variant='caption' color='text.secondary'>
              Paso {stepIndex + 1} de {challenge.length} — detectando dirección{' '}
              <strong>{currentDirection}</strong>
            </Typography>
          </Box>
        )}

        {completed && (
          <Stack direction='row' spacing={2} alignItems='center'>
            <CheckCircleIcon color='success' />
            <Typography>Liveness completado</Typography>
            <Box sx={{ flex: 1 }} />
            <Button
              startIcon={<RefreshIcon />}
              onClick={retry}
              variant='outlined'
              size='small'
            >
              Reintentar
            </Button>
          </Stack>
        )}

        {timedOut && (
          <Stack direction='row' spacing={2} alignItems='center'>
            <Typography color='error'>Tiempo agotado.</Typography>
            <Button onClick={retry} variant='outlined' size='small'>
              Reintentar
            </Button>
          </Stack>
        )}

        {onCancel && !completed && (
          <Button onClick={onCancel} variant='text'>
            Cancelar
          </Button>
        )}
      </Stack>
    </Paper>
  );
};

export default LivenessCapture;
