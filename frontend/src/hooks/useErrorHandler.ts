import { useState, useCallback } from 'react';
import { useLanguage } from './useLanguage';

interface ErrorState {
  message: string;
  code?: string;
  details?: any;
}

export const useErrorHandler = () => {
  const [error, setError] = useState<ErrorState | null>(null);
  const { t } = useLanguage();

  const handleError = useCallback((error: any) => {
    let errorMessage = t('common.unknownError');
    let errorCode: string | undefined;
    let errorDetails: any;

    if (error.response) {
      // Error de respuesta del servidor
      errorCode = error.response.status.toString();
      errorDetails = error.response.data;
      errorMessage = error.response.data.message || errorMessage;
    } else if (error.request) {
      // Error de red
      errorMessage = t('common.networkError');
    } else {
      // Error de la aplicación
      errorMessage = error.message || errorMessage;
    }

    setError({
      message: errorMessage,
      code: errorCode,
      details: errorDetails,
    });

    // Limpiar el error después de 5 segundos
    setTimeout(() => {
      setError(null);
    }, 5000);
  }, [t]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
  };
}; 