/**
 * E5 · Cola de visitas del agente.
 *
 * Muestra las visitas asignadas al usuario logueado (que debe tener
 * perfil `VerificationAgent`). Permite iniciar, completar y abrir el
 * acta cuando existe.
 */

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Done as DoneIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';

import {
  VerificationVisit,
  VerificationVisitStatus,
  agentVisitsApi,
} from '../../services/agentVisitsApi';

const STATUS_OPTIONS: {
  value: '' | VerificationVisitStatus;
  label: string;
}[] = [
  { value: '', label: 'Todas' },
  { value: 'scheduled', label: 'Programadas' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'completed', label: 'Completadas' },
  { value: 'cancelled', label: 'Canceladas' },
];

const STATUS_COLOR: Record<
  VerificationVisitStatus,
  'default' | 'info' | 'success' | 'warning' | 'error'
> = {
  pending: 'default',
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'error',
  rescheduled: 'warning',
  no_show: 'error',
};

const AgentVisitsQueue: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<
    '' | VerificationVisitStatus
  >('scheduled');
  const [completeDialog, setCompleteDialog] = useState<{
    open: boolean;
    visit: VerificationVisit | null;
    notes: string;
    passed: boolean;
  }>({ open: false, visit: null, notes: '', passed: true });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    severity: 'success' | 'error';
    message: string;
  }>({ open: false, severity: 'success', message: '' });

  const visitsQuery = useQuery<VerificationVisit[]>({
    queryKey: ['agent-visits', statusFilter],
    queryFn: () =>
      agentVisitsApi.list(statusFilter ? { status: statusFilter } : undefined),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => agentVisitsApi.start(id),
    onSuccess: () => {
      setSnackbar({
        open: true,
        severity: 'success',
        message: 'Visita iniciada.',
      });
      queryClient.invalidateQueries({ queryKey: ['agent-visits'] });
    },
    onError: () =>
      setSnackbar({
        open: true,
        severity: 'error',
        message: 'No se pudo iniciar la visita.',
      }),
  });

  const completeMutation = useMutation({
    mutationFn: (args: { id: string; passed: boolean; notes: string }) =>
      agentVisitsApi.complete(args.id, {
        passed: args.passed,
        notes: args.notes,
      }),
    onSuccess: () => {
      setSnackbar({
        open: true,
        severity: 'success',
        message: 'Visita completada.',
      });
      setCompleteDialog({ open: false, visit: null, notes: '', passed: true });
      queryClient.invalidateQueries({ queryKey: ['agent-visits'] });
    },
    onError: () =>
      setSnackbar({
        open: true,
        severity: 'error',
        message: 'No se pudo completar la visita.',
      }),
  });

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
          <AssignmentTurnedInIcon color='primary' />
          <Typography variant='h5' fontWeight={600}>
            Mis visitas asignadas
          </Typography>
        </Stack>
        <FormControl size='small' sx={{ minWidth: 200 }}>
          <InputLabel id='visit-status-filter'>Estado</InputLabel>
          <Select
            labelId='visit-status-filter'
            label='Estado'
            value={statusFilter}
            onChange={e =>
              setStatusFilter(e.target.value as '' | VerificationVisitStatus)
            }
          >
            {STATUS_OPTIONS.map(o => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {visitsQuery.isLoading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      ) : visitsQuery.isError ? (
        <Alert severity='error'>
          No se pudieron cargar tus visitas. Verificá que tu cuenta tenga
          perfil de agente VeriHome.
        </Alert>
      ) : !visitsQuery.data || visitsQuery.data.length === 0 ? (
        <Paper variant='outlined' sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant='body2' color='text.secondary'>
            No hay visitas para los filtros seleccionados.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {visitsQuery.data.map(visit => (
            <Grid item xs={12} md={6} lg={4} key={visit.id}>
              <Card variant='outlined'>
                <CardContent>
                  <Stack
                    direction='row'
                    justifyContent='space-between'
                    alignItems='center'
                    sx={{ mb: 1 }}
                  >
                    <Typography variant='subtitle1' fontWeight={600}>
                      {visit.visit_number}
                    </Typography>
                    <Chip
                      size='small'
                      color={STATUS_COLOR[visit.status]}
                      label={visit.status_display}
                    />
                  </Stack>
                  <Typography variant='body2' fontWeight={600}>
                    {visit.target_user_name || visit.target_user_email}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {visit.target_user_email}
                  </Typography>
                  <Box mt={1}>
                    <Typography variant='caption' color='text.secondary'>
                      Tipo
                    </Typography>
                    <Typography variant='body2'>
                      {visit.visit_type_display}
                    </Typography>
                  </Box>
                  <Box mt={1}>
                    <Typography variant='caption' color='text.secondary'>
                      Dirección
                    </Typography>
                    <Typography variant='body2'>
                      {visit.visit_address}, {visit.visit_city}
                    </Typography>
                  </Box>
                  <Box mt={1}>
                    <Typography variant='caption' color='text.secondary'>
                      Programada
                    </Typography>
                    <Typography variant='body2'>
                      {visit.scheduled_date || '—'}{' '}
                      {visit.scheduled_time || ''}
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {visit.status === 'scheduled' && (
                    <Button
                      size='small'
                      startIcon={<PlayArrowIcon />}
                      variant='contained'
                      onClick={() => startMutation.mutate(visit.id)}
                      disabled={startMutation.isPending}
                    >
                      Iniciar
                    </Button>
                  )}
                  {visit.status === 'in_progress' && (
                    <>
                      <Button
                        size='small'
                        startIcon={<DoneIcon />}
                        variant='contained'
                        color='success'
                        onClick={() =>
                          setCompleteDialog({
                            open: true,
                            visit,
                            notes: '',
                            passed: true,
                          })
                        }
                      >
                        Completar
                      </Button>
                      <Button
                        size='small'
                        startIcon={<CancelIcon />}
                        color='error'
                        onClick={() =>
                          setCompleteDialog({
                            open: true,
                            visit,
                            notes: '',
                            passed: false,
                          })
                        }
                      >
                        Marcar fallida
                      </Button>
                    </>
                  )}
                  {visit.has_report && (
                    <Button
                      size='small'
                      component={RouterLink}
                      to={`/app/admin/visitas`}
                    >
                      Ver acta
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={completeDialog.open}
        onClose={() =>
          setCompleteDialog(s => ({ ...s, open: false }))
        }
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          {completeDialog.passed
            ? 'Completar visita'
            : 'Marcar visita como fallida'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Confirmá los hallazgos de la visita {completeDialog.visit?.visit_number}.
            Una vez completada el agente no podrá modificar este registro.
          </DialogContentText>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label='Notas del agente'
            value={completeDialog.notes}
            onChange={e =>
              setCompleteDialog(s => ({ ...s, notes: e.target.value }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setCompleteDialog(s => ({ ...s, open: false }))
            }
          >
            Cancelar
          </Button>
          <Button
            variant='contained'
            color={completeDialog.passed ? 'success' : 'error'}
            disabled={completeMutation.isPending}
            onClick={() => {
              if (!completeDialog.visit) return;
              completeMutation.mutate({
                id: completeDialog.visit.id,
                passed: completeDialog.passed,
                notes: completeDialog.notes,
              });
            }}
          >
            {completeMutation.isPending
              ? 'Guardando…'
              : completeDialog.passed
                ? 'Confirmar éxito'
                : 'Confirmar fallida'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AgentVisitsQueue;
