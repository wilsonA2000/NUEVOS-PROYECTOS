import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  AlertTitle,
  Container,
} from '@mui/material';
import { Refresh as RefreshIcon, Home as HomeIcon } from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Aquí podrías enviar el error a un servicio de monitoreo
    // como Sentry, LogRocket, etc.
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Si hay un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback por defecto
      return (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle>Error Inesperado</AlertTitle>
              Ha ocurrido un error inesperado en la aplicación.
            </Alert>

            <Typography variant="h5" gutterBottom>
              Algo salió mal
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Lo sentimos, ha ocurrido un error inesperado. Por favor, intenta recargar la página o regresa al inicio.
            </Typography>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="h6" gutterBottom>
                  Detalles del Error (Solo en desarrollo):
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" component="pre" sx={{ 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    fontSize: '0.75rem'
                  }}>
                    {this.state.error.toString()}
                  </Typography>
                  {this.state.errorInfo && (
                    <Typography variant="body2" component="pre" sx={{ 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-word',
                      fontSize: '0.75rem',
                      mt: 1
                    }}>
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  )}
                </Paper>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRefresh}
              >
                Recargar Página
              </Button>
              <Button
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={this.handleGoHome}
              >
                Ir al Inicio
              </Button>
            </Box>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

const ErrorDisplay: React.FC<{ error: Error | null }> = ({ error }) => {
  const { t } = useLanguage();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      p={3}
      textAlign="center"
    >
      <Typography variant="h4" gutterBottom>
        {t('common.error')}
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        {error?.message || t('common.unknownError')}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={() => window.location.reload()}
        sx={{ mt: 2 }}
      >
        {t('common.reload')}
      </Button>
    </Box>
  );
};

export default ErrorBoundary; 