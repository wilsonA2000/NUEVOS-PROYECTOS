/**
 * 📝 ADMIN CONTRACT REVIEW (Plan Maestro V2.0)
 *
 * Página de revisión detallada de un contrato para aprobación/rechazo.
 * Muestra toda la información del contrato, cláusulas, historial y permite acciones.
 *
 * Features:
 * - Vista completa del contrato
 * - Preview de cláusulas
 * - Datos del arrendador, arrendatario y propiedad
 * - Historial de revisiones previas
 * - Botones: Aprobar / Rechazar / Solicitar Cambios
 */

import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  IconButton,
  Tooltip,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  ArrowBack as BackIcon,
  Home as PropertyIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  Description as ClauseIcon,
  History as HistoryIcon,
  ExpandMore as ExpandIcon,
  Warning as WarningIcon,
  Loop as CycleIcon,
  Gavel as GavelIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  AdminService,
  AdminContractDetail,
  AdminApprovalPayload,
  AdminRejectionPayload,
} from '../../services/adminService';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ContractApprovalModal from '../../components/admin/ContractApprovalModal';
import ContractRejectionModal from '../../components/admin/ContractRejectionModal';

/**
 * Formatear fecha
 */
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Formatear moneda
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Componente principal de revisión
 */
const AdminContractReview: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { adminPermissions } = useAdminAuth();

  // Estado de modales
  const [approvalModalOpen, setApprovalModalOpen] = useState(
    searchParams.get('action') === 'approve'
  );
  const [rejectionModalOpen, setRejectionModalOpen] = useState(
    searchParams.get('action') === 'reject'
  );

  // Fetch contract detail
  const {
    data: contract,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-contract-detail', contractId],
    queryFn: () => AdminService.getContractForReview(contractId!),
    enabled: !!contractId,
  });

  // Mutation para aprobar
  const approveMutation = useMutation({
    mutationFn: (payload: AdminApprovalPayload) =>
      AdminService.approveContract(contractId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-contract-stats'] });
      setApprovalModalOpen(false);
      navigate('/app/admin/contracts', {
        state: { message: 'Contrato aprobado exitosamente', type: 'success' },
      });
    },
  });

  // Mutation para rechazar
  const rejectMutation = useMutation({
    mutationFn: (payload: AdminRejectionPayload) =>
      AdminService.rejectContract(contractId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-contract-stats'] });
      setRejectionModalOpen(false);
      navigate('/app/admin/contracts', {
        state: { message: 'Contrato devuelto al arrendador', type: 'info' },
      });
    },
  });

  // Loading
  if (isLoading) {
    return <LoadingSpinner message="Cargando detalles del contrato..." />;
  }

  // Error
  if (error || !contract) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error al cargar el contrato: {(error as Error)?.message || 'No encontrado'}
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/app/admin/contracts')}
          sx={{ mt: 2 }}
        >
          Volver a la lista
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          underline="hover"
          color="inherit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('/app/admin');
          }}
        >
          Admin
        </Link>
        <Link
          underline="hover"
          color="inherit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('/app/admin/contracts');
          }}
        >
          Contratos
        </Link>
        <Typography color="text.primary">Revisión</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {contract.property_title}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={contract.current_state === 'RE_PENDING_ADMIN' ? 'Re-Revisión' : 'Pendiente'}
              color={contract.current_state === 'RE_PENDING_ADMIN' ? 'secondary' : 'primary'}
              icon={contract.current_state === 'RE_PENDING_ADMIN' ? <CycleIcon /> : undefined}
            />
            <Chip
              label={`${contract.days_pending} días pendiente`}
              color={
                contract.days_pending >= 7
                  ? 'error'
                  : contract.days_pending >= 3
                  ? 'warning'
                  : 'default'
              }
              variant="outlined"
            />
            {(contract.review_cycle_count ?? 1) > 1 && (
              <Chip
                label={`Ciclo de revisión #${contract.review_cycle_count}`}
                color="info"
                variant="outlined"
              />
            )}
          </Stack>
        </Box>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={() => navigate('/app/admin/contracts')}
        >
          Volver
        </Button>
      </Box>

      {/* Alertas */}
      {contract.is_urgent && (
        <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 3 }}>
          Este contrato lleva más de 7 días pendiente de revisión. Se recomienda atención inmediata.
        </Alert>
      )}

      {contract.tenant_return_notes && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography fontWeight="medium" gutterBottom>
            Notas del arrendatario al devolver:
          </Typography>
          <Typography variant="body2">{contract.tenant_return_notes}</Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Columna izquierda - Información */}
        <Grid item xs={12} md={8}>
          {/* Datos de la propiedad */}
          <Card sx={{ mb: 3 }}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'primary.light' }}>
                  <PropertyIcon color="primary" />
                </Avatar>
              }
              title="Propiedad"
              subheader={contract.property_address}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Canon Mensual
                  </Typography>
                  <Typography variant="h6" fontWeight="medium">
                    {formatCurrency(contract.monthly_rent)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Depósito
                  </Typography>
                  <Typography variant="h6" fontWeight="medium">
                    {formatCurrency(contract.deposit_amount)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Fecha Inicio
                  </Typography>
                  <Typography variant="body1">{formatDate(contract.start_date)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Fecha Fin
                  </Typography>
                  <Typography variant="body1">{formatDate(contract.end_date)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Día de Pago
                  </Typography>
                  <Typography variant="body1">Día {contract.payment_day} de cada mes</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Partes del contrato */}
          <Card sx={{ mb: 3 }}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'success.light' }}>
                  <PersonIcon color="success" />
                </Avatar>
              }
              title="Partes del Contrato"
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Arrendador
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {contract.landlord_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {contract.landlord_email}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Arrendatario
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {contract.tenant_name || 'Sin asignar'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {contract.tenant_email || 'N/A'}
                  </Typography>
                </Grid>
                {contract.has_codeudor && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Codeudor
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {contract.codeudor_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {contract.codeudor_email}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Cláusulas */}
          <Card sx={{ mb: 3 }}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'info.light' }}>
                  <ClauseIcon color="info" />
                </Avatar>
              }
              title="Cláusulas del Contrato"
              subheader={`${contract.clauses?.length || 0} cláusulas`}
            />
            <CardContent sx={{ pt: 0 }}>
              {(contract.clauses || []).map((clause, index) => (
                <Accordion key={clause.key} defaultExpanded={index < 2}>
                  <AccordionSummary expandIcon={<ExpandIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontWeight="medium">{clause.title}</Typography>
                      {clause.is_custom && (
                        <Chip size="small" label="Personalizada" color="warning" />
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {clause.content}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Columna derecha - Acciones y historial */}
        <Grid item xs={12} md={4}>
          {/* Acciones */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              Acciones
            </Typography>
            <Stack spacing={2}>
              {adminPermissions.canApproveContracts && (
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  fullWidth
                  startIcon={<ApproveIcon />}
                  onClick={() => setApprovalModalOpen(true)}
                  disabled={approveMutation.isPending}
                >
                  Aprobar Contrato
                </Button>
              )}
              {adminPermissions.canRejectContracts && (
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  fullWidth
                  startIcon={<RejectIcon />}
                  onClick={() => setRejectionModalOpen(true)}
                  disabled={rejectMutation.isPending}
                >
                  Rechazar / Solicitar Cambios
                </Button>
              )}
              <Button
                variant="outlined"
                fullWidth
                startIcon={<OpenIcon />}
                onClick={() =>
                  window.open(
                    `http://localhost:8000/api/v1/contracts/${contractId}/preview-pdf/`,
                    '_blank'
                  )
                }
              >
                Ver PDF del Contrato
              </Button>
            </Stack>
          </Paper>

          {/* Historial de workflow */}
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <HistoryIcon color="primary" />
              <Typography variant="h6" fontWeight="medium">
                Historial
              </Typography>
            </Box>
            <List dense disablePadding>
              {(contract.workflow_history || []).map((entry, index) => (
                <ListItem key={index} disablePadding sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <GavelIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary={entry.action}
                    secondary={
                      <>
                        <Typography variant="caption" display="block">
                          {entry.user_email}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {formatDate(entry.timestamp)}
                        </Typography>
                        {entry.notes && (
                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                            "{entry.notes}"
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
              {(!contract.workflow_history || contract.workflow_history.length === 0) && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  Sin historial previo
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Modales */}
      <ContractApprovalModal
        open={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        onConfirm={(payload) => approveMutation.mutate(payload)}
        isLoading={approveMutation.isPending}
        contractTitle={contract.property_title}
        isReCycle={(contract.review_cycle_count ?? 1) > 1}
      />

      <ContractRejectionModal
        open={rejectionModalOpen}
        onClose={() => setRejectionModalOpen(false)}
        onConfirm={(payload) => rejectMutation.mutate(payload)}
        isLoading={rejectMutation.isPending}
        contractTitle={contract.property_title}
      />
    </Box>
  );
};

export default AdminContractReview;
