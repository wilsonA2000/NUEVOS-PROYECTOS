/**
 * Dashboard Especializado para Arrendatarios
 * Vista optimizada que muestra contratos desde la perspectiva del arrendatario
 * Incluye guías de acción, notificaciones importantes y flujo de trabajo simplificado
 */

import React, { useState, useEffect } from 'react';
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
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Divider,
  Badge,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon,
  Assignment as ContractIcon,
  CheckCircle as CompleteIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Draw as SignIcon,
  Notifications as NotificationIcon,
  Home as HomeIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Business as LandlordIcon,
  TaskAlt as TaskIcon,
  Info as InfoIcon,
  PlayArrow as StartIcon,
  DocumentScanner as DocumentIcon,
} from '@mui/icons-material';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

import { LandlordContractService } from '../../services/landlordContractService';
import { contractService } from '../../services/contractService';
import { 
  LandlordControlledContractData, 
  ContractWorkflowState 
} from '../../types/landlordContract';
import { Contract } from '../../types/contract';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';
import TenantContractView from './TenantContractView';
import TenantContractReview from './TenantContractReview';

interface TenantAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  urgent: boolean;
  completed: boolean;
  action: () => void;
}

const TenantContractsDashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<LandlordControlledContractData[]>([]);
  const [pendingReviewContracts, setPendingReviewContracts] = useState<Contract[]>([]);
  const [error, setError] = useState<string>('');
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    loadTenantContracts();
  }, []);

  const loadTenantContracts = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Cargar contratos del workflow del arrendador
      const response = await LandlordContractService.getTenantContracts();
      
      // La respuesta puede tener la estructura { contracts: [], pagination: {} }
      // o ser directamente un array
      const contractsData = response?.contracts || response || [];
      
      // Asegurar que siempre sea un array
      setContracts(Array.isArray(contractsData) ? contractsData : []);

      // Cargar contratos pendientes de revisión
      const pendingContracts = await contractService.getPendingTenantReviewContracts();
      setPendingReviewContracts(pendingContracts);
      
    } catch (err: any) {
      console.error('Error loading tenant contracts:', err);
      setError('Error al cargar contratos: ' + (err.message || 'Error desconocido'));
      setContracts([]); // Asegurar array vacío en caso de error
      setPendingReviewContracts([]);
    } finally {
      setLoading(false);
    }
  };

  // Obtener acciones pendientes para el arrendatario
  const getPendingActions = (contract: LandlordControlledContractData): TenantAction[] => {
    const actions: TenantAction[] = [];

    switch (contract.current_state) {
      case 'TENANT_INVITED':
        actions.push({
          id: 'accept_invitation',
          title: 'Aceptar Invitación de Contrato',
          description: `El arrendador ${contract.landlord_data.full_name} te ha invitado a revisar un contrato para ${contract.property_address}`,
          icon: <EmailIcon />,
          urgent: true,
          completed: false,
          action: () => window.location.href = `/contracts/tenant/accept/${contract.invitation_token}`
        });
        break;

      case 'TENANT_REVIEWING':
        if (!contract.tenant_data || !contract.tenant_data.full_name) {
          actions.push({
            id: 'complete_data',
            title: 'Completar Datos Personales',
            description: 'Completa tu información personal, laboral y referencias para continuar con el proceso',
            icon: <PersonIcon />,
            urgent: true,
            completed: false,
            action: () => window.location.href = `/contracts/tenant/data/${contract.id}`
          });
        }

        actions.push({
          id: 'review_contract',
          title: 'Revisar Términos del Contrato',
          description: 'Revisa cuidadosamente todos los términos del contrato y presenta objeciones si es necesario',
          icon: <DocumentIcon />,
          urgent: false,
          completed: contract.tenant_approved,
          action: () => window.location.href = `/contracts/tenant/review/${contract.id}`
        });
        break;

      case 'READY_TO_SIGN':
        if (!contract.tenant_signed) {
          actions.push({
            id: 'sign_contract',
            title: 'Firmar Contrato Digitalmente',
            description: 'Procede con la firma digital biométrica para finalizar el contrato',
            icon: <SignIcon />,
            urgent: true,
            completed: false,
            action: () => window.location.href = `/contracts/sign/${contract.id}`
          });
        }
        break;

      case 'OBJECTIONS_PENDING':
        actions.push({
          id: 'review_objections',
          title: 'Revisar Respuesta a Objeciones',
          description: 'El arrendador ha respondido a tus objeciones. Revisa su respuesta.',
          icon: <WarningIcon />,
          urgent: true,
          completed: false,
          action: () => window.location.href = `/contracts/tenant/objections/${contract.id}`
        });
        break;
    }

    return actions;
  };

  // Obtener el progreso del contrato como porcentaje
  const getContractProgress = (contract: LandlordControlledContractData): number => {
    const stateProgress = {
      'TENANT_INVITED': 10,
      'TENANT_REVIEWING': 30,
      'LANDLORD_REVIEWING': 50,
      'OBJECTIONS_PENDING': 40,
      'BOTH_REVIEWING': 60,
      'READY_TO_SIGN': 80,
      'FULLY_SIGNED': 90,
      'PUBLISHED': 100
    };
    return stateProgress[contract.current_state] || 0;
  };

  // Obtener los pasos del workflow
  const getWorkflowSteps = (contract: LandlordControlledContractData) => {
    return [
      {
        label: 'Invitación Recibida',
        completed: !['TENANT_INVITED'].includes(contract.current_state),
        active: contract.current_state === 'TENANT_INVITED'
      },
      {
        label: 'Datos Completados',
        completed: contract.tenant_data?.full_name ? true : false,
        active: contract.current_state === 'TENANT_REVIEWING' && !contract.tenant_data?.full_name
      },
      {
        label: 'Contrato Revisado',
        completed: contract.tenant_approved,
        active: contract.current_state === 'TENANT_REVIEWING' && !contract.tenant_approved
      },
      {
        label: 'Aprobado por Arrendador',
        completed: contract.landlord_approved,
        active: contract.current_state === 'LANDLORD_REVIEWING'
      },
      {
        label: 'Listo para Firmar',
        completed: contract.current_state === 'READY_TO_SIGN' || contract.tenant_signed,
        active: contract.current_state === 'READY_TO_SIGN'
      },
      {
        label: 'Contrato Firmado',
        completed: contract.tenant_signed && contract.landlord_signed,
        active: false
      }
    ];
  };

  // Obtener el color del estado
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
      case 'TENANT_INVITED':
        return 'info';
      default:
        return 'default';
    }
  };

  // Obtener texto amigable del estado
  const getStateText = (state: ContractWorkflowState): string => {
    const stateTexts = {
      'TENANT_INVITED': 'Invitación Pendiente',
      'TENANT_REVIEWING': 'Revisando Contrato',
      'LANDLORD_REVIEWING': 'Arrendador Revisando',
      'OBJECTIONS_PENDING': 'Objeciones Pendientes',
      'BOTH_REVIEWING': 'Revisión Conjunta',
      'READY_TO_SIGN': 'Listo para Firmar',
      'FULLY_SIGNED': 'Contrato Firmado',
      'PUBLISHED': 'Contrato Activo',
      'EXPIRED': 'Expirado',
      'TERMINATED': 'Terminado',
      'CANCELLED': 'Cancelado'
    };
    return stateTexts[state] || state;
  };

  // Renderizar tarjeta de contrato
  const renderContractCard = (contract: LandlordControlledContractData) => {
    const progress = getContractProgress(contract);
    const pendingActions = getPendingActions(contract);
    const workflowSteps = getWorkflowSteps(contract);
    const daysUntilExpiration = contract.end_date ? differenceInDays(parseISO(contract.end_date), new Date()) : null;

    return (
      <Card key={contract.id} elevation={3} sx={{ mb: 3 }}>
        <CardContent>
          {/* Header con información básica */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, mr: 1, fontSize: 14 }}>
                  <HomeIcon />
                </Avatar>
                {contract.property_address}
              </Typography>
              <Chip
                label={getStateText(contract.current_state)}
                color={getStateColor(contract.current_state)}
                size="small"
                sx={{ mr: 1 }}
              />
              {pendingActions.some(a => a.urgent) && (
                <Chip
                  label="Acción Requerida"
                  color="error"
                  size="small"
                  icon={<WarningIcon />}
                />
              )}
            </Box>
            
            <Box textAlign="right">
              <Typography variant="h6" color="success.main">
                ${contract.monthly_rent.toLocaleString('es-CO')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                /mes
              </Typography>
            </Box>
          </Box>

          {/* Barra de progreso */}
          <Box sx={{ mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progreso del Contrato
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {progress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* Información del arrendador */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              👤 Arrendador
            </Typography>
            <Box display="flex" align="center">
              <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, mr: 1 }}>
                <LandlordIcon />
              </Avatar>
              <Box>
                <Typography variant="body2">
                  <strong>{contract.landlord_data.full_name}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  📧 {contract.landlord_data.email}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Acciones pendientes */}
          {pendingActions.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                🎯 Acciones Pendientes
              </Typography>
              <List dense>
                {pendingActions.map((action) => (
                  <ListItem key={action.id} sx={{ pl: 0 }}>
                    <ListItemIcon>
                      <Badge color="error" variant="dot" invisible={!action.urgent}>
                        {action.icon}
                      </Badge>
                    </ListItemIcon>
                    <ListItemText
                      primary={action.title}
                      secondary={action.description}
                      primaryTypographyProps={{
                        variant: 'body2',
                        color: action.urgent ? 'error.main' : 'text.primary'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Stepper de progreso */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              📋 Estado del Proceso
            </Typography>
            <Stepper orientation="vertical" sx={{ pl: 2 }}>
              {workflowSteps.map((step, index) => (
                <Step key={index} active={step.active} completed={step.completed}>
                  <StepLabel
                    StepIconProps={{
                      sx: { fontSize: 20 }
                    }}
                  >
                    <Typography variant="body2" color={step.completed ? 'success.main' : step.active ? 'primary.main' : 'text.secondary'}>
                      {step.label}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Información adicional del contrato */}
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                Duración del Contrato
              </Typography>
              <Typography variant="body2">
                {contract.contract_duration_months} meses
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                Depósito de Garantía
              </Typography>
              <Typography variant="body2">
                ${contract.security_deposit.toLocaleString('es-CO')}
              </Typography>
            </Grid>
            {contract.start_date && (
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Fecha de Inicio
                </Typography>
                <Typography variant="body2">
                  {format(parseISO(contract.start_date), 'PPP', { locale: es })}
                </Typography>
              </Grid>
            )}
            {daysUntilExpiration !== null && daysUntilExpiration > 0 && (
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Días Restantes
                </Typography>
                <Typography variant="body2" color={daysUntilExpiration <= 30 ? 'warning.main' : 'text.primary'}>
                  {daysUntilExpiration} días
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Button
            size="small"
            startIcon={<ViewIcon />}
            onClick={() => window.location.href = `/contracts/tenant/view/${contract.id}`}
          >
            Ver Contrato Completo
          </Button>
          
          {pendingActions.length > 0 && (
            <Button
              variant="contained"
              size="small"
              color={pendingActions.some(a => a.urgent) ? 'error' : 'primary'}
              startIcon={<StartIcon />}
              onClick={pendingActions[0].action}
            >
              {pendingActions.some(a => a.urgent) ? 'Acción Urgente' : 'Continuar Proceso'}
            </Button>
          )}
        </CardActions>
      </Card>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Cargando tus contratos..." />;
  }

  return (
    <Container maxWidth="lg">
      <Box py={3}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 1 }}>
            🏠 Mis Contratos de Arrendamiento
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona todos tus contratos y mantente al día con las acciones pendientes
          </Typography>
        </Box>

        {/* Tenant Contract View Section */}
        <Box sx={{ mb: 4 }}>
          <TenantContractView />
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Estadísticas rápidas */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <ContractIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h5">{(contracts || []).length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Contratos
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                    <CompleteIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h5">
                      {(contracts || []).filter(c => c.current_state === 'PUBLISHED').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Activos
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                    <ScheduleIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h5">
                      {(contracts || []).filter(c => ['TENANT_INVITED', 'TENANT_REVIEWING', 'READY_TO_SIGN'].includes(c.current_state)).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pendientes
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                    <TaskIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h5">
                      {contracts.reduce((acc, contract) => acc + getPendingActions(contract).length, 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Acciones Pendientes
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Contratos pendientes de revisión */}
        {pendingReviewContracts.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
              📋 Contratos Pendientes de tu Revisión
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Tienes {pendingReviewContracts.length} contrato{pendingReviewContracts.length !== 1 ? 's' : ''} que requiere{pendingReviewContracts.length === 1 ? '' : 'n'} tu aprobación o solicitud de cambios.
            </Typography>
            {pendingReviewContracts.map(contract => (
              <TenantContractReview 
                key={contract.id}
                contract={contract}
                onReviewComplete={loadTenantContracts}
              />
            ))}
          </Box>
        )}

        {/* Lista de contratos */}
        {(contracts || []).length === 0 && pendingReviewContracts.length === 0 ? (
          <Card>
            <CardContent>
              <Box textAlign="center" py={8}>
                <Avatar sx={{ bgcolor: 'grey.100', width: 80, height: 80, mx: 'auto', mb: 2 }}>
                  <ContractIcon sx={{ fontSize: 40, color: 'grey.400' }} />
                </Avatar>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  No tienes contratos aún
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cuando un arrendador te invite a un contrato, aparecerá aquí
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : (contracts || []).length > 0 && (
          <Box>
            {/* Contratos con acciones urgentes primero */}
            {contracts
              .sort((a, b) => {
                const aUrgent = getPendingActions(a).some(action => action.urgent);
                const bUrgent = getPendingActions(b).some(action => action.urgent);
                if (aUrgent && !bUrgent) return -1;
                if (!aUrgent && bUrgent) return 1;
                return 0;
              })
              .map(contract => renderContractCard(contract))
            }
          </Box>
        )}

        {/* Información de ayuda */}
        <Paper elevation={1} sx={{ p: 3, mt: 4, bgcolor: 'info.50' }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <InfoIcon sx={{ mr: 1 }} />
            ¿Necesitas Ayuda?
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                📧 <strong>Soporte por Email</strong><br />
                soporte@verihome.com
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                📞 <strong>Atención Telefónica</strong><br />
                +57 (1) 123-4567
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                💬 <strong>Chat en Línea</strong><br />
                Disponible 24/7 en nuestra web
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default TenantContractsDashboard;