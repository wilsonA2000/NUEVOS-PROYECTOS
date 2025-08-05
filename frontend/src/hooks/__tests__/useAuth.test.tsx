import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../useAuth';
import { AuthProvider } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';

// Mock auth service
jest.mock('../../services/authService');
const mockAuthService = authService as jest.Mocked<typeof authService>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    state: null,
  }),
}));

// Mock auth error modal
jest.mock('../../components/auth/AuthErrorModal', () => {
  return function MockAuthErrorModal({ open, error, title }: any) {
    return open ? <div data-testid="auth-error-modal">{error}</div> : null;
  };
});

// Mock clearAuthState utility
jest.mock('../../utils/clearAuthState', () => ({
  clearAuthState: jest.fn(),
  isAuthStateConsistent: jest.fn(() => true),
}));

// Test wrapper with all necessary providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    mockAuthService.getCurrentUser.mockRejectedValue(new Error('No user'));
  });

  it('should throw error when used outside AuthProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth debe ser utilizado dentro de un AuthProvider');
    
    consoleError.mockRestore();
  });

  it('should provide initial auth state', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    // Initially loading should be true
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);

    // Wait for initialization to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should initialize with authenticated user when token exists', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'tenant' as const,
      is_verified: true,
    };

    localStorageMock.getItem.mockReturnValue('valid-token');
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle login successfully', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'tenant' as const,
      is_verified: true,
    };

    localStorageMock.getItem.mockReturnValue('new-token');
    mockAuthService.login.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    // Wait for initial loading
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Perform login
    await act(async () => {
      await result.current.login.mutateAsync({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(mockNavigate).toHaveBeenCalledWith('/app', { replace: true });
    });
  });

  it('should handle login error', async () => {
    const errorMessage = 'Invalid credentials';
    mockAuthService.login.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.login.mutateAsync({
          email: 'test@example.com',
          password: 'wrongpassword',
        });
      } catch (error) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.errorModal.open).toBe(true);
      expect(result.current.errorModal.error).toBe(errorMessage);
    });
  });

  it('should handle logout successfully', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'tenant' as const,
      is_verified: true,
    };

    // Setup authenticated state
    localStorageMock.getItem.mockReturnValue('valid-token');
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
    mockAuthService.logout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    // Wait for authentication
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Perform logout
    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      expect(mockAuthService.logout).toHaveBeenCalled();
    });
  });

  it('should handle registration successfully', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'tenant' as const,
      is_verified: false,
    };

    mockAuthService.register.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.register.mutateAsync({
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
        role: 'tenant',
        interview_code: '123456',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        replace: true,
        state: {
          message: 'Registro exitoso. Por favor, verifica tu email antes de iniciar sesión.',
          email: mockUser.email,
        },
      });
    });
  });

  it('should handle registration error', async () => {
    const errorMessage = 'Email already exists';
    mockAuthService.register.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.register.mutateAsync({
          email: 'test@example.com',
          password: 'password123',
          first_name: 'Test',
          last_name: 'User',
          role: 'tenant',
          interview_code: '123456',
        });
      } catch (error) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.errorModal.open).toBe(true);
      expect(result.current.errorModal.error).toBe(errorMessage);
    });
  });

  it('should update user data', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'tenant' as const,
      is_verified: true,
    };

    localStorageMock.getItem.mockReturnValue('valid-token');
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    act(() => {
      result.current.updateUser({ first_name: 'Updated' });
    });

    expect(result.current.user?.first_name).toBe('Updated');
  });

  it('should handle error modal operations', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Show error modal
    act(() => {
      result.current.showErrorModal('Test error', 'Test title');
    });

    expect(result.current.errorModal.open).toBe(true);
    expect(result.current.errorModal.error).toBe('Test error');
    expect(result.current.errorModal.title).toBe('Test title');

    // Hide error modal
    act(() => {
      result.current.hideErrorModal();
    });

    expect(result.current.errorModal.open).toBe(false);
  });

  it('should handle session extension', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.extendSession();
    });

    expect(result.current.showSessionWarning).toBe(false);
  });

  it('should handle inactivity timer reset', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // This should not throw or cause any issues
    act(() => {
      result.current.resetInactivityTimer();
    });

    // Since timer is disabled, nothing should change
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should clear auth state when token is invalid', async () => {
    localStorageMock.getItem.mockReturnValue('invalid-token');
    mockAuthService.getCurrentUser.mockRejectedValue(new Error('Invalid token'));

    const { result } = renderHook(() => useAuth(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
    });
  });
});