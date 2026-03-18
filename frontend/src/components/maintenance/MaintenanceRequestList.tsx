/**
 * MaintenanceRequestList - Lista de solicitudes de mantenimiento del arrendatario
 * Muestra solicitudes con filtros por estado, detalles expandibles y acciones
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Collapse,
  IconButton,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  useTheme,
  useMediaQuery,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Warning as EmergencyIcon,
  Build as RepairIcon,
  EventRepeat as RoutineIcon,
  Shield as PreventiveIcon,
  TrendingUp as ImprovementIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Cancel as CancelIcon,
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  Room as LocationIcon,
  Person as PersonIcon,
  CheckCircle as CompletedIcon,
  HourglassEmpty as PendingIcon,
  PlayCircle as InProgressIcon,
  Inbox as EmptyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { requestService, MaintenanceRequest, RequestActionData } from '../../services/requestService';

type TabStatus = 'all' | 'pending' | 'in_progress' | 'completed';

const TAB_CONFIG: { value: TabStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Todas', icon: <RepairIcon fontSize="small" /> },
  { value: 'pending', label: 'Pendientes', icon: <PendingIcon fontSize="small" /> },
  { value: 'in_progress', label: 'En Progreso', icon: <InProgressIcon fontSize="small" /> },
  { value: 'completed', label: 'Completadas', icon: <CompletedIcon fontSize="small" /> },
];

const MAINTENANCE_TYPE_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  emergency: { label: 'Emergencia', icon: <EmergencyIcon />, color: '#d32f2f' },
  routine: { label: 'Rutinario', icon: <RoutineIcon />, color: '#1976d2' },
  preventive: { label: 'Preventivo', icon: <PreventiveIcon />, color: '#388e3c' },
  repair: { label: 'Reparaci\u00f3n', icon: <RepairIcon />, color: '#f57c00' },
  improvement: { label: 'Mejora', icon: <ImprovementIcon />, color: '#7b1fa2' },
};

const STATUS_STEPS = [
  { key: 'pending', label: 'Pendiente' },
  { key: 'in_progress', label: 'En Progreso' },
  { key: 'completed', label: 'Completada' },
];

interface MaintenanceRequestListProps {
  refreshTrigger?: number;
}

const MaintenanceRequestList: React.FC<MaintenanceRequestListProps> = ({ refreshTrigger }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; requestId: string | null }>({
    open: false,
    requestId: null,
  });
  const [cancelling, setCancelling] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await requestService.getMaintenanceRequests();
      const data = response?.data?.results || response?.data || [];
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError('Error al cargar las solicitudes de mantenimiento');
      console.error('Error fetching maintenance requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests, refreshTrigger]);

  const filteredRequests = useMemo(() => {
    if (activeTab === 'all') return requests;
    if (activeTab === 'completed') {
      return requests.filter(r => ['completed', 'rejected', 'cancelled'].includes(r.status));
    }
    return requests.filter(r => r.status === activeTab);
  }, [requests, activeTab]);

  const tabCounts = useMemo(() => ({
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    in_progress: requests.filter(r => r.status === 'in_progress').length,
    completed: requests.filter(r => ['completed', 'rejected', 'cancelled'].includes(r.status)).length,
  }), [requests]);

  const getActiveStep = (status: string): number => {
    switch (status) {
      case 'pending': return 0;
      case 'in_progress': return 1;
      case 'completed': return 2;
      case 'rejected':
      case 'cancelled': return -1;
      default: return 0;
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleCancelRequest = async () => {
    if (!cancelDialog.requestId) return;
    setCancelling(true);
    try {
      const actionData: RequestActionData = { action: 'cancel', message: 'Cancelada por el arrendatario' };
      await requestService.performRequestAction(cancelDialog.requestId, actionData);
      setCancelDialog({ open: false, requestId: null });
      fetchRequests();
    } catch (err: any) {
      setError('Error al cancelar la solicitud');
    } finally {
      setCancelling(false);
    }
  };

  const getTypeInfo = (type: string) => {
    return MAINTENANCE_TYPE_MAP[type] || { label: type, icon: <RepairIcon />, color: '#757575' };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={6}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          Cargando solicitudes...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs de filtro */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        {TAB_CONFIG.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? 'contained' : 'outlined'}
            size={isMobile ? 'small' : 'medium'}
            startIcon={tab.icon}
            onClick={() => setActiveTab(tab.value)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              minWidth: isMobile ? 'auto' : 120,
            }}
          >
            {tab.label} ({tabCounts[tab.value]})
          </Button>
        ))}

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title="Actualizar">
          <IconButton onClick={fetchRequests} size="small" color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Lista de solicitudes */}
      {filteredRequests.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredRequests.map((request) => {
            const typeInfo = getTypeInfo(request.maintenance_type);
            const isExpanded = expandedId === request.id;
            const activeStep = getActiveStep(request.status);

            return (
              <Card
                key={request.id}
                elevation={isExpanded ? 4 : 1}
                sx={{
                  borderLeft: 4,
                  borderColor: typeInfo.color,
                  transition: 'all 0.2s ease',
                  '&:hover': { elevation: 3 },
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 3 }, '&:last-child': { pb: { xs: 2, md: 3 } } }}>
                  {/* Encabezado de la card */}
                  <Box
                    display="flex"
                    alignItems="flex-start"
                    justifyContent="space-between"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleToggleExpand(request.id)}
                  >
                    <Box display="flex" alignItems="flex-start" gap={2} sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          bgcolor: `${typeInfo.color}15`,
                          borderRadius: 1.5,
                          p: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: typeInfo.color,
                          flexShrink: 0,
                        }}
                      >
                        {typeInfo.icon}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={600} noWrap>
                          {request.title || request.issue_description?.substring(0, 60) || 'Solicitud de mantenimiento'}
                        </Typography>
                        <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
                          <Chip
                            label={typeInfo.label}
                            size="small"
                            sx={{ bgcolor: `${typeInfo.color}15`, color: typeInfo.color, fontWeight: 600 }}
                          />
                          <Chip
                            label={requestService.getStatusText(request.status)}
                            size="small"
                            color={requestService.getStatusColor(request.status)}
                          />
                          <Chip
                            label={requestService.getPriorityText(request.priority)}
                            size="small"
                            color={requestService.getPriorityColor(request.priority)}
                            variant="outlined"
                          />
                        </Box>
                        {!isMobile && (
                          <Box display="flex" gap={2} mt={1} alignItems="center">
                            {request.affected_area && (
                              <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                                <LocationIcon fontSize="inherit" /> {request.affected_area}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                              <CalendarIcon fontSize="inherit" /> {requestService.formatDate(request.created_at)}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>

                    <IconButton size="small">
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>

                  {/* Contenido expandible */}
                  <Collapse in={isExpanded}>
                    <Divider sx={{ my: 2 }} />

                    {/* Progreso */}
                    {activeStep >= 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Stepper
                          activeStep={activeStep}
                          alternativeLabel={!isMobile}
                          orientation={isMobile ? 'vertical' : 'horizontal'}
                          sx={{ '& .MuiStepLabel-label': { fontSize: '0.75rem' } }}
                        >
                          {STATUS_STEPS.map((step) => (
                            <Step key={step.key}>
                              <StepLabel>{step.label}</StepLabel>
                            </Step>
                          ))}
                        </Stepper>
                      </Box>
                    )}

                    {(request.status === 'cancelled' || request.status === 'rejected') && (
                      <Alert severity={request.status === 'cancelled' ? 'warning' : 'error'} sx={{ mb: 2 }}>
                        Esta solicitud fue {request.status === 'cancelled' ? 'cancelada' : 'rechazada'}.
                        {request.response_message && ` Motivo: ${request.response_message}`}
                      </Alert>
                    )}

                    {/* Detalles */}
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Descripci\u00f3n del problema
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {request.issue_description || request.description || 'Sin descripci\u00f3n'}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Box display="flex" flexDirection="column" gap={1}>
                          {request.property_title && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                Propiedad
                              </Typography>
                              <Typography variant="body2">{request.property_title}</Typography>
                            </Box>
                          )}
                          {request.affected_area && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                \u00c1rea afectada
                              </Typography>
                              <Typography variant="body2">{request.affected_area}</Typography>
                            </Box>
                          )}
                          {request.estimated_duration_hours && (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <TimeIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                Duraci\u00f3n estimada: {request.estimated_duration_hours}h
                              </Typography>
                            </Box>
                          )}
                          {request.requires_tenant_presence && (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <PersonIcon fontSize="small" color="action" />
                              <Typography variant="body2">Requiere presencia del arrendatario</Typography>
                            </Box>
                          )}
                        </Box>
                      </Grid>

                      {request.access_instructions && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Instrucciones de acceso
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {request.access_instructions}
                          </Typography>
                        </Grid>
                      )}

                      {/* Fechas */}
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Box display="flex" gap={3} flexWrap="wrap">
                          <Typography variant="caption" color="text.secondary">
                            Creada: {requestService.formatDateTime(request.created_at)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Actualizada: {requestService.formatDateTime(request.updated_at)}
                          </Typography>
                          {request.completed_at && (
                            <Typography variant="caption" color="text.secondary">
                              Completada: {requestService.formatDateTime(request.completed_at)}
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Acciones */}
                    {request.status === 'pending' && (
                      <Box display="flex" justifyContent="flex-end" mt={2}>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<CancelIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCancelDialog({ open: true, requestId: request.id });
                          }}
                        >
                          Cancelar Solicitud
                        </Button>
                      </Box>
                    )}
                  </Collapse>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Di\u00e1logo de confirmaci\u00f3n de cancelaci\u00f3n */}
      <Dialog
        open={cancelDialog.open}
        onClose={() => !cancelling && setCancelDialog({ open: false, requestId: null })}
      >
        <DialogTitle>Cancelar Solicitud</DialogTitle>
        <DialogContent>
          <Typography>
            \u00bfEst\u00e1s seguro de que deseas cancelar esta solicitud de mantenimiento?
            Esta acci\u00f3n no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCancelDialog({ open: false, requestId: null })}
            disabled={cancelling}
          >
            No, mantener
          </Button>
          <Button
            onClick={handleCancelRequest}
            color="error"
            variant="contained"
            disabled={cancelling}
            startIcon={cancelling ? <CircularProgress size={16} /> : <CancelIcon />}
          >
            {cancelling ? 'Cancelando...' : 'S\u00ed, cancelar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Componente de estado vac\u00edo
const EmptyState: React.FC<{ tab: TabStatus }> = ({ tab }) => {
  const messages: Record<TabStatus, { title: string; description: string }> = {
    all: {
      title: 'No hay solicitudes de mantenimiento',
      description: 'Cuando crees una solicitud de mantenimiento, aparecer\u00e1 aqu\u00ed. Usa el bot\u00f3n "Nueva Solicitud" para comenzar.',
    },
    pending: {
      title: 'No hay solicitudes pendientes',
      description: 'Las solicitudes que env\u00edes y est\u00e9n esperando atenci\u00f3n aparecer\u00e1n en esta secci\u00f3n.',
    },
    in_progress: {
      title: 'No hay solicitudes en progreso',
      description: 'Las solicitudes que est\u00e9n siendo atendidas por el equipo de mantenimiento aparecer\u00e1n aqu\u00ed.',
    },
    completed: {
      title: 'No hay solicitudes completadas',
      description: 'El historial de solicitudes finalizadas, rechazadas o canceladas aparecer\u00e1 en esta secci\u00f3n.',
    },
  };

  const msg = messages[tab];

  return (
    <Alert
      severity="info"
      icon={<EmptyIcon />}
      sx={{ textAlign: 'center', py: 4 }}
    >
      <Typography variant="h6" gutterBottom>
        {msg.title}
      </Typography>
      <Typography variant="body2">
        {msg.description}
      </Typography>
    </Alert>
  );
};

export default MaintenanceRequestList;
