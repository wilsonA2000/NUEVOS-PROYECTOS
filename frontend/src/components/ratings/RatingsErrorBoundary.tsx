/**
 * RatingsErrorBoundary - Specialized error boundary for Ratings module
 * Handles rating system and feedback related errors
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
  Star as RatingIcon,
  Refresh as RefreshIcon,
  Reviews as ReviewIcon,
  Home as HomeIcon,
  Feedback as FeedbackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ErrorBoundary from '../common/ErrorBoundary';

interface RatingsErrorBoundaryProps {
  children: ReactNode;
}

const RatingsFallback: React.FC = () => {
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    navigate('/app/dashboard');
  };

  const handleGoToRatings = () => {
    navigate('/app/ratings');
  };

  const handleGoToProfile = () => {
    navigate('/app/profile');
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Error en el sistema de Calificaciones
        </Alert>

        <Typography variant="h5" gutterBottom>
          Problema con las calificaciones
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Ha ocurrido un error al cargar las calificaciones y reseñas. 
          Tu historial de valoraciones está seguro.
        </Typography>

        <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
          <Typography variant="body2">
            <strong>Nota:</strong> Las calificaciones existentes no se han perdido. 
            Este es un error temporal de visualización.
          </Typography>
        </Alert>

        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleRetry}
          >
            Reintentar
          </Button>

          <Button
            variant="outlined"
            startIcon={<RatingIcon />}
            onClick={handleGoToRatings}
          >
            Ver Calificaciones
          </Button>

          <Button
            variant="outlined"
            startIcon={<ReviewIcon />}
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
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Las calificaciones son importantes para la confianza en la plataforma
        </Typography>
      </Paper>
    </Box>
  );
};

const RatingsErrorBoundary: React.FC<RatingsErrorBoundaryProps> = ({ children }) => {
  return (
    <ErrorBoundary
      module="Ratings"
      fallback={<RatingsFallback />}
      onError={(error, errorInfo) => {
        // Ratings-specific error logging
        console.error('Ratings Module Error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          module: 'Ratings',
          url: window.location.href,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default RatingsErrorBoundary;