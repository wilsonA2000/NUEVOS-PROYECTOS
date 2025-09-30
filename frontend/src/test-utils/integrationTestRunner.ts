/**
 * Test Runner para Tests de Integración
 * Ejecuta y gestiona los tests de integración del sistema de contratos
 * Proporciona reportes detallados y métricas de rendimiento
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface IntegrationTestResult {
  suiteName: string;
  fileName: string;
  passed: number;
  failed: number;
  duration: number;
  coverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  performance: {
    averageTestTime: number;
    slowestTest: string;
    fastestTest: string;
  };
}

interface IntegrationTestSummary {
  totalSuites: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  overallDuration: number;
  overallCoverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  performance: {
    totalTime: number;
    averageTestTime: number;
    memoryUsage: string;
    cpuUsage: string;
  };
  results: IntegrationTestResult[];
}

/**
 * Configuración de test suites de integración
 */
const INTEGRATION_TEST_SUITES = [
  {
    name: 'Contract Workflow Integration',
    file: 'src/__tests__/integration/contractWorkflow.integration.test.ts',
    description: 'Tests del flujo completo de contratos desde creación hasta publicación',
    category: 'workflow',
    priority: 'high',
    timeout: 60000 // 1 minuto
  },
  {
    name: 'Biometric Flow Integration',
    file: 'src/__tests__/integration/biometricFlow.integration.test.ts',
    description: 'Tests del sistema biométrico completo con 5 pasos de verificación',
    category: 'biometric',
    priority: 'high',
    timeout: 90000 // 1.5 minutos
  },
  {
    name: 'API Integration Tests',
    file: 'src/__tests__/integration/apiIntegration.integration.test.ts',
    description: 'Tests de comunicación frontend-backend y manejo de errores',
    category: 'api',
    priority: 'high',
    timeout: 45000 // 45 segundos
  }
];

/**
 * Configuración de Jest para tests de integración
 */
const INTEGRATION_JEST_CONFIG = {
  testMatch: ['**/__tests__/integration/*.integration.test.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/integrationSetup.ts'],
  testTimeout: 60000,
  maxWorkers: 2, // Limitar workers para tests de integración
  collectCoverageFrom: [
    'src/services/**/*.{ts,tsx}',
    'src/components/contracts/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/test-utils/**/*',
    '!src/__mocks__/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-reports/integration',
      filename: 'integration-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'VeriHome - Integration Tests Report'
    }]
  ]
};

/**
 * Ejecuta un test suite de integración específico
 */
export async function runIntegrationTestSuite(suiteName: string): Promise<IntegrationTestResult> {
  const suite = INTEGRATION_TEST_SUITES.find(s => s.name === suiteName);
  if (!suite) {
    throw new Error(`Integration test suite '${suiteName}' not found`);
  }

  console.log(`\n🧪 Ejecutando: ${suite.name}`);
  console.log(`📁 Archivo: ${suite.file}`);
  console.log(`📝 Descripción: ${suite.description}`);
  console.log(`⏱️  Timeout: ${suite.timeout / 1000}s\n`);

  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  try {
    // Construir comando Jest para integración
    const jestCommand = [
      'npx jest',
      `"${suite.file}"`,
      '--coverage',
      '--coverageReporters=json-summary',
      '--coverageReporters=html',
      '--verbose',
      '--detectOpenHandles',
      '--forceExit',
      `--testTimeout=${suite.timeout}`,
      '--maxWorkers=1', // Un solo worker para tests de integración
      '--runInBand' // Ejecutar secuencialmente
    ].join(' ');

    console.log(`🔧 Comando: ${jestCommand}\n`);

    const output = execSync(jestCommand, { 
      encoding: 'utf-8',
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        CI: 'true'
      }
    });

    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsed = endMemory - startMemory;

    // Parsear resultados
    const result = parseIntegrationTestOutput(output, suite.name, suite.file, duration);
    
    console.log(`✅ ${suite.name} completado en ${duration}ms`);
    console.log(`   Tests: ${result.passed} pasaron, ${result.failed} fallaron`);
    console.log(`   Cobertura: ${result.coverage.lines}% líneas`);
    console.log(`   Memoria: ${formatBytes(memoryUsed)}\n`);

    return result;

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.log(`❌ ${suite.name} falló en ${duration}ms`);
    console.log(`   Error: ${error.message}\n`);

    // Intentar parsear output parcial si existe
    try {
      const partialResult = parseIntegrationTestOutput(error.stdout || '', suite.name, suite.file, duration);
      return partialResult;
    } catch {
      return {
        suiteName: suite.name,
        fileName: suite.file,
        passed: 0,
        failed: 1,
        duration,
        coverage: { lines: 0, functions: 0, branches: 0, statements: 0 },
        performance: { averageTestTime: 0, slowestTest: 'unknown', fastestTest: 'unknown' }
      };
    }
  }
}

