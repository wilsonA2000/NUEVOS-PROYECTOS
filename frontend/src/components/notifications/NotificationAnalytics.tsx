import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Notifications as NotificationsIcon,
  MarkEmailRead as ReadIcon,
  Schedule as PendingIcon,
  Refresh as RefreshIcon,
  DateRange as DateRangeIcon,
  BarChart as ChartIcon,
  Email as EmailIcon,
  Smartphone as MobileIcon,
  Desktop as DesktopIcon,
} from '@mui/icons-material';

// Interfaces para métricas de notificaciones
interface NotificationMetrics {
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_clicked: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  unsubscribe_rate: number;
}

interface NotificationAnalyticsData {
  period: string;
  metrics: NotificationMetrics;
  metrics_by_type: {
    [key: string]: {
      count: number;
      read_rate: number;
      avg_response_time: number;
    };
  };
  metrics_by_channel: {
    email: NotificationMetrics;
    push: NotificationMetrics;
    in_app: NotificationMetrics;
  };
  trend_data: {
    date: string;
    sent: number;
    read: number;
    clicked: number;
  }[];
  top_performing: {
    type: string;
    title: string;
    open_rate: number;
    click_rate: number;
  }[];
  device_breakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

interface NotificationAnalyticsProps {
  data?: NotificationAnalyticsData;
  isLoading?: boolean;
  onRefresh?: () => void;
  onPeriodChange?: (period: string) => void;
  onExport?: () => void;
}

const NotificationAnalytics: React.FC<NotificationAnalyticsProps> = ({
  data,
  isLoading = false,
  onRefresh,
  onPeriodChange,
  onExport,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('open_rate');

  const periods = [
    { value: '24h', label: 'Últimas 24 horas' },
    { value: '7d', label: 'Últimos 7 días' },
    { value: '30d', label: 'Últimos 30 días' },
    { value: '90d', label: 'Últimos 90 días' },
  ];

  const metrics = [
    { value: 'open_rate', label: 'Tasa de Apertura' },
    { value: 'click_rate', label: 'Tasa de Clicks' },
    { value: 'delivery_rate', label: 'Tasa de Entrega' },
    { value: 'bounce_rate', label: 'Tasa de Rebote' },
  ];

  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod);
    if (onPeriodChange) {
      onPeriodChange(newPeriod);
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-ES').format(value);
  };

  const getMetricColor = (value: number, type: 'success' | 'warning' | 'error') => {
    switch (type) {
      case 'success':
        return value >= 0.7 ? '#10b981' : value >= 0.5 ? '#f59e0b' : '#ef4444';
      case 'warning':
        return value <= 0.1 ? '#10b981' : value <= 0.3 ? '#f59e0b' : '#ef4444';
      case 'error':
        return value <= 0.05 ? '#10b981' : value <= 0.15 ? '#f59e0b' : '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUpIcon sx={{ fontSize: 16, color: '#10b981' }} />;
    } else if (current < previous) {
      return <TrendingDownIcon sx={{ fontSize: 16, color: '#ef4444' }} />;
    }
    return null;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <EmailIcon fontSize="small" />;
      case 'push':
        return <MobileIcon fontSize="small" />;
      case 'in_app':
        return <NotificationsIcon fontSize="small" />;
      default:
        return <NotificationsIcon fontSize="small" />;
    }
  };

