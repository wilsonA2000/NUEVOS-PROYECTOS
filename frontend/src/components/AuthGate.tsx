import React from 'react';
import { useAuth } from '../hooks/useAuth';

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Cargando...</h2>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGate; 