/**
 * 🔐 USE ADMIN AUTH HOOK (Plan Maestro V2.0)
 *
 * Hook para verificación de permisos de administrador.
 * Verifica is_staff=true OR is_superuser=true.
 *
 * Usage:
 * ```tsx
 * const { isAdmin, isLoading, checkAdminAccess } = useAdminAuth();
 *
 * if (!isAdmin) {
 *   return <Navigate to="/app/dashboard" />;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export interface AdminAuthState {
  isAdmin: boolean;
  isStaff: boolean;
  isSuperuser: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UseAdminAuthReturn extends AdminAuthState {
  checkAdminAccess: () => boolean;
  redirectIfNotAdmin: (redirectPath?: string) => void;
  adminPermissions: {
    canApproveContracts: boolean;
    canRejectContracts: boolean;
    canViewAuditLogs: boolean;
    canExportReports: boolean;
    canManageUsers: boolean;
    canAccessSecurityPanel: boolean;
  };
}

/**
 * Hook para verificar y manejar autenticación de administrador
 */
export const useAdminAuth = (): UseAdminAuthReturn => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isStaff: false,
    isSuperuser: false,
    isLoading: true,
    error: null,
  });

  // Verificar permisos cuando el usuario cambia
  useEffect(() => {
    if (authLoading) {
      setState((prev) => ({ ...prev, isLoading: true }));
      return;
    }

    if (!isAuthenticated || !user) {
      setState({
        isAdmin: false,
        isStaff: false,
        isSuperuser: false,
        isLoading: false,
        error: 'Usuario no autenticado',
      });
      return;
    }

    // Verificar permisos de admin
    const isStaff = user.is_staff === true;
    const isSuperuser = user.is_superuser === true;
    const isAdmin = isStaff || isSuperuser;

    setState({
      isAdmin,
      isStaff,
      isSuperuser,
      isLoading: false,
      error: isAdmin ? null : 'Acceso denegado: Se requieren permisos de administrador',
    });

  }, [user, isAuthenticated, authLoading]);

  /**
   * Verificar si el usuario tiene acceso de admin (sync)
   */
  const checkAdminAccess = useCallback((): boolean => {
    if (!user) return false;
    return user.is_staff === true || user.is_superuser === true;
  }, [user]);

  /**
   * Redirigir si no es admin
   */
  const redirectIfNotAdmin = useCallback(
    (redirectPath: string = '/app/dashboard'): void => {
      if (!state.isLoading && !state.isAdmin) {
        navigate(redirectPath, {
          replace: true,
          state: {
            message: 'Acceso denegado: Se requieren permisos de administrador',
            type: 'error',
          },
        });
      }
    },
    [state.isLoading, state.isAdmin, navigate]
  );

  /**
   * Permisos granulares de admin
   */
  const adminPermissions = useMemo(() => {
    // Staff puede hacer operaciones básicas
    // Superuser puede hacer todo
    return {
      canApproveContracts: state.isAdmin,
      canRejectContracts: state.isAdmin,
      canViewAuditLogs: state.isAdmin,
      canExportReports: state.isAdmin,
      canManageUsers: state.isSuperuser, // Solo superuser
      canAccessSecurityPanel: state.isSuperuser, // Solo superuser
    };
  }, [state.isAdmin, state.isSuperuser]);

  return {
    ...state,
    checkAdminAccess,
    redirectIfNotAdmin,
    adminPermissions,
  };
};

/**
 * Hook simplificado que solo retorna boolean de admin
 */
export const useIsAdmin = (): boolean => {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return false;
    return user.is_staff === true || user.is_superuser === true;
  }, [user]);
};

/**
 * Hook para obtener el rol de admin del usuario
 */
export const useAdminRole = (): 'superuser' | 'staff' | 'none' => {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return 'none';
    if (user.is_superuser) return 'superuser';
    if (user.is_staff) return 'staff';
    return 'none';
  }, [user]);
};

export default useAdminAuth;
