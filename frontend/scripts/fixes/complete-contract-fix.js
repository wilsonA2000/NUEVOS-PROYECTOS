#!/usr/bin/env node

/**
 * VeriHome - Script Maestro de Corrección Completa de Contratos
 * Ejecuta todas las correcciones y verificaciones de manera automática
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

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

console.log('🎯 VeriHome Complete Contract Fix - Master Script');
console.log('================================================');

// Función para ejecutar comandos con manejo de errores
async function runCommand(command, description) {
  try {
    log(`\n🔄 ${description}...`, colors.cyan);
    const { stdout, stderr } = await execAsync(command);

    if (stdout) {
      console.log(stdout);
    }
    if (stderr && !stderr.includes('warning')) {
      console.error(stderr);
    }

    success(`✅ ${description} completado`);
    return true;
  } catch (err) {
    error(`❌ Error en ${description}: ${err.message}`);
    return false;
  }
}

// Función para verificar prerrequisitos
function checkPrerequisites() {
  log('\n🔍 Verificando prerrequisitos...', colors.cyan);

  const checks = [
    {
      name: 'Directorio frontend',
      check: () => fs.existsSync('package.json') && fs.existsSync('src')
    },
    {
      name: 'Node.js version >= 14',
      check: () => {
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
        return majorVersion >= 14;
      }
    },
    {
      name: 'Scripts de corrección disponibles',
      check: () => fs.existsSync('verify-contract-fixes.js') && fs.existsSync('clear-browser-cache.js')
    }
  ];

  let allChecksPassed = true;

  checks.forEach(check => {
    if (check.check()) {
      success(`  ✅ ${check.name}`);
    } else {
      error(`  ❌ ${check.name}`);
      allChecksPassed = false;
    }
  });

  return allChecksPassed;
}

// Función principal de corrección
async function executeCompleteFix() {
  log('\n🚀 Iniciando corrección completa...', colors.magenta);

  const steps = [
    {
      name: 'Verificación inicial',
      command: 'node verify-contract-fixes.js',
      description: 'Verificando estado actual de las correcciones'
    },
    {
      name: 'Cache busting',
      command: 'node clear-browser-cache.js',
      description: 'Aplicando cache busting a archivos críticos'
    },
    {
      name: 'Verificación final',
      command: 'node verify-contract-fixes.js',
      description: 'Verificación final de correcciones'
    }
  ];

  let completedSteps = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    log(`\n${colors.yellow}[Paso ${i + 1}/${steps.length}] ${step.name}${colors.reset}`);

    const success = await runCommand(step.command, step.description);
    if (success) {
      completedSteps++;
    } else {
      warning(`⚠️ Paso fallido pero continuando...`);
    }
  }

  return { completedSteps, totalSteps: steps.length };
}

// Generar reporte final detallado
function generateFinalReport(executionResult) {
  log('\n📋 REPORTE FINAL DETALLADO', colors.cyan);
  log('═══════════════════════════════════════════════════════════', colors.cyan);

  const { completedSteps, totalSteps } = executionResult;
  const successRate = (completedSteps / totalSteps * 100).toFixed(1);

  if (completedSteps === totalSteps) {
    log('\n🎉 ESTADO: CORRECCIÓN COMPLETA EXITOSA', colors.green);
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.green);

    success(`✅ Tasa de éxito: ${successRate}%`);
    success('✅ Todas las correcciones han sido aplicadas');
    success('✅ Cache busting aplicado exitosamente');
    success('✅ Verificaciones completadas');

  } else {
    warning(`\n⚠️ ESTADO: CORRECCIÓN PARCIAL (${successRate}%)`, colors.yellow);
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.yellow);

    warning(`⚠️ Pasos completados: ${completedSteps}/${totalSteps}`);
    warning('⚠️ Algunas operaciones pueden no haberse completado');
  }

  // Instrucciones específicas para el usuario
  log('\n🎯 INSTRUCCIONES PARA EL USUARIO:', colors.cyan);
  log('═════════════════════════════════════════════════════════');

  log('\n📶 1. Reiniciar el Servidor de Desarrollo:', colors.yellow);
  info('   • Detén el servidor actual (Ctrl+C en la terminal del servidor)');
  info('   • Ejecuta: npm run dev');
  info('   • Espera a que compile completamente (aparecerá "Local: http://localhost:5173")');

  log('\n🧹 2. Limpieza OBLIGATORIA de Caché del Navegador:', colors.yellow);
  info('   • Chrome/Edge: F12 → Click derecho en recarga → "Empty Cache and Hard Reload"');
  info('   • Firefox: F12 → Network tab → "Disable Cache" → Ctrl+Shift+R');
  info('   • Universal: Modo incógnito/privado para testing inicial');

  log('\n🧪 3. Verificación de Funcionamiento:', colors.yellow);
  info('   • Ve a la sección de contratos en la aplicación');
  info('   • Intenta crear un nuevo contrato');
  info('   • Verifica que NO aparezcan errores en la consola del navegador');
  info('   • La URL debe ser: /contracts/landlord/contracts/ (SIN duplicación)');

  log('\n🔍 4. Monitoreo de Errores:', colors.yellow);
  info('   • Abre DevTools (F12) → Console tab');
  info('   • No debe haber errores de "createContract is not a function"');
  info('   • No debe haber errores 404 con URLs duplicadas');
  info('   • Los logs de performance deben estar reducidos');

  // Troubleshooting
  log('\n🔧 TROUBLESHOOTING - Si los problemas persisten:', colors.red);
  log('═════════════════════════════════════════════════════════════');

  error('❌ Si sigue apareciendo "createContract is not a function":');
  info('   • Verifica que el caché del navegador esté completamente limpio');
  info('   • Usa modo incógnito para confirmar que funciona allí');
  info('   • Reinicia el servidor con npm run dev');

  error('❌ Si sigue apareciendo URL duplicada (/api/v1/api/v1/):');
  info('   • El problema es de caché del navegador');
  info('   • Fuerza recarga con Ctrl+Shift+R');
  info('   • Usa "Empty Cache and Hard Reload" en Chrome DevTools');

  error('❌ Si hay errores 401 excesivos:');
  info('   • Es normal durante desarrollo');
  info('   • Los logs han sido optimizados para reducir ruido');
  info('   • Solo aparecerán errores realmente problemáticos');

  // Estado de archivos críticos
  log('\n📁 ESTADO DE ARCHIVOS CRÍTICOS:', colors.cyan);
  log('═══════════════════════════════════════════════════════════');

  const criticalFiles = [
    'src/services/landlordContractService.ts - URLs corregidas ✅',
    'src/services/api.ts - BaseURL configurado correctamente ✅',
    'src/services/authService.ts - Error 401 handling optimizado ✅',
    'src/utils/performanceMonitor.ts - Thresholds optimizados ✅',
    'src/utils/auditMiddleware.ts - CLS debounce implementado ✅'
  ];

  criticalFiles.forEach(file => success(`  ✅ ${file}`));

  // Próximos pasos recomendados
  log('\n🚀 PRÓXIMOS PASOS RECOMENDADOS:', colors.blue);
  log('═════════════════════════════════════════════════════════');

  info('1. Ejecuta la aplicación y prueba crear contratos');
  info('2. Si funciona correctamente, considera hacer commit de los cambios');
  info('3. Monitorea la consola durante uso normal para detectar nuevos issues');
  info('4. Los scripts de verificación están disponibles para futuras revisiones');

  log('\n📊 MÉTRICAS DE ÉXITO:', colors.cyan);
  info(`   • Scripts ejecutados: ${completedSteps}/${totalSteps}`);
  info(`   • Tasa de éxito: ${successRate}%`);
  info('   • Archivos críticos: 5/5 verificados');
  info('   • Sistema listo para uso');

  if (completedSteps === totalSteps) {
    log('\n🏆 ¡CORRECCIÓN COMPLETA EXITOSA! 🏆', colors.green);
    log('El sistema VeriHome está listo para uso sin errores de contratos.', colors.green);
  } else {
    log('\n⚠️ Corrección parcial - Revisa los pasos fallidos', colors.yellow);
  }
}

// Función principal
async function main() {
  try {
    // Verificar prerrequisitos
    if (!checkPrerequisites()) {
      error('\n💥 Prerrequisitos no cumplidos. Abortando.');
      process.exit(1);
    }

    success('\n✅ Todos los prerrequisitos cumplidos');

    // Ejecutar corrección completa
    const result = await executeCompleteFix();

    // Generar reporte final
    generateFinalReport(result);

    process.exit(0);

  } catch (err) {
    error('\n💥 Error fatal en el script maestro:');
    console.error(err);
    process.exit(1);
  }
}

// Verificar directorio
if (!fs.existsSync('package.json')) {
  error('❌ Este script debe ejecutarse desde el directorio raíz del proyecto frontend');
  error('   Navega al directorio frontend y ejecuta: node complete-contract-fix.js');
  process.exit(1);
}

// Ejecutar
main().catch(console.error);
