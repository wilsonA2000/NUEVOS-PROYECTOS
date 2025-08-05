/**
 * NotificationAnalytics - Notification system analytics dashboard
 * Displays metrics, charts, and performance insights for notifications
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Computer as InAppIcon,
  NotificationsActive as PushIcon,
  Visibility as ViewIcon,
  MarkEmailRead as ReadIcon,
  Schedule as DelayIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../services/api';

interface AnalyticsData {
  summary: {
    total_sent: number;
    total_delivered: number;
    total_read: number;
    total_failed: number;
    delivery_rate: number;
    read_rate: number;
    avg_delivery_time: number;
    avg_read_time: number;
  };
  channels: Array<{
    channel: string;
    sent: number;
    delivered: number;
    failed: number;
    delivery_rate: number;
    avg_delivery_time: number;
  }>;
  daily_stats: Array<{
    date: string;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }>;
  priority_distribution: Array<{
    priority: string;
    count: number;
    percentage: number;
  }>;
  type_distribution: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  performance_metrics: {
    peak_hours: Array<{
      hour: number;
      count: number;
    }>;
    response_times: Array<{
      timeframe: string;
      avg_time: number;
    }>;
  };
}

const NotificationAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timeRanges = [
    { value: '1d', label: 'Último día' },
    { value: '7d', label: 'Últimos 7 días' },
    { value: '30d', label: 'Últimos 30 días' },
    { value: '90d', label: 'Últimos 90 días' },
  ];

  const channelColors = {
    email: '#1976d2',
    sms: '#388e3c',
    push: '#f57c00',
    in_app: '#7b1fa2',
  };

  const priorityColors = {
    low: '#4caf50',
    normal: '#2196f3',
    high: '#ff9800',
    urgent: '#f44336',
    critical: '#9c27b0',
  };

  const channelIcons = {
    email: <EmailIcon />,
    sms: <SmsIcon />,
    push: <PushIcon />,
    in_app: <InAppIcon />,
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/core/notifications/analytics/', {
        params: { time_range: timeRange },
      });
      setAnalyticsData(response.data);
    } catch (err: any) {
      setError(err.message || 'Error loading analytics');
      console.error('Error loading notification analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Analíticas de Notificaciones
        </Typography>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Cargando datos analíticos...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }

  if (!analyticsData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          No hay datos analíticos disponibles.
        </Alert>
      </Box>
    );
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Analíticas de Notificaciones
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Período</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            label="Período"
          >
            {timeRanges.map((range) => (
              <MenuItem key={range.value} value={range.value}>
                {range.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary">
                    {analyticsData.summary.total_sent.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Enviadas
                  </Typography>
                </Box>
                <TrendingUpIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="success.main">
                    {formatPercentage(analyticsData.summary.delivery_rate)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tasa de Entrega
                  </Typography>
                </Box>
                <SuccessIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="info.main">
                    {formatPercentage(analyticsData.summary.read_rate)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tasa de Lectura
                  </Typography>
                </Box>
                <ReadIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {formatTime(analyticsData.summary.avg_delivery_time)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tiempo Promedio
                  </Typography>
                </Box>
                <DelayIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} mb={3}>
        {/* Daily Trends */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tendencias Diarias
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.daily_stats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy')}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sent" 
                  stroke="#1976d2" 
                  strokeWidth={2}
                  name="Enviadas"
                />
                <Line 
                  type="monotone" 
                  dataKey="delivered" 
                  stroke="#4caf50" 
                  strokeWidth={2}
                  name="Entregadas"
                />
                <Line 
                  type="monotone" 
                  dataKey="read" 
                  stroke="#ff9800" 
                  strokeWidth={2}
                  name="Leídas"
                />
                <Line 
                  type="monotone" 
                  dataKey="failed" 
                  stroke="#f44336" 
                  strokeWidth={2}
                  name="Fallidas"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Priority Distribution */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Distribución por Prioridad
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.priority_distribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ priority, percentage }) => `${priority}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analyticsData.priority_distribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={priorityColors[entry.priority as keyof typeof priorityColors] || '#8884d8'} 
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Channel Performance */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Rendimiento por Canal
            </Typography>
            <List>
              {analyticsData.channels.map((channel) => (
                <ListItem key={channel.channel}>
                  <ListItemIcon>
                    {channelIcons[channel.channel as keyof typeof channelIcons]}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                          {channel.channel}
                        </Typography>
                        <Chip
                          label={formatPercentage(channel.delivery_rate)}
                          color={channel.delivery_rate > 90 ? 'success' : channel.delivery_rate > 70 ? 'warning' : 'error'}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {channel.delivered.toLocaleString()} de {channel.sent.toLocaleString()} entregadas
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tiempo promedio: {formatTime(channel.avg_delivery_time)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Type Distribution */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Distribución por Tipo
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.type_distribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Performance Insights */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Insights de Rendimiento
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Horas Pico
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analyticsData.performance_metrics.peak_hours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={(value) => `${value}:00`}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => `${value}:00 - ${value + 1}:00`}
                />
                <Bar dataKey="count" fill="#ff9800" />
              </BarChart>
            </ResponsiveContainer>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Tiempos de Respuesta
            </Typography>
            <List dense>
              {analyticsData.performance_metrics.response_times.map((metric, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={metric.timeframe}
                    secondary={formatTime(metric.avg_time)}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default NotificationAnalytics;