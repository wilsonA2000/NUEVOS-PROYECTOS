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
  Payment as PaymentIcon,
  Security as SecurityIcon,
  ContactSupport as SupportIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface PaymentsErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface PaymentsErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

class PaymentsErrorBoundary extends Component<PaymentsErrorBoundaryProps, PaymentsErrorBoundaryState> {
  constructor(props: PaymentsErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<PaymentsErrorBoundaryState> {
    const errorId = `payments-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
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
      module: 'payments',
      errorId: this.state.errorId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity: this.getErrorSeverity(error),
      category: this.getErrorCategory(error),
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

  private handleContactSupport = () => {
    const subject = encodeURIComponent(`Error Crítico en Pagos - ${this.state.errorId}`);
    const body = encodeURIComponent(`
ALERTA: Error en módulo de pagos

ID del error: ${this.state.errorId}
Descripción: ${this.state.error?.message || 'Error desconocido'}
Fecha: ${new Date().toLocaleString('es-ES')}
URL: ${window.location.href}

IMPORTANTE: Este error ocurrió durante una operación de pagos.
Por favor describe qué operación estabas realizando:
- [ ] Procesando un pago
- [ ] Consultando historial
- [ ] Configurando método de pago
- [ ] Otro: ________________

Descripción detallada:
[Describe aquí exactamente qué estabas haciendo]
    `);
    
    window.open(`mailto:pagos@verihome.com?subject=${subject}&body=${body}`);
  };

  private getErrorCategory = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('payment') || message.includes('pago')) {
      return 'Procesamiento';
    }
    if (message.includes('stripe') || message.includes('paypal')) {
      return 'Pasarela';
    }
    if (message.includes('card') || message.includes('tarjeta')) {
      return 'Método de Pago';
    }
    if (message.includes('security') || message.includes('fraud')) {
      return 'Seguridad';
    }
    if (message.includes('balance') || message.includes('insufficient')) {
      return 'Fondos';
    }
    if (message.includes('network') || message.includes('timeout')) {
      return 'Conectividad';
    }
    if (message.includes('validation') || message.includes('format')) {
      return 'Validación';
    }
    
    return 'Sistema';
  };

  private getErrorSeverity = (error: Error): 'critical' | 'high' | 'medium' | 'low' => {
    const message = error.message.toLowerCase();
    
    if (message.includes('payment failed') || message.includes('charge failed')) {
      return 'critical';
    }
    if (message.includes('security') || message.includes('fraud')) {
      return 'critical';
    }
    if (message.includes('network') || message.includes('timeout')) {
      return 'high';
    }
    if (message.includes('validation') || message.includes('format')) {
      return 'medium';
    }
    
    return 'high'; // Por defecto, errores de pagos son de alta severidad
  };

  private getUserFriendlyMessage = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('payment failed') || message.includes('charge failed')) {
      return 'El pago no pudo ser procesado. Por favor verifica los datos de tu tarjeta y vuelve a intentar.';
    }
    if (message.includes('stripe') || message.includes('paypal')) {
      return 'Error en la pasarela de pagos. El servicio puede estar temporalmente no disponible.';
    }
    if (message.includes('card') || message.includes('tarjeta')) {
      return 'Error con el método de pago. Verifica que la tarjeta sea válida y tenga fondos suficientes.';
    }
    if (message.includes('security') || message.includes('fraud')) {
      return 'Transacción bloqueada por seguridad. Contacta soporte para verificar tu cuenta.';
    }
    if (message.includes('insufficient') || message.includes('balance')) {
      return 'Fondos insuficientes. Verifica el saldo de tu cuenta o método de pago.';
    }
    if (message.includes('network') || message.includes('timeout')) {
      return 'Error de conectividad durante el pago. Verifica tu conexión y el estado de la transacción.';
    }
    if (message.includes('validation') || message.includes('format')) {
      return 'Error en la información proporcionada. Verifica que todos los datos sean correctos.';
    }
    
    return 'Error inesperado en el sistema de pagos. Por seguridad, la transacción ha sido suspendida.';
  };

  private getSecurityAlert = (error: Error): boolean => {
    const message = error.message.toLowerCase();
    return message.includes('security') || 
           message.includes('fraud') || 
           message.includes('blocked') ||
           message.includes('suspicious');
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
      const isSecurityIssue = this.getSecurityAlert(error);

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
            backgroundColor: 'var(--color-background)',
          }}
        >
          <Card
            elevation={0}
            sx={{
              maxWidth: 650,
              width: '100%',
              border: isSecurityIssue ? '2px solid var(--color-error)' : '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius-lg)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              {/* Security Warning Banner */}
              {isSecurityIssue && (
                <Alert
                  severity="error"
                  icon={<SecurityIcon />}
                  sx={{
                    mb: 3,
                    backgroundColor: 'var(--color-error-light)',
                    border: '1px solid var(--color-error)',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    ALERTA DE SEGURIDAD: Esta transacción ha sido bloqueada por medidas de seguridad.
                  </Typography>
                </Alert>
              )}

              {/* Error Icon */}
              <Box sx={{ mb: 3 }}>
                <ErrorIcon
                  sx={{
                    fontSize: 64,
                    color: errorSeverity === 'critical' ? 'var(--color-error)' : 'var(--color-warning)',
                    mb: 2,
                  }}
                />
                <PaymentIcon
                  sx={{
                    fontSize: 32,
                    color: 'var(--color-text-secondary)',
                    ml: 1,
                  }}
                />
              </Box>

              {/* Error Title */}
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                Error en Sistema de Pagos
              </Typography>

              {/* Error Details */}
              <Box sx={{ mb: 3, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Chip
                  label={errorCategory}
                  size="small"
                  sx={{
                    backgroundColor: errorSeverity === 'critical' ? 'var(--color-error-light)' : 'var(--color-warning-light)',
                    color: errorSeverity === 'critical' ? 'var(--color-error-dark)' : 'var(--color-warning-dark)',
                    fontWeight: 500,
                  }}
                />
                <Chip
                  label={errorSeverity.toUpperCase()}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: errorSeverity === 'critical' ? 'var(--color-error)' : 'var(--color-warning)',
                    color: errorSeverity === 'critical' ? 'var(--color-error)' : 'var(--color-warning)',
                    fontWeight: 600,
                  }}
                />
              </Box>

              {/* User-friendly message */}
              <Alert
                severity={errorSeverity === 'critical' ? 'error' : 'warning'}
                icon={isSecurityIssue ? <SecurityIcon /> : <WarningIcon />}
                sx={{
                  mb: 3,
                  textAlign: 'left',
                  '& .MuiAlert-message': {
                    width: '100%',
                  },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {userFriendlyMessage}
                </Typography>
                {isSecurityIssue && (
                  <Typography variant="body2" sx={{ mt: 1, fontSize: '0.875rem' }}>
                    Por tu seguridad, no se ha procesado ningún cargo. Contacta soporte inmediatamente.
                  </Typography>
                )}
              </Alert>

              {/* Payment Safety Notice */}
              <Box
                sx={{
                  p: 2,
                  backgroundColor: 'var(--color-background)',
                  borderRadius: 1,
                  border: '1px solid var(--color-border)',
                  mb: 3,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  🔒 Garantía de Seguridad VeriHome
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                  • Nunca almacenamos información completa de tarjetas<br />
                  • Todas las transacciones están cifradas<br />
                  • Tu dinero está protegido por nuestros socios bancarios
                </Typography>
              </Box>

              {/* Error ID */}
              <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 3 }}>
                ID del error: <code style={{ backgroundColor: 'var(--color-background)', padding: '2px 6px', borderRadius: '4px' }}>
                  {this.state.errorId}
                </code>
              </Typography>

              {/* Technical details */}
              {this.props.showDetails && process.env.NODE_ENV === 'development' && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box sx={{ textAlign: 'left', mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Información Técnica:
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
                {!isSecurityIssue && (
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
                    Reintentar Pago
                  </Button>
                )}

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
                  variant="contained"
                  startIcon={<SupportIcon />}
                  onClick={this.handleContactSupport}
                  sx={{
                    backgroundColor: 'var(--color-error)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'var(--color-error-dark)',
                    },
                  }}
                >
                  Contactar Soporte
                </Button>
              </Box>

              {/* Emergency Contact */}
              <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid var(--color-border)' }}>
                <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 2 }}>
                  <strong>Soporte de Pagos 24/7:</strong>
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="text"
                    href="mailto:pagos@verihome.com"
                    sx={{ color: 'var(--color-primary)', textTransform: 'none' }}
                  >
                    📧 pagos@verihome.com
                  </Button>
                  <Button
                    variant="text"
                    href="tel:+573001234567"
                    sx={{ color: 'var(--color-primary)', textTransform: 'none' }}
                  >
                    📞 +57 300 123 4567
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default PaymentsErrorBoundary;