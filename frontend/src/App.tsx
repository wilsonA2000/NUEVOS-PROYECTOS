import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClientProvider } from '@tanstack/react-query';
import theme from './theme';
import { queryClient } from './lib/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { AppRoutes } from './routes/index.lazy';
import ErrorBoundary from './components/ErrorBoundary';
import { clearAuthState } from './utils/clearAuthState';
import CustomNotification from './components/common/CustomNotification';
import { useNotification } from './hooks/useNotification';
import OptimizedWebSocketProvider from './contexts/OptimizedWebSocketContext';
import { initSentry, SentryErrorBoundary } from './services/sentryService';
import OfflineIndicator from './components/common/OfflineIndicator';
import UpdatePrompt from './components/common/UpdatePrompt';
import { SnackbarProvider } from './contexts/SnackbarContext';
import ScrollToTop from './components/common/ScrollToTop';
import ScrollToTopButton from './components/common/ScrollToTopButton';

// Initialize Sentry as early as possible
initSentry();

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
    <SentryErrorBoundary fallback={<ErrorBoundary><></></ErrorBoundary>}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <ScrollToTop />
              <AuthProvider>
                <OptimizedWebSocketProvider>
                  <SnackbarProvider>
                    <NotificationWrapper>
                      <OfflineIndicator />
                      <UpdatePrompt />
                      <AppRoutes />
                      <ScrollToTopButton />
                    </NotificationWrapper>
                  </SnackbarProvider>
                </OptimizedWebSocketProvider>
              </AuthProvider>
            </BrowserRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SentryErrorBoundary>
  );
}

export default App; 