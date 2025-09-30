import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  Divider,
  Chip,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  Description as ContractIcon,
  BugReport as BugIcon,
  ContactSupport as SupportIcon,
} from '@mui/icons-material';

interface ContractsErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ContractsErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

class ContractsErrorBoundary extends Component<ContractsErrorBoundaryProps, ContractsErrorBoundaryState> {
  constructor(props: ContractsErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ContractsErrorBoundaryState> {
    // Generar ID único para el error
    const errorId = `contracts-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ContractsErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Llamar callback personalizado si existe
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Logging para producción (integrar con servicio de logging)
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Aquí integrarías con servicios como Sentry, LogRocket, etc.
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      module: 'contracts',
      errorId: this.state.errorId,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Ejemplo de integración con API de logging
    try {
      fetch('/api/v1/core/log-error/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      }).catch(() => {
        // Fallar silenciosamente si no se puede enviar el log
      });
    } catch {
      // Fallar silenciosamente
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportBug = () => {
    const subject = encodeURIComponent(`Error en Módulo de Contratos - ${this.state.errorId}`);
    const body = encodeURIComponent(`
Descripción del error:
${this.state.error?.message || 'Error desconocido'}

ID del error: ${this.state.errorId}
Fecha: ${new Date().toLocaleString('es-ES')}
URL: ${window.location.href}

Por favor describe qué estabas haciendo cuando ocurrió el error:
[Describe aquí las acciones que realizaste]
    `);
    
    window.open(`mailto:soporte@verihome.com?subject=${subject}&body=${body}`);
  };

  private getErrorCategory = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Conectividad';
    }
    if (message.includes('contract') || message.includes('signature')) {
      return 'Contrato';
    }
    if (message.includes('pdf') || message.includes('document')) {
      return 'Documento';
    }
    if (message.includes('validation') || message.includes('required')) {
      return 'Validación';
    }
    if (message.includes('permission') || message.includes('auth')) {
      return 'Autorización';
    }
    
    return 'Sistema';
  };

  private getErrorSeverity = (error: Error): 'error' | 'warning' => {
    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) {
      return 'error';
    }
    if (message.includes('validation') || message.includes('required')) {
      return 'warning';
    }
    
    return 'error';
  };

  private getUserFriendlyMessage = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Error de conectividad. Verifica tu conexión a internet y vuelve a intentar.';
    }
    if (message.includes('contract')) {
      return 'Error al procesar el contrato. Los datos pueden estar incompletos o en formato incorrecto.';
    }
    if (message.includes('signature')) {
      return 'Error con la firma digital. Asegúrate de que tu dispositivo soporte la funcionalidad de firma.';
    }
    if (message.includes('pdf')) {
      return 'Error al generar o mostrar el documento PDF. Verifica que tu navegador soporte documentos PDF.';
    }
    if (message.includes('validation')) {
      return 'Error de validación. Algunos campos requeridos pueden estar vacíos o contener datos inválidos.';
    }
    if (message.includes('permission') || message.includes('auth')) {
      return 'No tienes permisos suficientes para realizar esta acción. Contacta al administrador.';
    }
    
    return 'Ha ocurrido un error inesperado en el módulo de contratos. Nuestro equipo ha sido notificado.';
  };

  render() {
    if (this.state.hasError) {
      // Si hay un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const error = this.state.error!;
      const errorCategory = this.getErrorCategory(error);
      const errorSeverity = this.getErrorSeverity(error);
      const userFriendlyMessage = this.getUserFriendlyMessage(error);

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            p: 4,
            textAlign: 'center',
          }}
        >
          <Card
            elevation={0}
            sx={{
              maxWidth: 600,
              width: '100%',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius-lg)',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              {/* Error Icon */}
              <Box sx={{ mb: 3 }}>
                <ErrorIcon
                  sx={{
                    fontSize: 64,
                    color: errorSeverity === 'error' ? 'var(--color-error)' : 'var(--color-warning)',
                    mb: 2,
                  }}
                />
                <ContractIcon
                  sx={{
                    fontSize: 32,
                    color: 'var(--color-text-secondary)',
                    ml: 1,
                  }}
                />
              </Box>

              {/* Error Title */}
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                Error en Módulo de Contratos
              </Typography>

              {/* Error Category */}
              <Box sx={{ mb: 3 }}>
                <Chip
                  label={errorCategory}
                  size="small"
                  sx={{
                    backgroundColor: errorSeverity === 'error' ? 'var(--color-error-light)' : 'var(--color-warning-light)',
                    color: errorSeverity === 'error' ? 'var(--color-error-dark)' : 'var(--color-warning-dark)',
                    fontWeight: 500,
                  }}
                />
              </Box>

              {/* User-friendly message */}
              <Alert
                severity={errorSeverity}
                sx={{
                  mb: 3,
                  textAlign: 'left',
                  '& .MuiAlert-message': {
                    width: '100%',
                  },
                }}
              >
                <Typography variant="body2">
                  {userFriendlyMessage}
                </Typography>
              </Alert>

              {/* Error ID */}
              <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 3 }}>
                ID del error: <code>{this.state.errorId}</code>
              </Typography>

              {/* Technical details (solo si showDetails está habilitado) */}
              {this.props.showDetails && process.env.NODE_ENV === 'development' && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box sx={{ textAlign: 'left', mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Detalles Técnicos:
                    </Typography>
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{
                        backgroundColor: 'var(--color-background)',
                        p: 2,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        overflow: 'auto',
                        maxHeight: 200,
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {error.message}
                      {error.stack && `\n\nStack trace:\n${error.stack}`}
                    </Typography>
                  </Box>
                </>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleRetry}
                  sx={{
                    backgroundColor: 'var(--color-primary)',
                    '&:hover': {
                      backgroundColor: 'var(--color-primary-dark)',
                    },
                  }}
                >
                  Reintentar
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<HomeIcon />}
                  onClick={this.handleGoHome}
                  sx={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    '&:hover': {
                      borderColor: 'var(--color-primary)',
                    },
                  }}
                >
                  Ir al Inicio
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<BugIcon />}
                  onClick={this.handleReportBug}
                  sx={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    '&:hover': {
                      borderColor: 'var(--color-warning)',
                      color: 'var(--color-warning)',
                    },
                  }}
                >
                  Reportar Error
                </Button>
              </Box>

              {/* Support info */}
              <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid var(--color-border)' }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 1 }}>
                  Si el problema persiste, contacta nuestro soporte:
                </Typography>
                <Button
                  variant="text"
                  startIcon={<SupportIcon />}
                  href="mailto:soporte@verihome.com"
                  sx={{
                    color: 'var(--color-primary)',
                    textTransform: 'none',
                  }}
                >
                  soporte@verihome.com
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ContractsErrorBoundary;