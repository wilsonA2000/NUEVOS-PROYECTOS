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
  Rating,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  Star as StarIcon,
  Feedback as FeedbackIcon,
  ContactSupport as SupportIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface RatingsErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface RatingsErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

class RatingsErrorBoundary extends Component<RatingsErrorBoundaryProps, RatingsErrorBoundaryState> {
  constructor(props: RatingsErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<RatingsErrorBoundaryState> {
    const errorId = `ratings-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RatingsErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      module: 'ratings',
      errorId: this.state.errorId,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    try {
      fetch('/api/v1/core/log-error/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      }).catch(() => {
        // Fallar silenciosamente
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

  private handleReportIssue = () => {
    const subject = encodeURIComponent(`Error en Sistema de Calificaciones - ${this.state.errorId}`);
    const body = encodeURIComponent(`
Error en el módulo de calificaciones:

ID del error: ${this.state.errorId}
Descripción: ${this.state.error?.message || 'Error desconocido'}
Fecha: ${new Date().toLocaleString('es-ES')}
URL: ${window.location.href}

¿Qué estabas haciendo cuando ocurrió el error?
- [ ] Enviando una calificación
- [ ] Viendo calificaciones recibidas
- [ ] Editando una calificación
- [ ] Navegando el historial de calificaciones
- [ ] Otro: ________________

Descripción detallada del problema:
[Describe aquí exactamente qué estabas haciendo]

¿Este error afecta una transacción importante?
[ ] Sí - Es urgente
[ ] No - Puedo esperar
    `);
    
    window.open(`mailto:soporte@verihome.com?subject=${subject}&body=${body}`);
  };

  private getErrorCategory = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('rating') || message.includes('calificación')) {
      return 'Calificación';
    }
    if (message.includes('review') || message.includes('comentario')) {
      return 'Comentario';
    }
    if (message.includes('score') || message.includes('puntaje')) {
      return 'Puntuación';
    }
    if (message.includes('validation') || message.includes('required')) {
      return 'Validación';
    }
    if (message.includes('permission') || message.includes('auth')) {
      return 'Permisos';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Conectividad';
    }
    if (message.includes('duplicate') || message.includes('already')) {
      return 'Duplicado';
    }
    
    return 'Sistema';
  };

  private getErrorSeverity = (error: Error): 'error' | 'warning' | 'info' => {
    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) {
      return 'error';
    }
    if (message.includes('validation') || message.includes('duplicate')) {
      return 'warning';
    }
    if (message.includes('permission') || message.includes('not found')) {
      return 'info';
    }
    
    return 'error';
  };

  private getUserFriendlyMessage = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('rating') && message.includes('required')) {
      return 'La calificación es requerida. Por favor selecciona un número de estrellas antes de enviar.';
    }
    if (message.includes('duplicate') || message.includes('already rated')) {
      return 'Ya has calificado a este usuario. Solo puedes enviar una calificación por transacción.';
    }
    if (message.includes('permission') || message.includes('not authorized')) {
      return 'No tienes permisos para calificar a este usuario. Solo puedes calificar después de completar una transacción.';
    }
    if (message.includes('rating') && message.includes('range')) {
      return 'La calificación debe estar entre 1 y 10 estrellas. Por favor selecciona un valor válido.';
    }
    if (message.includes('comment') && message.includes('length')) {
      return 'El comentario es demasiado largo. Por favor reduce el texto a máximo 1000 caracteres.';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Error de conectividad. Verifica tu conexión a internet y vuelve a intentar enviar la calificación.';
    }
    if (message.includes('not found') || message.includes('deleted')) {
      return 'El usuario o transacción ya no existe. Es posible que haya sido eliminado del sistema.';
    }
    if (message.includes('expired') || message.includes('too late')) {
      return 'El período para calificar ha expirado. Solo puedes enviar calificaciones dentro de los 30 días posteriores a la transacción.';
    }
    
    return 'Ha ocurrido un error inesperado con el sistema de calificaciones. Inténtalo nuevamente en unos momentos.';
  };

  private getHelpfulTips = (error: Error): string[] => {
    const message = error.message.toLowerCase();
    const tips: string[] = [];
    
    if (message.includes('rating') || message.includes('calificación')) {
      tips.push('Asegúrate de seleccionar un número de estrellas antes de enviar');
      tips.push('Las calificaciones van de 1 a 10 estrellas');
    }
    
    if (message.includes('comment') || message.includes('comentario')) {
      tips.push('Los comentarios son opcionales pero muy útiles');
      tips.push('Máximo 1000 caracteres para el comentario');
    }
    
    if (message.includes('permission')) {
      tips.push('Solo puedes calificar después de completar una transacción');
      tips.push('Cada transacción permite una sola calificación mutua');
    }
    
    if (message.includes('network')) {
      tips.push('Verifica tu conexión a internet');
      tips.push('Las calificaciones se guardan automáticamente cuando hay conexión');
    }
    
    // Tips generales si no hay específicos
    if (tips.length === 0) {
      tips.push('Recarga la página e intenta nuevamente');
      tips.push('Las calificaciones son importantes para la confianza en la plataforma');
    }
    
    return tips;
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const error = this.state.error!;
      const errorCategory = this.getErrorCategory(error);
      const errorSeverity = this.getErrorSeverity(error);
      const userFriendlyMessage = this.getUserFriendlyMessage(error);
      const helpfulTips = this.getHelpfulTips(error);

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
              {/* Error Icon with Stars */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <ErrorIcon
                    sx={{
                      fontSize: 64,
                      color: errorSeverity === 'error' ? 'var(--color-error)' : 
                             errorSeverity === 'warning' ? 'var(--color-warning)' : 'var(--color-info)',
                      mb: 2,
                    }}
                  />
                  <StarIcon
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: -8,
                      fontSize: 24,
                      color: 'var(--color-text-secondary)',
                    }}
                  />
                </Box>
              </Box>

              {/* Error Title */}
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                Error en Sistema de Calificaciones
              </Typography>

              {/* Error Category */}
              <Box sx={{ mb: 3 }}>
                <Chip
                  label={errorCategory}
                  size="small"
                  sx={{
                    backgroundColor: errorSeverity === 'error' ? 'var(--color-error-light)' : 
                                    errorSeverity === 'warning' ? 'var(--color-warning-light)' : 'var(--color-info-light)',
                    color: errorSeverity === 'error' ? 'var(--color-error-dark)' : 
                           errorSeverity === 'warning' ? 'var(--color-warning-dark)' : 'var(--color-info-dark)',
                    fontWeight: 500,
                  }}
                />
              </Box>

              {/* User-friendly message */}
              <Alert
                severity={errorSeverity}
                icon={<WarningIcon />}
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

              {/* Helpful Tips */}
              {helpfulTips.length > 0 && (
                <Box
                  sx={{
                    backgroundColor: 'var(--color-background)',
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid var(--color-border)',
                    mb: 3,
                    textAlign: 'left',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FeedbackIcon fontSize="small" />
                    Consejos Útiles:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    {helpfulTips.map((tip, index) => (
                      <Typography
                        key={index}
                        variant="body2"
                        component="li"
                        sx={{ color: 'var(--color-text-secondary)', mb: 0.5 }}
                      >
                        {tip}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Rating System Info */}
              <Box
                sx={{
                  backgroundColor: 'var(--color-background)',
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid var(--color-border)',
                  mb: 3,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>
                  Sistema de Calificaciones VeriHome
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <Rating
                    value={5}
                    readOnly
                    max={10}
                    sx={{
                      '& .MuiRating-iconFilled': {
                        color: '#f59e0b',
                      },
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', textAlign: 'center', fontSize: '0.875rem' }}>
                  Las calificaciones van de 1 a 10 estrellas y son fundamentales para<br />
                  construir confianza entre usuarios de VeriHome
                </Typography>
              </Box>

              {/* Error ID */}
              <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 3 }}>
                ID del error: <code>{this.state.errorId}</code>
              </Typography>

              {/* Technical details */}
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
                  startIcon={<FeedbackIcon />}
                  onClick={this.handleReportIssue}
                  sx={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    '&:hover': {
                      borderColor: 'var(--color-warning)',
                      color: 'var(--color-warning)',
                    },
                  }}
                >
                  Reportar Problema
                </Button>
              </Box>

              {/* Support info */}
              <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid var(--color-border)' }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 1 }}>
                  ¿Problemas con calificaciones? Estamos aquí para ayudar:
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

export default RatingsErrorBoundary;