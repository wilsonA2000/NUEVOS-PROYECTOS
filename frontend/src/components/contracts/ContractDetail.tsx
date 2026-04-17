import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Divider,
  CircularProgress,
  Alert,
  AlertTitle,
  LinearProgress,
  Chip,
  alpha,
} from '@mui/material';
import StatusChip from '../common/StatusChip';
import { contractStateKind, contractStateLabel } from '../../utils/statusMaps';
import { vhColors, stageToken } from '../../theme/tokens';
import {
  Home as HomeIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as AttachMoneyIcon,
  PictureAsPdf as PdfIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Gavel as GavelIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useContracts } from '../../hooks/useContracts';
import { viewContractPDF } from '../../utils/contractPdfUtils';
import ContractTimeline from './ContractTimeline';

// ─── Acciones disponibles por estado ─────────────────────────────────────────
interface Action {
  label: string;
  variant: 'contained' | 'outlined';
  color: 'primary' | 'secondary' | 'error' | 'warning';
  icon?: React.ReactNode;
  onClick: () => void;
}

const getAvailableActions = (
  status: string,
  contractId: string,
  navigate: ReturnType<typeof useNavigate>
): Action[] => {
  const actions: Action[] = [
    {
      label: 'Ver PDF',
      variant: 'outlined',
      color: 'secondary',
      icon: <PdfIcon />,
      onClick: () => viewContractPDF(contractId),
    },
  ];

  if (['draft', 'pending_tenant_biometric'].includes(status)) {
    actions.push({
      label: 'Editar',
      variant: 'contained',
      color: 'primary',
      icon: <EditIcon />,
      onClick: () => navigate(`/app/contracts/${contractId}/edit`),
    });
  }

  return actions;
};

// ─── Mini-card de dato ────────────────────────────────────────────────────────
const DataCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}> = ({ icon, label, value, accent }) => (
  <Box
    sx={{
      p: 1.5,
      borderRadius: 2,
      bgcolor: accent ? alpha(accent, 0.06) : 'grey.50',
      border: '1px solid',
      borderColor: accent ? alpha(accent, 0.2) : 'divider',
      height: '100%',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
      <Box sx={{ color: accent || 'text.secondary', display: 'flex' }}>{icon}</Box>
      <Typography variant="caption" color="text.secondary" fontWeight={500} noWrap>
        {label}
      </Typography>
    </Box>
    <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ color: accent || 'text.primary' }}>
      {value}
    </Typography>
  </Box>
);

// ─── Componente principal ─────────────────────────────────────────────────────
export const ContractDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { contracts, isLoading, error } = useContracts();

  const contract = Array.isArray(contracts) ? contracts.find((c) => c.id === id) : undefined;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <AlertTitle>Error al cargar el contrato</AlertTitle>
        {error.message || 'Ha ocurrido un error al cargar los detalles del contrato.'}
      </Alert>
    );
  }

  if (!contract) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        <AlertTitle>Contrato no encontrado</AlertTitle>
        El contrato con ID {id?.substring(0, 8)}... no fue encontrado.
        <Box mt={2}>
          <Button variant="contained" onClick={() => navigate('/app/contracts')}>
            Volver a Contratos
          </Button>
        </Box>
      </Alert>
    );
  }

  const stage = stageToken(contractStateKind(contract.status));
  const workflowProgress = (contract as any).workflow_progress ?? null;
  const progressColor =
    workflowProgress === 100 ? 'success' : workflowProgress >= 50 ? 'primary' : 'warning';
  const actions = getAvailableActions(contract.status, contract.id, navigate);

  const monthlyRent =
    contract.monthly_rent ?? (contract as any).total_value ?? 0;
  const depositAmount = (contract as any).deposit_amount ?? 0;

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {/* ─── Estado Banner ──────────────────────────────────────────────── */}
      <Box
        sx={{
          p: 2.5,
          mb: 2,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(stage.color, 0.12)} 0%, ${alpha(stage.color, 0.04)} 100%)`,
          border: `1.5px solid ${stage.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <GavelIcon sx={{ color: stage.color, fontSize: 28 }} />
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: stage.color }}>
              {contractStateLabel(contract.status)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Contrato #{contract.id?.substring(0, 8)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <StatusChip
            kind={contractStateKind(contract.status)}
            label={contractStateLabel(contract.status)}
          />
          {(contract as any).admin_review_escalated && (
            <Chip label="Escalado" color="error" size="small" />
          )}
        </Box>
      </Box>

      {/* ─── Progreso de workflow ─────────────────────────────────────── */}
      {workflowProgress !== null && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Progreso del contrato
            </Typography>
            <Typography variant="caption" fontWeight={600} color={`${progressColor}.main`}>
              {workflowProgress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={workflowProgress}
            color={progressColor}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      )}

      {/* ─── Mini-cards de datos ──────────────────────────────────────── */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <DataCard
            icon={<HomeIcon fontSize="small" />}
            label="Propiedad"
            value={contract.property?.title || contract.property?.address || 'No especificada'}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <DataCard
            icon={<PersonIcon fontSize="small" />}
            label="Inquilino"
            value={
              contract.secondary_party
                ? `${contract.secondary_party.first_name} ${contract.secondary_party.last_name}`
                : 'No especificado'
            }
            accent={vhColors.success}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <DataCard
            icon={<AttachMoneyIcon fontSize="small" />}
            label="Canon mensual"
            value={`$${monthlyRent.toLocaleString('es-CO')}`}
            accent={vhColors.accentBlue}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <DataCard
            icon={<AttachMoneyIcon fontSize="small" />}
            label="Depósito garantía"
            value={`$${depositAmount.toLocaleString('es-CO')}`}
            accent={vhColors.warning}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <DataCard
            icon={<CalendarIcon fontSize="small" />}
            label="Inicio"
            value={
              contract.start_date
                ? new Date(contract.start_date).toLocaleDateString('es-CO')
                : 'No especificada'
            }
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <DataCard
            icon={<CalendarIcon fontSize="small" />}
            label="Vencimiento"
            value={
              contract.end_date
                ? new Date(contract.end_date).toLocaleDateString('es-CO')
                : 'No especificada'
            }
          />
        </Grid>
      </Grid>

      {/* ─── Términos ────────────────────────────────────────────────── */}
      {contract.terms && (
        <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
          <CardContent sx={{ pb: '12px !important' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Términos y condiciones
            </Typography>
            <Typography variant="body2">{contract.terms}</Typography>
          </CardContent>
        </Card>
      )}

      {/* ─── Timeline ────────────────────────────────────────────────── */}
      <Box mb={2}>
        <ContractTimeline contractId={contract.id} />
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* ─── Acciones contextuales ────────────────────────────────── */}
      <Box display="flex" gap={1.5} flexWrap="wrap">
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/app/contracts')}
        >
          Volver
        </Button>
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            color={action.color}
            startIcon={action.icon}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
};
