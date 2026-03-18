/**
 * ✅ UNIFIED CONTRACT WORKFLOW COMPONENT
 * Componente único que maneja el flujo contractual completo
 * para ARRENDADORES y ARRENDATARIOS con stepper visual y lógica sincronizada
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Grid,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Edit,
  Fingerprint,
  Publish,
  VisibilityOutlined,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

interface Contract {
  id: string;
  contract_number: string;
  status: string;
  title: string;
  monthly_rent: number;
  start_date: string;
  end_date: string;
  primary_party: any;
  secondary_party: any;
  tenant_approved: boolean;
  has_objections: boolean;
  landlord_auth_completed: boolean;
  tenant_auth_completed: boolean;
}

interface WorkflowStatus {
  current_status: string;
  current_phase: number;
  workflow_progress: number;
  tenant_approved: boolean;
  has_objections: boolean;
  landlord_auth_completed: boolean;
  tenant_auth_completed: boolean;
  next_biometric_step: string | null;
  can_tenant_approve: boolean;
  can_tenant_object: boolean;
  can_start_biometric: boolean;
}

interface UnifiedContractWorkflowProps {
  contractId: string;
  onUpdate?: () => void;
}

export const UnifiedContractWorkflow: React.FC<UnifiedContractWorkflowProps> = ({
  contractId,
  onUpdate,
}) => {
  const { user } = useAuth();
  const [contract, setContract] = useState<Contract | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Modal states
  const [objectionsDialog, setObjectionsDialog] = useState(false);
  const [objectionText, setObjectionText] = useState('');

  const isLandlord = user?.user_type === 'landlord';
  const isTenant = user?.user_type === 'tenant';

  // ===================================================================
  // DEFINICIÓN DE PASOS DEL WORKFLOW
  // ===================================================================
  const getWorkflowSteps = () => {
    if (isLandlord) {
      return [
        'Creación de Contrato',
        'Revisión del Arrendatario',
        'Autenticación Biométrica',
        'Publicación',
        'Contrato Activo',
      ];
    } else {
      return [
        'Revisión de Contrato',
        'Aprobación/Objeciones',
        'Autenticación Biométrica',
        'Firma Digital',
        'Contrato Activo',
      ];
    }
  };

  const getCurrentStepIndex = (status: string): number => {
    const statusToStepMap: Record<string, number> = {
      draft: 0,
      tenant_review: isLandlord ? 1 : 0,
      tenant_approved: 1,
      objections_pending: isLandlord ? 1 : 1,
      tenant_biometric: 2,
      guarantor_biometric: 2,
      landlord_biometric: 2,
      biometric_completed: 2,
      ready_to_publish: 3,
      published: 3,
      active: 4,
    };
    return statusToStepMap[status] ?? 0;
  };

  // ===================================================================
  // LOAD DATA
  // ===================================================================
  const loadContractData = async () => {
    try {
      setLoading(true);
      
      // Cargar contrato y estado del workflow
      const [contractRes, statusRes] = await Promise.all([
        api.get(`/contracts/unified-contracts/${contractId}/`),
        api.get(`/contracts/unified-contracts/${contractId}/workflow-status/`),
      ]);

      setContract(contractRes.data);
      setWorkflowStatus(statusRes.data);
    } catch (error) {
      console.error('Error loading contract:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContractData();
  }, [contractId]);

  // ===================================================================
  // ACTIONS - ARRENDATARIO
  // ===================================================================
  const handleTenantApprove = async () => {
    try {
      setProcessing(true);
      await api.post(`/contracts/unified-contracts/${contractId}/tenant-approve/`);
      
      await loadContractData();
      if (onUpdate) onUpdate();
      
      alert('✅ Contrato aprobado exitosamente. Ahora procederemos con la autenticación biométrica.');
    } catch (error: any) {
      console.error('Error approving contract:', error);
      alert(error.response?.data?.error || 'Error al aprobar el contrato');
    } finally {
      setProcessing(false);
    }
  };

  const handleTenantObject = async () => {
    if (!objectionText.trim()) {
      alert('Por favor, describe tu objeción');
      return;
    }

    try {
      setProcessing(true);
      await api.post(`/contracts/unified-contracts/${contractId}/tenant-object/`, {
        objections: [
          {
            text: objectionText,
            proposed_modification: '',
            field_reference: '',
          },
        ],
      });

      setObjectionsDialog(false);
      setObjectionText('');
      await loadContractData();
      if (onUpdate) onUpdate();

      alert('⚠️ Objeción registrada. El arrendador será notificado.');
    } catch (error: any) {
      console.error('Error submitting objection:', error);
      alert(error.response?.data?.error || 'Error al presentar objeción');
    } finally {
      setProcessing(false);
    }
  };

  // ===================================================================
  // ACTIONS - ARRENDADOR
  // ===================================================================
  const handleSendToReview = async () => {
    try {
      setProcessing(true);
      await api.post(`/contracts/unified-contracts/${contractId}/send-to-tenant-review/`);
      
      await loadContractData();
      if (onUpdate) onUpdate();
      
      alert('📤 Contrato enviado a revisión del arrendatario');
    } catch (error: any) {
      console.error('Error sending to review:', error);
      alert(error.response?.data?.error || 'Error al enviar a revisión');
    } finally {
      setProcessing(false);
    }
  };

  const handleStartBiometric = async () => {
    try {
      setProcessing(true);
      const response = await api.post(`/contracts/unified-contracts/${contractId}/start-biometric/`);
      
      await loadContractData();
      if (onUpdate) onUpdate();
      
      const nextStep = response.data.next_biometric_step;
      alert(`🔐 Iniciando autenticación biométrica. Siguiente paso: ${nextStep}`);
    } catch (error: any) {
      console.error('Error starting biometric:', error);
      alert(error.response?.data?.error || 'Error al iniciar autenticación biométrica');
    } finally {
      setProcessing(false);
    }
  };

  // ===================================================================
  // RENDER
  // ===================================================================
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!contract || !workflowStatus) {
    return (
      <Alert severity="error">No se pudo cargar el contrato</Alert>
    );
  }

  const currentStepIndex = getCurrentStepIndex(contract.status);
  const steps = getWorkflowSteps();

  return (
    <Box>
      <Card>
        <CardHeader
          title={
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h5">
                {contract.title}
              </Typography>
              <Chip
                label={`Progreso: ${workflowStatus.workflow_progress}%`}
                color="primary"
                variant="outlined"
              />
            </Box>
          }
          subheader={`Contrato ${contract.contract_number}`}
        />

        <CardContent>
          {/* PROGRESS BAR */}
          <Box mb={2}>
            <LinearProgress
              variant="determinate"
              value={workflowStatus.workflow_progress}
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>

          {/* STEPPER */}
          <Stepper activeStep={currentStepIndex} alternativeLabel sx={{ mb: 4 }}>
            {steps.map((label, index) => (
              <Step key={label} completed={index < currentStepIndex}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* INFORMACIÓN DEL CONTRATO */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  Renta Mensual
                </Typography>
                <Typography variant="h6">
                  ${contract.monthly_rent?.toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  Inicio
                </Typography>
                <Typography variant="h6">{contract.start_date}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  Fin
                </Typography>
                <Typography variant="h6">{contract.end_date}</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* ESTADO ACTUAL */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Estado Actual: {contract.status.replace(/_/g, ' ').toUpperCase()}
            </Typography>
            <Typography variant="body2">
              Fase {workflowStatus.current_phase} de 3
            </Typography>
          </Alert>

          {/* ACCIONES SEGÚN ROL Y ESTADO */}
          <Box>
            {/* ARRENDATARIO - REVISIÓN */}
            {isTenant && contract.status === 'tenant_review' && (
              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={handleTenantApprove}
                  disabled={processing || !workflowStatus.can_tenant_approve}
                  fullWidth
                >
                  Aprobar Contrato
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<Edit />}
                  onClick={() => setObjectionsDialog(true)}
                  disabled={processing || !workflowStatus.can_tenant_object}
                  fullWidth
                >
                  Presentar Objeciones
                </Button>
              </Box>
            )}

            {/* ARRENDADOR - ENVIAR A REVISIÓN */}
            {isLandlord && contract.status === 'draft' && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleSendToReview}
                disabled={processing}
                fullWidth
              >
                Enviar a Revisión del Arrendatario
              </Button>
            )}

            {/* ARRENDADOR - ESPERANDO REVISIÓN */}
            {isLandlord && contract.status === 'tenant_review' && (
              <Alert severity="info">
                ⏳ Esperando que el arrendatario revise y apruebe el contrato...
              </Alert>
            )}

            {/* AMBOS - AUTENTICACIÓN BIOMÉTRICA */}
            {contract.status === 'tenant_approved' && workflowStatus.can_start_biometric && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Fingerprint />}
                onClick={handleStartBiometric}
                disabled={processing}
                fullWidth
              >
                Iniciar Autenticación Biométrica
              </Button>
            )}

            {/* ESTADOS BIOMÉTRICOS */}
            {['tenant_biometric', 'guarantor_biometric', 'landlord_biometric'].includes(
              contract.status,
            ) && (
              <Alert severity="warning">
                🔐 Autenticación biométrica en progreso...
                <br />
                Siguiente paso: {workflowStatus.next_biometric_step}
              </Alert>
            )}

            {/* CONTRATO ACTIVO */}
            {contract.status === 'active' && (
              <Alert severity="success">
                ✅ Contrato activo y en ejecución
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* DIALOG - OBJECIONES */}
      <Dialog
        open={objectionsDialog}
        onClose={() => setObjectionsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Presentar Objeciones al Contrato</DialogTitle>
        <DialogContent>
          <TextField
            label="Describe tu objeción"
            multiline
            rows={4}
            value={objectionText}
            onChange={(e) => setObjectionText(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setObjectionsDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleTenantObject}
            variant="contained"
            color="warning"
            disabled={processing}
          >
            Enviar Objeción
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UnifiedContractWorkflow;
