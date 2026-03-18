/**
 * ✅ CONTRACT APPROVAL MODAL (Plan Maestro V2.0)
 *
 * Modal para aprobar un contrato con confirmación y notas opcionales.
 *
 * Features:
 * - Confirmación clara de la acción
 * - Campo de notas opcional
 * - Preview del efecto de la aprobación
 * - Loading state durante procesamiento
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Divider,
  Avatar,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Gavel as GavelIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';

import { AdminApprovalPayload } from '../../services/adminService';

interface ContractApprovalModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: AdminApprovalPayload) => void;
  isLoading: boolean;
  contractTitle: string;
  isReCycle?: boolean;
}

/**
 * Modal de aprobación de contrato
 */
const ContractApprovalModal: React.FC<ContractApprovalModalProps> = ({
  open,
  onClose,
  onConfirm,
  isLoading,
  contractTitle,
  isReCycle = false,
}) => {
  const [notes, setNotes] = useState('');
  const [skipNotification, setSkipNotification] = useState(false);

  const handleConfirm = () => {
    onConfirm({
      notes: notes.trim() || undefined,
      skip_notification: skipNotification,
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      setNotes('');
      setSkipNotification(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'success.light' }}>
            <ApproveIcon sx={{ color: 'success.main' }} />
          </Avatar>
          <Box>
            <Typography variant="h6">
              {isReCycle ? 'Re-Aprobar Contrato' : 'Aprobar Contrato'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {contractTitle}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Descripción del flujo */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom fontWeight="medium">
            {isReCycle
              ? 'Al re-aprobar, el contrato volverá al estado DRAFT para revisión del arrendatario.'
              : 'Al aprobar, el contrato pasará al estado DRAFT y estará listo para la revisión del arrendatario.'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {isReCycle ? 'RE_PENDING_ADMIN' : 'PENDING_ADMIN_REVIEW'}
            </Typography>
            <ArrowIcon fontSize="small" />
            <Typography variant="caption" fontWeight="medium">
              DRAFT
            </Typography>
            <ArrowIcon fontSize="small" />
            <Typography variant="caption" color="text.secondary">
              TENANT_REVIEWING
            </Typography>
          </Box>
        </Alert>

        {/* Campo de notas */}
        <TextField
          label="Notas de aprobación (opcional)"
          placeholder="Agregar comentarios o indicaciones para el arrendador..."
          multiline
          rows={3}
          fullWidth
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isLoading}
          sx={{ mb: 2 }}
        />

        {/* Opciones */}
        <FormControlLabel
          control={
            <Checkbox
              checked={skipNotification}
              onChange={(e) => setSkipNotification(e.target.checked)}
              disabled={isLoading}
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              No enviar notificación por email al arrendador
            </Typography>
          }
        />

        <Divider sx={{ my: 2 }} />

        {/* Confirmación legal */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
          <GavelIcon sx={{ color: 'primary.main', mt: 0.5 }} />
          <Box>
            <Typography variant="body2" fontWeight="medium">
              Confirmación Legal
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Al aprobar este contrato, confirmo que he revisado las cláusulas y que cumplen con la
              Ley 820 de 2003 de arrendamiento de vivienda urbana en Colombia.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleConfirm}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : <ApproveIcon />}
        >
          {isLoading ? 'Aprobando...' : isReCycle ? 'Re-Aprobar Contrato' : 'Aprobar Contrato'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContractApprovalModal;
