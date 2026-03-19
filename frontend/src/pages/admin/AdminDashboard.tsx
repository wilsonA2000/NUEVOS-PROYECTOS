/**
 * 📊 ADMIN DASHBOARD (Plan Maestro V2.0)
 *
 * Dashboard principal del sistema de administración legal.
 * Vista general con métricas clave y accesos rápidos.
 *
 * Features:
 * - Cards de estadísticas (pendientes, aprobados, rechazados, urgentes)
 * - Lista rápida de contratos pendientes
 * - Alertas de seguridad activas
 * - Overview del sistema
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  LinearProgress,
  Stack,
} from '@mui/material';
import {
  Description as ContractIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Warning as UrgentIcon,
  Schedule as PendingIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  ArrowForward as ArrowIcon,
  Gavel as GavelIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';

import { AdminService, AdminContractSummary, AdminContractStats } from '../../services/adminService';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';

/**
 * Card de estadística individual
 */
interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
  trend?: number;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  onClick,
}) => (
  <Card
    sx={{
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': onClick
        ? {
            transform: 'translateY(-4px)',
            boxShadow: 4,
          }
        : {},
    }}
    onClick={onClick}
  >
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h3" fontWeight="bold" color={`${color}.main`}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar
          sx={{
            bgcolor: `${color}.light`,
            width: 56,
            height: 56,
          }}
        >
          {icon}
        </Avatar>
      </Box>
      {trend !== undefined && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <TrendingUpIcon
            fontSize="small"
            sx={{ color: trend >= 0 ? 'success.main' : 'error.main', mr: 0.5 }}
          />
          <Typography
            variant="caption"
            color={trend >= 0 ? 'success.main' : 'error.main'}
          >
            {trend >= 0 ? '+' : ''}{trend}% vs. ayer
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

/**
 * Dashboard principal
 */
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isSuperuser, adminPermissions } = useAdminAuth();

  // Fetch stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['admin-contract-stats'],
    queryFn: AdminService.getContractStats,
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  // Fetch pending contracts
  const {
    data: pendingContracts = [],
    isLoading: contractsLoading,
  } = useQuery({
    queryKey: ['admin-pending-contracts'],
    queryFn: AdminService.getPendingContracts,
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  // Loading state
  if (statsLoading) {
    return <LoadingSpinner message="Cargando dashboard de administración..." />;
  }

  // Error state
  if (statsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error al cargar el dashboard: {(statsError as Error).message}
        </Alert>
      </Box>
    );
  }

  // Top 5 contratos pendientes (con safe handling para array)
  const contractsArray = Array.isArray(pendingContracts) ? pendingContracts : [];
  const topPendingContracts = [...contractsArray]
    .sort((a, b) => (b.days_pending || 0) - (a.days_pending || 0))
    .slice(0, 5)
    .map(contract => ({
      ...contract,
      // Calcular is_urgent si no viene del backend
      is_urgent: contract.is_urgent ?? (contract.days_pending >= 7),
      // Usar property_address si no hay property_title
      property_title: contract.property_title || contract.property_address || 'Propiedad sin dirección',
    }));

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Dashboard de Administración Legal
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Bienvenido al panel de control. Aquí puedes revisar y aprobar contratos pendientes.
        </Typography>
      </Box>

      {/* Alertas urgentes */}
      {stats?.urgent_contracts && stats.urgent_contracts > 0 && (
        <Alert
          severity="error"
          icon={<UrgentIcon />}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate('/app/admin/contracts')}
            >
              Ver todos
            </Button>
          }
          sx={{ mb: 3 }}
        >
          <Typography fontWeight="medium">
            {stats.urgent_contracts} contrato(s) llevan más de 7 días pendientes de revisión
          </Typography>
        </Alert>
      )}

      {/* Estadísticas principales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pendientes de Revisión"
            value={stats?.pending_review || 0}
            subtitle="Requieren atención"
            icon={<PendingIcon sx={{ color: 'primary.main' }} />}
            color="primary"
            onClick={() => navigate('/app/admin/contracts')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Urgentes (>7 días)"
            value={stats?.urgent_contracts || 0}
            subtitle="Alta prioridad"
            icon={<UrgentIcon sx={{ color: 'error.main' }} />}
            color="error"
            onClick={() => navigate('/app/admin/contracts')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Aprobados Hoy"
            value={stats?.approved_today || 0}
            subtitle="Contratos procesados"
            icon={<ApprovedIcon sx={{ color: 'success.main' }} />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Rechazados Hoy"
            value={stats?.rejected_today || 0}
            subtitle="Devueltos para corrección"
            icon={<RejectedIcon sx={{ color: 'warning.main' }} />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Contenido principal */}
      <Grid container spacing={3}>
        {/* Lista de pendientes */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 0 }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="medium">
                Contratos Pendientes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Los más antiguos primero
              </Typography>
            </Box>

            {contractsLoading ? (
              <Box sx={{ p: 3 }}>
                <LinearProgress />
              </Box>
            ) : topPendingContracts.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Avatar
                  sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: 'success.light' }}
                >
                  <ApprovedIcon sx={{ fontSize: 32, color: 'success.main' }} />
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  ¡Excelente!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No hay contratos pendientes de revisión
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {topPendingContracts.map((contract, index) => (
                  <React.Fragment key={contract.id}>
                    {index > 0 && <Divider />}
                    <ListItem
                      sx={{
                        py: 2,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => navigate(`/app/admin/contracts/${contract.id}`)}
                    >
                      <ListItemIcon>
                        <Avatar
                          sx={{
                            bgcolor: contract.is_urgent ? 'error.light' : 'primary.light',
                          }}
                        >
                          <ContractIcon
                            sx={{
                              color: contract.is_urgent ? 'error.main' : 'primary.main',
                            }}
                          />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body1" fontWeight="medium">
                            {contract.property_title}
                          </Typography>
                        }
                        secondary={
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {contract.landlord_name || 'Sin arrendador'} {contract.tenant_name ? `→ ${contract.tenant_name}` : '(Sin inquilino asignado)'}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${contract.days_pending} días`}
                              color={
                                contract.days_pending >= 7
                                  ? 'error'
                                  : contract.days_pending >= 3
                                  ? 'warning'
                                  : 'default'
                              }
                              variant={contract.days_pending >= 7 ? 'filled' : 'outlined'}
                            />
                            {(contract.review_cycle_count ?? 0) > 1 && (
                              <Chip
                                size="small"
                                label={`Ciclo #${contract.review_cycle_count}`}
                                color="info"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        }
                      />
                      <ListItemSecondaryAction>
                        <ArrowIcon color="action" />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}

            {topPendingContracts.length > 0 && (
              <CardActions sx={{ justifyContent: 'center', borderTop: 1, borderColor: 'divider' }}>
                <Button
                  endIcon={<ArrowIcon />}
                  onClick={() => navigate('/app/admin/contracts')}
                >
                  Ver todos los contratos
                </Button>
              </CardActions>
            )}
          </Paper>
        </Grid>

        {/* Panel lateral */}
        <Grid item xs={12} md={4}>
          {/* Métricas de rendimiento */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SpeedIcon color="primary" />
              <Typography variant="h6" fontWeight="medium">
                Rendimiento
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Tiempo promedio de revisión
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {stats?.avg_review_time_hours?.toFixed(1) || 0}h
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total de contratos
              </Typography>
              <Typography variant="h5" fontWeight="medium">
                {stats?.total_contracts || 0}
              </Typography>
            </Box>
          </Paper>

          {/* Accesos rápidos */}
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <GavelIcon color="primary" />
              <Typography variant="h6" fontWeight="medium">
                Accesos Rápidos
              </Typography>
            </Box>
            <Stack spacing={1}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<ContractIcon />}
                onClick={() => navigate('/app/admin/contracts')}
              >
                Revisar Contratos
              </Button>
              {adminPermissions.canViewAuditLogs && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<GavelIcon />}
                  onClick={() => navigate('/app/admin/audit')}
                >
                  Reportes de Auditoría
                </Button>
              )}
              {adminPermissions.canAccessSecurityPanel && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<SecurityIcon />}
                  onClick={() => navigate('/app/admin/security')}
                >
                  Panel de Seguridad
                </Button>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
