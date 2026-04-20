/**
 * 🔐 ADMIN PROTECTED ROUTE (Plan Maestro V2.0)
 *
 * Componente de ruta protegida para secciones de administrador.
 * Verifica is_staff=true OR is_superuser=true antes de permitir acceso.
 *
 * Usage:
 * ```tsx
 * <Route
 *   path="/app/admin/*"
 *   element={
 *     <AdminProtectedRoute>
 *       <AdminLayout />
 *     </AdminProtectedRoute>
 *   }
 * />
 * ```
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Avatar,
} from '@mui/material';
import {
  Lock as LockIcon,
  Home as HomeIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';

import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useAuth } from '../../contexts/AuthContext';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  requireSuperuser?: boolean; // Si true, solo permite superusers
}

/**
 * Componente de ruta protegida para administradores
 */
const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({
  children,
  requireSuperuser = false,
}) => {
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isAdmin, isSuperuser, isLoading: adminLoading } = useAdminAuth();

  // Estado de carga
  if (authLoading || adminLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={48} />
        <Typography variant='body1' sx={{ mt: 2 }} color='text.secondary'>
          Verificando permisos de administrador...
        </Typography>
      </Box>
    );
  }

  // No autenticado - redirigir a login
  if (!isAuthenticated) {
    return (
      <Navigate
        to='/login'
        state={{ from: location, message: 'Debe iniciar sesión para acceder' }}
        replace
      />
    );
  }

  // Verificar permisos de superuser si se requiere
  if (requireSuperuser && !isSuperuser) {
    return <AccessDeniedView reason='superuser' />;
  }

  // Verificar permisos de admin
  if (!isAdmin) {
    return <AccessDeniedView reason='admin' />;
  }

  // Usuario autorizado - renderizar children
  return <>{children}</>;
};

/**
 * Vista de acceso denegado con diseño profesional
 */
interface AccessDeniedViewProps {
  reason: 'admin' | 'superuser';
}

const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({ reason }) => {
  const getMessage = () => {
    if (reason === 'superuser') {
      return {
        title: 'Acceso Restringido a Superusuarios',
        subtitle:
          'Esta sección requiere privilegios de superusuario. Solo los administradores principales pueden acceder.',
        alert:
          'Si crees que deberías tener acceso, contacta al administrador principal del sistema.',
      };
    }
    return {
      title: 'Acceso Denegado',
      subtitle:
        'No tienes permisos de administrador para acceder a esta sección del sistema.',
      alert:
        'Esta área está reservada para el equipo de administración legal de VeriHome.',
    };
  };

  const message = getMessage();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          borderRadius: 2,
        }}
      >
        {/* Icono */}
        <Avatar
          sx={{
            width: 80,
            height: 80,
            mx: 'auto',
            mb: 3,
            bgcolor: 'error.light',
          }}
        >
          <LockIcon sx={{ fontSize: 40, color: 'error.dark' }} />
        </Avatar>

        {/* Título */}
        <Typography variant='h5' fontWeight='bold' gutterBottom>
          {message.title}
        </Typography>

        {/* Subtítulo */}
        <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
          {message.subtitle}
        </Typography>

        {/* Alerta informativa */}
        <Alert severity='warning' sx={{ mb: 3, textAlign: 'left' }}>
          {message.alert}
        </Alert>

        {/* Información de permisos */}
        <Paper variant='outlined' sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant='caption' color='text.secondary' display='block'>
            Permisos requeridos:
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mt: 1,
            }}
          >
            <AdminIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant='body2' fontWeight='medium'>
              {reason === 'superuser'
                ? 'is_superuser = True'
                : 'is_staff = True OR is_superuser = True'}
            </Typography>
          </Box>
        </Paper>

        {/* Botón para volver */}
        <Button
          variant='contained'
          startIcon={<HomeIcon />}
          href='/app/dashboard'
          fullWidth
          size='large'
        >
          Volver al Dashboard
        </Button>
      </Paper>

      {/* Footer */}
      <Typography variant='caption' color='text.disabled' sx={{ mt: 3 }}>
        VeriHome Legal Administration System
      </Typography>
    </Box>
  );
};

export default AdminProtectedRoute;
