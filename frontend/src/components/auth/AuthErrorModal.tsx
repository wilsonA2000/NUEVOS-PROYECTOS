import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  AlertTitle,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  ContactSupport as ContactSupportIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';

interface AuthErrorModalProps {
  open: boolean;
  onClose: () => void;
  error: string;
  title?: string;
}

const AuthErrorModal: React.FC<AuthErrorModalProps> = ({
  open,
  onClose,
  error,
  title = "Acceso No Autorizado"
}) => {
  const isVerificationError = error.includes('autorizada') || error.includes('verificada');
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: isVerificationError ? '#fff3e0' : '#ffebee'
      }}>
        <Box display="flex" alignItems="center" gap={1}>
          <ContactSupportIcon 
            color={isVerificationError ? "warning" : "error"}
            sx={{ fontSize: 28 }}
          />
          <Typography variant="h6" component="div" fontWeight={600}>
            {title}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Alert 
          severity={isVerificationError ? "warning" : "error"}
          sx={{ 
            mb: 3,
            '& .MuiAlert-message': { width: '100%' }
          }}
        >
          <AlertTitle sx={{ fontWeight: 600, mb: 1 }}>
            {isVerificationError ? "Cuenta en Proceso de Verificación" : "Error de Autenticación"}
          </AlertTitle>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {error}
          </Typography>
        </Alert>

        {isVerificationError && (
          <Box sx={{ 
            backgroundColor: '#f8f9fa', 
            borderRadius: 2, 
            p: 3,
            border: '1px solid #e9ecef'
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#2c3e50' }}>
              ¿Cómo puedo unirme a VeriHome?
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 2, color: '#6c757d' }}>
                Para ser parte de nuestra comunidad, sigue estos pasos:
              </Typography>
              
              <Box component="ol" sx={{ pl: 2, mb: 2 }}>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Completa el formulario de contacto en nuestra página principal
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Te contactaremos para programar una entrevista
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Recibirás un código único de registro por email
                </Typography>
                <Typography component="li" variant="body2">
                  Completa tu registro con el código proporcionado
                </Typography>
              </Box>
            </Box>

            <Box sx={{ 
              backgroundColor: '#e3f2fd', 
              borderRadius: 2, 
              p: 2,
              border: '1px solid #bbdefb'
            }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#1976d2' }}>
                Contacto Directo:
              </Typography>
              
              <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                <EmailIcon sx={{ fontSize: 16, color: '#1976d2' }} />
                <Typography variant="body2" sx={{ color: '#1976d2' }}>
                  verihomeadmi@gmail.com
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center" gap={1}>
                <PhoneIcon sx={{ fontSize: 16, color: '#1976d2' }} />
                <Typography variant="body2" sx={{ color: '#1976d2' }}>
                  +57 300 123 4567
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500
          }}
        >
          Entendido
        </Button>
        
        {isVerificationError && (
          <Button
            variant="contained"
            onClick={() => window.location.href = '/'}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              backgroundColor: '#1976d2',
              '&:hover': {
                backgroundColor: '#1565c0'
              }
            }}
          >
            Ir a Página Principal
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AuthErrorModal; 