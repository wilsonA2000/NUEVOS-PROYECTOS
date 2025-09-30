import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Box,
  IconButton,
  CircularProgress,
  Typography
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface VisitScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { date: string; time: string; notes: string }) => Promise<void>;
  candidateName: string;
  propertyTitle: string;
}

const VisitScheduleModal: React.FC<VisitScheduleModalProps> = ({
  open,
  onClose,
  onConfirm,
  candidateName,
  propertyTitle
}) => {
  // Estados locales completamente independientes
  const [visitDate, setVisitDate] = useState('');
  const [visitHour, setVisitHour] = useState('09');
  const [visitNotes, setVisitNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Resetear formulario cuando se abre
  React.useEffect(() => {
    if (open) {
      setVisitDate('');
      setVisitHour('09');
      setVisitNotes('');
      setLoading(false);
    }
  }, [open]);

  const handleConfirm = useCallback(async () => {
    if (!visitDate || !visitHour) return;
    
    setLoading(true);
    try {
      await onConfirm({
        date: visitDate,
        time: `${visitHour}:00`,
        notes: visitNotes
      });
      onClose();
    } catch (error) {
      console.error('Error al programar visita:', error);
    } finally {
      setLoading(false);
    }
  }, [visitDate, visitHour, visitNotes, onConfirm, onClose]);

  const handleClose = useCallback(() => {
    if (!loading) {
      onClose();
    }
  }, [loading, onClose]);

  const hourOptions = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18'];

  const isFormValid = visitDate && visitHour;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '400px'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            Programar Visita
          </Typography>
          <IconButton onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            <strong>Candidato:</strong> {candidateName}<br />
            <strong>Propiedad:</strong> {propertyTitle}
          </Typography>

          <Stack spacing={3}>
            <TextField
              label="Fecha de Visita"
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="Selecciona la fecha para la visita"
              inputProps={{
                min: new Date().toISOString().split('T')[0]
              }}
              disabled={loading}
            />

            <FormControl fullWidth disabled={loading}>
              <InputLabel>Hora de Visita</InputLabel>
              <Select
                value={visitHour}
                onChange={(e) => setVisitHour(e.target.value)}
                label="Hora de Visita"
              >
                {hourOptions.map((hour) => (
                  <MenuItem key={hour} value={hour}>
                    {hour}:00 {parseInt(hour) >= 12 ? 'PM' : 'AM'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Notas (opcional)"
              multiline
              rows={4}
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value)}
              fullWidth
              placeholder="Agrega notas sobre la visita programada..."
              helperText="Información adicional sobre la visita"
              inputProps={{
                maxLength: 500
              }}
              disabled={loading}
            />
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!isFormValid || loading}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Programando...
            </>
          ) : (
            'Programar Visita'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VisitScheduleModal;