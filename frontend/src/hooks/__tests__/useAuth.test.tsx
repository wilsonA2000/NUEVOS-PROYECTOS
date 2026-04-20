import React, { ReactNode, createContext, useContext } from 'react';
import { renderHook } from '@testing-library/react';

// Mock the AuthContext module to avoid loading heavy dependencies
const mockContextValue = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  login: {
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
  },
  register: {
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
  },
  logout: jest.fn(),
  updateUser: jest.fn(),
  resetInactivityTimer: jest.fn(),
  extendSession: jest.fn(),
  showSessionWarning: false,
  errorModal: { open: false, error: '', title: '' },
  showErrorModal: jest.fn(),
  hideErrorModal: jest.fn(),
};

const MockAuthContext = createContext<any>(undefined);

jest.mock('../../contexts/AuthContext', () => ({
  AuthContext: MockAuthContext,
}));

// Now import the hook under test (it will use our mocked AuthContext)
import { useAuth } from '../useAuth';

describe('useAuth Hook', () => {
  const createWrapper = (contextOverrides = {}) => {
    const value = { ...mockContextValue, ...contextOverrides };
    return ({ children }: { children: ReactNode }) => (
      <MockAuthContext.Provider value={value}>
        {children}
      </MockAuthContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return context values when used within AuthProvider', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.logout).toBe('function');
    expect(result.current.login).toBeDefined();
    expect(result.current.register).toBeDefined();
  });

  it('should throw error when used outside provider', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow();

    consoleSpy.mockRestore();
  });

  it('should return authenticated state when user is present', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      user_type: 'tenant',
      is_verified: true,
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper({
        user: mockUser,
        isAuthenticated: true,
        token: 'valid-token',
      }),
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe('valid-token');
  });

  it('should expose login mutation', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.login.mutateAsync).toBeDefined();
    expect(typeof result.current.login.mutateAsync).toBe('function');
  });

  it('should expose register mutation', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.register.mutateAsync).toBeDefined();
    expect(typeof result.current.register.mutateAsync).toBe('function');
  });

  it('should call logout when invoked', () => {
    const logoutMock = jest.fn();
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper({ logout: logoutMock }),
    });

    result.current.logout();
    expect(logoutMock).toHaveBeenCalled();
  });

  it('should call updateUser with correct data', () => {
    const updateUserMock = jest.fn();
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper({ updateUser: updateUserMock }),
    });

    result.current.updateUser({ first_name: 'Updated' });
    expect(updateUserMock).toHaveBeenCalledWith({ first_name: 'Updated' });
  });

  it('should expose session management functions', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.resetInactivityTimer).toBe('function');
    expect(typeof result.current.extendSession).toBe('function');
    expect(result.current.showSessionWarning).toBe(false);
  });

  it('should expose error modal state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.errorModal).toEqual({
      open: false,
      error: '',
      title: '',
    });
    expect(typeof result.current.showErrorModal).toBe('function');
    expect(typeof result.current.hideErrorModal).toBe('function');
  });

  it('should reflect loading state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper({ isLoading: true }),
    });

    expect(result.current.isLoading).toBe(true);
  });
});
