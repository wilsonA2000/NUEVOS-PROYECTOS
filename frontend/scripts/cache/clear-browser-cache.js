#!/usr/bin/env node

/**
 * VeriHome - Script para Forzar Limpieza de Caché del Navegador
 * Modifica archivos para forzar al navegador a recargar los módulos actualizados
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colores para mejor legibilidad
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function warning(message) {
  log(`⚠️ ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️ ${message}`, colors.blue);
}

console.log('🧹 VeriHome Browser Cache Busting Script');
console.log('=========================================');

// Función para agregar cache-busting comments
function addCacheBustingComment(filePath, identifier) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const timestamp = new Date().toISOString();
    const bustingComment = `\n/* Cache busted: ${timestamp} - ${identifier} */\n`;
    
    // Verificar si ya tiene un comentario de cache busting reciente (menos de 1 minuto)
    const existingBustPattern = /\/\* Cache busted: ([\d\-T:\.Z]+) - /;
    const match = content.match(existingBustPattern);
    
    if (match) {
      const existingTimestamp = new Date(match[1]);
      const now = new Date();
      const timeDiff = now - existingTimestamp;
      
      // Si el comentario es muy reciente (menos de 60 segundos), no agregar otro
      if (timeDiff < 60000) {
        info(`  Cache comment reciente encontrado en ${filePath}`);
        return false;
      }
      
      // Reemplazar el comentario existente
      const updatedContent = content.replace(existingBustPattern, `/* Cache busted: ${timestamp} - `);
      fs.writeFileSync(filePath, updatedContent);
    } else {
      // Agregar nuevo comentario al final
      fs.writeFileSync(filePath, content + bustingComment);
    }
    
    return true;
  } catch (err) {
    error(`  Error procesando ${filePath}: ${err.message}`);
    return false;
  }
}

// Archivos críticos que necesitan cache busting
const criticalFiles = [
  {
    path: 'src/services/landlordContractService.ts',
    identifier: 'CONTRACT_SERVICE'
  },
  {
    path: 'src/services/api.ts',
    identifier: 'API_CONFIG'
  },
  {
    path: 'src/services/authService.ts',
    identifier: 'AUTH_SERVICE'
  },
  {
    path: 'src/utils/performanceMonitor.ts',
    identifier: 'PERFORMANCE_MONITOR'
  },
  {
    path: 'src/utils/auditMiddleware.ts',
    identifier: 'AUDIT_MIDDLEWARE'
  }
];

// Función principal
async function main() {
  log('\n🚀 Iniciando cache busting...', colors.cyan);
  
  let processedFiles = 0;
  let updatedFiles = 0;
  
  for (const file of criticalFiles) {
    const filePath = path.join(process.cwd(), file.path);
    
    info(`Procesando: ${file.path}`);
    
    if (!fs.existsSync(filePath)) {
      warning(`  Archivo no encontrado: ${file.path}`);
      continue;
    }
    
    processedFiles++;
    
    if (addCacheBustingComment(filePath, file.identifier)) {
      success(`  ✅ Cache busting aplicado a ${file.path}`);
      updatedFiles++;
    }
  }
  
  // Crear archivo de timestamp global
  const timestampFile = path.join(process.cwd(), '.cache-bust-timestamp');
  const globalTimestamp = new Date().toISOString();
  fs.writeFileSync(timestampFile, globalTimestamp);
  
  log('\n📊 Resumen de Cache Busting:', colors.cyan);
  info(`  Archivos procesados: ${processedFiles}`);
  success(`  Archivos actualizados: ${updatedFiles}`);
  success(`  Timestamp global: ${globalTimestamp}`);
  
  // Instrucciones específicas para diferentes navegadores
  log('\n🌐 Instrucciones Específicas por Navegador:', colors.cyan);
  log('══════════════════════════════════════════════════');
  
  log('\n📱 Chrome/Chromium/Edge:', colors.yellow);
  info('  1. Abre DevTools (F12)');
  info('  2. Click derecho en el ícono de recarga');
  info('  3. Selecciona "Empty Cache and Hard Reload"');
  info('  4. O usa: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)');
  
  log('\n🦊 Firefox:', colors.yellow);
  info('  1. Abre DevTools (F12)');
  info('  2. Ve a Network tab');
  info('  3. Check "Disable Cache"');
  info('  4. Recarga con: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)');
  
  log('\n🍎 Safari:', colors.yellow);
  info('  1. Develop menu → Empty Caches');
  info('  2. O usa: Cmd+Option+R');
  
  log('\n🔧 Método Universal (Funciona en todos los navegadores):', colors.green);
  info('  1. Abre la página en modo incógnito/privado');
  info('  2. Esto garantiza que no hay caché previa');
  info('  3. Prueba la funcionalidad allí primero');
  
  // Comando para reiniciar servidor de desarrollo
  log('\n🚀 Reinicio del Servidor de Desarrollo:', colors.cyan);
  log('═════════════════════════════════════════════');
  
  log('\n💡 Para aplicar cambios completamente:', colors.yellow);
  info('  1. Detén el servidor actual (Ctrl+C)');
  info('  2. Ejecuta: npm run dev');
  info('  3. Espera a que compile completamente');
  info('  4. Recarga la página con cache busting');
  
  // Verificación de que el servidor está corriendo
  log('\n🔍 Verificación del Sistema:', colors.cyan);
  info('  Backend debe estar en: http://localhost:8000');
  info('  Frontend debe estar en: http://localhost:5173');
  info('  Verifica que ambos servicios respondan antes de probar');
  
  if (updatedFiles > 0) {
    log('\n🎉 Cache Busting completado exitosamente!', colors.green);
    log('   Los archivos han sido modificados para forzar recarga', colors.green);
    log('   Sigue las instrucciones específicas de tu navegador', colors.green);
  } else {
    warning('\n⚠️ No se aplicaron cambios de cache busting');
    warning('   Los archivos pueden tener timestamps recientes');
    warning('   Limpia manualmente la caché si es necesario');
  }
  
  // Test automatizado opcional
  log('\n🧪 Test Automático (Opcional):', colors.cyan);
  info('  Para verificar que los cambios se aplicaron:');
  info('  1. Ejecuta: node verify-contract-fixes.js');
  info('  2. Debe mostrar "COMPLETAMENTE CORREGIDO"');
  info('  3. Luego prueba la creación de contratos en el navegador');
}

// Verificar entorno
if (!fs.existsSync('package.json')) {
  error('❌ Este script debe ejecutarse desde el directorio raíz del proyecto frontend');
  error('   Navega al directorio frontend y ejecuta: node clear-browser-cache.js');
  process.exit(1);
}

// Ejecutar
main().catch(console.error);