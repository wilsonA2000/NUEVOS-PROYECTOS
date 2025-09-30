import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClientProvider } from '@tanstack/react-query';
import theme from './theme';
import { queryClient } from './lib/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { AppRoutes } from './routes/index';
import ErrorBoundary from './components/ErrorBoundary';
import { clearAuthState } from './utils/clearAuthState';
import CustomNotification from './components/common/CustomNotification';
import { useNotification } from './hooks/useNotification';
import OptimizedWebSocketProvider from './contexts/OptimizedWebSocketContext';

// Componente wrapper para las notificaciones
const NotificationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { customNotification, hideCustomNotification } = useNotification();

  return (
    <>
      {children}
      <CustomNotification
        open={customNotification.open}
        onClose={hideCustomNotification}
        message={customNotification.message}
        type={customNotification.type}
        title={customNotification.title}
        duration={customNotification.duration}
      />
    </>
  );
};

function App() {
  useEffect(() => {

// No limpiar automáticamente el localStorage al iniciar
    // Esto causaba que los usuarios tuvieran que hacer login constantemente
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <BrowserRouter>
            <AuthProvider>
              <OptimizedWebSocketProvider>
                <NotificationWrapper>
                  <AppRoutes />
                </NotificationWrapper>
              </OptimizedWebSocketProvider>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App; 