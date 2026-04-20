/**
 * MaintenancePage - P\u00e1gina principal de solicitudes de mantenimiento
 * Combina el formulario de creaci\u00f3n, lista de solicitudes y resumen estad\u00edstico
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Add as AddIcon,
  Build as MaintenanceIcon,
  HourglassEmpty as PendingIcon,
  PlayCircle as InProgressIcon,
  CheckCircle as CompletedIcon,
  Assignment as TotalIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import MaintenanceRequestForm from '../../components/maintenance/MaintenanceRequestForm';
import MaintenanceRequestList from '../../components/maintenance/MaintenanceRequestList';
import {
  requestService,
  MaintenanceRequest,
} from '../../services/requestService';
import { vhColors } from '../../theme/tokens';

interface StatsData {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
}

const STAT_CARDS = [
  {
    key: 'total' as const,
    label: 'Total',
    icon: <TotalIcon />,
    color: vhColors.accentBlue,
    bgColor: vhColors.accentBlueBg,
  },
  {
    key: 'pending' as const,
    label: 'Pendientes',
    icon: <PendingIcon />,
    color: vhColors.warning,
    bgColor: vhColors.warningBg,
  },
  {
    key: 'in_progress' as const,
    label: 'En Progreso',
    icon: <InProgressIcon />,
    color: vhColors.info,
    bgColor: vhColors.infoBg,
  },
  {
    key: 'completed' as const,
    label: 'Completadas',
    icon: <CompletedIcon />,
    color: vhColors.success,
    bgColor: vhColors.successBg,
  },
];

const MaintenancePage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const [formOpen, setFormOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<StatsData>({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const response = await requestService.getMaintenanceRequests();
      const data: MaintenanceRequest[] =
        response?.data?.results || response?.data || [];
      const list = Array.isArray(data) ? data : [];

      setStats({
        total: list.length,
        pending: list.filter(r => r.status === 'pending').length,
        in_progress: list.filter(r => r.status === 'in_progress').length,
        completed: list.filter(r =>
          ['completed', 'rejected', 'cancelled'].includes(r.status),
        ).length,
      });
    } catch {
      // Stats silently fail, list component handles its own errors
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshTrigger]);

  const handleFormSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Container maxWidth='lg' sx={{ py: { xs: 2, md: 4 } }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          underline='hover'
          color='inherit'
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate('/app/dashboard')}
        >
          Inicio
        </Link>
        <Typography color='text.primary'>Mantenimiento</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box
        display='flex'
        justifyContent='space-between'
        alignItems={isMobile ? 'flex-start' : 'center'}
        flexDirection={isMobile ? 'column' : 'row'}
        gap={2}
        mb={3}
      >
        <Box display='flex' alignItems='center' gap={1.5}>
          <MaintenanceIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={700}>
              Mantenimiento
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Gestiona las solicitudes de mantenimiento de tus propiedades
            </Typography>
          </Box>
        </Box>

        <Button
          variant='contained'
          startIcon={<AddIcon />}
          onClick={() => setFormOpen(true)}
          size={isMobile ? 'medium' : 'large'}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            alignSelf: isMobile ? 'stretch' : 'auto',
          }}
        >
          Nueva Solicitud
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {STAT_CARDS.map(stat => (
          <Grid item xs={6} sm={3} key={stat.key}>
            <Card
              elevation={1}
              sx={{
                borderRadius: 2,
                transition: 'transform 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <CardContent
                sx={{
                  p: { xs: 1.5, md: 2 },
                  '&:last-child': { pb: { xs: 1.5, md: 2 } },
                }}
              >
                <Box display='flex' alignItems='center' gap={1.5}>
                  <Box
                    sx={{
                      bgcolor: stat.bgColor,
                      color: stat.color,
                      borderRadius: 1.5,
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography
                      variant={isMobile ? 'h5' : 'h4'}
                      fontWeight={700}
                      color={stat.color}
                    >
                      {stats[stat.key]}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      fontWeight={500}
                    >
                      {stat.label}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Lista de solicitudes */}
      <MaintenanceRequestList refreshTrigger={refreshTrigger} />

      {/* Formulario modal */}
      <MaintenanceRequestForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleFormSuccess}
      />
    </Container>
  );
};

export default MaintenancePage;
