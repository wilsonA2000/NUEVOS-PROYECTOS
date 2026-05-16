/**
 * F4 · Wizard "completar visita" para el agente verificador.
 *
 * Stepper en 5 pasos:
 *   1. GPS — captura ubicación con navigator.geolocation.
 *   2. Fotos sección VII — cámara trasera (getUserMedia), data URL JPEG.
 *   3. Observaciones — notas libres + risk flags.
 *   4. Score de visita — 8 sub-puntajes (0.0-0.5).
 *   5. Resumen — confirmar y crear acta + cerrar visita.
 *
 * Persiste:
 *   - POST /verification/acts/        → crea draft con payload (si hay field_request).
 *   - POST /verification/acts/{id}/visit-score/ → guarda breakdown.
 *   - POST /verification/visits/{id}/complete/  → cierra la visita legacy.
 *
 * Si la visita no tiene field_request asociado (caso edge legacy) se omite
 * la creación del acta y se hace sólo el complete legacy con notes.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Slider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import {
  CameraAlt as CameraAltIcon,
  Cameraswitch as CameraSwitchIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  LocationOn as LocationOnIcon,
  PhotoCamera as PhotoCameraIcon,
  Refresh as RefreshIcon,
  Stop as StopIcon,
} from '@mui/icons-material';

import {
  VerificationVisit,
  agentVisitsApi,
} from '../../services/agentVisitsApi';
import { fieldVisitActsApi } from '../../services/fieldVisitActsApi';

const SCORE_FIELDS: Array<{
  key: string;
  label: string;
  helper: string;
  max: number;
}> = [
  { key: 'cedula_real', label: 'Cédula auténtica', helper: 'Verificación física', max: 0.1 },
  { key: 'observacion_visual', label: 'Observación visual', helper: 'Comportamiento normal', max: 0.05 },
  { key: 'recibo_publico', label: 'Recibo público', helper: 'A nombre del verificado', max: 0.05 },
  { key: 'comprobante_laboral', label: 'Comprobante laboral', helper: 'Carta o extracto', max: 0.05 },
  { key: 'email_otp', label: 'Email verificado', helper: 'OTP confirmado', max: 0.05 },
  { key: 'telefono_otp', label: 'Teléfono verificado', helper: 'SMS OTP', max: 0.05 },
  { key: 'cruces_oficiales', label: 'Cruces oficiales', helper: 'ADRES/RUAF/RUNT/etc.', max: 0.1 },
  { key: 'inmueble_existe', label: 'Inmueble existe', helper: 'Sólo arrendadores', max: 0.05 },
];

const RISK_FLAG_OPTIONS = [
  'cedula_adulterada',
  'comportamiento_evasivo',
  'direccion_no_coincide',
  'no_aporta_documentos',
  'tercero_responde_por_titular',
  'inmueble_no_corresponde',
];

interface PhotoEntry {
  id: string;
  data_url: string;
  caption: string;
  taken_at: string;
}

interface GpsCoords {
  lat: number;
  lng: number;
  accuracy_m: number;
  taken_at: string;
}

interface Props {
  open: boolean;
  visit: VerificationVisit | null;
  onClose: () => void;
  onCompleted: () => void;
  onError: (message: string) => void;
}

const STEPS = [
  'Ubicación GPS',
  'Fotos sección VII',
  'Observaciones',
  'Score de visita',
  'Resumen',
];

const blankScores = () =>
  SCORE_FIELDS.reduce<Record<string, number>>(
    (acc, f) => ({ ...acc, [f.key]: 0 }),
    {},
  );

const AgentCompleteVisitWizard: React.FC<Props> = ({
  open,
  visit,
  onClose,
  onCompleted,
  onError,
}) => {
  const [activeStep, setActiveStep] = useState(0);

  // Paso 1 — GPS
  const [gps, setGps] = useState<GpsCoords | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);

  // Paso 2 — Cámara
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(
    'environment',
  );
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [pendingCaption, setPendingCaption] = useState('');

  // Paso 3 — Observaciones
  const [observations, setObservations] = useState('');
  const [riskFlags, setRiskFlags] = useState<string[]>([]);
  const [passed, setPassed] = useState(true);

  // Paso 4 — Score
  const [scores, setScores] = useState<Record<string, number>>(blankScores);

  // Paso 5 — Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<string>('');

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setGps(null);
      setGpsError(null);
      setGpsBusy(false);
      setPhotos([]);
      setPendingCaption('');
      setCameraError(null);
      setObservations('');
      setRiskFlags([]);
      setPassed(true);
      setScores(blankScores());
      setSubmitting(false);
      setSubmitProgress('');
    }
  }, [open]);

  // Cerrar cámara al cerrar el modal o cambiar de paso
  useEffect(() => {
    if (!open || activeStep !== 1) {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeStep]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const totalScore = useMemo(
    () =>
      Math.round(
        Object.values(scores).reduce((s, v) => s + (v || 0), 0) * 1000,
      ) / 1000,
    [scores],
  );

  const totalOverflow = totalScore > 0.5 + 0.0001;

  const captureGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('Este dispositivo no soporta geolocalización.');
      return;
    }
    setGpsBusy(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGps({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy_m: Math.round(pos.coords.accuracy),
          taken_at: new Date().toISOString(),
        });
        setGpsBusy(false);
      },
      err => {
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado. Habilitalo en el navegador.'
            : `No se pudo obtener la ubicación (${err.message}).`,
        );
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError(
        err instanceof Error
          ? `No se pudo abrir la cámara: ${err.message}`
          : 'No se pudo abrir la cámara.',
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const flipCamera = async () => {
    stopCamera();
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
    setTimeout(startCamera, 100);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) {
      setCameraError('La cámara aún no está lista. Esperá unos segundos.');
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    const entry: PhotoEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      data_url: dataUrl,
      caption: pendingCaption.trim() || `Foto ${photos.length + 1}`,
      taken_at: new Date().toISOString(),
    };
    setPhotos(prev => [...prev, entry]);
    setPendingCaption('');
  };

  const removePhoto = (id: string) =>
    setPhotos(prev => prev.filter(p => p.id !== id));

  const toggleRiskFlag = (flag: string) =>
    setRiskFlags(prev =>
      prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag],
    );

  const canAdvance = (step: number) => {
    if (step === 0) return gps !== null;
    if (step === 1) return true; // fotos opcionales
    if (step === 2) return observations.trim().length >= 10;
    if (step === 3) return !totalOverflow;
    return true;
  };

  const submit = async () => {
    if (!visit) return;
    setSubmitting(true);

    const payload = {
      seccion_vii: {
        fotos: photos.map(p => ({
          caption: p.caption,
          data_url: p.data_url,
          taken_at: p.taken_at,
        })),
      },
      observaciones_agente: observations,
      risk_flags: riskFlags,
      gps: gps,
      visit_passed: passed,
      generated_by: 'F4_complete_visit_wizard',
      generated_at: new Date().toISOString(),
    };

    try {
      if (visit.field_request_id && !visit.has_act) {
        setSubmitProgress('Creando borrador del acta…');
        const act = await fieldVisitActsApi.createDraft({
          field_request: visit.field_request_id,
          visit: visit.id,
          payload,
        });

        setSubmitProgress('Guardando score de visita…');
        await fieldVisitActsApi.updateVisitScore(act.id, {
          visit_score_breakdown: scores,
          visit_score_total: Math.min(totalScore, 0.5),
        });
      } else if (visit.act_id) {
        setSubmitProgress('Actualizando acta existente…');
        await fieldVisitActsApi.updatePayload(visit.act_id, payload);
        await fieldVisitActsApi.updateVisitScore(visit.act_id, {
          visit_score_breakdown: scores,
          visit_score_total: Math.min(totalScore, 0.5),
        });
      }

      setSubmitProgress('Cerrando la visita…');
      await agentVisitsApi.complete(visit.id, {
        passed,
        notes: observations,
      });

      onCompleted();
    } catch (err) {
      const detail =
        err instanceof Error ? err.message : 'Error inesperado al completar.';
      onError(detail);
      setSubmitting(false);
      setSubmitProgress('');
    }
  };

  const handleNext = () => setActiveStep(s => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setActiveStep(s => Math.max(s - 1, 0));

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth='md'
      fullWidth
      data-testid='agent-complete-visit-wizard'
    >
      <DialogTitle>
        <Stack direction='row' alignItems='center' justifyContent='space-between'>
          <Box>
            Completar visita {visit?.visit_number}
            <Typography variant='caption' display='block' color='text.secondary'>
              {visit?.target_user_name || visit?.target_user_email}
            </Typography>
          </Box>
          {!submitting && (
            <IconButton onClick={onClose} size='small' aria-label='Cerrar'>
              <CloseIcon />
            </IconButton>
          )}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {STEPS.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Paso 1 — GPS */}
        {activeStep === 0 && (
          <Box data-testid='wizard-step-gps'>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              Capturá la ubicación actual con el GPS del dispositivo. Quedará
              registrada como evidencia física de la visita.
            </Typography>
            <Button
              variant='contained'
              startIcon={
                gpsBusy ? (
                  <CircularProgress size={16} color='inherit' />
                ) : (
                  <LocationOnIcon />
                )
              }
              onClick={captureGps}
              disabled={gpsBusy}
              data-testid='wizard-gps-capture'
            >
              {gps ? 'Volver a capturar ubicación' : 'Capturar ubicación GPS'}
            </Button>
            {gps && (
              <Paper variant='outlined' sx={{ p: 2, mt: 2 }}>
                <Typography variant='subtitle2'>Ubicación capturada</Typography>
                <Typography variant='body2'>
                  Lat: {gps.lat} · Lng: {gps.lng}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Precisión: ~{gps.accuracy_m} m · {new Date(gps.taken_at).toLocaleString()}
                </Typography>
                <Box mt={1}>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${gps.lat}&mlon=${gps.lng}#map=18/${gps.lat}/${gps.lng}`}
                    target='_blank'
                    rel='noreferrer'
                  >
                    Ver en mapa
                  </a>
                </Box>
              </Paper>
            )}
            {gpsError && (
              <Alert severity='error' sx={{ mt: 2 }}>
                {gpsError}
              </Alert>
            )}
          </Box>
        )}

        {/* Paso 2 — Fotos */}
        {activeStep === 1 && (
          <Box data-testid='wizard-step-photos'>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              Capturá fotos del inmueble, medidor de servicios, fachada,
              documentos físicos o cualquier evidencia. Sección VII del acta.
            </Typography>

            <Box
              sx={{
                position: 'relative',
                bgcolor: 'black',
                borderRadius: 1,
                overflow: 'hidden',
                aspectRatio: '4/3',
                mb: 2,
              }}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {!cameraActive && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <Stack alignItems='center' spacing={1}>
                    <CameraAltIcon sx={{ fontSize: 48 }} />
                    <Typography variant='caption'>Cámara apagada</Typography>
                  </Stack>
                </Box>
              )}
            </Box>

            <Stack direction='row' spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
              {!cameraActive ? (
                <Button
                  variant='contained'
                  startIcon={<CameraAltIcon />}
                  onClick={startCamera}
                  data-testid='wizard-camera-start'
                >
                  Activar cámara
                </Button>
              ) : (
                <>
                  <Button
                    variant='contained'
                    color='success'
                    startIcon={<PhotoCameraIcon />}
                    onClick={takePhoto}
                    data-testid='wizard-camera-snap'
                  >
                    Tomar foto
                  </Button>
                  <Button
                    variant='outlined'
                    startIcon={<CameraSwitchIcon />}
                    onClick={flipCamera}
                  >
                    Cambiar cámara
                  </Button>
                  <Button
                    variant='outlined'
                    color='error'
                    startIcon={<StopIcon />}
                    onClick={stopCamera}
                  >
                    Apagar
                  </Button>
                </>
              )}
            </Stack>

            <TextField
              fullWidth
              size='small'
              label='Descripción para la próxima foto (opcional)'
              value={pendingCaption}
              onChange={e => setPendingCaption(e.target.value)}
              sx={{ mb: 2 }}
            />

            {cameraError && (
              <Alert severity='error' sx={{ mb: 2 }}>
                {cameraError}
              </Alert>
            )}

            {photos.length === 0 ? (
              <Alert severity='info'>
                Sin fotos aún. Las fotos son opcionales pero recomendadas para
                acta sólida.
              </Alert>
            ) : (
              <Grid container spacing={1}>
                {photos.map(p => (
                  <Grid item xs={6} sm={4} md={3} key={p.id}>
                    <Paper variant='outlined' sx={{ p: 0.5 }}>
                      <Box
                        component='img'
                        src={p.data_url}
                        alt={p.caption}
                        sx={{
                          width: '100%',
                          aspectRatio: '4/3',
                          objectFit: 'cover',
                          borderRadius: 0.5,
                        }}
                      />
                      <Stack
                        direction='row'
                        spacing={0.5}
                        alignItems='center'
                        sx={{ mt: 0.5 }}
                      >
                        <Typography
                          variant='caption'
                          sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {p.caption}
                        </Typography>
                        <IconButton
                          size='small'
                          onClick={() => removePhoto(p.id)}
                          aria-label='Eliminar foto'
                        >
                          <DeleteIcon fontSize='inherit' />
                        </IconButton>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* Paso 3 — Observaciones */}
        {activeStep === 2 && (
          <Box data-testid='wizard-step-observations'>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              Describí los hallazgos de la visita (mínimo 10 caracteres).
              Marcá las banderas de riesgo que correspondan.
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={5}
              label='Observaciones del agente'
              value={observations}
              onChange={e => setObservations(e.target.value)}
              data-testid='wizard-observations'
              sx={{ mb: 2 }}
            />
            <Typography variant='subtitle2' sx={{ mb: 1 }}>
              Banderas de riesgo
            </Typography>
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              {RISK_FLAG_OPTIONS.map(flag => (
                <Chip
                  key={flag}
                  label={flag.replace(/_/g, ' ')}
                  color={riskFlags.includes(flag) ? 'error' : 'default'}
                  variant={riskFlags.includes(flag) ? 'filled' : 'outlined'}
                  onClick={() => toggleRiskFlag(flag)}
                  size='small'
                />
              ))}
            </Stack>
            <Stack direction='row' spacing={1} sx={{ mt: 3 }}>
              <Typography variant='subtitle2'>Veredicto del agente:</Typography>
              <Chip
                label='Aprobada'
                color={passed ? 'success' : 'default'}
                variant={passed ? 'filled' : 'outlined'}
                onClick={() => setPassed(true)}
                size='small'
              />
              <Chip
                label='Fallida'
                color={!passed ? 'error' : 'default'}
                variant={!passed ? 'filled' : 'outlined'}
                onClick={() => setPassed(false)}
                size='small'
              />
            </Stack>
          </Box>
        )}

        {/* Paso 4 — Score */}
        {activeStep === 3 && (
          <Box data-testid='wizard-step-score'>
            <Stack
              direction='row'
              alignItems='center'
              justifyContent='space-between'
              sx={{ mb: 2 }}
            >
              <Typography variant='body2' color='text.secondary'>
                Asigná sub-puntajes (suma máxima 0.50). Se combinarán con el
                score digital para el veredicto final.
              </Typography>
              <Typography
                variant='h6'
                color={totalOverflow ? 'error.main' : 'success.main'}
              >
                {totalScore.toFixed(3)} / 0.50
              </Typography>
            </Stack>
            {totalOverflow && (
              <Alert severity='error' sx={{ mb: 2 }}>
                Excedés el máximo 0.50. Ajustá los valores.
              </Alert>
            )}
            <Grid container spacing={2}>
              {SCORE_FIELDS.map(f => (
                <Grid item xs={12} md={6} key={f.key}>
                  <Box>
                    <Stack
                      direction='row'
                      justifyContent='space-between'
                      alignItems='center'
                    >
                      <Typography variant='body2' fontWeight={600}>
                        {f.label}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {(scores[f.key] || 0).toFixed(3)} / {f.max.toFixed(2)}
                      </Typography>
                    </Stack>
                    <Typography variant='caption' color='text.secondary'>
                      {f.helper}
                    </Typography>
                    <Slider
                      value={scores[f.key] || 0}
                      onChange={(_, v) =>
                        setScores(prev => ({
                          ...prev,
                          [f.key]: typeof v === 'number' ? v : prev[f.key] || 0,
                        }))
                      }
                      min={0}
                      max={f.max}
                      step={0.005}
                      data-testid={`wizard-score-${f.key}`}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => setScores(blankScores())}
              sx={{ mt: 2 }}
            >
              Limpiar
            </Button>
          </Box>
        )}

        {/* Paso 5 — Resumen */}
        {activeStep === 4 && (
          <Box data-testid='wizard-step-summary'>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              Revisá la información antes de cerrar la visita. Esta acción
              creará el acta en estado <b>borrador</b> y la marcará como
              completada. No podrás modificar la visita después.
            </Typography>
            <Paper variant='outlined' sx={{ p: 2, mb: 2 }}>
              <Typography variant='subtitle2'>GPS</Typography>
              <Typography variant='body2'>
                {gps ? `${gps.lat}, ${gps.lng} (±${gps.accuracy_m}m)` : '—'}
              </Typography>
            </Paper>
            <Paper variant='outlined' sx={{ p: 2, mb: 2 }}>
              <Typography variant='subtitle2'>Evidencia fotográfica</Typography>
              <Typography variant='body2'>
                {photos.length} foto{photos.length === 1 ? '' : 's'} adjunta
                {photos.length === 1 ? '' : 's'}
              </Typography>
            </Paper>
            <Paper variant='outlined' sx={{ p: 2, mb: 2 }}>
              <Typography variant='subtitle2'>Observaciones</Typography>
              <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
                {observations || '—'}
              </Typography>
              {riskFlags.length > 0 && (
                <Stack direction='row' spacing={0.5} flexWrap='wrap' useFlexGap mt={1}>
                  {riskFlags.map(f => (
                    <Chip key={f} label={f} color='error' size='small' />
                  ))}
                </Stack>
              )}
              <Typography variant='caption' color='text.secondary' display='block' mt={1}>
                Veredicto: <b>{passed ? 'APROBADA' : 'FALLIDA'}</b>
              </Typography>
            </Paper>
            <Paper variant='outlined' sx={{ p: 2 }}>
              <Typography variant='subtitle2'>Score de visita</Typography>
              <Typography variant='body2'>
                Total: <b>{totalScore.toFixed(3)}</b> / 0.50
              </Typography>
            </Paper>

            {!visit?.field_request_id && (
              <Alert severity='warning' sx={{ mt: 2 }}>
                Esta visita no tiene VeriHome ID onboarding asociado. No se creará
                el acta; sólo se cerrará la visita con tus notas.
              </Alert>
            )}

            {submitting && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant='caption' color='text.secondary'>
                  {submitProgress}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={handleBack} disabled={activeStep === 0 || submitting}>
          Atrás
        </Button>
        {activeStep < STEPS.length - 1 ? (
          <Button
            variant='contained'
            onClick={handleNext}
            disabled={!canAdvance(activeStep)}
            data-testid='wizard-next'
          >
            Siguiente
          </Button>
        ) : (
          <Button
            variant='contained'
            color='success'
            onClick={submit}
            disabled={submitting || totalOverflow || !gps}
            data-testid='wizard-submit'
          >
            {submitting ? 'Guardando…' : 'Cerrar visita'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AgentCompleteVisitWizard;
