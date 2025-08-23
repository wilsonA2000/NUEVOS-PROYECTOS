import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
  Avatar,
  Chip,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';


import {
  Person as PersonIcon,
  Home as HomeIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Visibility as VisitIcon,
  Description as DocumentsIcon,
  Gavel as ContractIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  NavigateNext as NextIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Upload as UploadIcon,
  Description as DocumentIcon,
  Fingerprint as BiometricIcon,
  OpenInNew as OpenIcon,
  PlayArrow as ContinueIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import VisitScheduleModal from './VisitScheduleModal';
import LandlordDocumentReview from './LandlordDocumentReview';

interface MatchedCandidate {
  id: string;
  match_code: string;
  status: 'accepted' | 'visit_scheduled' | 'documents_reviewed' | 'contract_ready';
  tenant: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    city: string | null;
    country: string | null;
    is_verified: boolean;
  };
  property: {
    id: string;
    title: string;
    address: string;
    rent_price: number;
    bedrooms: number;
    bathrooms: number;
  };
  tenant_message: string;
  preferred_move_in_date: string | null;
  lease_duration_months: number;
  monthly_income: number | null;
  employment_type: string;
  created_at: string;
  workflow_stage: 1 | 2 | 3 | 4 | 5;
  workflow_data: {
    visit_scheduled?: {
      date: string;
      time: string;
      notes: string;
    };
    documents_reviewed?: {
      approved: boolean;
      notes: string;
      reviewed_at: string;
    };
    contract_created?: {
      contract_id: string;
      status: string;
      biometric_state?: string;
      created_at: string;
      move_in_date?: string;
      landlord_auth_completed?: boolean;
      tenant_auth_completed?: boolean;
      keys_delivered?: boolean;
      execution_started?: boolean;
    };
  };
}

interface WorkflowAction {
  type: 'visit_schedule' | 'visit_completed' | 'documents_request' | 'documents_approved' | 'contract_create' | 'reject';
  data?: any;
}

