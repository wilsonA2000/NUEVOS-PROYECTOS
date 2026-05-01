/**
 * D1 · VisitScoreEditor
 *
 * Editor de score de visita para el agente. 8 sub-puntajes con sliders
 * 0.00-0.10 (suma máxima 0.50). Total se actualiza en vivo. Persiste
 * vía POST /acts/{id}/visit-score/.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { fieldVisitActsApi } from '../../services/fieldVisitActsApi';
import { useSnackbar } from '../../contexts/SnackbarContext';

const SUBSCORE_FIELDS: Array<{
  key: string;
  label: string;
  helper: string;
  max: number;
}> = [
  {
    key: 'cedula_real',
    label: 'Cédula auténtica',
    helper: 'Verificación física del documento',
    max: 0.1,
  },
  {
    key: 'observacion_visual',
    label: 'Observación visual',
    helper: 'Comportamiento normal, coherencia',
    max: 0.05,
  },
  {
    key: 'recibo_publico',
    label: 'Recibo público',
    helper: 'Servicios públicos a nombre del verificado',
    max: 0.05,
  },
  {
    key: 'comprobante_laboral',
    label: 'Comprobante laboral',
    helper: 'Carta laboral / contrato',
    max: 0.05,
  },
  {
    key: 'email_otp',
    label: 'Email verificado',
    helper: 'OTP enviado y confirmado',
    max: 0.05,
  },
  {
    key: 'telefono_otp',
    label: 'Teléfono verificado',
    helper: 'SMS OTP confirmado',
    max: 0.05,
  },
  {
    key: 'cruces_oficiales',
    label: 'Cruces oficiales',
    helper: 'ADRES/RUAF/RUNT/Procuraduría/etc.',
    max: 0.1,
  },
  {
    key: 'inmueble_existe',
    label: 'Inmueble existe',
    helper: 'Solo aplica para arrendadores',
    max: 0.05,
  },
];

const MAX_TOTAL = 0.5;

interface Props {
  actId: string;
  initialBreakdown?: Record<string, number>;
  initialTotal?: number;
  disabled?: boolean;
}

const VisitScoreEditor: React.FC<Props> = ({
  actId,
  initialBreakdown,
  initialTotal,
  disabled = false,
}) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();

  const [scores, setScores] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    for (const f of SUBSCORE_FIELDS) {
      out[f.key] = Number(initialBreakdown?.[f.key] ?? 0);
    }
    return out;
  });

  useEffect(() => {
    if (initialBreakdown) {
      setScores(prev => {
        const out = { ...prev };
        for (const f of SUBSCORE_FIELDS) {
          out[f.key] = Number(initialBreakdown[f.key] ?? prev[f.key] ?? 0);
        }
        return out;
      });
    }
  }, [initialBreakdown]);

  const total = useMemo(
    () =>
      Math.round(
        SUBSCORE_FIELDS.reduce((sum, f) => sum + (scores[f.key] || 0), 0) *
          1000,
      ) / 1000,
    [scores],
  );

  const overflow = total > MAX_TOTAL + 0.0001;

  const mutation = useMutation({
    mutationFn: () =>
      fieldVisitActsApi.updateVisitScore(actId, {
        visit_score_breakdown: scores,
        visit_score_total: Math.min(total, MAX_TOTAL),
      }),
    onSuccess: () => {
      showSuccess('Score de visita guardado.');
      queryClient.invalidateQueries({ queryKey: ['field-visit-act', actId] });
      queryClient.invalidateQueries({
        queryKey: ['verihome-id-scoring'],
      });
    },
    onError: () =>
      showError('No se pudo guardar el score. Revisá los valores.'),
  });

  const handleReset = () => {
    const out: Record<string, number> = {};
    for (const f of SUBSCORE_FIELDS) out[f.key] = 0;
    setScores(out);
  };

  return (
    <Paper
      variant='outlined'
      sx={{ p: 2 }}
      data-testid='visit-score-editor'
      data-visit-score-total={total.toFixed(3)}
    >
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        sx={{ mb: 2 }}
      >
        <Typography variant='subtitle1' fontWeight={600}>
          Score de visita (0.00 – 0.50)
        </Typography>
        <Stack direction='row' spacing={1} alignItems='center'>
          <Typography
            variant='h6'
            fontWeight={700}
            color={overflow ? 'error.main' : 'success.main'}
          >
            {total.toFixed(3)}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            / {MAX_TOTAL.toFixed(2)}
          </Typography>
        </Stack>
      </Stack>

      {!!initialTotal && initialTotal !== total && (
        <Alert severity='info' sx={{ mb: 2 }}>
          Score guardado actualmente: {initialTotal.toFixed(3)}.
        </Alert>
      )}
      {overflow && (
        <Alert severity='error' sx={{ mb: 2 }}>
          La suma supera el máximo permitido (0.50). Ajustá los valores
          antes de guardar.
        </Alert>
      )}

      <Grid container spacing={2}>
        {SUBSCORE_FIELDS.map(f => (
          <Grid item xs={12} md={6} key={f.key}>
            <Box data-testid={`visit-score-slider-${f.key}`}>
              <Stack
                direction='row'
                alignItems='center'
                justifyContent='space-between'
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
                disabled={disabled}
              />
            </Box>
          </Grid>
        ))}
      </Grid>

      <Stack direction='row' spacing={1.5} justifyContent='flex-end' mt={2}>
        <Button
          startIcon={<RefreshIcon />}
          onClick={handleReset}
          disabled={disabled || mutation.isPending}
          data-testid='visit-score-reset'
        >
          Limpiar
        </Button>
        <Button
          variant='contained'
          color='primary'
          startIcon={
            mutation.isPending ? (
              <CircularProgress size={16} color='inherit' />
            ) : (
              <SaveIcon />
            )
          }
          onClick={() => mutation.mutate()}
          disabled={disabled || mutation.isPending || overflow}
          data-testid='visit-score-save'
        >
          {mutation.isPending ? 'Guardando…' : 'Guardar score'}
        </Button>
      </Stack>
    </Paper>
  );
};

export default VisitScoreEditor;
