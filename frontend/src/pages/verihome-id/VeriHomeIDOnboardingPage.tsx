/**
 * Página de onboarding VeriHome ID.
 *
 * Monta `<VeriHomeIDFlow />`, envía el resultado al backend y muestra el
 * estado correspondiente (sin onboarding / completado / rechazado).
 * Si el user ya tiene un onboarding `aprobado`/`observado`, se muestra el
 * estado actual en lugar del flujo (para evitar duplicar registros).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import VeriHomeIDFlow, {
  type VeriHomeIDDigitalResult,
} from '../../components/biometric/VeriHomeIDFlow';
import {
  getMyOnboarding,
  submitOnboarding,
  type OnboardingResponse,
} from '../../services/verihomeIdService';

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'flow' }
  | { kind: 'submitting' }
  | { kind: 'done'; data: OnboardingResponse }
  | { kind: 'error'; message: string };

const VERDICT_COPY: Record<
  OnboardingResponse['digital_verdict'],
  { severity: 'success' | 'warning' | 'error'; title: string; body: string }
> = {
  aprobado: {
    severity: 'success',
    title: 'Verificación digital aprobada',
    body:
      'Tu información digital cumple los mínimos. Pronto te contactaremos para programar la visita en campo del agente VeriHome.',
  },
  observado: {
    severity: 'warning',
    title: 'Verificación digital con observaciones',
    body:
      'Tu identidad digital quedó marcada para revisión manual. Un agente verificará los puntos pendientes en la visita en campo.',
  },
  rechazado: {
    severity: 'error',
    title: 'Verificación digital no superada',
    body:
      'No pudimos validar suficientes puntos digitalmente. Si crees que es un error, contáctanos para revisar tu caso.',
  },
};

const VeriHomeIDOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<ScreenState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await getMyOnboarding();
        if (cancelled) return;
        if (existing) {
          setScreen({ kind: 'done', data: existing });
        } else {
          setScreen({ kind: 'flow' });
        }
      } catch (err) {
        if (cancelled) return;
        setScreen({
          kind: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'No se pudo verificar el estado actual del onboarding.',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleComplete = useCallback(async (result: VeriHomeIDDigitalResult) => {
    setScreen({ kind: 'submitting' });
    try {
      const data = await submitOnboarding(result);
      setScreen({ kind: 'done', data });
    } catch (err) {
      setScreen({
        kind: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Hubo un error enviando tu verificación. Intenta nuevamente.',
      });
    }
  }, []);

  const handleCancel = useCallback(() => {
    navigate('/app/dashboard');
  }, [navigate]);

  const handleRetry = useCallback(() => {
    setScreen({ kind: 'flow' });
  }, []);

  return (
    <Container maxWidth='md' sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant='h4' gutterBottom>
            VeriHome ID
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            Verificación digital previa a la visita presencial del agente.
          </Typography>
        </Box>

        {screen.kind === 'loading' && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Cargando estado actual…</Typography>
          </Paper>
        )}

        {screen.kind === 'flow' && (
          <VeriHomeIDFlow
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        )}

        {screen.kind === 'submitting' && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>
              Enviando tu verificación digital…
            </Typography>
          </Paper>
        )}

        {screen.kind === 'done' && (
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Alert severity={VERDICT_COPY[screen.data.digital_verdict].severity}>
                <Typography variant='subtitle1'>
                  {VERDICT_COPY[screen.data.digital_verdict].title}
                </Typography>
                <Typography variant='body2'>
                  {VERDICT_COPY[screen.data.digital_verdict].body}
                </Typography>
              </Alert>
              <Typography variant='body2' color='text.secondary'>
                Score parcial digital:{' '}
                <strong>
                  {(parseFloat(screen.data.digital_score_total) * 100).toFixed(0)}
                  /50
                </strong>
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Registrado el{' '}
                {new Date(screen.data.created_at).toLocaleString('es-CO')}
              </Typography>
              <Stack direction='row' spacing={2}>
                <Button variant='contained' onClick={() => navigate('/app/dashboard')}>
                  Volver al dashboard
                </Button>
                {screen.data.digital_verdict === 'rechazado' && (
                  <Button variant='outlined' onClick={handleRetry}>
                    Reintentar verificación
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>
        )}

        {screen.kind === 'error' && (
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Alert severity='error'>{screen.message}</Alert>
              <Stack direction='row' spacing={2}>
                <Button variant='contained' onClick={handleRetry}>
                  Reintentar
                </Button>
                <Button variant='text' onClick={handleCancel}>
                  Volver al dashboard
                </Button>
              </Stack>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
};

export default VeriHomeIDOnboardingPage;
