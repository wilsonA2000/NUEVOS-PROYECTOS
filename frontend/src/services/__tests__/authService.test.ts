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

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login/', loginData);
      expect(mockApi.get).toHaveBeenCalledWith('/auth/me/');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'mock-access-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refresh', 'mock-refresh-token');
      expect(result).toEqual(mockUserResponse.data);
    });

    it('should handle login error with invalid credentials', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: {
            detail: 'Credenciales inválidas. Por favor, verifica tu email y contraseña.',
          },
        },
      };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(authService.login(loginData)).rejects.toThrow(
        'Credenciales inválidas. Por favor, verifica tu email y contraseña.'
      );

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh');
    });

    it('should handle login error with unverified account', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: {
            detail: 'Tu cuenta no está verificada. Por favor, contacta con nuestro equipo.',
          },
        },
      };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(authService.login(loginData)).rejects.toThrow(
        'Tu cuenta no está autorizada para acceder a VeriHome'
      );
    });

    it('should handle network error', async () => {
      const networkError = {
        message: 'Network Error',
      };

      mockApi.post.mockRejectedValueOnce(networkError);

      await expect(authService.login(loginData)).rejects.toThrow(
        'Error de conexión. Por favor, verifica tu conexión a internet.'
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
        'Error del servidor. Por favor, intenta nuevamente más tarde.'
      );
    });

    it('should throw error when tokens are not received', async () => {
      const mockTokenResponse = {
        data: {
          // Sin tokens
        },
        status: 200,
      };

      mockApi.post.mockResolvedValueOnce(mockTokenResponse);

      await expect(authService.login(loginData)).rejects.toThrow(
        'No se recibieron tokens válidos del servidor'
      );
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
      };

      mockApi.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.register(registerData);

      expect(mockApi.post).toHaveBeenCalledWith('/auth/register/', {
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
            detail: 'Este email ya está registrado',
          },
        },
      };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(authService.register(registerData)).rejects.toThrow(
        'Este email ya está registrado'
      );
    });

    it('should handle registration error - invalid data', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            email: ['Este campo es requerido'],
            password: ['La contraseña es muy corta'],
          },
        },
      };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(authService.register(registerData)).rejects.toThrow(
        'Datos de entrada inválidos. Por favor, verifica la información.'
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

      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout/');
    });

    it('should handle logout error', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            detail: 'Error en logout',
          },
        },
      };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(authService.logout()).rejects.toThrow();
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

      expect(mockApi.get).toHaveBeenCalledWith('/auth/me/');
      expect(result).toEqual(mockUser);
    });

    it('should handle invalid user response', async () => {
      const mockResponse = {
        data: {
          // Usuario sin email
          id: 1,
        },
      };

      mockApi.get.mockResolvedValueOnce(mockResponse);

      await expect(authService.getCurrentUser()).rejects.toThrow(
        'Usuario inválido recibido del servidor'
      );
    });

    it('should handle getCurrentUser error', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: {
            detail: 'Token inválido',
          },
        },
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

      expect(mockApi.put).toHaveBeenCalledWith('/auth/profile/', updateData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle update profile error', async () => {
      const updateData = {
        first_name: 'Updated',
      };

      const errorResponse = {
        response: {
          status: 400,
          data: {
            detail: 'Error al actualizar perfil',
          },
        },
      };

      mockApi.put.mockRejectedValueOnce(errorResponse);

      await expect(authService.updateProfile(updateData)).rejects.toThrow();
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockApi.put.mockResolvedValueOnce({ data: {} });

      await authService.changePassword('oldPassword', 'newPassword');

      expect(mockApi.put).toHaveBeenCalledWith('/auth/change-password/', {
        oldPassword: 'oldPassword',
        newPassword: 'newPassword',
      });
    });

    it('should handle change password error', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            detail: 'Contraseña actual incorrecta',
          },
        },
      };

      mockApi.put.mockRejectedValueOnce(errorResponse);

      await expect(authService.changePassword('wrong', 'new')).rejects.toThrow();
    });
  });

  describe('forgotPassword', () => {
    it('should send forgot password email successfully', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      await authService.forgotPassword('test@example.com');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/forgot-password/', {
        email: 'test@example.com',
      });
    });

    it('should handle forgot password error', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: {
            detail: 'Usuario no encontrado',
          },
        },
      };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(authService.forgotPassword('notfound@example.com')).rejects.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      await authService.resetPassword('reset-token', 'newPassword');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/reset-password/', {
        token: 'reset-token',
        newPassword: 'newPassword',
      });
    });

    it('should handle reset password error - invalid token', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            detail: 'Token inválido o expirado',
          },
        },
      };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(authService.resetPassword('invalid-token', 'newPassword')).rejects.toThrow();
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

      await expect(authService.login({
        email: 'test@example.com',
        password: 'password',
      })).rejects.toThrow(
        'Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.'
      );
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

      await expect(authService.login({
        email: 'test@example.com',
        password: 'password',
      })).rejects.toThrow(
        'Acceso denegado. Tu cuenta no tiene permisos para realizar esta acción.'
      );
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

      await expect(authService.login({
        email: 'test@example.com',
        password: 'password',
      })).rejects.toThrow(
        'Recurso no encontrado. Por favor, verifica la URL.'
      );
    });

    it('should handle generic string error', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: 'String error message',
        },
      };

      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(authService.login({
        email: 'test@example.com',
        password: 'password',
      })).rejects.toThrow('String error message');
    });
  });
});