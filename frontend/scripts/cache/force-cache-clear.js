// Force cache clear script for VeriHome
// Run this in browser console to clear all caches

console.log('🧹 Starting VeriHome cache clear...');

// Clear localStorage
try {
  localStorage.clear();
  console.log('✅ localStorage cleared');
} catch(e) {
  console.error('❌ Error clearing localStorage:', e);
}

// Clear sessionStorage
try {
  sessionStorage.clear();
  console.log('✅ sessionStorage cleared');
} catch(e) {
  console.error('❌ Error clearing sessionStorage:', e);
}

// Clear IndexedDB
if ('indexedDB' in window) {
  indexedDB.databases().then(dbs => {
    dbs.forEach(db => {
      indexedDB.deleteDatabase(db.name);
      console.log('✅ IndexedDB "' + db.name + '" deleted');
    });
  }).catch(e => console.error('❌ Error clearing IndexedDB:', e));
}

// Clear Service Worker caches
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
      console.log('✅ Cache "' + name + '" deleted');
    });
  }).catch(e => console.error('❌ Error clearing caches:', e));
}

// Unregister all service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('✅ Service Worker unregistered');
    });
  }).catch(e => console.error('❌ Error unregistering service workers:', e));
}

// Force hard reload
setTimeout(() => {
  console.log('🔄 Performing hard reload...');
  window.location.reload(true);
}, 1000);

console.log('🎉 Cache clear complete! Page will reload in 1 second...');
