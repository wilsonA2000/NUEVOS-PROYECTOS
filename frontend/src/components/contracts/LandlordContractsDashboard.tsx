/**
 * Dashboard Especializado para Arrendadores
 * Vista avanzada de gestión con métricas, análisis y herramientas de administración
 * Incluye gestión de contratos, invitaciones, análisis financiero y reportes
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
  Tab,
  Tabs,
  IconButton,
  Badge,
  Alert,
  LinearProgress,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  InputLabel,
  Fab,
} from '@mui/material';
import {
  Business as LandlordIcon,
  Home as TenantIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon,
  Assignment as ContractIcon,
  CheckCircle as CompleteIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Send as SendIcon,
  Draw as SignIcon,
  MoreVert as MoreIcon,
  Notifications as NotificationIcon,
  TrendingUp as TrendingIcon,
  Assessment as StatsIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Add as AddIcon,
  Dashboard as DashboardIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Analytics as AnalyticsIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

import { LandlordContractService } from '../../services/landlordContractService';
import { 
  LandlordControlledContractData, 
  ContractWorkflowState, 
  ContractFilters,
  ContractStatistics 
} from '../../types/landlordContract';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';
import TenantInvitationSystem from './TenantInvitationSystem';

interface MetricCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

const LandlordContractsDashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<LandlordControlledContractData[]>([]);
  const [statistics, setStatistics] = useState<ContractStatistics | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [error, setError] = useState<string>('');
  
  // Estados de filtrado y búsqueda
  const [filters, setFilters] = useState<ContractFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<ContractWorkflowState | ''>('');
  const [sortBy, setSortBy] = useState<'date' | 'rent' | 'state'>('date');
  
  // Estados del menú de acciones
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  
  // Estados de diálogos
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  useEffect(() => {
    loadLandlordData();
  }, [filters, stateFilter]);

  const loadLandlordData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const searchFilters: ContractFilters = {
        ...filters,
        landlord_id: user?.id,
        ...(stateFilter && { state: [stateFilter] }),
        ...(searchQuery && { search_query: searchQuery })
      };
      
      const [contractsResponse, statsResponse] = await Promise.all([
        LandlordContractService.getContracts(searchFilters),
        LandlordContractService.getContractStatistics()
      ]);
      
      setContracts(contractsResponse.contracts);
      setStatistics(statsResponse);
    } catch (err: any) {
      setError('Error al cargar dashboard: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  // Filtrar contratos por pestaña
  const contractsByCategory = useMemo(() => {
    const sorted = [...contracts].sort((a, b) => {
      switch (sortBy) {
        case 'rent':
          return b.monthly_rent - a.monthly_rent;
        case 'state':
          return a.current_state.localeCompare(b.current_state);
        case 'date':
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });

    return {
      draft: sorted.filter(c => c.current_state === 'DRAFT'),
      pending: sorted.filter(c => ['TENANT_INVITED', 'TENANT_REVIEWING', 'LANDLORD_REVIEWING', 'OBJECTIONS_PENDING', 'BOTH_REVIEWING'].includes(c.current_state)),
      ready: sorted.filter(c => c.current_state === 'READY_TO_SIGN' || c.current_state === 'FULLY_SIGNED'),
      active: sorted.filter(c => c.current_state === 'PUBLISHED'),
      all: sorted
    };
  }, [contracts, sortBy]);

  // Métricas para las tarjetas del dashboard
  const metrics: MetricCard[] = useMemo(() => {
    if (!statistics) return [];

    const totalRevenue = statistics.monthly_income;
    const avgRent = statistics.average_rent;
    const occupancyRate = statistics.occupancy_rate;

    return [
      {
        title: 'Ingresos Mensuales',
        value: `$${totalRevenue.toLocaleString('es-CO')}`,
        subtitle: 'COP/mes',
        icon: <MoneyIcon />,
        color: 'success',
        trend: { value: 12.5, direction: 'up' }
      },
      {
        title: 'Contratos Activos',
        value: statistics.by_state.PUBLISHED || 0,
        subtitle: `de ${statistics.total_contracts} total`,
        icon: <CompleteIcon />,
        color: 'primary'
      },
      {
        title: 'Canon Promedio',
        value: `$${avgRent.toLocaleString('es-CO')}`,
        subtitle: 'COP/mes',
        icon: <AnalyticsIcon />,
        color: 'info'
      },
      {
        title: 'Tasa de Ocupación',
        value: `${occupancyRate.toFixed(1)}%`,
        subtitle: 'de propiedades',
        icon: <PieChartIcon />,
        color: occupancyRate >= 80 ? 'success' : occupancyRate >= 60 ? 'warning' : 'error',
        trend: { value: 5.2, direction: 'up' }
      },
      {
        title: 'Pendientes de Firma',
        value: statistics.pending_signatures,
        subtitle: 'requieren atención',
        icon: <SignIcon />,
        color: 'warning'
      },
      {
        title: 'Objeciones Activas',
        value: statistics.objections_pending,
        subtitle: 'por resolver',
        icon: <WarningIcon />,
        color: statistics.objections_pending > 0 ? 'error' : 'success'
      }
    ];
  }, [statistics]);

  // Configuración de pestañas
  const tabs = [
    { label: 'Todos', count: contractsByCategory.all.length, color: 'default' },
    { label: 'Borradores', count: contractsByCategory.draft.length, color: 'default' },
    { label: 'En Proceso', count: contractsByCategory.pending.length, color: 'warning' },
    { label: 'Listos/Firmados', count: contractsByCategory.ready.length, color: 'info' },
    { label: 'Activos', count: contractsByCategory.active.length, color: 'success' }
  ];

  // Obtener contratos de la pestaña actual
  const getCurrentTabContracts = (): LandlordControlledContractData[] => {
    switch (selectedTab) {
      case 0: return contractsByCategory.all;
      case 1: return contractsByCategory.draft;
      case 2: return contractsByCategory.pending;
      case 3: return contractsByCategory.ready;
      case 4: return contractsByCategory.active;
      default: return contractsByCategory.all;
    }
  };

  // Obtener color del estado
  const getStateColor = (state: ContractWorkflowState): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    switch (state) {
      case 'PUBLISHED': return 'success';
      case 'FULLY_SIGNED': return 'success';
      case 'READY_TO_SIGN': return 'info';
      case 'OBJECTIONS_PENDING': return 'error';
      case 'TENANT_REVIEWING':
      case 'LANDLORD_REVIEWING':
      case 'BOTH_REVIEWING': return 'warning';
      case 'DRAFT': return 'default';
      default: return 'default';
    }
  };

  // Obtener texto del estado
  const getStateText = (state: ContractWorkflowState): string => {
    const stateTexts = {
      'DRAFT': 'Borrador',
      'TENANT_INVITED': 'Arrendatario Invitado',
      'TENANT_REVIEWING': 'En Revisión (Arrendatario)',
      'LANDLORD_REVIEWING': 'En Revisión (Arrendador)',
      'OBJECTIONS_PENDING': 'Objeciones Pendientes',
      'BOTH_REVIEWING': 'Revisión Conjunta',
      'READY_TO_SIGN': 'Listo para Firmar',
      'FULLY_SIGNED': 'Completamente Firmado',
      'PUBLISHED': 'Activo',
      'EXPIRED': 'Expirado',
      'TERMINATED': 'Terminado',
      'CANCELLED': 'Cancelado'
    };
    return stateTexts[state] || state;
  };

  // Obtener acciones disponibles para un contrato
  const getAvailableActions = (contract: LandlordControlledContractData) => {
    const actions = [];
    
    actions.push({ id: 'view', label: 'Ver Detalles', icon: <ViewIcon /> });
    
    switch (contract.current_state) {
      case 'DRAFT':
        actions.push({ id: 'edit', label: 'Editar', icon: <EditIcon /> });
        actions.push({ id: 'invite', label: 'Invitar Arrendatario', icon: <SendIcon /> });
        break;
      case 'TENANT_INVITED':
        actions.push({ id: 'resend', label: 'Reenviar Invitación', icon: <EmailIcon /> });
        break;
      case 'LANDLORD_REVIEWING':
        actions.push({ id: 'review', label: 'Revisar Datos', icon: <ViewIcon /> });
        actions.push({ id: 'approve', label: 'Aprobar', icon: <CompleteIcon /> });
        break;
      case 'READY_TO_SIGN':
        if (!contract.landlord_signed) {
          actions.push({ id: 'sign', label: 'Firmar Contrato', icon: <SignIcon /> });
        }
        break;
      case 'FULLY_SIGNED':
        if (!contract.published) {
          actions.push({ id: 'publish', label: 'Publicar', icon: <TrendingIcon /> });
        }
        break;
      case 'PUBLISHED':
        actions.push({ id: 'analytics', label: 'Ver Análisis', icon: <AnalyticsIcon /> });
        actions.push({ id: 'download', label: 'Descargar PDF', icon: <DownloadIcon /> });
        break;
    }
    
    return actions;
  };

  // Manejo de acciones
  const handleActionClick = (event: React.MouseEvent<HTMLElement>, contractId: string) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedContractId(contractId);
  };

  const handleActionSelect = async (actionId: string) => {
    setActionMenuAnchor(null);
    
    const contract = contracts.find(c => c.id === selectedContractId);
    if (!contract) return;

    try {
      switch (actionId) {
        case 'view':
          window.location.href = `/contracts/landlord/view/${contract.id}`;
          break;
        case 'edit':
          window.location.href = `/contracts/landlord/edit/${contract.id}`;
          break;
        case 'invite':
          setInviteDialogOpen(true);
          break;
        case 'sign':
          window.location.href = `/contracts/sign/${contract.id}`;
          break;
        case 'approve':
          await LandlordContractService.approveContract({ contract_id: contract.id! });
          await loadLandlordData();
          break;
        case 'publish':
          await LandlordContractService.publishContract({ contract_id: contract.id! });
          await loadLandlordData();
          break;
        case 'analytics':
          setAnalyticsDialogOpen(true);
          break;
        case 'download':
          // TODO: Implementar descarga de PDF
          break;
        default:
          console.log(`Acción ${actionId} no implementada`);
      }
    } catch (err: any) {
      setError('Error al ejecutar acción: ' + (err.message || 'Error desconocido'));
    }
  };

  // Renderizar tarjeta de métrica
  const renderMetricCard = (metric: MetricCard, index: number) => (
    <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
      <Card elevation={2} sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Avatar sx={{ bgcolor: `${metric.color}.main`, width: 40, height: 40 }}>
              {metric.icon}
            </Avatar>
            {metric.trend && (
              <Chip
                label={`${metric.trend.direction === 'up' ? '+' : '-'}${metric.trend.value}%`}
                color={metric.trend.direction === 'up' ? 'success' : 'error'}
                size="small"
              />
            )}
          </Box>
          <Typography variant="h5" color={`${metric.color}.main`} sx={{ fontWeight: 600 }}>
            {metric.value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {metric.title}
          </Typography>
          {metric.subtitle && (
            <Typography variant="caption" color="text.secondary">
              {metric.subtitle}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grid>
  );

  // Renderizar fila de tabla de contrato
  const renderContractRow = (contract: LandlordControlledContractData) => {
    const daysUntilExpiration = contract.end_date ? differenceInDays(parseISO(contract.end_date), new Date()) : null;
    const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 30;
    const actions = getAvailableActions(contract);

    return (
      <TableRow key={contract.id} hover>
        <TableCell>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {contract.property_address}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {contract.contract_number || `#${contract.id?.slice(0, 8)}`}
            </Typography>
          </Box>
        </TableCell>
        
        <TableCell>
          <Chip
            label={getStateText(contract.current_state)}
            color={getStateColor(contract.current_state)}
            size="small"
          />
          {isExpiringSoon && (
            <Chip
              label={`${daysUntilExpiration}d`}
              color="warning"
              size="small"
              sx={{ ml: 0.5 }}
            />
          )}
        </TableCell>
        
        <TableCell>
          {contract.tenant_data ? (
            <Box>
              <Typography variant="body2">
                {contract.tenant_data.full_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {contract.tenant_data.email}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {contract.tenant_email || 'Sin invitar'}
            </Typography>
          )}
        </TableCell>
        
        <TableCell align="right">
          <Typography variant="body2" color="success.main" sx={{ fontWeight: 500 }}>
            ${contract.monthly_rent.toLocaleString('es-CO')}
          </Typography>
        </TableCell>
        
        <TableCell>
          {contract.created_at && (
            <Typography variant="body2">
              {format(parseISO(contract.created_at), 'PPP', { locale: es })}
            </Typography>
          )}
        </TableCell>
        
        <TableCell align="right">
          <IconButton
            size="small"
            onClick={(e) => handleActionClick(e, contract.id!)}
            disabled={actions.length === 0}
          >
            <MoreIcon />
          </IconButton>
        </TableCell>
      </TableRow>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Cargando dashboard de arrendador..." />;
  }

  return (
    <Container maxWidth="xl">
      <Box py={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>
              🏢 Dashboard de Arrendador
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gestión avanzada de contratos de arrendamiento
            </Typography>
          </Box>
          
          <Box display="flex" gap={1}>
            <Tooltip title="Actualizar datos">
              <IconButton onClick={loadLandlordData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Button
              variant="outlined"
              startIcon={<AnalyticsIcon />}
              onClick={() => setAnalyticsDialogOpen(true)}
            >
              Análisis
            </Button>
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Nuevo Contrato
            </Button>
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Métricas principales */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {metrics.map((metric, index) => renderMetricCard(metric, index))}
        </Grid>

        {/* Controles de filtrado */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por dirección, arrendatario..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={stateFilter}
                    label="Estado"
                    onChange={(e) => setStateFilter(e.target.value as ContractWorkflowState)}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="DRAFT">Borradores</MenuItem>
                    <MenuItem value="TENANT_INVITED">Invitados</MenuItem>
                    <MenuItem value="TENANT_REVIEWING">En Revisión</MenuItem>
                    <MenuItem value="READY_TO_SIGN">Listos para Firmar</MenuItem>
                    <MenuItem value="PUBLISHED">Activos</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Ordenar por</InputLabel>
                  <Select
                    value={sortBy}
                    label="Ordenar por"
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'rent' | 'state')}
                  >
                    <MenuItem value="date">Fecha de Creación</MenuItem>
                    <MenuItem value="rent">Canon de Arrendamiento</MenuItem>
                    <MenuItem value="state">Estado</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={loadLandlordData}
                >
                  Aplicar
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Pestañas */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={selectedTab} 
            onChange={(e, newValue) => setSelectedTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    {tab.label}
                    <Badge badgeContent={tab.count} color="primary" />
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        {/* Tabla de contratos */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Propiedad</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Arrendatario</TableCell>
                  <TableCell align="right">Canon</TableCell>
                  <TableCell>Creado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getCurrentTabContracts().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Box textAlign="center" py={4}>
                        <Typography variant="body2" color="text.secondary">
                          No hay contratos en esta categoría
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  getCurrentTabContracts().map(contract => renderContractRow(contract))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Botón flotante para crear contrato */}
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setCreateDialogOpen(true)}
        >
          <AddIcon />
        </Fab>

        {/* Menú de acciones */}
        <Menu
          anchorEl={actionMenuAnchor}
          open={Boolean(actionMenuAnchor)}
          onClose={() => setActionMenuAnchor(null)}
        >
          {selectedContractId && 
            getAvailableActions(contracts.find(c => c.id === selectedContractId)!).map((action) => (
              <MenuItem key={action.id} onClick={() => handleActionSelect(action.id)}>
                <ListItemIcon>
                  {action.icon}
                </ListItemIcon>
                <ListItemText>{action.label}</ListItemText>
              </MenuItem>
            ))
          }
        </Menu>

        {/* Diálogo de crear contrato */}
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Crear Nuevo Contrato</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              ¿Deseas crear un nuevo contrato desde cero o usar una plantilla?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setCreateDialogOpen(false);
                window.location.href = '/contracts/landlord/template';
              }}
            >
              Usar Plantilla
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setCreateDialogOpen(false);
                window.location.href = '/contracts/landlord/create';
              }}
            >
              Crear desde Cero
            </Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo de análisis */}
        <Dialog
          open={analyticsDialogOpen}
          onClose={() => setAnalyticsDialogOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Análisis y Reportes</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Funcionalidad de análisis y reportes en desarrollo...
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAnalyticsDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default LandlordContractsDashboard;