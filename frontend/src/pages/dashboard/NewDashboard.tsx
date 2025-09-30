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
  useMediaQuery,
  alpha,
  Skeleton,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slide,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  ExpandMore as ExpandMoreIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon,
  SwipeUp as SwipeUpIcon,
  Description as DescriptionIcon,
  CalendarToday as CalendarTodayIcon,
  Build as BuildIcon,
  PendingActions as PendingActionsIcon,
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});

  // Función para obtener el dashboard específico del rol
  const getRoleDashboard = () => {
    switch(user?.user_type) {
      case 'tenant':
        return getTenantDashboard();
      case 'service_provider':
        return getServiceProviderDashboard();
      case 'landlord':
      default:
        return getLandlordDashboard();
    }
  };

  // Dashboard específico para arrendatarios
  const getTenantDashboard = () => (
    <>
      {/* Métricas del arrendatario */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          {getStatCard(
            'Propiedades Arrendadas',
            0, // TODO: Obtener propiedades del usuario
            0,
            <HomeIcon />,
            theme.palette.primary.main,
            'Propiedades que tienes en arriendo actualmente'
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {getStatCard(
            'Contratos Activos',
            0, // TODO: Obtener contratos activos
            0,
            <DescriptionIcon />,
            theme.palette.info.main,
            'Contratos firmados y en vigor'
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {getStatCard(
            'Pagos del Mes',
            formatCurrency(0), // TODO: Obtener pagos pendientes
            0,
            <MoneyIcon />,
            theme.palette.warning.main,
            'Pagos de arriendo del mes actual'
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {getStatCard(
            'Días hasta Vencimiento',
            '-- días', // TODO: Calcular días hasta próximo pago
            0,
            <CalendarTodayIcon />,
            theme.palette.error.main,
            'Tiempo restante para el próximo pago'
          )}
        </Grid>
      </Grid>

      {/* Mensaje informativo para arrendatarios */}
      <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom color="primary">
          Bienvenido a tu Panel de Arrendatario
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Aquí puedes ver tus propiedades arrendadas, contratos activos y gestionar tus pagos de arriendo.
        </Typography>
      </Paper>

      {/* Lista de solicitudes recientes */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Mis Solicitudes Recientes
        </Typography>
        <Typography variant="body2" color="textSecondary">
          No tienes solicitudes recientes. Explora propiedades disponibles para enviar solicitudes de interés.
        </Typography>
      </Paper>
    </>
  );

  // Dashboard específico para proveedores de servicios  
  const getServiceProviderDashboard = () => (
    <>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          {getStatCard(
            'Servicios Activos',
            0,
            0,
            <BuildIcon />,
            theme.palette.primary.main,
            'Servicios que estás prestando'
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {getStatCard(
            'Solicitudes Pendientes',
            0,
            0,
            <PendingActionsIcon />,
            theme.palette.warning.main,
            'Nuevas solicitudes de servicio'
          )}
        </Grid>
      </Grid>
    </>
  );

  // Dashboard original para arrendadores (mantener funcionalidad existente)
  const getLandlordDashboard = () => {
    // Para arrendadores, mantener el dashboard original con todas las métricas
    // El contenido se renderiza después en la condición {user?.user_type === 'landlord'}
    return null;
  };

  const [selectedChart, setSelectedChart] = useState<string | null>(null);

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

  const handleChartExpand = (chartId: string) => {
    setSelectedChart(chartId);
  };

  const handleChartClose = () => {
    setSelectedChart(null);
  };

  const toggleChartExpansion = (chartId: string) => {
    setExpandedCharts(prev => ({
      ...prev,
      [chartId]: !prev[chartId]
    }));
  };

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
        cursor: isMobile ? 'pointer' : 'default',
        '&:hover': {
          transform: isMobile ? 'scale(1.02)' : 'translateY(-4px)',
          boxShadow: theme.shadows[8],
        },
        '&:active': {
          transform: isMobile ? 'scale(0.98)' : 'none',
        },
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              color="textSecondary" 
              gutterBottom 
              variant="overline"
              sx={{ 
                fontSize: { xs: '0.65rem', sm: '0.75rem' },
                fontWeight: 600,
                letterSpacing: 1.2
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h4" 
              component="h2" 
              fontWeight="bold"
              sx={{
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {loading ? <Skeleton width={100} /> : value}
            </Typography>
            {subtitle && (
              <Typography 
                variant="body2" 
                color="textSecondary" 
                sx={{ 
                  mt: 1,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: alpha(color, 0.2),
              color: color,
              width: { xs: 40, sm: 48, md: 56 },
              height: { xs: 40, sm: 48, md: 56 },
              flexShrink: 0,
              ml: 1
            }}
          >
            {icon}
          </Avatar>
        </Box>
        {trend !== 0 && (
          <Box display="flex" alignItems="center" mt={2}>
            {trend > 0 ? (
              <TrendingUpIcon sx={{ color: 'success.main', mr: 0.5, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
            ) : (
              <TrendingDownIcon sx={{ color: 'error.main', mr: 0.5, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
            )}
            <Typography
              variant="body2"
              color={trend > 0 ? 'success.main' : 'error.main'}
              fontWeight="medium"
              sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
            >
              {Math.abs(trend)}%
            </Typography>
            <Typography 
              variant="body2" 
              color="textSecondary" 
              sx={{ 
                ml: 1,
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                display: { xs: 'none', sm: 'block' }
              }}
            >
              vs mes anterior
            </Typography>
            <Typography 
              variant="body2" 
              color="textSecondary" 
              sx={{ 
                ml: 1,
                fontSize: '0.7rem',
                display: { xs: 'block', sm: 'none' }
              }}
            >
              vs anterior
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
          stats?.properties?.occupied || 0,
          stats?.properties?.available || 0,
          stats?.properties?.maintenance || 0,
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
        data: stats && stats.ratings && stats.ratings.distribution
          ? [
              stats.ratings.distribution[5] || 0,
              stats.ratings.distribution[4] || 0,
              stats.ratings.distribution[3] || 0,
              stats.ratings.distribution[2] || 0,
              stats.ratings.distribution[1] || 0,
            ]
          : [0, 0, 0, 0, 0],
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

      {/* Dashboard específico por rol */}
      {getRoleDashboard()}
      
      {/* Stats Cards originales - solo para landlords */}
      {user?.user_type === 'landlord' && (
        <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} lg={3}>
          {getStatCard(
            'Propiedades',
            stats?.properties?.total || 0,
            stats?.properties?.trend || 0,
            <HomeIcon />,
            theme.palette.primary.main,
            `${stats?.properties?.occupied || 0} ocupadas`
          )}
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          {getStatCard(
            isMobile ? 'Ingresos' : 'Ingresos del Mes',
            formatCurrency(stats?.finances.monthlyIncome || 0),
            stats?.finances.trend || 0,
            <MoneyIcon />,
            theme.palette.success.main,
            `${formatCurrency(stats?.finances.profit || 0)} ganancia`
          )}
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          {getStatCard(
            isMobile ? 'Contratos' : 'Contratos Activos',
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
      )}

      {/* Charts Row - Mobile Responsive */}
      {isMobile ? (
        /* Mobile: Accordion Layout */
        <Box mb={{ xs: 3, md: 4 }}>
          <Accordion 
            expanded={expandedCharts.income || false}
            onChange={() => toggleChartExpansion('income')}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                backgroundColor: alpha(theme.palette.primary.main, 0.04),
                '&.Mui-expanded': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08)
                }
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ width: '100%', mr: 2 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                  💰 Flujo de Caja
                </Typography>
                <IconButton 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChartExpand('income');
                  }}
                  sx={{ p: 0.5 }}
                >
                  <FullscreenIcon fontSize="small" />
                </IconButton>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Box sx={{ p: 2, height: 280 }}>
                {loading ? (
                  <Skeleton variant="rectangular" height="100%" />
                ) : (
                  <Line data={getIncomeChart()} options={{
                    ...chartOptions,
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      ...chartOptions.scales,
                      x: {
                        ...chartOptions.scales.x,
                        ticks: {
                          maxRotation: 45,
                          minRotation: 0,
                          fontSize: 10
                        }
                      }
                    }
                  }} />
                )}
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion 
            expanded={expandedCharts.occupancy || false}
            onChange={() => toggleChartExpansion('occupancy')}
            sx={{ mt: 1 }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                backgroundColor: alpha(theme.palette.success.main, 0.04),
                '&.Mui-expanded': {
                  backgroundColor: alpha(theme.palette.success.main, 0.08)
                }
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ width: '100%', mr: 2 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                  🏠 Ocupación
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h6" fontWeight="bold" color="primary" sx={{ fontSize: '1.1rem' }}>
                    {stats && stats.properties && stats.properties.total > 0
                      ? `${Math.round((stats.properties.occupied / stats.properties.total) * 100)}%`
                      : '0%'}
                  </Typography>
                  <IconButton 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChartExpand('occupancy');
                    }}
                    sx={{ p: 0.5 }}
                  >
                    <FullscreenIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Box sx={{ p: 2, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {loading ? (
                  <Skeleton variant="circular" width={200} height={200} />
                ) : (
                  <Doughnut
                    data={getOccupancyChart()}
                    options={{
                      ...chartOptions,
                      cutout: '65%',
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          position: 'bottom',
                          labels: {
                            boxWidth: 12,
                            padding: 15,
                            font: {
                              size: 11
                            }
                          }
                        },
                      },
                    }}
                  />
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
      ) : (
        // Desktop: Grid Layout
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  Flujo de Caja
                </Typography>
                <IconButton size="small" onClick={() => handleChartExpand('income')}>
                  <FullscreenIcon />
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
          {user?.userType !== 'service_provider' && (
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 3, height: 400 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight="bold">
                    Ocupación
                  </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h4" fontWeight="bold" color="primary">
                    {stats && stats.properties && stats.properties.total > 0
                      ? `${Math.round((stats.properties.occupied / stats.properties.total) * 100)}%`
                      : '0%'}
                  </Typography>
                  <IconButton size="small" onClick={() => handleChartExpand('occupancy')}>
                    <FullscreenIcon />
                  </IconButton>
                </Box>
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
          )}
        </Grid>
      )}

      {/* Activity and Stats Row - Mobile Responsive */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ flexDirection: { xs: 'column-reverse', lg: 'row' } }}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Box 
              display="flex" 
              flexDirection={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between" 
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              mb={3}
              gap={{ xs: 1, sm: 0 }}
            >
              <Typography 
                variant="h6" 
                fontWeight="bold"
                sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
              >
                📈 Actividad Reciente
              </Typography>
              <Button 
                size="small" 
                endIcon={!isSmallMobile ? <TimelineIcon /> : undefined}
                sx={{ 
                  alignSelf: { xs: 'flex-end', sm: 'auto' },
                  minWidth: { xs: 'auto', sm: 'unset' }
                }}
              >
                {isSmallMobile ? <TimelineIcon /> : 'Ver todo'}
              </Button>
            </Box>
            
            {loading ? (
              <Box>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} height={isMobile ? 60 : 80} sx={{ mb: 2 }} />
                ))}
              </Box>
            ) : (
              <Box>
                {stats?.activities.map((activity, index) => (
                  <Box key={activity.id}>
                    <Box 
                      display="flex" 
                      alignItems="flex-start" 
                      py={{ xs: 1.5, sm: 2 }}
                      gap={{ xs: 1.5, sm: 2 }}
                    >
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
                          width: { xs: 32, sm: 40 },
                          height: { xs: 32, sm: 40 },
                          flexShrink: 0
                        }}
                      >
                        {activity.type === 'payment' ? (
                          <MoneyIcon fontSize={isMobile ? 'small' : 'medium'} />
                        ) : activity.type === 'contract' ? (
                          <ContractIcon fontSize={isMobile ? 'small' : 'medium'} />
                        ) : activity.type === 'property' ? (
                          <HomeIcon fontSize={isMobile ? 'small' : 'medium'} />
                        ) : (
                          <NotificationIcon fontSize={isMobile ? 'small' : 'medium'} />
                        )}
                      </Avatar>
                      
                      <Box flex={1} minWidth={0}>
                        <Typography 
                          variant="body1" 
                          fontWeight="medium"
                          sx={{
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {activity.title}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="textSecondary"
                          sx={{
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            whiteSpace: 'normal'
                          }}
                        >
                          {activity.description}
                        </Typography>
                        {activity.user && (
                          <Typography 
                            variant="caption" 
                            color="textSecondary"
                            sx={{ 
                              fontSize: { xs: '0.65rem', sm: '0.75rem' },
                              display: { xs: 'none', sm: 'block' }
                            }}
                          >
                            {activity.user.name} • {format(new Date(activity.timestamp), 'HH:mm')}
                          </Typography>
                        )}
                      </Box>
                      
                      <Box sx={{ flexShrink: 0 }}>
                        <Chip
                          label={
                            activity.status === 'success'
                              ? (isMobile ? '✓' : 'Completado')
                              : activity.status === 'warning'
                              ? (isMobile ? '⏳' : 'Pendiente')
                              : activity.status === 'error'
                              ? (isMobile ? '⚠️' : 'Urgente')
                              : (isMobile ? 'ℹ️' : 'Info')
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
                          sx={{
                            minWidth: { xs: 28, sm: 'auto' },
                            '& .MuiChip-label': {
                              px: { xs: 0.5, sm: 1 },
                              fontSize: { xs: '0.65rem', sm: '0.75rem' }
                            }
                          }}
                        />
                        {activity.user && isMobile && (
                          <Typography 
                            variant="caption" 
                            color="textSecondary"
                            sx={{ 
                              fontSize: '0.6rem',
                              display: 'block',
                              textAlign: 'right',
                              mt: 0.5
                            }}
                          >
                            {format(new Date(activity.timestamp), 'HH:mm')}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {index < stats.activities.length - 1 && <Divider />}
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 } }}>
            <Typography 
              variant="h6" 
              fontWeight="bold" 
              mb={3}
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              👥 Distribución de Usuarios
            </Typography>
            <Box>
              <Box 
                display="flex" 
                justifyContent="space-between" 
                alignItems="center" 
                mb={2}
                sx={{ 
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 1, sm: 0 },
                  alignItems: { xs: 'stretch', sm: 'center' }
                }}
              >
                <Box display="flex" alignItems="center" sx={{ flex: 1 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: theme.palette.primary.main, 
                      mr: { xs: 1.5, sm: 2 },
                      width: { xs: 32, sm: 40 },
                      height: { xs: 32, sm: 40 }
                    }}
                  >
                    <PeopleIcon fontSize={isMobile ? 'small' : 'medium'} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="body2" 
                      color="textSecondary"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      Inquilinos
                    </Typography>
                    <Typography 
                      variant="h6" 
                      fontWeight="bold"
                      sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                    >
                      {stats?.users?.tenants || 0}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={`${((stats?.users?.tenants || 0) / ((stats?.users?.tenants || 0) + (stats?.users?.landlords || 0) + (stats?.users?.serviceProviders || 0) || 1) * 100).toFixed(0)}%`}
                  size="small"
                  sx={{ 
                    alignSelf: { xs: 'flex-end', sm: 'center' },
                    fontSize: { xs: '0.65rem', sm: '0.75rem' }
                  }}
                />
              </Box>
              
              <Box 
                display="flex" 
                justifyContent="space-between" 
                alignItems="center" 
                mb={2}
                sx={{ 
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 1, sm: 0 },
                  alignItems: { xs: 'stretch', sm: 'center' }
                }}
              >
                <Box display="flex" alignItems="center" sx={{ flex: 1 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: theme.palette.secondary.main, 
                      mr: { xs: 1.5, sm: 2 },
                      width: { xs: 32, sm: 40 },
                      height: { xs: 32, sm: 40 }
                    }}
                  >
                    <HomeIcon fontSize={isMobile ? 'small' : 'medium'} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="body2" 
                      color="textSecondary"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      Arrendadores
                    </Typography>
                    <Typography 
                      variant="h6" 
                      fontWeight="bold"
                      sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                    >
                      {stats?.users?.landlords || 0}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={`${((stats?.users?.landlords || 0) / ((stats?.users?.tenants || 0) + (stats?.users?.landlords || 0) + (stats?.users?.serviceProviders || 0) || 1) * 100).toFixed(0)}%`}
                  size="small"
                  sx={{ 
                    alignSelf: { xs: 'flex-end', sm: 'center' },
                    fontSize: { xs: '0.65rem', sm: '0.75rem' }
                  }}
                />
              </Box>
              
              <Box 
                display="flex" 
                justifyContent="space-between" 
                alignItems="center"
                sx={{ 
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 1, sm: 0 },
                  alignItems: { xs: 'stretch', sm: 'center' }
                }}
              >
                <Box display="flex" alignItems="center" sx={{ flex: 1 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: theme.palette.info.main, 
                      mr: { xs: 1.5, sm: 2 },
                      width: { xs: 32, sm: 40 },
                      height: { xs: 32, sm: 40 }
                    }}
                  >
                    <ServiceIcon fontSize={isMobile ? 'small' : 'medium'} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="body2" 
                      color="textSecondary"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      Proveedores
                    </Typography>
                    <Typography 
                      variant="h6" 
                      fontWeight="bold"
                      sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                    >
                      {stats?.users?.serviceProviders || 0}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={`${((stats?.users?.serviceProviders || 0) / ((stats?.users?.tenants || 0) + (stats?.users?.landlords || 0) + (stats?.users?.serviceProviders || 0) || 1) * 100).toFixed(0)}%`}
                  size="small"
                  sx={{ 
                    alignSelf: { xs: 'flex-end', sm: 'center' },
                    fontSize: { xs: '0.65rem', sm: '0.75rem' }
                  }}
                />
              </Box>
            </Box>
          </Paper>
          
          {/* Ratings Chart - Mobile Optimized */}
          {isMobile ? (
            <Accordion 
              expanded={expandedCharts.ratings || false}
              onChange={() => toggleChartExpansion('ratings')}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  backgroundColor: alpha(theme.palette.warning.main, 0.04),
                  '&.Mui-expanded': {
                    backgroundColor: alpha(theme.palette.warning.main, 0.08)
                  }
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ width: '100%', mr: 2 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                    ⭐ Calificaciones
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="warning.main" sx={{ fontSize: '1.1rem' }}>
                    {stats?.ratings.average?.toFixed(1) || '0.0'}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <Box sx={{ p: 2, height: 200 }}>
                  {loading ? (
                    <Skeleton variant="rectangular" height="100%" />
                  ) : (
                    <Bar 
                      data={getRatingsChart()} 
                      options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          legend: {
                            display: false
                          }
                        },
                        scales: {
                          ...chartOptions.scales,
                          x: {
                            ...chartOptions.scales.x,
                            ticks: {
                              fontSize: 10
                            }
                          }
                        }
                      }} 
                    />
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          ) : (
            <Paper sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold">
                  Calificaciones
                </Typography>
                <IconButton size="small" onClick={() => handleChartExpand('ratings')}>
                  <FullscreenIcon />
                </IconButton>
              </Box>
              <Box height={200}>
                {loading ? (
                  <Skeleton variant="rectangular" height="100%" />
                ) : (
                  <Bar data={getRatingsChart()} options={chartOptions} />
                )}
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Fullscreen Chart Dialog */}
      <Dialog
        open={selectedChart !== null}
        onClose={handleChartClose}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        TransitionComponent={Slide}
        TransitionProps={{
          direction: 'up',
        }}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            minHeight: { xs: '100vh', md: '70vh' }
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="h6" fontWeight="bold">
            {selectedChart === 'income' ? '💰 Flujo de Caja Detallado' :
             selectedChart === 'occupancy' ? '🏠 Análisis de Ocupación' :
             selectedChart === 'ratings' ? '⭐ Distribución de Calificaciones' :
             'Gráfico Detallado'}
          </Typography>
          <IconButton 
            onClick={handleChartClose} 
            size="small"
            sx={{ 
              bgcolor: alpha(theme.palette.error.main, 0.1),
              '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ height: { xs: 'calc(100vh - 200px)', md: '500px' } }}>
            {selectedChart === 'income' && (
              <Line 
                data={getIncomeChart()} 
                options={{
                  ...chartOptions,
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      display: true,
                      position: 'top'
                    },
                    title: {
                      display: true,
                      text: 'Flujo de Caja - Últimos 30 días'
                    }
                  }
                }} 
              />
            )}
            {selectedChart === 'occupancy' && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: 'center',
                gap: 3,
                height: '100%'
              }}>
                <Box sx={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  minHeight: { xs: 300, md: '100%' }
                }}>
                  <Doughnut
                    data={getOccupancyChart()}
                    options={{
                      ...chartOptions,
                      cutout: '60%',
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          position: 'right',
                          labels: {
                            usePointStyle: true,
                            padding: 20
                          }
                        },
                        title: {
                          display: true,
                          text: 'Estado de Propiedades'
                        }
                      }
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1, p: 2 }}>
                  <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
                    Resumen de Ocupación
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="h6" color="success.main">
                        {stats?.properties?.occupied || 0} Ocupadas
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stats && stats.properties && stats.properties.total > 0 
                          ? `${Math.round((stats.properties.occupied / stats.properties.total) * 100)}%`
                          : '0%'} del total
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6" color="info.main">
                        {stats?.properties?.available || 0} Disponibles
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Listas para arrendar
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6" color="warning.main">
                        {stats?.properties?.maintenance || 0} En Mantenimiento
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Requieren atención
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
            {selectedChart === 'ratings' && (
              <Bar 
                data={getRatingsChart()} 
                options={{
                  ...chartOptions,
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      display: false
                    },
                    title: {
                      display: true,
                      text: 'Distribución de Calificaciones'
                    }
                  },
                  scales: {
                    ...chartOptions.scales,
                    y: {
                      ...chartOptions.scales.y,
                      title: {
                        display: true,
                        text: 'Número de Calificaciones'
                      }
                    },
                    x: {
                      ...chartOptions.scales.x,
                      title: {
                        display: true,
                        text: 'Estrellas'
                      }
                    }
                  }
                }} 
              />
            )}
          </Box>
        </DialogContent>
        
        {isMobile && (
          <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              opacity: 0.6
            }}>
              <SwipeUpIcon fontSize="small" />
              <Typography variant="caption">
                Desliza hacia arriba para cerrar
              </Typography>
            </Box>
          </DialogActions>
        )}
      </Dialog>

      {/* Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {}}>
          <Box display="flex" alignItems="center" gap={1}>
            <ViewModuleIcon fontSize="small" />
            Configurar widgets
          </Box>
        </MenuItem>
        <MenuItem onClick={() => {}}>
          <Box display="flex" alignItems="center" gap={1}>
            <DownloadIcon fontSize="small" />
            Exportar datos
          </Box>
        </MenuItem>
        <MenuItem onClick={() => {}}>
          <Box display="flex" alignItems="center" gap={1}>
            <AssessmentIcon fontSize="small" />
            Ver reportes
          </Box>
        </MenuItem>
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