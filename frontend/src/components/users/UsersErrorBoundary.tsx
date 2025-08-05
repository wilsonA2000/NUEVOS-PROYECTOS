/**
 * UsersErrorBoundary - Specialized error boundary for Users module
 * Handles authentication and user profile related errors
 */

import React, { ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Paper,
} from '@mui/material';
import {
  AccountCircle as ProfileIcon,
  Refresh as RefreshIcon,
  Login as LoginIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ErrorBoundary from '../common/ErrorBoundary';

interface UsersErrorBoundaryProps {
  children: ReactNode;
}

const UsersFallback: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleGoToProfile = () => {
    navigate('/app/profile');
  };

  const handleGoToDashboard = () => {
    navigate('/app/dashboard');
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const handleLogoutAndRetry = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Error en el módulo de Usuarios
        </Alert>

        <Typography variant="h5" gutterBottom>
          Problema con la información del usuario
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Ha ocurrido un error al cargar la información del usuario. 
          Esto puede deberse a un problema de autenticación o del servidor.
        </Typography>

        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleRetry}
          >
            Reintentar
          </Button>

          {isAuthenticated ? (
            <>
              <Button
                variant="outlined"
                startIcon={<ProfileIcon />}
                onClick={handleGoToProfile}
              >
                Mi Perfil
              </Button>

              <Button
                variant="text"
                startIcon={<HomeIcon />}
                onClick={handleGoToDashboard}
              >
                Dashboard
              </Button>

              <Button
                variant="text"
                color="error"
                onClick={handleLogoutAndRetry}
              >
                Cerrar Sesión
              </Button>
            </>
          ) : (
            <Button
              variant="outlined"
              startIcon={<LoginIcon />}
              onClick={handleGoToLogin}
            >
              Iniciar Sesión
            </Button>
          )}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Si el problema persiste, verifica tu conexión o contacta soporte
        </Typography>
      </Paper>
    </Box>
  );
};

const UsersErrorBoundary: React.FC<UsersErrorBoundaryProps> = ({ children }) => {
  return (
    <ErrorBoundary
      module="Users"
      fallback={<UsersFallback />}
      onError={(error, errorInfo) => {
        // Users-specific error logging
        console.error('Users Module Error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          module: 'Users',
          url: window.location.href,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default UsersErrorBoundary;