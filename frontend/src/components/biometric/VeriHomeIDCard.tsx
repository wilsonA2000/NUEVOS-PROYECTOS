/**
 * Card de estado VeriHome ID — para Profile / Resume / Dashboard.
 *
 * Consulta el último onboarding del usuario y muestra:
 *   - Estado actual con badge de color
 *   - Score parcial digital (0-50 puntos)
 *   - Botón CTA dinámico (Iniciar / Ver detalles / Reintentar)
 *
 * Diseñada para ser montada en `/app/profile` y otros lugares donde
 * tenga sentido mostrar el estado de verificación del user.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  Fingerprint as FingerprintIcon,
  CheckCircle as CheckIcon,
  Warning as WarnIcon,
  Cancel as RejectIcon,
} from '@mui/icons-material';

import {
  getMyOnboarding,
  type OnboardingResponse,
  type OnboardingVerdict,
} from '../../services/verihomeIdService';

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'no-onboarding' }
  | { kind: 'has-onboarding'; data: OnboardingResponse }
  | { kind: 'error'; message: string };

const VERDICT_META: Record<
  OnboardingVerdict,
  {
    color: 'success' | 'warning' | 'error';
    label: string;
    description: string;
    icon: React.ReactNode;
    cta: string;
    showRetry: boolean;
  }
> = {
  aprobado: {
    color: 'success',
    label: 'Aprobado',
    description:
      'Tu verificación digital fue aprobada. Pronto te contactaremos para programar la visita en campo.',
    icon: <CheckIcon fontSize='small' />,
    cta: 'Ver detalles',
    showRetry: false,
  },
  observado: {
    color: 'warning',
    label: 'Observado',
    description:
      'Tu verificación quedó marcada para revisión manual. Un agente verificará puntos pendientes en la visita en campo.',
    icon: <WarnIcon fontSize='small' />,
    cta: 'Ver detalles',
    showRetry: false,
  },
  rechazado: {
    color: 'error',
    label: 'Rechazado',
    description:
      'No pudimos validar suficientes puntos. Puedes reintentar la verificación o contactarnos.',
    icon: <RejectIcon fontSize='small' />,
    cta: 'Ver detalles',
    showRetry: true,
  },
};

const VeriHomeIDCard: React.FC = () => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<ScreenState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMyOnboarding();
        if (cancelled) return;
        setScreen(
          data
            ? { kind: 'has-onboarding', data }
            : { kind: 'no-onboarding' },
        );
      } catch (err) {
        if (cancelled) return;
        setScreen({
          kind: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'No se pudo cargar el estado de verificación.',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const goToOnboarding = () => navigate('/app/verihome-id/onboarding');

  if (screen.kind === 'loading') {
    return (
      <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
        <CircularProgress size={24} />
        <Typography variant='body2' sx={{ mt: 1 }} color='text.secondary'>
          Cargando estado de verificación…
        </Typography>
      </Paper>
    );
  }

  if (screen.kind === 'error') {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Alert severity='error'>{screen.message}</Alert>
      </Paper>
    );
  }

  if (screen.kind === 'no-onboarding') {
    return (
      <Paper
        sx={{
          p: 3,
          mb: 3,
          border: '1px solid',
          borderColor: 'warning.main',
          backgroundColor: 'rgba(255, 152, 0, 0.04)',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent='space-between'
        >
          <Stack direction='row' spacing={2} alignItems='center'>
            <FingerprintIcon sx={{ fontSize: 40, color: 'warning.main' }} />
            <Box>
              <Typography variant='subtitle1' fontWeight={600}>
                Verificación VeriHome ID pendiente
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Activa tu cuenta verificando tu identidad digital y agenda la
                visita presencial con un agente VeriHome.
              </Typography>
            </Box>
          </Stack>
          <Button
            variant='contained'
            color='warning'
            onClick={goToOnboarding}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Iniciar verificación
          </Button>
        </Stack>
      </Paper>
    );
  }

  const { data } = screen;
  const meta = VERDICT_META[data.digital_verdict];
  const scorePoints = (parseFloat(data.digital_score_total) * 100).toFixed(0);

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent='space-between'
      >
        <Stack direction='row' spacing={2} alignItems='center' flexGrow={1}>
          <FingerprintIcon sx={{ fontSize: 40, color: `${meta.color}.main` }} />
          <Box>
            <Stack direction='row' spacing={1} alignItems='center' mb={0.5}>
              <Typography variant='subtitle1' fontWeight={600}>
                Verificación VeriHome ID
              </Typography>
              <Chip
                size='small'
                label={meta.label}
                color={meta.color}
                icon={meta.icon as React.ReactElement}
              />
            </Stack>
            <Typography variant='body2' color='text.secondary' mb={1}>
              {meta.description}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              Score parcial digital: <strong>{scorePoints} / 50 puntos</strong>
              {' · '}
              Registrado el {new Date(data.created_at).toLocaleDateString('es-CO')}
            </Typography>
          </Box>
        </Stack>
        <Stack direction='column' spacing={1}>
          <Button
            variant='outlined'
            onClick={goToOnboarding}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {meta.cta}
          </Button>
          {meta.showRetry && (
            <Button
              variant='contained'
              color='warning'
              onClick={goToOnboarding}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Reintentar
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default VeriHomeIDCard;