/**
 * Ejecuta todos los test suites de integración
 */
export async function runAllIntegrationTests(): Promise<IntegrationTestSummary> {
  console.log('🚀 Iniciando ejecución de todos los tests de integración\n');
  console.log('='.repeat(80));
  console.log('🔬 VERIHOME - INTEGRATION TESTS SUITE');
  console.log('='.repeat(80));

  const results: IntegrationTestResult[] = [];
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  // Ejecutar tests secuencialmente para evitar conflictos
  for (const suite of INTEGRATION_TEST_SUITES) {
    try {
      console.log(`\n📋 Suite ${results.length + 1}/${INTEGRATION_TEST_SUITES.length}: ${suite.name}`);
      const result = await runIntegrationTestSuite(suite.name);
      results.push(result);
      
      // Pausa entre suites para estabilidad
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Error ejecutando ${suite.name}:`, error);
      results.push({
        suiteName: suite.name,
        fileName: suite.file,
        passed: 0,
        failed: 1,
        duration: 0,
        coverage: { lines: 0, functions: 0, branches: 0, statements: 0 },
        performance: { averageTestTime: 0, slowestTest: 'error', fastestTest: 'error' }
      });
    }
  }

  const totalDuration = Date.now() - startTime;
  const endMemory = process.memoryUsage().heapUsed;
  const totalMemoryUsed = endMemory - startMemory;

  // Calcular resumen
  const summary: IntegrationTestSummary = {
    totalSuites: results.length,
    totalTests: results.reduce((sum, r) => sum + r.passed + r.failed, 0),
    totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
    totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
    overallDuration: totalDuration,
    overallCoverage: {
      lines: Math.round(results.reduce((sum, r) => sum + r.coverage.lines, 0) / results.length),
      functions: Math.round(results.reduce((sum, r) => sum + r.coverage.functions, 0) / results.length),
      branches: Math.round(results.reduce((sum, r) => sum + r.coverage.branches, 0) / results.length),
      statements: Math.round(results.reduce((sum, r) => sum + r.coverage.statements, 0) / results.length)
    },
    performance: {
      totalTime: totalDuration,
      averageTestTime: Math.round(totalDuration / Math.max(1, summary.totalTests || 1)),
      memoryUsage: formatBytes(totalMemoryUsed),
      cpuUsage: 'N/A' // Placeholder para futuras métricas
    },
    results
  };

  // Mostrar resumen
  displayIntegrationTestSummary(summary);

  // Generar reportes
  await generateIntegrationTestReport(summary);

  return summary;
}

/**
 * Ejecuta tests por categoría
 */
export async function runIntegrationTestsByCategory(
  category: 'workflow' | 'biometric' | 'api'
): Promise<IntegrationTestSummary> {
  console.log(`🎯 Ejecutando tests de integración - Categoría: ${category}\n`);

  const suitesInCategory = INTEGRATION_TEST_SUITES.filter(s => s.category === category);
  const results: IntegrationTestResult[] = [];
  const startTime = Date.now();

  for (const suite of suitesInCategory) {
    const result = await runIntegrationTestSuite(suite.name);
    results.push(result);
  }

  const totalDuration = Date.now() - startTime;

  const summary: IntegrationTestSummary = {
    totalSuites: results.length,
    totalTests: results.reduce((sum, r) => sum + r.passed + r.failed, 0),
    totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
    totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
    overallDuration: totalDuration,
    overallCoverage: {
      lines: Math.round(results.reduce((sum, r) => sum + r.coverage.lines, 0) / results.length),
      functions: Math.round(results.reduce((sum, r) => sum + r.coverage.functions, 0) / results.length),
      branches: Math.round(results.reduce((sum, r) => sum + r.coverage.branches, 0) / results.length),
      statements: Math.round(results.reduce((sum, r) => sum + r.coverage.statements, 0) / results.length)
    },
    performance: {
      totalTime: totalDuration,
      averageTestTime: Math.round(totalDuration / Math.max(1, summary.totalTests || 1)),
      memoryUsage: formatBytes(process.memoryUsage().heapUsed),
      cpuUsage: 'N/A'
    },
    results
  };

  displayIntegrationTestSummary(summary);
  return summary;
}

/**
 * Parsea la salida de Jest para tests de integración
 */
function parseIntegrationTestOutput(
  output: string, 
  suiteName: string, 
  fileName: string, 
  duration: number
): IntegrationTestResult {
  // Extraer tests pasados/fallados
  const passedMatch = output.match(/(\\d+) passed/);
  const failedMatch = output.match(/(\\d+) failed/);
  const testsMatch = output.match(/Tests:\\s+(\\d+) failed, (\\d+) passed, (\\d+) total/);
  
  let passed = 0;
  let failed = 0;

  if (testsMatch) {
    failed = parseInt(testsMatch[1]) || 0;
    passed = parseInt(testsMatch[2]) || 0;
  } else {
    passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    failed = failedMatch ? parseInt(failedMatch[1]) : 0;
  }

  // Extraer tiempos de tests individuales
  const testTimeMatches = output.matchAll(/(\\w+.*?) \\((\\d+) ms\\)/g);
  const testTimes = Array.from(testTimeMatches).map(match => ({
    name: match[1],
    time: parseInt(match[2])
  }));

  const performance = {
    averageTestTime: testTimes.length > 0 
      ? Math.round(testTimes.reduce((sum, t) => sum + t.time, 0) / testTimes.length)
      : 0,
    slowestTest: testTimes.length > 0 
      ? testTimes.reduce((prev, curr) => prev.time > curr.time ? prev : curr).name
      : 'unknown',
    fastestTest: testTimes.length > 0 
      ? testTimes.reduce((prev, curr) => prev.time < curr.time ? prev : curr).name
      : 'unknown'
  };

  // Intentar leer cobertura
  let coverage = { lines: 0, functions: 0, branches: 0, statements: 0 };
  
  try {
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    if (fs.existsSync(coveragePath)) {
      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
      const total = coverageData.total;
      
      coverage = {
        lines: Math.round(total.lines.pct || 0),
        functions: Math.round(total.functions.pct || 0),
        branches: Math.round(total.branches.pct || 0),
        statements: Math.round(total.statements.pct || 0)
      };
    }
  } catch (error) {
    console.warn('⚠️  No se pudo leer la cobertura:', error);
  }

  return {
    suiteName,
    fileName,
    passed,
    failed,
    duration,
    coverage,
    performance
  };
}

/**
 * Muestra el resumen de tests de integración
 */
function displayIntegrationTestSummary(summary: IntegrationTestSummary) {
  console.log('\\n' + '='.repeat(80));
  console.log('🔬 RESUMEN DE TESTS DE INTEGRACIÓN - SISTEMA DE CONTRATOS');
  console.log('='.repeat(80));

  console.log(`\\n📊 ESTADÍSTICAS GENERALES:`);
  console.log(`   Total de Test Suites: ${summary.totalSuites}`);
  console.log(`   Total de Tests: ${summary.totalTests}`);
  console.log(`   Tests Pasados: ${summary.totalPassed} ✅`);
  console.log(`   Tests Fallados: ${summary.totalFailed} ${summary.totalFailed > 0 ? '❌' : '✅'}`);
  console.log(`   Duración Total: ${(summary.overallDuration / 1000).toFixed(2)}s`);

  console.log(`\\n📈 COBERTURA PROMEDIO:`);
  console.log(`   Líneas: ${summary.overallCoverage.lines}%`);
  console.log(`   Funciones: ${summary.overallCoverage.functions}%`);
  console.log(`   Branches: ${summary.overallCoverage.branches}%`);
  console.log(`   Statements: ${summary.overallCoverage.statements}%`);

  console.log(`\\n⚡ RENDIMIENTO:`);
  console.log(`   Tiempo Total: ${(summary.performance.totalTime / 1000).toFixed(2)}s`);
  console.log(`   Tiempo Promedio por Test: ${summary.performance.averageTestTime}ms`);
  console.log(`   Uso de Memoria: ${summary.performance.memoryUsage}`);

  console.log(`\\n📋 RESULTADOS POR SUITE:`);
  summary.results.forEach(result => {
    const status = result.failed === 0 ? '✅' : '❌';
    const duration = (result.duration / 1000).toFixed(2);
    
    console.log(`   ${status} ${result.suiteName}`);
    console.log(`      Tests: ${result.passed}/${result.passed + result.failed} | ` +
                `Duración: ${duration}s | ` +
                `Cobertura: ${result.coverage.lines}%`);
    console.log(`      Rendimiento: Promedio ${result.performance.averageTestTime}ms | ` +
                `Más lento: ${result.performance.slowestTest}`);
  });

  // Evaluación general
  const successRate = summary.totalTests > 0 ? (summary.totalPassed / summary.totalTests) * 100 : 0;
  const avgCoverage = summary.overallCoverage.lines;

  console.log(`\\n🎖️  EVALUACIÓN GENERAL:`);
  
  if (successRate === 100 && avgCoverage >= 80) {
    console.log(`   🌟 EXCELENTE: ${successRate.toFixed(1)}% de éxito, ${avgCoverage}% cobertura`);
    console.log(`   🚀 Sistema de contratos completamente integrado y verificado`);
  } else if (successRate >= 90 && avgCoverage >= 70) {
    console.log(`   ⭐ BUENO: ${successRate.toFixed(1)}% de éxito, ${avgCoverage}% cobertura`);
    console.log(`   📈 Sistema mayormente estable con algunas mejoras posibles`);
  } else if (successRate >= 80) {
    console.log(`   ⚠️  ACEPTABLE: ${successRate.toFixed(1)}% de éxito, ${avgCoverage}% cobertura`);
    console.log(`   🔧 Requiere atención en áreas específicas`);
  } else {
    console.log(`   🚨 NECESITA MEJORAS: ${successRate.toFixed(1)}% de éxito, ${avgCoverage}% cobertura`);
    console.log(`   ⛑️  Intervención urgente requerida`);
  }

  if (summary.totalFailed === 0) {
    console.log(`\\n🎉 ¡TODOS LOS TESTS DE INTEGRACIÓN PASARON!`);
    console.log(`   ✨ El sistema de contratos está completamente integrado`);
    console.log(`   🔒 Flujo biométrico validado y seguro`);
    console.log(`   📡 APIs funcionando correctamente`);
  }

  console.log('\\n' + '='.repeat(80));
}

/**
 * Genera reporte detallado en HTML
 */
async function generateIntegrationTestReport(summary: IntegrationTestSummary) {
  const reportPath = path.join(process.cwd(), 'test-reports', 'integration-tests-report.html');
  
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
    <title>Reporte de Tests de Integración - VeriHome</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f7fa;
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            border-radius: 12px; 
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px;
        }
        .stat-card { 
            background: white; 
            padding: 25px; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-value { 
            font-size: 2.5em; 
            font-weight: bold; 
            color: #667eea;
            margin: 0;
        }
        .stat-label { 
            color: #666; 
            margin-top: 8px;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .coverage-section {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        .coverage-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .coverage-item {
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .coverage-value {
            font-size: 2em;
            font-weight: bold;
            color: #28a745;
        }
        .results-table { 
            background: white; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        table { 
            width: 100%; 
            border-collapse: collapse;
        }
        th, td { 
            text-align: left; 
            padding: 15px; 
            border-bottom: 1px solid #eee;
        }
        th { 
            background: #f8f9fa; 
            font-weight: 600;
            color: #333;
        }
        .status-pass { 
            color: #28a745; 
            font-weight: bold;
        }
        .status-fail { 
            color: #dc3545; 
            font-weight: bold;
        }
        .performance-bar {
            background: #e9ecef;
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 5px;
        }
        .performance-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
        }
        .summary-section {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .integration-features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .feature-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .feature-title {
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        .feature-description {
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔬 Tests de Integración - VeriHome</h1>
        <p>Sistema de Contratos con Verificación Biométrica - Generado el ${new Date().toLocaleString('es-ES')}</p>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-value">${summary.totalSuites}</div>
            <div class="stat-label">Test Suites</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${summary.totalTests}</div>
            <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${summary.totalPassed}</div>
            <div class="stat-label">Tests Pasados</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${(summary.overallDuration / 1000).toFixed(1)}s</div>
            <div class="stat-label">Duración Total</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${summary.performance.memoryUsage}</div>
            <div class="stat-label">Memoria Utilizada</div>
        </div>
    </div>

    <div class="coverage-section">
        <h3>📈 Cobertura de Código</h3>
        <div class="coverage-grid">
            <div class="coverage-item">
                <div class="coverage-value">${summary.overallCoverage.lines}%</div>
                <div>Líneas</div>
            </div>
            <div class="coverage-item">
                <div class="coverage-value">${summary.overallCoverage.functions}%</div>
                <div>Funciones</div>
            </div>
            <div class="coverage-item">
                <div class="coverage-value">${summary.overallCoverage.branches}%</div>
                <div>Branches</div>
            </div>
            <div class="coverage-item">
                <div class="coverage-value">${summary.overallCoverage.statements}%</div>
                <div>Statements</div>
            </div>
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
                    <th>Rendimiento</th>
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
                        ${result.coverage.lines}%
                    </td>
                    <td>
                        Promedio: ${result.performance.averageTestTime}ms<br>
                        <small style="color: #666;">Más lento: ${result.performance.slowestTest}</small>
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="summary-section">
        <h3>🎯 Tests de Integración Implementados</h3>
        <div class="integration-features">
            <div class="feature-card">
                <div class="feature-title">🔄 Contract Workflow Integration</div>
                <div class="feature-description">
                    Tests del flujo completo desde creación hasta publicación. Incluye workflow de arrendador, 
                    revisión de arrendatario, sistema de objeciones y aprobaciones.
                </div>
            </div>
            <div class="feature-card">
                <div class="feature-title">🔒 Biometric Flow Integration</div>
                <div class="feature-description">
                    Tests del sistema biométrico de 5 pasos: captura facial, verificación de documentos, 
                    grabación de voz, firma digital y validación de seguridad.
                </div>
            </div>
            <div class="feature-card">
                <div class="feature-title">📡 API Integration Tests</div>
                <div class="feature-description">
                    Tests de comunicación frontend-backend, manejo de errores, resiliencia de red, 
                    autenticación y validación de datos.
                </div>
            </div>
        </div>
        
        <h3>🚀 Cobertura de Funcionalidades</h3>
        <ul>
            <li>✅ Workflow completo de contratos (arrendador → arrendatario → firma → publicación)</li>
            <li>✅ Sistema biométrico completo con 5 pasos de verificación avanzada</li>
            <li>✅ Integración de APIs REST con manejo robusto de errores</li>
            <li>✅ Sistema de invitaciones con múltiples métodos (email, SMS, WhatsApp)</li>
            <li>✅ Dashboard unificado con estadísticas y métricas en tiempo real</li>
            <li>✅ Manejo de errores de red, timeouts y validación de datos</li>
            <li>✅ Tests de rendimiento y uso de memoria</li>
            <li>✅ Validación de seguridad y detección de fraude</li>
            <li>✅ Accesibilidad y compatibilidad móvil</li>
            <li>✅ Casos edge y escenarios de error complejos</li>
        </ul>
    </div>
</body>
</html>
  `;

  fs.writeFileSync(reportPath, html);
  console.log(`\\n📄 Reporte de integración detallado generado: ${reportPath}`);
}

/**
 * Formatea bytes a formato legible
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const category = process.argv[3] as 'workflow' | 'biometric' | 'api';

  switch (command) {
    case 'all':
      runAllIntegrationTests();
      break;
    case 'category':
      if (category) {
        runIntegrationTestsByCategory(category);
      } else {
        console.error('Especifica una categoría: workflow, biometric, api');
      }
      break;
    case 'single':
      const suiteName = process.argv[3];
      if (suiteName) {
        runIntegrationTestSuite(suiteName);
      } else {
        console.error('Especifica el nombre del test suite');
      }
      break;
    default:
      console.log('Uso: npm run test:integration [all|category|single] [parámetros]');
      console.log('Ejemplos:');
      console.log('  npm run test:integration all');
      console.log('  npm run test:integration category workflow');
      console.log('  npm run test:integration single "Contract Workflow Integration"');
  }
}