// Script completo para limpiar cache y forzar recarga
console.log('🧹 INICIANDO LIMPIEZA COMPLETA DE CACHE...');

// 1. Clear localStorage
try {
  localStorage.clear();
  console.log('✅ localStorage limpiado');
} catch(e) {
  console.error('❌ Error limpiando localStorage:', e);
}

// 2. Clear sessionStorage
try {
  sessionStorage.clear();
  console.log('✅ sessionStorage limpiado');
} catch(e) {
  console.error('❌ Error limpiando sessionStorage:', e);
}

// 3. Clear IndexedDB
if ('indexedDB' in window) {
  indexedDB.databases().then(dbs => {
    dbs.forEach(db => {
      indexedDB.deleteDatabase(db.name);
      console.log('✅ IndexedDB "' + db.name + '" eliminada');
    });
  }).catch(e => console.error('❌ Error limpiando IndexedDB:', e));
}

// 4. Clear Service Worker caches
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
      console.log('✅ Cache "' + name + '" eliminada');
    });
  }).catch(e => console.error('❌ Error limpiando caches:', e));
}

// 5. Unregister service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('✅ Service Worker desregistrado');
    });
  }).catch(e => console.error('❌ Error desregistrando service workers:', e));
}

// 6. Clear auth tokens and user data specifically
try {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('userProfile');
  console.log('✅ Tokens de autenticación eliminados');
} catch(e) {
  console.error('❌ Error eliminando tokens:', e);
}

// 7. Clear component state cache
try {
  // Clear any React Query cache keys
  Object.keys(localStorage).forEach(key => {
    if (key.includes('react-query') || key.includes('property') || key.includes('cache')) {
      localStorage.removeItem(key);
    }
  });
  console.log('✅ Cache de componentes eliminado');
} catch(e) {
  console.error('❌ Error limpiando cache de componentes:', e);
}

// 8. Force hard reload
setTimeout(() => {
  console.log('🔄 Realizando recarga completa...');
  // Try different reload methods
  if (window.location.reload) {
    window.location.reload(true);
  } else {
    window.location.href = window.location.href + '?_t=' + Date.now();
  }
}, 2000);

console.log('🎉 Limpieza completa! La página se recargará en 2 segundos...');