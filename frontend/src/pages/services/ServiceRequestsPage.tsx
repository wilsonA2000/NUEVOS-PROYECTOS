import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Avatar,
  useTheme,
  Badge,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { requestService } from '../../services/requestService';

interface ServiceRequest {
  id: number | string;
  client: string;
  service: string;
  description: string;
  status: string;
  date: string;
  time: string;
  address: string;
  price: string;
  urgent: boolean;
}

const ServiceRequestsPage: React.FC = () => {
  const theme = useTheme();
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | number | null>(
    null,
  );
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await requestService.getServiceRequests();
      const data = response as any;
      const requests = Array.isArray(data) ? data : data?.results || [];
      setServiceRequests(
        requests.map((r: any) => ({
          id: r.id,
          client: r.requester_name || r.client || 'Cliente',
          service: r.service_type || r.service || 'Servicio',
          description: r.description || '',
          status: r.status || 'pending',
          date: r.scheduled_date || r.created_at?.split('T')[0] || '',
          time: r.scheduled_time || '',
          address: r.address || '',
          price: r.price ? `$${r.price}` : '$0',
          urgent: r.is_urgent || r.priority === 'high' || false,
        })),
      );
    } catch {
      setServiceRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'accepted':
      case 'in_progress':
        return 'info';
      case 'completed':
        return 'success';
      case 'cancelled':
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'accepted':
      case 'in_progress':
        return 'En Progreso';
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      case 'rejected':
        return 'Rechazado';
      default:
        return status;
    }
  };

  const updateRequestStatus = async (
    requestId: number | string,
    action: 'accept' | 'reject' | 'complete',
    successMsg: string,
  ) => {
    try {
      setActionLoading(requestId);
      await requestService.performRequestAction(String(requestId), { action });
      setSnackbar({ open: true, message: successMsg, severity: 'success' });
      await fetchRequests();
    } catch {
      setSnackbar({
        open: true,
        message: 'Error al procesar la solicitud',
        severity: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptRequest = (requestId: number | string) => {
    updateRequestStatus(requestId, 'accept', 'Solicitud aceptada exitosamente');
  };

  const handleRejectRequest = (requestId: number | string) => {
    updateRequestStatus(requestId, 'reject', 'Solicitud rechazada');
  };

  const handleCompleteRequest = (requestId: number | string) => {
    updateRequestStatus(
      requestId,
      'complete',
      'Solicitud completada exitosamente',
    );
  };

  if (loading && serviceRequests.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant='h4' sx={{ fontWeight: 'bold', mb: 1 }}>
          Solicitudes de Servicio
        </Typography>
        <Typography
          variant='body1'
          sx={{ color: theme.palette.text.secondary }}
        >
          Gestiona las solicitudes de servicio de tus clientes
        </Typography>
      </Box>

      {/* Estadísticas rápidas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '12px', boxShadow: 3 }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Badge
                badgeContent={
                  serviceRequests.filter(r => r.status === 'pending').length
                }
                color='warning'
              >
                <AssignmentIcon
                  sx={{ fontSize: 40, color: 'warning.main', mb: 1 }}
                />
              </Badge>
              <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
                Pendientes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '12px', boxShadow: 3 }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <ScheduleIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
                {serviceRequests.filter(r => r.status === 'accepted').length}
              </Typography>
              <Typography
                variant='body2'
                sx={{ color: theme.palette.text.secondary }}
              >
                En Progreso
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '12px', boxShadow: 3 }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <CheckCircleIcon
                sx={{ fontSize: 40, color: 'success.main', mb: 1 }}
              />
              <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
                {serviceRequests.filter(r => r.status === 'completed').length}
              </Typography>
              <Typography
                variant='body2'
                sx={{ color: theme.palette.text.secondary }}
              >
                Completados
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '12px', boxShadow: 3 }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold', color: 'primary.main' }}
              >
                $
                {serviceRequests.reduce(
                  (sum, r) => sum + parseInt(r.price.replace('$', '')),
                  0,
                )}
              </Typography>
              <Typography
                variant='body2'
                sx={{ color: theme.palette.text.secondary }}
              >
                Ingresos del Mes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Lista de solicitudes */}
      <Grid container spacing={3}>
        {serviceRequests.map(request => (
          <Grid item xs={12} md={6} lg={4} key={request.id}>
            <Card
              sx={{
                borderRadius: '12px',
                boxShadow: 3,
                border: request.urgent
                  ? `2px solid ${theme.palette.error.main}`
                  : 'none',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: 'primary.light',
                      color: 'primary.main',
                      mr: 2,
                    }}
                  >
                    <PersonIcon />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
                      {request.client}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      {request.service}
                    </Typography>
                  </Box>
                  {request.urgent && (
                    <Chip label='Urgente' color='error' size='small' />
                  )}
                </Box>

                <Typography
                  variant='body2'
                  sx={{ mb: 2, color: theme.palette.text.secondary }}
                >
                  {request.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={getStatusLabel(request.status)}
                    color={getStatusColor(request.status) as any}
                    size='small'
                    sx={{ mr: 1 }}
                  />
                  <Typography
                    variant='body2'
                    sx={{ mt: 1, color: theme.palette.text.secondary }}
                  >
                    📅 {request.date} - {request.time}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    📍 {request.address}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 'bold', color: 'primary.main' }}
                  >
                    {request.price}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  {request.status === 'pending' && (
                    <>
                      <Button
                        variant='contained'
                        color='success'
                        size='small'
                        sx={{ flex: 1 }}
                        disabled={actionLoading === request.id}
                        onClick={() => handleAcceptRequest(request.id)}
                      >
                        {actionLoading === request.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          'Aceptar'
                        )}
                      </Button>
                      <Button
                        variant='outlined'
                        color='error'
                        size='small'
                        sx={{ flex: 1 }}
                        disabled={actionLoading === request.id}
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        Rechazar
                      </Button>
                    </>
                  )}
                  {(request.status === 'accepted' ||
                    request.status === 'in_progress') && (
                    <Button
                      variant='contained'
                      color='success'
                      fullWidth
                      disabled={actionLoading === request.id}
                      onClick={() => handleCompleteRequest(request.id)}
                    >
                      {actionLoading === request.id ? (
                        <CircularProgress size={20} />
                      ) : (
                        'Marcar como Completado'
                      )}
                    </Button>
                  )}
                  {request.status === 'completed' && (
                    <Button variant='outlined' fullWidth disabled>
                      Completado
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {serviceRequests.length === 0 && !loading && (
        <Alert severity='info' sx={{ mt: 3 }}>
          No hay solicitudes de servicio por el momento.
        </Alert>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ServiceRequestsPage;
