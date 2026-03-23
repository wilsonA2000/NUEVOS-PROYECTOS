import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Edit as EditIcon,
  Send as SendIcon,
  Gavel as LegalIcon,
  Fingerprint as BiometricIcon,
  Description as ContractIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Schedule as TimeIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { LandlordContractService } from '../../services/landlordContractService';
import { ContractWorkflowHistory } from '../../types/landlordContract';

const getActionIcon = (actionType: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'admin_approval': <LegalIcon sx={{ fontSize: 20, color: 'success.main' }} />,
    'admin_rejection': <RejectIcon sx={{ fontSize: 20, color: 'error.main' }} />,
    'contract_creation': <ContractIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
    'tenant_invitation': <SendIcon sx={{ fontSize: 20, color: 'info.main' }} />,
    'tenant_approval': <ApproveIcon sx={{ fontSize: 20, color: 'success.main' }} />,
    'tenant_rejection': <RejectIcon sx={{ fontSize: 20, color: 'error.main' }} />,
    'biometric_start': <BiometricIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
    'biometric_complete': <BiometricIcon sx={{ fontSize: 20, color: 'success.main' }} />,
    'state_change': <EditIcon sx={{ fontSize: 20, color: 'warning.main' }} />,
    'sla_escalation': <TimeIcon sx={{ fontSize: 20, color: 'error.main' }} />,
  };
  return iconMap[actionType] || <PersonIcon sx={{ fontSize: 20, color: 'text.secondary' }} />;
};

const getPerformerLabel = (type: string) => {
  const labels: Record<string, { label: string; color: 'primary' | 'secondary' | 'info' | 'warning' }> = {
    'landlord': { label: 'Arrendador', color: 'primary' },
    'tenant': { label: 'Arrendatario', color: 'secondary' },
    'admin': { label: 'Admin Legal', color: 'warning' },
    'system': { label: 'Sistema', color: 'info' },
  };
  return labels[type] || { label: type, color: 'info' as const };
};

interface ContractTimelineProps {
  contractId: string;
}

const ContractTimeline: React.FC<ContractTimelineProps> = ({ contractId }) => {
  const [history, setHistory] = useState<ContractWorkflowHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const data = await LandlordContractService.getContractHistory(contractId);
        setHistory(data);
      } catch {
        setError('No se pudo cargar el historial del contrato.');
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [contractId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="info" sx={{ my: 2 }}>{error}</Alert>;
  }

  if (history.length === 0) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        No hay registros de actividad para este contrato.
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          Historial del Contrato
        </Typography>
        {history.map((entry, index) => {
          const performer = getPerformerLabel(entry.performed_by_type);
          return (
            <React.Fragment key={entry.id}>
              <Box sx={{ display: 'flex', gap: 2, py: 1.5 }}>
                <Box sx={{ mt: 0.5 }}>
                  {getActionIcon(entry.action_type)}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {entry.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip
                      label={performer.label}
                      color={performer.color}
                      size="small"
                      variant="outlined"
                      sx={{ height: 22, fontSize: '0.7rem' }}
                    />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {format(parseISO(entry.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              {index < history.length - 1 && (
                <Divider sx={{ ml: 4.5 }} />
              )}
            </React.Fragment>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ContractTimeline;
