/**
 * Lazy loading components avanzado para optimizar bundle size
 * VeriHome - Sistema de Performance Optimizado
 */

import React, { Suspense, ComponentType } from 'react';
import { CircularProgress, Box, Skeleton } from '@mui/material';

// Componente de loading universal
export const LazyLoadingSpinner: React.FC<{
  variant?: string;
  message?: string;
}> = ({ message }) => (
  <Box
    display='flex'
    justifyContent='center'
    alignItems='center'
    minHeight='400px'
    flexDirection='column'
    gap={2}
  >
    <CircularProgress size={40} />
    <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
      {message || 'Cargando...'}
    </Box>
  </Box>
);

// Skeleton Loader Component
export const SkeletonLoader: React.FC<{
  type?: 'dashboard' | 'form' | 'list' | 'table';
  count?: number;
  animation?: 'pulse' | 'wave' | false;
}> = ({ type = 'list', count = 3, animation = 'wave' }) => {
  if (type === 'dashboard') {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton
          variant='rectangular'
          height={200}
          animation={animation}
          sx={{ mb: 2 }}
        />
        <Skeleton variant='rectangular' height={300} animation={animation} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={60} animation={animation} sx={{ mb: 1 }} />
      ))}
    </Box>
  );
};

// Preload hook placeholder
export const useIntelligentPreload = (pathname: string) => {
  // Implementation placeholder
  React.useEffect(() => {
    // Could implement intelligent preloading based on pathname
  }, [pathname]);
};

// Preload function placeholder
export const preloadBasedOnRoute = (pathname: string) => {
  // Implementation placeholder
};

// HOC para lazy loading con suspense
export const withLazyLoading = <P extends object>(
  Component: ComponentType<P>,
  fallback: React.ReactNode = <LazyLoadingSpinner />,
) => {
  const LazyComponent = (props: P) => (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
  return LazyComponent;
};

// PÁGINAS PRINCIPALES - Lazy loaded (solo archivos que existen)
export const LazyLandingPage = React.lazy(
  () => import('../../pages/LandingPage'),
);
export const LazyNewDashboard = React.lazy(
  () => import('../../pages/dashboard/NewDashboard'),
);
export const LazyProfile = React.lazy(
  () => import('../../pages/profile/Profile'),
);
export const LazyAboutPage = React.lazy(() => import('../../pages/AboutPage'));
export const LazyContactPage = React.lazy(
  () => import('../../pages/ContactPage'),
);
export const LazyServicesOverviewPage = React.lazy(
  () => import('../../pages/ServicesOverviewPage'),
);
export const LazyNotFound = React.lazy(() => import('../../pages/NotFound'));

// AUTENTICACIÓN - Lazy loaded
export const LazyLogin = React.lazy(() =>
  import('../../pages/auth/Login').then(m => ({ default: m.Login })),
);
export const LazyForgotPassword = React.lazy(() =>
  import('../../pages/auth/ForgotPassword').then(m => ({
    default: m.ForgotPassword,
  })),
);
export const LazyResetPassword = React.lazy(() =>
  import('../../pages/auth/ResetPassword').then(m => ({
    default: m.ResetPassword,
  })),
);
export const LazyRegisterWithCode = React.lazy(() =>
  import('../../pages/auth/RegisterWithCode').then(m => ({
    default: m.RegisterWithCode,
  })),
);
export const LazyEmailVerification = React.lazy(() =>
  import('../../pages/auth/EmailVerification').then(m => ({
    default: m.EmailVerification,
  })),
);

// PROPIEDADES - Lazy loaded
export const LazyPropertyList = React.lazy(
  () => import('../../pages/properties/PropertyList'),
);
export const LazyPropertyFormPage = React.lazy(
  () => import('../../pages/properties/PropertyFormPage'),
);

// CONTRATOS - Lazy loaded
export const LazyBiometricAuthenticationPage = React.lazy(
  () => import('../../pages/contracts/BiometricAuthenticationPage'),
);
export const LazyTenantInvitationLanding = React.lazy(
  () => import('../../pages/contracts/TenantInvitationLanding'),
);

// MENSAJES - Lazy loaded
export const LazyMessagesMain = React.lazy(
  () => import('../../pages/messages/MessagesMain'),
);
export const LazyInbox = React.lazy(() => import('../../pages/messages/Inbox'));
export const LazyCompose = React.lazy(
  () => import('../../pages/messages/Compose'),
);
// SERVICIOS - Lazy loaded
export const LazyServicesPage = React.lazy(
  () => import('../../pages/services/ServicesPage'),
);

// Componentes con Suspense pre-configurado
export const LandingPage = withLazyLoading(LazyLandingPage);
export const NewDashboard = withLazyLoading(LazyNewDashboard);
export const Profile = withLazyLoading(LazyProfile);
export const AboutPage = withLazyLoading(LazyAboutPage);
export const ContactPage = withLazyLoading(LazyContactPage);
export const ServicesOverviewPage = withLazyLoading(LazyServicesOverviewPage);
export const NotFound = withLazyLoading(LazyNotFound);

export const Login = withLazyLoading(LazyLogin);
export const ForgotPassword = withLazyLoading(LazyForgotPassword);
export const ResetPassword = withLazyLoading(LazyResetPassword);
export const RegisterWithCode = withLazyLoading(LazyRegisterWithCode);
export const EmailVerification = withLazyLoading(LazyEmailVerification);

export const PropertyList = withLazyLoading(LazyPropertyList);
export const PropertyFormPage = withLazyLoading(LazyPropertyFormPage);

export const BiometricAuthenticationPage = withLazyLoading(
  LazyBiometricAuthenticationPage,
);
export const TenantInvitationLanding = withLazyLoading(
  LazyTenantInvitationLanding,
);

export const MessagesMain = withLazyLoading(LazyMessagesMain);
export const Inbox = withLazyLoading(LazyInbox);
export const Compose = withLazyLoading(LazyCompose);
export const ServicesPage = withLazyLoading(LazyServicesPage);

// Charts con loading especializado
const ChartLoadingSpinner = () => (
  <Box
    display='flex'
    justifyContent='center'
    alignItems='center'
    height='300px'
    flexDirection='column'
    gap={1}
  >
    <CircularProgress size={32} />
    <Box sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
      Cargando gráfico...
    </Box>
  </Box>
);

// Maps con loading especializado
const MapLoadingSpinner = () => (
  <Box
    display='flex'
    justifyContent='center'
    alignItems='center'
    height='400px'
    flexDirection='column'
    gap={1}
    sx={{ backgroundColor: 'grey.100', borderRadius: 1 }}
  >
    <CircularProgress size={32} />
    <Box sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
      Cargando mapa...
    </Box>
  </Box>
);

// Utility functions
export const preloadComponent = (componentLoader: () => Promise<unknown>) => {
  const componentImport = componentLoader();
  return componentImport;
};

// Pre-cargar componentes críticos en idle time
export const preloadCriticalComponents = () => {
  if ('requestIdleCallback' in window) {
    (
      window as Window & { requestIdleCallback: (cb: () => void) => void }
    ).requestIdleCallback(() => {
      preloadComponent(() => import('../../pages/dashboard/NewDashboard'));
      preloadComponent(() => import('../../pages/properties/PropertyList'));
    });
  }
};
