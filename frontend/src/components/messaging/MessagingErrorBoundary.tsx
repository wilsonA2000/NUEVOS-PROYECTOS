/**
 * MessagingErrorBoundary - Specialized error boundary for Messaging module
 * Handles chat, notifications and communication errors
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
  Message as MessageIcon,
  Refresh as RefreshIcon,
  Inbox as InboxIcon,
  Home as HomeIcon,
  NotificationImportant as NotificationIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ErrorBoundary from '../common/ErrorBoundary';

interface MessagingErrorBoundaryProps {
  children: ReactNode;
}

const MessagingFallback: React.FC = () => {
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    navigate('/app/dashboard');
  };

  const handleGoToMessages = () => {
    navigate('/app/messages');
  };

  const handleGoToNotifications = () => {
    navigate('/app/notifications');
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const handleRefreshConnection = () => {
    // Clear any cached message data and reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
    }
    localStorage.removeItem('messageCache');
    sessionStorage.removeItem('messageThreads');
    window.location.reload();
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Error en el sistema de Mensajería
        </Alert>

        <Typography variant="h5" gutterBottom>
          Problema con la comunicación
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Ha ocurrido un error en el sistema de mensajería. 
          Los mensajes pueden no estar actualizados.
        </Typography>

        <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
          <Typography variant="body2">
            <strong>Nota:</strong> Tus mensajes están guardados de forma segura. 
            Este error no afecta tu historial de conversaciones.
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
            startIcon={<MessageIcon />}
            onClick={handleGoToMessages}
          >
            Ver Mensajes
          </Button>

          <Button
            variant="outlined"
            startIcon={<NotificationIcon />}
            onClick={handleGoToNotifications}
          >
            Notificaciones
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
            color="warning"
            onClick={handleRefreshConnection}
          >
            Reconectar
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Si no puedes enviar mensajes, verifica tu conexión a internet
        </Typography>
      </Paper>
    </Box>
  );
};

const MessagingErrorBoundary: React.FC<MessagingErrorBoundaryProps> = ({ children }) => {
  return (
    <ErrorBoundary
      module="Messaging"
      fallback={<MessagingFallback />}
      onError={(error, errorInfo) => {
        // Messaging-specific error logging
        console.error('Messaging Module Error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          module: 'Messaging',
          url: window.location.href,
          connectionStatus: navigator.onLine ? 'online' : 'offline',
        });

        // Check WebSocket connection status if available
        const wsStatus = (window as any).messageWebSocket?.readyState;
        if (wsStatus !== undefined) {
          console.error('WebSocket Status:', {
            readyState: wsStatus,
            states: {
              0: 'CONNECTING',
              1: 'OPEN', 
              2: 'CLOSING',
              3: 'CLOSED'
            }
          });
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default MessagingErrorBoundary;