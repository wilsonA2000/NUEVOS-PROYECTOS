#!/usr/bin/env node

/**
 * VeriHome - Script de Verificación de Correcciones de Contratos
 * Verifica que todas las correcciones estén aplicadas correctamente
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

console.log('🔍 VeriHome Contract Fixes Verification Script');
console.log('==============================================');

// Verificaciones específicas
const verifications = [
  {
    name: 'URL Configuration Verification',
    file: 'src/services/landlordContractService.ts',
    checks: [
      {
        description: 'BASE_URL sin /api/v1',
        pattern: /const BASE_URL = '\/contracts\/landlord'/,
        expected: true
      },
      {
        description: 'TENANT_BASE_URL sin /api/v1',
        pattern: /const TENANT_BASE_URL = '\/contracts\/tenant'/,
        expected: true
      },
      {
        description: 'No hay URLs duplicadas con /api/v1/api/v1/',
        pattern: /\/api\/v1\/api\/v1/,
        expected: false
      }
    ]
  },
  {
    name: 'API Configuration Verification',
    file: 'src/services/api.ts',
    checks: [
      {
        description: 'baseURL contiene /api/v1',
        pattern: /baseURL: API_URL|'http:\/\/localhost:8000\/api\/v1'/,
        expected: true
      },
      {
        description: 'Timeout configurado apropiadamente',
        pattern: /timeout: 10000/,
        expected: true
      }
    ]
  },
  {
    name: 'Auth Service Error Handling',
    file: 'src/services/authService.ts',
    checks: [
      {
        description: 'Error 401 no se loguea como inesperado',
        pattern: /if \(error\.response\?\.status === 401\)/,
        expected: true
      },
      {
        description: 'getStoredToken error fix',
        pattern: /localStorage\.getItem\('access_token'\) \|\| sessionStorage\.getItem\('access_token'\)/,
        expected: true
      }
    ]
  },
  {
    name: 'Performance Monitor Optimization',
    file: 'src/utils/performanceMonitor.ts',
    checks: [
      {
        description: 'API call threshold optimizado (5000ms)',
        pattern: /if \(duration > 5000\)/,
        expected: true
      },
      {
        description: 'Component render threshold optimizado (50ms)',
        pattern: /if \(renderTime > 50\)/,
        expected: true
      }
    ]
  },
  {
    name: 'Audit Middleware CLS Fix',
    file: 'src/utils/auditMiddleware.ts',
    checks: [
      {
        description: 'CLS debounce implementado',
        pattern: /setTimeout\(\(\) => {/,
        expected: true
      },
      {
        description: 'CLS threshold significativo (0.1)',
        pattern: /if \(clsValue > 0\.1\)/,
        expected: true
      },
      {
        description: 'CLS debounce timer (5000ms)',
        pattern: /}, 5000\)/,
        expected: true
      }
    ]
  }
];

// Función para ejecutar verificaciones
function runVerifications() {
  log('\n🔍 Ejecutando verificaciones...', colors.cyan);

  let totalChecks = 0;
  let passedChecks = 0;
  const failedChecks = [];

  verifications.forEach((verification, index) => {
    log(`\n${colors.magenta}[${index + 1}/${verifications.length}] ${verification.name}${colors.reset}`);

    const filePath = path.join(process.cwd(), verification.file);

    if (!fs.existsSync(filePath)) {
      error(`  Archivo no encontrado: ${verification.file}`);
      verification.checks.forEach(check => {
        totalChecks++;
        failedChecks.push(`${verification.name}: ${check.description} - Archivo no encontrado`);
      });
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');

    verification.checks.forEach(check => {
      totalChecks++;
      const patternFound = check.pattern.test(fileContent);

      if ((patternFound && check.expected) || (!patternFound && !check.expected)) {
        success(`  ✅ ${check.description}`);
        passedChecks++;
      } else {
        error(`  ❌ ${check.description}`);
        failedChecks.push(`${verification.name}: ${check.description}`);
      }
    });
  });

  // Resumen de resultados
  log('\n📊 Resumen de Verificaciones:', colors.cyan);
  log('═══════════════════════════════════');

  const successRate = (passedChecks / totalChecks * 100).toFixed(1);

  info(`  Total de verificaciones: ${totalChecks}`);
  success(`  Verificaciones exitosas: ${passedChecks}`);
  error(`  Verificaciones fallidas: ${totalChecks - passedChecks}`);

  if (passedChecks === totalChecks) {
    log(`\n🎉 Tasa de éxito: ${successRate}% - ¡PERFECTO!`, colors.green);
    log('\n✨ Todas las correcciones están aplicadas correctamente', colors.green);
    return true;
  } else {
    warning(`\n⚠️ Tasa de éxito: ${successRate}%`);

    if (failedChecks.length > 0) {
      log('\n🔧 Verificaciones fallidas que requieren atención:', colors.red);
      failedChecks.forEach(check => error(`  • ${check}`));
    }

    return false;
  }
}

// Verificaciones adicionales de integridad
function checkProjectIntegrity() {
  log('\n🔐 Verificaciones de Integridad del Proyecto:', colors.cyan);

  const integrityChecks = [
    {
      name: 'Package.json exists',
      check: () => fs.existsSync('package.json')
    },
    {
      name: 'Node modules installed',
      check: () => fs.existsSync('node_modules')
    },
    {
      name: 'Source directory exists',
      check: () => fs.existsSync('src')
    },
    {
      name: 'Services directory exists',
      check: () => fs.existsSync('src/services')
    },
    {
      name: 'Utils directory exists',
      check: () => fs.existsSync('src/utils')
    }
  ];

  let integrityScore = 0;

  integrityChecks.forEach(check => {
    if (check.check()) {
      success(`  ✅ ${check.name}`);
      integrityScore++;
    } else {
      error(`  ❌ ${check.name}`);
    }
  });

  const integrityPercentage = (integrityScore / integrityChecks.length * 100).toFixed(1);

  if (integrityScore === integrityChecks.length) {
    success(`\n🎯 Integridad del proyecto: ${integrityPercentage}% - EXCELENTE`);
  } else {
    warning(`\n🎯 Integridad del proyecto: ${integrityPercentage}% - REQUIERE ATENCIÓN`);
  }

  return integrityScore === integrityChecks.length;
}

// Generar reporte detallado
function generateDetailedReport(verificationsPassed, integrityPassed) {
  log('\n📋 Reporte Detallado:', colors.cyan);
  log('════════════════════════');

  if (verificationsPassed && integrityPassed) {
    log('\n🎉 ESTADO: COMPLETAMENTE CORREGIDO', colors.green);
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    success('✅ Todas las correcciones están aplicadas');
    success('✅ La integridad del proyecto es perfecta');
    success('✅ El sistema debería funcionar correctamente');

    log('\n🚀 Próximos pasos:', colors.blue);
    info('  1. Reinicia el servidor de desarrollo');
    info('  2. Limpia la caché del navegador (Ctrl+Shift+R)');
    info('  3. Prueba la creación de contratos');
    info('  4. Verifica que no hay errores en la consola');

  } else if (verificationsPassed && !integrityPassed) {
    warning('\n⚠️ ESTADO: CORRECCIONES OK, INTEGRIDAD COMPROMETIDA');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    success('✅ Las correcciones están aplicadas');
    error('❌ Hay problemas de integridad del proyecto');
    warning('⚠️ Instala dependencias: npm install');

  } else if (!verificationsPassed && integrityPassed) {
    error('\n❌ ESTADO: CORRECCIONES INCOMPLETAS');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    error('❌ Algunas correcciones no están aplicadas');
    success('✅ La integridad del proyecto es buena');
    warning('⚠️ Ejecuta: node fix-contract-errors.js');

  } else {
    error('\n💥 ESTADO: MÚLTIPLES PROBLEMAS DETECTADOS');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    error('❌ Las correcciones no están aplicadas');
    error('❌ Hay problemas de integridad del proyecto');
    error('❌ Se requiere intervención manual');
  }

  log('\n📞 Soporte:', colors.cyan);
  info('  Si los problemas persisten después de seguir las instrucciones:');
  info('  1. Verifica que el servidor backend esté ejecutándose');
  info('  2. Comprueba la consola del navegador para errores específicos');
  info('  3. Reinicia completamente el servidor de desarrollo');
}

// Función principal
async function main() {
  try {
    // Verificar que estamos en el directorio correcto
    if (!fs.existsSync('package.json')) {
      error('❌ Este script debe ejecutarse desde el directorio raíz del proyecto frontend');
      error('   Navega al directorio frontend y ejecuta: node verify-contract-fixes.js');
      process.exit(1);
    }

    log('\n🏁 Iniciando verificaciones...', colors.cyan);

    // Ejecutar verificaciones
    const verificationsPassed = runVerifications();
    const integrityPassed = checkProjectIntegrity();

    // Generar reporte final
    generateDetailedReport(verificationsPassed, integrityPassed);

    if (verificationsPassed && integrityPassed) {
      log('\n🎯 Verificación completada exitosamente!', colors.green);
      process.exit(0);
    } else {
      log('\n⚠️ Verificación completada con problemas detectados', colors.yellow);
      process.exit(1);
    }

  } catch (error) {
    log('\n💥 Error fatal en la verificación:', colors.red);
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
