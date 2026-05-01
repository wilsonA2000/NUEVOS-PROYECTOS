/**
 * C11 · AdminFieldVisitActs
 *
 * Lista de actas VeriHome ID. Filtro por estado, integridad de cadena
 * (`/verify-chain/`) y enlace al detalle.
 */

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
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
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Fingerprint as FingerprintIcon,
  Insights as InsightsIcon,
  Link as LinkIcon,
  VerifiedUser as VerifiedIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';

import {
  ChainVerification,
  FieldVisitAct,
  FieldVisitActStatus,
  fieldVisitActsApi,
} from '../../services/fieldVisitActsApi';

const STATUS_OPTIONS: { value: '' | FieldVisitActStatus; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'signed_by_parties', label: 'Firmada por verificado y agente' },
  { value: 'signed_by_lawyer', label: 'Firmada por abogado' },
  { value: 'sealed', label: 'Sellada en cadena' },
];

const STATUS_COLOR: Record<
  FieldVisitActStatus,
  'default' | 'info' | 'warning' | 'success'
> = {
  draft: 'default',
  signed_by_parties: 'info',
  signed_by_lawyer: 'warning',
  sealed: 'success',
};

const AdminFieldVisitActs: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'' | FieldVisitActStatus>('');

  const params = useMemo(
    () => (statusFilter ? { status: statusFilter } : undefined),
    [statusFilter],
  );

  const actsQuery = useQuery<FieldVisitAct[]>({
    queryKey: ['field-visit-acts', statusFilter],
    queryFn: () => fieldVisitActsApi.list(params),
  });

  const chainQuery = useQuery<ChainVerification>({
    queryKey: ['field-visit-acts-chain'],
    queryFn: () => fieldVisitActsApi.verifyChain(),
    refetchOnWindowFocus: false,
  });

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        alignItems='center'
        justifyContent='space-between'
        sx={{ mb: 2 }}
      >
        <Stack direction='row' spacing={1.5} alignItems='center'>
          <FingerprintIcon color='primary' />
          <Typography variant='h5' fontWeight={600}>
            Actas VeriHome ID
          </Typography>
        </Stack>

        <Stack direction='row' spacing={1.5} alignItems='center'>
          <Button
            startIcon={<InsightsIcon />}
            variant='outlined'
            component={RouterLink}
            to='/app/admin/verihome-id/scoring'
          >
            Scoring
          </Button>
          {chainQuery.isSuccess && (
            <Chip
              icon={<LinkIcon />}
              color={chainQuery.data.ok ? 'success' : 'error'}
              label={
                chainQuery.data.ok
                  ? `Cadena íntegra (${chainQuery.data.total} bloque${
                      chainQuery.data.total === 1 ? '' : 's'
                    })`
                  : `Cadena rota: ${chainQuery.data.errors.length} error(es)`
              }
            />
          )}
        </Stack>
      </Stack>

      {chainQuery.isSuccess && !chainQuery.data.ok && (
        <Alert severity='error' sx={{ mb: 2 }}>
          Detectamos inconsistencias en la cadena de actas. Revisá las primeras
          {' '}
          {chainQuery.data.errors.length} entradas con código:
          {' '}
          {chainQuery.data.errors
            .slice(0, 5)
            .map(e => `${e.act_number}:${e.code}`)
            .join(', ')}
          .
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }} variant='outlined'>
        <Stack direction='row' spacing={2} alignItems='center'>
          <FormControl size='small' sx={{ minWidth: 280 }}>
            <InputLabel id='act-status-filter'>Estado</InputLabel>
            <Select
              labelId='act-status-filter'
              label='Estado'
              value={statusFilter}
              onChange={e =>
                setStatusFilter(e.target.value as '' | FieldVisitActStatus)
              }
            >
              {STATUS_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant='outlined'
            onClick={() => chainQuery.refetch()}
            disabled={chainQuery.isFetching}
          >
            Re-verificar cadena
          </Button>
        </Stack>
      </Paper>

      <Paper variant='outlined'>
        {actsQuery.isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : actsQuery.isError ? (
          <Alert severity='error' sx={{ m: 2 }}>
            No se pudo cargar la lista de actas.
          </Alert>
        ) : !actsQuery.data || actsQuery.data.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant='body2' color='text.secondary'>
              No hay actas registradas para los filtros seleccionados.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Acta</TableCell>
                  <TableCell>Verificado</TableCell>
                  <TableCell>Visita</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Bloque</TableCell>
                  <TableCell>Hash final</TableCell>
                  <TableCell>Creado</TableCell>
                  <TableCell align='right'>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {actsQuery.data.map(act => (
                  <TableRow key={act.id} hover>
                    <TableCell>
                      <Typography variant='body2' fontWeight={600}>
                        {act.act_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant='body2'>
                          {act.target_user_name || '—'}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {act.target_user_email}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{act.visit_number || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        color={STATUS_COLOR[act.status]}
                        label={act.status_display}
                        icon={
                          act.status === 'sealed' ? <VerifiedIcon /> : undefined
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {act.block_number !== null ? `#${act.block_number}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={act.final_hash || ''}>
                        <Typography variant='caption' fontFamily='monospace'>
                          {act.final_hash
                            ? `${act.final_hash.slice(0, 12)}…`
                            : '—'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {new Date(act.created_at).toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell align='right'>
                      <Button
                        size='small'
                        component={RouterLink}
                        to={`/app/admin/visitas/${act.id}`}
                      >
                        Ver
                      </Button>
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

export default AdminFieldVisitActs;
