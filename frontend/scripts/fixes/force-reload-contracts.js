#!/usr/bin/env node

/**
 * VeriHome - Script de Fuerza Bruta para Resolver Problema de Contratos
 * Limpia TODOS los caches posibles y fuerza recarga completa
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

console.log('🔥 VeriHome Force Reload - Contract Error Nuclear Fix');
console.log('==================================================');

// Función para agregar timestamps únicos y fuerza de recarga
function forceModuleReload(filePath, identifier) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const timestamp = Date.now();
    const reloadComment = `\n/* FORCE RELOAD ${timestamp} - ${identifier} - Nuclear fix applied */\n`;
    
    // Remover comentarios anteriores de force reload
    const cleanContent = content.replace(/\/\* FORCE RELOAD.*Nuclear fix applied \*\/\n/g, '');
    
    // Agregar nuevo timestamp
    fs.writeFileSync(filePath, cleanContent + reloadComment);
    
    return true;
  } catch (err) {
    error(`  Error procesando ${filePath}: ${err.message}`);
    return false;
  }
}

// Función para verificar método createContract
function verifyCreateContractMethod() {
  log('\n🔍 Verificando método createContract...', colors.cyan);
  
  const landlordServicePath = 'src/services/landlordContractService.ts';
  
  if (!fs.existsSync(landlordServicePath)) {
    error('  ❌ landlordContractService.ts no encontrado');
    return false;
  }
  
  const content = fs.readFileSync(landlordServicePath, 'utf8');
  
  // Verificar que el método createContract existe
  if (content.includes('static async createContract(contractData: any)')) {
    success('  ✅ Método createContract encontrado');
    return true;
  } else {
    error('  ❌ Método createContract NO encontrado');
    
    // Agregar método si no existe
    info('  🔧 Agregando método createContract...');
    
    const methodToAdd = `
  /**
   * Método alias para compatibilidad con tests y componentes legacy
   * Convierte datos genéricos a CreateContractPayload y llama createContractDraft
   */
  static async createContract(contractData: any): Promise<LandlordControlledContractData> {
    // Convertir contractData genérico a CreateContractPayload estructurado
    const payload: CreateContractPayload = {
      property_id: contractData.property_id || contractData.propertyId || '',
      contract_template: contractData.contract_template || contractData.contractTemplate || 'rental_urban',
      basic_terms: {
        monthly_rent: Number(contractData.monthly_rent || contractData.monthlyRent || 0),
        security_deposit: Number(contractData.security_deposit || contractData.securityDeposit || 0),
        duration_months: Number(contractData.duration_months || contractData.durationMonths || 12),
        utilities_included: Boolean(contractData.utilities_included || contractData.utilitiesIncluded || false),
        pets_allowed: Boolean(contractData.pets_allowed || contractData.petsAllowed || false),
        smoking_allowed: Boolean(contractData.smoking_allowed || contractData.smokingAllowed || false),
      }
    };
    
    return this.createContractDraft(payload);
  }
