/**
 * 🔒 ADMIN SECURITY PANEL (Plan Maestro V2.0)
 *
 * Panel de seguridad con análisis de riesgos y alertas.
 *
 * Features:
 * - Risk score visual
 * - IPs sospechosas
 * - Logins fallidos recientes
 * - Alertas de seguridad activas
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as OkIcon,
  Block as BlockIcon,
  Person as PersonIcon,
  Computer as IpIcon,
  Schedule as TimeIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';

import { AdminService } from '../../services/adminService';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';

/**
 * Obtener color del risk score
 */
const getRiskColor = (score: number): 'success' | 'warning' | 'error' => {
  if (score < 30) return 'success';
  if (score < 70) return 'warning';
  return 'error';
};

/**
 * Obtener icono de severidad
 */
const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <ErrorIcon color='error' />;
    case 'high':
      return <WarningIcon color='error' />;
    case 'medium':
      return <WarningIcon color='warning' />;
    default:
      return <WarningIcon color='info' />;
  }
};

/**
 * Formatear fecha
 */
const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Panel de seguridad
 */
const AdminSecurityPanel: React.FC = () => {
  const { adminPermissions } = useAdminAuth();

  // Fetch security analysis
  const {
    data: security,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-security-analysis'],
    queryFn: AdminService.getSecurityAnalysis,
    enabled: adminPermissions.canAccessSecurityPanel,
    refetchInterval: 60000,
  });

  if (!adminPermissions.canAccessSecurityPanel) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error'>
          No tienes permisos para acceder al panel de seguridad. Se requiere rol
          de superusuario.
        </Alert>
      </Box>
    );
  }

  if (isLoading) {
    return <LoadingSpinner message='Cargando análisis de seguridad...' />;
  }

  if (error || !security) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error'>
          Error al cargar el análisis de seguridad:{' '}
          {(error as Error)?.message || 'Error desconocido'}
        </Alert>
      </Box>
    );
  }

  const riskColor = getRiskColor(security.risk_score);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant='h4' fontWeight='bold' gutterBottom>
          Panel de Seguridad
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          Monitoreo en tiempo real de amenazas y actividad sospechosa.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Risk Score */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant='h6' fontWeight='medium' gutterBottom>
              Puntuación de Riesgo
            </Typography>
            <Box sx={{ position: 'relative', display: 'inline-flex', my: 2 }}>
              <CircularProgress
                variant='determinate'
                value={security.risk_score}
                size={120}
                thickness={8}
                color={riskColor}
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  variant='h3'
                  fontWeight='bold'
                  color={`${riskColor}.main`}
                >
                  {security.risk_score}
                </Typography>
              </Box>
            </Box>
            <Typography variant='body2' color='text.secondary'>
              {security.risk_score < 30
                ? 'Sistema seguro'
                : security.risk_score < 70
                  ? 'Precaución recomendada'
                  : 'Atención requerida'}
            </Typography>
          </Paper>
        </Grid>

        {/* Alertas activas */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <WarningIcon color='warning' />
              <Typography variant='h6' fontWeight='medium'>
                Alertas Activas
              </Typography>
              <Chip
                size='small'
                label={security.active_alerts.length}
                color={
                  security.active_alerts.length > 0 ? 'warning' : 'success'
                }
              />
            </Box>

            {security.active_alerts.length === 0 ? (
              <Alert severity='success' icon={<OkIcon />}>
                No hay alertas activas. El sistema está funcionando
                correctamente.
              </Alert>
            ) : (
              <List dense disablePadding>
                {security.active_alerts.map(alert => (
                  <ListItem
                    key={alert.id}
                    sx={{
                      bgcolor:
                        alert.severity === 'critical'
                          ? 'error.50'
                          : alert.severity === 'high'
                            ? 'warning.50'
                            : 'background.paper',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <ListItemIcon>
                      {getSeverityIcon(alert.severity)}
                    </ListItemIcon>
                    <ListItemText
                      primary={alert.message}
                      secondary={
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mt: 0.5,
                          }}
                        >
                          <Chip
                            size='small'
                            label={alert.type}
                            variant='outlined'
                          />
                          <Typography variant='caption' color='text.secondary'>
                            {formatDateTime(alert.created_at)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* IPs sospechosas */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BlockIcon color='error' />
              <Typography variant='h6' fontWeight='medium'>
                IPs Sospechosas
              </Typography>
            </Box>

            {security.suspicious_ips.length === 0 ? (
              <Alert severity='success' icon={<OkIcon />}>
                No se detectaron IPs sospechosas.
              </Alert>
            ) : (
              <List dense disablePadding>
                {security.suspicious_ips.map((ip, index) => (
                  <React.Fragment key={ip.ip}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemIcon>
                        <Avatar
                          sx={{ width: 32, height: 32, bgcolor: 'error.light' }}
                        >
                          <IpIcon fontSize='small' />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={ip.ip}
                        secondary={`${ip.failed_attempts} intentos fallidos`}
                      />
                      <Typography variant='caption' color='text.secondary'>
                        {formatDateTime(ip.last_attempt)}
                      </Typography>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Logins fallidos */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PersonIcon color='warning' />
              <Typography variant='h6' fontWeight='medium'>
                Intentos de Login Fallidos
              </Typography>
            </Box>

            {security.recent_failed_logins.length === 0 ? (
              <Alert severity='success' icon={<OkIcon />}>
                No hay intentos fallidos recientes.
              </Alert>
            ) : (
              <List dense disablePadding>
                {security.recent_failed_logins
                  .slice(0, 5)
                  .map((login, index) => (
                    <React.Fragment key={`${login.email}-${login.timestamp}`}>
                      {index > 0 && <Divider />}
                      <ListItem>
                        <ListItemIcon>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: 'warning.light',
                            }}
                          >
                            <PersonIcon fontSize='small' />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={login.email}
                          secondary={
                            <Box>
                              <Typography variant='caption' display='block'>
                                IP: {login.ip}
                              </Typography>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                {login.reason}
                              </Typography>
                            </Box>
                          }
                        />
                        <Typography variant='caption' color='text.secondary'>
                          {formatDateTime(login.timestamp)}
                        </Typography>
                      </ListItem>
                    </React.Fragment>
                  ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminSecurityPanel;
