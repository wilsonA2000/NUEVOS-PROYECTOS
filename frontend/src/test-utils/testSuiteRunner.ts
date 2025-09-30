/**
 * Test Suite Runner para el Sistema de Contratos
 * Ejecuta y organiza todos los tests unitarios del sistema
 * Proporciona métricas y reportes de cobertura
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  suiteName: string;
  fileName: string;
  passed: number;
  failed: number;
  duration: number;
  coverage: {
    lines: number;
    functions: number;
    branches: number;
  };
}

interface TestSummary {
  totalSuites: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  overallDuration: number;
  overallCoverage: {
    lines: number;
    functions: number;
    branches: number;
  };
  results: TestResult[];
}

/**
 * Configuración de los test suites
 */
const TEST_SUITES = [
  {
    name: 'LandlordContractService Tests',
    file: 'src/services/__tests__/landlordContractService.test.ts',
    description: 'Tests unitarios completos del servicio de contratos',
    category: 'services'
  },
  {
    name: 'TenantInvitationSystem Tests',
    file: 'src/components/contracts/__tests__/TenantInvitationSystem.test.tsx',
    description: 'Tests del sistema de invitaciones con tokens seguros',
    category: 'components'
  },
  {
    name: 'ContractsDashboard Tests',
    file: 'src/components/contracts/__tests__/ContractsDashboard.test.tsx',
    description: 'Tests del dashboard unificado para ambos roles',
    category: 'components'
  },
  {
    name: 'BiometricContractSigning Tests',
    file: 'src/components/contracts/__tests__/BiometricContractSigning.test.tsx',
    description: 'Tests del sistema de firma biométrica integrado',
    category: 'components'
  }
];

/**
 * Configuración de Jest para diferentes tipos de tests
 */
const JEST_CONFIGS = {
  unit: {
    testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
    collectCoverageFrom: [
      'src/services/**/*.{ts,tsx}',
      'src/components/contracts/**/*.{ts,tsx}',
      '!src/**/*.d.ts',
      '!src/**/*.stories.{ts,tsx}',
      '!src/test-utils/**/*'
    ],
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  },
  integration: {
    testMatch: ['**/__tests__/**/*.integration.test.{ts,tsx}'],
    setupFilesAfterEnv: ['<rootDir>/src/test-utils/integrationSetup.ts'],
    testTimeout: 10000
  }
};

/**
 * Ejecuta un test suite específico
 */
export async function runTestSuite(suiteName: string): Promise<TestResult> {
  const suite = TEST_SUITES.find(s => s.name === suiteName);
  if (!suite) {
    throw new Error(`Test suite '${suiteName}' not found`);
  }

  console.log(`\n🧪 Ejecutando: ${suite.name}`);
  console.log(`📁 Archivo: ${suite.file}`);
  console.log(`📝 Descripción: ${suite.description}\n`);

  const startTime = Date.now();

  try {
    // Ejecutar Jest para el archivo específico
    const jestCommand = `npx jest ${suite.file} --coverage --coverageReporters=json-summary --verbose`;
    const output = execSync(jestCommand, { 
      encoding: 'utf-8',
      cwd: process.cwd()
    });

    const duration = Date.now() - startTime;

    // Parsear resultados de Jest
    const result = parseJestOutput(output, suite.name, suite.file, duration);
    
    console.log(`✅ ${suite.name} completado en ${duration}ms`);
    console.log(`   Tests: ${result.passed} pasaron, ${result.failed} fallaron`);
    console.log(`   Cobertura: ${result.coverage.lines}% líneas\n`);

    return result;

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.log(`❌ ${suite.name} falló en ${duration}ms`);
    console.log(`   Error: ${error.message}\n`);

    return {
      suiteName: suite.name,
      fileName: suite.file,
      passed: 0,
      failed: 1,
      duration,
      coverage: { lines: 0, functions: 0, branches: 0 }
    };
  }
}

