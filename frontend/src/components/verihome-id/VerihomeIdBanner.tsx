/**
 * VHID-ENF · Banner persistente de Dashboard que invita al usuario a
 * completar su verificación VeriHome ID. Se oculta cuando el flag
 * `is_verified` ya está activo.
 */

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  Fingerprint as FingerprintIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { useVerihomeIdStatus } from '../../hooks/useVerihomeIdStatus';

const VerihomeIdBanner: React.FC = () => {
  const { data, isLoading, isError } = useVerihomeIdStatus();

  if (isLoading) {
    return (
      <Box mb={3}>
        <LinearProgress />
      </Box>
    );
  }
  if (isError || !data || data.is_verified) {
    return null;
  }

  const isWaitingVisit = data.next_step === 'wait_visit';
  const severity: 'warning' | 'info' = isWaitingVisit ? 'info' : 'warning';
  const icon = isWaitingVisit ? <ScheduleIcon /> : <FingerprintIcon />;

  return (
    <Alert
      severity={severity}
      icon={icon}
      sx={{ mb: 3 }}
      action={
        !isWaitingVisit ? (
          <Button
            color='inherit'
            size='small'
            variant='outlined'
            component={RouterLink}
            to='/app/verihome-id/onboarding'
          >
            Iniciar verificación
          </Button>
        ) : undefined
      }
    >
      <AlertTitle>
        {isWaitingVisit
          ? 'Tu visita VeriHome ID está pendiente'
          : 'Verificación VeriHome ID requerida'}
      </AlertTitle>
      <Stack spacing={0.5}>
        <Typography variant='body2'>
          {isWaitingVisit
            ? 'Completaste el flujo digital. Un agente te contactará para la visita presencial. Una vez sellada el acta, podrás crear propiedades, aplicar a matches y firmar contratos biométricamente.'
            : 'Antes de crear propiedades, aplicar a matches o firmar contratos, debés completar tu verificación VeriHome ID. Es un proceso digital de 5 minutos seguido de una visita presencial.'}
        </Typography>
        {data.blocking_actions.length > 0 && (
          <Typography variant='caption' color='text.secondary'>
            Acciones bloqueadas:
            {' '}
            {data.blocking_actions
              .map(a =>
                a === 'create_property'
                  ? 'crear propiedad'
                  : a === 'apply_match'
                    ? 'aplicar a match'
                    : 'firmar contrato',
              )
              .join(' · ')}
          </Typography>
        )}
      </Stack>
    </Alert>
  );
};

export default VerihomeIdBanner;