`;
    
    // Buscar lugar apropiado para insertar el método (después de createContractDraft)
    const insertPoint = content.indexOf('static async createContractDraft');
    if (insertPoint !== -1) {
      const methodEnd = content.indexOf('}', content.indexOf('}', insertPoint) + 1) + 1;
      const before = content.substring(0, methodEnd);
      const after = content.substring(methodEnd);
      
      const newContent = before + '\n' + methodToAdd + '\n' + after;
      fs.writeFileSync(landlordServicePath, newContent);
      success('  ✅ Método createContract agregado exitosamente');
      return true;
    } else {
      error('  ❌ No se pudo encontrar lugar para insertar el método');
      return false;
    }
  }
}

// Función para verificar imports
function verifyImports() {
  log('\n🔍 Verificando consistencia de imports...', colors.cyan);
  
  const problematicFiles = [
    'src/__tests__/integration/apiIntegration.integration.test.ts',
    'src/__tests__/integration/biometricFlow.integration.test.ts',
    'src/services/__tests__/contractService.test.ts'
  ];
  
  let fixedImports = 0;
  
  problematicFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        
        // Corregir imports de contractService
        content = content.replace(
          /import\s*{\s*contractService\s*}\s*from\s*['"][^'"]*contractService['"];?/g,
          "import contractService from '../services/contractService';"
        );
        
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content);
          success(`  ✅ Import corregido en ${filePath}`);
          fixedImports++;
        } else {
          info(`  ℹ️ Import correcto en ${filePath}`);
        }
      } catch (err) {
        warning(`  ⚠️ Error procesando ${filePath}: ${err.message}`);
      }
    }
  });
  
  return fixedImports;
}

// Archivos críticos para force reload
const criticalFiles = [
  {
    path: 'src/services/landlordContractService.ts',
    identifier: 'LANDLORD_CONTRACT_SERVICE'
  },
  {
    path: 'src/services/contractService.ts',
    identifier: 'CONTRACT_SERVICE'
  },
  {
    path: 'src/hooks/useContracts.ts',
    identifier: 'USE_CONTRACTS_HOOK'
  },
  {
    path: 'src/components/contracts/LandlordContractForm.tsx',
    identifier: 'LANDLORD_CONTRACT_FORM'
  },
  {
    path: 'src/services/api.ts',
    identifier: 'API_CONFIG'
  }
];

// Función principal
async function main() {
  log('\n🚀 Iniciando corrección nuclear de contratos...', colors.magenta);
  
  // Paso 1: Verificar método createContract
  const methodExists = verifyCreateContractMethod();
  
  // Paso 2: Corregir imports inconsistentes
  const fixedImports = verifyImports();
  
  // Paso 3: Aplicar force reload a archivos críticos
  let processedFiles = 0;
  let updatedFiles = 0;
  
  log('\n🔧 Aplicando force reload a archivos críticos...', colors.cyan);
  
  for (const file of criticalFiles) {
    const filePath = path.join(process.cwd(), file.path);
    
    info(`Procesando: ${file.path}`);
    
    if (!fs.existsSync(filePath)) {
      warning(`  ⚠️ Archivo no encontrado: ${file.path}`);
      continue;
    }
    
    processedFiles++;
    
    if (forceModuleReload(filePath, file.identifier)) {
      success(`  ✅ Force reload aplicado a ${file.path}`);
      updatedFiles++;
    }
  }
  
  // Paso 4: Crear archivo de invalidación de cache
  const cacheInvalidationFile = '.cache-invalidation-nuclear';
  const cacheData = {
    timestamp: new Date().toISOString(),
    contractMethodFixed: methodExists,
    importsFixed: fixedImports,
    filesUpdated: updatedFiles,
    reason: 'Nuclear fix for createContract is not a function error'
  };
  
  fs.writeFileSync(cacheInvalidationFile, JSON.stringify(cacheData, null, 2));
  
  // Resumen final
  log('\n📊 Resumen de Corrección Nuclear:', colors.cyan);
  log('══════════════════════════════════════');
  
  if (methodExists) {
    success(`  ✅ Método createContract: Disponible`);
  } else {
    error(`  ❌ Método createContract: No se pudo corregir`);
  }
  
  success(`  ✅ Imports corregidos: ${fixedImports}`);
  success(`  ✅ Archivos procesados: ${processedFiles}`);
  success(`  ✅ Force reload aplicado: ${updatedFiles}`);
  
  // Instrucciones críticas para el usuario
  log('\n🚨 INSTRUCCIONES CRÍTICAS PARA EL USUARIO:', colors.red);
  log('═════════════════════════════════════════════════════════');
  
  log('\n🔴 1. DETENER TODO Y REINICIAR COMPLETAMENTE:', colors.red);
  error('   • Detén el servidor de desarrollo (Ctrl+C)');
  error('   • Cierra TODAS las ventanas del navegador');
  error('   • Espera 10 segundos');
  
  log('\n🔴 2. LIMPIEZA NUCLEAR DEL NAVEGADOR:', colors.red);
  error('   • Abre el navegador NUEVO (no recuperar sesión)');
  error('   • Ve a Configuración → Privacidad → Eliminar datos de navegación');
  error('   • Selecciona "Desde siempre" y marca TODO');
  error('   • Elimina datos');
  
  log('\n🔴 3. REINICIO COMPLETO DEL SERVIDOR:', colors.yellow);
  warning('   • npm run dev (esperar compilación completa)');
  warning('   • Verificar que no hay errores en la terminal');
  warning('   • Confirmar URL: http://localhost:5173');
  
  log('\n🔴 4. TESTING ESPECÍFICO:', colors.blue);
  info('   • Ve directamente a la sección de contratos');
  info('   • Abre DevTools (F12) → Console');
  info('   • Intenta crear un contrato');
  info('   • Verifica que NO hay error "createContract is not a function"');
  
  log('\n🎯 VERIFICACIÓN DE ÉXITO:', colors.green);
  success('   • Sin errores en consola del navegador');
  success('   • Contratos se pueden crear sin problemas');
  success('   • URLs no duplicadas (/contracts/landlord/contracts/)');
  
  if (methodExists && updatedFiles === criticalFiles.length) {
    log('\n🎉 CORRECCIÓN NUCLEAR COMPLETADA EXITOSAMENTE! 🎉', colors.green);
    log('   El problema debe estar resuelto después de seguir las instrucciones.', colors.green);
  } else {
    warning('\n⚠️ Corrección parcial - Algunos pasos fallaron');
    warning('   Sigue las instrucciones cuidadosamente para completar la corrección.');
  }
  
  log('\n💡 NOTA IMPORTANTE:', colors.cyan);
  info('   Si el problema persiste después de esto, el issue está en el cache');
  info('   del navegador o en el Hot Module Replacement (HMR) de Vite.');
  info('   Usa modo incógnito para confirmar que la corrección funciona.');
}

// Verificar directorio
if (!fs.existsSync('package.json')) {
  error('❌ Este script debe ejecutarse desde el directorio raíz del proyecto frontend');
  error('   Navega al directorio frontend y ejecuta: node force-reload-contracts.js');
  process.exit(1);
}

// Ejecutar
main().catch(console.error);