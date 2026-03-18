/**
 * Admin Maintenance Page
 * System maintenance operations: log cleanup, health checks, session management, cache management
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
  Alert,
  LinearProgress,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  CircularProgress,
} from '@mui/material';
import {
  DeleteSweep as CleanupIcon,
  HealthAndSafety as HealthIcon,
  People as SessionsIcon,
  Cached as CacheIcon,
  CheckCircle as OkIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
} from '@mui/icons-material';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import api from '../../services/api';

interface HealthStatus {
  database: { status: string; latency_ms: number };
  redis: { status: string; latency_ms: number };
  storage: { status: string; usage_percent: number };
  celery: { status: string; active_workers: number };
  overall: string;
}

interface MaintenanceResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

const AdminMaintenance: React.FC = () => {
  const { isAdmin } = useAdminAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [result, setResult] = useState<MaintenanceResult | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: string; title: string; message: string }>({
    open: false,
    action: '',
    title: '',
    message: '',
  });

  const runAction = useCallback(async (action: string, endpoint: string, method: 'get' | 'post' = 'post') => {
    try {
      setLoading(action);
      setResult(null);
      const response = method === 'get'
        ? await api.get(endpoint)
        : await api.post(endpoint);
      setResult({ success: true, message: response.data?.message || 'Operacion completada', details: response.data });
      if (action === 'health') {
        setHealthStatus(response.data);
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err?.response?.data?.detail || err?.response?.data?.error || 'Error al ejecutar la operacion',
      });
    } finally {
      setLoading(null);
    }
  }, []);

  const confirmAction = (action: string, title: string, message: string) => {
    setConfirmDialog({ open: true, action, title, message });
  };

  const executeConfirmedAction = () => {
    const { action } = confirmDialog;
    setConfirmDialog({ open: false, action: '', title: '', message: '' });

    switch (action) {
      case 'clear-logs':
        runAction('clear-logs', '/core/maintenance/clear-logs/');
        break;
      case 'clear-cache':
        runAction('clear-cache', '/core/maintenance/clear-cache/');
        break;
      case 'clear-sessions':
        runAction('clear-sessions', '/core/maintenance/clear-sessions/');
        break;
      case 'optimize-db':
        runAction('optimize-db', '/core/maintenance/optimize-db/');
        break;
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'healthy' || status === 'ok') return <OkIcon color="success" />;
    if (status === 'warning' || status === 'degraded') return <WarningIcon color="warning" />;
    return <ErrorIcon color="error" />;
  };

  if (!isAdmin) return null;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Mantenimiento del Sistema
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Operaciones de mantenimiento y monitoreo del sistema
      </Typography>

      {result && (
        <Alert severity={result.success ? 'success' : 'error'} sx={{ mb: 3 }} onClose={() => setResult(null)}>
          {result.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Health Check */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <HealthIcon color="primary" />
                <Typography variant="h6" fontWeight="600">Health Check</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Verificar el estado de todos los servicios del sistema
              </Typography>

              {healthStatus && (
                <List dense>
                  <ListItem>
                    <ListItemIcon>{getStatusIcon(healthStatus.database?.status)}</ListItemIcon>
                    <ListItemText
                      primary="Base de Datos"
                      secondary={`Latencia: ${healthStatus.database?.latency_ms || 0}ms`}
                    />
                    <Chip label={healthStatus.database?.status || 'unknown'} size="small" color={healthStatus.database?.status === 'healthy' ? 'success' : 'warning'} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>{getStatusIcon(healthStatus.redis?.status)}</ListItemIcon>
                    <ListItemText
                      primary="Redis / Cache"
                      secondary={`Latencia: ${healthStatus.redis?.latency_ms || 0}ms`}
                    />
                    <Chip label={healthStatus.redis?.status || 'unknown'} size="small" color={healthStatus.redis?.status === 'healthy' ? 'success' : 'warning'} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>{getStatusIcon(healthStatus.storage?.status)}</ListItemIcon>
                    <ListItemText
                      primary="Almacenamiento"
                      secondary={`Uso: ${healthStatus.storage?.usage_percent || 0}%`}
                    />
                    <Chip label={healthStatus.storage?.status || 'unknown'} size="small" color={healthStatus.storage?.status === 'healthy' ? 'success' : 'warning'} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>{getStatusIcon(healthStatus.celery?.status)}</ListItemIcon>
                    <ListItemText
                      primary="Celery Workers"
                      secondary={`Workers activos: ${healthStatus.celery?.active_workers || 0}`}
                    />
                    <Chip label={healthStatus.celery?.status || 'unknown'} size="small" color={healthStatus.celery?.status === 'healthy' ? 'success' : 'warning'} />
                  </ListItem>
                </List>
              )}
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                startIcon={loading === 'health' ? <CircularProgress size={18} /> : <HealthIcon />}
                disabled={loading === 'health'}
                onClick={() => runAction('health', '/core/maintenance/health/', 'get')}
              >
                Ejecutar Health Check
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Log Cleanup */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CleanupIcon color="warning" />
                <Typography variant="h6" fontWeight="600">Limpieza de Logs</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Eliminar logs antiguos del sistema para liberar espacio. Se conservan los ultimos 30 dias.
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                variant="outlined"
                color="warning"
                startIcon={loading === 'clear-logs' ? <CircularProgress size={18} /> : <CleanupIcon />}
                disabled={loading === 'clear-logs'}
                onClick={() => confirmAction('clear-logs', 'Limpiar Logs', 'Se eliminaran los logs con mas de 30 dias de antiguedad. Esta accion no se puede deshacer.')}
              >
                Limpiar Logs Antiguos
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Cache Management */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CacheIcon color="info" />
                <Typography variant="h6" fontWeight="600">Gestion de Cache</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Limpiar cache del sistema para forzar la actualizacion de datos. Puede causar lentitud temporal.
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                variant="outlined"
                color="info"
                startIcon={loading === 'clear-cache' ? <CircularProgress size={18} /> : <CacheIcon />}
                disabled={loading === 'clear-cache'}
                onClick={() => confirmAction('clear-cache', 'Limpiar Cache', 'Se limpiara toda la cache del sistema. Esto puede causar lentitud temporal mientras se regenera.')}
              >
                Limpiar Cache
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Session Management */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SessionsIcon color="secondary" />
                <Typography variant="h6" fontWeight="600">Sesiones Activas</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Cerrar sesiones expiradas o inactivas. Las sesiones activas no se veran afectadas.
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={loading === 'clear-sessions' ? <CircularProgress size={18} /> : <SessionsIcon />}
                disabled={loading === 'clear-sessions'}
                onClick={() => confirmAction('clear-sessions', 'Limpiar Sesiones', 'Se cerraran todas las sesiones expiradas e inactivas.')}
              >
                Limpiar Sesiones Expiradas
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* DB Optimization */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <StorageIcon color="primary" />
                <Typography variant="h6" fontWeight="600">Optimizacion de BD</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Ejecutar optimizacion de indices y estadisticas de la base de datos.
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                variant="outlined"
                startIcon={loading === 'optimize-db' ? <CircularProgress size={18} /> : <StorageIcon />}
                disabled={loading === 'optimize-db'}
                onClick={() => confirmAction('optimize-db', 'Optimizar BD', 'Se ejecutara VACUUM ANALYZE en la base de datos. Esto puede tomar varios minutos.')}
              >
                Optimizar Base de Datos
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Cancelar</Button>
          <Button onClick={executeConfirmedAction} variant="contained" color="warning">
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminMaintenance;
