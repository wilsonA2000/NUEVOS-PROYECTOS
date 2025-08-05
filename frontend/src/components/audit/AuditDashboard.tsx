/**
 * Dashboard de Auditoría y Logging para VeriHome
 * Muestra métricas, logs y análisis de seguridad en tiempo real
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  Security as SecurityIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

import { useLogging, LogLevel, LogCategory } from '../../services/loggingService';
import { api } from '../../services/api';

interface AuditStats {
  period_days: number;
  total_activities: number;
  unique_users: number;
  failed_activities: number;
  success_rate: number;
  active_alerts: number;
  security_risk_score: number;
  recent_security_events: {
    failed_logins: number;
    suspicious_ips: number;
    active_impersonations: number;
  };
  is_admin: boolean;
}

interface SecurityAnalysis {
  period_hours: number;
  failed_logins: {
    total: number;
    by_ip: Array<{ ip_address: string; count: number }>;
  };
  suspicious_ips: Array<{ ip_address: string; failed_count: number }>;
  user_location_changes: number;
  active_impersonations: number;
  security_alerts: number;
  risk_score: number;
}

interface SystemAlert {
  id: string;
  title: string;
  description: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  created_at: string;
  is_acknowledged: boolean;
  is_resolved: boolean;
}

interface ActivityLog {
  id: string;
  user_email: string;
  action_type: string;
  description: string;
  timestamp: string;
  ip_address: string;
  success: boolean;
}

const AuditDashboard: React.FC = () => {
  const { logActivity } = useLogging('AuditDashboard');
  
  // Estados principales
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [securityAnalysis, setSecurityAnalysis] = useState<SecurityAnalysis | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  
  // Estados para filtros y modales
  const [exportDialog, setExportDialog] = useState(false);
  const [reportDialog, setReportDialog] = useState(false);
  const [filterDialog, setFilterDialog] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date()
  });

  useEffect(() => {
    loadDashboardData();
    logActivity({
      action: 'view_audit_dashboard',
      description: 'Accessed audit dashboard',
      category: LogCategory.SYSTEM,
      metadata: { timestamp: new Date().toISOString() }
    });
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Cargar estadísticas principales
      const statsResponse = await api.get('/core/dashboard-stats/');
      setStats(statsResponse.data);
      
      // Cargar análisis de seguridad solo para admins
      if (statsResponse.data.is_admin) {
        const securityResponse = await api.get('/core/security-analysis/', {
          params: { hours: 24 }
        });
        setSecurityAnalysis(securityResponse.data);
        
        // Cargar alertas del sistema
        const alertsResponse = await api.get('/core/system-alerts/');
        setAlerts(alertsResponse.data.results || alertsResponse.data);
      }
      
      // Cargar logs de actividad
      const logsResponse = await api.get('/core/activity-logs/', {
        params: { page_size: 50 }
      });
      setActivityLogs(logsResponse.data.results || logsResponse.data);
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      logActivity({
        action: 'load_dashboard_error',
        description: 'Failed to load audit dashboard data',
        category: LogCategory.SYSTEM,
        success: false,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportLogs = async (format: 'csv' | 'json', logTypes: string[]) => {
    try {
      const response = await api.post('/core/export-logs/', {
        start_date: selectedDateRange.start.toISOString(),
        end_date: selectedDateRange.end.toISOString(),
        format,
        log_types: logTypes
      }, {
        responseType: 'blob'
      });

      // Crear enlace de descarga
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${selectedDateRange.start.toISOString().split('T')[0]}_${selectedDateRange.end.toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      logActivity({
        action: 'export_logs',
        description: `Exported logs in ${format} format`,
        category: LogCategory.SYSTEM,
        metadata: { format, logTypes, dateRange: selectedDateRange }
      });

      setExportDialog(false);
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const handleGenerateReport = async (sections: string[]) => {
    try {
      const response = await api.post('/core/audit-reports/', {
        start_date: selectedDateRange.start.toISOString(),
        end_date: selectedDateRange.end.toISOString(),
        sections
      });

      // Mostrar o descargar el reporte

logActivity({
        action: 'generate_audit_report',
        description: 'Generated comprehensive audit report',
        category: LogCategory.BUSINESS,
        metadata: { sections, dateRange: selectedDateRange, reportId: response.data.report_id }
      });

      setReportDialog(false);
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await api.post(`/core/system-alerts/${alertId}/acknowledge/`);
      
      // Actualizar estado local
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, is_acknowledged: true }
          : alert
      ));

      logActivity({
        action: 'acknowledge_alert',
        description: 'Acknowledged system alert',
        category: LogCategory.SYSTEM,
        metadata: { alertId }
      });
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleResolveAlert = async (alertId: string, notes: string = '') => {
    try {
      await api.post(`/core/system-alerts/${alertId}/resolve/`, { notes });
      
      // Actualizar estado local
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, is_resolved: true }
          : alert
      ));

      logActivity({
        action: 'resolve_alert',
        description: 'Resolved system alert',
        category: LogCategory.SYSTEM,
        metadata: { alertId, notes }
      });
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score < 30) return 'success';
    if (score < 60) return 'warning';
    return 'error';
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'info': return <CheckCircleIcon color="info" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      case 'critical': return <ErrorIcon color="error" />;
      default: return <CheckCircleIcon />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Dashboard de Auditoría
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadDashboardData}
            >
              Actualizar
            </Button>
            {stats?.is_admin && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => setExportDialog(true)}
                >
                  Exportar
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AssessmentIcon />}
                  onClick={() => setReportDialog(true)}
                >
                  Generar Reporte
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Métricas principales */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Actividades Total
                </Typography>
                <Typography variant="h4">
                  {stats?.total_activities?.toLocaleString() || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Últimos {stats?.period_days || 7} días
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Usuarios Únicos
                </Typography>
                <Typography variant="h4">
                  {stats?.unique_users || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Usuarios activos
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Tasa de Éxito
                </Typography>
                <Typography variant="h4" color={stats?.success_rate && stats.success_rate > 95 ? 'success.main' : 'warning.main'}>
                  {stats?.success_rate?.toFixed(1) || 0}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={stats?.success_rate || 0} 
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <SecurityIcon color={getRiskScoreColor(stats?.security_risk_score || 0)} />
                  <Typography color="textSecondary" gutterBottom>
                    Risk Score
                  </Typography>
                </Box>
                <Typography variant="h4" color={`${getRiskScoreColor(stats?.security_risk_score || 0)}.main`}>
                  {stats?.security_risk_score || 0}/100
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={stats?.security_risk_score || 0} 
                  color={getRiskScoreColor(stats?.security_risk_score || 0)}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs principales */}
        <Card>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Logs de Actividad" />
            {stats?.is_admin && <Tab label="Alertas del Sistema" />}
            {stats?.is_admin && <Tab label="Análisis de Seguridad" />}
            <Tab label="Mi Actividad" />
          </Tabs>

          {/* Tab Content: Logs de Actividad */}
          {activeTab === 0 && (
            <CardContent>
              <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                <Typography variant="h6">Logs de Actividad Recientes</Typography>
                <IconButton onClick={() => setFilterDialog(true)}>
                  <FilterIcon />
                </IconButton>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Usuario</TableCell>
                      <TableCell>Acción</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell>IP</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activityLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>{log.user_email}</TableCell>
                        <TableCell>
                          <Chip 
                            label={log.action_type} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{log.description}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            {log.ip_address}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={log.success ? 'Éxito' : 'Error'} 
                            color={log.success ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          )}

          {/* Tab Content: Alertas del Sistema */}
          {activeTab === 1 && stats?.is_admin && (
            <CardContent>
              <Typography variant="h6" mb={2}>Alertas del Sistema</Typography>
              {alerts.length === 0 ? (
                <Alert severity="success">No hay alertas activas</Alert>
              ) : (
                alerts.map((alert) => (
                  <Alert 
                    key={alert.id}
                    severity={alert.level as any}
                    sx={{ mb: 1 }}
                    action={
                      <Box>
                        {!alert.is_acknowledged && (
                          <Button 
                            size="small" 
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                          >
                            Reconocer
                          </Button>
                        )}
                        {!alert.is_resolved && (
                          <Button 
                            size="small" 
                            onClick={() => handleResolveAlert(alert.id)}
                          >
                            Resolver
                          </Button>
                        )}
                      </Box>
                    }
                  >
                    <Typography variant="subtitle2">{alert.title}</Typography>
                    <Typography variant="body2">{alert.description}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(alert.created_at).toLocaleString()} - {alert.category}
                    </Typography>
                  </Alert>
                ))
              )}
            </CardContent>
          )}

          {/* Tab Content: Análisis de Seguridad */}
          {activeTab === 2 && stats?.is_admin && securityAnalysis && (
            <CardContent>
              <Typography variant="h6" mb={2}>Análisis de Seguridad (24h)</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Logins Fallidos: {securityAnalysis.failed_logins.total}
                  </Typography>
                  {securityAnalysis.failed_logins.by_ip.slice(0, 5).map((item, index) => (
                    <Box key={index} display="flex" justifyContent="space-between">
                      <Typography variant="body2">{item.ip_address}</Typography>
                      <Chip label={`${item.count} fallos`} size="small" color="warning" />
                    </Box>
                  ))}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    IPs Sospechosas: {securityAnalysis.suspicious_ips.length}
                  </Typography>
                  {securityAnalysis.suspicious_ips.slice(0, 5).map((item, index) => (
                    <Box key={index} display="flex" justifyContent="space-between">
                      <Typography variant="body2">{item.ip_address}</Typography>
                      <Chip label={`${item.failed_count} fallos`} size="small" color="error" />
                    </Box>
                  ))}
                </Grid>
              </Grid>
            </CardContent>
          )}

          {/* Tab Content: Mi Actividad */}
          {activeTab === (stats?.is_admin ? 3 : 1) && (
            <CardContent>
              <Typography variant="h6" mb={2}>Mi Actividad Reciente</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Acción</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activityLogs
                      .filter(log => log.user_email === (stats as any)?.user_email)
                      .map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={log.action_type} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{log.description}</TableCell>
                          <TableCell>
                            <Chip 
                              label={log.success ? 'Éxito' : 'Error'} 
                              color={log.success ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          )}
        </Card>

        {/* Dialogs */}
        {/* Export Dialog */}
        <Dialog open={exportDialog} onClose={() => setExportDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Exportar Logs de Auditoría</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <Box display="flex" gap={2}>
                <DatePicker
                  label="Fecha Inicio"
                  value={selectedDateRange.start}
                  onChange={(date) => setSelectedDateRange(prev => ({ ...prev, start: date || new Date() }))}
                  renderInput={(params) => <TextField {...params} />}
                />
                <DatePicker
                  label="Fecha Fin"
                  value={selectedDateRange.end}
                  onChange={(date) => setSelectedDateRange(prev => ({ ...prev, end: date || new Date() }))}
                  renderInput={(params) => <TextField {...params} />}
                />
              </Box>
              <FormControl>
                <InputLabel>Formato</InputLabel>
                <Select defaultValue="csv">
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="json">JSON</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExportDialog(false)}>Cancelar</Button>
            <Button 
              onClick={() => handleExportLogs('csv', ['activity', 'user_activity'])}
              variant="contained"
            >
              Exportar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Report Dialog */}
        <Dialog open={reportDialog} onClose={() => setReportDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Generar Reporte de Auditoría</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <Box display="flex" gap={2}>
                <DatePicker
                  label="Fecha Inicio"
                  value={selectedDateRange.start}
                  onChange={(date) => setSelectedDateRange(prev => ({ ...prev, start: date || new Date() }))}
                  renderInput={(params) => <TextField {...params} />}
                />
                <DatePicker
                  label="Fecha Fin"
                  value={selectedDateRange.end}
                  onChange={(date) => setSelectedDateRange(prev => ({ ...prev, end: date || new Date() }))}
                  renderInput={(params) => <TextField {...params} />}
                />
              </Box>
              <Typography variant="body2" color="textSecondary">
                El reporte incluirá estadísticas generales, actividades de usuarios, 
                acciones administrativas, eventos de seguridad y alertas del sistema.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReportDialog(false)}>Cancelar</Button>
            <Button 
              onClick={() => handleGenerateReport([
                'general_stats', 'user_activities', 'admin_actions',
                'security_events', 'system_alerts', 'performance_metrics'
              ])}
              variant="contained"
            >
              Generar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default AuditDashboard;