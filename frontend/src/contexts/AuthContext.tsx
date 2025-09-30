import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { User, LoginDto, RegisterDto } from '../types/user';
import { authService } from '../services/authService';
import { clearAuthState, isAuthStateConsistent } from '../utils/clearAuthState';
import AuthErrorModal from '../components/auth/AuthErrorModal';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Define el tipo para el contexto de autenticación
interface AuthContextType extends AuthState {
  login: UseMutationResult<User, Error, LoginDto>;
  register: UseMutationResult<User, Error, RegisterDto>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  resetInactivityTimer: () => void;
  extendSession: () => void;
  showSessionWarning: boolean;
  // Estado del modal de error
  errorModal: {
    open: boolean;
    error: string;
    title: string;
  };
  showErrorModal: (error: string, title?: string) => void;
  hideErrorModal: () => void;
  // Funciones adicionales para compatibilidad
  forgotPassword?: (email: string) => Promise<void>;
  resetPassword?: (token: string, password: string, uid?: string) => Promise<void>;
  updateProfile?: (data: Partial<User>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Removido el timer de inactividad automático
  // La sesión solo se cerrará manualmente

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true, // Empieza en true para verificar el token inicial
  });

  const [showSessionWarning, setShowSessionWarning] = useState(false);

  // Estado del modal de error
  const [errorModal, setErrorModal] = useState({
    open: false,
    error: '',
    title: 'Acceso No Autorizado'
  });

  // Función para mostrar el modal de error
  const showErrorModal = useCallback((error: string, title: string = 'Acceso No Autorizado') => {
    setErrorModal({
      open: true,
      error,
      title
    });
  }, []);

  // Función para ocultar el modal de error
  const hideErrorModal = useCallback(() => {
    setErrorModal(prev => ({
      ...prev,
      open: false
    }));
  }, []);

  // Función para resetear el timer de inactividad (mantenida para compatibilidad)
  const resetInactivityTimer = useCallback(() => {
    // No hacer nada - la sesión persiste hasta logout manual
    // Removido console.log para evitar spam en consola
  }, []);

  // Función para extender la sesión (mantenida para compatibilidad)
  const extendSession = useCallback(() => {

setShowSessionWarning(false);
  }, []);

  // Función de logout - solo se ejecuta manualmente
  const logout = useCallback(async () => {

// Ocultar advertencia
    setShowSessionWarning(false);
    
    // 1. Intentar invalidar el token en el backend
    try {

await authService.logout();

} catch (error) {
      console.error('❌ Fallo al cerrar sesión en el servidor, se procederá con el logout local.', error);
    }

    // 2. Usar la utilidad de limpieza para asegurar estado limpio
    clearAuthState();

    // 3. Actualizar estado local

setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

// 4. Redirigir a la landing page usando React Router

navigate('/', { replace: true });

}, [navigate]);

  // Efecto para verificar el token al montar el componente
  useEffect(() => {
    const initializeAuth = async () => {
      // Verificar consistencia del estado antes de proceder
      if (!isAuthStateConsistent()) {

clearAuthState();
        setAuthState({ 
          user: null, 
          token: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
        return;
      }
      
      const token = localStorage.getItem('access_token');
      
      try {
        const user = await authService.getCurrentUser();
        
        // Verificar que el usuario tiene las propiedades necesarias
        if (!user || !user.email) {

clearAuthState();
          setAuthState({ 
            user: null, 
            token: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
          return;
        }
        
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        resetInactivityTimer();
      } catch (error: any) {

// Usar la utilidad de limpieza
        clearAuthState();
        // Actualizar estado para mostrar landing page
        setAuthState({ 
          user: null, 
          token: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
      }
    };
    
    // Ejecutar inicialización
    initializeAuth();
  }, []);

  // Efecto para manejar eventos de actividad del usuario
  useEffect(() => {
    if (authState.isAuthenticated) {
      const handleUserActivity = () => {
        resetInactivityTimer();
      };

      // Eventos que indican actividad del usuario
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      events.forEach(event => {
        document.addEventListener(event, handleUserActivity, true);
      });

      // Iniciar timer inicial
      resetInactivityTimer();

      // Cleanup
      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleUserActivity, true);
        });
      };
    }
  }, [authState.isAuthenticated, resetInactivityTimer]);

  // Efecto para escuchar eventos de token inválido desde el interceptor de API
  useEffect(() => {
    const handleTokenInvalid = () => {

setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    };

    const handleAuthStateCleared = () => {

setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    };

    window.addEventListener('tokenInvalid', handleTokenInvalid);
    window.addEventListener('authStateCleared', handleAuthStateCleared);

    return () => {
      window.removeEventListener('tokenInvalid', handleTokenInvalid);
      window.removeEventListener('authStateCleared', handleAuthStateCleared);
    };
  }, []);

  const handleAuthSuccess = (user: User) => {
    const token = localStorage.getItem('token');
    setAuthState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
    
    // Iniciar timer de inactividad después del login exitoso
    resetInactivityTimer();
    
    // Redirigir a la app principal, o a la página desde donde vino si está disponible
    const from = location.state?.from?.pathname || '/app';
    navigate(from, { replace: true });
  };

  const handleRegistrationSuccess = (user: User) => {
    // Para el registro, no hacer login automático
    // Solo mostrar el mensaje de éxito y redirigir a una página de verificación

navigate('/email-verification', { 
      replace: true,
      state: { 
        email: user.email,
        message: 'Se ha enviado un email de verificación a tu correo electrónico.'
      }
    });
  };

  const loginMutation = useMutation<User, Error, LoginDto>({
    mutationFn: authService.login,
    onSuccess: handleAuthSuccess,
    onError: (error: Error) => {
      console.error('❌ Error en login:', error);
      showErrorModal(error.message, 'Error de Inicio de Sesión');
    }
  });

  const registerMutation = useMutation<User, Error, RegisterDto>({
    mutationFn: authService.register,
    onSuccess: handleRegistrationSuccess,
    onError: (error: Error) => {
      console.error('❌ Error en registro:', error);
      showErrorModal(error.message, 'Error de Registro');
    }
  });

  const updateUser = useCallback((userData: Partial<User>) => {
    setAuthState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...userData } : null,
    }));
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      await authService.forgotPassword(email);
    } catch (error) {
      console.error('Error en forgot password:', error);
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (token: string, password: string, uid?: string) => {
    try {
      await authService.resetPassword(token, password, uid);
    } catch (error) {
      console.error('Error en reset password:', error);
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    ...authState,
    login: loginMutation,
    register: registerMutation,
    logout,
    updateUser,
    forgotPassword,
    resetPassword,
    resetInactivityTimer,
    extendSession,
    showSessionWarning,
    errorModal,
    showErrorModal,
    hideErrorModal,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthErrorModal
        open={errorModal.open}
        onClose={hideErrorModal}
        error={errorModal.error}
        title={errorModal.title}
      />
    </AuthContext.Provider>
  );
};

// Hook para usar el contexto de autenticación
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 