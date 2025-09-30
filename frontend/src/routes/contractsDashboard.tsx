/**
 * Configuración de rutas para el Dashboard de Contratos
 * Incluye rutas para arrendadores, arrendatarios y landing de invitaciones
 */

import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// Lazy loading de componentes del dashboard
const ContractsDashboard = lazy(() => import('../components/contracts/ContractsDashboard'));
const LandlordContractsDashboard = lazy(() => import('../components/contracts/LandlordContractsDashboard'));
const TenantContractsDashboard = lazy(() => import('../components/contracts/TenantContractsDashboard'));
const TenantInvitationLanding = lazy(() => import('../pages/contracts/TenantInvitationLanding'));

// Componente de protección de rutas por rol
interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'landlord' | 'tenant';
  fallbackComponent?: React.ComponentType;
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  fallbackComponent: FallbackComponent 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Verificando permisos..." />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (requiredRole && user.user_type !== requiredRole) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }
    return <Navigate to="/contracts/dashboard" replace />;
  }

  return <>{children}</>;
};

// Componente principal de rutas de contratos dashboard
const ContractsDashboardRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <React.Suspense fallback={<LoadingSpinner message="Cargando dashboard..." />}>
      <Routes>
        {/* Dashboard principal - redirige según el rol del usuario */}
        <Route 
          path="/dashboard" 
          element={
            user?.user_type === 'landlord' ? (
              <Navigate to="/contracts/landlord/dashboard" replace />
            ) : user?.user_type === 'tenant' ? (
              <Navigate to="/contracts/tenant/dashboard" replace />
            ) : (
              <ContractsDashboard />
            )
          } 
        />

        {/* Dashboard unificado (funciona para ambos roles) */}
        <Route 
          path="/unified" 
          element={
            <RoleProtectedRoute>
              <ContractsDashboard />
            </RoleProtectedRoute>
          } 
        />

        {/* Dashboard específico para arrendadores */}
        <Route 
          path="/landlord/dashboard" 
          element={
            <RoleProtectedRoute 
              requiredRole="landlord"
              fallbackComponent={() => (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <h2>Acceso Restringido</h2>
                  <p>Esta sección es solo para arrendadores.</p>
                  <p>
                    <a href="/contracts/tenant/dashboard">
                      Ir al Dashboard de Arrendatario
                    </a>
                  </p>
                </div>
              )}
            >
              <LandlordContractsDashboard />
            </RoleProtectedRoute>
          } 
        />

        {/* Dashboard específico para arrendatarios */}
        <Route 
          path="/tenant/dashboard" 
          element={
            <RoleProtectedRoute 
              requiredRole="tenant"
              fallbackComponent={() => (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <h2>Acceso Restringido</h2>
                  <p>Esta sección es solo para arrendatarios.</p>
                  <p>
                    <a href="/contracts/landlord/dashboard">
                      Ir al Dashboard de Arrendador
                    </a>
                  </p>
                </div>
              )}
            >
              <TenantContractsDashboard />
            </RoleProtectedRoute>
          } 
        />

        {/* Landing de invitación - ruta pública */}
        <Route 
          path="/invitation/:token" 
          element={<TenantInvitationLanding />} 
        />

        {/* Rutas de gestión específicas */}
        <Route path="/landlord/*" element={<LandlordContractRoutes />} />
        <Route path="/tenant/*" element={<TenantContractRoutes />} />

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/contracts/dashboard" replace />} />
      </Routes>
    </React.Suspense>
  );
};

// Rutas específicas para arrendadores
const LandlordContractRoutes: React.FC = () => {
  return (
    <React.Suspense fallback={<LoadingSpinner message="Cargando..." />}>
      <Routes>
        {/* Vista individual de contrato */}
        <Route 
          path="/view/:contractId" 
          element={
            <RoleProtectedRoute requiredRole="landlord">
              <div>Vista de Contrato (En desarrollo)</div>
            </RoleProtectedRoute>
          } 
        />

        {/* Edición de contrato */}
        <Route 
          path="/edit/:contractId" 
          element={
            <RoleProtectedRoute requiredRole="landlord">
              <div>Edición de Contrato (En desarrollo)</div>
            </RoleProtectedRoute>
          } 
        />

        {/* Creación de contrato */}
        <Route 
          path="/create" 
          element={
            <RoleProtectedRoute requiredRole="landlord">
              <div>Crear Contrato (En desarrollo)</div>
            </RoleProtectedRoute>
          } 
        />

        {/* Plantillas de contrato */}
        <Route 
          path="/template" 
          element={
            <RoleProtectedRoute requiredRole="landlord">
              <div>Plantillas de Contrato (En desarrollo)</div>
            </RoleProtectedRoute>
          } 
        />

        {/* Análisis y reportes */}
        <Route 
          path="/analytics" 
          element={
            <RoleProtectedRoute requiredRole="landlord">
              <div>Análisis y Reportes (En desarrollo)</div>
            </RoleProtectedRoute>
          } 
        />

        {/* Redirigir al dashboard por defecto */}
        <Route path="*" element={<Navigate to="/contracts/landlord/dashboard" replace />} />
      </Routes>
    </React.Suspense>
  );
};

// Rutas específicas para arrendatarios
const TenantContractRoutes: React.FC = () => {
  return (
    <React.Suspense fallback={<LoadingSpinner message="Cargando..." />}>
      <Routes>
        {/* Aceptar invitación */}
        <Route 
          path="/accept/:token" 
          element={
            <RoleProtectedRoute requiredRole="tenant">
              <div>Aceptar Invitación (En desarrollo)</div>
            </RoleProtectedRoute>
          } 
        />

        {/* Completar datos personales */}
        <Route 
          path="/data/:contractId" 
          element={
            <RoleProtectedRoute requiredRole="tenant">
              <div>Completar Datos (En desarrollo)</div>
            </RoleProtectedRoute>
          } 
        />

        {/* Revisar contrato */}
        <Route 
          path="/review/:contractId" 
          element={
            <RoleProtectedRoute requiredRole="tenant">
              <div>Revisar Contrato (En desarrollo)</div>
            </RoleProtectedRoute>
          } 
        />

        {/* Ver contrato completo */}
        <Route 
          path="/view/:contractId" 
          element={
            <RoleProtectedRoute requiredRole="tenant">
              <div>Ver Contrato (En desarrollo)</div>
            </RoleProtectedRoute>
          } 
        />

        {/* Gestionar objeciones */}
        <Route 
          path="/objections/:contractId" 
          element={
            <RoleProtectedRoute requiredRole="tenant">
              <div>Gestionar Objeciones (En desarrollo)</div>
            </RoleProtectedRoute>
          } 
        />

        {/* Página de éxito */}
        <Route 
          path="/success" 
          element={
            <RoleProtectedRoute requiredRole="tenant">
              <div>Proceso Completado (En desarrollo)</div>
            </RoleProtectedRoute>
          } 
        />

        {/* Redirigir al dashboard por defecto */}
        <Route path="*" element={<Navigate to="/contracts/tenant/dashboard" replace />} />
      </Routes>
    </React.Suspense>
  );
};

export default ContractsDashboardRoutes;
export { RoleProtectedRoute, LandlordContractRoutes, TenantContractRoutes };