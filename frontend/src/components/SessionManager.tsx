import React from 'react';
import { useAuth } from '../hooks/useAuth';
import SessionTimeoutWarning from './SessionTimeoutWarning';

interface SessionManagerProps {
  children: React.ReactNode;
}

const SessionManager: React.FC<SessionManagerProps> = ({ children }) => {
  const { showSessionWarning, extendSession, logout } = useAuth();

  return (
    <>
      {children}
      <SessionTimeoutWarning
        isOpen={showSessionWarning}
        onExtendSession={extendSession}
        onLogout={logout}
        timeRemaining={60} // 60 segundos (1 minuto)
      />
    </>
  );
};

export default SessionManager; 