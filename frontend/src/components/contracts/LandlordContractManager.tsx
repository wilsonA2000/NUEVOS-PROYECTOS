/**
 * Panel de Gestión de Contratos del Arrendador
 * Sistema completo para que los arrendadores gestionen sus contratos
 * Integra con el backend de workflow de contratos
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Tab,
  Tabs,
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
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Alert,
  LinearProgress,
  Badge,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Fab,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Send as SendIcon,
  Visibility as ViewIcon,
  Assignment as ContractIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  MoreVert as MoreIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Notifications as NotificationIcon,
  Dashboard as DashboardIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

import { LandlordContractService } from '../../services/landlordContractService';
import {
  LandlordControlledContractData,
  ContractWorkflowState,
  ContractFilters,
  ContractStatistics,
  ContractWorkflowHistory,
} from '../../types/landlordContract';
import { LoadingButton } from '../common/LoadingButton';
import { CustomNotification } from '../common/CustomNotification';

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
      id={`contract-tabpanel-${index}`}
      aria-labelledby={`contract-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const STATE_COLORS: Record<ContractWorkflowState, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  'DRAFT': 'default',
  'TENANT_INVITED': 'info',
  'TENANT_REVIEWING': 'warning',
  'LANDLORD_REVIEWING': 'primary',
  'OBJECTIONS_PENDING': 'error',
  'BOTH_REVIEWING': 'warning',
  'READY_TO_SIGN': 'primary',
  'FULLY_SIGNED': 'success',
  'PUBLISHED': 'success',
  'EXPIRED': 'error',
  'TERMINATED': 'error',
  'CANCELLED': 'default',
};

const STATE_LABELS: Record<ContractWorkflowState, string> = {
  'DRAFT': 'Borrador',
  'TENANT_INVITED': 'Invitado',
  'TENANT_REVIEWING': 'En Revisión',
  'LANDLORD_REVIEWING': 'Por Aprobar',
  'OBJECTIONS_PENDING': 'Con Objeciones',
  'BOTH_REVIEWING': 'Revisión Final',
  'READY_TO_SIGN': 'Por Firmar',
  'FULLY_SIGNED': 'Firmado',
  'PUBLISHED': 'Activo',
  'EXPIRED': 'Expirado',
  'TERMINATED': 'Terminado',
  'CANCELLED': 'Cancelado',
};

export const LandlordContractManager: React.FC = () => {
  // Estado principal
  const [currentTab, setCurrentTab] = useState(0);
  const [contracts, setContracts] = useState<LandlordControlledContractData[]>([]);
  const [statistics, setStatistics] = useState<ContractStatistics | null>(null);
  const [recentActivity, setRecentActivity] = useState<ContractWorkflowHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estado de filtros y paginación
  const [filters, setFilters] = useState<ContractFilters>({});
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Estado de diálogos y menús
  const [selectedContract, setSelectedContract] = useState<LandlordControlledContractData | null>(null);
  const [contractDetailDialog, setContractDetailDialog] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionMenuContract, setActionMenuContract] = useState<LandlordControlledContractData | null>(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);

  // Estado de dashboard
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Cargar datos iniciales
  useEffect(() => {
    loadDashboardData();
    loadContracts();
    loadRecentActivity();
  }, []);

  // Cargar contratos cuando cambian filtros o página
  useEffect(() => {
    loadContracts();
  }, [filters, page, searchQuery]);

  const loadDashboardData = async () => {
    try {
      const [dashboardResponse, statisticsResponse] = await Promise.all([
        LandlordContractService.getLandlordDashboard(),
        LandlordContractService.getLandlordStatistics(),
      ]);
      setDashboardData(dashboardResponse);
      setStatistics(statisticsResponse);
    } catch (err: any) {
      setError('Error al cargar datos del dashboard: ' + (err.message || 'Error desconocido'));
    }
  };

  const loadContracts = async () => {
    try {
      setLoading(true);
      const response = await LandlordContractService.getLandlordContracts(
        { ...filters, search_query: searchQuery || undefined },
        page,
        10
      );
      setContracts(response.contracts);
      setTotalCount(response.total_count);
    } catch (err: any) {
      setError('Error al cargar contratos: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const activity = await LandlordContractService.getRecentActivity(5);
      setRecentActivity(activity);
    } catch (err: any) {
      console.error('Error loading recent activity:', err);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleContractAction = async (action: string, contract: LandlordControlledContractData) => {
    try {
      setLoading(true);
      let result;

      switch (action) {
        case 'send_invitation':
          if (!contract.tenant_email) {
            setError('Debe especificar el email del arrendatario antes de enviar la invitación');
            return;
          }
          result = await LandlordContractService.sendTenantInvitation({
            contract_id: contract.id!,
            tenant_email: contract.tenant_email,
          });
          setSuccess('Invitación enviada exitosamente');
          break;

        case 'approve':
          result = await LandlordContractService.approveLandlordContract({
            contract_id: contract.id!,
          });
          setSuccess('Contrato aprobado exitosamente');
          break;

        case 'sign':
          // Implementar lógica de firma digital
          setError('Función de firma digital pendiente de implementar');
          return;

        case 'publish':
          result = await LandlordContractService.publishContract({
            contract_id: contract.id!,
          });
          setSuccess('Contrato publicado exitosamente');
          break;

        case 'download':
          const blob = await LandlordContractService.downloadSignedContract(contract.id!);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `contrato-${contract.contract_number}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          setSuccess('Contrato descargado exitosamente');
          return;

        case 'resend_invitation':
          result = await LandlordContractService.resendTenantInvitation(contract.id!);
          setSuccess('Invitación reenviada exitosamente');
          break;

        default:
          setError('Acción no reconocida');
          return;
      }

      // Recargar datos después de la acción
      await loadContracts();
      await loadDashboardData();
      setActionMenuAnchor(null);

    } catch (err: any) {
      setError('Error al ejecutar acción: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const getContractNextAction = (contract: LandlordControlledContractData): string => {
    return LandlordContractService.getNextRequiredAction(contract, 'landlord');
  };

  const getAvailableActions = (contract: LandlordControlledContractData): string[] => {
    const actions: string[] = [];

    switch (contract.current_state) {
      case 'DRAFT':
        if (contract.tenant_email) {
          actions.push('send_invitation');
        }
        actions.push('edit');
        break;
      case 'TENANT_INVITED':
        actions.push('resend_invitation');
        break;
      case 'LANDLORD_REVIEWING':
        actions.push('approve');
        break;
      case 'READY_TO_SIGN':
        if (!contract.landlord_signed) {
          actions.push('sign');
        }
        break;
      case 'FULLY_SIGNED':
        actions.push('publish');
        break;
      case 'PUBLISHED':
        actions.push('download');
        break;
    }

    actions.push('view');
    return actions;
  };

  const renderDashboard = () => (
    <Box>
      {/* Estadísticas rápidas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {dashboardData?.active_contracts || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Contratos Activos
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <ContractIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {dashboardData?.pending_signatures || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Pendientes de Firma
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <ScheduleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {LandlordContractService.formatCurrency(dashboardData?.monthly_income || 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Ingresos Mensuales
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <MoneyIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {dashboardData?.expiring_contracts || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Por Vencer
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <WarningIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Actividad reciente */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <NotificationIcon sx={{ mr: 1 }} />
            Actividad Reciente
          </Typography>
          {recentActivity.length > 0 ? (
            <List>
              {recentActivity.map((activity, index) => (
                <ListItem key={activity.id || index} divider>
                  <ListItemIcon>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                      <ContractIcon fontSize="small" />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.description}
                    secondary={format(new Date(activity.created_at), 'PPpp', { locale: es })}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">No hay actividad reciente</Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  const renderContractsList = () => (
    <Box>
      {/* Toolbar de acciones */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6">
          Mis Contratos ({totalCount})
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
          >
            Filtros
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadContracts}
          >
            Actualizar
          </Button>
        </Box>
      </Box>

      {/* Lista de contratos */}
      {loading ? (
        <Box sx={{ width: '100%' }}>
          <LinearProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Contrato</TableCell>
                <TableCell>Propiedad</TableCell>
                <TableCell>Arrendatario</TableCell>
                <TableCell align="right">Canon</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Próxima Acción</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow key={contract.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {contract.contract_number || 'Sin número'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {contract.created_at && format(new Date(contract.created_at), 'PP', { locale: es })}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{contract.property_address}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {contract.property_type}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {contract.tenant_data?.full_name || contract.tenant_email || 'Sin asignar'}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      {LandlordContractService.formatCurrency(contract.monthly_rent)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATE_LABELS[contract.current_state]}
                      color={STATE_COLORS[contract.current_state]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {getContractNextAction(contract)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      onClick={(e) => {
                        setActionMenuAnchor(e.currentTarget);
                        setActionMenuContract(contract);
                      }}
                    >
                      <MoreIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const renderReports = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Reportes y Estadísticas
      </Typography>
      
      {statistics && (
        <Grid container spacing={3}>
          {/* Distribución por estado */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Contratos por Estado
                </Typography>
                {Object.entries(statistics.by_state).map(([state, count]) => (
                  <Box key={state} sx={{ mb: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">
                        {STATE_LABELS[state as ContractWorkflowState]}
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {count}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(count / statistics.total_contracts) * 100}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Métricas financieras */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Métricas Financieras
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Canon Promedio
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {LandlordContractService.formatCurrency(statistics.average_rent)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Valor Total de Contratos
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {LandlordContractService.formatCurrency(statistics.total_rent_value)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Tasa de Ocupación
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {statistics.occupancy_rate}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
          Gestión de Contratos
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Administra todos tus contratos de arrendamiento de manera profesional
        </Typography>
      </Box>

      {/* Tabs de navegación */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab
            label="Dashboard"
            icon={<DashboardIcon />}
            iconPosition="start"
          />
          <Tab
            label="Mis Contratos"
            icon={<ContractIcon />}
            iconPosition="start"
          />
          <Tab
            label="Reportes"
            icon={<ReceiptIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Contenido de las tabs */}
      <TabPanel value={currentTab} index={0}>
        {renderDashboard()}
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        {renderContractsList()}
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        {renderReports()}
      </TabPanel>

      {/* FAB para crear nuevo contrato */}
      <Fab
        color="primary"
        aria-label="Crear contrato"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => {
          // Navegar a crear nuevo contrato
          window.location.href = '/contracts/create';
        }}
      >
        <AddIcon />
      </Fab>

      {/* Menú de acciones del contrato */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
      >
        {actionMenuContract && getAvailableActions(actionMenuContract).map((action) => (
          <MenuItem
            key={action}
            onClick={() => handleContractAction(action, actionMenuContract)}
          >
            {action === 'view' && <ViewIcon sx={{ mr: 1 }} />}
            {action === 'edit' && <EditIcon sx={{ mr: 1 }} />}
            {action === 'send_invitation' && <SendIcon sx={{ mr: 1 }} />}
            {action === 'approve' && <CheckIcon sx={{ mr: 1 }} />}
            {action === 'sign' && <EditIcon sx={{ mr: 1 }} />}
            {action === 'publish' && <CheckIcon sx={{ mr: 1 }} />}
            {action === 'download' && <DownloadIcon sx={{ mr: 1 }} />}
            {action === 'resend_invitation' && <EmailIcon sx={{ mr: 1 }} />}
            
            {action === 'view' && 'Ver Detalles'}
            {action === 'edit' && 'Editar'}
            {action === 'send_invitation' && 'Enviar Invitación'}
            {action === 'approve' && 'Aprobar'}
            {action === 'sign' && 'Firmar'}
            {action === 'publish' && 'Publicar'}
            {action === 'download' && 'Descargar PDF'}
            {action === 'resend_invitation' && 'Reenviar Invitación'}
          </MenuItem>
        ))}
      </Menu>

      {/* Menú de filtros */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          setFilters({ state: ['DRAFT'] });
          setFilterMenuAnchor(null);
        }}>
          Solo Borradores
        </MenuItem>
        <MenuItem onClick={() => {
          setFilters({ state: ['TENANT_INVITED', 'TENANT_REVIEWING'] });
          setFilterMenuAnchor(null);
        }}>
          En Proceso
        </MenuItem>
        <MenuItem onClick={() => {
          setFilters({ state: ['PUBLISHED'] });
          setFilterMenuAnchor(null);
        }}>
          Activos
        </MenuItem>
        <MenuItem onClick={() => {
          setFilters({});
          setFilterMenuAnchor(null);
        }}>
          Todos
        </MenuItem>
      </Menu>

      {/* Notificaciones */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LandlordContractManager;