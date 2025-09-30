/**
 * Dashboard de Contratos para Arrendadores y Arrendatarios
 * Vista unificada que muestra contratos activos, pendientes y completados
 * Adapta la interfaz según el rol del usuario (landlord/tenant)
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
} from '@mui/icons-material';
import { format, differenceInDays, parseISO } from 'date-fns';
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`contracts-tabpanel-${index}`}
      aria-labelledby={`contracts-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const ContractsDashboard: React.FC = () => {
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
  
  // Estados del menú de acciones
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  
  // Estados de diálogos
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<LandlordControlledContractData | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [contractsResponse, statsResponse] = await Promise.all([
        LandlordContractService.getContracts(filters),
        LandlordContractService.getContractStatistics()
      ]);
      
      setContracts(contractsResponse.contracts);
      setStatistics(statsResponse);
    } catch (err: any) {
      setError('Error al cargar el dashboard: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  // Determinamos si el usuario es arrendador o arrendatario
  const isLandlord = user?.user_type === 'landlord';
  const userRole = isLandlord ? 'landlord' : 'tenant';

  // Filtramos contratos por estado y rol
  const contractsByState = useMemo(() => {
    return {
      active: contracts.filter(c => c.current_state === 'PUBLISHED'),
      pending: contracts.filter(c => ['DRAFT', 'TENANT_INVITED', 'TENANT_REVIEWING', 'LANDLORD_REVIEWING', 'OBJECTIONS_PENDING', 'BOTH_REVIEWING', 'READY_TO_SIGN'].includes(c.current_state)),
      completed: contracts.filter(c => c.current_state === 'FULLY_SIGNED'),
      all: contracts
    };
  }, [contracts]);

  // Configuración de pestañas
  const tabs = [
    { label: 'Todos', count: contractsByState.all.length, icon: <ContractIcon /> },
    { label: 'Activos', count: contractsByState.active.length, icon: <CompleteIcon /> },
    { label: 'Pendientes', count: contractsByState.pending.length, icon: <ScheduleIcon /> },
    { label: 'Completados', count: contractsByState.completed.length, icon: <CheckCircle /> }
  ];

  // Función para obtener el color del estado
  const getStateColor = (state: ContractWorkflowState): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    switch (state) {
      case 'PUBLISHED':
        return 'success';
      case 'FULLY_SIGNED':
        return 'success';
      case 'READY_TO_SIGN':
        return 'info';
      case 'OBJECTIONS_PENDING':
        return 'error';
      case 'TENANT_REVIEWING':
      case 'LANDLORD_REVIEWING':
      case 'BOTH_REVIEWING':
        return 'warning';
      case 'DRAFT':
        return 'default';
      default:
        return 'default';
    }
  };

  // Función para obtener el texto del estado
  const getStateText = (state: ContractWorkflowState): string => {
    const stateTexts = {
      'DRAFT': 'Borrador',
      'TENANT_INVITED': 'Arrendatario Invitado',
      'TENANT_REVIEWING': 'Revisión Arrendatario',
      'LANDLORD_REVIEWING': 'Revisión Arrendador',
      'OBJECTIONS_PENDING': 'Objeciones Pendientes',
      'BOTH_REVIEWING': 'Revisión Conjunta',
      'READY_TO_SIGN': 'Listo para Firmar',
      'FULLY_SIGNED': 'Completamente Firmado',
      'PUBLISHED': 'Publicado (Activo)',
      'EXPIRED': 'Expirado',
      'TERMINATED': 'Terminado',
      'CANCELLED': 'Cancelado'
    };
    return stateTexts[state] || state;
  };

  // Función para calcular días hasta expiración
  const getDaysUntilExpiration = (contract: LandlordControlledContractData): number | null => {
    if (!contract.end_date) return null;
    return differenceInDays(parseISO(contract.end_date), new Date());
  };

  // Función para determinar las acciones disponibles según el rol y estado
  const getAvailableActions = (contract: LandlordControlledContractData) => {
    const actions = [];
    
    // Acciones comunes
    actions.push({ id: 'view', label: 'Ver Detalles', icon: <ViewIcon /> });
    
    if (isLandlord) {
      // Acciones específicas del arrendador
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
            actions.push({ id: 'publish', label: 'Publicar Contrato', icon: <TrendingIcon /> });
          }
          break;
      }
    } else {
      // Acciones específicas del arrendatario
      switch (contract.current_state) {
        case 'TENANT_INVITED':
          actions.push({ id: 'accept', label: 'Aceptar Invitación', icon: <CompleteIcon /> });
          break;
        case 'TENANT_REVIEWING':
          actions.push({ id: 'complete_data', label: 'Completar Datos', icon: <PersonIcon /> });
          actions.push({ id: 'object', label: 'Presentar Objeciones', icon: <WarningIcon /> });
          break;
        case 'READY_TO_SIGN':
          if (!contract.tenant_signed) {
            actions.push({ id: 'sign', label: 'Firmar Contrato', icon: <SignIcon /> });
          }
          break;
      }
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
          setSelectedContract(contract);
          setViewDialogOpen(true);
          break;
        case 'edit':
          // Redirigir a edición del contrato
          window.location.href = `/contracts/landlord/edit/${contract.id}`;
          break;
        case 'invite':
          // Abrir modal de invitación
          // TODO: Implementar modal de invitación
          break;
        case 'sign':
          // Redirigir a firma biométrica
          window.location.href = `/contracts/sign/${contract.id}`;
          break;
        case 'approve':
          await LandlordContractService.approveContract({ contract_id: contract.id! });
          await loadDashboardData();
          break;
        case 'publish':
          await LandlordContractService.publishContract({ contract_id: contract.id! });
          await loadDashboardData();
          break;
        default:
          console.log(`Acción ${actionId} no implementada aún`);
      }
    } catch (err: any) {
      setError('Error al ejecutar acción: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  // Función para renderizar una tarjeta de contrato
  const renderContractCard = (contract: LandlordControlledContractData) => {
    const daysUntilExpiration = getDaysUntilExpiration(contract);
    const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 30;
    const availableActions = getAvailableActions(contract);

    return (
      <Card key={contract.id} elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          {/* Header con estado y acciones */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
            <Box>
              <Chip
                label={getStateText(contract.current_state)}
                color={getStateColor(contract.current_state)}
                size="small"
                sx={{ mb: 1 }}
              />
              {isExpiringSoon && (
                <Chip
                  label={`Expira en ${daysUntilExpiration} días`}
                  color="warning"
                  size="small"
                  icon={<WarningIcon />}
                  sx={{ ml: 1, mb: 1 }}
                />
              )}
            </Box>
            
            <IconButton
              size="small"
              onClick={(e) => handleActionClick(e, contract.id!)}
              disabled={availableActions.length === 0}
            >
              <MoreIcon />
            </IconButton>
          </Box>

          {/* Información de la propiedad */}
          <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, mr: 1, fontSize: 14 }}>
              {contract.property_type === 'apartamento' ? '🏢' : '🏠'}
            </Avatar>
            {contract.property_address}
          </Typography>

          {/* Información del contrato */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <strong>Contrato:</strong> {contract.contract_number || `#${contract.id?.slice(0, 8)}`}
          </Typography>

          {/* Información de las partes */}
          <Box sx={{ mb: 2 }}>
            {isLandlord ? (
              // Vista del arrendador - mostrar información del arrendatario
              contract.tenant_data ? (
                <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 24, height: 24, mr: 1, fontSize: 12 }}>
                    <TenantIcon />
                  </Avatar>
                  <Typography variant="body2">
                    <strong>Arrendatario:</strong> {contract.tenant_data.full_name}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  <strong>Arrendatario:</strong> {contract.tenant_email || 'Pendiente de invitación'}
                </Typography>
              )
            ) : (
              // Vista del arrendatario - mostrar información del arrendador
              <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 24, height: 24, mr: 1, fontSize: 12 }}>
                  <LandlordIcon />
                </Avatar>
                <Typography variant="body2">
                  <strong>Arrendador:</strong> {contract.landlord_data.full_name}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Información económica */}
          <Box display="flex" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Canon Mensual
              </Typography>
              <Typography variant="h6" color="success.main">
                ${contract.monthly_rent.toLocaleString('es-CO')}
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography variant="caption" color="text.secondary">
                Duración
              </Typography>
              <Typography variant="body1">
                {contract.contract_duration_months} meses
              </Typography>
            </Box>
          </Box>

          {/* Fechas importantes */}
          {contract.start_date && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <CalendarIcon sx={{ fontSize: 14, mr: 0.5 }} />
              <strong>Inicio:</strong> {format(parseISO(contract.start_date), 'PPP', { locale: es })}
            </Typography>
          )}

          {contract.end_date && (
            <Typography variant="body2" color="text.secondary">
              <CalendarIcon sx={{ fontSize: 14, mr: 0.5 }} />
              <strong>Finalización:</strong> {format(parseISO(contract.end_date), 'PPP', { locale: es })}
            </Typography>
          )}
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Button
            size="small"
            startIcon={<ViewIcon />}
            onClick={() => {
              setSelectedContract(contract);
              setViewDialogOpen(true);
            }}
          >
            Ver Detalles
          </Button>
          
          {availableActions.length > 1 && (
            <Button
              size="small"
              color="primary"
              onClick={(e) => handleActionClick(e, contract.id!)}
            >
              Acciones ({availableActions.length})
            </Button>
          )}
        </CardActions>
      </Card>
    );
  };

  // Función para renderizar las estadísticas
  const renderStatistics = () => {
    if (!statistics) return null;

    const statCards = [
      {
        title: 'Total Contratos',
        value: statistics.total_contracts,
        icon: <ContractIcon />,
        color: 'primary'
      },
      {
        title: 'Contratos Activos',
        value: statistics.by_state.PUBLISHED || 0,
        icon: <CompleteIcon />,
        color: 'success'
      },
      {
        title: 'Pendientes de Firma',
        value: statistics.pending_signatures,
        icon: <SignIcon />,
        color: 'warning'
      },
      {
        title: 'Ingresos Mensuales',
        value: `$${statistics.monthly_income.toLocaleString('es-CO')}`,
        icon: <MoneyIcon />,
        color: 'info'
      }
    ];

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" color={`${stat.color}.main`}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${stat.color}.main` }}>
                    {stat.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  // Función para obtener los contratos de la pestaña actual
  const getCurrentTabContracts = (): LandlordControlledContractData[] => {
    switch (selectedTab) {
      case 0: return contractsByState.all;
      case 1: return contractsByState.active;
      case 2: return contractsByState.pending;
      case 3: return contractsByState.completed;
      default: return contractsByState.all;
    }
  };

  if (loading) {
    return <LoadingSpinner message="Cargando dashboard de contratos..." />;
  }

  return (
    <Container maxWidth="xl">
      <Box py={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>
              {isLandlord ? '🏢 Dashboard de Arrendador' : '🏠 Dashboard de Arrendatario'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gestiona todos tus contratos de arrendamiento en un solo lugar
            </Typography>
          </Box>
          
          <Box display="flex" gap={1}>
            <Tooltip title="Actualizar datos">
              <IconButton onClick={loadDashboardData} disabled={loading}>
                <TrendingIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Ver estadísticas">
              <IconButton>
                <StatsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Estadísticas */}
        {renderStatistics()}

        {/* Pestañas */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={selectedTab} onChange={handleTabChange} aria-label="contract tabs">
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    {tab.icon}
                    {tab.label}
                    <Badge badgeContent={tab.count} color="primary" />
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        {/* Contenido de las pestañas */}
        <TabPanel value={selectedTab} index={selectedTab}>
          {getCurrentTabContracts().length === 0 ? (
            <Box textAlign="center" py={8}>
              <Avatar sx={{ bgcolor: 'grey.100', width: 80, height: 80, mx: 'auto', mb: 2 }}>
                <ContractIcon sx={{ fontSize: 40, color: 'grey.400' }} />
              </Avatar>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No hay contratos en esta categoría
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isLandlord 
                  ? 'Crea tu primer contrato para comenzar a gestionar tus arriendos'
                  : 'Aún no tienes contratos en esta categoría'
                }
              </Typography>
              {isLandlord && selectedTab === 0 && (
                <Button
                  variant="contained"
                  sx={{ mt: 2 }}
                  onClick={() => window.location.href = '/contracts/landlord/create'}
                >
                  Crear Primer Contrato
                </Button>
              )}
            </Box>
          ) : (
            <Grid container spacing={3}>
              {getCurrentTabContracts().map(contract => (
                <Grid item xs={12} md={6} lg={4} key={contract.id}>
                  {renderContractCard(contract)}
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

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

        {/* Diálogo de vista detallada */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Detalles del Contrato
          </DialogTitle>
          <DialogContent>
            {selectedContract && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {selectedContract.property_address}
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Estado Actual
                    </Typography>
                    <Chip
                      label={getStateText(selectedContract.current_state)}
                      color={getStateColor(selectedContract.current_state)}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Canon Mensual
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      ${selectedContract.monthly_rent.toLocaleString('es-CO')}
                    </Typography>
                  </Grid>
                  
                  {selectedContract.tenant_data && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Información del Arrendatario
                      </Typography>
                      <Typography variant="body2">
                        <strong>Nombre:</strong> {selectedContract.tenant_data.full_name}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Email:</strong> {selectedContract.tenant_data.email}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Teléfono:</strong> {selectedContract.tenant_data.phone}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ContractsDashboard;