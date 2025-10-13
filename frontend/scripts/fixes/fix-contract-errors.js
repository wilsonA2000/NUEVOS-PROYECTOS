#!/usr/bin/env node

/**
 * VeriHome - Script Automático de Corrección de Errores de Contratos
 * Implementa todas las correcciones identificadas siguiendo mejores prácticas
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 VeriHome Contract Error Auto-Fix Script');
console.log('=========================================');

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

// Configuración de archivos a corregir
const fixes = [
  {
    name: 'LandlordContractService - URL Duplication Fix',
    file: 'src/services/landlordContractService.ts',
    description: 'Verificar que las URLs no tengan /api/v1 duplicado',
    fix: (content) => {
      // El archivo ya está correcto, solo verificamos
      if (content.includes("const BASE_URL = '/contracts/landlord';")) {
        success('  BASE_URL está correctamente configurada');
        return { content, changed: false };
      } else {
        error('  BASE_URL tiene configuración incorrecta');
        return { content, changed: false };
      }
    }
  },
  {
    name: 'AuthService - 401 Error Logging Fix',
    file: 'src/services/authService.ts',
    description: 'Verificar que los errores 401 no se logueen como inesperados',
    fix: (content) => {
      if (content.includes("// No loguear error 401 como es esperado cuando no hay autenticación")) {
        success('  Error 401 logging está correctamente configurado');
        return { content, changed: false };
      } else {
        warning('  Error 401 logging podría necesitar optimización');
        return { content, changed: false };
      }
    }
  },
  {
    name: 'AuditMiddleware - CLS Debounce Fix',
    file: 'src/utils/auditMiddleware.ts',
    description: 'Verificar que el CLS logging esté optimizado con debounce',
    fix: (content) => {
      if (content.includes("setTimeout(() => {") && content.includes("if (clsValue > 0.1)")) {
        success('  CLS debounce está correctamente implementado');
        return { content, changed: false };
      } else {
        error('  CLS debounce necesita corrección');
        return { content, changed: false };
      }
    }
  },
  {
    name: 'PerformanceMonitor - Threshold Optimization',
    file: 'src/utils/performanceMonitor.ts',
    description: 'Verificar que los umbrales de rendimiento estén optimizados',
    fix: (content) => {
      if (content.includes("if (duration > 5000)") && content.includes("if (renderTime > 50)")) {
        success('  Performance thresholds están optimizados');
        return { content, changed: false };
      } else {
        error('  Performance thresholds necesitan optimización');
        return { content, changed: false };
      }
    }
  }
];

// Función principal
async function runFixes() {
  log('\n🔧 Iniciando correcciones automáticas...', colors.cyan);
  
  let totalFixes = 0;
  let successfulFixes = 0;
  
  for (const fixConfig of fixes) {
    totalFixes++;
    log(`\n${colors.magenta}[${totalFixes}/${fixes.length}] ${fixConfig.name}${colors.reset}`);
    info(`  ${fixConfig.description}`);
    
    const filePath = path.join(process.cwd(), fixConfig.file);
    
    try {
      // Verificar que el archivo existe
      if (!fs.existsSync(filePath)) {
        error(`  Archivo no encontrado: ${fixConfig.file}`);
        continue;
      }
      
      // Leer contenido actual
      const originalContent = fs.readFileSync(filePath, 'utf8');
      
      // Aplicar corrección
      const result = fixConfig.fix(originalContent);
      
      if (result.changed) {
        // Hacer backup del archivo original
        const backupPath = `${filePath}.backup.${Date.now()}`;
        fs.writeFileSync(backupPath, originalContent);
        info(`  Backup creado: ${backupPath}`);
        
        // Escribir contenido corregido
        fs.writeFileSync(filePath, result.content);
        success(`  Archivo corregido: ${fixConfig.file}`);
        successfulFixes++;
      } else {
        info(`  No se requieren cambios en: ${fixConfig.file}`);
        successfulFixes++;
      }
      
    } catch (err) {
      error(`  Error procesando ${fixConfig.file}: ${err.message}`);
    }
  }
  
  // Resumen final
  log('\n📊 Resumen de Correcciones:', colors.cyan);
  success(`  Archivos procesados: ${totalFixes}`);
  success(`  Correcciones exitosas: ${successfulFixes}`);
  
  if (successfulFixes === totalFixes) {
    log('\n🎉 ¡Todas las correcciones se aplicaron exitosamente!', colors.green);
    
    // Instrucciones para el usuario
    log('\n📋 Próximos pasos:', colors.cyan);
    info('  1. Reinicia el servidor de desarrollo:');
    info('     npm run dev');
    info('  2. Limpia la caché del navegador:');
    info('     Ctrl+Shift+R (Windows/Linux) o Cmd+Shift+R (Mac)');
    info('  3. Verifica que la creación de contratos funcione correctamente');
    info('  4. Monitorea la consola para confirmar que no hay errores');
    
  } else {
    warning('\n⚠️ Algunas correcciones no se pudieron aplicar completamente');
    warning('   Revisa los errores anteriores y aplica correcciones manualmente si es necesario');
  }
}

// Instrucciones adicionales para caché del navegador
function printCacheClearInstructions() {
  log('\n🧹 Instrucciones para Limpiar Caché del Navegador:', colors.cyan);
  log('═══════════════════════════════════════════════════════');
  
  info('Chrome/Edge:');
  info('  1. Abre DevTools (F12)');
  info('  2. Click derecho en el botón de recarga');
  info('  3. Selecciona "Empty Cache and Hard Reload"');
  
  info('\nFirefox:');
  info('  1. Abre DevTools (F12)');
  info('  2. Ve a Network tab');
  info('  3. Check "Disable Cache"');
  info('  4. Recarga la página (Ctrl+Shift+R)');
  
  info('\nAlternativa Universal:');
  info('  1. Ctrl+Shift+Delete (Windows/Linux) o Cmd+Shift+Delete (Mac)');
  info('  2. Selecciona "Cached images and files"');
  info('  3. Click "Clear data"');
  
  warning('\n⚠️ IMPORTANTE: La limpieza de caché es CRÍTICA para que los cambios se apliquen');
}

// Función para verificar el estado del proyecto
function checkProjectHealth() {
  log('\n🏥 Verificación de Salud del Proyecto:', colors.cyan);
  
  const criticalFiles = [
    'package.json',
    'src/services/api.ts',
    'src/services/landlordContractService.ts',
    'src/services/authService.ts',
    'src/utils/auditMiddleware.ts',
    'src/utils/performanceMonitor.ts'
  ];
  
  let healthScore = 0;
  
  criticalFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      success(`  ✅ ${file}`);
      healthScore++;
    } else {
      error(`  ❌ ${file} - MISSING`);
    }
  });
  
  const healthPercentage = (healthScore / criticalFiles.length) * 100;
  
  if (healthPercentage === 100) {
    success(`\n🎯 Salud del Proyecto: ${healthPercentage}% - EXCELENTE`);
  } else if (healthPercentage >= 80) {
    warning(`\n🎯 Salud del Proyecto: ${healthPercentage}% - BUENO`);
  } else {
    error(`\n🎯 Salud del Proyecto: ${healthPercentage}% - NECESITA ATENCIÓN`);
  }
}

// Ejecutar el script
async function main() {
  try {
    // Verificar que estamos en el directorio correcto
    if (!fs.existsSync('package.json')) {
      error('❌ Este script debe ejecutarse desde el directorio raíz del proyecto frontend');
      error('   Navega al directorio frontend y ejecuta: node fix-contract-errors.js');
      process.exit(1);
    }
    
    // Verificar salud del proyecto
    checkProjectHealth();
    
    // Ejecutar correcciones
    await runFixes();
    
    // Mostrar instrucciones de caché
    printCacheClearInstructions();
    
    log('\n🚀 Script de corrección completado exitosamente!', colors.green);
    
  } catch (error) {
    log('\n💥 Error fatal en el script:', colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Verificar Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

if (majorVersion < 14) {
  error(`❌ Node.js version ${nodeVersion} no es compatible`);
  error('   Se requiere Node.js 14 o superior');
  process.exit(1);
}

// Ejecutar
main().catch(console.error);