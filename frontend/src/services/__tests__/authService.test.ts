import { authService } from '../authService';
import { api } from '../api';
import { LoginDto, RegisterDto } from '../../types/user';

// Mock del API
jest.mock('../api');
const mockApi = api as jest.Mocked<typeof api>;

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  describe('login', () => {
    const loginData: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully and return user data', async () => {
      const mockTokenResponse = {
        data: {
          access: 'mock-access-token',
          refresh: 'mock-refresh-token',
        },
        status: 200,
      };

      const mockUserResponse = {
        data: {
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          user_type: 'tenant',
          is_verified: true,
        },
      };

      mockApi.post.mockResolvedValueOnce(mockTokenResponse);
      mockApi.get.mockResolvedValueOnce(mockUserResponse);

      const result = await authService.login(loginData);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/users/auth/login/',
        loginData,
      );
      expect(mockApi.get).toHaveBeenCalledWith('/users/auth/me/');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'access_token',
        'mock-access-token',
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'refresh_token',
        'mock-refresh-token',
      );
      expect(result).toEqual(mockUserResponse.data);
    });

    it('should handle login error with invalid credentials', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: {
            detail: 'Invalid credentials',
          },
        },
      };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(authService.login(loginData)).rejects.toThrow(
        'Credenciales invalidas',
      );

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
    });

    it('should handle network error', async () => {
      const networkError = {
        message: 'Network Error',
      };

      mockApi.post.mockRejectedValueOnce(networkError);

      await expect(authService.login(loginData)).rejects.toThrow(
        'Error de red',
      );
    });

    it('should handle server error', async () => {
      const serverError = {
        response: {
          status: 500,
          data: {
            detail: 'Internal server error',
          },
        },
      };

      mockApi.post.mockRejectedValueOnce(serverError);

      await expect(authService.login(loginData)).rejects.toThrow(
        'Error del servidor',
      );
    });

    it('should throw error when tokens are not received', async () => {
      const mockTokenResponse = {
        data: {
          // No tokens
        },
        status: 200,
      };

      mockApi.post.mockResolvedValueOnce(mockTokenResponse);

      // The error is processed by processError which converts it to a connection error
      await expect(authService.login(loginData)).rejects.toThrow();
    });
  });

  describe('register', () => {
    const registerData: RegisterDto = {
      email: 'new@example.com',
      password: 'password123',
      first_name: 'New',
      last_name: 'User',
      user_type: 'tenant',
      phone_number: '+1234567890',
    };

    it('should register successfully', async () => {
      const mockResponse = {
        data: {
          user_id: 1,
        },
        status: 201,
      };

      mockApi.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.register(registerData);

      expect(mockApi.post).toHaveBeenCalledWith('/users/auth/register/', {
        ...registerData,
        password2: registerData.password,
      });

      expect(result).toEqual({
        id: 1,
        email: registerData.email,
        first_name: registerData.first_name,
        last_name: registerData.last_name,
        user_type: registerData.user_type,
        is_verified: false,
        phone_number: registerData.phone_number,
        avatar: null,
      });
    });

    it('should handle registration error - email already exists', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            detail: 'Este email ya esta registrado',
          },
        },
      };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(authService.register(registerData)).rejects.toThrow(
        'Este email ya esta registrado',
      );
    });

    it('should handle registration error - invalid data', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            email: ['Este campo es requerido'],
            password: ['La contrasena es muy corta'],
          },
        },
      };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(authService.register(registerData)).rejects.toThrow(
        'Datos de entrada invalidos',
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockResponse = {
        status: 200,
      };

      mockApi.post.mockResolvedValueOnce(mockResponse);

      await authService.logout();

      expect(mockApi.post).toHaveBeenCalledWith('/users/auth/logout/');
    });

    it('should handle logout error', async () => {
      const errorResponse = new Error('Error en logout');

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(authService.logout()).rejects.toThrow('Error en logout');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'tenant',
        is_verified: true,
      };

      const mockResponse = {
        data: mockUser,
      };

      mockApi.get.mockResolvedValueOnce(mockResponse);

      const result = await authService.getCurrentUser();

      expect(mockApi.get).toHaveBeenCalledWith('/users/auth/me/');
      expect(result).toEqual(mockUser);
    });

    it('should handle invalid user response', async () => {
      const mockResponse = {
        data: {
          // User without email
          id: 1,
        },
      };

      mockApi.get.mockResolvedValueOnce(mockResponse);

      await expect(authService.getCurrentUser()).rejects.toThrow(
        'Usuario invalido recibido del servidor',
      );
    });

    it('should handle getCurrentUser error', async () => {
      const errorResponse = new Error('Token invalido');
      (errorResponse as any).response = {
        status: 401,
        data: { detail: 'Token invalido' },
      };

      mockApi.get.mockRejectedValueOnce(errorResponse);

      await expect(authService.getCurrentUser()).rejects.toThrow();
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updateData = {
        first_name: 'Updated',
        phone_number: '+0987654321',
      };

      const mockResponse = {
        data: {
          id: 1,
          email: 'test@example.com',
          first_name: 'Updated',
          last_name: 'User',
          user_type: 'tenant',
          phone_number: '+0987654321',
          is_verified: true,
        },
      };

      mockApi.put.mockResolvedValueOnce(mockResponse);

      const result = await authService.updateProfile(updateData);

      expect(mockApi.put).toHaveBeenCalledWith('/users/profile/', updateData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle update profile error', async () => {
      const updateData = {
        first_name: 'Updated',
      };

      const errorResponse = new Error('Error al actualizar perfil');

      mockApi.put.mockRejectedValueOnce(errorResponse);

      await expect(authService.updateProfile(updateData)).rejects.toThrow(
        'Error al actualizar perfil',
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockApi.put.mockResolvedValueOnce({ data: {} });

      await authService.changePassword('oldPassword', 'newPassword');

      expect(mockApi.put).toHaveBeenCalledWith('/users/auth/change-password/', {
        oldPassword: 'oldPassword',
        newPassword: 'newPassword',
      });
    });

    it('should handle change password error', async () => {
      const errorResponse = new Error('Contrasena actual incorrecta');

      mockApi.put.mockRejectedValueOnce(errorResponse);

      await expect(authService.changePassword('wrong', 'new')).rejects.toThrow(
        'Contrasena actual incorrecta',
      );
    });
  });

  describe('forgotPassword', () => {
    it('should send forgot password email successfully', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      await authService.forgotPassword('test@example.com');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/users/auth/forgot-password/',
        {
          email: 'test@example.com',
        },
      );
    });

    it('should handle forgot password error', async () => {
      const errorResponse = new Error('Usuario no encontrado');

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(
        authService.forgotPassword('notfound@example.com'),
      ).rejects.toThrow('Usuario no encontrado');
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      await authService.resetPassword('reset-token', 'newPassword');

      expect(mockApi.post).toHaveBeenCalledWith('/users/auth/reset-password/', {
        token: 'reset-token',
        newPassword: 'newPassword',
      });
    });

    it('should handle reset password error - invalid token', async () => {
      const errorResponse = new Error('Token invalido o expirado');

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(
        authService.resetPassword('invalid-token', 'newPassword'),
      ).rejects.toThrow('Token invalido o expirado');
    });
  });

  describe('Error Processing', () => {
    it('should handle rate limiting error', async () => {
      const errorResponse = {
        response: {
          status: 429,
          data: {
            detail: 'Too many requests',
          },
        },
      };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'password',
        }),
      ).rejects.toThrow('Demasiadas solicitudes');
    });

    it('should handle forbidden error', async () => {
      const errorResponse = {
        response: {
          status: 403,
          data: {
            detail: 'Access denied',
          },
        },
      };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'password',
        }),
      ).rejects.toThrow('Acceso denegado');
    });

    it('should handle not found error', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: {
            detail: 'Not found',
          },
        },
      };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'password',
        }),
      ).rejects.toThrow('Recurso no encontrado');
    });

    it('should handle generic string error', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: 'String error message',
        },
      };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'password',
        }),
      ).rejects.toThrow('String error message');
    });
  });
});
