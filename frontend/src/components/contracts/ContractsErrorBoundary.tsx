/**
 * ContractsErrorBoundary - Specialized error boundary for Contracts module
 * Handles contract creation, signing and legal document errors
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
  Description as ContractIcon,
  Refresh as RefreshIcon,
  Assignment as DocumentIcon,
  Home as HomeIcon,
  Gavel as LegalIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ErrorBoundary from '../common/ErrorBoundary';

interface ContractsErrorBoundaryProps {
  children: ReactNode;
}

const ContractsFallback: React.FC = () => {
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    navigate('/app/dashboard');
  };

  const handleGoToContracts = () => {
    navigate('/app/contracts');
  };

  const handleContactLegal = () => {
    // TODO: Implement legal support contact
    window.open('mailto:legal@verihome.com?subject=Error en Contratos', '_blank');
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const handleSaveProgress = () => {
    // Save any form data to localStorage for recovery
    const formData = document.querySelector('form');
    if (formData) {
      const formDataObj = new FormData(formData);
      const data: Record<string, string> = {};
      formDataObj.forEach((value, key) => {
        data[key] = value.toString();
      });
      localStorage.setItem('contractFormBackup', JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
      }));
      alert('Progreso guardado temporalmente');
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Error en el módulo de Contratos
        </Alert>

        <Typography variant="h5" gutterBottom>
          Problema con el sistema de contratos
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Ha ocurrido un error al procesar información de contratos. 
          Tus documentos legales están seguros y protegidos.
        </Typography>

        <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
          <Typography variant="body2">
            <strong>Importante:</strong> Si estabas creando o firmando un contrato, 
            el progreso puede haberse guardado automáticamente.
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
            startIcon={<ContractIcon />}
            onClick={handleGoToContracts}
          >
            Ver Contratos
          </Button>

          <Button
            variant="outlined"
            startIcon={<DocumentIcon />}
            onClick={handleSaveProgress}
          >
            Guardar Progreso
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
            startIcon={<LegalIcon />}
            onClick={handleContactLegal}
          >
            Soporte Legal
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Para asuntos legales urgentes, contacta nuestro equipo jurídico
        </Typography>
      </Paper>
    </Box>
  );
};

const ContractsErrorBoundary: React.FC<ContractsErrorBoundaryProps> = ({ children }) => {
  return (
    <ErrorBoundary
      module="Contracts"
      fallback={<ContractsFallback />}
      onError={(error, errorInfo) => {
        // Contracts-specific error logging with legal context
        console.error('LEGAL - Contracts Module Error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          module: 'Contracts',
          url: window.location.href,
          userAgent: navigator.userAgent,
          priority: 'HIGH',
          category: 'LEGAL_DOCUMENT',
        });

        // Save form data for recovery if available
        const formData = document.querySelector('form');
        if (formData) {
          try {
            const formDataObj = new FormData(formData);
            const data: Record<string, string> = {};
            formDataObj.forEach((value, key) => {
              data[key] = value.toString();
            });
            localStorage.setItem('contractErrorRecovery', JSON.stringify({
              data,
              error: error.message,
              timestamp: new Date().toISOString(),
            }));
          } catch (saveError) {
            console.error('Failed to save form data for recovery:', saveError);
          }
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ContractsErrorBoundary;