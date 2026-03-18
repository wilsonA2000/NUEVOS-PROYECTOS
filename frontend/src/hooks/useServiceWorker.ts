import { useState, useEffect, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  isWaiting: boolean;
  isControlling: boolean;
  updateAvailable: boolean;
  isOffline: boolean;
  registration: ServiceWorkerRegistration | null;
  error: string | null;
}

interface ServiceWorkerActions {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  update: () => Promise<void>;
  updateApp: () => void;
  skipWaiting: () => void;
  getCacheSize: () => Promise<number>;
  clearCache: () => Promise<void>;
}

// Singleton for the SW update callback from vite-plugin-pwa
let updateSWCallback: ((reloadPage?: boolean) => Promise<void>) | null = null;
let swRegistered = false;

export function useServiceWorker(): ServiceWorkerState & ServiceWorkerActions {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isInstalling: false,
    isWaiting: false,
    isControlling: false,
    updateAvailable: false,
    isOffline: !navigator.onLine,
    registration: null,
    error: null,
  });

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOffline: false }));
    };
    const handleOffline = () => {
      setState(prev => ({ ...prev, isOffline: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register vite-plugin-pwa service worker
  const register = useCallback(async () => {
    if (!state.isSupported || swRegistered) {
      return;
    }

    try {
      setState(prev => ({ ...prev, isInstalling: true, error: null }));

      const updateSW = registerSW({
        immediate: true,
        onRegisteredSW(swUrl, registration) {
          setState(prev => ({
            ...prev,
            isRegistered: true,
            isInstalling: false,
            registration: registration || null,
            isControlling: !!registration?.active,
          }));

          // Check for updates periodically (every hour)
          if (registration) {
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000);
          }
        },
        onRegisterError(error) {
          console.error('Error registrando Service Worker:', error);
          setState(prev => ({
            ...prev,
            isInstalling: false,
            error: error instanceof Error ? error.message : 'Error desconocido al registrar SW',
          }));
        },
        onNeedRefresh() {
          setState(prev => ({
            ...prev,
            updateAvailable: true,
            isWaiting: true,
          }));
        },
        onOfflineReady() {
          setState(prev => ({
            ...prev,
            isRegistered: true,
            isControlling: true,
          }));
        },
      });

      updateSWCallback = updateSW;
      swRegistered = true;
    } catch (error) {
      console.error('Error registrando Service Worker:', error);
      setState(prev => ({
        ...prev,
        isInstalling: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }));
    }
  }, [state.isSupported]);

  // Update the app (reload with new SW)
  const updateApp = useCallback(() => {
    if (updateSWCallback) {
      updateSWCallback(true);
    }
  }, []);

  // Alias for backward compatibility
  const skipWaiting = useCallback(() => {
    updateApp();
  }, [updateApp]);

  // Desregistrar Service Worker
  const unregister = useCallback(async () => {
    if (!state.registration) {
      return;
    }

    try {
      const success = await state.registration.unregister();
      if (success) {
        swRegistered = false;
        updateSWCallback = null;
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

  // Obtener tamano del cache
  const getCacheSize = useCallback(async (): Promise<number> => {
    try {
      const cacheNames = await caches.keys();
      let totalEntries = 0;
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        totalEntries += keys.length;
      }
      return totalEntries;
    } catch {
      return 0;
    }
  }, []);

  // Limpiar cache
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    } catch (error) {
      console.error('Error limpiando cache:', error);
    }
  }, []);

  // Auto-registrar en mount
  useEffect(() => {
    if (state.isSupported && !swRegistered) {
      if (document.readyState === 'complete') {
        register();
      } else {
        window.addEventListener('load', register);
        return () => window.removeEventListener('load', register);
      }
    }
    return undefined;
  }, [state.isSupported, register]);

  return {
    ...state,
    register,
    unregister,
    update,
    updateApp,
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

    const perm = await Notification.requestPermission();
    setPermission(perm);
    return perm;
  }, []);

  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    if (!registration || permission !== 'granted') {
      return null;
    }

    try {
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      setSubscription(sub);

      await fetch('/api/v1/push/subscribe/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sub),
      });

      return sub;
    } catch (error) {
      console.error('Error suscribiendose a notificaciones push:', error);
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
      console.error('Error desuscribiendose de notificaciones push:', error);
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

// Hook para instalacion de PWA
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    (deferredPrompt as any).prompt();
    const { outcome } = await (deferredPrompt as any).userChoice;

    setDeferredPrompt(null);
    setIsInstallable(false);

    return outcome === 'accepted';
  }, [deferredPrompt]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

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
