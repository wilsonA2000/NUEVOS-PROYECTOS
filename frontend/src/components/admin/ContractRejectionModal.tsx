/**
 * ❌ CONTRACT REJECTION MODAL (Plan Maestro V2.0)
 *
 * Modal para rechazar/devolver un contrato con notas obligatorias.
 *
 * Features:
 * - Campo de notas obligatorio
 * - Opción de requerir re-envío
 * - Preview del efecto del rechazo
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
  Cancel as RejectIcon,
  Warning as WarningIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';

import { AdminRejectionPayload } from '../../services/adminService';

interface ContractRejectionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: AdminRejectionPayload) => void;
  isLoading: boolean;
  contractTitle: string;
}

/**
 * Modal de rechazo de contrato
 */
const ContractRejectionModal: React.FC<ContractRejectionModalProps> = ({
  open,
  onClose,
  onConfirm,
  isLoading,
  contractTitle,
}) => {
  const [notes, setNotes] = useState('');
  const [requiresResubmission, setRequiresResubmission] = useState(true);
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!notes.trim()) {
      setError('Las notas son obligatorias al rechazar un contrato');
      return;
    }
    if (notes.trim().length < 20) {
      setError(
        'Por favor proporciona una explicación más detallada (mínimo 20 caracteres)',
      );
      return;
    }
    setError('');
    onConfirm({
      notes: notes.trim(),
      requires_resubmission: requiresResubmission,
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      setNotes('');
      setRequiresResubmission(true);
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'error.light' }}>
            <RejectIcon sx={{ color: 'error.main' }} />
          </Avatar>
          <Box>
            <Typography variant='h6'>Rechazar / Solicitar Cambios</Typography>
            <Typography variant='body2' color='text.secondary'>
              {contractTitle}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Alerta de advertencia */}
        <Alert severity='warning' icon={<WarningIcon />} sx={{ mb: 3 }}>
          <Typography variant='body2' gutterBottom fontWeight='medium'>
            Al rechazar, el contrato será devuelto al arrendador para
            correcciones.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Typography variant='caption' color='text.secondary'>
              PENDING_ADMIN_REVIEW
            </Typography>
            <ArrowIcon fontSize='small' />
            <Typography
              variant='caption'
              fontWeight='medium'
              color='error.main'
            >
              LANDLORD_CORRECTING
            </Typography>
            <ArrowIcon fontSize='small' />
            <Typography variant='caption' color='text.secondary'>
              RE_PENDING_ADMIN
            </Typography>
          </Box>
        </Alert>

        {/* Campo de notas obligatorio */}
        <TextField
          label='Motivo del rechazo *'
          placeholder='Describe los problemas encontrados y las correcciones necesarias...'
          multiline
          rows={4}
          fullWidth
          value={notes}
          onChange={e => {
            setNotes(e.target.value);
            if (error) setError('');
          }}
          disabled={isLoading}
          error={!!error}
          helperText={error || `${notes.length} caracteres (mínimo 20)`}
          sx={{ mb: 2 }}
        />

        {/* Sugerencias */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant='caption'
            color='text.secondary'
            gutterBottom
            display='block'
          >
            Sugerencias de motivos comunes:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {[
              'Cláusula de penalidad excesiva',
              'Falta información del codeudor',
              'Monto de depósito incorrecto',
              'Fecha de inicio inválida',
              'Dirección incompleta',
            ].map(suggestion => (
              <Button
                key={suggestion}
                size='small'
                variant='outlined'
                onClick={() =>
                  setNotes(prev =>
                    prev ? `${prev}\n- ${suggestion}` : suggestion,
                  )
                }
                disabled={isLoading}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                + {suggestion}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Opciones */}
        <FormControlLabel
          control={
            <Checkbox
              checked={requiresResubmission}
              onChange={e => setRequiresResubmission(e.target.checked)}
              disabled={isLoading}
            />
          }
          label={
            <Box>
              <Typography variant='body2'>
                Requiere re-envío para aprobación
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                El arrendador deberá corregir y re-enviar el contrato
              </Typography>
            </Box>
          }
        />

        <Divider sx={{ my: 2 }} />

        {/* Información adicional */}
        <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
          <Typography variant='body2' fontWeight='medium' gutterBottom>
            ¿Qué sucede después?
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
            component='ul'
            sx={{ pl: 2, m: 0 }}
          >
            <li>El arrendador recibirá una notificación con tus notas</li>
            <li>El contrato pasará a estado "En Corrección"</li>
            <li>Una vez corregido, volverá a tu bandeja de pendientes</li>
            <li>Se incrementará el contador de ciclo de revisión</li>
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          variant='contained'
          color='error'
          onClick={handleConfirm}
          disabled={isLoading || !notes.trim()}
          startIcon={
            isLoading ? <CircularProgress size={20} /> : <RejectIcon />
          }
        >
          {isLoading ? 'Procesando...' : 'Rechazar y Solicitar Cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContractRejectionModal;
