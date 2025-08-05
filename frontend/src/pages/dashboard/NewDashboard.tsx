import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  IconButton,
  Avatar,
  Chip,
  Button,
  Paper,
  LinearProgress,
  useTheme,
  alpha,
  Skeleton,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Home as HomeIcon,
  AttachMoney as MoneyIcon,
  Assignment as ContractIcon,
  People as PeopleIcon,
  Build as ServiceIcon,
  Star as StarIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  CalendarToday as CalendarIcon,
  Notifications as NotificationIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
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
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

// Registrar componentes de Chart.js
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
  Filler
);

interface DashboardStats {
  properties: {
    total: number;
    occupied: number;
    available: number;
    maintenance: number;
    trend: number;
  };
  finances: {
    monthlyIncome: number;
    monthlyExpenses: number;
    pendingPayments: number;
    profit: number;
    trend: number;
  };
  contracts: {
    active: number;
    expiringSoon: number;
    pending: number;
    total: number;
    trend: number;
  };
  users: {
    tenants: number;
    landlords: number;
    serviceProviders: number;
    newThisMonth: number;
    trend: number;
  };
  ratings: {
    average: number;
    total: number;
    distribution: Record<number, number>;
  };
  activities: Array<{
    id: string;
    type: 'payment' | 'contract' | 'property' | 'user' | 'service';
    title: string;
    description: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error' | 'info';
    user?: {
      name: string;
      avatar?: string;
    };
  }>;
}

