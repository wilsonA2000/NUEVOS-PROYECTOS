/**
 * F5 · AdminVerihomeIdAnalytics
 *
 * Dashboard de métricas agregadas de actas VeriHome ID:
 *   - Distribución por veredicto final (Doughnut).
 *   - Evolución temporal mensual de actas creadas (Line apilada).
 *   - Promedio por sub-puntaje de visita (Bar horizontal).
 *
 * Filtros: ventana temporal (3/6/12/24 meses) y agente.
 * Backend: GET /verification/acts/analytics/.
 */

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { Insights as InsightsIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

import {
  AnalyticsResponse,
  fieldVisitActsApi,
} from '../../services/fieldVisitActsApi';
import { api } from '../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
);

interface AgentOption {
  id: string;
  agent_code: string;
  user_name: string;
}

const SUBSCORE_LABELS: Record<string, string> = {
  cedula_real: 'Cédula auténtica',
  observacion_visual: 'Observación visual',
  recibo_publico: 'Recibo público',
  comprobante_laboral: 'Comprobante laboral',
  email_otp: 'Email verificado',
  telefono_otp: 'Teléfono verificado',
  cruces_oficiales: 'Cruces oficiales',
  inmueble_existe: 'Inmueble existe',
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  color?: 'success' | 'warning' | 'error' | 'primary';
}> = ({ label, value, color = 'primary' }) => (
  <Paper variant='outlined' sx={{ p: 2, textAlign: 'center' }}>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='h4' fontWeight={700} color={`${color}.main`}>
      {value}
    </Typography>
  </Paper>
);

