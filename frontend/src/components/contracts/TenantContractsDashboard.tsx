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
  AlertTitle,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
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
  Security as SecurityIcon,
  LocationOn as LocationIcon,
  Business as LandlordIcon,
  TaskAlt as TaskIcon,
  Info as InfoIcon,
  PlayArrow as StartIcon,
  DocumentScanner as DocumentIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

import { LandlordContractService } from '../../services/landlordContractService';
import { contractService } from '../../services/contractService';
import { 
  LandlordControlledContractData, 
  ContractWorkflowState, 
} from '../../types/landlordContract';
import { Contract } from '../../types/contract';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';
import TenantContractReview from './TenantContractReview';
import ModificationRequestModal from './ModificationRequestModal';
import { viewContractPDF } from '../../utils/contractPdfUtils';
import api from '../../services/api';

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
  const [workflowProcesses, setWorkflowProcesses] = useState<any[]>([]); // Procesos del workflow
  const [error, setError] = useState<string>('');
  const [activeStep, setActiveStep] = useState(0);
  const [approvingContract, setApprovingContract] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean, contractId: string | null}>({ open: false, contractId: null });
  const [successDialog, setSuccessDialog] = useState<{open: boolean, title: string, message: string}>({ open: false, title: '', message: '' });
  const [errorDialog, setErrorDialog] = useState<{open: boolean, title: string, message: string}>({ open: false, title: '', message: '' }); // ID del contrato siendo aprobado
  const [modificationModalOpen, setModificationModalOpen] = useState(false);
  const [selectedContractForModification, setSelectedContractForModification] = useState<string | null>(null);
  const [selectedContractData, setSelectedContractData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    loadTenantContracts();
  }, []);

  const loadTenantContracts = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Cargar procesos del workflow (PRIORIDAD)
      try {
        const { data } = await api.get('/contracts/tenant-processes/');
        // El backend devuelve {results: [...], count: N}
        const processes = data.results || (Array.isArray(data) ? data : []);
        setWorkflowProcesses(processes);
      } catch (workflowError) {
        setWorkflowProcesses([]);
      }
      
      // Cargar contratos del workflow del arrendador (SECUNDARIO)
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
      setError(`Error al cargar contratos: ${  err.message || 'Error desconocido'}`);
      setContracts([]); // Asegurar array vacío en caso de error
      setPendingReviewContracts([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para aprobar contrato como arrendatario
  const handleApproveContract = async (contractId: string) => {
    if (!contractId) {
      setErrorDialog({
        open: true,
        title: 'Error',
        message: 'ID de contrato no encontrado',
      });
      return;
    }

    // Abrir modal de confirmación personalizado
    setConfirmDialog({ open: true, contractId });
  };

  // Función para confirmar la aprobación del contrato
  const handleConfirmApproval = async () => {
    const contractId = confirmDialog.contractId;
    if (!contractId) return;

    setConfirmDialog({ open: false, contractId: null });

    try {
      setApprovingContract(contractId);

      // Llamar al endpoint específico para aprobar contrato desde el workflow
      await api.post(`/contracts/tenant/contracts/${contractId}/approve_contract/`, {
        approved: true,
        tenant_notes: 'Aprobado desde el dashboard del arrendatario',
        confirm_understanding: true,
      });

      setSuccessDialog({
        open: true,
        title: '¡Contrato Aprobado Exitosamente!',
        message: 'El proceso ahora avanzará a la etapa de autenticación biométrica.',
      });

      // Recargar los datos para reflejar el cambio
      await loadTenantContracts();
    } catch (error: any) {
      setErrorDialog({
        open: true,
        title: 'Error al Aprobar el Contrato',
        message: error.response?.data?.detail || error.message || 'Error desconocido',
      });
    } finally {
      setApprovingContract(null);
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
          action: () => window.location.href = `/contracts/tenant/accept/${contract.invitation_token}`,
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
            action: () => window.location.href = `/contracts/tenant/data/${contract.id}`,
          });
        }

        actions.push({
          id: 'review_contract',
          title: 'Revisar Términos del Contrato',
          description: 'Revisa cuidadosamente todos los términos del contrato y presenta objeciones si es necesario',
          icon: <DocumentIcon />,
          urgent: false,
          completed: contract.tenant_approved,
          action: () => window.location.href = `/contracts/tenant/review/${contract.id}`,
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
            action: () => window.location.href = `/contracts/sign/${contract.id}`,
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
          action: () => window.location.href = `/contracts/tenant/objections/${contract.id}`,
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
      'PUBLISHED': 100,
    };
    return stateProgress[contract.current_state as keyof typeof stateProgress] || 0;
  };

  // Obtener los pasos del workflow
  const getWorkflowSteps = (contract: LandlordControlledContractData) => {
    return [
      {
        label: 'Invitación Recibida',
        completed: !['TENANT_INVITED'].includes(contract.current_state),
        active: contract.current_state === 'TENANT_INVITED',
      },
      {
        label: 'Datos Completados',
        completed: contract.tenant_data?.full_name ? true : false,
        active: contract.current_state === 'TENANT_REVIEWING' && !contract.tenant_data?.full_name,
      },
      {
        label: 'Contrato Revisado',
        completed: contract.tenant_approved,
        active: contract.current_state === 'TENANT_REVIEWING' && !contract.tenant_approved,
      },
      {
        label: 'Aprobado por Arrendador',
        completed: contract.landlord_approved,
        active: contract.current_state === 'LANDLORD_REVIEWING',
      },
      {
        label: 'Listo para Firmar',
        completed: contract.current_state === 'READY_TO_SIGN' || contract.tenant_signed,
        active: contract.current_state === 'READY_TO_SIGN',
      },
      {
        label: 'Contrato Firmado',
        completed: contract.tenant_signed && contract.landlord_signed,
        active: false,
      },
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
      'CANCELLED': 'Cancelado',
    };
    return stateTexts[state as keyof typeof stateTexts] || state;
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
            <Box display="flex" alignItems="center">
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
                        color: action.urgent ? 'error.main' : 'text.primary',
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
              Estado del Proceso
            </Typography>
            <Stepper orientation="vertical" sx={{ pl: 2 }}>
              {workflowSteps.map((step, index) => (
                <Step key={index} active={step.active} completed={step.completed}>
                  <StepLabel
                    StepIconProps={{
                      sx: { fontSize: 20 },
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
              onClick={pendingActions[0]?.action}
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
            Mis Contratos de Arrendamiento
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona todos tus contratos y mantente al día con las acciones pendientes
          </Typography>
        </Box>

        {/* Procesos del Workflow - PRIORIDAD ALTA */}
        {workflowProcesses.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <HomeIcon sx={{ mr: 1, color: 'primary.main' }} />
              Procesos Activos ({workflowProcesses.length})
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Tus procesos de arrendamiento en curso con PDF profesional
            </Typography>
            {workflowProcesses.map(process => (
              <Card key={process.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                      <Typography variant="h6" gutterBottom>
                        {process.property?.title || 'Propiedad'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {process.property?.address}
                      </Typography>
                      <Typography variant="subtitle1" color="primary" gutterBottom>
                        Canon: ${process.property?.rent_price?.toLocaleString()}/mes
                      </Typography>
                      
                      {/* Estado del proceso mejorado */}
                      <Box sx={{ mt: 2 }}>
                        {/* Mostrar el estado actual de manera más clara */}
                        {(process.status === 'biometric_pending' ||
                          process.status === 'pending_biometric_authentication' ||
                          process.workflow_status === 'pending_tenant_biometric' ||
                          (process.workflow_stage === 4 && process.workflow_data?.contract_created?.tenant_approved)) ? (
                          <>
                            <Alert severity="info" sx={{ mb: 2 }}>
                              <AlertTitle>⏳ Autenticación Biométrica Pendiente</AlertTitle>
                              <Typography variant="body2">
                                Tu contrato ha sido aprobado. El siguiente paso es completar la
                                autenticación biométrica para activar el contrato.
                              </Typography>
                            </Alert>
                            <Chip
                              label="Etapa 4: Esperando Autenticación Biométrica"
                              color="warning"
                              variant="filled"
                              icon={<SecurityIcon />}
                              sx={{ mb: 1 }}
                            />
                          </>
                        ) : process.status === 'contract_approved_by_tenant' ? (
                          <>
                            <Alert severity="success" sx={{ mb: 2 }}>
                              <AlertTitle>Contrato Aprobado por Ti</AlertTitle>
                              <Typography variant="body2">
                                Has aprobado el contrato exitosamente. Ahora el arrendador debe revisar
                                y aprobar para continuar al siguiente paso de autenticación biométrica.
                              </Typography>
                            </Alert>
                            <Chip
                              label="Etapa 3: Esperando aprobación del arrendador"
                              color="warning"
                              variant="filled"
                              icon={<InfoIcon />}
                              sx={{ mb: 1 }}
                            />
                          </>
                        ) : process.status === 'contract_pending_tenant_approval' ? (
                          <>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                              <AlertTitle>Contrato Listo para Revisión</AlertTitle>
                              <Typography variant="body2">
                                El arrendador ha creado el contrato. ¡Es tu turno de revisarlo y aprobarlo!
                              </Typography>
                            </Alert>
                            <Chip
                              label="Etapa 3: Revisión del Contrato - Tu Aprobación Requerida"
                              color="warning"
                              variant="filled"
                              icon={<DocumentIcon />}
                              sx={{ mb: 1 }}
                            />
                          </>
                        ) : (
                          <Chip
                            label={`Etapa ${process.workflow_stage}: ${process.status}`}
                            color="primary"
                            variant="outlined"
                            sx={{ mb: 1 }}
                          />
                        )}

                        {/* Barra de progreso con etapas */}
                        <Box sx={{ mt: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption">Progreso del Proceso</Typography>
                            <Typography variant="caption">{Math.round((process.workflow_stage / 5) * 100)}%</Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={(process.workflow_stage / 5) * 100}
                            sx={{ mb: 2, height: 8, borderRadius: 1 }}
                          />

                          {/* Lista de etapas */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="caption" color={process.workflow_stage >= 1 ? 'success.main' : 'text.disabled'}>
                              ✓ Etapa 1: Solicitud enviada
                            </Typography>
                            <Typography variant="caption" color={process.workflow_stage >= 2 ? 'success.main' : 'text.disabled'}>
                              ✓ Etapa 2: Visita completada
                            </Typography>
                            <Typography variant="caption" color={process.workflow_stage >= 3 ? 'success.main' : 'text.disabled'}>
                              ✓ Etapa 3: Documentos aprobados
                            </Typography>
                            <Typography variant="caption" color={process.workflow_stage >= 4 ? 'warning.main' : 'text.disabled'}>
                              {process.workflow_stage === 4 ? '⏳' : '○'} Etapa 4: Autenticación biométrica
                            </Typography>
                            <Typography variant="caption" color={process.workflow_stage >= 5 ? 'success.main' : 'text.disabled'}>
                              ○ Etapa 5: Contrato activo
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {/* Acciones según el estado */}
                        {(process.status === 'biometric_pending' ||
                          process.status === 'pending_biometric_authentication' ||
                          process.workflow_status === 'pending_tenant_biometric' ||
                          (process.workflow_stage === 4 && process.workflow_data?.contract_created?.tenant_approved)) && (
                          <>
                            <Alert severity="success" sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                🎯 ¡Es tu turno! Debes iniciar la autenticación biométrica
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                Orden del proceso:
                              </Typography>
                              <Box component="ol" sx={{ pl: 2, mt: 0.5, mb: 1 }}>
                                <Typography component="li" variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                                  1. Tú (Arrendatario) ← AHORA
                                </Typography>
                                {process.workflow_data?.contract_created?.guarantor_id && (
                                  <Typography component="li" variant="body2" color="text.secondary">
                                    2. Garante/Codeudor ← Después
                                  </Typography>
                                )}
                                <Typography component="li" variant="body2" color="text.secondary">
                                  {process.workflow_data?.contract_created?.guarantor_id ? '3.' : '2.'} Arrendador ← Al final
                                </Typography>
                              </Box>
                              <Typography variant="body2">
                                💡 Una vez que completes tu verificación, {process.workflow_data?.contract_created?.guarantor_id ? 'el garante continuará y luego' : ''} el arrendador podrá proceder.
                              </Typography>
                            </Alert>

                            <Button
                              variant="contained"
                              color="success"
                              size="large"
                              startIcon={<SecurityIcon />}
                              onClick={() => {
                                // Navegar a autenticación biométrica
                                window.location.href = `/app/contracts/${process.workflow_data?.contract_created?.contract_id}/authenticate`;
                              }}
                              sx={{ mb: 1, py: 1.5 }}
                            >
                              Iniciar mi autenticación biométrica
                            </Button>

                            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
                              Proceso rápido y seguro — toma menos de 5 minutos
                            </Typography>
                          </>
                        )}

                        {/* Acciones para contrato pendiente de aprobación del arrendatario */}
                        {process.status === 'contract_pending_tenant_approval' && (
                          <>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                ¡Tu revisión es requerida!
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                El arrendador ha creado el contrato y está esperando tu aprobación para continuar al siguiente paso.
                              </Typography>
                            </Alert>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Button
                                variant="outlined"
                                color="primary"
                                size="medium"
                                startIcon={<ViewIcon />}
                                onClick={() => viewContractPDF(process.workflow_data?.contract_created?.contract_id)}
                                fullWidth
                              >
                                Ver Contrato PDF
                              </Button>

                              <Button
                                variant="contained"
                                color="success"
                                size="large"
                                startIcon={approvingContract === process.workflow_data?.contract_created?.contract_id ?
                                  <CircularProgress size={16} color="inherit" /> : <TaskIcon />}
                                onClick={() => handleApproveContract(process.workflow_data?.contract_created?.contract_id)}
                                disabled={approvingContract === process.workflow_data?.contract_created?.contract_id}
                                sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
                                fullWidth
                              >
                                {approvingContract === process.workflow_data?.contract_created?.contract_id
                                  ? '⏳ APROBANDO...'
                                  : 'Aprobar y continuar'
                                }
                              </Button>

                              <Button
                                variant="outlined"
                                color="warning"
                                size="large"
                                startIcon={<EditIcon />}
                                onClick={() => {
                                  setSelectedContractForModification(process.workflow_data?.contract_created?.contract_id);
                                  // Pasar datos del contrato para mostrar valores actuales en el modal
                                  setSelectedContractData({
                                    landlord_data: process.workflow_data?.contract_created?.landlord_data || process.workflow_data?.landlord_data,
                                    tenant_data: process.workflow_data?.contract_created?.tenant_data || process.workflow_data?.tenant_data,
                                    property_data: process.workflow_data?.contract_created?.property_data || process.workflow_data?.property_data,
                                    economic_terms: process.workflow_data?.contract_created?.economic_terms || process.workflow_data?.economic_terms,
                                    contract_terms: process.workflow_data?.contract_created?.contract_terms || process.workflow_data?.contract_terms,
                                  });
                                  setModificationModalOpen(true);
                                }}
                                sx={{ py: 1.5, fontSize: '1rem' }}
                                fullWidth
                              >
                                ✏️ SOLICITAR MODIFICACIÓN
                              </Button>

                              <Button
                                variant="outlined"
                                color="error"
                                size="medium"
                                startIcon={<CloseIcon />}
                                onClick={async () => {
                                  const contractId = process.workflow_data?.contract_created?.contract_id;
                                  if (!contractId) {
                                    setErrorDialog({
                                      open: true,
                                      title: 'Error',
                                      message: 'No se encontró el ID del contrato.',
                                    });
                                    return;
                                  }
                                  try {
                                    await api.post(`/tenant/contracts/${contractId}/reject_contract/`);
                                    setSuccessDialog({
                                      open: true,
                                      title: 'Contrato Rechazado',
                                      message: 'El contrato ha sido rechazado exitosamente. El arrendador será notificado.',
                                    });
                                    await loadTenantContracts();
                                  } catch (err: any) {
                                    setErrorDialog({
                                      open: true,
                                      title: 'Error al Rechazar',
                                      message: err?.response?.data?.error || err?.message || 'No se pudo rechazar el contrato. Intenta nuevamente.',
                                    });
                                  }
                                }}
                                sx={{ py: 1 }}
                                fullWidth
                              >
                                Rechazar contrato
                              </Button>
                            </Box>

                            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mb: 2 }}>
                              💡 Revisa cuidadosamente todos los términos antes de aprobar
                            </Typography>
                          </>
                        )}

                        {/* Botón para ver contrato con PDF profesional */}
                        {process.workflow_data?.contract_created && (
                          <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<ViewIcon />}
                            onClick={() => viewContractPDF(process.workflow_data.contract_created.contract_id)}
                            size="small"
                          >
                            Ver Contrato PDF
                          </Button>
                        )}

                        {/* Información adicional */}
                        {process.workflow_data?.contract_created && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="caption" display="block" gutterBottom>
                              <strong>Contrato No:</strong> {process.workflow_data.contract_created.contract_number}
                            </Typography>
                            <Typography variant="caption" display="block" gutterBottom>
                              <strong>Creado:</strong> {new Date(process.workflow_data.contract_created.created_at).toLocaleDateString()}
                            </Typography>
                            {process.workflow_data.contract_created.tenant_approved && (
                              <Typography variant="caption" display="block" color="success.main">
                                <strong>Aprobado:</strong> {new Date(process.workflow_data.contract_created.tenant_approved_at).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

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

        {/* Contratos pendientes de revisión - Solo si NO hay procesos de workflow */}
        {pendingReviewContracts.length > 0 && workflowProcesses.length === 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
              Contratos Pendientes de tu Revisión
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Tienes {pendingReviewContracts.length} contrato{pendingReviewContracts.length !== 1 ? 's' : ''} que requiere{pendingReviewContracts.length === 1 ? '' : 'n'} tu aprobación o solicitud de cambios.
            </Typography>
            {pendingReviewContracts.map(contract => (
              <TenantContractReview
                key={contract.id}
                contract={contract as any}
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

      {/* Dialog de Confirmación para Aprobar Contrato */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, contractId: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'warning.50', color: 'warning.main' }}>
          ⚠️ Confirmación de Aprobación
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <DialogContentText sx={{ mb: 2 }}>
            ¿Estás seguro de que quieres aprobar este contrato?
          </DialogContentText>
          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Al aprobar el contrato:</strong>
            </Typography>
            <Typography variant="body2" component="ul" sx={{ m: 0, pl: 2 }}>
              <li>Aceptas todos los términos y condiciones</li>
              <li>El proceso avanzará a la etapa de autenticación biométrica</li>
              <li>Esta decisión no se puede revertir fácilmente</li>
            </Typography>
          </Box>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Asegúrate de haber revisado completamente el contrato antes de continuar.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setConfirmDialog({ open: false, contractId: null })}
            color="inherit"
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmApproval}
            color="success"
            variant="contained"
            disabled={approvingContract !== null}
            startIcon={approvingContract ? <CircularProgress size={16} /> : null}
          >
            {approvingContract ? 'Aprobando...' : 'Sí, Aprobar Contrato'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Éxito */}
      <Dialog
        open={successDialog.open}
        onClose={() => setSuccessDialog({ open: false, title: '', message: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'success.50', color: 'success.main', textAlign: 'center' }}>
          {successDialog.title}
        </DialogTitle>
        <DialogContent sx={{ pt: 3, textAlign: 'center' }}>
          <DialogContentText sx={{ whiteSpace: 'pre-line' }}>
            {successDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', p: 3 }}>
          <Button
            onClick={() => setSuccessDialog({ open: false, title: '', message: '' })}
            color="success"
            variant="contained"
            size="large"
          >
            Entendido
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Error */}
      <Dialog
        open={errorDialog.open}
        onClose={() => setErrorDialog({ open: false, title: '', message: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'error.50', color: 'error.main' }}>
          {errorDialog.title}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <DialogContentText sx={{ whiteSpace: 'pre-line' }}>
            {errorDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setErrorDialog({ open: false, title: '', message: '' })}
            color="error"
            variant="outlined"
            fullWidth
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Solicitud de Modificación */}
      {selectedContractForModification && (
        <ModificationRequestModal
          open={modificationModalOpen}
          onClose={() => {
            setModificationModalOpen(false);
            setSelectedContractForModification(null);
            setSelectedContractData(null);
          }}
          contractId={selectedContractForModification}
          contractData={selectedContractData ? {
            landlord_data: selectedContractData.landlord_data as Record<string, unknown>,
            tenant_data: selectedContractData.tenant_data as Record<string, unknown>,
            property_data: selectedContractData.property_data as Record<string, unknown>,
            economic_terms: selectedContractData.economic_terms as Record<string, unknown>,
            contract_terms: selectedContractData.contract_terms as Record<string, unknown>,
          } : undefined}
          onSuccess={() => {
            setSuccessDialog({
              open: true,
              title: 'Solicitud Enviada',
              message: 'Tu solicitud de modificación ha sido enviada al arrendador. Te notificaremos cuando responda.',
            });
            setModificationModalOpen(false);
            setSelectedContractForModification(null);
            setSelectedContractData(null);
            loadTenantContracts(); // Recargar contratos
          }}
        />
      )}
    </Container>
  );
};

export default TenantContractsDashboard;