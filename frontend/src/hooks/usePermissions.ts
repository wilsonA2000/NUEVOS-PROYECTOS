import { useQuery } from '@tanstack/react-query';
import { getUserPermissions } from '../lib/api';

interface Permission {
  id: number;
  name: string;
  codename: string;
  description: string;
}

interface Role {
  id: number;
  name: string;
  permissions: Permission[];
}

export const usePermissions = () => {
  const permissions = useQuery<Role[]>({
    queryKey: ['permissions'],
    queryFn: getUserPermissions,
  });

  const hasPermission = (permissionCodename: string) => {
    if (!permissions.data) return false;

    return permissions.data.some((role) =>
      role.permissions.some((permission) => permission.codename === permissionCodename)
    );
  };

  const hasAnyPermission = (permissionCodenames: string[]) => {
    if (!permissions.data) return false;

    return permissions.data.some((role) =>
      role.permissions.some((permission) =>
        permissionCodenames.includes(permission.codename)
      )
    );
  };

  const hasAllPermissions = (permissionCodenames: string[]) => {
    if (!permissions.data) return false;

    const userPermissions = permissions.data.flatMap((role) =>
      role.permissions.map((permission) => permission.codename)
    );

    return permissionCodenames.every((codename) =>
      userPermissions.includes(codename)
    );
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}; 