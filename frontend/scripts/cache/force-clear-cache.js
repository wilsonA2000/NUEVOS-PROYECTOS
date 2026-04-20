// Archivo para forzar limpieza de cache del navegador
// Abre el navegador y presiona F12, luego ejecuta este código en la consola:

console.log('🔄 LIMPIANDO CACHE DEL NAVEGADOR...');

// Limpiar localStorage
localStorage.clear();
console.log('✅ localStorage limpiado');

// Limpiar sessionStorage
sessionStorage.clear();
console.log('✅ sessionStorage limpiado');

// Forzar recarga sin cache
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    registrations.forEach(function(registration) {
      registration.unregister();
    });
    console.log('✅ Service workers desregistrados');
  });
}

// Recargar página sin cache
setTimeout(() => {
  console.log('🔄 RECARGANDO PÁGINA SIN CACHE...');
  window.location.reload(true);
}, 1000);

console.log('💡 También puedes usar Ctrl+Shift+R (Windows/Linux) o Cmd+Shift+R (Mac) para recargar sin cache');
