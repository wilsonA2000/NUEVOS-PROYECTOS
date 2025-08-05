import React from 'react';
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
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
// import { useUser } from '../../hooks/useUser';
// MOCK TEMPORAL para evitar error de compilación
const useUser = () => ({ user: null });

const ServiceRequestsPage: React.FC = () => {
  const { user } = useUser();
  const theme = useTheme();

  // Datos de ejemplo para solicitudes de servicio
  const serviceRequests = [
    {
      id: 1,
      client: 'Ana Rodríguez',
      service: 'Limpieza Profesional',
      description: 'Necesito limpieza de mi apartamento de 2 habitaciones',
      status: 'pending',
      date: '2024-01-15',
      time: '10:00 AM',
      address: 'Calle Principal 123, Ciudad',
      price: '$60',
      urgent: true,
    },
    {
      id: 2,
      client: 'Carlos Méndez',
      service: 'Mantenimiento General',
      description: 'Reparación de grifo en cocina y cambio de bombilla',
      status: 'accepted',
      date: '2024-01-16',
      time: '2:00 PM',
      address: 'Avenida Central 456, Ciudad',
      price: '$80',
      urgent: false,
    },
    {
      id: 3,
      client: 'María López',
      service: 'Plomería',
      description: 'Fuga de agua en baño principal',
      status: 'completed',
      date: '2024-01-14',
      time: '9:00 AM',
      address: 'Calle Secundaria 789, Ciudad',
      price: '$120',
      urgent: true,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'accepted':
        return 'info';
      case 'completed':
        return 'success';
      case 'cancelled':
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
        return 'Aceptado';
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const handleAcceptRequest = (requestId: number) => {

// TODO: Implementar lógica para aceptar solicitud
  };

  const handleRejectRequest = (requestId: number) => {

// TODO: Implementar lógica para rechazar solicitud
  };

  const handleCompleteRequest = (requestId: number) => {

// TODO: Implementar lógica para completar solicitud
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          Solicitudes de Servicio
        </Typography>
        <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
          Gestiona las solicitudes de servicio de tus clientes
        </Typography>
      </Box>

      {/* Estadísticas rápidas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '12px', boxShadow: 3 }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Badge badgeContent={serviceRequests.filter(r => r.status === 'pending').length} color="warning">
                <AssignmentIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              </Badge>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Pendientes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '12px', boxShadow: 3 }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <ScheduleIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {serviceRequests.filter(r => r.status === 'accepted').length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                En Progreso
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '12px', boxShadow: 3 }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {serviceRequests.filter(r => r.status === 'completed').length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Completados
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '12px', boxShadow: 3 }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                ${serviceRequests.reduce((sum, r) => sum + parseInt(r.price.replace('$', '')), 0)}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Ingresos del Mes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Lista de solicitudes */}
      <Grid container spacing={3}>
        {serviceRequests.map((request) => (
          <Grid item xs={12} md={6} lg={4} key={request.id}>
            <Card sx={{ 
              borderRadius: '12px', 
              boxShadow: 3,
              border: request.urgent ? `2px solid ${theme.palette.error.main}` : 'none',
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', mr: 2 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {request.client}
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                      {request.service}
                    </Typography>
                  </Box>
                  {request.urgent && (
                    <Chip
                      label="Urgente"
                      color="error"
                      size="small"
                    />
                  )}
                </Box>

                <Typography variant="body2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
                  {request.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={getStatusLabel(request.status)}
                    color={getStatusColor(request.status) as any}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Typography variant="body2" sx={{ mt: 1, color: theme.palette.text.secondary }}>
                    📅 {request.date} - {request.time}
                  </Typography>
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                    📍 {request.address}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {request.price}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  {request.status === 'pending' && (
                    <>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        sx={{ flex: 1 }}
                        onClick={() => handleAcceptRequest(request.id)}
                      >
                        Aceptar
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        sx={{ flex: 1 }}
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        Rechazar
                      </Button>
                    </>
                  )}
                  {request.status === 'accepted' && (
                    <Button
                      variant="contained"
                      color="success"
                      fullWidth
                      onClick={() => handleCompleteRequest(request.id)}
                    >
                      Marcar como Completado
                    </Button>
                  )}
                  {request.status === 'completed' && (
                    <Button
                      variant="outlined"
                      fullWidth
                      disabled
                    >
                      Completado
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ServiceRequestsPage; 