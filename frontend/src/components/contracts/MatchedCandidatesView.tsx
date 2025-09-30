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
  LinearProgress,
  Fade,
  Slide,
  Zoom,
  Grow,
  Collapse,
  useTheme
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import ContractClausesEditor from './ContractClausesEditor';


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
  CheckCircle as CheckCircleIcon,
  Cancel as RejectIcon,
  NavigateNext as NextIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Upload as UploadIcon,
  Description as DocumentIcon,
  Description as DescriptionIcon,
  Fingerprint as BiometricIcon,
  OpenInNew as OpenIcon,
  PlayArrow as ContinueIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import VisitScheduleModal from './VisitScheduleModal';
import LandlordDocumentReview from './LandlordDocumentReview';
import { viewContractPDF } from '../../utils/contractPdfUtils';

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
  
  // Estados para el editor de cláusulas
  const [clausesEditorOpen, setClausesEditorOpen] = useState(false);
  const [selectedContractForClauses, setSelectedContractForClauses] = useState<string | null>(null);

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

  // Helper para verificar si el contrato está en ETAPA BIOMÉTRICA (cualquier fase)
  const isContractReadyForBiometric = (contractInfo: any, candidate?: any) => {
    if (!contractInfo) {
      return false;
    }

    // Logs removidos para limpiar consola

    // ETAPA BIOMÉTRICA: Si estamos en workflow stage 4 con cualquier estado biométrico
    if (candidate &&
        candidate.workflow_stage === 4 &&
        (candidate.workflow_status === 'pending_tenant_biometric' ||
         candidate.workflow_status === 'pending_guarantor_biometric' ||
         candidate.workflow_status === 'pending_landlord_biometric' ||
         candidate.workflow_status === 'biometric_pending')) {
      return true;
    }

    // Estados de contrato que permiten autenticación biométrica
    const allowedBiometricStates = [
      'ready_for_authentication',
      'pending_biometric',
      'pending_authentication',
      'pending_landlord_authentication',
      'authenticated_pending_signature',
      'partially_signed',
      'fully_signed'
    ];

    return allowedBiometricStates.includes(contractInfo.status);
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
    alert(`📬 Recordatorio enviado a ${tenantName} para completar su autenticación biométrica`);
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

  const handleLandlordApproveContract = useCallback(async (contractId: string) => {
    try {
      setActionLoading(true);

      console.log('✅ Arrendador aprobando contrato:', contractId);

      const response = await api.post(`/api/v1/contracts/landlord/contracts/${contractId}/approve_contract/`, {
        approved: true,
        landlord_notes: 'Aprobado desde el dashboard del arrendador',
        confirm_understanding: true
      });

      if (response.status === 200) {
        console.log('✅ Contract approved by landlord successfully:', response.data);

        // Recargar los datos para reflejar el cambio
        await fetchMatchedCandidates();

        alert('🎉 ¡Contrato aprobado exitosamente! El proceso ahora avanzará a la autenticación biométrica.');
      } else {
        const errorData = response.data;
        console.error('❌ Error approving contract:', errorData);
        alert(`Error al aprobar contrato: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ Error approving contract:', error);
      alert('Error al aprobar el contrato. Por favor intenta nuevamente.');
    } finally {
      setActionLoading(false);
    }
  }, [fetchMatchedCandidates]);

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

    // Ninguno autenticado - ARRENDATARIO DEBE INICIAR PRIMERO (orden secuencial)
    if (!contractInfo.landlord_auth_completed && !contractInfo.tenant_auth_completed) {
      return (
        <>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<InfoIcon />}
            size="small"
            disabled
          >
            ⏳ Esperando que el arrendatario inicie la autenticación
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
    const theme = useTheme();
    const [isHovered, setIsHovered] = useState(false);

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(amount);
    };

    const getStageGradient = (stage: number) => {
      switch (stage) {
        case 1: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        case 2: return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        case 3: return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
        case 4: return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
        case 5: return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
        default: return 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)';
      }
    };

    const getStageIcon = (stage: number) => {
      switch (stage) {
        case 1: return <VisitIcon sx={{ color: 'white', fontSize: '1.2rem' }} />;
        case 2: return <DocumentsIcon sx={{ color: 'white', fontSize: '1.2rem' }} />;
        case 3: return <ContractIcon sx={{ color: 'white', fontSize: '1.2rem' }} />;
        case 4: return <BiometricIcon sx={{ color: 'white', fontSize: '1.2rem' }} />;
        case 5: return <CalendarIcon sx={{ color: 'white', fontSize: '1.2rem' }} />;
        default: return <InfoIcon sx={{ color: 'white', fontSize: '1.2rem' }} />;
      }
    };

    return (
      <Grow in timeout={800}>
        <Card
          sx={{
            mb: 4,
            borderRadius: 4,
            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid',
            borderColor: isHovered ? 'primary.main' : 'grey.200',
            boxShadow: isHovered
              ? '0 20px 40px rgba(0, 0, 0, 0.1), 0 10px 20px rgba(0, 0, 0, 0.05)'
              : '0 8px 24px rgba(0, 0, 0, 0.08)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: getStageGradient(candidate.workflow_stage),
              zIndex: 1
            }
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
        <CardContent sx={{ p: 4, position: 'relative' }}>
          {/* Revolutionary Header with Premium Design */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  position: 'relative',
                  mr: 3
                }}
              >
                <Avatar
                  sx={{
                    width: 72,
                    height: 72,
                    background: getStageGradient(candidate.workflow_stage),
                    border: '4px solid white',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2), 0 6px 16px rgba(0, 0, 0, 0.1)',
                    fontSize: '1.75rem',
                    fontWeight: 'bold',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.25)'
                    }
                  }}
                >
                  {candidate.tenant.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </Avatar>
                {candidate.tenant.is_verified && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -3,
                      right: -3,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #4caf50, #8bc34a)',
                      border: '3px solid white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)',
                      animation: 'pulse 2s infinite'
                    }}
                  >
                    ✓
                  </Box>
                )}
              </Box>
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1,
                    letterSpacing: '-0.5px'
                  }}
                >
                  {candidate.tenant.full_name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box
                    sx={{
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      background: 'linear-gradient(45deg, #f093fb, #f5576c)',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(240, 147, 251, 0.3)'
                    }}
                  >
                    Match #{candidate.match_code}
                  </Box>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #667eea, #764ba2)',
                      boxShadow: '0 0 8px rgba(102, 126, 234, 0.5)'
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 500
                    }}
                  >
                    {new Date(candidate.created_at).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Typography>
                </Box>
                {/* Premium Status Badge */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1.5,
                      background: candidate.tenant.is_verified
                        ? 'linear-gradient(45deg, #4caf50, #8bc34a)'
                        : 'linear-gradient(45deg, #ffc107, #ff9800)',
                      color: 'white',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    {candidate.tenant.is_verified ? '✓ VERIFICADO' : '⏳ PENDIENTE'}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    • Candidato Premium
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
              <Zoom in timeout={600}>
                <Box
                  sx={{
                    px: 3,
                    py: 1.5,
                    borderRadius: 3,
                    background: getStageGradient(candidate.workflow_stage),
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1rem',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    minWidth: 200,
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      transition: 'left 0.5s ease',
                    },
                    '&:hover::before': {
                      left: '100%'
                    }
                  }}
                >
                  {getStageIcon(candidate.workflow_stage)}
                  {getStageLabel(candidate.workflow_stage)}
                </Box>
              </Zoom>
              {/* Premium Progress Ring */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: `conic-gradient(${getStageGradient(candidate.workflow_stage).replace('linear-gradient(135deg,', '').replace(')', '')} ${(candidate.workflow_stage / 5) * 100}%, #f0f0f0 0%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'white'
                    }
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: 'primary.main',
                      position: 'relative',
                      zIndex: 1
                    }}
                  >
                    {candidate.workflow_stage}/5
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {Math.round((candidate.workflow_stage / 5) * 100)}% Completado
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Revolutionary Progress Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                🚀 Progreso del Proceso VeriHome
              </Typography>
              <Box
                sx={{
                  px: 3,
                  py: 1,
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  boxShadow: '0 6px 20px rgba(102, 126, 234, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    animation: 'shimmer 2s infinite'
                  }
                }}
              >
                ⭐ Etapa {candidate.workflow_stage} de 5
              </Box>
            </Box>

            {/* Advanced Progress Visualization */}
            <Box sx={{ position: 'relative', mb: 3 }}>
              {/* Background Track */}
              <Box
                sx={{
                  height: 16,
                  borderRadius: 8,
                  background: 'linear-gradient(90deg, #f0f2f5 0%, #e4e7eb 100%)',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
              >
                {/* Animated Progress Bar */}
                <Box
                  sx={{
                    width: `${(candidate.workflow_stage / 5) * 100}%`,
                    height: '100%',
                    borderRadius: 8,
                    background: getStageGradient(candidate.workflow_stage),
                    position: 'relative',
                    transition: 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                      animation: 'progressShine 2s infinite'
                    }
                  }}
                />

                {/* Progress Marker */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: `${(candidate.workflow_stage / 5) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'white',
                    border: '4px solid',
                    borderColor: 'primary.main',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15), 0 0 0 4px rgba(25, 118, 210, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    animation: 'pulse 2s infinite',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #667eea, #764ba2)',
                      animation: 'spin 3s linear infinite'
                    }
                  }}
                />
              </Box>

              {/* Stage Markers */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                {[1, 2, 3, 4, 5].map((stage) => (
                  <Box
                    key={stage}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      opacity: stage <= candidate.workflow_stage ? 1 : 0.4,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: stage <= candidate.workflow_stage
                          ? getStageGradient(stage)
                          : 'linear-gradient(45deg, #f0f2f5, #e4e7eb)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        boxShadow: stage <= candidate.workflow_stage
                          ? '0 4px 12px rgba(0, 0, 0, 0.2)'
                          : 'none',
                        mb: 1
                      }}
                    >
                      {stage <= candidate.workflow_stage ? '✓' : stage}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        textAlign: 'center',
                        fontWeight: stage <= candidate.workflow_stage ? 600 : 400,
                        color: stage <= candidate.workflow_stage ? 'text.primary' : 'text.secondary',
                        maxWidth: 60,
                        lineHeight: 1.2
                      }}
                    >
                      {getStageLabel(stage).split(':')[1] || getStageLabel(stage)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Progress Stats */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                p: 2,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                border: '1px solid',
                borderColor: 'grey.200'
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {Math.round((candidate.workflow_stage / 5) * 100)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Completado
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {5 - candidate.workflow_stage}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Etapas Restantes
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.main' }}>
                  ~{(5 - candidate.workflow_stage) * 2-3}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Días Estimados
                </Typography>
              </Box>
            </Box>
          </Box>

          <style jsx>{`
            @keyframes shimmer {
              0% { left: -100%; }
              100% { left: 100%; }
            }
            @keyframes progressShine {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(300%); }
            }
            @keyframes pulse {
              0%, 100% { box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15), 0 0 0 4px rgba(25, 118, 210, 0.1); }
              50% { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 0 0 8px rgba(25, 118, 210, 0.2); }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>

          {/* Premium Property & Candidate Information Cards */}
          <Grid container spacing={4} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 4,
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                  border: '2px solid transparent',
                  backgroundClip: 'padding-box',
                  position: 'relative',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    borderRadius: 'inherit',
                    padding: '2px',
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'xor',
                    zIndex: -1
                  },
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 60px rgba(102, 126, 234, 0.25)',
                    '&::before': {
                      background: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)',
                    }
                  }
                }}
              >
                {/* Premium Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      mr: 2,
                      boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: '-50%',
                        left: '-50%',
                        width: '200%',
                        height: '200%',
                        background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
                        animation: 'spin 3s linear infinite'
                      }
                    }}
                  >
                    <HomeIcon sx={{ color: 'white', fontSize: '2rem', position: 'relative', zIndex: 1 }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 0.5
                      }}
                    >
                      🏠 Propiedad Premium
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Detalles de la vivienda seleccionada
                    </Typography>
                  </Box>
                </Box>

                {/* Property Title */}
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    mb: 2,
                    color: 'text.primary',
                    lineHeight: 1.3
                  }}
                >
                  {candidate.property.title}
                </Typography>

                {/* Location with Enhanced Design */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 3,
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(45deg, #f8fafc, #ffffff)',
                    border: '1px solid rgba(102, 126, 234, 0.1)'
                  }}
                >
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #4facfe, #00f2fe)',
                      mr: 2
                    }}
                  >
                    <LocationIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {candidate.property.address}
                  </Typography>
                </Box>

                {/* Property Stats */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Box
                    sx={{
                      flex: 1,
                      p: 2,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #4facfe10, #00f2fe10)',
                      textAlign: 'center',
                      border: '1px solid rgba(79, 172, 254, 0.2)'
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {candidate.property.bedrooms}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Habitaciones
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      p: 2,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #43e97b10, #38f9d710)',
                      textAlign: 'center',
                      border: '1px solid rgba(67, 233, 123, 0.2)'
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {candidate.property.bathrooms}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Baños
                    </Typography>
                  </Box>
                </Box>

                {/* Premium Price Card */}
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
                    color: 'white',
                    textAlign: 'center',
                    boxShadow: '0 12px 32px rgba(76, 175, 80, 0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      transition: 'left 0.6s ease'
                    },
                    '&:hover::before': {
                      left: '100%'
                    }
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mb: 1 }}>
                    💰 Canon Mensual
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      mb: 0.5,
                      textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    {formatCurrency(candidate.property.rent_price)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Pago mensual • Incluye administración
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 4,
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #f093fb15 0%, #f5576c15 100%)',
                  border: '2px solid transparent',
                  backgroundClip: 'padding-box',
                  position: 'relative',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                    borderRadius: 'inherit',
                    padding: '2px',
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'xor',
                    zIndex: -1
                  },
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 60px rgba(240, 147, 251, 0.25)',
                    '&::before': {
                      background: 'linear-gradient(135deg, #f093fb, #f5576c, #667eea)',
                    }
                  }
                }}
              >
                {/* Premium Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      mr: 2,
                      boxShadow: '0 8px 24px rgba(240, 147, 251, 0.3)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: '-50%',
                        left: '-50%',
                        width: '200%',
                        height: '200%',
                        background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
                        animation: 'spin 3s linear infinite'
                      }
                    }}
                  >
                    <PersonIcon sx={{ color: 'white', fontSize: '2rem', position: 'relative', zIndex: 1 }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 0.5
                      }}
                    >
                      👤 Perfil del Candidato
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Información personal y financiera
                    </Typography>
                  </Box>
                </Box>

                {/* Contact Information */}
                <Stack spacing={3}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 2.5,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                      border: '1px solid rgba(240, 147, 251, 0.15)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateX(4px)',
                        boxShadow: '0 8px 24px rgba(240, 147, 251, 0.15)'
                      }
                    }}
                  >
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: '50%',
                        background: 'linear-gradient(45deg, #4facfe, #00f2fe)',
                        mr: 2,
                        boxShadow: '0 4px 12px rgba(79, 172, 254, 0.3)'
                      }}
                    >
                      <EmailIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Correo Electrónico
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {candidate.tenant.email}
                      </Typography>
                    </Box>
                  </Box>

                  {candidate.tenant.phone && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        p: 2.5,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '1px solid rgba(76, 175, 80, 0.15)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateX(4px)',
                          boxShadow: '0 8px 24px rgba(76, 175, 80, 0.15)'
                        }
                      }}
                    >
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: '50%',
                          background: 'linear-gradient(45deg, #4caf50, #8bc34a)',
                          mr: 2,
                          boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
                        }}
                      >
                        <PhoneIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Teléfono de Contacto
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {candidate.tenant.phone}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {candidate.tenant.city && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        p: 2.5,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '1px solid rgba(255, 193, 7, 0.15)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateX(4px)',
                          boxShadow: '0 8px 24px rgba(255, 193, 7, 0.15)'
                        }
                      }}
                    >
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: '50%',
                          background: 'linear-gradient(45deg, #ffc107, #ff9800)',
                          mr: 2,
                          boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)'
                        }}
                      >
                        <LocationIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Ubicación Actual
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {candidate.tenant.city}, {candidate.tenant.country}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {candidate.monthly_income && (
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                        color: 'white',
                        boxShadow: '0 12px 32px rgba(250, 112, 154, 0.3)',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: '-100%',
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                          transition: 'left 0.6s ease'
                        },
                        '&:hover::before': {
                          left: '100%'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <MoneyIcon sx={{ fontSize: '1.5rem', mr: 1 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, opacity: 0.9 }}>
                          Capacidad Financiera
                        </Typography>
                      </Box>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 800,
                          textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                          mb: 0.5
                        }}
                      >
                        {formatCurrency(candidate.monthly_income)}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Ingresos mensuales declarados • {candidate.employment_type}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </Grid>
          </Grid>

          {/* Premium Tenant Message Section */}
          {candidate.tenant_message && (
            <Fade in timeout={1000}>
              <Box
                sx={{
                  mb: 4,
                  p: 4,
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #667eea08 0%, #764ba208 100%)',
                  border: '2px solid transparent',
                  backgroundClip: 'padding-box',
                  position: 'relative',
                  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.1)',
                  transition: 'all 0.3s ease',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    borderRadius: 'inherit',
                    padding: '2px',
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'xor',
                    zIndex: -1
                  },
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 40px rgba(102, 126, 234, 0.15)'
                  }
                }}
              >
                {/* Message Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: 4,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 3,
                      boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: '-50%',
                        left: '-50%',
                        width: '200%',
                        height: '200%',
                        background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
                        animation: 'spin 4s linear infinite'
                      }
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '2rem',
                        position: 'relative',
                        zIndex: 1
                      }}
                    >
                      💬
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 0.5
                      }}
                    >
                      💭 Mensaje Personal del Candidato
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Motivación y mensaje directo del arrendatario
                    </Typography>
                  </Box>
                </Box>

                {/* Premium Message Content */}
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid rgba(102, 126, 234, 0.1)',
                    position: 'relative',
                    '&::before': {
                      content: '"""',
                      position: 'absolute',
                      top: -10,
                      left: 20,
                      fontSize: '3rem',
                      color: 'primary.main',
                      opacity: 0.3,
                      fontFamily: 'serif'
                    },
                    '&::after': {
                      content: '"""',
                      position: 'absolute',
                      bottom: -20,
                      right: 20,
                      fontSize: '3rem',
                      color: 'primary.main',
                      opacity: 0.3,
                      fontFamily: 'serif',
                      transform: 'rotate(180deg)'
                    }
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontStyle: 'italic',
                      color: 'text.primary',
                      fontSize: '1.125rem',
                      lineHeight: 1.8,
                      textAlign: 'center',
                      position: 'relative',
                      zIndex: 1,
                      fontWeight: 500,
                      letterSpacing: '0.5px'
                    }}
                  >
                    "{candidate.tenant_message}"
                  </Typography>
                </Box>

                {/* Message Footer */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Box
                    sx={{
                      px: 3,
                      py: 1,
                      borderRadius: 2,
                      background: 'linear-gradient(45deg, #f093fb, #f5576c)',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(240, 147, 251, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <PersonIcon sx={{ fontSize: '1rem' }} />
                    Mensaje auténtico del candidato
                  </Box>
                </Box>
              </Box>
            </Fade>
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

          {/* Estado de la Visita - Mostrar información directamente en la tarjeta */}
          {candidate.workflow_stage === 1 && candidate.workflow_status === 'visit_scheduled' && (
            <Box 
              sx={{ 
                mt: 2, 
                p: 2, 
                bgcolor: 'success.light', 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'success.main',
                mb: 2
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <VisitIcon sx={{ color: 'success.dark', fontSize: 20 }} />
                  <Typography variant="subtitle2" color="success.dark" fontWeight={600}>
                    ✅ Visita Programada
                  </Typography>
                </Stack>
                
                {candidate.workflow_data?.visit_scheduled ? (
                  <Box sx={{ ml: 3 }}>
                    <Typography variant="body2" color="text.primary">
                      <strong>📅 Fecha:</strong> {candidate.workflow_data.visit_scheduled.date || 'Por confirmar'}
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      <strong>🕐 Hora:</strong> {candidate.workflow_data.visit_scheduled.time || 'Por confirmar'}
                    </Typography>
                    {candidate.workflow_data.visit_scheduled.notes && (
                      <Typography variant="body2" color="text.primary" sx={{ mt: 0.5 }}>
                        <strong>📝 Notas:</strong> {candidate.workflow_data.visit_scheduled.notes}
                      </Typography>
                    )}
                    <Typography variant="caption" color="info.dark" sx={{ display: 'block', mt: 1 }}>
                      📞 Estado: Coordinación confirmada
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ ml: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      📞 VeriHome coordinará los detalles en las próximas 24-48 horas
                    </Typography>
                    <Typography variant="caption" color="info.dark" sx={{ display: 'block', mt: 1 }}>
                      📋 Estado: Pendiente de coordinación profesional
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          )}

          {/* Premium Action Center */}
          <Box
            sx={{
              mt: 4,
              p: 4,
              borderRadius: 4,
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              border: '2px solid transparent',
              backgroundClip: 'padding-box',
              position: 'relative',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                borderRadius: 'inherit',
                padding: '2px',
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'xor',
                zIndex: -1
              }
            }}
          >
            {/* Action Header */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                ⚡ Centro de Acciones Premium
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Gestiona el proceso de aprobación con controles profesionales
              </Typography>
            </Box>

            {/* Action Buttons Container */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}
            >
            {candidate.workflow_stage === 1 && candidate.workflow_status !== 'visit_scheduled' && (
              <>
                <Button
                  variant="contained"
                  startIcon={<VisitIcon />}
                  onClick={() => handleScheduleVisit(candidate)}
                  size="large"
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                    fontSize: '1rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      transition: 'left 0.6s ease',
                    },
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 32px rgba(102, 126, 234, 0.4)',
                      '&::before': {
                        left: '100%'
                      }
                    }
                  }}
                >
                  🏠 Programar Visita Premium
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RejectIcon />}
                  onClick={() => handleWorkflowAction(candidate, { type: 'reject' })}
                  size="large"
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 3,
                    border: '2px solid',
                    borderColor: '#f44336',
                    color: '#f44336',
                    fontSize: '1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #ffffff 0%, #ffebee 100%)',
                    boxShadow: '0 4px 16px rgba(244, 67, 54, 0.2)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                      color: 'white',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(244, 67, 54, 0.3)'
                    }
                  }}
                >
                  ❌ Rechazar Candidato
                </Button>
              </>
            )}

            {candidate.workflow_stage === 1 && candidate.workflow_status === 'visit_scheduled' && (
              <Button
                variant="contained"
                startIcon={<NextIcon />}
                onClick={() => handleWorkflowAction(candidate, { type: 'visit_completed' })}
                size="large"
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
                  boxShadow: '0 8px 24px rgba(76, 175, 80, 0.3)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    transition: 'left 0.6s ease',
                  },
                  '&:hover': {
                    background: 'linear-gradient(135deg, #8bc34a 0%, #4caf50 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 32px rgba(76, 175, 80, 0.4)',
                    '&::before': {
                      left: '100%'
                    }
                  }
                }}
              >
                ✅ Confirmar Visita Realizada
              </Button>
            )}

            {candidate.workflow_stage === 2 && (
              <>
                <Button
                  variant="contained"
                  startIcon={<DocumentsIcon />}
                  onClick={() => handleReviewDocuments(candidate)}
                  size="large"
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    boxShadow: '0 8px 24px rgba(240, 147, 251, 0.3)',
                    fontSize: '1rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      transition: 'left 0.6s ease',
                    },
                    '&:hover': {
                      background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 32px rgba(240, 147, 251, 0.4)',
                      '&::before': {
                        left: '100%'
                      }
                    }
                  }}
                >
                  📄 Revisar Documentos Premium
                </Button>
                <Button
                  variant="contained"
                  startIcon={<ApproveIcon />}
                  onClick={() => handleWorkflowAction(candidate, { type: 'documents_approved' })}
                  size="large"
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    boxShadow: '0 8px 24px rgba(67, 233, 123, 0.3)',
                    fontSize: '1rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      transition: 'left 0.6s ease',
                    },
                    '&:hover': {
                      background: 'linear-gradient(135deg, #38f9d7 0%, #43e97b 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 32px rgba(67, 233, 123, 0.4)',
                      '&::before': {
                        left: '100%'
                      }
                    }
                  }}
                >
                  ✅ Aprobar Todos
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RejectIcon />}
                  onClick={() => handleWorkflowAction(candidate, { type: 'reject' })}
                  size="large"
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 3,
                    border: '2px solid',
                    borderColor: '#f44336',
                    color: '#f44336',
                    fontSize: '1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #ffffff 0%, #ffebee 100%)',
                    boxShadow: '0 4px 16px rgba(244, 67, 54, 0.2)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                      color: 'white',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(244, 67, 54, 0.3)'
                    }
                  }}
                >
                  ❌ Rechazar Candidato
                </Button>
              </>
            )}

            {/* ETAPA 3: CREACIÓN DEL CONTRATO */}
            {candidate.workflow_stage === 3 && (
              <>
                {candidate.workflow_data.contract_created ? (
                  <>
                    {/* Verificar el estado del contrato */}
                    {(() => {
                      const contractStatus = candidate.workflow_data.contract_created.status;
                      const contractId = candidate.workflow_data.contract_created.contract_id;
                      
                      // Si el contrato está pendiente de revisión del arrendatario
                      if (contractStatus === 'pending_tenant_review' || contractStatus === 'draft') {
                        return (
                          <>
                            <Chip
                              icon={<WarningIcon />}
                              label="Esperando aprobación del arrendatario"
                              color="warning"
                              variant="outlined"
                              size="small"
                              sx={{ mr: 1 }}
                            />
                            <Button
                              variant="outlined"
                              color="info"
                              startIcon={<VisitIcon />}
                              onClick={() => viewContractPDF(contractId)}
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              Ver Borrador
                            </Button>
                            <Button
                              variant="outlined"
                              color="secondary"
                              startIcon={<DescriptionIcon />}
                              onClick={() => viewContractPDF(contractId)}
                              size="small"
                            >
                              📄 Ver PDF
                            </Button>
                            <Button
                              variant="outlined"
                              color="warning"
                              startIcon={<EditIcon />}
                              onClick={() => {
                                setSelectedContractForClauses(contractId);
                                setClausesEditorOpen(true);
                              }}
                              size="small"
                            >
                              ➕ Editar Cláusulas
                            </Button>
                            {/* BOTÓN RECHAZAR PERSISTENTE - ETAPA 3 (Pendiente revisión) */}
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<RejectIcon />}
                              onClick={() => handleWorkflowAction(candidate, { type: 'reject' })}
                              size="small"
                              sx={{ ml: 1 }}
                            >
                              Rechazar Candidato
                            </Button>
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1, display: 'block', mt: 1 }}>
                              El arrendatario debe revisar y aprobar el contrato
                            </Typography>
                          </>
                        );
                      }
                      
                      // Si el arrendatario solicitó cambios
                      if (contractStatus === 'tenant_changes_requested') {
                        return (
                          <>
                            <Chip
                              icon={<InfoIcon />}
                              label="Cambios solicitados por arrendatario"
                              color="info"
                              variant="outlined"
                              size="small"
                              sx={{ mr: 1 }}
                            />
                            <Button
                              variant="contained"
                              color="primary"
                              startIcon={<EditIcon />}
                              onClick={() => navigate(`/app/contracts/${contractId}/edit`)}
                              size="small"
                            >
                              Editar Contrato
                            </Button>
                            {/* BOTÓN RECHAZAR PERSISTENTE - ETAPA 3 (Cambios solicitados) */}
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<RejectIcon />}
                              onClick={() => handleWorkflowAction(candidate, { type: 'reject' })}
                              size="small"
                              sx={{ ml: 1 }}
                            >
                              Rechazar Candidato
                            </Button>
                          </>
                        );
                      }

                      // Si el arrendatario aprobó y necesita aprobación del arrendador
                      // Verificar si el tenant ya aprobó:
                      // 1. Status explícito de aprobación del tenant
                      // 2. Status "contract_pending_tenant_approval" pero pending_tenant_approval = false (ya aprobó)
                      // 3. NUEVO: Status "BOTH_REVIEWING" con tenant_approved = true
                      const tenantAlreadyApproved =
                        contractStatus === 'pending_landlord_approval' ||
                        contractStatus === 'tenant_approved' ||
                        (contractStatus === 'contract_pending_tenant_approval' &&
                         candidate.workflow_data.contract_created.pending_tenant_approval === false) ||
                        (contractStatus === 'BOTH_REVIEWING' &&
                         candidate.workflow_data.contract_created.tenant_approved === true);

                      if (tenantAlreadyApproved) {
                        return (
                          <>
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="✅ Arrendatario Aprobó - Esperando tu aprobación"
                              color="success"
                              variant="filled"
                              size="small"
                              sx={{ mr: 1 }}
                            />
                            <Button
                              variant="contained"
                              color="primary"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => handleLandlordApproveContract(contractId)}
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              ✅ APROBAR CONTRATO
                            </Button>
                            <Button
                              variant="outlined"
                              color="secondary"
                              startIcon={<DescriptionIcon />}
                              onClick={() => viewContractPDF(contractId)}
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              📄 Ver PDF
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<RejectIcon />}
                              onClick={() => handleWorkflowAction(candidate, { type: 'reject' })}
                              size="small"
                              sx={{ ml: 1 }}
                            >
                              Rechazar Candidato
                            </Button>
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1, display: 'block', mt: 1 }}>
                              🎉 El arrendatario ya aprobó el contrato. Es tu turno de aprobar para continuar al siguiente paso.
                            </Typography>
                          </>
                        );
                      }

                      // Si el contrato fue aprobado por ambas partes y está en etapa 4 (biométrico)
                      if (contractStatus === 'ready_for_authentication' ||
                          contractStatus === 'approved_by_tenant' ||
                          contractStatus === 'pending_biometric' ||
                          (contractStatus === 'BOTH_REVIEWING' &&
                           candidate.workflow_stage === 4 &&
                           candidate.workflow_data.contract_created.tenant_approved === true)) {
                        return (
                          <>
                            {contractStatus === 'pending_biometric' ||
                             (contractStatus === 'BOTH_REVIEWING' && candidate.workflow_stage === 4) ? (
                              <>
                                {/* Determinar el estado del flujo biométrico */}
                                {(() => {
                                  const workflowStatus = candidate.workflow_status;
                                  const contractData = candidate.workflow_data?.contract_created;
                                  const hasGuarantor = contractData?.guarantor_id;

                                  // Flujo secuencial: Tenant → [Guarantor] → Landlord
                                  if (workflowStatus === 'biometric_pending' || workflowStatus === 'pending_tenant_biometric') {
                                    return (
                                      <>
                                        <Chip
                                          icon={<BiometricIcon />}
                                          label="🔄 Paso 1: Arrendatario iniciando autenticación"
                                          color="info"
                                          variant="filled"
                                          size="small"
                                          sx={{ mr: 1 }}
                                        />
                                        <Alert severity="info" sx={{ mt: 1, fontSize: '0.875rem' }}>
                                          💡 El arrendatario debe completar primero su autenticación biométrica.
                                          Una vez termine, {hasGuarantor ? 'el garante continuará y luego' : ''} podrás proceder con tu verificación.
                                        </Alert>
                                      </>
                                    );
                                  }

                                  if (workflowStatus === 'pending_guarantor_biometric' && hasGuarantor) {
                                    return (
                                      <>
                                        <Chip
                                          icon={<BiometricIcon />}
                                          label="🔄 Paso 2: Garante/Codeudor en proceso"
                                          color="warning"
                                          variant="filled"
                                          size="small"
                                          sx={{ mr: 1 }}
                                        />
                                        <Alert severity="warning" sx={{ mt: 1, fontSize: '0.875rem' }}>
                                          ⏳ El arrendatario completó su verificación. Ahora el garante/codeudor debe
                                          completar su autenticación antes de que puedas proceder.
                                        </Alert>
                                      </>
                                    );
                                  }

                                  if (workflowStatus === 'pending_landlord_biometric') {
                                    return (
                                      <>
                                        <Chip
                                          icon={<BiometricIcon />}
                                          label="🎯 Es tu turno: Completar autenticación"
                                          color="success"
                                          variant="filled"
                                          size="small"
                                          sx={{ mr: 1 }}
                                        />
                                        <Button
                                          variant="contained"
                                          color="success"
                                          startIcon={<BiometricIcon />}
                                          onClick={() => {
                                            const contractId = candidate.workflow_data?.contract_created?.contract_id;
                                            if (contractId) {
                                              console.log('🔐 Iniciando autenticación biométrica para contrato:', contractId);
                                              window.location.href = `/app/contracts/${contractId}/authenticate`;
                                            }
                                          }}
                                          size="small"
                                          sx={{ mr: 1, mt: 1 }}
                                        >
                                          🔐 Iniciar Mi Autenticación Biométrica
                                        </Button>
                                        <Alert severity="success" sx={{ mt: 1, fontSize: '0.875rem' }}>
                                          ✅ Todas las partes anteriores completaron su verificación. ¡Es tu turno para finalizar el proceso!
                                        </Alert>
                                      </>
                                    );
                                  }

                                  // Estado por defecto - esperando inicio del proceso
                                  return (
                                    <>
                                      <Chip
                                        icon={<BiometricIcon />}
                                        label="⏳ Esperando inicio del proceso biométrico"
                                        color="warning"
                                        variant="filled"
                                        size="small"
                                        sx={{ mr: 1 }}
                                      />
                                      <Alert severity="warning" sx={{ mt: 1, fontSize: '0.875rem' }}>
                                        📋 El proceso biométrico debe ser iniciado por el arrendatario. Una vez que comience,
                                        podrás ver el progreso aquí.
                                      </Alert>
                                    </>
                                  );
                                })()}
                              </>
                            ) : (
                              <>
                                <Chip
                                  icon={<CheckCircleIcon />}
                                  label="✅ Contrato aprobado por arrendatario"
                                  color="success"
                                  variant="outlined"
                                  size="small"
                                  sx={{ mr: 1 }}
                                />
                                <Button
                                  variant="contained"
                                  color="success"
                                  startIcon={<BiometricIcon />}
                                  onClick={() => handleWorkflowAction(candidate, { type: 'advance_to_biometric' })}
                                  size="small"
                                  sx={{ mr: 1 }}
                                >
                                  Avanzar a Autenticación Biométrica
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outlined"
                              color="secondary"
                              startIcon={<DescriptionIcon />}
                              onClick={() => viewContractPDF(contractId)}
                              size="small"
                            >
                              📄 Ver PDF
                            </Button>
                            {/* BOTÓN RECHAZAR PERSISTENTE - ETAPA 3 (Aprobado) */}
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<RejectIcon />}
                              onClick={() => handleWorkflowAction(candidate, { type: 'reject' })}
                              size="small"
                              sx={{ ml: 1 }}
                            >
                              Rechazar Candidato
                            </Button>
                          </>
                        );
                      }
                      
                      // Estado por defecto
                      return (
                        <>
                          <Button
                            variant="outlined"
                            color="info"
                            startIcon={<InfoIcon />}
                            onClick={() => navigate(`/app/contracts/${contractId}`)}
                            size="small"
                          >
                            Ver Estado del Contrato
                          </Button>
                          {/* BOTÓN RECHAZAR PERSISTENTE - ETAPA 3 (Estado por defecto) */}
                          <Button
                            variant="outlined"
                            color="error"
                            startIcon={<RejectIcon />}
                            onClick={() => handleWorkflowAction(candidate, { type: 'reject' })}
                            size="small"
                            sx={{ ml: 1 }}
                          >
                            Rechazar Candidato
                          </Button>
                        </>
                      );
                    })()}
                  </>
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
            {candidate.workflow_stage === 4 && candidate.workflow_data.contract_created && isContractReadyForBiometric(candidate.workflow_data.contract_created, candidate) && (
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
                {/* BOTÓN RECHAZAR PERSISTENTE - ETAPA 4 (Biométrico listo) */}
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<RejectIcon />}
                  onClick={() => handleWorkflowAction(candidate, { type: 'reject' })}
                  size="small"
                  sx={{ ml: 1 }}
                >
                  Rechazar Candidato
                </Button>
              </>
            )}
            {candidate.workflow_stage === 4 && candidate.workflow_data.contract_created && !isContractReadyForBiometric(candidate.workflow_data.contract_created, candidate) && (
              <>
                {/* Logs removidos para limpiar consola */}
                <Chip
                  icon={<WarningIcon />}
                  label="Pendiente aprobación del arrendatario"
                  color="warning"
                  variant="outlined"
                  size="small"
                  sx={{ mr: 1 }}
                />
                {/* BOTÓN RECHAZAR PERSISTENTE - ETAPA 4 (No listo para biométrico) */}
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<RejectIcon />}
                  onClick={() => handleWorkflowAction(candidate, { type: 'reject' })}
                  size="small"
                  sx={{ ml: 1 }}
                >
                  Rechazar Candidato
                </Button>
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
                {/* BOTÓN RECHAZAR PERSISTENTE - ETAPA 5 (Solo si NO ha iniciado ejecución) */}
                {!candidate.workflow_data.contract_created.execution_started && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<RejectIcon />}
                    onClick={() => handleWorkflowAction(candidate, { type: 'reject' })}
                    size="small"
                    sx={{ ml: 1 }}
                  >
                    Rechazar Candidato
                  </Button>
                )}
              </>
            )}
            </Box>

            {/* Premium Action Footer */}
            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'grey.200' }}>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', fontWeight: 500 }}>
                💎 Centro de Control VeriHome Premium • Gestión profesional de candidatos
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      </Grow>
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
    <Box sx={{ p: 4, background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', minHeight: '100vh' }}>
      {/* Revolutionary Premium Header */}
      <Card
        sx={{
          mb: 4,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)',
            borderRadius: 'inherit',
            padding: '2px',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'xor',
            zIndex: -1
          }
        }}
      >
        <CardContent sx={{ p: 6 }}>
          {/* Premium Header Section */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 16px 48px rgba(102, 126, 234, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
                    animation: 'spin 4s linear infinite'
                  }
                }}
              >
                <Typography
                  sx={{
                    fontSize: '4rem',
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  🏆
                </Typography>
              </Box>
            </Box>

            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
                letterSpacing: '-1px'
              }}
            >
              💎 VeriHome Premium Dashboard
            </Typography>

            <Typography
              variant="h4"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                mb: 2
              }}
            >
              Gestión Avanzada de Candidatos Aprobados
            </Typography>

            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                maxWidth: 800,
                mx: 'auto',
                lineHeight: 1.6,
                fontWeight: 500
              }}
            >
              Centro de control profesional para convertir matches exitosos en contratos firmados a través de nuestro workflow de 5 etapas optimizado.
            </Typography>
          </Box>

          {/* Premium Workflow Visualization */}
          <Box sx={{ mt: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}
              >
                🚀 Proceso de Contratación Premium
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
                Workflow automatizado de 5 etapas con tecnología de vanguardia
              </Typography>
            </Box>

            {/* Modern Workflow Steps */}
            <Grid container spacing={3} sx={{ mt: 2 }}>
              {[
                { stage: 1, icon: '🏠', title: 'Visita Premium', desc: 'Coordinación profesional de visitas', color: '#667eea' },
                { stage: 2, icon: '📄', title: 'Documentos Digitales', desc: 'Verificación automática de documentos', color: '#f093fb' },
                { stage: 3, icon: '📋', title: 'Contrato Inteligente', desc: 'Generación automática con IA', color: '#4facfe' },
                { stage: 4, icon: '🔐', title: 'Biometría Avanzada', desc: 'Autenticación biométrica de alta seguridad', color: '#43e97b' },
                { stage: 5, icon: '🔑', title: 'Ejecución Automatizada', desc: 'Inicio automático del contrato', color: '#fa709a' }
              ].map((step) => (
                <Grid item xs={12} md={2.4} key={step.stage}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      background: `linear-gradient(135deg, ${step.color}15 0%, ${step.color}08 100%)`,
                      border: `2px solid ${step.color}20`,
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: `linear-gradient(90deg, transparent, ${step.color}20, transparent)`,
                        transition: 'left 0.6s ease'
                      },
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: `0 16px 40px ${step.color}30`,
                        '&::before': {
                          left: '100%'
                        }
                      }
                    }}
                  >
                    <Typography sx={{ fontSize: '3rem', mb: 1 }}>
                      {step.icon}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: step.color }}>
                      Etapa {step.stage}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      {step.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                      {step.desc}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Premium Stats */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)'
                  }}
                >
                  <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                    {candidates.length}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Candidatos Activos
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #2196f3 0%, #21cbf3 100%)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(33, 150, 243, 0.3)'
                  }}
                >
                  <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                    97%
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Tasa de Éxito
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(255, 152, 0, 0.3)'
                  }}
                >
                  <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                    24h
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Tiempo Promedio
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Premium Candidates Section */}
      {candidates.length === 0 ? (
        <Card
          sx={{
            borderRadius: 4,
            background: 'linear-gradient(135deg, #667eea08 0%, #764ba208 100%)',
            border: '2px solid',
            borderColor: 'rgba(102, 126, 234, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
          }}
        >
          <CardContent sx={{ p: 6, textAlign: 'center' }}>
            <Box
              sx={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3
              }}
            >
              <Typography sx={{ fontSize: '4rem' }}>🏠</Typography>
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2
              }}
            >
              🌟 ¡Lista Preparada para el Éxito!
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}>
              Los matches que apruebes en la evaluación de candidatos aparecerán aquí automáticamente para continuar el proceso hacia contrato con nuestro sistema premium.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Premium Section Header */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1
              }}
            >
              🎯 Candidatos Premium en Proceso
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
              {candidates.length} candidato{candidates.length !== 1 ? 's' : ''} en gestión activa con tecnología avanzada
            </Typography>
          </Box>

          {/* Candidates Grid */}
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

      {/* Contract Clauses Editor Dialog */}
      <Dialog
        open={clausesEditorOpen}
        onClose={() => setClausesEditorOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '95vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EditIcon />
            <Box>
              <Typography variant="h6">
                Editor de Cláusulas Adicionales
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Personaliza tu contrato agregando cláusulas adicionales
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {selectedContractForClauses && (
            <ContractClausesEditor
              contractId={selectedContractForClauses}
              onClausesChange={() => {
                // Refresh candidates when clauses are modified
                fetchMatchedCandidates();
                console.log('Cláusulas del contrato actualizadas');
              }}
            />
          )}
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setClausesEditorOpen(false)} 
            variant="contained"
            color="primary"
          >
            Cerrar Editor
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MatchedCandidatesView;