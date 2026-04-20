import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
  Stack,
  IconButton,
  Tooltip,
  SelectChangeEvent,
} from '@mui/material';
import {
  ConfirmationNumber as TicketIcon,
  FolderOpen as OpenIcon,
  HourglassEmpty as InProgressIcon,
  CheckCircle as ResolvedIcon,
  Cancel as ClosedIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Send as SendIcon,
  AssignmentInd as AssignIcon,
  Lock as CloseIcon,
  TaskAlt as ResolveIcon,
} from '@mui/icons-material';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

interface TicketResponse {
  id: number;
  responder_name: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  description: string;
  department: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
  responses: TicketResponse[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const priorityColor: Record<
  string,
  'default' | 'error' | 'warning' | 'info' | 'success'
> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'error',
};

const priorityLabel: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

const statusColor: Record<
  string,
  'default' | 'error' | 'warning' | 'info' | 'success'
> = {
  open: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'default',
};

const statusLabel: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En Progreso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

const departmentLabel: Record<string, string> = {
  support: 'Soporte',
  billing: 'Facturación',
  legal: 'Legal',
  technical: 'Técnico',
  general: 'General',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function authHeaders() {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'info' | 'warning' | 'success' | 'error';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <Card
    sx={{
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 },
    }}
  >
    <CardContent>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <Box>
          <Typography variant='body2' color='text.secondary' gutterBottom>
            {title}
          </Typography>
          <Typography variant='h3' fontWeight='bold' color={`${color}.main`}>
            {value}
          </Typography>
        </Box>
        <Avatar sx={{ bgcolor: `${color}.light`, width: 56, height: 56 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminTicketsDashboard: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Detail dialog
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Respond form
  const [responseMessage, setResponseMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  // Assign form
  const [assignUserId, setAssignUserId] = useState('');

  // ─── Data Fetching ───────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filterDept) params['department'] = filterDept;
      if (filterStatus) params['status'] = filterStatus;
      if (filterPriority) params['priority'] = filterPriority;

      const [ticketsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/core/tickets/`, {
          headers: authHeaders(),
          params,
        }),
        axios.get(`${API_BASE}/core/tickets/stats/`, {
          headers: authHeaders(),
        }),
      ]);

      const ticketData = Array.isArray(ticketsRes.data)
        ? ticketsRes.data
        : ticketsRes.data.results ?? [];
      setTickets(ticketData);
      setStats(statsRes.data);
    } catch {
      setError(
        'No se pudieron cargar los tickets. Verifique su conexión o permisos.',
      );
    } finally {
      setLoading(false);
    }
  }, [filterDept, filterStatus, filterPriority]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const clearFeedback = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const handleRespond = async () => {
    if (!selectedTicket || !responseMessage.trim()) return;
    clearFeedback();
    setActionLoading(true);
    try {
      await axios.post(
        `${API_BASE}/core/tickets/${selectedTicket.id}/respond/`,
        { message: responseMessage, is_internal: isInternal },
        { headers: authHeaders() },
      );
      setActionSuccess('Respuesta enviada correctamente.');
      setResponseMessage('');
      setIsInternal(false);
      // Refresh ticket detail
      const res = await axios.get(
        `${API_BASE}/core/tickets/${selectedTicket.id}/`,
        {
          headers: authHeaders(),
        },
      );
      setSelectedTicket(res.data);
      fetchData();
    } catch {
      setActionError('No se pudo enviar la respuesta.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedTicket || !assignUserId.trim()) return;
    clearFeedback();
    setActionLoading(true);
    try {
      await axios.post(
        `${API_BASE}/core/tickets/${selectedTicket.id}/assign/`,
        { assigned_to: assignUserId },
        { headers: authHeaders() },
      );
      setActionSuccess('Ticket asignado correctamente.');
      setAssignUserId('');
      fetchData();
      setDialogOpen(false);
    } catch {
      setActionError('No se pudo asignar el ticket.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusAction = async (action: 'resolve' | 'close') => {
    if (!selectedTicket) return;
    clearFeedback();
    setActionLoading(true);
    try {
      await axios.post(
        `${API_BASE}/core/tickets/${selectedTicket.id}/${action}/`,
        {},
        { headers: authHeaders() },
      );
      setActionSuccess(
        action === 'resolve' ? 'Ticket resuelto.' : 'Ticket cerrado.',
      );
      fetchData();
      setDialogOpen(false);
    } catch {
      setActionError(
        `No se pudo ${action === 'resolve' ? 'resolver' : 'cerrar'} el ticket.`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setResponseMessage('');
    setIsInternal(false);
    setAssignUserId('');
    clearFeedback();
    setDialogOpen(true);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant='h4' fontWeight='bold' color='text.primary'>
            Tickets de Soporte
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            Gestione y resuelva las solicitudes de los usuarios
          </Typography>
        </Box>
        <Tooltip title='Actualizar'>
          <IconButton onClick={fetchData} color='primary' disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Error Banner */}
      {error && (
        <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Row */}
      {loading && !stats ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3} lg={2.4}>
              <StatCard
                title='Total'
                value={stats?.total ?? 0}
                icon={<TicketIcon />}
                color='primary'
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3} lg={2.4}>
              <StatCard
                title='Abiertos'
                value={stats?.open ?? 0}
                icon={<OpenIcon />}
                color='info'
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3} lg={2.4}>
              <StatCard
                title='En Progreso'
                value={stats?.in_progress ?? 0}
                icon={<InProgressIcon />}
                color='warning'
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3} lg={2.4}>
              <StatCard
                title='Resueltos'
                value={stats?.resolved ?? 0}
                icon={<ResolvedIcon />}
                color='success'
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3} lg={2.4}>
              <StatCard
                title='Cerrados'
                value={stats?.closed ?? 0}
                icon={<ClosedIcon />}
                color='error'
              />
            </Grid>
          </Grid>

          {/* Filter Bar */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              <FilterIcon color='action' />
              <Typography variant='body2' color='text.secondary' sx={{ mr: 1 }}>
                Filtros:
              </Typography>

              <FormControl size='small' sx={{ minWidth: 160 }}>
                <InputLabel>Departamento</InputLabel>
                <Select
                  value={filterDept}
                  label='Departamento'
                  onChange={(e: SelectChangeEvent) =>
                    setFilterDept(e.target.value)
                  }
                >
                  <MenuItem value=''>Todos</MenuItem>
                  <MenuItem value='support'>Soporte</MenuItem>
                  <MenuItem value='billing'>Facturación</MenuItem>
                  <MenuItem value='legal'>Legal</MenuItem>
                  <MenuItem value='technical'>Técnico</MenuItem>
                  <MenuItem value='general'>General</MenuItem>
                </Select>
              </FormControl>

              <FormControl size='small' sx={{ minWidth: 150 }}>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filterStatus}
                  label='Estado'
                  onChange={(e: SelectChangeEvent) =>
                    setFilterStatus(e.target.value)
                  }
                >
                  <MenuItem value=''>Todos</MenuItem>
                  <MenuItem value='open'>Abierto</MenuItem>
                  <MenuItem value='in_progress'>En Progreso</MenuItem>
                  <MenuItem value='resolved'>Resuelto</MenuItem>
                  <MenuItem value='closed'>Cerrado</MenuItem>
                </Select>
              </FormControl>

              <FormControl size='small' sx={{ minWidth: 140 }}>
                <InputLabel>Prioridad</InputLabel>
                <Select
                  value={filterPriority}
                  label='Prioridad'
                  onChange={(e: SelectChangeEvent) =>
                    setFilterPriority(e.target.value)
                  }
                >
                  <MenuItem value=''>Todas</MenuItem>
                  <MenuItem value='low'>Baja</MenuItem>
                  <MenuItem value='medium'>Media</MenuItem>
                  <MenuItem value='high'>Alta</MenuItem>
                  <MenuItem value='urgent'>Urgente</MenuItem>
                </Select>
              </FormControl>

              {(filterDept || filterStatus || filterPriority) && (
                <Button
                  size='small'
                  variant='outlined'
                  onClick={() => {
                    setFilterDept('');
                    setFilterStatus('');
                    setFilterPriority('');
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </Box>
          </Paper>

          {/* Table */}
          <TableContainer component={Paper}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : tickets.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <TicketIcon
                  sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}
                />
                <Typography variant='h6' color='text.secondary'>
                  No hay tickets con los filtros seleccionados
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>
                      <Typography variant='subtitle2'>#</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='subtitle2'>Asunto</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='subtitle2'>Departamento</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='subtitle2'>Prioridad</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='subtitle2'>Estado</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='subtitle2'>Asignado a</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='subtitle2'>Creado</Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tickets.map(ticket => (
                    <TableRow
                      key={ticket.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => openDetail(ticket)}
                    >
                      <TableCell>
                        <Typography
                          variant='body2'
                          fontWeight='medium'
                          color='primary.main'
                        >
                          {ticket.ticket_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant='body2'
                          sx={{
                            maxWidth: 260,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {ticket.subject}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {departmentLabel[ticket.department] ??
                            ticket.department}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            priorityLabel[ticket.priority] ?? ticket.priority
                          }
                          color={priorityColor[ticket.priority]}
                          size='small'
                          variant='outlined'
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusLabel[ticket.status] ?? ticket.status}
                          color={statusColor[ticket.status]}
                          size='small'
                        />
                      </TableCell>
                      <TableCell>
                        {ticket.assigned_to_name ? (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <PersonIcon fontSize='small' color='action' />
                            <Typography variant='body2'>
                              {ticket.assigned_to_name}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant='body2' color='text.disabled'>
                            Sin asignar
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>
                          {formatDate(ticket.created_at)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth='md'
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        {selectedTicket && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <Box>
                  <Typography variant='h6' fontWeight='bold'>
                    {selectedTicket.ticket_number} — {selectedTicket.subject}
                  </Typography>
                  <Stack direction='row' spacing={1} sx={{ mt: 0.5 }}>
                    <Chip
                      label={statusLabel[selectedTicket.status]}
                      color={statusColor[selectedTicket.status]}
                      size='small'
                    />
                    <Chip
                      label={priorityLabel[selectedTicket.priority]}
                      color={priorityColor[selectedTicket.priority]}
                      size='small'
                      variant='outlined'
                    />
                    <Chip
                      label={
                        departmentLabel[selectedTicket.department] ??
                        selectedTicket.department
                      }
                      size='small'
                      variant='outlined'
                    />
                  </Stack>
                </Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ mt: 0.5 }}
                >
                  {formatDate(selectedTicket.created_at)}
                </Typography>
              </Box>
            </DialogTitle>

            <DialogContent
              dividers
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              {/* Feedback */}
              {actionError && (
                <Alert severity='error' onClose={clearFeedback}>
                  {actionError}
                </Alert>
              )}
              {actionSuccess && (
                <Alert severity='success' onClose={clearFeedback}>
                  {actionSuccess}
                </Alert>
              )}

              {/* Description */}
              <Box>
                <Typography variant='subtitle2' gutterBottom>
                  Descripcion
                </Typography>
                <Paper
                  variant='outlined'
                  sx={{ p: 2, bgcolor: 'action.hover' }}
                >
                  <Typography variant='body2'>
                    {selectedTicket.description}
                  </Typography>
                </Paper>
              </Box>

              {/* Assign */}
              <Box>
                <Typography variant='subtitle2' gutterBottom>
                  Asignar Ticket
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size='small'
                    fullWidth
                    placeholder='ID del usuario a asignar'
                    value={assignUserId}
                    onChange={e => setAssignUserId(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <AssignIcon
                          fontSize='small'
                          sx={{ mr: 1, color: 'action.active' }}
                        />
                      ),
                    }}
                  />
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={handleAssign}
                    disabled={actionLoading || !assignUserId.trim()}
                    startIcon={<AssignIcon />}
                  >
                    Asignar
                  </Button>
                </Box>
                {selectedTicket.assigned_to_name && (
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mt: 0.5, display: 'block' }}
                  >
                    Actualmente asignado a: {selectedTicket.assigned_to_name}
                  </Typography>
                )}
              </Box>

              <Divider />

              {/* Responses */}
              <Box>
                <Typography variant='subtitle2' gutterBottom>
                  Historial de Respuestas (
                  {selectedTicket.responses?.length ?? 0})
                </Typography>
                {!selectedTicket.responses?.length ? (
                  <Typography variant='body2' color='text.secondary'>
                    Sin respuestas aun.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {selectedTicket.responses.map(r => (
                      <Paper
                        key={r.id}
                        variant='outlined'
                        sx={{
                          p: 1.5,
                          borderLeft: 4,
                          borderColor: r.is_internal
                            ? 'warning.main'
                            : 'primary.main',
                          bgcolor: r.is_internal
                            ? 'warning.lighter'
                            : 'background.paper',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            mb: 0.5,
                          }}
                        >
                          <Typography variant='caption' fontWeight='bold'>
                            {r.responder_name}
                            {r.is_internal && (
                              <Chip
                                label='Interno'
                                size='small'
                                color='warning'
                                sx={{ ml: 1, height: 16, fontSize: 10 }}
                              />
                            )}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {formatDate(r.created_at)}
                          </Typography>
                        </Box>
                        <Typography variant='body2'>{r.message}</Typography>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>

              <Divider />

              {/* Respond Form */}
              {selectedTicket.status !== 'closed' && (
                <Box>
                  <Typography variant='subtitle2' gutterBottom>
                    Agregar Respuesta
                  </Typography>
                  <TextField
                    multiline
                    rows={3}
                    fullWidth
                    placeholder='Escriba la respuesta al usuario...'
                    value={responseMessage}
                    onChange={e => setResponseMessage(e.target.value)}
                    size='small'
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size='small'
                        checked={isInternal}
                        onChange={e => setIsInternal(e.target.checked)}
                      />
                    }
                    label={
                      <Typography variant='body2'>
                        Nota interna (no visible para el usuario)
                      </Typography>
                    }
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
              <Button onClick={() => setDialogOpen(false)} color='inherit'>
                Cerrar
              </Button>
              <Box sx={{ flex: 1 }} />

              {selectedTicket.status !== 'closed' && (
                <>
                  {selectedTicket.status !== 'resolved' && (
                    <Button
                      variant='outlined'
                      color='success'
                      startIcon={<ResolveIcon />}
                      onClick={() => handleStatusAction('resolve')}
                      disabled={actionLoading}
                    >
                      Resolver
                    </Button>
                  )}
                  <Button
                    variant='outlined'
                    color='error'
                    startIcon={<CloseIcon />}
                    onClick={() => handleStatusAction('close')}
                    disabled={actionLoading}
                  >
                    Cerrar ticket
                  </Button>
                  <Button
                    variant='contained'
                    color='primary'
                    startIcon={
                      actionLoading ? (
                        <CircularProgress size={16} color='inherit' />
                      ) : (
                        <SendIcon />
                      )
                    }
                    onClick={handleRespond}
                    disabled={actionLoading || !responseMessage.trim()}
                  >
                    Enviar respuesta
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default AdminTicketsDashboard;
