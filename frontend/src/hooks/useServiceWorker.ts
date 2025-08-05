import { useState, useEffect, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  isWaiting: boolean;
  isControlling: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
  error: string | null;
}

interface ServiceWorkerActions {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  update: () => Promise<void>;
  skipWaiting: () => void;
  getCacheSize: () => Promise<number>;
  clearCache: () => Promise<void>;
}

export function useServiceWorker(): ServiceWorkerState & ServiceWorkerActions {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isInstalling: false,
    isWaiting: false,
    isControlling: false,
    updateAvailable: false,
    registration: null,
    error: null,
  });

  // Registrar Service Worker
  const register = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({ 
        ...prev, 
        error: 'Service Worker no es soportado en este navegador' 
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isInstalling: true, error: null }));

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'imports',
      });

      setState(prev => ({
        ...prev,
        isRegistered: true,
        isInstalling: false,
        registration,
      }));

// Configurar listeners
      setupEventListeners(registration);

    } catch (error) {
      console.error('Error registrando Service Worker:', error);
      setState(prev => ({
        ...prev,
        isInstalling: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }));
    }
  }, [state.isSupported]);

  // Desregistrar Service Worker
  const unregister = useCallback(async () => {
    if (!state.registration) {
      return;
    }

    try {
      const success = await state.registration.unregister();
      if (success) {
        setState(prev => ({
          ...prev,
          isRegistered: false,
          registration: null,
          isWaiting: false,
          updateAvailable: false,
        }));

}
    } catch (error) {
      console.error('Error desregistrando Service Worker:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error desregistrando',
      }));
    }
  }, [state.registration]);

  // Actualizar Service Worker
  const update = useCallback(async () => {
    if (!state.registration) {
      return;
    }

    try {
      await state.registration.update();

} catch (error) {
      console.error('Error actualizando Service Worker:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error actualizando',
      }));
    }
  }, [state.registration]);

  // Saltar espera y activar nueva versión
  const skipWaiting = useCallback(() => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [state.registration]);

  // Obtener tamaño del cache
  const getCacheSize = useCallback(async (): Promise<number> => {
    if (!state.registration?.active) {
      return 0;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_SIZE') {
          resolve(event.data.size);
        }
      };

      state.registration.active.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [messageChannel.port2]
      );
    });
  }, [state.registration]);

  // Limpiar cache
  const clearCache = useCallback(async (): Promise<void> => {
    if (!state.registration?.active) {
      return;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_CLEARED') {
          resolve();
        }
      };

      state.registration.active.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    });
  }, [state.registration]);

  // Configurar event listeners para el Service Worker
  const setupEventListeners = useCallback((registration: ServiceWorkerRegistration) => {
    // Listener para actualizaciones
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      setState(prev => ({ ...prev, isInstalling: true }));

      newWorker.addEventListener('statechange', () => {
        switch (newWorker.state) {
          case 'installed':
            setState(prev => ({
              ...prev,
              isInstalling: false,
              isWaiting: true,
              updateAvailable: true,
            }));
            break;
          case 'activated':
            setState(prev => ({
              ...prev,
              isWaiting: false,
              updateAvailable: false,
              isControlling: true,
            }));
            break;
          case 'redundant':
            setState(prev => ({
              ...prev,
              isInstalling: false,
              isWaiting: false,
            }));
            break;
        }
      });
    });

    // Listener para cambios de controlador
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      setState(prev => ({ ...prev, isControlling: true }));
      // Recargar la página cuando el nuevo SW tome control
      window.location.reload();
    });

    // Verificar estado inicial
    if (registration.waiting) {
      setState(prev => ({
        ...prev,
        isWaiting: true,
        updateAvailable: true,
      }));
    }

    if (registration.active) {
      setState(prev => ({ ...prev, isControlling: true }));
    }
  }, []);

  // Auto-registrar en mount si es soportado
  useEffect(() => {
    if (state.isSupported && !state.isRegistered) {
      // Registrar después de que la página esté completamente cargada
      if (document.readyState === 'complete') {
        register();
      } else {
        window.addEventListener('load', register);
        return () => window.removeEventListener('load', register);
      }
    }
  }, [state.isSupported, state.isRegistered, register]);

  return {
    ...state,
    register,
    unregister,
    update,
    skipWaiting,
    getCacheSize,
    clearCache,
  };
}

// Hook para notificaciones push
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const { registration } = useServiceWorker();

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    setPermission(permission);
    return permission;
  }, []);

  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    if (!registration || permission !== 'granted') {
      return null;
    }

    try {
      // Aquí deberías usar tu VAPID public key
      const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || '';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      setSubscription(subscription);
      
      // Enviar la suscripción al servidor
      await fetch('/api/v1/push/subscribe/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      return subscription;
    } catch (error) {
      console.error('Error suscribiéndose a notificaciones push:', error);
      return null;
    }
  }, [registration, permission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) {
      return false;
    }

    try {
      const success = await subscription.unsubscribe();
      if (success) {
        setSubscription(null);
        
        // Notificar al servidor
        await fetch('/api/v1/push/unsubscribe/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }
      return success;
    } catch (error) {
      console.error('Error desuscribiéndose de notificaciones push:', error);
      return false;
    }
  }, [subscription]);

  // Verificar estado inicial
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    if (registration?.pushManager) {
      registration.pushManager.getSubscription().then(setSubscription);
    }
  }, [registration]);

  return {
    permission,
    subscription,
    isSupported: 'Notification' in window && 'PushManager' in window,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}

// Hook para instalación de PWA
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    // Mostrar el prompt de instalación
    (deferredPrompt as any).prompt();

    // Esperar a que el usuario responda
    const { outcome } = await (deferredPrompt as any).userChoice;
    
    setDeferredPrompt(null);
    setIsInstallable(false);
    
    return outcome === 'accepted';
  }, [deferredPrompt]);

  useEffect(() => {
    // Listener para el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listener para detectar cuando la app está instalada
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Verificar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return {
    isInstallable,
    isInstalled,
    promptInstall,
  };
}