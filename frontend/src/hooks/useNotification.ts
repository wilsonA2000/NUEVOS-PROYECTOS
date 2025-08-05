import { useCallback, useState } from 'react';
import { toast, ToastOptions } from 'react-toastify';
import { useLanguage } from './useLanguage';

interface NotificationState {
  open: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  duration?: number;
}

export const useNotification = () => {
  const { t } = useLanguage();
  
  // Estado para notificaciones personalizadas
  const [customNotification, setCustomNotification] = useState<NotificationState>({
    open: false,
    message: '',
    type: 'info',
    duration: 6000
  });

  const defaultOptions: ToastOptions = {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };

  // Funciones para toast (mantenidas para compatibilidad)
  const success = useCallback((message: string, options?: ToastOptions) => {
    toast.success(t(message), { ...defaultOptions, ...options });
  }, [t]);

  const error = useCallback((message: string, options?: ToastOptions) => {
    toast.error(t(message), { ...defaultOptions, ...options });
  }, [t]);

  const info = useCallback((message: string, options?: ToastOptions) => {
    toast.info(t(message), { ...defaultOptions, ...options });
  }, [t]);

  const warning = useCallback((message: string, options?: ToastOptions) => {
    toast.warning(t(message), { ...defaultOptions, ...options });
  }, [t]);

  // Funciones para notificaciones personalizadas
  const showCustomNotification = useCallback((
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    title?: string,
    duration?: number
  ) => {
    setCustomNotification({
      open: true,
      message: t(message),
      type,
      title: title ? t(title) : undefined,
      duration: duration || 6000
    });
  }, [t]);

  const hideCustomNotification = useCallback(() => {
    setCustomNotification(prev => ({
      ...prev,
      open: false
    }));
  }, []);

  const showCustomSuccess = useCallback((message: string, title?: string) => {
    showCustomNotification(message, 'success', title, 4000);
  }, [showCustomNotification]);

  const showCustomError = useCallback((message: string, title?: string) => {
    showCustomNotification(message, 'error', title, 8000);
  }, [showCustomNotification]);

  const showCustomWarning = useCallback((message: string, title?: string) => {
    showCustomNotification(message, 'warning', title, 6000);
  }, [showCustomNotification]);

  const showCustomInfo = useCallback((message: string, title?: string) => {
    showCustomNotification(message, 'info', title, 5000);
  }, [showCustomNotification]);

  return {
    // Toast functions (legacy)
    success,
    error,
    info,
    warning,
    
    // Custom notification functions
    customNotification,
    showCustomNotification,
    hideCustomNotification,
    showCustomSuccess,
    showCustomError,
    showCustomWarning,
    showCustomInfo
  };
}; 