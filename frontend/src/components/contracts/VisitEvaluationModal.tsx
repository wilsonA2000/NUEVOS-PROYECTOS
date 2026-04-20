import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Box,
  IconButton,
  CircularProgress,
  Typography,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface VisitEvaluationModalProps {
  open: boolean;
  onClose: () => void;
  onEvaluate: (approved: boolean, notes: string) => Promise<void>;
  candidateName: string;
  propertyTitle: string;
  visitDate: string;
  visitTime: string;
}

const VisitEvaluationModal: React.FC<VisitEvaluationModalProps> = ({
  open,
  onClose,
  onEvaluate,
  candidateName,
  propertyTitle,
  visitDate,
  visitTime,
}) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Resetear formulario cuando se abre
  React.useEffect(() => {
    if (open) {
      setNotes('');
      setLoading(false);
    }
  }, [open]);

  const handleEvaluate = useCallback(
    async (approved: boolean) => {
      setLoading(true);
      try {
        await onEvaluate(approved, notes);
        onClose();
      } catch (error) {
      } finally {
        setLoading(false);
      }
    },
    [notes, onEvaluate, onClose],
  );

  const handleClose = useCallback(() => {
    if (!loading) {
      onClose();
    }
  }, [loading, onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant='h6'>Evaluar Visita</Typography>
          <IconButton onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Información de la visita */}
          <Alert severity='info'>
            <AlertTitle>Información de la Visita</AlertTitle>
            <Typography variant='body2'>
              <strong>Candidato:</strong> {candidateName}
            </Typography>
            <Typography variant='body2'>
              <strong>Propiedad:</strong> {propertyTitle}
            </Typography>
            <Typography variant='body2'>
              <strong>Fecha programada:</strong>{' '}
              {new Date(visitDate).toLocaleDateString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}{' '}
              a las {visitTime}
            </Typography>
          </Alert>

          {/* Pregunta principal */}
          <Alert severity='warning' icon={<WarningIcon />}>
            <AlertTitle>¿La visita se realizó satisfactoriamente?</AlertTitle>
            <Typography variant='body2'>
              Si apruebas, el candidato avanzará a la siguiente etapa (Revisión
              de Documentos). Si rechazas, el candidato será descartado del
              proceso.
            </Typography>
          </Alert>

          {/* Notas opcionales */}
          <TextField
            fullWidth
            label='Notas de la visita (opcional)'
            multiline
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder='Ej: El candidato llegó puntual, mostró interés genuino en la propiedad...'
            disabled={loading}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading} variant='outlined'>
          Cancelar
        </Button>
        <Button
          onClick={() => handleEvaluate(false)}
          disabled={loading}
          variant='outlined'
          color='error'
          startIcon={loading ? <CircularProgress size={20} /> : <RejectIcon />}
        >
          Rechazar Candidato
        </Button>
        <Button
          onClick={() => handleEvaluate(true)}
          disabled={loading}
          variant='contained'
          color='success'
          startIcon={loading ? <CircularProgress size={20} /> : <ApproveIcon />}
        >
          Aprobar y Continuar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VisitEvaluationModal;
