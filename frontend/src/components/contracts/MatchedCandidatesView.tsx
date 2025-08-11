import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Description as DocumentIcon
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
  workflow_stage: 1 | 2 | 3;
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
  };
}

interface WorkflowAction {
  type: 'visit_schedule' | 'visit_completed' | 'documents_request' | 'documents_approved' | 'contract_create' | 'reject';
  data?: any;
}

const MatchedCandidatesView: React.FC = () => {
  const { user } = useAuth();
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

      const response = await fetch('/api/v1/contracts/workflow-action/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar acción');
      }

      const result = await response.json();
      
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
      const response = await fetch('/api/v1/contracts/matched-candidates/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('🔍 Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Error response:', errorText);
        throw new Error('Error al cargar candidatos aprobados');
      }

      const data = await response.json();
      console.log('🔍 Received data:', data);
      setCandidates(data.results || []);
      console.log('🔍 Set candidates:', data.results?.length || 0);
    } catch (err) {
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
      }

      const response = await fetch('/api/v1/contracts/workflow-action/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar acción');
      }

      const result = await response.json();
      
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
      case 1: return 'Etapa 1: Visita';
      case 2: return 'Etapa 2: Documentos';
      case 3: return 'Etapa 3: Contrato';
      default: return 'Etapa';
    }
  };

  const getStageColor = (stage: number) => {
    switch (stage) {
      case 1: return 'info';
      case 2: return 'warning';
      case 3: return 'success';
      default: return 'default';
    }
  };

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

            {candidate.workflow_stage === 3 && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<ContractIcon />}
                  onClick={() => handleWorkflowAction(candidate, { type: 'contract_create' })}
                  size="small"
                >
                  Crear Contrato
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
          </Box>
        </CardContent>
      </Card>
    );
  };

  const WorkflowActionDialog: React.FC = React.memo(() => {
    if (!selectedCandidate || !currentAction) return null;

    const getDialogTitle = () => {
      switch (currentAction.type) {
        case 'visit_completed': return 'Confirmar Visita Completada';
        case 'documents_request': return 'Solicitar Documentos';
        case 'documents_approved': return 'Aprobar Documentos';
        case 'contract_create': return 'Crear Contrato';
        case 'reject': return 'Rechazar Candidato';
        default: return 'Acción';
      }
    };

    const getDialogContent = () => {
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
                onChange={(e) => setDocumentsNotes(e.target.value)}
                fullWidth
              />
            </Stack>
          );

        case 'contract_create':
          return (
            <Typography>
              Se iniciará el proceso de creación de contrato. El candidato será dirigido al flujo de contratos existente.
            </Typography>
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
                  onChange={(e) => setRejectionReason(e.target.value)}
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
      switch (currentAction.type) {
        case 'reject':
          return rejectionReason;
        default:
          return true;
      }
    };

    // Handlers estables para el diálogo
    const handleCloseDialog = useCallback(() => {
      setWorkflowDialogOpen(false);
    }, []);

    return (
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
    );
  });

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
          
          {/* 3-Stage Process Explanation */}
          <Box sx={{ mt: 3 }}>
            <Stepper activeStep={-1} sx={{ mb: 2 }}>
              <Step>
                <StepLabel>
                  <Typography variant="body2">
                    <strong>Etapa 1: Visita</strong><br />
                    Programa y realiza visita a la propiedad
                  </Typography>
                </StepLabel>
              </Step>
              <Step>
                <StepLabel>
                  <Typography variant="body2">
                    <strong>Etapa 2: Documentos</strong><br />
                    Solicita y revisa documentación requerida
                  </Typography>
                </StepLabel>
              </Step>
              <Step>
                <StepLabel>
                  <Typography variant="body2">
                    <strong>Etapa 3: Contrato</strong><br />
                    Genera contrato usando el flujo existente
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
      <WorkflowActionDialog />

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