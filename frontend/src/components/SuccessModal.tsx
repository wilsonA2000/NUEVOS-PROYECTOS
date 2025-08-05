import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  onRedirect: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  open,
  onClose,
  onRedirect,
}) => {
  useEffect(() => {
    if (open) {
      // Redirigir automáticamente después de 2 segundos
      const timer = setTimeout(() => {
        onRedirect();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [open, onRedirect]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: 1,
        },
      }}
    >
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            py: 3,
          }}
        >
          <CheckCircleIcon
            sx={{
              fontSize: 64,
              color: 'success.main',
              mb: 2,
            }}
          />
          
          <Typography variant="h5" component="h2" gutterBottom color="success.main">
            ¡Usuario Creado con Éxito!
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 2 }}>
            Tu cuenta ha sido registrada correctamente en VeriHome.
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Hemos enviado un correo de confirmación a tu dirección de email.
            Por favor, verifica tu correo electrónico para activar tu cuenta.
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Redirigiendo en 2 segundos...
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button
          onClick={onRedirect}
          variant="contained"
          color="primary"
          size="large"
        >
          Ir a Iniciar Sesión
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 