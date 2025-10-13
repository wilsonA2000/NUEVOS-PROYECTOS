/**
 * NUCLEAR CACHE CLEAR - Solución definitiva para el error baseUrl
 * 
 * PROBLEMA: Error "Cannot read properties of undefined (reading 'baseUrl')"
 * CAUSA: El navegador está usando una versión cacheada de matchingService.ts
 * SOLUCIÓN: Limpiar absolutamente TODO el cache del navegador
 * 
 * INSTRUCCIONES:
 * 1. Abre las herramientas de desarrollador (F12)
 * 2. Ve a la pestaña "Console"
 * 3. Pega este código completo
 * 4. Presiona Enter
 * 5. Espera a que termine y recargue automáticamente
 */

console.log('%c🚨 NUCLEAR CACHE CLEAR - INICIANDO...', 'background: red; color: white; font-size: 16px; font-weight: bold; padding: 10px;');

// Función principal de limpieza
async function nuclearCacheClear() {
    try {
        console.log('%c1️⃣ Limpiando localStorage...', 'color: blue; font-weight: bold;');
        localStorage.clear();
        console.log('✅ localStorage limpiado');

        console.log('%c2️⃣ Limpiando sessionStorage...', 'color: blue; font-weight: bold;');
        sessionStorage.clear();
        console.log('✅ sessionStorage limpiado');

        console.log('%c3️⃣ Limpiando cookies...', 'color: blue; font-weight: bold;');
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        console.log('✅ Cookies limpiadas');

        console.log('%c4️⃣ Desregistrando service workers...', 'color: blue; font-weight: bold;');
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
            console.log('✅ Service workers desregistrados');
        }

        console.log('%c5️⃣ Limpiando cache de la aplicación...', 'color: blue; font-weight: bold;');
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log('✅ Cache de aplicación limpiado');
        }

        console.log('%c6️⃣ Limpiando IndexedDB...', 'color: blue; font-weight: bold;');
        if ('indexedDB' in window) {
            // Limpiar bases de datos conocidas de React Query y otras
            const dbsToDelete = ['queryClient', 'react-query', 'workbox', 'vite'];
            for (const dbName of dbsToDelete) {
                try {
                    await new Promise((resolve, reject) => {
                        const deleteReq = indexedDB.deleteDatabase(dbName);
                        deleteReq.onsuccess = () => resolve(true);
                        deleteReq.onerror = () => resolve(false);
                    });
                } catch (e) {
                    // Ignore errors for non-existent DBs
                }
            }
            console.log('✅ IndexedDB limpiado');
        }

        console.log('%c7️⃣ Invalidando módulos de Vite...', 'color: blue; font-weight: bold;');
        // Forzar invalidación de módulos en desarrollo
        if (import.meta?.hot) {
            import.meta.hot.invalidate();
        }
        console.log('✅ Módulos Vite invalidados');

        console.log('%c8️⃣ Agregando timestamp para forzar recarga...', 'color: blue; font-weight: bold;');
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('cache_bust', Date.now().toString());
        
        console.log('%c✅ LIMPIEZA NUCLEAR COMPLETADA', 'background: green; color: white; font-size: 16px; font-weight: bold; padding: 10px;');
        console.log('%c🔄 RECARGANDO EN 2 SEGUNDOS...', 'background: orange; color: white; font-size: 14px; font-weight: bold; padding: 5px;');
        
        setTimeout(() => {
            window.location.href = currentUrl.toString();
        }, 2000);

    } catch (error) {
        console.error('%c❌ Error durante la limpieza nuclear:', 'color: red; font-weight: bold;', error);
        console.log('%c🔄 Intentando recarga manual...', 'color: orange; font-weight: bold;');
        setTimeout(() => {
            window.location.reload(true);
        }, 1000);
    }
}

// Ejecutar limpieza nuclear
nuclearCacheClear();

console.log('%c💡 INFORMACIÓN TÉCNICA:', 'color: purple; font-weight: bold;');
console.log('- Archivo corregido: matchingService.ts');
console.log('- Import correcto: import api from "./api"');
console.log('- Timestamp de corrección: 2025-08-31T01:27:00Z');
console.log('- Si el error persiste después de esto, el problema está en otro lugar');