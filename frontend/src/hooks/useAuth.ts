import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Hook para acceder al contexto de autenticación.
 * Debe ser utilizado dentro de un AuthProvider.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}; 