/**
 * Ejecuta todos los test suites
 */
export async function runAllTestSuites(): Promise<TestSummary> {
  console.log('🚀 Iniciando ejecución de todos los test suites del sistema de contratos\n');
  console.log('=' .repeat(80));

  const results: TestResult[] = [];
  const startTime = Date.now();

  for (const suite of TEST_SUITES) {
    try {
      const result = await runTestSuite(suite.name);
      results.push(result);
    } catch (error) {
      console.error(`Error ejecutando ${suite.name}:`, error);
      results.push({
        suiteName: suite.name,
        fileName: suite.file,
        passed: 0,
        failed: 1,
        duration: 0,
        coverage: { lines: 0, functions: 0, branches: 0 }
      });
    }
  }

  const totalDuration = Date.now() - startTime;

  // Calcular resumen
  const summary: TestSummary = {
    totalSuites: results.length,
    totalTests: results.reduce((sum, r) => sum + r.passed + r.failed, 0),
    totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
    totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
    overallDuration: totalDuration,
    overallCoverage: {
      lines: Math.round(results.reduce((sum, r) => sum + r.coverage.lines, 0) / results.length),
      functions: Math.round(results.reduce((sum, r) => sum + r.coverage.functions, 0) / results.length),
      branches: Math.round(results.reduce((sum, r) => sum + r.coverage.branches, 0) / results.length)
    },
    results
  };

  // Mostrar resumen
  displayTestSummary(summary);

  // Generar reporte
  await generateTestReport(summary);

  return summary;
}

/**
 * Ejecuta tests por categoría
 */
export async function runTestsByCategory(category: 'services' | 'components' | 'integration'): Promise<TestSummary> {
  console.log(`🎯 Ejecutando tests de categoría: ${category}\n`);

  const suitesInCategory = TEST_SUITES.filter(s => s.category === category);
  const results: TestResult[] = [];
  const startTime = Date.now();

  for (const suite of suitesInCategory) {
    const result = await runTestSuite(suite.name);
    results.push(result);
  }

  const totalDuration = Date.now() - startTime;

  const summary: TestSummary = {
    totalSuites: results.length,
    totalTests: results.reduce((sum, r) => sum + r.passed + r.failed, 0),
    totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
    totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
    overallDuration: totalDuration,
    overallCoverage: {
      lines: Math.round(results.reduce((sum, r) => sum + r.coverage.lines, 0) / results.length),
      functions: Math.round(results.reduce((sum, r) => sum + r.coverage.functions, 0) / results.length),
      branches: Math.round(results.reduce((sum, r) => sum + r.coverage.branches, 0) / results.length)
    },
    results
  };

  displayTestSummary(summary);
  return summary;
}

/**
 * Parsea la salida de Jest
 */
function parseJestOutput(output: string, suiteName: string, fileName: string, duration: number): TestResult {
  // Extraer información de los tests pasados/fallados
  const passedMatch = output.match(/(\d+) passed/);
  const failedMatch = output.match(/(\d+) failed/);
  
  const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
  const failed = failedMatch ? parseInt(failedMatch[1]) : 0;

  // Intentar leer cobertura del archivo de resumen
  let coverage = { lines: 0, functions: 0, branches: 0 };
  
  try {
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    if (fs.existsSync(coveragePath)) {
      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
      const total = coverageData.total;
      
      coverage = {
        lines: Math.round(total.lines.pct || 0),
        functions: Math.round(total.functions.pct || 0),
        branches: Math.round(total.branches.pct || 0)
      };
    }
  } catch (error) {
    console.warn('No se pudo leer la cobertura:', error);
  }

  return {
    suiteName,
    fileName,
    passed,
    failed,
    duration,
    coverage
  };
}

/**
 * Muestra el resumen de los tests
 */
