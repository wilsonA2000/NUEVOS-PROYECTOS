import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProperties } from '../hooks/useProperties';
import { usePayments } from '../hooks/usePayments';
import { useContracts } from '../hooks/useContracts';
import { useMessages } from '../hooks/useMessages';
import { formatCurrency } from '../utils/formatters';
import IncomeChart from '../components/dashboard/IncomeChart';
import OccupancyChart from '../components/dashboard/OccupancyChart';
import RecentActivity from '../components/dashboard/RecentActivity';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Button,
  Avatar, 
  Badge, 
  useTheme,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  useMediaQuery,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Home as HomeIcon,
  AttachMoney as AttachMoneyIcon,
  Description as DescriptionIcon,
  Mail as MailIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Build as BuildIcon,
  Assignment as AssignmentIcon,
  Payment as PaymentIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Star as StarIcon,
  TrendingUp,
  CalendarToday,
  ArrowForward,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { properties } = useProperties();
  const { transactions: payments } = usePayments();
  const { contracts } = useContracts();
  const { messages } = useMessages();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Estadísticas según el tipo de usuario
  const propertyList = Array.isArray(properties) ? properties : [];
  const totalProperties = propertyList.length;
  const occupiedProperties = propertyList.filter(p => p.status === 'rented').length;
  const paymentList = Array.isArray(payments) ? payments : [];
  const totalIncome = paymentList.reduce((sum, payment) => sum + payment.amount, 0);
  const contractList = Array.isArray(contracts) ? contracts : [];
  const activeContracts = contractList.filter(c => c.status === 'active').length;
  const messageList = Array.isArray(messages) ? messages : [];
  const unreadMessages = messageList.filter(m => !m.isRead).length;

  // Avatar con iniciales
  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : '';

  // Datos de ejemplo para el dashboard
  const stats = {
    properties: totalProperties,
    contracts: activeContracts,
    payments: payments?.length || 0,
    messages: unreadMessages,
    income: totalIncome,
    occupancy: occupiedProperties,
  };

  const recentActivities = [
    {
      id: 1,
      type: 'payment',
      title: 'Pago recibido',
      description: 'Pago de renta recibido para Propiedad #123',
      amount: 1200,
      date: '2024-01-15',
      status: 'completed',
    },
    {
      id: 2,
      type: 'contract',
      title: 'Contrato renovado',
      description: 'Contrato renovado para Propiedad #456',
      date: '2024-01-14',
      status: 'pending',
    },
    {
      id: 3,
      type: 'message',
      title: 'Nuevo mensaje',
      description: 'Mensaje de inquilino sobre mantenimiento',
      date: '2024-01-13',
      status: 'unread',
    },
  ];

  const quickActions = [
    {
      title: 'Ver Propiedades',
      icon: <HomeIcon />,
      color: theme.palette.primary.main,
      path: '/properties',
      description: 'Gestionar propiedades',
    },
    {
      title: 'Contratos',
      icon: <DescriptionIcon />,
      color: theme.palette.secondary.main,
      path: '/contracts',
      description: 'Ver contratos activos',
    },
    {
      title: 'Pagos',
      icon: <PaymentIcon />,
      color: theme.palette.success.main,
      path: '/payments',
      description: 'Gestionar pagos',
    },
    {
      title: 'Mensajes',
      icon: <MessageIcon />,
      color: theme.palette.info.main,
      path: '/messages',
      description: 'Ver mensajes',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'unread':
        return 'error';
      default:
        return 'default';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <PaymentIcon fontSize="small" />;
      case 'contract':
        return <DescriptionIcon fontSize="small" />;
      case 'message':
        return <MessageIcon fontSize="small" />;
      default:
        return <NotificationsIcon fontSize="small" />;
    }
  };

  const getWelcomeMessage = () => {
    switch (user?.role) {
      case 'owner':
        return {
          title: 'Panel de Control para Arrendadores',
          subtitle: 'Gestiona tus propiedades, contratos y cobros de manera eficiente',
          color: 'primary'
        };
      case 'tenant':
        return {
          title: 'Tu Centro de Búsqueda de Propiedades',
          subtitle: 'Encuentra tu hogar ideal y gestiona tus contratos de arrendamiento',
          color: 'secondary'
        };
      case 'service_provider':
        return {
          title: 'Tu Centro de Servicios Profesionales',
          subtitle: 'Gestiona tus solicitudes de servicio y conecta con clientes',
          color: 'info'
        };
      default:
        return {
          title: 'Bienvenido a VeriHome',
          subtitle: 'Tu plataforma inmobiliaria de confianza',
          color: 'primary'
        };
    }
  };

  const getStatsCards = () => {
    const baseStats = [
      {
        title: 'Mensajes Sin Leer',
        value: unreadMessages,
        icon: <MailIcon />,
        color: 'error',
        description: 'Mensajes pendientes'
      }
    ];

    switch (user?.role) {
      case 'owner':
        return [
          {
            title: 'Mis Propiedades',
            value: totalProperties,
            icon: <HomeIcon />,
            color: 'primary',
            description: 'Propiedades registradas'
          },
          {
            title: 'Propiedades Ocupadas',
            value: occupiedProperties,
            icon: <VisibilityIcon />,
            color: 'success',
            description: 'Con inquilinos activos'
          },
          {
            title: 'Ingresos Totales',
            value: formatCurrency(totalIncome),
            icon: <AttachMoneyIcon />,
            color: 'warning',
            description: 'Este mes'
          },
          {
            title: 'Contratos Activos',
            value: activeContracts,
            icon: <DescriptionIcon />,
            color: 'info',
            description: 'Contratos vigentes'
          },
          ...baseStats
        ];
      
      case 'tenant':
        return [
          {
            title: 'Propiedades Disponibles',
            value: totalProperties,
            icon: <HomeIcon />,
            color: 'primary',
            description: 'Para arrendar'
          },
          {
            title: 'Mis Contratos',
            value: activeContracts,
            icon: <DescriptionIcon />,
            color: 'secondary',
            description: 'Contratos activos'
          },
          {
            title: 'Pagos Realizados',
            value: payments?.length || 0,
            icon: <PaymentIcon />,
            color: 'success',
            description: 'Este mes'
          },
          {
            title: 'Servicios Contratados',
            value: 0, // TODO: Implementar contador de servicios
            icon: <BuildIcon />,
            color: 'info',
            description: 'Servicios activos'
          },
          ...baseStats
        ];
      
      case 'service_provider':
        return [
          {
            title: 'Solicitudes Recibidas',
            value: 0, // TODO: Implementar contador de solicitudes
            icon: <AssignmentIcon />,
            color: 'primary',
            description: 'Este mes'
          },
          {
            title: 'Servicios Completados',
            value: 0, // TODO: Implementar contador de servicios
            icon: <BuildIcon />,
            color: 'success',
            description: 'Este mes'
          },
          {
            title: 'Calificación Promedio',
            value: '4.8', // TODO: Implementar calificación real
            icon: <StarIcon />,
            color: 'warning',
            description: 'De 5 estrellas'
          },
          {
            title: 'Ingresos del Mes',
            value: formatCurrency(totalIncome),
            icon: <AttachMoneyIcon />,
            color: 'info',
            description: 'Ingresos totales'
          },
          ...baseStats
        ];
      
      default:
        return baseStats;
    }
  };

  const welcomeMsg = getWelcomeMessage();
  const statsCards = getStatsCards();

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.grey[50] }}>
      {/* Header Dashboard */}
      <Box sx={{ backgroundColor: 'white', boxShadow: 3, borderBottom: 1, borderColor: theme.palette.divider }}>
        <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 3 }}>
            <Box>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>
                ¡Bienvenido{user?.first_name ? `, ${user.first_name}` : ''}!
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                {welcomeMsg.title}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
                {welcomeMsg.subtitle}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Removidos los botones duplicados de notificaciones y perfil */}
              {/* Los botones principales están en el Layout superior */}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
                    <HomeIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {stats.properties}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Propiedades
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={75} 
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: theme.palette.secondary.main, mr: 2 }}>
                    <DescriptionIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {stats.contracts}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Contratos Activos
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={60} 
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: theme.palette.success.main, mr: 2 }}>
                    <AttachMoneyIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      ${stats.income.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ingresos Mensuales
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={85} 
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: theme.palette.info.main, mr: 2 }}>
                    <TrendingUp />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {stats.occupancy}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ocupación
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.occupancy} 
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
              Acciones Rápidas
            </Typography>
          </Grid>
          {quickActions.map((action, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                sx={{ 
                  height: '100%', 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8],
                  }
                }}
                onClick={() => navigate(`/app${action.path}`)}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: action.color, 
                      width: 56, 
                      height: 56, 
                      mx: 'auto', 
                      mb: 2 
                    }}
                  >
                    {action.icon}
                  </Avatar>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    {action.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {action.description}
                  </Typography>
                  <Button
                    variant="outlined"
                    endIcon={<ArrowForward />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/app${action.path}`);
                    }}
                  >
                    Ir
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Recent Activity */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Actividad Reciente
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {recentActivities.map((activity) => (
                    <Box
                      key={activity.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        p: 2,
                        mb: 2,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <Avatar sx={{ bgcolor: 'grey.200', mr: 2 }}>
                        {getActivityIcon(activity.type)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {activity.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {activity.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(activity.date).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Chip
                        label={activity.status}
                        color={getStatusColor(activity.status) as any}
                        size="small"
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Próximos Eventos
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CalendarToday sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2">
                      Vencimiento de contrato - 15 días
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PaymentIcon sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="body2">
                      Pago de renta - 5 días
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BuildIcon sx={{ mr: 1, color: 'warning.main' }} />
                    <Typography variant="body2">
                      Mantenimiento programado - 10 días
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Dashboard; 