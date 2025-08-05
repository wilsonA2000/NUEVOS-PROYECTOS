/**
 * Lazy loading components avanzado para optimizar bundle size
 * VeriHome - Sistema de Performance Optimizado
 */

import React, { Suspense, ComponentType, ReactElement } from 'react';
import { CircularProgress, Box, Skeleton, Typography } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';

// Componente de loading universal
const LazyLoadingSpinner = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="400px"
    flexDirection="column"
    gap={2}
  >
    <CircularProgress size={40} />
    <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
      Cargando...
    </Box>
  </Box>
);

// HOC para lazy loading con suspense
export const withLazyLoading = <P extends object>(
  Component: ComponentType<P>,
  fallback: React.ReactNode = <LazyLoadingSpinner />
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <Suspense fallback={fallback}>
      <Component {...props} ref={ref} />
    </Suspense>
  ));
};

// PÁGINAS PRINCIPALES - Lazy loaded
export const LazyLandingPage = React.lazy(() => import('../../pages/LandingPage'));
export const LazyDashboard = React.lazy(() => import('../../pages/Dashboard'));
export const LazyProfile = React.lazy(() => import('../../pages/Profile'));
export const LazySettings = React.lazy(() => import('../../pages/Settings'));

// AUTENTICACIÓN - Lazy loaded
export const LazyLogin = React.lazy(() => import('../../pages/auth/Login'));
export const LazyRegister = React.lazy(() => import('../../pages/auth/Register'));
export const LazyForgotPassword = React.lazy(() => import('../../pages/auth/ForgotPassword'));
export const LazyResetPassword = React.lazy(() => import('../../pages/auth/ResetPassword'));

// PROPIEDADES - Lazy loaded
export const LazyPropertyList = React.lazy(() => import('../../pages/properties/PropertyList'));
export const LazyPropertyForm = React.lazy(() => import('../../pages/properties/PropertyForm'));
export const LazyPropertyFormPage = React.lazy(() => import('../../pages/properties/PropertyFormPage'));

// CONTRATOS - Lazy loaded
export const LazyContractList = React.lazy(() => import('../../pages/contracts/ContractList'));
export const LazyContractForm = React.lazy(() => import('../../pages/contracts/ContractForm'));

// PAGOS - Lazy loaded
export const LazyPaymentList = React.lazy(() => import('../../pages/payments/PaymentList'));
export const LazyPaymentForm = React.lazy(() => import('../../pages/payments/PaymentForm'));

// MENSAJES - Lazy loaded
export const LazyMessagesMain = React.lazy(() => import('../../pages/messages/MessagesMain'));
export const LazyInbox = React.lazy(() => import('../../pages/messages/Inbox'));
export const LazyCompose = React.lazy(() => import('../../pages/messages/Compose'));
export const LazyConversations = React.lazy(() => import('../../pages/messages/Conversations'));

// SERVICIOS - Lazy loaded
export const LazyServicesPage = React.lazy(() => import('../../pages/services/ServicesPage'));
export const LazyServiceRequestsPage = React.lazy(() => import('../../pages/services/ServiceRequestsPage'));

// PÁGINAS INFORMATIVAS - Lazy loaded
export const LazyAboutPage = React.lazy(() => import('../../pages/AboutPage'));
export const LazyContactPage = React.lazy(() => import('../../pages/ContactPage'));
export const LazyServicesOverviewPage = React.lazy(() => import('../../pages/ServicesOverviewPage'));
export const LazyNotFound = React.lazy(() => import('../../pages/NotFound'));

// COMPONENTES DE GRÁFICOS - Lazy loaded (carga bajo demanda)
export const LazyIncomeChart = React.lazy(() => import('../../components/dashboard/IncomeChart'));
export const LazyOccupancyChart = React.lazy(() => import('../../components/dashboard/OccupancyChart'));

// MAPAS - Lazy loaded (solo cuando se necesiten)
export const LazyMapboxTest = React.lazy(() => import('../../components/properties/MapboxTest'));

// VERIFICACIÓN - Lazy loaded
export const LazyCVVerificationSystem = React.lazy(() => import('../../components/verification/CVVerificationSystem'));

// Componentes con Suspense pre-configurado
export const LandingPage = withLazyLoading(LazyLandingPage);
export const Dashboard = withLazyLoading(LazyDashboard);
export const Profile = withLazyLoading(LazyProfile);
export const Settings = withLazyLoading(LazySettings);

export const Login = withLazyLoading(LazyLogin);
export const Register = withLazyLoading(LazyRegister);
export const ForgotPassword = withLazyLoading(LazyForgotPassword);
export const ResetPassword = withLazyLoading(LazyResetPassword);

export const PropertyList = withLazyLoading(LazyPropertyList);
export const PropertyForm = withLazyLoading(LazyPropertyForm);
export const PropertyFormPage = withLazyLoading(LazyPropertyFormPage);

export const ContractList = withLazyLoading(LazyContractList);
export const ContractForm = withLazyLoading(LazyContractForm);

export const PaymentList = withLazyLoading(LazyPaymentList);
export const PaymentForm = withLazyLoading(LazyPaymentForm);

export const MessagesMain = withLazyLoading(LazyMessagesMain);
export const Inbox = withLazyLoading(LazyInbox);
export const Compose = withLazyLoading(LazyCompose);
export const Conversations = withLazyLoading(LazyConversations);

export const ServicesPage = withLazyLoading(LazyServicesPage);
export const ServiceRequestsPage = withLazyLoading(LazyServiceRequestsPage);

export const AboutPage = withLazyLoading(LazyAboutPage);
export const ContactPage = withLazyLoading(LazyContactPage);
export const ServicesOverviewPage = withLazyLoading(LazyServicesOverviewPage);
export const NotFound = withLazyLoading(LazyNotFound);

// Charts con loading especializado
const ChartLoadingSpinner = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    height="300px"
    flexDirection="column"
    gap={1}
  >
    <CircularProgress size={32} />
    <Box sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
      Cargando gráfico...
    </Box>
  </Box>
);

export const IncomeChart = withLazyLoading(LazyIncomeChart, <ChartLoadingSpinner />);
export const OccupancyChart = withLazyLoading(LazyOccupancyChart, <ChartLoadingSpinner />);

// Maps con loading especializado
const MapLoadingSpinner = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    height="400px"
    flexDirection="column"
    gap={1}
    sx={{ backgroundColor: 'grey.100', borderRadius: 1 }}
  >
    <CircularProgress size={32} />
    <Box sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
      Cargando mapa...
    </Box>
  </Box>
);

export const MapboxTest = withLazyLoading(LazyMapboxTest, <MapLoadingSpinner />);

// Verificación con loading especializado
const VerificationLoadingSpinner = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="500px"
    flexDirection="column"
    gap={2}
  >
    <CircularProgress size={40} />
    <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
      Inicializando sistema de verificación...
    </Box>
  </Box>
);

export const CVVerificationSystem = withLazyLoading(LazyCVVerificationSystem, <VerificationLoadingSpinner />);

// Utility functions
export const preloadComponent = (componentLoader: () => Promise<any>) => {
  const componentImport = componentLoader();
  return componentImport;
};

// Pre-cargar componentes críticos en idle time
export const preloadCriticalComponents = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadComponent(() => import('../../pages/Dashboard'));
      preloadComponent(() => import('../../pages/properties/PropertyList'));
    });
  }
};