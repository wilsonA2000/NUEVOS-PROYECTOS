/**
 * PaymentsErrorBoundary - Specialized error boundary for Payments module
 * Handles payment processing and financial data errors
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
  Payment as PaymentIcon,
  Refresh as RefreshIcon,
  AccountBalance as BankIcon,
  Home as HomeIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ErrorBoundary from '../common/ErrorBoundary';

interface PaymentsErrorBoundaryProps {
  children: ReactNode;
}

const PaymentsFallback: React.FC = () => {
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    navigate('/app/dashboard');
  };

  const handleGoToPayments = () => {
    navigate('/app/payments');
  };

  const handleContactSupport = () => {
    // TODO: Implement support contact system
    window.open('mailto:support@verihome.com?subject=Error en Pagos', '_blank');
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 3 }}>
          Error en el módulo de Pagos
        </Alert>

        <Typography variant="h5" gutterBottom>
          Problema con el sistema de pagos
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Ha ocurrido un error al procesar la información de pagos. 
          Por tu seguridad, hemos pausado las operaciones financieras.
        </Typography>

        <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
          <Typography variant="body2">
            <strong>Importante:</strong> Si estabas realizando un pago, 
            verifica el estado de tu transacción antes de intentar nuevamente.
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
            startIcon={<PaymentIcon />}
            onClick={handleGoToPayments}
          >
            Ver Pagos
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
            startIcon={<BankIcon />}
            onClick={handleContactSupport}
          >
            Contactar Soporte
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Para problemas urgentes de pago, contacta soporte inmediatamente
        </Typography>
      </Paper>
    </Box>
  );
};

const PaymentsErrorBoundary: React.FC<PaymentsErrorBoundaryProps> = ({ children }) => {
  return (
    <ErrorBoundary
      module="Payments"
      fallback={<PaymentsFallback />}
      onError={(error, errorInfo) => {
        // Payments-specific error logging with high priority
        console.error('CRITICAL - Payments Module Error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          module: 'Payments',
          url: window.location.href,
          userAgent: navigator.userAgent,
          priority: 'CRITICAL',
        });

        // Additional security logging for payment errors
        if (window.performance && window.performance.mark) {
          window.performance.mark('payment-error-occurred');
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default PaymentsErrorBoundary;