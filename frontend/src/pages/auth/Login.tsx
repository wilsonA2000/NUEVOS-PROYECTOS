import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  Divider,
} from '@mui/material';
import {
  Email as EmailIcon,
  Warning as WarningIcon,
  Security as SecurityIcon,
  PersonAdd as PersonAddIcon,
  VpnKey as VpnKeyIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoginDto } from '../../types/user';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState<LoginDto>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [errorType, setErrorType] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Mostrar mensaje de éxito si viene del registro
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Limpiar el estado para que no se muestre en futuras navegaciones
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpiar errores al cambiar el input
    setError('');
    setErrorType('');
    setShowErrorDialog(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorType('');
    setSuccessMessage('');
    setShowErrorDialog(false);

    try {
      await login.mutateAsync(formData);
      // La redirección se maneja en el useEffect cuando isAuthenticated cambia
    } catch (err: any) {
      console.error('Error en login:', err);
      
      // El error ya viene procesado desde el servicio
      if (err instanceof Error) {
        setError(err.message);
        
        // Detectar tipo de error para mostrar acciones específicas
        if (err.message.includes('No existe una cuenta')) {
          setErrorType('user_not_found');
          setUserEmail(formData.email);
        } else if (err.message.includes('contraseña es incorrecta')) {
          setErrorType('invalid_password');
          setUserEmail(formData.email);
        } else if (err.message.includes('no ha sido verificada')) {
          setErrorType('email_not_verified');
          setUserEmail(formData.email);
        } else if (err.message.includes('desactivada')) {
          setErrorType('account_disabled');
          setUserEmail(formData.email);
        } else if (err.message.includes('conexión')) {
          setErrorType('connection_error');
        }
        
        setShowErrorDialog(true);
      }
    }
  };

  const handleCloseErrorDialog = () => {
    setShowErrorDialog(false);
  };

  const getErrorIcon = () => {
    switch (errorType) {
      case 'user_not_found':
        return <PersonAddIcon color="warning" />;
      case 'invalid_password':
        return <VpnKeyIcon color="error" />;
      case 'email_not_verified':
        return <EmailIcon color="info" />;
      case 'account_disabled':
        return <SecurityIcon color="error" />;
      case 'connection_error':
        return <WarningIcon color="warning" />;
      default:
        return <WarningIcon color="error" />;
    }
  };

  const getErrorActions = () => {
    switch (errorType) {
      case 'user_not_found':
        return (
          <>
            <Button onClick={handleCloseErrorDialog}>Cerrar</Button>
            <Button 
              component={RouterLink} 
              to="/register" 
              variant="contained" 
              color="primary"
              startIcon={<PersonAddIcon />}
            >
              Registrarse
            </Button>
          </>
        );
      
      case 'invalid_password':
        return (
          <>
            <Button onClick={handleCloseErrorDialog}>Cerrar</Button>
            <Button 
              component={RouterLink} 
              to="/forgot-password" 
              variant="contained" 
              color="primary"
              startIcon={<VpnKeyIcon />}
            >
              Recuperar Contraseña
            </Button>
          </>
        );
      
      case 'email_not_verified':
        return (
          <>
            <Button onClick={handleCloseErrorDialog}>Cerrar</Button>
            <Button 
              component={RouterLink} 
              to="/resend-verification" 
              variant="contained" 
              color="info"
              startIcon={<EmailIcon />}
            >
              Reenviar Email
            </Button>
          </>
        );
      
      case 'account_disabled':
        return (
          <>
            <Button onClick={handleCloseErrorDialog}>Cerrar</Button>
            <Button 
              onClick={() => window.location.href = 'mailto:soporte@verihome.com'}
              variant="contained" 
              color="warning"
            >
              Contactar Soporte
            </Button>
          </>
        );
      
      default:
        return (
          <Button onClick={handleCloseErrorDialog} variant="contained">
            Cerrar
          </Button>
        );
    }
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
          backgroundImage: 'url(/staticfiles/images/hero-property-1.jpg)', // Cambia la ruta si lo deseas
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.45,
          filter: 'blur(1px)',
        }}
      />
      {/* Cuadro de login */}
      <Card sx={{ maxWidth: 400, width: '100%', zIndex: 1, boxShadow: 6, backdropFilter: 'blur(0.5px)' }}>
        <CardContent>
          <Typography variant="h4" align="center" gutterBottom>
            Iniciar Sesión
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Ingresa tus credenciales para acceder a tu cuenta
          </Typography>

          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
              error={!!error}
              autoComplete="email"
              autoFocus
            />

            <TextField
              fullWidth
              label="Contraseña"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              error={!!error}
              autoComplete="current-password"
            />

            {error && !showErrorDialog && (
              <Alert 
                severity="error" 
                sx={{ mt: 2, whiteSpace: 'pre-line' }}
                action={
                  errorType === 'email_not_verified' ? (
                    <Button 
                      color="inherit" 
                      size="small"
                      component={RouterLink}
                      to="/resend-verification"
                      startIcon={<EmailIcon />}
                    >
                      Reenviar Email
                    </Button>
                  ) : errorType === 'user_not_found' ? (
                    <Button 
                      color="inherit" 
                      size="small"
                      component={RouterLink}
                      to="/register"
                      startIcon={<PersonAddIcon />}
                    >
                      Registrarse
                    </Button>
                  ) : errorType === 'invalid_password' ? (
                    <Button 
                      color="inherit" 
                      size="small"
                      component={RouterLink}
                      to="/forgot-password"
                      startIcon={<VpnKeyIcon />}
                    >
                      Recuperar
                    </Button>
                  ) : null
                }
              >
                {error.split('\n')[0]} {/* Solo mostrar la primera línea en el alert pequeño */}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{ mt: 3 }}
              disabled={login.isPending}
            >
              {login.isPending ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </Box>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link
                component={RouterLink}
                to="/register"
                variant="body2"
              >
                ¿No tienes una cuenta? Regístrate
              </Link>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* Modal de Error Detallado */}
      <Dialog 
        open={showErrorDialog} 
        onClose={handleCloseErrorDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getErrorIcon()}
          <Typography variant="h6">
            Error de Inicio de Sesión
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          <DialogContentText sx={{ whiteSpace: 'pre-line', mb: 2 }}>
            {error}
          </DialogContentText>
          
          {userEmail && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Email ingresado:
                </Typography>
                <Chip 
                  label={userEmail} 
                  size="small" 
                  variant="outlined"
                  icon={<EmailIcon />}
                />
              </Box>
            </>
          )}
          
          {errorType === 'email_not_verified' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                📝 <strong>Revisa estas carpetas:</strong><br/>
                • Bandeja de entrada<br/>
                • Correo no deseado (Spam)<br/>
                • Promociones<br/>
                • Actualizaciones
              </Typography>
            </Alert>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1 }}>
          {getErrorActions()}
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 