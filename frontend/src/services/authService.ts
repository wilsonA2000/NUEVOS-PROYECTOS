import { api } from './api';
import { User, LoginDto, RegisterDto, UpdateProfileDto, AuthResponse } from '../types/user';

// Función para procesar errores y devolver mensajes amigables
const processError = (error: any): Error => {
  // Si es un error de red
  if (!error.response) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      return new Error('No se puede conectar con el servidor VeriHome.\n\nVerifica que el servidor este ejecutandose.');
    }
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return new Error('Error de red.\n\nVerifica tu conexion a internet.');
    }
    if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
      return new Error('La peticion tardo demasiado tiempo.\n\nIntenta nuevamente en unos segundos.');
    }
    return new Error('Error de conexion.\n\nVerifica tu conexion a internet.');
  }

  const { status, data } = error.response;

  // Errores específicos del backend con tipos
  if (status === 400 && data?.error_type) {
    switch (data.error_type) {
      case 'missing_fields':
        return new Error('Faltan campos requeridos.\n\nEmail y contrasena son obligatorios.');

      case 'user_not_found':
        return new Error(`No existe una cuenta con el email:\n${data.email || 'el email proporcionado'}\n\nVerifica que el email sea correcto.`);

      case 'invalid_password':
        return new Error('La contrasena es incorrecta.\n\nVerifica que la contrasena sea correcta.');

      case 'email_not_verified':
        return new Error('Tu cuenta no ha sido verificada.\n\nRevisa tu email (incluyendo spam).');

      case 'account_disabled':
        return new Error('Tu cuenta ha sido desactivada.\n\nContacta al soporte para reactivarla.');

      case 'token_generation_error':
        return new Error('Error generando tokens de acceso.\n\nIntenta nuevamente en unos segundos.');

      default:
        return new Error(data.detail || 'Error de validacion. Verifica los datos ingresados.');
    }
  }

  // Otros errores 400 sin tipo específico
  if (status === 400) {
    if (data?.detail) {
      return new Error(data.detail);
    }
    if (data?.error) {
      return new Error(data.error);
    }
    if (typeof data === 'string') {
      return new Error(data);
    }
    return new Error('Datos de entrada invalidos.\n\nPor favor, verifica la informacion ingresada.');
  }

  if (status === 401) {
    return new Error('Credenciales invalidas.\n\nVerifica tu email y contrasena.');
  }

  if (status === 403) {
    return new Error('Acceso denegado.\n\nTu cuenta no tiene permisos para esta accion.');
  }

  if (status === 404) {
    return new Error('Recurso no encontrado.\n\nPor favor, verifica la URL o contacta soporte.');
  }

  if (status === 429) {
    return new Error('Demasiadas solicitudes.\n\nEspera un momento antes de intentar.');
  }

  if (status >= 500) {
    return new Error('Error del servidor.\n\nIntenta nuevamente mas tarde.');
  }

  // Error genérico
  return new Error(data?.detail || data?.message || 'Ha ocurrido un error inesperado.');
};

export const authService = {
  async login(data: LoginDto): Promise<User> {

try {
      const response = await api.post('/users/auth/login/', data);

      // Verificar si hay un error en la respuesta
      if (response.status >= 400) {
        throw processError({
          response: {
            data: response.data,
            status: response.status,
          },
        });
      }

const { access, refresh } = response.data;

      // Solo guardar tokens si realmente tenemos tokens válidos
      if (access && refresh) {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);

        // Obtener el usuario actual con el token

const userResponse = await api.get('/users/auth/me/');

return userResponse.data;
      } else {
        throw new Error('No se recibieron tokens validos del servidor.\n\nIntenta nuevamente o contacta soporte.');
      }
    } catch (error: any) {
      // Limpiar cualquier token inválido
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      throw processError(error);
    }
  },

  async register(data: RegisterDto): Promise<User> {

try {
      // Backend expects password2 field for confirmation
      const registrationData = {
        ...data,
        password2: data.password,
      };

      // Si el interview_code está vacío, no enviarlo al backend
      if (!registrationData.interview_code || registrationData.interview_code.trim() === '') {
        delete registrationData.interview_code;
      }

      const response = await api.post('/users/auth/register/', registrationData);

      // Verificar si la respuesta es realmente exitosa
      if (response.status >= 400) {
        throw processError({
          response: {
            data: response.data,
            status: response.status,
          },
        });
      }

// El registro exitoso no debe hacer login automático
      // Solo devolver la información del usuario creado
      return {
        id: response.data.user_id,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        user_type: data.user_type,
        is_verified: false, // El usuario no está verificado hasta confirmar email
        phone_number: data.phone_number || '',
        avatar: null,
      } as unknown as User;
    } catch (error: any) {
      throw processError(error);
    }
  },

  async logout(): Promise<void> {
    // Obtener token del localStorage o sessionStorage
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');

    try {
      await api.post('/users/auth/logout/');
    } catch (error: any) {
      throw error;
    }
  },

  async getCurrentUser(): Promise<User> {

try {
      const response = await api.get<User>('/users/auth/me/');

// Verificar que la respuesta contiene un usuario válido
      if (!response.data || !response.data.email) {
        throw new Error('Usuario invalido recibido del servidor');
      }

      return response.data;
    } catch (error: any) {
      // Si es 401, es esperado cuando no hay token válido
      if (error.response?.status === 401) {
        throw error;
      }
      throw error;
    }
  },

  async updateProfile(data: UpdateProfileDto): Promise<User> {

try {
      const response = await api.put<User>('/users/profile/', data);

return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {

try {
      await api.put('/users/auth/change-password/', { oldPassword, newPassword });

} catch (error: any) {
      throw error;
    }
  },

  async forgotPassword(email: string): Promise<void> {

try {
      await api.post('/users/auth/forgot-password/', { email });

} catch (error: any) {
      throw error;
    }
  },

  async resetPassword(token: string, newPassword: string, uid?: string): Promise<void> {

try {
      await api.post('/users/auth/reset-password/', { token, newPassword, uid });

} catch (error: any) {
      throw error;
    }
  },
};
/* Cache busted: 2025-08-06T04:42:27.058Z - AUTH_SERVICE */