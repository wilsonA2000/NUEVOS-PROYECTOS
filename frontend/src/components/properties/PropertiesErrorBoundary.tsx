/**
 * PropertiesErrorBoundary - Specialized error boundary for Properties module
 * Provides property-specific error handling and fallback UI
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
  Home as HomeIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ErrorBoundary from '../common/ErrorBoundary';

interface PropertiesErrorBoundaryProps {
  children: ReactNode;
}

const PropertiesFallback: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoToDashboard = () => {
    navigate('/app/dashboard');
  };

  const handleCreateProperty = () => {
    navigate('/app/properties/new');
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Error en el módulo de Propiedades
        </Alert>

        <Typography variant="h5" gutterBottom>
          No pudimos cargar las propiedades
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Ha ocurrido un problema al cargar la información de las propiedades. 
          Esto puede deberse a un problema temporal de conexión o del servidor.
        </Typography>

        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleRetry}
          >
            Reintentar
          </Button>

          {user?.user_type === 'landlord' && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleCreateProperty}
            >
              Crear Propiedad
            </Button>
          )}

          <Button
            variant="text"
            startIcon={<HomeIcon />}
            onClick={handleGoToDashboard}
          >
            Ir al Dashboard
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Si el problema persiste, contacta al soporte técnico
        </Typography>
      </Paper>
    </Box>
  );
};

const PropertiesErrorBoundary: React.FC<PropertiesErrorBoundaryProps> = ({ children }) => {
  return (
    <ErrorBoundary
      module="Properties"
      fallback={<PropertiesFallback />}
      onError={(error, errorInfo) => {
        // Properties-specific error logging
        console.error('Properties Module Error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          module: 'Properties',
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default PropertiesErrorBoundary;