/**
 * C12 · AdminVerihomeIdScoring
 *
 * Ranking de candidatos VeriHome ID con score compuesto
 * (digital + visita = 0-1.0). Filtros por veredicto, status y rango
 * de score. Vínculo a detalle del acta.
 */

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Insights as InsightsIcon,
  Warning as WarningIcon,
  Cancel as CancelIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';

import {
  FieldVisitActStatus,
  FinalVerdict,
  fieldVisitActsApi,
  ScoringFilters,
  ScoringResponse,
} from '../../services/fieldVisitActsApi';
import { api } from '../../services/api';

interface AgentOption {
  id: string;
  agent_code: string;
  user_name: string;
  is_available: boolean;
}

const VERDICT_OPTIONS: { value: '' | FinalVerdict; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'aprobado', label: 'Aprobado (≥0.80)' },
  { value: 'observado', label: 'Observado (≥0.55)' },
  { value: 'rechazado', label: 'Rechazado (<0.55)' },
];

const STATUS_OPTIONS: { value: '' | FieldVisitActStatus; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'signed_by_parties', label: 'Firmado partes' },
  { value: 'signed_by_lawyer', label: 'Firmado abogado' },
  { value: 'sealed', label: 'Sellado' },
];

const VERDICT_COLOR: Record<FinalVerdict, 'success' | 'warning' | 'error'> = {
  aprobado: 'success',
  observado: 'warning',
  rechazado: 'error',
};

const VERDICT_ICON: Record<FinalVerdict, React.ReactElement> = {
  aprobado: <CheckCircleIcon fontSize='small' />,
  observado: <WarningIcon fontSize='small' />,
  rechazado: <CancelIcon fontSize='small' />,
};

