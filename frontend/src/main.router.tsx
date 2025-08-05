import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClientProvider } from '@tanstack/react-query';
import theme from './theme';
import { queryClient } from './lib/react-query';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import CustomNotification from './components/common/CustomNotification';
import { useNotification } from './hooks/useNotification';

// Importar rutas lazy
import { AppRoutes } from './routes/index.lazy';

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

// Crear router con flags v7 habilitados
const router = createBrowserRouter(
  [
    {
      path: '*',
      element: (
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
              <AuthProvider>
                <NotificationWrapper>
                  <AppRoutes />
                </NotificationWrapper>
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      ),
    },
  ],
  {
    // Habilitar flags v7 para preparar la migración
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  }
);

// Función principal mejorada con router
export function MainWithRouter() {
  return <RouterProvider router={router} />;
}

// Si este archivo se ejecuta directamente, renderizar la app
if (import.meta.hot) {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );
  
  root.render(
    <React.StrictMode>
      <MainWithRouter />
    </React.StrictMode>
  );
}