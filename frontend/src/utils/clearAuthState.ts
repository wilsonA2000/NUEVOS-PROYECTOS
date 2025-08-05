// Track limpiezas para evitar duplicados
let lastClearTime = 0;
const CLEAR_DEBOUNCE_MS = 1000; // 1 segundo entre limpiezas

/**
 * Utilidad para limpiar completamente el estado de autenticación
 * Esto fuerza un estado limpio cuando hay inconsistencias
 * Incluye debouncing para evitar limpiezas repetitivas
 */
export const clearAuthState = () => {
  const now = Date.now();
  
  // Evitar limpiezas repetitivas
  if (now - lastClearTime < CLEAR_DEBOUNCE_MS) {
    console.log('🔒 clearAuthState: Debounce - skipping clear (demasiado reciente)');
    return;
  }
  
  lastClearTime = now;

  // Limpiar solo tokens y datos de autenticación específicos
  const authKeys = ['token', 'refresh', 'user', 'authState'];
  authKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);

}
  });

// Disparar evento para notificar a otros componentes
  window.dispatchEvent(new CustomEvent('authStateCleared'));
  
  // Solo redirigir si estamos en una ruta protegida
  if (window.location.pathname.startsWith('/app/')) {

// Usar navigate en lugar de window.location para evitar recargas completas
    window.dispatchEvent(new CustomEvent('navigateToLogin'));
  }
};

/**
 * Verificar si el estado de autenticación es consistente
 * Evita logs excesivos usando throttling
 */
let lastConsistencyCheck = 0;
const CHECK_THROTTLE_MS = 5000; // 5 segundos entre logs

export const isAuthStateConsistent = (): boolean => {
  const token = localStorage.getItem('token');
  const hasToken = !!token && token.length > 10;
  
  const now = Date.now();
  if (now - lastConsistencyCheck > CHECK_THROTTLE_MS) {
    lastConsistencyCheck = now;

}
  
  return hasToken;
};

/**
 * Forzar sincronización del estado de autenticación
 * Solo ejecuta si realmente hay inconsistencias
 */
export const forceAuthSync = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  // Solo limpiar si hay inconsistencias reales
  if (token && !user) {

clearAuthState();
    return false;
  }
  
  if (!token && user) {

clearAuthState();
    return false;
  }
  
  // Si no hay nada, es consistente (no autenticado)
  if (!token && !user) {
    return true;
  }
  
  // Si hay ambos, verificar que el token sea válido
  if (token && token.length < 10) {

clearAuthState();
    return false;
  }
  
  return true;
};

/**
 * Limpiar solo claves específicas de autenticación
 */
export const clearAuthKeys = (keys: string[]) => {
  keys.forEach(key => {
    localStorage.removeItem(key);
  });

}; 