const MatchedCandidatesView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<MatchedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<MatchedCandidate | null>(null);
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<WorkflowAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states for different actions
  const [rejectionReason, setRejectionReason] = useState('');
  const [documentsNotes, setDocumentsNotes] = useState('');
  
  // Estados para el modal de programar visita
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [selectedCandidateForVisit, setSelectedCandidateForVisit] = useState<MatchedCandidate | null>(null);
  
  // Estados para el modal de revisión de documentos
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [selectedCandidateForDocuments, setSelectedCandidateForDocuments] = useState<MatchedCandidate | null>(null);

  useEffect(() => {
    console.log('🔍 MatchedCandidatesView component mounted');
    fetchMatchedCandidates();
  }, []);

  // Handler para abrir el modal de programar visita
  const handleScheduleVisit = useCallback((candidate: MatchedCandidate) => {
    setSelectedCandidateForVisit(candidate);
    setVisitModalOpen(true);
  }, []);

  // Handler para abrir el modal de revisión de documentos
  const handleReviewDocuments = useCallback((candidate: MatchedCandidate) => {
    setSelectedCandidateForDocuments(candidate);
    setDocumentsModalOpen(true);
  }, []);
  
  // Handler para cerrar el modal de revisión de documentos
  const handleCloseDocumentsModal = useCallback(() => {
    setDocumentsModalOpen(false);
    setSelectedCandidateForDocuments(null);
    // Recargar candidatos para actualizar estado
    fetchMatchedCandidates();
  }, []);

  // Handler para confirmar la visita programada
  const handleConfirmVisit = useCallback(async (visitData: { date: string; time: string; notes: string }) => {
    if (!selectedCandidateForVisit) return;

    try {
      const requestBody = {
        match_request_id: selectedCandidateForVisit.id,
        action: 'visit_schedule',
        visit_data: visitData
      };

      const response = await api.post('/contracts/workflow-action/', requestBody);
      const result = response.data;
      
      // CRITICAL FIX: Reload all candidates from server to ensure synchronization
      console.log('🔄 Recargando candidatos para sincronización después de programar visita...');
      await fetchMatchedCandidates();

      console.log('✅ Visita programada exitosamente y datos sincronizados');
    } catch (err) {
      console.error('❌ Error al programar visita:', err);
      throw err; // Re-lanzar el error para que el modal lo maneje
    }
  }, [selectedCandidateForVisit]);

  const fetchMatchedCandidates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching matched candidates from /api/v1/contracts/matched-candidates/');
      const response = await api.get('/contracts/matched-candidates/');

      console.log('🔍 Response status:', response.status);
      const data = response.data;
      console.log('🔍 Received data:', data);
      setCandidates(data.results || []);
      console.log('🔍 Set candidates:', data.results?.length || 0);
    } catch (err) {
      console.error('🔍 Error response:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowAction = async (candidate: MatchedCandidate, action: WorkflowAction) => {
    setSelectedCandidate(candidate);
    setCurrentAction(action);
    setWorkflowDialogOpen(true);
    
    // Reset form states
    setRejectionReason('');
    setDocumentsNotes('');
  };

  const executeWorkflowAction = async () => {
    if (!selectedCandidate || !currentAction) return;

    try {
      setActionLoading(true);
      
      const requestBody: any = {
        match_request_id: selectedCandidate.id,
        action: currentAction.type
      };

      // Add specific data based on action type
      switch (currentAction.type) {
        case 'documents_approved':
          requestBody.documents_data = {
            approved: true,
            notes: documentsNotes
          };
          break;
        case 'reject':
          requestBody.rejection_reason = rejectionReason;
          break;
        case 'advance_to_execution':
          requestBody.execution_data = {
            ready_for_execution: true,
            advance_to_stage_5: true
          };
          break;
      }

      const response = await api.post('/contracts/workflow-action/', requestBody);
      const result = response.data;
      
      // CRITICAL FIX: Handle contract creation redirection
      if (currentAction.type === 'contract_create') {
        console.log('🔄 Redirigiendo al flujo de contratos existente...');
        
        // Close dialog immediately to avoid UI blocking
        setWorkflowDialogOpen(false);
        setSelectedCandidate(null);
        setCurrentAction(null);
        
        // Redirect to contract creation form with property and tenant data
        const contractUrl = `/app/contracts/new?property=${selectedCandidate.property.id}&tenant=${selectedCandidate.tenant.id}&match=${selectedCandidate.id}`;
        console.log('📄 Navigating to contract form:', contractUrl);
        navigate(contractUrl);
        
        return; // Exit early for contract creation
      }
      
      // CRITICAL FIX: Reload all candidates from server to ensure synchronization
      // Don't rely on partial updates from the API response
      console.log('🔄 Recargando candidatos desde el servidor para sincronización completa...');
      await fetchMatchedCandidates();

      setWorkflowDialogOpen(false);
      setSelectedCandidate(null);
      setCurrentAction(null);
      
      // Show success message
      console.log('✅ Acción ejecutada y datos sincronizados:', result.message);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar acción');
    } finally {
      setActionLoading(false);
    }
  };

  const getStageLabel = (stage: number) => {
    switch (stage) {
      case 1: return 'Etapa 1: Visita 🏠';
      case 2: return 'Etapa 2: Documentos 📄';
      case 3: return 'Etapa 3: Creación del Contrato 📋';
      case 4: return 'Etapa 4: Autenticación Biométrica 🔐';
      case 5: return 'Etapa 5: Entrega y Ejecución 🔑';
      default: return 'Etapa';
    }
  };

  const getStageColor = (stage: number) => {
    switch (stage) {
      case 1: return 'info';
      case 2: return 'warning';
      case 3: return 'primary';
      case 4: return 'secondary';
      case 5: return 'success';
      default: return 'default';
    }
  };

  // Helper para verificar si el contrato está listo para autenticación biométrica
  const isContractReadyForBiometric = (contractInfo: any) => {
    if (!contractInfo) return false;
    
    // El contrato debe estar en un estado que permita autenticación biométrica
    // No debe estar en pending_tenant_review o tenant_changes_requested
    const allowedStates = [
      'ready_for_authentication',
      'pending_authentication', 
      'pending_landlord_authentication',
      'pending_tenant_authentication',
      'authenticated_pending_signature',
      'partially_signed',
      'fully_signed'
    ];
    
    return allowedStates.includes(contractInfo.status);
  };

  // Helpers para el estado biométrico
  const getBiometricStateLabel = (state?: string, contractInfo?: any) => {
    if (contractInfo) {
      // Estados basados en los flags del contrato
      if (contractInfo.execution_started) {
        return 'Contrato en Ejecución';
      } else if (contractInfo.keys_delivered) {
        return 'Llaves Entregadas - Listo para Ejecución';
      } else if (contractInfo.tenant_auth_completed && contractInfo.landlord_auth_completed) {
        return 'Totalmente Autenticado - Pendiente Entrega';
      } else if (contractInfo.landlord_auth_completed) {
        return 'Pendiente Autenticación Arrendatario';
      } else {
        return 'Pendiente Autenticación Arrendador';
      }
    }
    
    // Fallback a estados originales
    switch (state) {
      case 'pending_landlord_auth':
        return 'Pendiente Autenticación Arrendador';
      case 'landlord_auth_in_progress':
        return 'Autenticación en Progreso';
      case 'landlord_auth_completed':
        return 'Arrendador Autenticado';
      case 'pending_tenant_auth':
        return 'Pendiente Autenticación Arrendatario';
      case 'tenant_auth_in_progress':
        return 'Arrendatario en Autenticación';
      case 'fully_authenticated':
        return 'Completamente Autenticado';
      default:
        return 'Sin Autenticación';
    }
  };

  const getBiometricStateColor = (state?: string, contractInfo?: any): any => {
    if (contractInfo) {
      if (contractInfo.execution_started) {
        return 'success';
      } else if (contractInfo.keys_delivered) {
        return 'info';
      } else if (contractInfo.tenant_auth_completed && contractInfo.landlord_auth_completed) {
        return 'success';
      } else if (contractInfo.landlord_auth_completed) {
        return 'warning';
      } else {
        return 'warning';
      }
    }
    
    switch (state) {
      case 'pending_landlord_auth':
        return 'warning';
      case 'landlord_auth_in_progress':
        return 'info';
      case 'landlord_auth_completed':
        return 'success';
      case 'pending_tenant_auth':
        return 'warning';
      case 'tenant_auth_in_progress':
        return 'info';
      case 'fully_authenticated':
        return 'success';
      default:
        return 'default';
    }
  };

  // Handlers para el workflow biométrico
  const handleStartBiometricAuth = useCallback((candidate: MatchedCandidate) => {
    if (!candidate.workflow_data.contract_created) return;
    
    const contractId = candidate.workflow_data.contract_created.contract_id;
    console.log('🔐 Iniciando autenticación biométrica para contrato:', contractId);
    
    // Navegar a la página de autenticación biométrica
    navigate(`/app/contracts/${contractId}/authenticate`);
  }, [navigate]);

  const handleContinueBiometricAuth = useCallback((candidate: MatchedCandidate) => {
    if (!candidate.workflow_data.contract_created) return;
    
    const contractId = candidate.workflow_data.contract_created.contract_id;
    console.log('▶️ Continuando autenticación biométrica para contrato:', contractId);
    
    // Navegar a la página de autenticación biométrica
    navigate(`/app/contracts/${contractId}/authenticate`);
  }, [navigate]);

  const handleSendBiometricReminder = useCallback((candidate: MatchedCandidate) => {
    if (!candidate.workflow_data.contract_created) return;
    
    const contractId = candidate.workflow_data.contract_created.contract_id;
    const tenantName = candidate.tenant.full_name;
    
    console.log('📬 Enviando recordatorio biométrico al arrendatario:', tenantName);
    
    // TODO: Implementar API para enviar recordatorio
    // Por ahora simulamos el envío
    setSnackbar({
      open: true,
      message: `📬 Recordatorio enviado a ${tenantName} para completar su autenticación biométrica`,
      severity: 'info'
    });
  }, []);

  const handleViewContract = useCallback((candidate: MatchedCandidate) => {
    if (!candidate.workflow_data.contract_created) return;
    
    const contractId = candidate.workflow_data.contract_created.contract_id;
    console.log('📄 Viendo contrato:', contractId);
    
    // Navegar a la vista del contrato
    navigate(`/app/contracts/${contractId}`);
  }, [navigate]);

  const handleViewContractStatus = useCallback((candidate: MatchedCandidate) => {
    if (!candidate.workflow_data.contract_created) return;
    
    const contractId = candidate.workflow_data.contract_created.contract_id;
    console.log('📊 Viendo estado del contrato:', contractId);
    
    // Navegar directamente al contrato específico
    navigate(`/app/contracts/${contractId}`);
  }, [navigate]);

  const handleDeliverKeys = useCallback(async (candidate: MatchedCandidate) => {
    if (!candidate.workflow_data.contract_created) return;
    
    const contractId = candidate.workflow_data.contract_created.contract_id;
    console.log('🔑 Confirmando entrega de llaves para contrato:', contractId);
    
    // TODO: Implementar API para confirmar entrega de llaves
    // navigate(`/app/contracts/${contractId}/deliver-keys`);
    
    alert('🔑 Funcionalidad de entrega de llaves en desarrollo');
  }, []);

  const handleStartExecution = useCallback(async (candidate: MatchedCandidate) => {
    if (!candidate.workflow_data.contract_created) return;
    
    const contractId = candidate.workflow_data.contract_created.contract_id;
    console.log('▶️ Iniciando ejecución del contrato:', contractId);
    
    // TODO: Implementar API para iniciar ejecución del contrato
    alert('▶️ Funcionalidad de inicio de ejecución en desarrollo');
  }, []);

  // ETAPA 4: Botones para autenticación biométrica
  const renderBiometricActionButtons = useCallback((candidate: MatchedCandidate) => {
    const contractInfo = candidate.workflow_data.contract_created;
    if (!contractInfo) return null;

    // AMBAS PARTES AUTENTICADAS: Listo para avanzar a Etapa 5
    if (contractInfo.landlord_auth_completed && contractInfo.tenant_auth_completed) {
      return (
        <>
          <Button
            variant="contained"
            color="success"
            startIcon={<NextIcon />}
            onClick={() => handleWorkflowAction(candidate, { type: 'advance_to_execution' })}
            size="small"
          >
            🎉 ¡Avanzar a Entrega de Llaves!
          </Button>
          <Button
            variant="outlined"
            color="info"
            startIcon={<InfoIcon />}
            onClick={() => handleViewContractStatus(candidate)}
            size="small"
          >
            Ver Contrato Completo
          </Button>
        </>
      );
    }

    // Arrendador ya autenticado, esperando arrendatario
    if (contractInfo.landlord_auth_completed && !contractInfo.tenant_auth_completed) {
      return (
        <>
          <Button
            variant="outlined"
            color="info"
            startIcon={<InfoIcon />}
            size="small"
            disabled
          >
            ✅ Tu autenticación completada - Esperando arrendatario
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<InfoIcon />}
            onClick={() => handleViewContractStatus(candidate)}
            size="small"
          >
            Ver Estado
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<BiometricIcon />}
            onClick={() => handleSendBiometricReminder(candidate)}
            size="small"
          >
            📬 Recordar al Arrendatario
          </Button>
        </>
      );
    }

    // Arrendatario ya autenticado, esperando arrendador
    if (!contractInfo.landlord_auth_completed && contractInfo.tenant_auth_completed) {
      return (
        <>
          <Button
            variant="contained"
            color="primary"
            startIcon={<BiometricIcon />}
            onClick={() => handleStartBiometricAuth(candidate)}
            size="small"
          >
            🔐 Completar Mi Autenticación
          </Button>
          <Button
            variant="outlined"
            color="info"
            startIcon={<InfoIcon />}
            size="small"
            disabled
          >
            ✅ Arrendatario ya autenticado
          </Button>
        </>
      );
    }

    // Ninguno autenticado - Arrendador debe iniciar
    if (!contractInfo.landlord_auth_completed && !contractInfo.tenant_auth_completed) {
      return (
        <>
          <Button
            variant="contained"
            color="primary"
            startIcon={<BiometricIcon />}
            onClick={() => handleStartBiometricAuth(candidate)}
            size="small"
          >
            🔐 Iniciar Mi Autenticación Biométrica
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<InfoIcon />}
            onClick={() => handleViewContractStatus(candidate)}
            size="small"
          >
            Ver Estado del Contrato
          </Button>
        </>
      );
    }

    return null;
  }, [handleStartBiometricAuth, handleViewContractStatus, handleSendBiometricReminder]);

  // ETAPA 5: Botones para entrega y ejecución
  const renderExecutionActionButtons = useCallback((candidate: MatchedCandidate) => {
    const contractInfo = candidate.workflow_data.contract_created;
    if (!contractInfo) return null;

    // Contrato ya en ejecución
    if (contractInfo.execution_started) {
      return (
        <Button
          variant="contained"
          color="success"
          startIcon={<OpenIcon />}
          onClick={() => handleViewContract(candidate)}
          size="small"
        >
          📋 Ver Contrato Activo
        </Button>
      );
    }

    // Llaves entregadas, listo para iniciar ejecución
    if (contractInfo.keys_delivered) {
      return (
        <Button
          variant="contained"
          color="success"
          startIcon={<ContinueIcon />}
          onClick={() => handleStartExecution(candidate)}
          size="small"
        >
          ▶️ Iniciar Ejecución del Contrato
        </Button>
      );
    }

    // Ambas partes autenticadas, listo para entrega
    if (contractInfo.tenant_auth_completed && contractInfo.landlord_auth_completed) {
      return (
        <>
          <Button
            variant="contained"
            color="primary"
            startIcon={<CalendarIcon />}
            onClick={() => handleDeliverKeys(candidate)}
            size="small"
          >
            🔑 Confirmar Entrega de Llaves
          </Button>
          {contractInfo.move_in_date && (
            <Chip
              label={`Mudanza: ${new Date(contractInfo.move_in_date).toLocaleDateString('es-CO')}`}
              size="small"
              color="info"
              variant="outlined"
            />
          )}
        </>
      );
    }

    return (
      <Button
        variant="outlined"
        color="warning"
        startIcon={<InfoIcon />}
        size="small"
        disabled
      >
        ⏳ Esperando autenticación completa
      </Button>
    );
  }, [handleViewContract, handleStartExecution, handleDeliverKeys]);

  const CandidateCard: React.FC<{ candidate: MatchedCandidate }> = ({ candidate }) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(amount);
    };

    return (
      <Card sx={{ mb: 3, border: '2px solid #e3f2fd' }}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main', mr: 2 }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {candidate.tenant.full_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Match #{candidate.match_code}
                </Typography>
              </Box>
            </Box>
            <Chip 
              label={getStageLabel(candidate.workflow_stage)}
              color={getStageColor(candidate.workflow_stage) as any}
              variant="outlined"
            />
          </Box>

          {/* Progress Bar */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Progreso del Proceso
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={(candidate.workflow_stage / 3) * 100}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* Property and Candidate Info */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <HomeIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Propiedad
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight="medium">
                {candidate.property.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {candidate.property.address}
              </Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(candidate.property.rent_price)}/mes
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PersonIcon sx={{ color: 'secondary.main', mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Información del Candidato
                </Typography>
              </Box>
              <Stack spacing={0.5}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <EmailIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">{candidate.tenant.email}</Typography>
                </Box>
                {candidate.tenant.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PhoneIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">{candidate.tenant.phone}</Typography>
                  </Box>
                )}
                {candidate.tenant.city && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocationIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {candidate.tenant.city}, {candidate.tenant.country}
                    </Typography>
                  </Box>
                )}
                {candidate.monthly_income && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <MoneyIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      Ingresos: {formatCurrency(candidate.monthly_income)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Grid>
          </Grid>

          {/* Tenant Message */}
          {candidate.tenant_message && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid #e0e0e0' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Mensaje del Candidato:
              </Typography>
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                "{candidate.tenant_message}"
              </Typography>
            </Box>
          )}

          {/* Workflow Status */}
          {candidate.workflow_data.visit_scheduled && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>Visita Programada</AlertTitle>
              Fecha: {new Date(candidate.workflow_data.visit_scheduled.date).toLocaleDateString()} a las {candidate.workflow_data.visit_scheduled.time}
              {candidate.workflow_data.visit_scheduled.notes && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Notas: {candidate.workflow_data.visit_scheduled.notes}
                </Typography>
              )}
            </Alert>
          )}

          {candidate.workflow_data.documents_reviewed && (
            <Alert severity={candidate.workflow_data.documents_reviewed.approved ? "success" : "warning"} sx={{ mb: 2 }}>
              <AlertTitle>Documentos Revisados</AlertTitle>
              Estado: {candidate.workflow_data.documents_reviewed.approved ? "Aprobados" : "Pendientes"}
              {candidate.workflow_data.documents_reviewed.notes && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Notas: {candidate.workflow_data.documents_reviewed.notes}
                </Typography>
              )}
            </Alert>
          )}

          {/* Mostrar información del contrato si existe */}
          {candidate.workflow_data.contract_created && (
            <Alert 
              severity="info" 
              sx={{ 
                mb: 2,
                border: '2px solid',
                borderColor: 'primary.main'
              }}
              icon={<ContractIcon />}
            >
              <AlertTitle>Contrato Creado</AlertTitle>
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>ID del Contrato:</strong> {candidate.workflow_data.contract_created.contract_id.slice(0, 8)}...
                </Typography>
                <Typography variant="body2">
                  <strong>Estado:</strong> {candidate.workflow_data.contract_created.status}
                </Typography>
                {candidate.workflow_data.contract_created.biometric_state && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BiometricIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                    <Typography variant="body2">
                      <strong>Estado:</strong> {getBiometricStateLabel(candidate.workflow_data.contract_created.biometric_state, candidate.workflow_data.contract_created)}
                    </Typography>
                  </Box>
                )}
                {candidate.workflow_data.contract_created.move_in_date && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon sx={{ fontSize: 20, color: 'secondary.main' }} />
                    <Typography variant="body2">
                      <strong>Fecha de Mudanza:</strong> {new Date(candidate.workflow_data.contract_created.move_in_date).toLocaleDateString('es-CO')}
                    </Typography>
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary">
                  Creado: {new Date(candidate.workflow_data.contract_created.created_at).toLocaleString()}
                </Typography>
              </Stack>
            </Alert>
          )}

          {/* Action Buttons based on stage */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {candidate.workflow_stage === 1 && (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<VisitIcon />}
                  onClick={() => handleScheduleVisit(candidate)}
                  size="small"
                >
                  Programar Visita
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<NextIcon />}
                  onClick={() => handleWorkflowAction(candidate, { type: 'visit_completed' })}
                  size="small"
                >
                  Visita Realizada
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<RejectIcon />}
                  onClick={() => handleWorkflowAction(candidate, { type: 'reject' })}
                  size="small"
                >
                  Rechazar
                </Button>
              </>
            )}

            {candidate.workflow_stage === 2 && (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<DocumentsIcon />}
                  onClick={() => handleReviewDocuments(candidate)}
                  size="small"
                >
                  Revisar Documentos
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<ApproveIcon />}
                  onClick={() => handleWorkflowAction(candidate, { type: 'documents_approved' })}
                  size="small"
                >
                  Aprobar Todos
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<RejectIcon />}
                  onClick={() => handleWorkflowAction(candidate, { type: 'reject' })}
                  size="small"
                >
                  Rechazar Candidato
                </Button>
              </>
            )}

            {/* ETAPA 3: CREACIÓN DEL CONTRATO */}
            {candidate.workflow_stage === 3 && (
              <>
                {candidate.workflow_data.contract_created ? (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<ContractIcon />}
                    onClick={() => handleWorkflowAction(candidate, { type: 'approve_draft' })}
                    size="small"
                  >
                    Aprobar y Avanzar a Autenticación
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<ContractIcon />}
                      onClick={() => handleWorkflowAction(candidate, { type: 'contract_create' })}
                      size="small"
                    >
                      Crear Borrador del Contrato
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<RejectIcon />}
                      onClick={() => handleWorkflowAction(candidate, { type: 'reject' })}
                      size="small"
                    >
                      Rechazar
                    </Button>
                  </>
                )}
              </>
            )}

            {/* ETAPA 4: AUTENTICACIÓN BIOMÉTRICA */}
            {candidate.workflow_stage === 4 && candidate.workflow_data.contract_created && isContractReadyForBiometric(candidate.workflow_data.contract_created) && (
              <>
                <Chip
                  icon={<BiometricIcon />}
                  label={getBiometricStateLabel(candidate.workflow_data.contract_created.biometric_state, candidate.workflow_data.contract_created)}
                  color={getBiometricStateColor(candidate.workflow_data.contract_created.biometric_state, candidate.workflow_data.contract_created)}
                  variant="outlined"
                  size="small"
                  sx={{ mr: 1 }}
                />
                {renderBiometricActionButtons(candidate)}
              </>
            )}
            {candidate.workflow_stage === 4 && candidate.workflow_data.contract_created && !isContractReadyForBiometric(candidate.workflow_data.contract_created) && (
              <>
                <Chip
                  icon={<WarningIcon />}
                  label="Pendiente aprobación del arrendatario"
                  color="warning"
                  variant="outlined"
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  El contrato debe ser aprobado por el arrendatario antes de iniciar la autenticación biométrica.
                </Typography>
              </>
            )}

            {/* ETAPA 5: ENTREGA Y EJECUCIÓN */}
            {candidate.workflow_stage === 5 && candidate.workflow_data.contract_created && (
              <>
                <Chip
                  icon={<CalendarIcon />}
                  label={candidate.workflow_data.contract_created.execution_started ? 'Contrato Activo' : 'Pendiente Entrega'}
                  color={candidate.workflow_data.contract_created.execution_started ? 'success' : 'warning'}
                  variant="outlined"
                  size="small"
                  sx={{ mr: 1 }}
                />
                {renderExecutionActionButtons(candidate)}
              </>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Memoizar handlers para evitar re-renders
  const handleCloseDialog = useCallback(() => {
    setWorkflowDialogOpen(false);
  }, []);

  const handleDocumentsNotesChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setDocumentsNotes(event.target.value);
  }, []);

  const handleRejectionReasonChange = useCallback((event: SelectChangeEvent<string>) => {
    setRejectionReason(event.target.value);
  }, []);

  const getDialogTitle = () => {
    if (!currentAction) return 'Acción';
    switch (currentAction.type) {
      case 'visit_completed': return 'Confirmar Visita Completada';
      case 'documents_request': return 'Solicitar Documentos';
      case 'documents_approved': return 'Aprobar Documentos';
      case 'contract_create': return 'Crear Contrato';
      case 'advance_to_execution': return 'Avanzar a Entrega de Llaves';
      case 'reject': return 'Rechazar Candidato';
      default: return 'Acción';
    }
  };

  const getDialogContent = () => {
    if (!currentAction) return null;
    
    switch (currentAction.type) {
      case 'visit_completed':
        return (
          <Typography>
            ¿Confirmas que la visita se realizó exitosamente? El candidato pasará a la etapa de documentos.
          </Typography>
        );

      case 'documents_request':
        return (
          <Typography>
            Se enviará una solicitud al candidato para que proporcione los documentos necesarios.
          </Typography>
        );

      case 'documents_approved':
        return (
          <Stack spacing={2}>
            <Typography>
              ¿Confirmas que has revisado y aprobado todos los documentos del candidato?
            </Typography>
            <TextField
              label="Notas de revisión (opcional)"
              multiline
              rows={3}
              value={documentsNotes}
              onChange={handleDocumentsNotesChange}
              fullWidth
              placeholder="Añade cualquier comentario sobre la aprobación de documentos..."
            />
          </Stack>
        );

      case 'contract_create':
        return (
          <Typography>
            Se iniciará el proceso de creación de contrato. El candidato será dirigido al flujo de contratos existente.
          </Typography>
        );

      case 'advance_to_execution':
        return (
          <Stack spacing={2}>
            <Typography>
              🎉 ¡Excelente! Ambas partes han completado la autenticación biométrica exitosamente.
            </Typography>
            <Typography>
              ¿Confirmas que todo está listo para avanzar a la etapa de entrega de llaves y ejecución del contrato?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Al confirmar, el proceso avanzará a la Etapa 5: Entrega de Llaves y Ejecución del Contrato.
            </Typography>
          </Stack>
        );

      case 'reject':
        return (
          <Stack spacing={2}>
            <Typography color="error">
              ¿Estás seguro de que quieres rechazar este candidato?
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Motivo del Rechazo</InputLabel>
              <Select
                value={rejectionReason}
                onChange={handleRejectionReasonChange}
                label="Motivo del Rechazo"
              >
                <MenuItem value="no_meet_requirements">No cumple requisitos</MenuItem>
                <MenuItem value="failed_visit">Visita no exitosa</MenuItem>
                <MenuItem value="documentation_issues">Problemas con documentación</MenuItem>
                <MenuItem value="found_better_candidate">Encontré mejor candidato</MenuItem>
                <MenuItem value="other">Otro</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        );

      default:
        return <Typography>Acción no reconocida</Typography>;
    }
  };

  const isFormValid = () => {
    if (!currentAction) return false;
    switch (currentAction.type) {
      case 'reject':
        return rejectionReason.trim() !== '';
      default:
        return true;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando candidatos aprobados...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Candidatos Aprobados - Módulo de Contratos
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona el proceso de 3 etapas para convertir matches aprobados en contratos firmados.
          </Typography>
          
          {/* Workflow Completo de 5 Etapas */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              🔄 Workflow Completo del Proceso de Contratación
            </Typography>
            <Stepper activeStep={-1} sx={{ mb: 2 }} orientation="vertical">
              <Step>
                <StepLabel>
                  <Typography variant="body2">
                    <strong>🏠 Etapa 1: Visita</strong><br />
                    Programa y realiza visita a la propiedad
                  </Typography>
                </StepLabel>
              </Step>
              <Step>
                <StepLabel>
                  <Typography variant="body2">
                    <strong>📄 Etapa 2: Documentos</strong><br />
                    Solicita y revisa documentación del arrendatario
                  </Typography>
                </StepLabel>
              </Step>
              <Step>
                <StepLabel>
                  <Typography variant="body2">
                    <strong>📋 Etapa 3: Creación del Contrato</strong><br />
                    Crea borrador y espera aprobación del arrendatario
                  </Typography>
                </StepLabel>
              </Step>
              <Step>
                <StepLabel>
                  <Typography variant="body2">
                    <strong>🔐 Etapa 4: Autenticación Biométrica</strong><br />
                    Ambas partes completan autenticación (Arrendador → Arrendatario)
                  </Typography>
                </StepLabel>
              </Step>
              <Step>
                <StepLabel>
                  <Typography variant="body2">
                    <strong>🔑 Etapa 5: Entrega y Ejecución</strong><br />
                    Entrega de llaves e inicio oficial del contrato
                  </Typography>
                </StepLabel>
              </Step>
            </Stepper>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Candidates List */}
      {candidates.length === 0 ? (
        <Alert severity="info">
          <AlertTitle>No hay candidatos aprobados</AlertTitle>
          Los matches que apruebes en la evaluación de candidatos aparecerán aquí para continuar el proceso hacia contrato.
        </Alert>
      ) : (
        <>
          <Typography variant="h6" gutterBottom>
            Candidatos en Proceso ({candidates.length})
          </Typography>
          
          {candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </>
      )}

      {/* Workflow Action Dialog */}
      <Dialog 
        open={workflowDialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        disablePortal={false}
        keepMounted={false}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {getDialogTitle()}
            <IconButton onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {getDialogContent()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseDialog}
            disabled={actionLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={executeWorkflowAction}
            disabled={!isFormValid() || actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Visit Schedule Modal - Independiente */}
      <VisitScheduleModal
        open={visitModalOpen}
        onClose={() => setVisitModalOpen(false)}
        onConfirm={handleConfirmVisit}
        candidateName={selectedCandidateForVisit?.tenant.full_name || ''}
        propertyTitle={selectedCandidateForVisit?.property.title || ''}
      />

      {/* Document Review Modal */}
      <Dialog 
        open={documentsModalOpen} 
        onClose={handleCloseDocumentsModal}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <DocumentIcon />
            <Box>
              <Typography variant="h6">
                Revisión de Documentos - Etapa 2
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedCandidateForDocuments?.tenant.full_name} - {selectedCandidateForDocuments?.property.title}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {selectedCandidateForDocuments && (
            <LandlordDocumentReview
              processId={selectedCandidateForDocuments.id}
              onDocumentReviewed={() => {
                console.log('Documento revisado, actualizando vista...');
              }}
              onAllApproved={() => {
                console.log('Todos los documentos aprobados!');
                // Opcional: cerrar modal automáticamente o mostrar mensaje
              }}
            />
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDocumentsModal} variant="contained">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MatchedCandidatesView;