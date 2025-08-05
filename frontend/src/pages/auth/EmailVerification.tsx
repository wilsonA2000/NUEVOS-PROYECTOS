import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Button,
  Alert
} from '@mui/material';
import { EmailVerificationMessage } from '../../components/EmailVerificationMessage';
import { authService } from '../../services/authService';

export const EmailVerification: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  
  // Obtener email del state de navegación
  const email = location.state?.email || '';
  const message = location.state?.message || '';

  // Si no hay email, redirigir a registro
  React.useEffect(() => {
    if (!email) {
      navigate('/register', { replace: true });
    }
  }, [email, navigate]);

  const handleResendEmail = async () => {
    if (!email) return;
    
    setIsResending(true);
    setResendMessage(null);
    
    try {
      // Llamar al endpoint de reenvío
      const response = await fetch('/api/v1/users/auth/resend-confirmation/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setResendMessage(data.message || 'Email de verificación reenviado exitosamente.');
      } else {
        const errorData = await response.json();
        setResendMessage(errorData.error || 'Error al reenviar el email de verificación.');
      }
    } catch (error) {
      console.error('Error reenviando email:', error);
      setResendMessage('Error de conexión. Por favor, intenta más tarde.');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login', {
      state: {
        message: 'Si ya verificaste tu email, puedes iniciar sesión aquí.',
        email: email
      }
    });
  };

  if (!email) {
    return null; // El useEffect redirigirá
  }

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4,
        }}
      >
        {/* Mensaje inicial si existe */}
        {message && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {message}
          </Alert>
        )}

        {/* Mensaje de reenvío */}
        {resendMessage && (
          <Alert 
            severity={resendMessage.includes('Error') ? 'error' : 'success'} 
            sx={{ mb: 3 }}
          >
            {resendMessage}
          </Alert>
        )}

        {/* Componente principal de verificación */}
        <EmailVerificationMessage
          email={email}
          onResendEmail={handleResendEmail}
          isResending={isResending}
        />

        {/* Botones adicionales */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="text"
            onClick={handleGoToLogin}
            sx={{ mr: 2 }}
          >
            ¿Ya verificaste tu email? Ir a Login
          </Button>
          
          <Button
            variant="text"
            onClick={() => navigate('/register')}
            color="secondary"
          >
            Volver al Registro
          </Button>
        </Box>

        {/* Información adicional */}
        <Box sx={{ mt: 4 }}>
          <Alert severity="info">
            <strong>¿Problemas con la verificación?</strong><br />
            • Revisa tu carpeta de spam/promociones<br />
            • El enlace expira en 24 horas<br />
            • Contacta soporte si persisten los problemas<br />
            • Asegúrate de hacer click en el enlace desde el mismo dispositivo
          </Alert>
        </Box>
      </Box>
    </Container>
  );
};