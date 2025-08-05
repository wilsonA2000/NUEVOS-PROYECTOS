import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Button,
  Paper,
  Alert,
} from '@mui/material';
import {
  CheckCircleOutline as CheckIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';
import { api } from '../services/api';

const ConfirmEmail: React.FC = () => {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const confirmEmail = async () => {
      if (!key) {
        setError('No se proporcionó una clave de confirmación');
        setLoading(false);
        return;
      }

      try {
        // Llamar al endpoint de confirmación
        const response = await api.post(`/auth/confirm-email/${key}/`);
        
        if (response.status === 200) {
          setSuccess(true);
        }
      } catch (err: any) {
        console.error('Error confirmando email:', err);
        if (err.response?.status === 404) {
          setError('El enlace de confirmación es inválido o ha expirado');
        } else if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError('Error al confirmar el email. Por favor, intenta de nuevo.');
        }
      } finally {
        setLoading(false);
      }
    };

    confirmEmail();
  }, [key]);

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleResendEmail = () => {
    navigate('/resend-confirmation');
  };

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
        >
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Confirmando tu email...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%', textAlign: 'center' }}>
          {success ? (
            <>
              <CheckIcon
                sx={{
                  fontSize: 80,
                  color: 'success.main',
                  mb: 2,
                }}
              />
              <Typography variant="h4" gutterBottom>
                ¡Email Confirmado!
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Tu cuenta ha sido verificada exitosamente. Ya puedes iniciar sesión
                en VeriHome.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                onClick={handleGoToLogin}
                sx={{ mb: 2 }}
              >
                Ir a Iniciar Sesión
              </Button>
            </>
          ) : (
            <>
              <ErrorIcon
                sx={{
                  fontSize: 80,
                  color: 'error.main',
                  mb: 2,
                }}
              />
              <Typography variant="h4" gutterBottom>
                Error al Confirmar
              </Typography>
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
              <Typography variant="body2" sx={{ mb: 3 }}>
                Si el enlace ha expirado, puedes solicitar uno nuevo.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleResendEmail}
                sx={{ mb: 2 }}
              >
                Reenviar Email de Confirmación
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={handleGoToLogin}
              >
                Ir a Iniciar Sesión
              </Button>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ConfirmEmail;