const SummaryCard: React.FC<{
  label: string;
  value: number;
  total: number;
  color: 'success' | 'warning' | 'error' | 'info';
}> = ({ label, value, total, color }) => {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <Card variant='outlined'>
      <CardContent>
        <Typography variant='caption' color='text.secondary'>
          {label}
        </Typography>
        <Typography variant='h4' fontWeight={700}>
          {value}
        </Typography>
        <Box mt={1}>
          <LinearProgress
            variant='determinate'
            value={pct}
            color={color}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant='caption' color='text.secondary'>
            {pct}% del total
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

const ScoreBar: React.FC<{ digital: number; visit: number }> = ({
  digital,
  visit,
}) => {
  const total = digital + visit;
  const totalPct = Math.round(total * 100);
  return (
    <Tooltip
      title={`Digital ${digital.toFixed(2)} + Visita ${visit.toFixed(2)} = ${total.toFixed(2)}`}
      arrow
    >
      <Box sx={{ minWidth: 140 }}>
        <Stack direction='row' spacing={0.5} sx={{ height: 12 }}>
          <Box
            sx={{
              flex: digital,
              bgcolor: 'primary.main',
              borderRadius: 0.5,
            }}
          />
          <Box
            sx={{
              flex: visit,
              bgcolor: 'success.main',
              borderRadius: 0.5,
            }}
          />
          <Box
            sx={{
              flex: Math.max(0, 1 - total),
              bgcolor: 'action.hover',
              borderRadius: 0.5,
            }}
          />
        </Stack>
        <Typography variant='caption' color='text.secondary'>
          {totalPct}%
        </Typography>
      </Box>
    </Tooltip>
  );
};

const AdminVerihomeIdScoring: React.FC = () => {
  const [verdict, setVerdict] = useState<'' | FinalVerdict>('');
  const [statusFilter, setStatusFilter] = useState<'' | FieldVisitActStatus>('');
  const [minScore, setMinScore] = useState<string>('');
  const [maxScore, setMaxScore] = useState<string>('');
  const [agentId, setAgentId] = useState<string>('');

  const agentsQuery = useQuery<AgentOption[]>({
    queryKey: ['verification-agents-list'],
    queryFn: async () => {
      const { data } = await api.get('/verification/agents/');
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      return list.map((a: Record<string, unknown>) => ({
        id: String(a.id),
        agent_code: String(a.agent_code ?? ''),
        user_name: String(a.user_name ?? ''),
        is_available: Boolean(a.is_available),
      }));
    },
    staleTime: 5 * 60_000,
  });

  const filters = useMemo<ScoringFilters>(() => {
    const out: ScoringFilters = {};
    if (verdict) out.verdict = verdict;
    if (statusFilter) out.status = statusFilter;
    const minNum = parseFloat(minScore);
    if (!Number.isNaN(minNum)) out.min_score = minNum;
    const maxNum = parseFloat(maxScore);
    if (!Number.isNaN(maxNum)) out.max_score = maxNum;
    if (agentId) out.agent_id = agentId;
    return out;
  }, [verdict, statusFilter, minScore, maxScore, agentId]);

  const query = useQuery<ScoringResponse>({
    queryKey: ['verihome-id-scoring', filters],
    queryFn: () => fieldVisitActsApi.scoring(filters),
  });

  const handleExportCsv = () => {
    if (!query.data || query.data.results.length === 0) return;
    const headers = [
      'act_number',
      'user_email',
      'user_name',
      'digital_score',
      'visit_score',
      'total_score',
      'final_verdict',
      'status',
      'agent_name',
      'days_waiting',
      'block_number',
      'created_at',
    ];
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = query.data.results.map(r =>
      [
        r.act_number,
        r.user_email,
        r.user_name,
        r.digital_score_total,
        r.visit_score_total,
        r.total_score,
        r.final_verdict,
        r.status,
        r.agent_name,
        r.days_waiting,
        r.block_number ?? '',
        r.created_at,
      ]
        .map(escape)
        .join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const today = new Date().toISOString().split('T')[0];
    link.download = `verihome_id_scoring_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3 }}>
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
            Scoring VeriHome ID
          </Typography>
        </Stack>
        <Button
          startIcon={<FileDownloadIcon />}
          variant='outlined'
          disabled={!query.data || query.data.results.length === 0}
          onClick={() => handleExportCsv()}
        >
          Exportar CSV
        </Button>
      </Stack>

      {query.data && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              label='Total candidatos'
              value={query.data.summary.total}
              total={query.data.summary.total || 1}
              color='info'
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              label='Aprobados'
              value={query.data.summary.aprobados}
              total={query.data.summary.total || 1}
              color='success'
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              label='Observados'
              value={query.data.summary.observados}
              total={query.data.summary.total || 1}
              color='warning'
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              label='Rechazados'
              value={query.data.summary.rechazados}
              total={query.data.summary.total || 1}
              color='error'
            />
          </Grid>
        </Grid>
      )}

      <Paper variant='outlined' sx={{ p: 2, mb: 2 }}>
        <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
          <FormControl size='small' sx={{ minWidth: 200 }}>
            <InputLabel id='scoring-verdict'>Veredicto</InputLabel>
            <Select
              labelId='scoring-verdict'
              label='Veredicto'
              value={verdict}
              onChange={e => setVerdict(e.target.value as '' | FinalVerdict)}
            >
              {VERDICT_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size='small' sx={{ minWidth: 200 }}>
            <InputLabel id='scoring-status'>Estado</InputLabel>
            <Select
              labelId='scoring-status'
              label='Estado'
              value={statusFilter}
              onChange={e =>
                setStatusFilter(e.target.value as '' | FieldVisitActStatus)
              }
            >
              {STATUS_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size='small'
            label='Score mínimo'
            value={minScore}
            onChange={e => setMinScore(e.target.value)}
            inputProps={{ inputMode: 'decimal' }}
            sx={{ maxWidth: 140 }}
          />
          <TextField
            size='small'
            label='Score máximo'
            value={maxScore}
            onChange={e => setMaxScore(e.target.value)}
            inputProps={{ inputMode: 'decimal' }}
            sx={{ maxWidth: 140 }}
          />
          <FormControl size='small' sx={{ minWidth: 220 }}>
            <InputLabel id='scoring-agent'>Agente</InputLabel>
            <Select
              labelId='scoring-agent'
              label='Agente'
              value={agentId}
              data-testid='scoring-agent-filter'
              onChange={e => setAgentId(String(e.target.value))}
              disabled={agentsQuery.isLoading}
            >
              <MenuItem value=''>Todos</MenuItem>
              {(agentsQuery.data ?? []).map(a => (
                <MenuItem key={a.id} value={a.id}>
                  {a.agent_code} · {a.user_name}
                  {!a.is_available && ' (inactivo)'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Paper variant='outlined'>
        {query.isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : query.isError ? (
          <Alert severity='error' sx={{ m: 2 }}>
            No se pudo cargar el scoring.
          </Alert>
        ) : !query.data || query.data.results.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant='body2' color='text.secondary'>
              No hay candidatos para los filtros aplicados.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Acta</TableCell>
                  <TableCell>Candidato</TableCell>
                  <TableCell>Score (digital + visita)</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Veredicto</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Días</TableCell>
                  <TableCell>Bloque</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.results.map(row => (
                  <TableRow
                    key={row.act_id}
                    hover
                    component={RouterLink}
                    to={`/app/admin/visitas/${row.act_id}`}
                    sx={{
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <TableCell>
                      <Typography variant='body2' fontWeight={600}>
                        {row.act_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant='body2'>
                          {row.user_name || '—'}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {row.user_email}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <ScoreBar
                        digital={parseFloat(row.digital_score_total)}
                        visit={parseFloat(row.visit_score_total)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' fontWeight={700}>
                        {parseFloat(row.total_score).toFixed(3)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        color={VERDICT_COLOR[row.final_verdict]}
                        icon={VERDICT_ICON[row.final_verdict]}
                        label={row.final_verdict}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        variant='outlined'
                        label={row.status}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip
                        title={
                          row.agent_name
                            ? `Asignado a ${row.agent_name}`
                            : 'Sin agente asignado'
                        }
                        arrow
                      >
                        <Typography
                          variant='body2'
                          color={
                            row.days_waiting > 7
                              ? 'error.main'
                              : 'text.secondary'
                          }
                          fontWeight={row.days_waiting > 7 ? 600 : 400}
                        >
                          {row.days_waiting}d
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {row.block_number !== null
                        ? `#${row.block_number}`
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default AdminVerihomeIdScoring;