const AdminVerihomeIdAnalytics: React.FC = () => {
  const [months, setMonths] = useState<number>(6);
  const [agentId, setAgentId] = useState<string>('');

  const agentsQuery = useQuery<AgentOption[]>({
    queryKey: ['verification-agents'],
    queryFn: async () => {
      const { data } = await api.get('/verification/agents/');
      return Array.isArray(data) ? data : data?.results ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const analyticsQuery = useQuery<AnalyticsResponse>({
    queryKey: ['verihome-id-analytics', months, agentId],
    queryFn: () =>
      fieldVisitActsApi.analytics({
        months,
        agent_id: agentId || undefined,
      }),
  });

  const verdictDoughnut = useMemo(() => {
    const v = analyticsQuery.data?.by_verdict || {
      aprobado: 0,
      observado: 0,
      rechazado: 0,
    };
    return {
      labels: ['Aprobado', 'Observado', 'Rechazado'],
      datasets: [
        {
          data: [v.aprobado, v.observado, v.rechazado],
          backgroundColor: ['#2e7d32', '#ed6c02', '#d32f2f'],
          borderWidth: 2,
        },
      ],
    };
  }, [analyticsQuery.data]);

  const timelineLine = useMemo(() => {
    const tl = analyticsQuery.data?.timeline || [];
    return {
      labels: tl.map(e => e.month),
      datasets: [
        {
          label: 'Aprobado',
          data: tl.map(e => e.aprobado),
          borderColor: '#2e7d32',
          backgroundColor: 'rgba(46,125,50,0.2)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Observado',
          data: tl.map(e => e.observado),
          borderColor: '#ed6c02',
          backgroundColor: 'rgba(237,108,2,0.2)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Rechazado',
          data: tl.map(e => e.rechazado),
          borderColor: '#d32f2f',
          backgroundColor: 'rgba(211,47,47,0.2)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [analyticsQuery.data]);

  const subscoreBar = useMemo(() => {
    const avg = analyticsQuery.data?.subscore_avg || {};
    const entries = Object.entries(avg).sort((a, b) => b[1] - a[1]);
    return {
      labels: entries.map(([k]) => SUBSCORE_LABELS[k] || k),
      datasets: [
        {
          label: 'Promedio',
          data: entries.map(([, v]) => v),
          backgroundColor: '#1976d2',
        },
      ],
    };
  }, [analyticsQuery.data]);

  const summary = analyticsQuery.data?.summary;

  return (
    <Box sx={{ p: 3 }} data-testid='verihome-id-analytics'>
      <Stack
        direction='row'
        spacing={1.5}
        alignItems='center'
        justifyContent='space-between'
        sx={{ mb: 3 }}
      >
        <Stack direction='row' spacing={1.5} alignItems='center'>
          <InsightsIcon color='primary' />
          <Typography variant='h5' fontWeight={600}>
            Analytics VeriHome ID
          </Typography>
        </Stack>
        <Stack direction='row' spacing={1.5}>
          <FormControl size='small' sx={{ minWidth: 160 }}>
            <InputLabel id='analytics-window'>Ventana</InputLabel>
            <Select
              labelId='analytics-window'
              label='Ventana'
              value={months}
              onChange={e => setMonths(Number(e.target.value))}
              data-testid='analytics-window-select'
            >
              <MenuItem value={3}>3 meses</MenuItem>
              <MenuItem value={6}>6 meses</MenuItem>
              <MenuItem value={12}>12 meses</MenuItem>
              <MenuItem value={24}>24 meses</MenuItem>
            </Select>
          </FormControl>
          <FormControl size='small' sx={{ minWidth: 220 }}>
            <InputLabel id='analytics-agent'>Agente</InputLabel>
            <Select
              labelId='analytics-agent'
              label='Agente'
              value={agentId}
              onChange={e => setAgentId(String(e.target.value))}
              data-testid='analytics-agent-select'
            >
              <MenuItem value=''>Todos los agentes</MenuItem>
              {(agentsQuery.data || []).map(a => (
                <MenuItem key={a.id} value={a.id}>
                  {a.agent_code} · {a.user_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      {analyticsQuery.isLoading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      ) : analyticsQuery.isError ? (
        <Alert severity='error'>
          No se pudieron cargar las métricas. Verificá tu sesión de admin.
        </Alert>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <MetricCard
                label='Total actas'
                value={String(summary?.total ?? 0)}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MetricCard
                label='Aprobadas'
                value={String(summary?.aprobados ?? 0)}
                color='success'
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MetricCard
                label='Observadas'
                value={String(summary?.observados ?? 0)}
                color='warning'
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MetricCard
                label='Rechazadas'
                value={String(summary?.rechazados ?? 0)}
                color='error'
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MetricCard
                label='Score total promedio'
                value={(summary?.avg_total_score ?? 0).toFixed(3)}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MetricCard
                label='Score digital promedio'
                value={(summary?.avg_digital_score ?? 0).toFixed(3)}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MetricCard
                label='Score visita promedio'
                value={(summary?.avg_visit_score ?? 0).toFixed(3)}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MetricCard
                label='Selladas'
                value={String(summary?.sealed_count ?? 0)}
                color='success'
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <Paper variant='outlined' sx={{ p: 2, height: 360 }}>
                <Typography variant='subtitle1' fontWeight={600} sx={{ mb: 1 }}>
                  Distribución por veredicto
                </Typography>
                {(summary?.total ?? 0) === 0 ? (
                  <Alert severity='info'>
                    Sin datos para los filtros seleccionados.
                  </Alert>
                ) : (
                  <Box sx={{ height: 290 }}>
                    <Doughnut
                      data={verdictDoughnut}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } },
                      }}
                    />
                  </Box>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
              <Paper variant='outlined' sx={{ p: 2, height: 360 }}>
                <Typography variant='subtitle1' fontWeight={600} sx={{ mb: 1 }}>
                  Evolución mensual ({analyticsQuery.data?.window_months}m)
                </Typography>
                {(analyticsQuery.data?.timeline?.length ?? 0) === 0 ? (
                  <Alert severity='info'>
                    Sin actas en la ventana seleccionada.
                  </Alert>
                ) : (
                  <Box sx={{ height: 290 }}>
                    <Line
                      data={timelineLine}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } },
                        scales: {
                          y: { beginAtZero: true, ticks: { stepSize: 1 } },
                        },
                      }}
                    />
                  </Box>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper variant='outlined' sx={{ p: 2, height: 360 }}>
                <Typography variant='subtitle1' fontWeight={600} sx={{ mb: 1 }}>
                  Promedio por sub-puntaje (de 0.10 máximo)
                </Typography>
                {Object.keys(analyticsQuery.data?.subscore_avg || {}).length ===
                0 ? (
                  <Alert severity='info'>
                    Sin sub-puntajes registrados aún. Los agentes deben
                    completar al menos un acta con score para verlos aquí.
                  </Alert>
                ) : (
                  <Box sx={{ height: 290 }}>
                    <Bar
                      data={subscoreBar}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: { legend: { display: false } },
                        scales: { x: { beginAtZero: true, suggestedMax: 0.1 } },
                      }}
                    />
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default AdminVerihomeIdAnalytics;
