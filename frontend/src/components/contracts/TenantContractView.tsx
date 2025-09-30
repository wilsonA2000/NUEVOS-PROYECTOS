import React, { useState, useEffect, useCallback } from 'react';
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
  PlayArrow as ContinueIcon,
  Edit as EditIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import EnhancedTenantDocumentUpload from './EnhancedTenantDocumentUpload';
import { viewContractPDF } from '../../utils/contractPdfUtils';

interface TenantContractProcess {
  id: string;
  match_code: string;
  status: string;
  landlord: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
  property: {
    id: string;
    title: string;
    address: string;
    rent_price: number;
    bedrooms: number;
    bathrooms: number;
  };
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
      completed: boolean;
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
      tenant_review_status?: 'pending' | 'reviewing' | 'approved' | 'changes_requested';
    };
  };
}

const TenantContractView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<TenantContractProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<TenantContractProcess | null>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'request_changes'>('approve');
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);

  useEffect(() => {
    console.log('🔍 TenantContractView component mounted');
    fetchTenantProcesses();
  }, []);

  const fetchTenantProcesses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 TenantContractView - Current user:', user);
      console.log('🔍 TenantContractView - User type:', user?.user_type);
      console.log('🔍 TenantContractView - User email:', user?.email);
      console.log('🔍 Fetching tenant contract processes...');
      const response = await api.get('/contracts/tenant-processes/');

      console.log('🔍 Response status:', response.status);
      const data = response.data;
      console.log('🔍 Received tenant processes:', data);
      console.log('🔍 Processes with workflow_stage debug:');
      data.results?.forEach((process: any, index: number) => {
        console.log(`🔍 Process ${index + 1} DETAILED ANALYSIS:`);
        console.log(`   📝 ID: ${process.id}`);
        console.log(`   📝 Match Code: ${process.match_code}`);
        console.log(`   📝 Workflow Stage: ${process.workflow_stage} (type: ${typeof process.workflow_stage})`);
        console.log(`   📝 Status: ${process.status}`);
        console.log(`   📝 All Object Keys:`, Object.keys(process));
        console.log(`   📝 JSON String:`, JSON.stringify(process, null, 2));
      });
      setProcesses(data.results || []);
      console.log('🔍 Set processes:', data.results?.length || 0);
    } catch (err) {
      console.error('🔍 Error response:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getStageLabel = (stage: number) => {
    switch (stage) {
      case 1: return 'Etapa 1: Visita 🏠';
      case 2: return 'Etapa 2: Documentos 📄';
      case 3: return 'Etapa 3: Revisión del Contrato 📋';
      case 4: return 'Etapa 4: Autenticación Biométrica 🔐';
      case 5: return 'Etapa 5: Mudanza y Ejecución 🔑';
      default: return stage ? `Etapa ${stage}` : 'Etapa 1: Visita 🏠'; // Default to stage 1 if undefined
    }
  };

  // Helper function to get the correct stage value from process object
  const getProcessStage = (process: any): number => {
    // Check if process exists and is not null
    if (!process) {
      console.warn('🐛 TenantContractView - getProcessStage: process is null/undefined');
      return 1;
    }
    
    // Backend sends current_stage, not workflow_stage
    // Ensure we return a valid number, default to 1 if both are undefined/null
    const currentStage = process.current_stage;
    const workflowStage = process.workflow_stage;
    
    console.log('🔍 TenantContractView - getProcessStage debug:', {
      currentStage,
      workflowStage,
      processId: process.id,
      matchCode: process.match_code
    });
    
    if (typeof currentStage === 'number' && currentStage >= 1 && currentStage <= 5) {
      return currentStage;
    }
    
    if (typeof workflowStage === 'number' && workflowStage >= 1 && workflowStage <= 5) {
      return workflowStage;
    }
    
    console.warn('🐛 TenantContractView - getProcessStage: using default stage 1, process data:', process);
    return 1; // Default to stage 1
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

  const getProcessStatusLabel = (process: TenantContractProcess) => {
    const contractInfo = process.workflow_data.contract_created;
    const currentStage = getProcessStage(process);
    
    if (currentStage === 5 && contractInfo?.execution_started) {
      return 'Contrato Activo - Ya puedes mudarte';
    } else if (currentStage === 5 && contractInfo?.keys_delivered) {
      return 'Llaves entregadas - Esperando inicio';
    } else if (currentStage === 4) {
      if (contractInfo?.tenant_auth_completed && contractInfo?.landlord_auth_completed) {
        return 'Autenticación completa - Esperando entrega';
      } else if (contractInfo?.landlord_auth_completed) {
        return 'Tu turno: Completa tu autenticación biométrica';
      } else {
        return 'Esperando autenticación del arrendador';
      }
    } else if (currentStage === 3 && contractInfo) {
      if (contractInfo.tenant_review_status === 'pending') {
        return 'Acción requerida: Revisa el borrador del contrato';
      } else if (contractInfo.tenant_review_status === 'reviewing') {
        return 'Revisando borrador del contrato';
      } else if (contractInfo.tenant_review_status === 'changes_requested') {
        return 'Cambios solicitados - Esperando arrendador';
      } else if (contractInfo.tenant_review_status === 'approved') {
        return 'Borrador aprobado - Avanzando a autenticación';
      }
    }
    
    switch (currentStage) {
      case 1:
        return process.workflow_data.visit_scheduled?.completed 
          ? 'Visita completada - Avanzando a documentos'
          : 'Esperando coordinación de visita';
      case 2:
        return process.workflow_data.documents_reviewed?.approved
          ? 'Documentos aprobados - Avanzando a contrato'
          : 'Documentos en revisión';
      default:
        return 'En proceso';
    }
  };

  const handleViewDetails = useCallback((process: TenantContractProcess) => {
    setSelectedProcess(process);
    setDetailsDialogOpen(true);
  }, []);

  const handleReviewContract = useCallback((process: TenantContractProcess) => {
    setSelectedProcess(process);
    setReviewDialogOpen(true);
    setReviewComments('');
    setReviewAction('approve');
  }, []);

  const handleOpenDocuments = useCallback((process: TenantContractProcess) => {
    setSelectedProcess(process);
    setDocumentsDialogOpen(true);
  }, []);

  const handleStartTenantAuth = useCallback((process: TenantContractProcess) => {
    if (!process.workflow_data.contract_created) return;
    
    const contractId = process.workflow_data.contract_created.contract_id;
    console.log('🔐 Arrendatario iniciando autenticación biométrica:', contractId);
    
    // Navegar a la página de autenticación biométrica
    navigate(`/app/contracts/${contractId}/authenticate`);
  }, [navigate]);

  const handleViewContract = useCallback((process: TenantContractProcess) => {
    if (!process.workflow_data.contract_created) return;
    
    const contractId = process.workflow_data.contract_created.contract_id;
    console.log('📄 Viendo contrato PDF:', contractId);
    
    // Abrir directamente el PDF del contrato
    // El arrendatario puede ver el PDF pero no necesariamente puede acceder a todos los detalles del contrato
    viewContractPDF(contractId);
  }, []);

  const submitContractReview = async () => {
    if (!selectedProcess || !selectedProcess.workflow_data.contract_created) return;

    try {
      setLoading(true);
      
      const requestBody = {
        contract_id: selectedProcess.workflow_data.contract_created.contract_id,
        action: reviewAction,
        comments: reviewComments
      };

      const response = await api.post('/contracts/tenant-review/', requestBody);
      
      // Recargar procesos
      await fetchTenantProcesses();
      
      setReviewDialogOpen(false);
      setSelectedProcess(null);
      
      console.log('✅ Revisión del contrato enviada:', response.data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar revisión');
    } finally {
      setLoading(false);
    }
  };

  const renderStageActions = (process: TenantContractProcess) => {
    const contractInfo = process.workflow_data.contract_created;
    const currentStage = getProcessStage(process);
    
    switch (currentStage) {
      case 1:
        return (
          <Button
            variant="outlined"
            color="info"
            startIcon={<InfoIcon />}
            size="small"
            disabled
          >
            ⏳ Esperando coordinación de visita
          </Button>
        );
        
      case 2:
        return (
          <Button
            variant="contained"
            color="warning"
            startIcon={<DocumentsIcon />}
            onClick={() => handleOpenDocuments(process)}
            size="small"
          >
            📄 Subir Documentos
          </Button>
        );
        
      case 3:
        if (!contractInfo) {
          return (
            <Button
              variant="outlined"
              color="info"
              startIcon={<InfoIcon />}
              size="small"
              disabled
            >
              ⏳ Esperando creación del contrato
            </Button>
          );
        }
        
        if (contractInfo.tenant_review_status === 'pending') {
          return (
            <Button
              variant="contained"
              color="primary"
              startIcon={<ContractIcon />}
              onClick={() => handleReviewContract(process)}
              size="small"
            >
              📋 Revisar Borrador del Contrato
            </Button>
          );
        } else if (contractInfo.tenant_review_status === 'changes_requested') {
          return (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<EditIcon />}
              size="small"
              disabled
            >
              ✏️ Cambios solicitados - Esperando arrendador
            </Button>
          );
        } else {
          return (
            <Button
              variant="outlined"
              color="success"
              startIcon={<ApproveIcon />}
              size="small"
              disabled
            >
              ✅ Borrador aprobado
            </Button>
          );
        }
        
      case 4:
        if (!contractInfo) return null;
        
        if (contractInfo.tenant_auth_completed) {
          return (
            <Button
              variant="outlined"
              color="success"
              startIcon={<ApproveIcon />}
              size="small"
              disabled
            >
              ✅ Tu autenticación completada
            </Button>
          );
        } else if (contractInfo.landlord_auth_completed) {
          return (
            <Button
              variant="contained"
              color="primary"
              startIcon={<BiometricIcon />}
              onClick={() => handleStartTenantAuth(process)}
              size="small"
            >
              🔐 Iniciar Mi Autenticación
            </Button>
          );
        } else {
          return (
            <Button
              variant="outlined"
              color="info"
              startIcon={<InfoIcon />}
              size="small"
              disabled
            >
              ⏳ Esperando autenticación del arrendador
            </Button>
          );
        }
        
      case 5:
        if (!contractInfo) return null;
        
        if (contractInfo.execution_started) {
          return (
            <Button
              variant="contained"
              color="success"
              startIcon={<OpenIcon />}
              onClick={() => handleViewContract(process)}
              size="small"
            >
              🏠 Ver Contrato Activo
            </Button>
          );
        } else if (contractInfo.keys_delivered) {
          return (
            <Button
              variant="outlined"
              color="info"
              startIcon={<CalendarIcon />}
              size="small"
              disabled
            >
              🔑 Llaves entregadas - Esperando inicio
            </Button>
          );
        } else {
          return (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<CalendarIcon />}
              size="small"
              disabled
            >
              ⏳ Esperando entrega de llaves
            </Button>
          );
        }
        
      default:
        return null;
    }
  };

  const ProcessCard: React.FC<{ process: TenantContractProcess }> = ({ process }) => {
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
              <Avatar sx={{ width: 48, height: 48, bgcolor: 'secondary.main', mr: 2 }}>
                <HomeIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {process.property.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Proceso #{process.match_code}
                </Typography>
              </Box>
            </Box>
            <Chip 
              label={getStageLabel(getProcessStage(process))}
              color={getStageColor(getProcessStage(process)) as any}
              variant="filled"
              size="medium"
              sx={{ fontWeight: 'bold' }}
            />
          </Box>

          {/* Progress Bar */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progreso del Proceso
              </Typography>
              <Typography variant="body2" fontWeight="bold" color="primary">
                {Math.round((getProcessStage(process) / 5) * 100)}% completado
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={(getProcessStage(process) / 5) * 100}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* Status Alert */}
          <Alert 
            severity={getProcessStage(process) === 5 ? "success" : "info"} 
            sx={{ mb: 2 }}
            icon={getProcessStage(process) === 5 ? <ApproveIcon /> : <InfoIcon />}
          >
            <AlertTitle>Estado Actual</AlertTitle>
            {getProcessStatusLabel(process)}
          </Alert>

          {/* Property and Landlord Info */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <HomeIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Información de la Propiedad
                </Typography>
              </Box>
              <Typography variant="body2">
                📍 {process.property.address}
              </Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(process.property.rent_price)}/mes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                🛏️ {process.property.bedrooms} habitaciones • 🚿 {process.property.bathrooms} baños
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PersonIcon sx={{ color: 'secondary.main', mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Arrendador
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight="medium">
                {process.landlord.full_name}
              </Typography>
              <Stack spacing={0.5}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <EmailIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">{process.landlord.email}</Typography>
                </Box>
                {process.landlord.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PhoneIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">{process.landlord.phone}</Typography>
                  </Box>
                )}
              </Stack>
            </Grid>
          </Grid>

          {/* Move-in Date */}
          {process.preferred_move_in_date && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid #e0e0e0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Fecha de Mudanza Preferida
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight="medium">
                📅 {new Date(process.preferred_move_in_date).toLocaleDateString('es-CO')}
              </Typography>
            </Box>
          )}

          {/* Contract Info */}
          {process.workflow_data.contract_created && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.main' }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                📋 Información del Contrato
              </Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2">
                  <strong>ID:</strong> {process.workflow_data.contract_created.contract_id.slice(0, 8)}...
                </Typography>
                <Typography variant="body2">
                  <strong>Estado:</strong> {process.workflow_data.contract_created.status}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Creado: {new Date(process.workflow_data.contract_created.created_at).toLocaleString()}
                </Typography>
              </Stack>
            </Box>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {renderStageActions(process)}
            
            {/* Common action: View details */}
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<InfoIcon />}
              size="small"
              onClick={() => handleViewDetails(process)}
            >
              Ver Detalles
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando tus procesos de contratación...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                Mis Procesos de Contratación
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Sigue el progreso de tus solicitudes de arriendo y participa activamente en cada etapa.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={fetchTenantProcesses}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <NextIcon />}
              sx={{ ml: 2 }}
            >
              {loading ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </Box>
          
          {/* Workflow Explanation for Tenants */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              🔄 Tu Participación en el Proceso
            </Typography>
            <Stepper activeStep={-1} sx={{ mb: 2 }} orientation="vertical">
              <Step>
                <StepLabel>
                  <Typography variant="body2">
                    <strong>🏠 Etapa 1: Visita</strong><br />
                    VeriHome coordina tu visita a la propiedad
                  </Typography>
                </StepLabel>
              </Step>
              <Step>
                <StepLabel>
                  <Typography variant="body2">
                    <strong>📄 Etapa 2: Documentos</strong><br />
                    El arrendador revisa tu documentación
                  </Typography>
                </StepLabel>
              </Step>
              <Step>
                <StepLabel>
                  <Typography variant="body2">
                    <strong>📋 Etapa 3: Revisión del Contrato</strong><br />
                    <strong>TU ACCIÓN:</strong> Revisa y aprueba el borrador del contrato
                  </Typography>
                </StepLabel>
              </Step>
              <Step>
                <StepLabel>
                  <Typography variant="body2">
                    <strong>🔐 Etapa 4: Autenticación Biométrica</strong><br />
                    <strong>TU ACCIÓN:</strong> Completa tu autenticación después del arrendador
                  </Typography>
                </StepLabel>
              </Step>
              <Step>
                <StepLabel>
                  <Typography variant="body2">
                    <strong>🔑 Etapa 5: Mudanza</strong><br />
                    Recibe las llaves y múdate a tu nuevo hogar
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

      {/* Processes List */}
      {processes.length === 0 ? (
        <Alert severity="info">
          <AlertTitle>No hay procesos activos</AlertTitle>
          Cuando muestres interés en una propiedad y sea aceptado, aparecerá aquí para que puedas seguir el progreso.
        </Alert>
      ) : (
        <>
          <Typography variant="h6" gutterBottom>
            Procesos Activos ({processes.length})
          </Typography>
          
          {processes.map((process) => (
            <ProcessCard key={process.id} process={process} />
          ))}
        </>
      )}

      {/* Contract Review Dialog */}
      <Dialog 
        open={reviewDialogOpen} 
        onClose={() => setReviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ContractIcon />
            <Box>
              <Typography variant="h6">
                Revisión del Borrador del Contrato
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedProcess?.property.title}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <Alert severity="info">
              <AlertTitle>Instrucciones</AlertTitle>
              Por favor revisa cuidadosamente el borrador del contrato. Puedes aprobarlo para continuar con la autenticación biométrica, o solicitar cambios si hay algo que necesita ajustarse.
            </Alert>
            
            <FormControl fullWidth>
              <InputLabel>Tu Decisión</InputLabel>
              <Select
                value={reviewAction}
                onChange={(e: SelectChangeEvent<'approve' | 'request_changes'>) => 
                  setReviewAction(e.target.value as 'approve' | 'request_changes')
                }
                label="Tu Decisión"
              >
                <MenuItem value="approve">✅ Aprobar borrador y continuar</MenuItem>
                <MenuItem value="request_changes">✏️ Solicitar cambios</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label={reviewAction === 'approve' ? 'Comentarios adicionales (opcional)' : 'Describe los cambios que necesitas'}
              multiline
              rows={4}
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              fullWidth
              required={reviewAction === 'request_changes'}
              placeholder={
                reviewAction === 'approve' 
                  ? 'Cualquier comentario adicional sobre el contrato...'
                  : 'Por favor describe específicamente qué cambios necesitas en el contrato...'
              }
            />
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={submitContractReview}
            disabled={reviewAction === 'request_changes' && !reviewComments.trim()}
            color={reviewAction === 'approve' ? 'success' : 'warning'}
            startIcon={reviewAction === 'approve' ? <ThumbUpIcon /> : <ThumbDownIcon />}
          >
            {reviewAction === 'approve' ? 'Aprobar Contrato' : 'Solicitar Cambios'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <HomeIcon color="primary" />
            Detalles del Proceso de Contrato
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedProcess && (
            <Stack spacing={3}>
              {/* Property Information */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HomeIcon color="primary" />
                  Información de la Propiedad
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Título</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedProcess.property.title}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Código del Proceso</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      #{selectedProcess.match_code}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Dirección</Typography>
                    <Typography variant="body1">
                      {selectedProcess.property.address}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Current Stage */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon color="primary" />
                  {getStageLabel(getProcessStage(selectedProcess))}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Chip 
                    label={`Etapa ${getProcessStage(selectedProcess)} de 5`}
                    color={getStageColor(getProcessStage(selectedProcess)) as any}
                    variant="filled"
                    size="large"
                  />
                  <LinearProgress 
                    variant="determinate" 
                    value={(getProcessStage(selectedProcess) / 5) * 100}
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" fontWeight="bold" color="primary">
                    {Math.round((getProcessStage(selectedProcess) / 5) * 100)}%
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {getProcessStatusLabel(selectedProcess)}
                </Typography>
              </Paper>

              {/* Workflow Data */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon color="primary" />
                  Detalles del Proceso
                </Typography>
                <Stack spacing={2}>
                  {/* Visit Information */}
                  {selectedProcess.workflow_data.visit_scheduled && (
                    <Box>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        📅 Información de Visita Programada
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">Fecha y Hora</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            📅 {new Date(selectedProcess.workflow_data.visit_scheduled.date).toLocaleDateString('es-CO')}
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            🕐 {selectedProcess.workflow_data.visit_scheduled.time}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">Estado</Typography>
                          <Chip 
                            label={selectedProcess.workflow_data.visit_scheduled.completed ? 'Completada' : 'Programada'}
                            color={selectedProcess.workflow_data.visit_scheduled.completed ? 'success' : 'warning'}
                            size="small"
                          />
                        </Grid>
                        {selectedProcess.workflow_data.visit_scheduled.notes && (
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">Mensaje del Arrendador</Typography>
                            <Typography variant="body2" sx={{ 
                              p: 2, 
                              bgcolor: 'grey.50', 
                              borderRadius: 1, 
                              border: '1px solid #e0e0e0',
                              fontStyle: 'italic'
                            }}>
                              💬 "{selectedProcess.workflow_data.visit_scheduled.notes}"
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  )}

                  {/* Documents Information */}
                  {selectedProcess.workflow_data.documents_reviewed && (
                    <Box>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        📄 Estado de Documentos
                      </Typography>
                      <Chip 
                        label={selectedProcess.workflow_data.documents_reviewed.approved ? 'Aprobados' : 'En Revisión'}
                        color={selectedProcess.workflow_data.documents_reviewed.approved ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>
                  )}

                  {/* Contract Information */}
                  {selectedProcess.workflow_data.contract_created && (
                    <Box>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        📋 Estado del Contrato
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">ID del Contrato</Typography>
                          <Typography variant="body2" fontFamily="monospace">
                            {selectedProcess.workflow_data.contract_created.contract_id}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">Estado de Revisión</Typography>
                          <Chip 
                            label={
                              selectedProcess.workflow_data.contract_created.tenant_review_status === 'approved' ? 'Aprobado' :
                              selectedProcess.workflow_data.contract_created.tenant_review_status === 'changes_requested' ? 'Cambios Solicitados' :
                              'Pendiente'
                            }
                            color={
                              selectedProcess.workflow_data.contract_created.tenant_review_status === 'approved' ? 'success' :
                              selectedProcess.workflow_data.contract_created.tenant_review_status === 'changes_requested' ? 'warning' :
                              'default'
                            }
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {/* Información Adicional del Proceso */}
                  <Box>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      📋 Información del Proceso
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Proceso Iniciado</Typography>
                        <Typography variant="body2">
                          📅 {new Date(selectedProcess.created_at).toLocaleDateString('es-CO')} a las {new Date(selectedProcess.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Grid>
                      
                      {/* Fecha de mudanza preferida */}
                      {selectedProcess.preferred_move_in_date && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">Fecha de Mudanza Preferida</Typography>
                          <Typography variant="body2" color="primary">
                            🏠 {new Date(selectedProcess.preferred_move_in_date).toLocaleDateString('es-CO')}
                          </Typography>
                        </Grid>
                      )}
                      
                      {/* Duración del contrato */}
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Duración Deseada del Contrato</Typography>
                        <Typography variant="body2">
                          📋 {selectedProcess.lease_duration_months || 12} meses
                        </Typography>
                      </Grid>

                      {/* Ingresos mensuales declarados */}
                      {selectedProcess.monthly_income && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">Ingresos Declarados</Typography>
                          <Typography variant="body2" color="success.main">
                            💰 {new Intl.NumberFormat('es-CO', {
                              style: 'currency',
                              currency: 'COP',
                              minimumFractionDigits: 0
                            }).format(selectedProcess.monthly_income)}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Documents Upload Dialog */}
      <Dialog
        open={documentsDialogOpen}
        onClose={() => setDocumentsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              📄 Subir Documentos - Etapa 2
            </Typography>
            <IconButton 
              edge="end" 
              color="inherit" 
              onClick={() => setDocumentsDialogOpen(false)}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedProcess && (
            <EnhancedTenantDocumentUpload
              processId={selectedProcess.id}
              onDocumentUploaded={() => {
                // Opcional: recargar procesos cuando se suba un documento
                fetchTenantProcesses();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TenantContractView;