import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../useAuth';
import { authService } from '../../services/authService';
import { toast } from 'react-toastify';

// Mocks
jest.mock('../../services/authService');
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Crear wrapper para los tests
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('useAuth Hook', () => {
  const mockLogin = authService.login as jest.MockedFunction<typeof authService.login>;
  const mockLogout = authService.logout as jest.MockedFunction<typeof authService.logout>;
  const mockRegister = authService.register as jest.MockedFunction<typeof authService.register>;
  const mockGetCurrentUser = authService.getCurrentUser as jest.MockedFunction<
    typeof authService.getCurrentUser
  >;
  const mockUpdateProfile = authService.updateProfile as jest.MockedFunction<
    typeof authService.updateProfile
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should start with unauthenticated state when no token', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(true);
    });

    it('should attempt to fetch user when token exists', async () => {
      localStorage.setItem('token', 'valid-token');
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'tenant',
        is_verified: true,
      };

      mockGetCurrentUser.mockResolvedValueOnce(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should handle error when fetching user with invalid token', async () => {
      localStorage.setItem('token', 'invalid-token');
      mockGetCurrentUser.mockRejectedValueOnce(new Error('Invalid token'));

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
        expect(localStorage.getItem('token')).toBeNull();
      });
    });
  });

  describe('Login', () => {
    it('should successfully login user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'tenant',
        is_verified: true,
      };

      mockLogin.mockResolvedValueOnce(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(toast.success).toHaveBeenCalledWith('¡Bienvenido de vuelta!');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('should handle login error', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Credenciales inválidas'));

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.login({
            email: 'test@example.com',
            password: 'wrongpassword',
          });
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Credenciales inválidas');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should redirect to custom path after login', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'landlord',
        is_verified: true,
      };

      mockLogin.mockResolvedValueOnce(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.login(
          {
            email: 'test@example.com',
            password: 'password123',
          },
          '/properties'
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith('/properties');
    });
  });

  describe('Logout', () => {
    it('should successfully logout user', async () => {
      // Primero establecer un usuario autenticado
      localStorage.setItem('token', 'valid-token');
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'tenant',
        is_verified: true,
      };

      mockGetCurrentUser.mockResolvedValueOnce(mockUser);
      mockLogout.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      // Esperar a que se cargue el usuario
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Realizar logout
      await act(async () => {
        await result.current.logout();
      });

      expect(mockLogout).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refresh')).toBeNull();
      expect(toast.success).toHaveBeenCalledWith('Sesión cerrada exitosamente');
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should handle logout error gracefully', async () => {
      mockLogout.mockRejectedValueOnce(new Error('Server error'));

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.logout();
      });

      // Aún debe limpiar el estado local
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Register', () => {
    it('should successfully register user', async () => {
      const mockUser = {
        id: 1,
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        user_type: 'tenant',
        is_verified: false,
      };

      mockRegister.mockResolvedValueOnce(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.register({
          email: 'new@example.com',
          password: 'password123',
          first_name: 'New',
          last_name: 'User',
          user_type: 'tenant',
        });
      });

      expect(mockRegister).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        first_name: 'New',
        last_name: 'User',
        user_type: 'tenant',
      });

      expect(toast.success).toHaveBeenCalledWith(
        'Registro exitoso. Por favor, revisa tu email para verificar tu cuenta.'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should handle registration error', async () => {
      mockRegister.mockRejectedValueOnce(new Error('Email ya existe'));

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.register({
            email: 'existing@example.com',
            password: 'password123',
            first_name: 'New',
            last_name: 'User',
            user_type: 'tenant',
          });
        } catch (error) {
          // Expected error
        }
      });

      expect(toast.error).toHaveBeenCalledWith('Email ya existe');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Update Profile', () => {
    it('should successfully update user profile', async () => {
      // Establecer usuario inicial
      const initialUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'tenant',
        is_verified: true,
      };

      const updatedUser = {
        ...initialUser,
        first_name: 'Updated',
        phone_number: '+1234567890',
      };

      localStorage.setItem('token', 'valid-token');
      mockGetCurrentUser.mockResolvedValueOnce(initialUser);
      mockUpdateProfile.mockResolvedValueOnce(updatedUser);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      // Esperar carga inicial
      await waitFor(() => {
        expect(result.current.user).toEqual(initialUser);
      });

      // Actualizar perfil
      await act(async () => {
        await result.current.updateProfile({
          first_name: 'Updated',
          phone_number: '+1234567890',
        });
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        first_name: 'Updated',
        phone_number: '+1234567890',
      });

      expect(result.current.user).toEqual(updatedUser);
      expect(toast.success).toHaveBeenCalledWith('Perfil actualizado exitosamente');
    });

    it('should handle update profile error', async () => {
      const initialUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'tenant',
        is_verified: true,
      };

      localStorage.setItem('token', 'valid-token');
      mockGetCurrentUser.mockResolvedValueOnce(initialUser);
      mockUpdateProfile.mockRejectedValueOnce(new Error('Error al actualizar'));

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      // Esperar carga inicial
      await waitFor(() => {
        expect(result.current.user).toEqual(initialUser);
      });

      // Intentar actualizar perfil
      await act(async () => {
        try {
          await result.current.updateProfile({
            first_name: 'Updated',
          });
        } catch (error) {
          // Expected error
        }
      });

      // El usuario debe permanecer sin cambios
      expect(result.current.user).toEqual(initialUser);
      expect(toast.error).toHaveBeenCalledWith('Error al actualizar');
    });
  });

  describe('Check Authentication', () => {
    it('should return true when user is authenticated', async () => {
      localStorage.setItem('token', 'valid-token');
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'tenant',
        is_verified: true,
      };

      mockGetCurrentUser.mockResolvedValueOnce(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const isAuth = result.current.checkAuth();
      expect(isAuth).toBe(true);
    });

    it('should return false when user is not authenticated', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      const isAuth = result.current.checkAuth();
      expect(isAuth).toBe(false);
    });

    it('should redirect to login when checking auth fails', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      result.current.checkAuth('/protected-route');

      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: { from: '/protected-route' },
      });
    });
  });

  describe('Role-based Access', () => {
    it('should check if user has specific role', async () => {
      localStorage.setItem('token', 'valid-token');
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'landlord',
        is_verified: true,
      };

      mockGetCurrentUser.mockResolvedValueOnce(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(result.current.hasRole('landlord')).toBe(true);
      expect(result.current.hasRole('tenant')).toBe(false);
      expect(result.current.hasRole('service_provider')).toBe(false);
    });

    it('should return false for role check when not authenticated', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      expect(result.current.hasRole('landlord')).toBe(false);
      expect(result.current.hasRole('tenant')).toBe(false);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token when expired', async () => {
      localStorage.setItem('token', 'expired-token');
      localStorage.setItem('refresh', 'valid-refresh-token');

      // Primera llamada falla con 401
      mockGetCurrentUser.mockRejectedValueOnce({
        response: { status: 401 },
      });

      // Después del refresh, funciona
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'tenant',
        is_verified: true,
      };
      mockGetCurrentUser.mockResolvedValueOnce(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
      });
    });
  });
});