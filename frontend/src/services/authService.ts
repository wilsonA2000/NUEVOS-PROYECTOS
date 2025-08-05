import { api } from './api';
import { User, LoginDto, RegisterDto, UpdateProfileDto, AuthResponse } from '../types/user';

// Función para procesar errores y devolver mensajes amigables
const processError = (error: any): Error => {
  console.error('❌ Error procesado:', error);
  
  // Si es un error de red
  if (!error.response) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      return new Error('🔌 No se puede conectar con el servidor VeriHome.\n\n• Verifica que el servidor esté ejecutándose\n• Comprueba tu conexión a internet\n• Si el problema persiste, contacta soporte');
    }
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return new Error('🌐 Error de red.\n\n• Verifica tu conexión a internet\n• Intenta recargar la página\n• Si el problema persiste, contacta soporte');
    }
    if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
      return new Error('⏱️ La petición tardó demasiado tiempo.\n\n• Verifica tu conexión a internet\n• Intenta nuevamente en unos segundos');
    }
    return new Error('🔌 Error de conexión.\n\n• Verifica tu conexión a internet\n• Asegúrate de que el servidor esté disponible');
  }
  
  const { status, data } = error.response;
  
  // Errores específicos del backend con tipos
  if (status === 400 && data?.error_type) {
    switch (data.error_type) {
      case 'missing_fields':
        return new Error('📝 Faltan campos requeridos.\n\n• Email y contraseña son obligatorios\n• Completa todos los campos e intenta nuevamente');
      
      case 'user_not_found':
        return new Error(`👤 No existe una cuenta con el email:\n${data.email || 'el email proporcionado'}\n\n• Verifica que el email sea correcto\n• ¿Necesitas registrarte?`);
      
      case 'invalid_password':
        return new Error(`🔑 La contraseña es incorrecta.\n\n• Verifica que la contraseña sea correcta\n• ¿Olvidaste tu contraseña?`);
      
      case 'email_not_verified':
        return new Error(`📧 Tu cuenta no ha sido verificada.\n\n• Revisa tu email (incluyendo spam)\n• Confirma tu cuenta haciendo clic en el enlace\n• ¿No recibiste el email?`);
      
      case 'account_disabled':
        return new Error(`🚫 Tu cuenta ha sido desactivada.\n\n• Contacta al soporte para reactivarla\n• Email: soporte@verihome.com`);
      
      case 'token_generation_error':
        return new Error('🔐 Error generando tokens de acceso.\n\n• Intenta nuevamente en unos segundos\n• Si persiste, contacta soporte');
      
      default:
        return new Error(data.detail || 'Error de validación. Verifica los datos ingresados.');
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
    return new Error('📝 Datos de entrada inválidos.\n\nPor favor, verifica la información ingresada.');
  }
  
  if (status === 401) {
    return new Error('🚫 Credenciales inválidas.\n\n• Verifica tu email y contraseña\n• ¿Olvidaste tu contraseña?');
  }
  
  if (status === 403) {
    return new Error('🚫 Acceso denegado.\n\nTu cuenta no tiene permisos para esta acción.');
  }
  
  if (status === 404) {
    return new Error('❓ Recurso no encontrado.\n\nPor favor, verifica la URL o contacta soporte.');
  }
  
  if (status === 429) {
    return new Error('⏱️ Demasiadas solicitudes.\n\n• Espera un momento antes de intentar\n• El límite se restablece en unos minutos');
  }
  
  if (status >= 500) {
    return new Error('🔧 Error del servidor.\n\n• Intenta nuevamente más tarde\n• Si persiste, contacta soporte');
  }
  
  // Error genérico
  return new Error(data?.detail || data?.message || '❌ Ha ocurrido un error inesperado.');
};

export const authService = {
  async login(data: LoginDto): Promise<User> {

try {
      const response = await api.post('/users/auth/login/', data);
      
      // Verificar si hay un error en la respuesta
      if (response.status >= 400) {
        console.error('❌ Error en login:', response.data);
        throw processError({
          response: {
            data: response.data,
            status: response.status
          }
        });
      }

const { access, refresh } = response.data;
      
      // Solo guardar tokens si realmente tenemos tokens válidos
      if (access && refresh) {
        localStorage.setItem('token', access);
        localStorage.setItem('refresh', refresh);
        
        // Obtener el usuario actual con el token

const userResponse = await api.get('/users/auth/me/');

return userResponse.data;
      } else {
        throw new Error('🔐 No se recibieron tokens válidos del servidor.\n\nIntenta nuevamente o contacta soporte.');
      }
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      // Limpiar cualquier token inválido
      localStorage.removeItem('token');
      localStorage.removeItem('refresh');
      throw processError(error);
    }
  },

  async register(data: RegisterDto): Promise<User> {

try {
      // Backend expects password2 field for confirmation
      const registrationData = {
        ...data,
        password2: data.password
      };
      
      // Si el interview_code está vacío, no enviarlo al backend
      if (!registrationData.interview_code || registrationData.interview_code.trim() === '') {
        delete registrationData.interview_code;
      }
      
      const response = await api.post('/users/auth/register/', registrationData);
      
      // Verificar si la respuesta es realmente exitosa
      if (response.status >= 400) {
        console.error('❌ Error en registro (status >= 400):', response.data);
        throw processError({
          response: {
            data: response.data,
            status: response.status
          }
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
        avatar: null
      } as unknown as User;
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      throw processError(error);
    }
  },

  async logout(): Promise<void> {
    console.log('🔓 AuthService.logout - Iniciando...');
    const token = getStoredToken();
    console.log('🔑 Token:', token ? 'Presente' : 'No presente');
    
    try {
      const response = await api.post('/users/auth/logout/');
      console.log('✅ Logout del servidor exitoso:', response.status);
    } catch (error: any) {
      console.error('❌ Error en logout del servidor:', error);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Data:', error.response?.data);
      console.error('❌ Message:', error.message);
      throw error;
    }
  },

  async getCurrentUser(): Promise<User> {

try {
      const response = await api.get<User>('/users/auth/me/');

// Verificar que la respuesta contiene un usuario válido
      if (!response.data || !response.data.email) {
        console.error('❌ Respuesta de usuario inválida:', response.data);
        throw new Error('Usuario inválido recibido del servidor');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Error obteniendo usuario actual:', error);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Data:', error.response?.data);
      throw error;
    }
  },

  async updateProfile(data: UpdateProfileDto): Promise<User> {

try {
      const response = await api.put<User>('/auth/profile/', data);

return response.data;
    } catch (error: any) {
      console.error('❌ Error actualizando perfil:', error);
      throw error;
    }
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {

try {
      await api.put('/auth/change-password/', { oldPassword, newPassword });

} catch (error: any) {
      console.error('❌ Error cambiando contraseña:', error);
      throw error;
    }
  },

  async forgotPassword(email: string): Promise<void> {

try {
      await api.post('/auth/forgot-password/', { email });

} catch (error: any) {
      console.error('❌ Error solicitando restablecimiento:', error);
      throw error;
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {

try {
      await api.post('/auth/reset-password/', { token, newPassword });

} catch (error: any) {
      console.error('❌ Error restableciendo contraseña:', error);
      throw error;
    }
  },
}; 