  if (isLoading) {
    return (
      <Card
        elevation={0}
        sx={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius-lg)',
          height: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card
        elevation={0}
        sx={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius-lg)',
          height: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <ChartIcon sx={{ fontSize: 64, color: 'var(--color-text-secondary)', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'var(--color-text-secondary)' }}>
            No hay datos de analíticas
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card
      elevation={0}
      sx={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius-lg)',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Analíticas de Notificaciones
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Período</InputLabel>
              <Select
                value={selectedPeriod}
                label="Período"
                onChange={(e) => handlePeriodChange(e.target.value)}
              >
                {periods.map((period) => (
                  <MenuItem key={period.value} value={period.value}>
                    {period.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {onRefresh && (
              <Tooltip title="Actualizar datos">
                <IconButton onClick={onRefresh} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Main Metrics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 2,
                backgroundColor: 'var(--color-background)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                  Total Enviadas
                </Typography>
                <NotificationsIcon sx={{ color: 'var(--color-primary)' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                {formatNumber(data.metrics.total_sent)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={100}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: 'var(--color-border)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: 'var(--color-primary)',
                  },
                }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 2,
                backgroundColor: 'var(--color-background)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                  Tasa de Apertura
                </Typography>
                <ReadIcon sx={{ color: getMetricColor(data.metrics.open_rate, 'success') }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                {formatPercentage(data.metrics.open_rate)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={data.metrics.open_rate * 100}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: 'var(--color-border)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getMetricColor(data.metrics.open_rate, 'success'),
                  },
                }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 2,
                backgroundColor: 'var(--color-background)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                  Tasa de Clicks
                </Typography>
                <TrendingUpIcon sx={{ color: getMetricColor(data.metrics.click_rate, 'success') }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                {formatPercentage(data.metrics.click_rate)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={data.metrics.click_rate * 100}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: 'var(--color-border)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getMetricColor(data.metrics.click_rate, 'success'),
                  },
                }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 2,
                backgroundColor: 'var(--color-background)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                  Tasa de Entrega
                </Typography>
                <PendingIcon sx={{ color: getMetricColor(data.metrics.delivery_rate, 'success') }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                {formatPercentage(data.metrics.delivery_rate)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={data.metrics.delivery_rate * 100}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: 'var(--color-border)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getMetricColor(data.metrics.delivery_rate, 'success'),
                  },
                }}
              />
            </Box>
          </Grid>
        </Grid>

        {/* Channel Breakdown */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Por Canal de Comunicación
            </Typography>
            
            {Object.entries(data.metrics_by_channel).map(([channel, metrics]) => (
              <Box
                key={channel}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  mb: 1,
                  backgroundColor: 'var(--color-background)',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {getChannelIcon(channel)}
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                      {channel === 'in_app' ? 'En App' : channel}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                      {formatNumber(metrics.total_sent)} enviadas
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {formatPercentage(metrics.open_rate)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                    apertura
                  </Typography>
                </Box>
              </Box>
            ))}
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Por Tipo de Notificación
            </Typography>
            
            {Object.entries(data.metrics_by_type).map(([type, metrics]) => (
              <Box
                key={type}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  mb: 1,
                  backgroundColor: 'var(--color-background)',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                    {type.replace('_', ' ')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                    {formatNumber(metrics.count)} notificaciones
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={formatPercentage(metrics.read_rate)}
                    size="small"
                    sx={{
                      backgroundColor: getMetricColor(metrics.read_rate, 'success'),
                      color: 'white',
                      fontWeight: 500,
                    }}
                  />
                  <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                    {metrics.avg_response_time}h promedio
                  </Typography>
                </Box>
              </Box>
            ))}
          </Grid>
        </Grid>

        {/* Device Breakdown */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Dispositivos Utilizados
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <DesktopIcon sx={{ fontSize: 32, color: 'var(--color-primary)', mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {data.device_breakdown.desktop}%
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                  Escritorio
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <MobileIcon sx={{ fontSize: 32, color: 'var(--color-primary)', mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {data.device_breakdown.mobile}%
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                  Móvil
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <NotificationsIcon sx={{ fontSize: 32, color: 'var(--color-primary)', mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {data.device_breakdown.tablet}%
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                  Tablet
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Top Performing */}
        {data.top_performing.length > 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Mejor Rendimiento
            </Typography>
            
            {data.top_performing.slice(0, 3).map((item, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  mb: 1,
                  backgroundColor: 'var(--color-background)',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: index === 0 ? '#f59e0b' : 'var(--color-text-secondary)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                      {item.type.replace('_', ' ')}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatPercentage(item.open_rate)} apertura
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                    {formatPercentage(item.click_rate)} clicks
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* Export Button */}
        {onExport && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={onExport}
              startIcon={<DateRangeIcon />}
              sx={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
                '&:hover': {
                  borderColor: 'var(--color-primary)',
                },
              }}
            >
              Exportar Reporte
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationAnalytics;