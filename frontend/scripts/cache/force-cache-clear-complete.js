// FORCE COMPLETE CACHE CLEAR - NUCLEAR OPTION
// This will force browser to completely reload all assets

console.log('🚀 INITIATING COMPLETE CACHE CLEAR...');

// Clear all possible caches
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
    });
  });
}

// Clear localStorage and sessionStorage
localStorage.clear();
sessionStorage.clear();

// Force service worker update
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
    });
  });
}

// Add timestamp to force reload
const timestamp = Date.now();
const link = document.createElement('link');
link.rel = 'prefetch';
link.href = `/?v=${timestamp}`;
document.head.appendChild(link);

console.log('💥 CACHE CLEARED - RELOADING IN 2 SECONDS...');
setTimeout(() => {
  window.location.reload(true);
}, 2000);