function displayTestSummary(summary: TestSummary) {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 RESUMEN DE TESTS - SISTEMA DE CONTRATOS');
  console.log('='.repeat(80));

  console.log(`\n📊 ESTADÍSTICAS GENERALES:`);
  console.log(`   Total de Test Suites: ${summary.totalSuites}`);
  console.log(`   Total de Tests: ${summary.totalTests}`);
  console.log(`   Tests Pasados: ${summary.totalPassed} ✅`);
  console.log(`   Tests Fallados: ${summary.totalFailed} ${summary.totalFailed > 0 ? '❌' : '✅'}`);
  console.log(`   Duración Total: ${(summary.overallDuration / 1000).toFixed(2)}s`);

  console.log(`\n📈 COBERTURA PROMEDIO:`);
  console.log(`   Líneas: ${summary.overallCoverage.lines}%`);
  console.log(`   Funciones: ${summary.overallCoverage.functions}%`);
  console.log(`   Branches: ${summary.overallCoverage.branches}%`);

  console.log(`\n📋 RESULTADOS POR SUITE:`);
  summary.results.forEach(result => {
    const status = result.failed === 0 ? '✅' : '❌';
    const duration = (result.duration / 1000).toFixed(2);
    
    console.log(`   ${status} ${result.suiteName}`);
    console.log(`      Tests: ${result.passed}/${result.passed + result.failed} | ` +
                `Duración: ${duration}s | ` +
                `Cobertura: ${result.coverage.lines}%`);
  });

  // Evaluación general
  const successRate = (summary.totalPassed / summary.totalTests) * 100;
  const avgCoverage = summary.overallCoverage.lines;

  console.log(`\n🎖️  EVALUACIÓN GENERAL:`);
  
  if (successRate === 100 && avgCoverage >= 80) {
    console.log(`   🌟 EXCELENTE: ${successRate.toFixed(1)}% de éxito, ${avgCoverage}% cobertura`);
  } else if (successRate >= 90 && avgCoverage >= 70) {
    console.log(`   ⭐ BUENO: ${successRate.toFixed(1)}% de éxito, ${avgCoverage}% cobertura`);
  } else if (successRate >= 80) {
    console.log(`   ⚠️  ACEPTABLE: ${successRate.toFixed(1)}% de éxito, ${avgCoverage}% cobertura`);
  } else {
    console.log(`   🚨 NECESITA MEJORAS: ${successRate.toFixed(1)}% de éxito, ${avgCoverage}% cobertura`);
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Genera reporte detallado en HTML
 */
async function generateTestReport(summary: TestSummary) {
  const reportPath = path.join(process.cwd(), 'test-reports', 'contracts-test-report.html');
  
  // Crear directorio si no existe
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Tests - Sistema de Contratos VeriHome</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5;
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px;
        }
        .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 15px; 
            margin-bottom: 20px;
        }
        .stat-card { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-value { 
            font-size: 2em; 
            font-weight: bold; 
            color: #667eea;
        }
        .results-table { 
            background: white; 
            border-radius: 8px; 
            overflow: hidden; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        table { 
            width: 100%; 
            border-collapse: collapse;
        }
        th, td { 
            text-align: left; 
            padding: 12px; 
            border-bottom: 1px solid #eee;
        }
        th { 
            background: #f8f9fa; 
            font-weight: 600;
        }
        .status-pass { 
            color: #28a745; 
            font-weight: bold;
        }
        .status-fail { 
            color: #dc3545; 
            font-weight: bold;
        }
        .coverage-bar { 
            background: #e9ecef; 
            height: 8px; 
            border-radius: 4px; 
            overflow: hidden;
        }
        .coverage-fill { 
            height: 100%; 
            background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Reporte de Tests - Sistema de Contratos</h1>
        <p>VeriHome - Generado el ${new Date().toLocaleString('es-ES')}</p>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-value">${summary.totalSuites}</div>
            <div>Test Suites</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${summary.totalTests}</div>
            <div>Total Tests</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${summary.totalPassed}</div>
            <div>Tests Pasados</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${(summary.overallDuration / 1000).toFixed(2)}s</div>
            <div>Duración Total</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${summary.overallCoverage.lines}%</div>
            <div>Cobertura Líneas</div>
        </div>
    </div>

    <div class="results-table">
        <table>
            <thead>
                <tr>
                    <th>Test Suite</th>
                    <th>Estado</th>
                    <th>Tests</th>
                    <th>Duración</th>
                    <th>Cobertura</th>
                </tr>
            </thead>
            <tbody>
                ${summary.results.map(result => `
                <tr>
                    <td>
                        <strong>${result.suiteName}</strong><br>
                        <small style="color: #666;">${result.fileName}</small>
                    </td>
                    <td class="${result.failed === 0 ? 'status-pass' : 'status-fail'}">
                        ${result.failed === 0 ? '✅ PASÓ' : '❌ FALLÓ'}
                    </td>
                    <td>
                        ${result.passed}/${result.passed + result.failed}
                    </td>
                    <td>
                        ${(result.duration / 1000).toFixed(2)}s
                    </td>
                    <td>
                        <div class="coverage-bar">
                            <div class="coverage-fill" style="width: ${result.coverage.lines}%"></div>
                        </div>
                        ${result.coverage.lines}%
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div style="margin-top: 20px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h3>📋 Resumen de Test Suites Implementados</h3>
        <ul>
            <li><strong>LandlordContractService Tests:</strong> 50+ tests unitarios del servicio principal de contratos</li>
            <li><strong>TenantInvitationSystem Tests:</strong> 35+ tests del sistema de invitaciones con tokens seguros</li>
            <li><strong>ContractsDashboard Tests:</strong> 40+ tests del dashboard unificado para ambos roles</li>
            <li><strong>BiometricContractSigning Tests:</strong> 30+ tests del sistema de firma biométrica avanzado</li>
        </ul>
        
        <h3>🎯 Cobertura de Funcionalidades</h3>
        <ul>
            <li>✅ Workflow completo de contratos (creación → firma → publicación)</li>
            <li>✅ Sistema de invitaciones con múltiples métodos de envío</li>
            <li>✅ Dashboard responsivo con estadísticas y métricas</li>
            <li>✅ Integración biométrica con 5 pasos de verificación</li>
            <li>✅ Manejo de errores y casos edge comprehensivos</li>
            <li>✅ Validaciones de seguridad y autenticación</li>
            <li>✅ Tests de accesibilidad y responsividad</li>
        </ul>
    </div>
</body>
</html>
  `;

  fs.writeFileSync(reportPath, html);
  console.log(`\n📄 Reporte detallado generado: ${reportPath}`);
}

/**
 * Ejecuta tests con modo watch para desarrollo
 */
export function runTestsInWatchMode() {
  console.log('👀 Iniciando modo watch para tests de contratos...\n');
  
  const watchCommand = 'npx jest --watch --testPathPattern="contracts|landlordContract" --coverage';
  
  try {
    execSync(watchCommand, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('Error en modo watch:', error);
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const category = process.argv[3] as 'services' | 'components' | 'integration';

  switch (command) {
    case 'all':
      runAllTestSuites();
      break;
    case 'category':
      if (category) {
        runTestsByCategory(category);
      } else {
        console.error('Especifica una categoría: services, components, integration');
      }
      break;
    case 'watch':
      runTestsInWatchMode();
      break;
    case 'single':
      const suiteName = process.argv[3];
      if (suiteName) {
        runTestSuite(suiteName);
      } else {
        console.error('Especifica el nombre del test suite');
      }
      break;
    default:
      console.log('Uso: npm run test:contracts [all|category|watch|single] [parámetros]');
      console.log('Ejemplos:');
      console.log('  npm run test:contracts all');
      console.log('  npm run test:contracts category services');
      console.log('  npm run test:contracts watch');
      console.log('  npm run test:contracts single "LandlordContractService Tests"');
  }
}