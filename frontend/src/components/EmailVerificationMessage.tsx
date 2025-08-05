import React from 'react';
import { 
  Alert, 
  AlertTitle, 
  Box, 
  Button, 
  Typography, 
  Card, 
  CardContent,
  Stack,
  Chip
} from '@mui/material';
import { Email, CheckCircle, Schedule } from '@mui/icons-material';

interface EmailVerificationMessageProps {
  email: string;
  onResendEmail?: () => void;
  isResending?: boolean;
}

export const EmailVerificationMessage: React.FC<EmailVerificationMessageProps> = ({
  email,
  onResendEmail,
  isResending = false
}) => {
  return (
    <Card 
      sx={{ 
        maxWidth: 600, 
        mx: 'auto', 
        mt: 3,
        border: '2px solid',
        borderColor: 'success.main',
        boxShadow: 3
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          {/* Icono principal */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: 'success.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'success.dark'
            }}
          >
            <Email sx={{ fontSize: 40 }} />
          </Box>

          {/* Título */}
          <Typography variant="h4" component="h1" color="success.dark" fontWeight="bold">
            ¡Registro Exitoso!
          </Typography>

          {/* Mensaje principal */}
          <Alert severity="success" sx={{ width: '100%' }}>
            <AlertTitle>Email de Verificación Enviado</AlertTitle>
            Hemos enviado un correo de verificación a <strong>{email}</strong>
          </Alert>

          {/* Instrucciones */}
          <Box sx={{ width: '100%' }}>
            <Typography variant="h6" gutterBottom color="text.primary">
              Pasos a seguir:
            </Typography>
            
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip 
                  label="1" 
                  color="primary" 
                  size="small"
                  sx={{ minWidth: 32 }}
                />
                <Typography>
                  Revisa tu <strong>bandeja de entrada</strong> en {email}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip 
                  label="2" 
                  color="primary" 
                  size="small"
                  sx={{ minWidth: 32 }}
                />
                <Typography>
                  Si no lo encuentras, <strong>revisa tu carpeta de SPAM</strong>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip 
                  label="3" 
                  color="primary" 
                  size="small"
                  sx={{ minWidth: 32 }}
                />
                <Typography>
                  <strong>Haz click en el enlace</strong> de verificación en el email
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip 
                  label="4" 
                  color="success" 
                  size="small"
                  sx={{ minWidth: 32 }}
                />
                <Typography>
                  Una vez verificado, podrás <strong>iniciar sesión</strong>
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Información adicional */}
          <Alert severity="info" sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Schedule fontSize="small" />
              <Typography variant="body2" fontWeight="bold">
                El enlace expira en 24 horas
              </Typography>
            </Box>
            <Typography variant="body2">
              Si el enlace expira, podrás solicitar un nuevo email de verificación.
            </Typography>
          </Alert>

          {/* Botón para reenviar */}
          {onResendEmail && (
            <Button
              variant="outlined"
              onClick={onResendEmail}
              disabled={isResending}
              startIcon={<Email />}
              sx={{ mt: 2 }}
            >
              {isResending ? 'Reenviando...' : 'Reenviar Email de Verificación'}
            </Button>
          )}

          {/* Estado de verificación */}
          <Box sx={{ 
            p: 2, 
            backgroundColor: 'grey.50', 
            borderRadius: 1, 
            width: '100%' 
          }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Estado de la cuenta:</strong>
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Schedule color="warning" fontSize="small" />
              <Typography variant="body2" color="warning.main">
                Pendiente de verificación por email
              </Typography>
            </Box>
          </Box>

          {/* Nota sobre spam */}
          <Alert severity="warning" sx={{ width: '100%' }}>
            <Typography variant="body2">
              <strong>¿No encuentras el email?</strong><br />
              Algunos proveedores de email pueden clasificar nuestros mensajes como spam. 
              Revisa tu carpeta de spam/promociones y marca nuestro email como "No es spam".
            </Typography>
          </Alert>
        </Stack>
      </CardContent>
    </Card>
  );
};