const NewDashboard: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/dashboard/stats/?period=${selectedPeriod}`);
      setStats(response.data);
    } catch (error) {
      // console.error('Error fetching dashboard data:', error);
      // Datos de ejemplo mientras se implementa el backend
      setStats(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const getMockData = (): DashboardStats => ({
    properties: {
      total: 45,
      occupied: 38,
      available: 5,
      maintenance: 2,
      trend: 12.5,
    },
    finances: {
      monthlyIncome: 125000,
      monthlyExpenses: 35000,
      pendingPayments: 15000,
      profit: 90000,
      trend: 8.3,
    },
    contracts: {
      active: 38,
      expiringSoon: 5,
      pending: 3,
      total: 46,
      trend: -2.1,
    },
    users: {
      tenants: 120,
      landlords: 25,
      serviceProviders: 15,
      newThisMonth: 12,
      trend: 15.0,
    },
    ratings: {
      average: 4.6,
      total: 234,
      distribution: { 5: 150, 4: 60, 3: 15, 2: 6, 1: 3 },
    },
    activities: [
      {
        id: '1',
        type: 'payment',
        title: 'Pago recibido',
        description: 'Pago de renta - Apt. 301, Torre A',
        timestamp: new Date().toISOString(),
        status: 'success',
        user: { name: 'María García' },
      },
      {
        id: '2',
        type: 'contract',
        title: 'Contrato por vencer',
        description: 'Contrato vence en 15 días - Casa 45',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: 'warning',
      },
      {
        id: '3',
        type: 'property',
        title: 'Nueva propiedad',
        description: 'Apartamento agregado - Zona Norte',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        status: 'info',
        user: { name: 'Carlos López' },
      },
    ],
  });

  const getStatCard = (
    title: string,
    value: string | number,
    trend: number,
    icon: React.ReactNode,
    color: string,
    subtitle?: string
  ) => (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(
          color,
          0.05
        )} 100%)`,
        border: `1px solid ${alpha(color, 0.2)}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
        },
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="overline">
              {title}
            </Typography>
            <Typography variant="h4" component="h2" fontWeight="bold">
              {loading ? <Skeleton width={100} /> : value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: alpha(color, 0.2),
              color: color,
              width: 56,
              height: 56,
            }}
          >
            {icon}
          </Avatar>
        </Box>
        {trend !== 0 && (
          <Box display="flex" alignItems="center" mt={2}>
            {trend > 0 ? (
              <TrendingUpIcon sx={{ color: 'success.main', mr: 0.5 }} />
            ) : (
              <TrendingDownIcon sx={{ color: 'error.main', mr: 0.5 }} />
            )}
            <Typography
              variant="body2"
              color={trend > 0 ? 'success.main' : 'error.main'}
              fontWeight="medium"
            >
              {Math.abs(trend)}%
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
              vs mes anterior
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const getIncomeChart = () => {
    const labels = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return format(date, 'dd/MM');
    });

    return {
      labels,
      datasets: [
        {
          label: 'Ingresos',
          data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10000) + 3000),
          borderColor: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Gastos',
          data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 5000) + 1000),
          borderColor: theme.palette.error.main,
          backgroundColor: alpha(theme.palette.error.main, 0.1),
          fill: true,
          tension: 0.4,
        },
      ],
    };
  };

  const getOccupancyChart = () => ({
    labels: ['Ocupadas', 'Disponibles', 'Mantenimiento'],
    datasets: [
      {
        data: [
          stats?.properties.occupied || 0,
          stats?.properties.available || 0,
          stats?.properties.maintenance || 0,
        ],
        backgroundColor: [
          theme.palette.success.main,
          theme.palette.info.main,
          theme.palette.warning.main,
        ],
        borderWidth: 0,
      },
    ],
  });

  const getRatingsChart = () => ({
    labels: ['5★', '4★', '3★', '2★', '1★'],
    datasets: [
      {
        label: 'Calificaciones',
        data: stats
          ? [
              stats.ratings.distribution[5],
              stats.ratings.distribution[4],
              stats.ratings.distribution[3],
              stats.ratings.distribution[2],
              stats.ratings.distribution[1],
            ]
          : [],
        backgroundColor: theme.palette.primary.main,
        borderRadius: 8,
      },
    ],
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: alpha(theme.palette.divider, 0.5),
        },
      },
    },
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Dashboard
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Bienvenido, {user?.first_name} - {format(new Date(), "EEEE dd 'de' MMMM", { locale: es })}
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={async () => {
                try {
                  const response = await api.get('/api/v1/dashboard/export/', { 
                    responseType: 'blob',
                    params: { period: selectedPeriod }
                  });
                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `dashboard-export-${selectedPeriod}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                } catch (error) {
                  // console.error('Error exporting dashboard:', error);
                }
              }}
            >
              Exportar
            </Button>
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <RefreshIcon className={refreshing ? 'rotating' : ''} />
            </IconButton>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Period Selector */}
        <Box display="flex" gap={1}>
          {(['week', 'month', 'year'] as const).map((period) => (
            <Chip
              key={period}
              label={period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Año'}
              onClick={() => setSelectedPeriod(period)}
              color={selectedPeriod === period ? 'primary' : 'default'}
              variant={selectedPeriod === period ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} lg={3}>
          {getStatCard(
            'Propiedades',
            stats?.properties.total || 0,
            stats?.properties.trend || 0,
            <HomeIcon />,
            theme.palette.primary.main,
            `${stats?.properties.occupied || 0} ocupadas`
          )}
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          {getStatCard(
            'Ingresos del Mes',
            formatCurrency(stats?.finances.monthlyIncome || 0),
            stats?.finances.trend || 0,
            <MoneyIcon />,
            theme.palette.success.main,
            `${formatCurrency(stats?.finances.profit || 0)} ganancia`
          )}
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          {getStatCard(
            'Contratos Activos',
            stats?.contracts.active || 0,
            stats?.contracts.trend || 0,
            <ContractIcon />,
            theme.palette.info.main,
            `${stats?.contracts.expiringSoon || 0} por vencer`
          )}
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          {getStatCard(
            'Calificación',
            stats?.ratings.average?.toFixed(1) || '0.0',
            0,
            <StarIcon />,
            theme.palette.warning.main,
            `${stats?.ratings.total || 0} reseñas`
          )}
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="bold">
                Flujo de Caja
              </Typography>
              <IconButton size="small">
                <MoreVertIcon />
              </IconButton>
            </Box>
            <Box height={320}>
              {loading ? (
                <Skeleton variant="rectangular" height="100%" />
              ) : (
                <Line data={getIncomeChart()} options={chartOptions} />
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="bold">
                Ocupación
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {stats && stats.properties.total > 0
                  ? `${Math.round((stats.properties.occupied / stats.properties.total) * 100)}%`
                  : '0%'}
              </Typography>
            </Box>
            <Box height={320} display="flex" alignItems="center" justifyContent="center">
              {loading ? (
                <Skeleton variant="circular" width={250} height={250} />
              ) : (
                <Doughnut
                  data={getOccupancyChart()}
                  options={{
                    ...chartOptions,
                    cutout: '70%',
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }}
                />
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Activity and Stats Row */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" fontWeight="bold">
                Actividad Reciente
              </Typography>
              <Button size="small" endIcon={<TimelineIcon />}>
                Ver todo
              </Button>
            </Box>
            {loading ? (
              <Box>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} height={80} sx={{ mb: 2 }} />
                ))}
              </Box>
            ) : (
              <Box>
                {stats?.activities.map((activity, index) => (
                  <Box key={activity.id}>
                    <Box display="flex" alignItems="center" py={2}>
                      <Avatar
                        sx={{
                          bgcolor: alpha(
                            activity.status === 'success'
                              ? theme.palette.success.main
                              : activity.status === 'warning'
                              ? theme.palette.warning.main
                              : activity.status === 'error'
                              ? theme.palette.error.main
                              : theme.palette.info.main,
                            0.2
                          ),
                          color:
                            activity.status === 'success'
                              ? theme.palette.success.main
                              : activity.status === 'warning'
                              ? theme.palette.warning.main
                              : activity.status === 'error'
                              ? theme.palette.error.main
                              : theme.palette.info.main,
                          mr: 2,
                        }}
                      >
                        {activity.type === 'payment' ? (
                          <MoneyIcon />
                        ) : activity.type === 'contract' ? (
                          <ContractIcon />
                        ) : activity.type === 'property' ? (
                          <HomeIcon />
                        ) : (
                          <NotificationIcon />
                        )}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="body1" fontWeight="medium">
                          {activity.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {activity.description}
                        </Typography>
                        {activity.user && (
                          <Typography variant="caption" color="textSecondary">
                            {activity.user.name} • {format(new Date(activity.timestamp), 'HH:mm')}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        label={
                          activity.status === 'success'
                            ? 'Completado'
                            : activity.status === 'warning'
                            ? 'Pendiente'
                            : activity.status === 'error'
                            ? 'Urgente'
                            : 'Info'
                        }
                        size="small"
                        color={
                          activity.status === 'success'
                            ? 'success'
                            : activity.status === 'warning'
                            ? 'warning'
                            : activity.status === 'error'
                            ? 'error'
                            : 'info'
                        }
                        variant="outlined"
                      />
                    </Box>
                    {index < stats.activities.length - 1 && <Divider />}
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              Distribución de Usuarios
            </Typography>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
                    <PeopleIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Inquilinos
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {stats?.users.tenants || 0}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={`${((stats?.users.tenants || 0) / (stats?.users.tenants || 1 + stats?.users.landlords || 1 + stats?.users.serviceProviders || 1) * 100).toFixed(0)}%`}
                  size="small"
                />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: theme.palette.secondary.main, mr: 2 }}>
                    <HomeIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Arrendadores
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {stats?.users.landlords || 0}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={`${((stats?.users.landlords || 0) / (stats?.users.tenants || 1 + stats?.users.landlords || 1 + stats?.users.serviceProviders || 1) * 100).toFixed(0)}%`}
                  size="small"
                />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: theme.palette.info.main, mr: 2 }}>
                    <ServiceIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Proveedores
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {stats?.users.serviceProviders || 0}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={`${((stats?.users.serviceProviders || 0) / (stats?.users.tenants || 1 + stats?.users.landlords || 1 + stats?.users.serviceProviders || 1) * 100).toFixed(0)}%`}
                  size="small"
                />
              </Box>
            </Box>
          </Paper>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              Calificaciones
            </Typography>
            <Box height={200}>
              {loading ? (
                <Skeleton variant="rectangular" height="100%" />
              ) : (
                <Bar data={getRatingsChart()} options={chartOptions} />
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {}}>Configurar widgets</MenuItem>
        <MenuItem onClick={() => {}}>Exportar datos</MenuItem>
        <MenuItem onClick={() => {}}>Ver reportes</MenuItem>
      </Menu>

      <style>
        {`
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .rotating {
            animation: rotate 1s linear infinite;
          }
        `}
      </style>
    </Container>
  );
};

export default NewDashboard;