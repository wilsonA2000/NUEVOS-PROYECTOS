import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';

export const ResendVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState<string>(location.state?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      await api.post('/users/auth/resend-confirmation/', { email });
      setMessage(`📧 Email de verificación reenviado exitosamente a ${email}.\n\n• Revisa tu bandeja de entrada\n• No olvides revisar la carpeta de spam\n• El enlace expira en 24 horas`);
    } catch (err: any) {
      console.error('Error reenviando verificación:', err);
      
      if (err.response?.status === 400) {
        setError('Email inválido o ya verificado. Verifica el email ingresado.');
      } else if (err.response?.status === 404) {
        setError(`No encontramos una cuenta con el email ${email}.\n\n¿Necesitas registrarte?`);
      } else if (err.response?.status === 429) {
        setError('Demasiados intentos. Espera un momento antes de solicitar otro email.');
      } else {
        setError('Error al reenviar el email. Intenta nuevamente más tarde.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError('');
    setMessage('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
        overflow: 'hidden',
      }}
    >
      {/* Fondo de imagen traslúcida */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          backgroundImage: 'url(/staticfiles/images/hero-property-1.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.45,
          filter: 'blur(1px)',
        }}
      />
      
      {/* Cuadro de reenvío */}
      <Card sx={{ maxWidth: 500, width: '100%', zIndex: 1, boxShadow: 6, backdropFilter: 'blur(0.5px)' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <EmailIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Typography variant="h4" align="center">
              Reenviar Verificación
            </Typography>
          </Box>
          
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Ingresa tu email para recibir un nuevo enlace de verificación
          </Typography>

          {message && (
            <Alert 
              severity="success" 
              sx={{ mb: 3, whiteSpace: 'pre-line' }}
              icon={<CheckCircleIcon />}
            >
              {message}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={handleChange}
              margin="normal"
              required
              error={!!error}
              autoComplete="email"
              autoFocus
              placeholder="usuario@ejemplo.com"
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading || !email.trim()}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <EmailIcon />}
            >
              {isLoading ? 'Enviando...' : 'Reenviar Email de Verificación'}
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
              <Button
                component={RouterLink}
                to="/login"
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                disabled={isLoading}
              >
                Volver al Login
              </Button>
              
              {message && (
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="contained"
                  color="success"
                >
                  Ir al Login
                </Button>
              )}
            </Box>
          </form>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              💡 <strong>Consejos:</strong><br/>
              • Revisa todas las carpetas de tu email<br/>
              • El email puede tardar unos minutos en llegar<br/>
              • Si no llega, verifica que el email sea correcto
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};