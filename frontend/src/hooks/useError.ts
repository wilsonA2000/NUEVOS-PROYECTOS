import { useState, useCallback } from 'react';

interface ErrorState {
  message: string;
  code?: string;
  details?: any;
}

export const useError = () => {
  const [error, setError] = useState<ErrorState | null>(null);

  const handleError = useCallback((error: any) => {
    if (error.response) {
      // Error de respuesta del servidor
      setError({
        message: error.response.data.message || 'Ha ocurrido un error en el servidor',
        code: error.response.status.toString(),
        details: error.response.data,
      });
    } else if (error.request) {
      // Error de red
      setError({
        message: 'No se pudo conectar con el servidor',
        code: 'NETWORK_ERROR',
      });
    } else {
      // Error general
      setError({
        message: error.message || 'Ha ocurrido un error inesperado',
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
  };
}; 