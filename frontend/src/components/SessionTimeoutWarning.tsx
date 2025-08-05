import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';

interface SessionTimeoutWarningProps {
  isOpen: boolean;
  onExtendSession: () => void;
  onLogout: () => void;
  timeRemaining: number; // en segundos
}

const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  isOpen,
  onExtendSession,
  onLogout,
  timeRemaining,
}) => {
  const [countdown, setCountdown] = useState(timeRemaining);

  useEffect(() => {
    if (isOpen && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            onLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, countdown, onLogout]);

  const progress = ((timeRemaining - countdown) / timeRemaining) * 100;

  return (
    <Dialog
      open={isOpen}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle>
        <Typography variant="h6" color="warning.main">
          ⏰ Sesión por expirar
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            Tu sesión expirará en {countdown} segundos por inactividad.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ¿Deseas continuar con tu sesión activa?
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          color="warning"
          sx={{ height: 8, borderRadius: 4 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onLogout} color="error">
          Cerrar sesión
        </Button>
        <Button onClick={onExtendSession} variant="contained" color="primary">
          Continuar sesión
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionTimeoutWarning; 