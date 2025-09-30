import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  CircularProgress,
  Alert,
  Button,
  Stack
} from '@mui/material';
import { CheckCircle, Error, Email } from '@mui/icons-material';
import { api } from '../services/api';

export const ConfirmEmail: React.FC = () => {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      if (!key) {
        setStatus('error');
        setMessage('Enlace de confirmación inválido');
        return;
      }

      try {
        const response = await api.post(`/users/auth/confirm-email/${key}/`);

        if (response.status >= 200 && response.status < 300) {
          const data = response.data;
          setStatus('success');
          setMessage(data.detail || 'Email confirmado exitosamente');
          
          // Redirigir al login después de 3 segundos
          setTimeout(() => {
            navigate('/login', {
              state: {
                message: 'Tu email ha sido verificado. Ya puedes iniciar sesión.',
                email: data.email
              }
            });
          }, 3000);
        } else {
          const errorData = response.data;
          setStatus('error');
          setMessage(errorData.detail || 'Error al confirmar el email');
        }
      } catch (error) {
        console.error('Error confirmando email:', error);
        setStatus('error');
        setMessage('Error de conexión. Por favor, intenta más tarde.');
      }
    };

    confirmEmail();
  }, [key, navigate]);

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleRequestNewEmail = () => {
    navigate('/email-verification', {
      state: {
        message: 'Solicita un nuevo email de verificación'
      }
    });
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Card sx={{ textAlign: 'center', p: 3 }}>
          <CardContent>
            <Stack spacing={3} alignItems="center">
              {/* Icono según el estado */}
              {status === 'loading' && (
                <Box>
                  <CircularProgress size={60} />
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    Verificando tu email...
                  </Typography>
                </Box>
              )}

              {status === 'success' && (
                <>
                  <CheckCircle 
                    sx={{ 
                      fontSize: 80, 
                      color: 'success.main' 
                    }} 
                  />
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    ¡Email Verificado!
                  </Typography>
                  <Alert severity="success">
                    {message}
                  </Alert>
                  <Typography variant="body1" color="text.secondary">
                    Serás redirigido al login en unos segundos...
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleGoToLogin}
                    size="large"
                  >
                    Ir al Login Ahora
                  </Button>
                </>
              )}

              {status === 'error' && (
                <>
                  <Error 
                    sx={{ 
                      fontSize: 80, 
                      color: 'error.main' 
                    }} 
                  />
                  <Typography variant="h4" color="error.main" fontWeight="bold">
                    Error de Verificación
                  </Typography>
                  <Alert severity="error">
                    {message}
                  </Alert>
                  
                  <Stack spacing={2} sx={{ mt: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Posibles causas:
                    </Typography>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body2" component="li">
                        El enlace ha expirado (válido por 24 horas)
                      </Typography>
                      <Typography variant="body2" component="li">
                        El enlace ya fue utilizado
                      </Typography>
                      <Typography variant="body2" component="li">
                        El enlace está dañado o incompleto
                      </Typography>
                    </Box>
                    
                    <Stack direction="row" spacing={2} justifyContent="center">
                      <Button
                        variant="outlined"
                        onClick={handleRequestNewEmail}
                        startIcon={<Email />}
                      >
                        Solicitar Nuevo Email
                      </Button>
                      <Button
                        variant="text"
                        onClick={handleGoToLogin}
                      >
                        Ir al Login
                      </Button>
                    </Stack>
                  </Stack>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Box sx={{ mt: 3 }}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>¿Necesitas ayuda?</strong><br />
              Si sigues teniendo problemas, contacta nuestro soporte técnico.
            </Typography>
          </Alert>
        </Box>
      </Box>
    </Container>
  );
};

export default ConfirmEmail;