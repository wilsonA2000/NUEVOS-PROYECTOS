import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import * as contractService from '../../services/contractService';
import matchingService from '../../services/matchingService';
import ContractModificationService from '../../services/contractModificationService';
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
  Snackbar,
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
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useSnackbar } from '../../contexts/SnackbarContext';
import VisitScheduleModal from './VisitScheduleModal';
import VisitEvaluationModal from './VisitEvaluationModal';
import LandlordDocumentReview from './LandlordDocumentReview';
import ContractDraftEditor from './ContractDraftEditor';
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
  type: 'visit_schedule' | 'visit_completed' | 'documents_request' | 'documents_approved' | 'contract_create' | 'reject' | 'advance_to_execution';
  data?: any;
}

const MatchedCandidatesView: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<MatchedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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

  // Estados para el modal de evaluación de visita
  const [visitEvaluationModalOpen, setVisitEvaluationModalOpen] = useState(false);
  const [selectedCandidateForEvaluation, setSelectedCandidateForEvaluation] = useState<MatchedCandidate | null>(null);

  // Estados para el modal de revisión de documentos
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [selectedCandidateForDocuments, setSelectedCandidateForDocuments] = useState<MatchedCandidate | null>(null);
  
  // Estados para el editor de cláusulas
  const [clausesEditorOpen, setClausesEditorOpen] = useState(false);
  const [selectedContractForClauses, setSelectedContractForClauses] = useState<string | null>(null);

  // Estados para solicitudes de modificación
  const [modificationRequests, setModificationRequests] = useState<{ [contractId: string]: any[] }>({});

  // Estados para el editor de contrato
  const [editorOpen, setEditorOpen] = useState(false);
  const [contractToEdit, setContractToEdit] = useState<string | null>(null);

  useEffect(() => {
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
        visit_data: visitData,
      };

      const response = await api.post('/contracts/workflow-action/', requestBody);
      const result = response.data;

      // CRITICAL FIX: Reload all candidates from server to ensure synchronization
      await fetchMatchedCandidates();

      // Show success message
      setSuccess('✅ Visita programada exitosamente. El arrendatario ha sido notificado.');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al programar visita';
      setError(errorMsg);
      throw err; // Re-lanzar el error para que el modal lo maneje
    }
  }, [selectedCandidateForVisit]);

  // Handler para abrir el modal de evaluación de visita
  const handleOpenVisitEvaluation = useCallback((candidate: MatchedCandidate) => {
    setSelectedCandidateForEvaluation(candidate);
    setVisitEvaluationModalOpen(true);
  }, []);

  // Handler para evaluar la visita
  const handleEvaluateVisit = useCallback(async (approved: boolean, notes: string) => {
    if (!selectedCandidateForEvaluation) return;

    try {
      const requestBody = {
        match_request_id: selectedCandidateForEvaluation.id,
        action: approved ? 'visit_completed' : 'reject',
        evaluation_notes: notes,
      };

      const response = await api.post('/contracts/workflow-action/', requestBody);
      const result = response.data;

      // Recargar candidatos para sincronización
      await fetchMatchedCandidates();

      // Show success message
      if (result.deleted) {
        setSuccess(`✅ ${result.message || 'Candidato eliminado completamente. El arrendatario puede volver a aplicar.'}`);
      } else {
        setSuccess(approved
          ? '✅ Visita aprobada exitosamente. El candidato avanzó a la etapa de revisión de documentos.'
          : '✅ Candidato rechazado. El proceso ha sido eliminado completamente.',
        );
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al evaluar visita';
      setError(errorMsg);
      throw err;
    }
  }, [selectedCandidateForEvaluation]);

  const fetchMatchedCandidates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/contracts/matched-candidates/');

      const data = response.data;

      const candidatesData = data.results || [];
      setCandidates(candidatesData);

      // Cargar solicitudes de modificación para cada contrato
      fetchModificationRequests(candidatesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar solicitudes de modificación de los contratos
  const fetchModificationRequests = async (candidatesData: MatchedCandidate[]) => {
    const modRequestsMap: { [contractId: string]: any[] } = {};

    for (const candidate of candidatesData) {
      const contractId = candidate.workflow_data?.contract_created?.contract_id;
      if (contractId) {
        try {
          const requests = await ContractModificationService.getContractModificationRequests(contractId);
          if (requests && requests.length > 0) {
            modRequestsMap[contractId] = requests;
          }
        } catch (error) {
        }
      }
    }

    setModificationRequests(modRequestsMap);
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
        action: currentAction.type,
      };

      // Add specific data based on action type
      switch (currentAction.type) {
        case 'documents_approved':
          requestBody.documents_data = {
            approved: true,
            notes: documentsNotes,
          };
          break;
        case 'reject':
          requestBody.rejection_reason = rejectionReason;
          break;
        case 'advance_to_execution':
          requestBody.execution_data = {
            ready_for_execution: true,
            advance_to_stage_5: true,
          };
          break;
      }

      const response = await api.post('/contracts/workflow-action/', requestBody);
      const result = response.data;
      
      // CRITICAL FIX: Handle contract creation redirection
      if (currentAction.type === 'contract_create') {
        
        // Close dialog immediately to avoid UI blocking
        setWorkflowDialogOpen(false);
        setSelectedCandidate(null);
        setCurrentAction(null);
        
        // Redirect to contract creation form with property and tenant data
        const contractUrl = `/app/contracts/new?property=${selectedCandidate.property.id}&tenant=${selectedCandidate.tenant.id}&match=${selectedCandidate.id}`;
        navigate(contractUrl);
        
        return; // Exit early for contract creation
      }
      
      // CRITICAL FIX: Reload all candidates from server to ensure synchronization
      // Don't rely on partial updates from the API response
      await fetchMatchedCandidates();

      setWorkflowDialogOpen(false);
      setSelectedCandidate(null);
      setCurrentAction(null);

      // Show success message to user
      if (result.deleted) {
        setSuccess(`✅ ${result.message || 'Candidato eliminado completamente. El arrendatario puede volver a aplicar.'}`);
      } else {
        setSuccess(result.message || '✅ Acción ejecutada exitosamente');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar acción');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateContractAuto = async (candidate: MatchedCandidate) => {
    try {
      setActionLoading(true);


      // Llamar al endpoint de generación automática
      const response = await api.post(`/matching/match-requests/${candidate.id}/generate-contract/`);
      const result = response.data;


      // Mostrar mensaje de éxito
      showSuccess(`Contrato generado exitosamente. Número de contrato: ${result.contract.contract_number}. Estado: ${result.contract.status}`);

      // Recargar candidatos para mostrar el contrato creado
      await fetchMatchedCandidates();

    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Error desconocido';
      setError(`Error al generar contrato: ${errorMsg}`);
      showError(`Error: ${errorMsg}`);
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
      'fully_signed',
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
    
    // Navegar a la página de autenticación biométrica
    navigate(`/app/contracts/${contractId}/authenticate`);
  }, [navigate]);

  const handleContinueBiometricAuth = useCallback((candidate: MatchedCandidate) => {
    if (!candidate.workflow_data.contract_created) return;
    
    const contractId = candidate.workflow_data.contract_created.contract_id;
    
    // Navegar a la página de autenticación biométrica
    navigate(`/app/contracts/${contractId}/authenticate`);
  }, [navigate]);

  const handleSendBiometricReminder = useCallback(async (candidate: MatchedCandidate) => {
    if (!candidate.workflow_data.contract_created) return;

    const contractId = candidate.workflow_data.contract_created.contract_id;
    const tenantName = candidate.tenant.full_name;


    try {
      const result = await contractService.sendBiometricReminder(contractId);
      showSuccess(result.message || `Recordatorio enviado exitosamente a ${tenantName}`);
    } catch (error: any) {
      showError(`Error enviando recordatorio: ${error.response?.data?.error || error.message}`);
    }
  }, []);

  const handleViewContract = useCallback((candidate: MatchedCandidate) => {
    if (!candidate.workflow_data.contract_created) return;
    
    const contractId = candidate.workflow_data.contract_created.contract_id;
    
    // Navegar a la vista del contrato
    navigate(`/app/contracts/${contractId}`);
  }, [navigate]);

  const handleViewContractStatus = useCallback((candidate: MatchedCandidate) => {
    if (!candidate.workflow_data.contract_created) return;
    
    const contractId = candidate.workflow_data.contract_created.contract_id;
    
    // Navegar directamente al contrato específico
    navigate(`/app/contracts/${contractId}`);
  }, [navigate]);

  const handleLandlordApproveContract = useCallback(async (contractId: string) => {
    try {
      setActionLoading(true);


      const response = await api.post(`/contracts/landlord/contracts/${contractId}/approve_contract/`, {
        approved: true,
        landlord_notes: 'Aprobado desde el dashboard del arrendador',
        confirm_understanding: true,
      });

      if (response.status === 200) {

        // Recargar los datos para reflejar el cambio
        await fetchMatchedCandidates();

        showSuccess('Contrato aprobado exitosamente. El proceso ahora avanzará a la autenticación biométrica.');
      } else {
        const errorData = response.data;
        showError(`Error al aprobar contrato: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      showError('Error al aprobar el contrato. Por favor intenta nuevamente.');
    } finally {
      setActionLoading(false);
    }
  }, [fetchMatchedCandidates]);

  const handleDeliverKeys = useCallback(async (candidate: MatchedCandidate) => {
    if (!candidate.workflow_data.contract_created) return;

    const contractId = candidate.workflow_data.contract_created.contract_id;

    try {
      const result = await contractService.confirmKeyDelivery(contractId);
      showSuccess(result.message || 'Entrega de llaves confirmada exitosamente');
      // Refrescar lista de candidatos para ver cambios actualizados
      await fetchMatchedCandidates();
    } catch (error: any) {
      showError(`Error confirmando entrega: ${error.response?.data?.error || error.message}`);
    }
  }, [fetchMatchedCandidates]);

  const handleStartExecution = useCallback(async (candidate: MatchedCandidate) => {
    if (!candidate.workflow_data.contract_created) return;

    const contractId = candidate.workflow_data.contract_created.contract_id;

    try {
      const result = await contractService.startContractExecution(contractId);
      showSuccess(result.message || 'Ejecución del contrato iniciada exitosamente');
      // Refrescar lista de candidatos para ver el nuevo estado
      await fetchMatchedCandidates();
    } catch (error: any) {
      showError(`Error iniciando ejecución: ${error.response?.data?.error || error.message}`);
    }
  }, [fetchMatchedCandidates]);

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
      );
    }

    return null;
  }, [handleStartBiometricAuth, handleViewContractStatus, handleSendBiometricReminder, handleWorkflowAction]);

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
        minimumFractionDigits: 0,
      }).format(amount);
    };

    const progress = (candidate.workflow_stage / 5) * 100;

    return (
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardContent>
          {/* Header con información básica */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, mr: 1, fontSize: 14 }}>
                  <PersonIcon />
                </Avatar>
                {candidate.tenant.full_name}
              </Typography>
              <Chip
                label={getStageLabel(candidate.workflow_stage)}
                color={getStageColor(candidate.workflow_stage) as any}
                size="small"
                sx={{ mr: 1 }}
              />
              {candidate.tenant.is_verified && (
                <Chip
                  label="Verificado"
                  color="success"
                  size="small"
                  icon={<CheckCircleIcon />}
                />
              )}
            </Box>

            <Box textAlign="right">
              <Typography variant="h6" color="success.main">
                {formatCurrency(candidate.property.rent_price)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                /mes
              </Typography>
            </Box>
          </Box>

          {/* Barra de progreso simple */}
          <Box sx={{ mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progreso del Proceso
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* Información de la propiedad */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              🏠 Propiedad
            </Typography>
            <Box display="flex" alignItems="center">
              <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, mr: 1 }}>
                <HomeIcon />
              </Avatar>
              <Box>
                <Typography variant="body2">
                  <strong>{candidate.property.title}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  📍 {candidate.property.address}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Stepper de workflow */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              📋 Estado del Proceso
            </Typography>
            <Stepper orientation="vertical" sx={{ pl: 2 }}>
              {[1, 2, 3, 4, 5].map((stage) => {
                const completed = stage < candidate.workflow_stage;
                const active = stage === candidate.workflow_stage;
                return (
                  <Step key={stage} active={active} completed={completed}>
                    <StepLabel
                      StepIconProps={{
                        sx: { fontSize: 20 },
                      }}
                    >
                      <Typography variant="body2" color={completed ? 'success.main' : active ? 'primary.main' : 'text.secondary'}>
                        {getStageLabel(stage)}
                      </Typography>
                    </StepLabel>
                  </Step>
                );
              })}
            </Stepper>
          </Box>

          {/* Información adicional del candidato y propiedad */}
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                Contacto del Candidato
              </Typography>
              <Typography variant="body2">
                📧 {candidate.tenant.email}
              </Typography>
              {candidate.tenant.phone && (
                <Typography variant="body2">
                  📞 {candidate.tenant.phone}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                Detalles de la Propiedad
              </Typography>
              <Typography variant="body2">
                🛏️ {candidate.property.bedrooms} Habitaciones
              </Typography>
              <Typography variant="body2">
                🚿 {candidate.property.bathrooms} Baños
              </Typography>
            </Grid>
            {candidate.monthly_income && (
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Capacidad Financiera
                </Typography>
                <Typography variant="body2">
                  💰 {formatCurrency(candidate.monthly_income)}/mes
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {candidate.employment_type}
                </Typography>
              </Grid>
            )}
            {candidate.preferred_move_in_date && (
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Fecha Preferida de Mudanza
                </Typography>
                <Typography variant="body2">
                  📅 {new Date(candidate.preferred_move_in_date).toLocaleDateString('es-CO')}
                </Typography>
              </Grid>
            )}
          </Grid>

          {/* Mensaje del candidato */}
          {candidate.tenant_message && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                💬 Mensaje del Candidato:
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                "{candidate.tenant_message}"
              </Typography>
            </Box>
          )}

          {/* Botones de acción según etapa */}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {/* ETAPA 1: Programar visita */}
            {candidate.workflow_stage === 1 && (
              <>
                {/* Si la visita ya está programada, mostrar confirmación */}
                {candidate.workflow_data?.visit_scheduled ? (
                  <Box sx={{ width: '100%' }}>
                    <Alert severity="success" sx={{ mb: 1 }}>
                      <AlertTitle>✅ Visita Programada</AlertTitle>
                      <Typography variant="body2">
                        <strong>Fecha:</strong> {new Date(candidate.workflow_data.visit_scheduled.date).toLocaleDateString('es-CO', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Hora:</strong> {candidate.workflow_data.visit_scheduled.time}
                      </Typography>
                      {candidate.workflow_data.visit_scheduled.notes && (
                        <Typography variant="body2">
                          <strong>Notas:</strong> {candidate.workflow_data.visit_scheduled.notes}
                        </Typography>
                      )}
                    </Alert>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleOpenVisitEvaluation(candidate)}
                      size="small"
                      fullWidth
                      sx={{ mb: 1 }}
                    >
                      Evaluar Visita
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<RejectIcon />}
                      onClick={() => handleWorkflowAction(candidate, { type: 'reject' })}
                      size="small"
                      fullWidth
                    >
                      Rechazar Candidato
                    </Button>
                  </Box>
                ) : (
                  // Si no está programada, mostrar botón para programar
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<ScheduleIcon />}
                      onClick={() => handleScheduleVisit(candidate)}
                      size="small"
                    >
                      Programar Visita
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

            {/* ETAPA 2: Revisar documentos */}
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
                  variant="contained"
                  color="success"
                  startIcon={<ContractIcon />}
                  onClick={async () => {
                    try {
                      const response = await matchingService.advanceToContractStage(candidate.id);
                      if (response.data.success) {
                        await fetchMatchedCandidates();
                        showSuccess('Proceso avanzado a Etapa 3: Creación del Contrato');
                      } else {
                        showError('Error: Respuesta inesperada del servidor');
                      }
                    } catch (error: any) {
                      const errorMessage = error.response?.data?.error || error.message || 'Error desconocido';
                      showError(`Error: ${errorMessage}`);
                    }
                  }}
                  disabled={false}
                  size="small"
                >
                  Continuar a Creación de Contrato
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

            {/* ETAPA 3: Generar contrato */}
            {candidate.workflow_stage === 3 && !candidate.workflow_data.contract_created && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<ContractIcon />}
                  onClick={() => handleGenerateContractAuto(candidate)}
                  disabled={actionLoading}
                  size="small"
                >
                  ⚡ Generar Contrato Automáticamente
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<EditIcon />}
                  onClick={() => {
                    // IMPORTANTE: NO llamar al backend - solo redirigir al formulario
                    // El contrato se crea SOLO cuando el usuario hace clic en "Crear Borrador"
                    const contractUrl = `/app/contracts/new?property=${candidate.property.id}&tenant=${candidate.tenant.id}&match=${candidate.id}`;
                    navigate(contractUrl);
                  }}
                  size="small"
                >
                  ✏️ Crear Manualmente
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

            {/* ETAPA 3: Contrato creado, esperando aprobaciones */}
            {candidate.workflow_stage === 3 && candidate.workflow_data.contract_created && (
              <>
                {/* Alert de solicitudes de modificación pendientes */}
                {(modificationRequests[candidate.workflow_data.contract_created!.contract_id]?.filter(req => req.status === 'PENDING').length ?? 0) > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <AlertTitle>✏️ Solicitud de Modificación Pendiente</AlertTitle>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      El arrendatario ha solicitado modificaciones al contrato. Revisa y responde.
                    </Typography>
                    {modificationRequests[candidate.workflow_data.contract_created!.contract_id]
                      ?.filter(req => req.status === 'PENDING')
                      .map((req: any) => (
                        <Box key={req.id} sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="subtitle2">Revisión #{req.revision_number}</Typography>
                          <Typography variant="body2">{req.reason}</Typography>
                          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              onClick={async () => {
                                try {
                                  await ContractModificationService.approveModificationRequest(req.id, 'Aprobado - Proceder a editar');
                                  setSuccess('Modificación aprobada. Abriendo editor de contrato...');

                                  // Abrir el editor de contrato
                                  setContractToEdit(candidate.workflow_data.contract_created!.contract_id);
                                  setEditorOpen(true);

                                  fetchMatchedCandidates();
                                } catch (error) {
                                  setError('Error al aprobar modificación');
                                }
                              }}
                            >
                              Aprobar y Editar
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={async () => {
                                const reason = prompt('Razón del rechazo:');
                                if (reason) {
                                  try {
                                    await ContractModificationService.rejectModificationRequest(req.id, reason);
                                    setSuccess('Modificación rechazada.');
                                    fetchMatchedCandidates();
                                  } catch (error) {
                                    setError('Error al rechazar modificación');
                                  }
                                }
                              }}
                            >
                              Rechazar
                            </Button>
                          </Box>
                        </Box>
                      ))}
                  </Alert>
                )}

                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<DocumentIcon />}
                  onClick={() => viewContractPDF(candidate.workflow_data.contract_created!.contract_id)}
                  size="small"
                >
                  Ver Contrato PDF
                </Button>
                {!candidate.workflow_data.contract_created.landlord_auth_completed && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<ApproveIcon />}
                    onClick={() => handleLandlordApproveContract(candidate.workflow_data.contract_created!.contract_id)}
                    disabled={actionLoading}
                    size="small"
                  >
                    Aprobar Contrato
                  </Button>
                )}
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

            {/* ETAPA 4: Autenticación biométrica */}
            {candidate.workflow_stage === 4 && (
              <>
                {candidate.workflow_data.contract_created ? (
                  renderBiometricActionButtons(candidate)
                ) : (
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    <AlertTitle>Datos de contrato no disponibles</AlertTitle>
                    <Typography variant="body2">
                      No se encontró información del contrato para iniciar la autenticación biométrica.
                      Esto puede deberse a un error de sincronización. Por favor, recarga la página o contacta soporte.
                    </Typography>
                  </Alert>
                )}
              </>
            )}

            {/* ETAPA 5: Entrega y ejecución */}
            {candidate.workflow_stage === 5 && (
              <>
                {candidate.workflow_data.contract_created ? (
                  renderExecutionActionButtons(candidate)
                ) : (
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    <AlertTitle>Datos de contrato no disponibles</AlertTitle>
                    <Typography variant="body2">
                      No se encontró información del contrato para la entrega.
                      Esto puede deberse a un error de sincronización. Por favor, recarga la página o contacta soporte.
                    </Typography>
                  </Alert>
                )}
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
      {/* Header simple */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          🏠 Candidatos Aprobados
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestiona tus candidatos a través del proceso de contratación
        </Typography>
      </Box>


      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Lista de candidatos */}
      {candidates.length === 0 ? (
        <Card elevation={2}>
          <CardContent>
            <Box textAlign="center" py={8}>
              <Avatar sx={{ bgcolor: 'grey.100', width: 80, height: 80, mx: 'auto', mb: 2 }}>
                <HomeIcon sx={{ fontSize: 40, color: 'grey.400' }} />
              </Avatar>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No hay candidatos aprobados aún
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Los matches que apruebes aparecerán aquí para continuar el proceso
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </Box>
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

      {/* Modal de evaluación de visita */}
      <VisitEvaluationModal
        open={visitEvaluationModalOpen}
        onClose={() => setVisitEvaluationModalOpen(false)}
        onEvaluate={handleEvaluateVisit}
        candidateName={selectedCandidateForEvaluation?.tenant.full_name || ''}
        propertyTitle={selectedCandidateForEvaluation?.property.title || ''}
        visitDate={selectedCandidateForEvaluation?.workflow_data?.visit_scheduled?.date || ''}
        visitTime={selectedCandidateForEvaluation?.workflow_data?.visit_scheduled?.time || ''}
      />

      {/* Document Review Modal */}
      <Dialog 
        open={documentsModalOpen} 
        onClose={handleCloseDocumentsModal}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' },
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
              }}
              onAllApproved={async () => {

                // Cerrar modal
                handleCloseDocumentsModal();

                // Recargar candidatos para actualizar el estado
                await fetchMatchedCandidates();

                // Mostrar mensaje
                showSuccess(
                  'Todos los documentos aprobados. Ahora puedes hacer clic en "Continuar a Creación de Contrato" para avanzar a la siguiente etapa.',
                );
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
          sx: { maxHeight: '95vh' },
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

      {/* Contract Draft Editor Dialog */}
      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '80vh',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon color="primary" />
          <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
            Editor de Contrato
          </Typography>
          <IconButton edge="end" onClick={() => setEditorOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {contractToEdit && (
            <ContractDraftEditor
              contractId={contractToEdit}
              onSave={(updatedContract) => {
                setSuccess('Contrato guardado exitosamente');
                setEditorOpen(false);
                setContractToEdit(null);
                fetchMatchedCandidates();
              }}
              onCancel={() => {
                setEditorOpen(false);
                setContractToEdit(null);
              }}
              onClose={() => {
                setEditorOpen(false);
                setContractToEdit(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Notification Snackbars */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MatchedCandidatesView;