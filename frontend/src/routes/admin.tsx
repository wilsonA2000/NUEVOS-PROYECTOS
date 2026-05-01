/**
 * 🔐 ADMIN ROUTES (Plan Maestro V2.0)
 *
 * Configuración de rutas para el Dashboard de Administración Legal.
 * Todas las rutas requieren is_staff=True o is_superuser=True.
 *
 * Estructura de rutas:
 * /app/admin/              → AdminDashboard (overview)
 * /app/admin/contracts     → AdminContractsList (lista pendientes)
 * /app/admin/contracts/:id → AdminContractReview (detalle revisión)
 * /app/admin/audit         → AdminAuditDashboard (reportes)
 * /app/admin/security      → AdminSecurityPanel (análisis seguridad)
 * /app/admin/logs          → AdminLogsViewer (logs del sistema)
 * /app/admin/audit-logs    → AdminAuditLog (audit trail ADM-001 · Fase 1.9.7)
 * /app/admin/settings      → AdminSettings (configuración)
 */

import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

import AdminProtectedRoute from '../components/auth/AdminProtectedRoute';

// Lazy load admin pages para mejor performance
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminContractsList = lazy(
  () => import('../pages/admin/AdminContractsList'),
);
const AdminContractReview = lazy(
  () => import('../pages/admin/AdminContractReview'),
);
const AdminAuditDashboard = lazy(
  () => import('../pages/admin/AdminAuditDashboard'),
);
const AdminSecurityPanel = lazy(
  () => import('../pages/admin/AdminSecurityPanel'),
);
const AdminLogsViewer = lazy(() => import('../pages/admin/AdminLogsViewer'));
const AdminAuditLog = lazy(() => import('../pages/admin/AdminAuditLog'));
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings'));
const AdminMaintenance = lazy(() => import('../pages/admin/AdminMaintenance'));
const AdminVerificationDashboard = lazy(
  () => import('../pages/admin/AdminVerificationDashboard'),
);
const AdminTicketsDashboard = lazy(
  () => import('../pages/admin/AdminTicketsDashboard'),
);
const AdminFieldVisitActs = lazy(
  () => import('../pages/admin/AdminFieldVisitActs'),
);
const AdminFieldVisitActDetail = lazy(
  () => import('../pages/admin/AdminFieldVisitActDetail'),
);

/**
 * Loading fallback para lazy components
 */
const AdminLoadingFallback: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50vh',
    }}
  >
    <CircularProgress size={40} />
    <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
      Cargando módulo de administración...
    </Typography>
  </Box>
);

/**
 * Componente principal de rutas admin
 */
const AdminRoutes: React.FC = () => {
  return (
    <AdminProtectedRoute>
      <Suspense fallback={<AdminLoadingFallback />}>
        <Routes>
          {/* Dashboard principal */}
          <Route index element={<AdminDashboard />} />

          {/* Contratos */}
          <Route path='contracts' element={<AdminContractsList />} />
          <Route
            path='contracts/:contractId'
            element={<AdminContractReview />}
          />

          {/* Auditoría y reportes */}
          <Route path='audit' element={<AdminAuditDashboard />} />

          {/* Seguridad */}
          <Route path='security' element={<AdminSecurityPanel />} />

          {/* Logs */}
          <Route path='logs' element={<AdminLogsViewer />} />

          {/* Audit trail global (ADM-001 · Fase 1.9.7) */}
          <Route path='audit-logs' element={<AdminAuditLog />} />

          {/* Configuración */}
          <Route path='settings' element={<AdminSettings />} />

          {/* Mantenimiento */}
          <Route path='maintenance' element={<AdminMaintenance />} />

          {/* Verificación */}
          <Route path='verification' element={<AdminVerificationDashboard />} />

          {/* Tickets */}
          <Route path='tickets' element={<AdminTicketsDashboard />} />

          {/* Actas VeriHome ID (C11) */}
          <Route path='visitas' element={<AdminFieldVisitActs />} />
          <Route
            path='visitas/:actId'
            element={<AdminFieldVisitActDetail />}
          />

          {/* Catch-all redirect */}
          <Route path='*' element={<Navigate to='/app/admin' replace />} />
        </Routes>
      </Suspense>
    </AdminProtectedRoute>
  );
};

export default AdminRoutes;
