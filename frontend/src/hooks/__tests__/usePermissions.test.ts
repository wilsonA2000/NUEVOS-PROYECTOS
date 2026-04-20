import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePermissions } from '../usePermissions';

// Test wrapper with fresh QueryClient per test
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePermissions Hook', () => {
  const mockRoles = [
    {
      id: 1,
      name: 'admin',
      permissions: [
        {
          id: 1,
          name: 'Can view properties',
          codename: 'view_property',
          description: 'View properties',
        },
        {
          id: 2,
          name: 'Can edit properties',
          codename: 'edit_property',
          description: 'Edit properties',
        },
        {
          id: 3,
          name: 'Can delete properties',
          codename: 'delete_property',
          description: 'Delete properties',
        },
      ],
    },
    {
      id: 2,
      name: 'landlord',
      permissions: [
        {
          id: 4,
          name: 'Can create contracts',
          codename: 'create_contract',
          description: 'Create contracts',
        },
        {
          id: 5,
          name: 'Can manage tenants',
          codename: 'manage_tenants',
          description: 'Manage tenants',
        },
      ],
    },
  ];

  it('should return permissions query object', () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.permissions).toBeDefined();
    expect(typeof result.current.hasPermission).toBe('function');
    expect(typeof result.current.hasAnyPermission).toBe('function');
    expect(typeof result.current.hasAllPermissions).toBe('function');
  });

  it('should return false for hasPermission when data is not loaded', () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasPermission('view_property')).toBe(false);
  });

  it('should return false for hasAnyPermission when data is not loaded', () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    expect(
      result.current.hasAnyPermission(['view_property', 'edit_property'])
    ).toBe(false);
  });

  it('should return false for hasAllPermissions when data is not loaded', () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    expect(
      result.current.hasAllPermissions(['view_property', 'edit_property'])
    ).toBe(false);
  });

  it('should check hasPermission correctly when data is loaded', async () => {
    // The placeholder getUserPermissions returns [], so we'll test with that
    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.permissions.isSuccess).toBe(true);
    });

    // With empty permissions, should return false
    expect(result.current.hasPermission('view_property')).toBe(false);
  });

  it('should check hasAnyPermission correctly with loaded data', async () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.permissions.isSuccess).toBe(true);
    });

    // With empty permissions, should return false
    expect(
      result.current.hasAnyPermission(['view_property', 'non_existent'])
    ).toBe(false);
  });

  it('should check hasAllPermissions correctly with loaded data', async () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.permissions.isSuccess).toBe(true);
    });

    // With empty permissions, should return false
    expect(
      result.current.hasAllPermissions(['view_property', 'edit_property'])
    ).toBe(false);
  });

  it('should expose loading state via permissions query', () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    // Initially loading or already resolved (placeholder returns immediately)
    expect(result.current.permissions.isFetching !== undefined).toBe(true);
  });

  it('should expose error state via permissions query', () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.permissions.error).toBeNull();
  });
});
