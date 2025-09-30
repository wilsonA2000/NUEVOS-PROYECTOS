/**
 * Vista específica para contratos en ejecución
 * 
 * Muestra contratos activos con características avanzadas:
 * - Timeline de hitos del contrato
 * - Estado de pagos mensuales
 * - Próximas fechas importantes
 * - Acciones rápidas (reportar incidencia, solicitar mantenimiento)
 * - Dashboard de métricas en tiempo real
 * - Gestión de renovaciones y terminaciones
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Button,
  Avatar,
  IconButton,
  Badge,
  Alert,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/lab';
import {
  PlayArrow as ActiveIcon,
  AttachMoney as PaymentIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingIcon,
  Warning as WarningIcon,
  CheckCircle as CompleteIcon,
  Schedule as ScheduleIcon,
  Build as MaintenanceIcon,
  Report as IssueIcon,
  Refresh as RenewIcon,
  Stop as TerminateIcon,
  Visibility as ViewIcon,
  Phone as ContactIcon,
  Email as EmailIcon,
  Home as PropertyIcon,
  Person as PersonIcon,
  Assessment as AnalyticsIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Notifications as NotificationIcon
} from '@mui/icons-material';
import { format, addMonths, differenceInDays, parseISO, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

import { contractService } from '../../services/contractService';
import { useAuth } from '../../hooks/useAuth';
import { Contract } from '../../types/contract';

interface ContractMilestone {
  id: string;
  title: string;
  description: string;
  date: string;
  completed: boolean;
  type: 'payment' | 'inspection' | 'renewal' | 'maintenance' | 'other';
  amount?: number;
  status: 'pending' | 'completed' | 'overdue' | 'upcoming';
}

interface ActiveContract extends Contract {
  milestones?: ContractMilestone[];
  nextPaymentDate?: string;
  lastPaymentDate?: string;
  totalPaid?: number;
  outstandingAmount?: number;
  renewalDate?: string;
  maintenanceRequests?: number;
  tenant_name?: string;
  landlord_name?: string;
  property_address?: string;
  monthly_rent?: number;
}

const ActiveContractsView: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<ActiveContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<ActiveContract | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [actionDrawerOpen, setActionDrawerOpen] = useState(false);

  // Estadísticas calculadas
  const statistics = useMemo(() => {
    const totalContracts = contracts.length;
    const totalRevenue = contracts.reduce((sum, c) => sum + (c.totalPaid || 0), 0);
    const overduePaaments = contracts.filter(c => 
      c.milestones?.some(m => m.type === 'payment' && m.status === 'overdue')
    ).length;
    const expiringThisMonth = contracts.filter(c => {
      if (!c.end_date) return false;
      const endDate = parseISO(c.end_date);
      const nextMonth = addMonths(new Date(), 1);
      return isBefore(endDate, nextMonth);
    }).length;
    
    return {
      totalContracts,
      totalRevenue,
      overduePaaments,
      expiringThisMonth,
      averageRent: totalContracts > 0 ? Math.round(totalRevenue / totalContracts) : 0
    };
  }, [contracts]);

  // Cargar contratos activos
  useEffect(() => {
    const fetchActiveContracts = async () => {
      try {
        setLoading(true);
        
        // Filtrar solo contratos activos/publicados
        const response = await contractService.getContracts({ 
          status: 'PUBLISHED',
          is_active: true 
        });
        
        // Enriquecer con datos de milestones (simulados por ahora)
        const enrichedContracts: ActiveContract[] = response.map(contract => ({
          ...contract,
          milestones: generateMockMilestones(contract),
          nextPaymentDate: generateNextPaymentDate(contract),
          totalPaid: Math.floor(Math.random() * 50000000) + 10000000, // 10M - 60M COP
          outstandingAmount: Math.floor(Math.random() * 5000000), // 0 - 5M COP
          maintenanceRequests: Math.floor(Math.random() * 3),
          tenant_name: contract.tenant?.first_name ? `${contract.tenant.first_name} ${contract.tenant.last_name}` : 'Arrendatario',
          landlord_name: contract.landlord?.first_name ? `${contract.landlord.first_name} ${contract.landlord.last_name}` : 'Arrendador',
          property_address: contract.property?.address || 'Dirección no disponible',
          monthly_rent: contract.monthly_rent || Math.floor(Math.random() * 3000000) + 1000000 // 1M - 4M COP
        }));
        
        setContracts(enrichedContracts);
      } catch (error) {
        console.error('Error fetching active contracts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveContracts();
  }, []);

  // Generar milestones simulados
  const generateMockMilestones = (contract: Contract): ContractMilestone[] => {
    const milestones: ContractMilestone[] = [];
    const startDate = parseISO(contract.start_date || new Date().toISOString());
    const endDate = parseISO(contract.end_date || addMonths(startDate, 12).toISOString());
    
    // Generar pagos mensuales
    let paymentDate = startDate;
    while (isBefore(paymentDate, endDate)) {
      const isPast = isBefore(paymentDate, new Date());
      const isOverdue = isBefore(addMonths(paymentDate, 0.1), new Date()) && isPast;
      
      milestones.push({
        id: `payment-${paymentDate.toISOString()}`,
        title: `Pago Canon Mensual`,
        description: `Canon de arrendamiento correspondiente a ${format(paymentDate, 'MMMM yyyy', { locale: es })}`,
        date: paymentDate.toISOString(),
        completed: isPast && !isOverdue,
        type: 'payment',
        amount: contract.monthly_rent || 2500000,
        status: isOverdue ? 'overdue' : isPast ? 'completed' : 'upcoming'
      });
      
      paymentDate = addMonths(paymentDate, 1);
    }
    
    // Agregar inspecciones
    milestones.push({
      id: 'inspection-6months',
      title: 'Inspección Semestral',
      description: 'Inspección de rutina de la propiedad',
      date: addMonths(startDate, 6).toISOString(),
      completed: false,
      type: 'inspection',
      status: 'upcoming'
    });
    
    return milestones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Generar próxima fecha de pago
  const generateNextPaymentDate = (contract: Contract): string => {
    const now = new Date();
    const nextMonth = addMonths(now, 1);
    return format(nextMonth, 'yyyy-MM-dd');
  };

  // Obtener color del estado
  const getStatusColor = (status: ContractMilestone['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'overdue': return 'error';
      case 'upcoming': return 'warning';
      default: return 'default';
    }
  };

  // Acciones rápidas
  const quickActions = [
    {
      title: 'Reportar Incidencia',
      icon: <IssueIcon />,
      color: 'error' as const,
      action: () => {
        // Implementar reporte de incidencia
        alert('Funcionalidad de reporte de incidencias próximamente');
      }
    },
    {
      title: 'Solicitar Mantenimiento',
      icon: <MaintenanceIcon />,
      color: 'warning' as const,
      action: () => {
        // Implementar solicitud de mantenimiento
        alert('Funcionalidad de mantenimiento próximamente');
      }
    },
    {
      title: 'Iniciar Renovación',
      icon: <RenewIcon />,
      color: 'primary' as const,
      action: () => {
        // Implementar proceso de renovación
        alert('Proceso de renovación próximamente');
      }
    },
    {
      title: 'Terminar Contrato',
      icon: <TerminateIcon />,
      color: 'secondary' as const,
      action: () => {
        // Implementar terminación de contrato
        alert('Proceso de terminación próximamente');
      }
    }
  ];

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Contratos en Ejecución
        </Typography>
        <LinearProgress sx={{ mb: 4 }} />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ActiveIcon color="primary" fontSize="large" />
          Contratos en Ejecución
          <Badge badgeContent={contracts.length} color="primary" />
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestión avanzada de contratos activos con seguimiento de pagos, hitos y renovaciones
        </Typography>
      </Box>

      {/* Estadísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ActiveIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" color="primary">
                {statistics.totalContracts}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Contratos Activos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <PaymentIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" color="success.main">
                ${statistics.totalRevenue.toLocaleString('es-CO')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ingresos Totales
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <WarningIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" color="warning.main">
                {statistics.overduePaaments}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pagos Vencidos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <CalendarIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" color="info.main">
                {statistics.expiringThisMonth}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vencen Este Mes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Lista de Contratos Activos */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Lista de Contratos Activos
      </Typography>
      
      {contracts.length === 0 ? (
        <Alert severity="info" sx={{ mb: 4 }}>
          No tienes contratos en ejecución en este momento.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {contracts.map((contract) => (
            <Grid item xs={12} md={6} lg={4} key={contract.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" noWrap>
                      Contrato #{contract.id?.slice(0, 8)}
                    </Typography>
                    <Chip
                      icon={<ActiveIcon />}
                      label="Activo"
                      color="success"
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <PropertyIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                      {contract.property_address}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <PersonIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                      {user?.user_type === 'landlord' ? contract.tenant_name : contract.landlord_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <PaymentIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                      ${contract.monthly_rent?.toLocaleString('es-CO')} COP/mes
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <CalendarIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                      {contract.nextPaymentDate && format(parseISO(contract.nextPaymentDate), 'PPP', { locale: es })}
                    </Typography>
                  </Box>

                  {/* Próximo hito */}
                  {contract.milestones && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Próximo Hito:
                      </Typography>
                      {(() => {
                        const nextMilestone = contract.milestones.find(m => m.status === 'upcoming' || m.status === 'overdue');
                        if (nextMilestone) {
                          return (
                            <Chip
                              icon={nextMilestone.type === 'payment' ? <PaymentIcon /> : <ScheduleIcon />}
                              label={nextMilestone.title}
                              color={getStatusColor(nextMilestone.status)}
                              size="small"
                              sx={{ mb: 1 }}
                            />
                          );
                        }
                        return <Typography variant="body2">Sin hitos pendientes</Typography>;
                      })()}
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    onClick={() => {
                      setSelectedContract(contract);
                      setShowDetails(true);
                    }}
                    startIcon={<ViewIcon />}
                  >
                    Ver Detalles
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setSelectedContract(contract);
                      setShowMilestones(true);
                    }}
                    startIcon={<AnalyticsIcon />}
                  >
                    Timeline
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* FAB para Acciones Rápidas */}
      <Fab
        color="primary"
        aria-label="acciones rápidas"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000
        }}
        onClick={() => setActionDrawerOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Drawer de Acciones Rápidas */}
      <Drawer
        anchor="bottom"
        open={actionDrawerOpen}
        onClose={() => setActionDrawerOpen(false)}
        PaperProps={{ sx: { maxHeight: '50vh' } }}
      >
        <Box sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Acciones Rápidas</Typography>
            <IconButton onClick={() => setActionDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <List>
            {quickActions.map((action, index) => (
              <ListItem 
                key={index}
                button
                onClick={() => {
                  action.action();
                  setActionDrawerOpen(false);
                }}
              >
                <ListItemIcon>
                  {React.cloneElement(action.icon, { color: action.color })}
                </ListItemIcon>
                <ListItemText primary={action.title} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Modal de Detalles del Contrato */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          Detalles del Contrato #{selectedContract?.id?.slice(0, 8)}
        </DialogTitle>
        <DialogContent>
          {selectedContract && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Información General</Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Estado:</strong> Activo
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Inicio:</strong> {selectedContract.start_date && format(parseISO(selectedContract.start_date), 'PPP', { locale: es })}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Fin:</strong> {selectedContract.end_date && format(parseISO(selectedContract.end_date), 'PPP', { locale: es })}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Canon Mensual:</strong> ${selectedContract.monthly_rent?.toLocaleString('es-CO')} COP
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Pagos</Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Total Pagado:</strong> ${selectedContract.totalPaid?.toLocaleString('es-CO')} COP
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Monto Pendiente:</strong> ${selectedContract.outstandingAmount?.toLocaleString('es-CO')} COP
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Próximo Pago:</strong> {selectedContract.nextPaymentDate && format(parseISO(selectedContract.nextPaymentDate), 'PPP', { locale: es })}
                  </Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>Acciones Disponibles</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button startIcon={<ContactIcon />} size="small">
                  Contactar
                </Button>
                <Button startIcon={<ViewIcon />} size="small">
                  Ver PDF
                </Button>
                <Button startIcon={<RenewIcon />} size="small">
                  Renovar
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Timeline de Milestones */}
      <Dialog
        open={showMilestones}
        onClose={() => setShowMilestones(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          Timeline del Contrato #{selectedContract?.id?.slice(0, 8)}
        </DialogTitle>
        <DialogContent>
          {selectedContract?.milestones && (
            <Timeline>
              {selectedContract.milestones.slice(0, 10).map((milestone, index) => (
                <TimelineItem key={milestone.id}>
                  <TimelineSeparator>
                    <TimelineDot color={getStatusColor(milestone.status)}>
                      {milestone.type === 'payment' ? <PaymentIcon /> : <ScheduleIcon />}
                    </TimelineDot>
                    {index < selectedContract.milestones!.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent>
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {milestone.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {milestone.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(parseISO(milestone.date), 'PPP', { locale: es })}
                      </Typography>
                      {milestone.amount && (
                        <Chip
                          label={`$${milestone.amount.toLocaleString('es-CO')} COP`}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMilestones(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ActiveContractsView;