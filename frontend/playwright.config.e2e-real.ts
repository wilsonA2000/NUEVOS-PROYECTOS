/**
 * Config Playwright para el test E2E multi-usuario contra backend REAL.
 *
 * Diferencias clave vs playwright.config.ts:
 *   - NO levanta dev server (user los gestiona en screen)
 *   - video/trace/screenshot siempre activos (on)
 *   - retries=0, workers=1, fullyParallel=false para determinismo
 *   - globalSetup verifica servers y corre seed Python
 *   - testDir solo apunta al test multi-usuario
 */
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: './playwright/tests',
  testMatch: /(multi-user-contract-signing|full-platform-e2e|button-audit|full-admin-review-flow|fase-[a-z][0-9]-.+)\.spec\.ts/,

  timeout: 180 * 1000, // 3 min: el flujo completo es largo
  expect: { timeout: 15000 },

  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,

  globalSetup: path.resolve(__dirname, 'playwright/global-setup-e2e.ts'),

  reporter: [
    ['html', { outputFolder: 'playwright-report-e2e-real', open: 'never' }],
    ['json', { outputFile: 'playwright-report-e2e-real/results.json' }],
    ['list'],
  ],

  outputDir: 'playwright-artifacts-e2e-real',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    viewport: { width: 1366, height: 820 },
    ignoreHTTPSErrors: true,
    actionTimeout: 15000,
    navigationTimeout: 30000,
    // Permitir cámara/mic por si la UI biométrica intenta getUserMedia
    permissions: ['camera', 'microphone'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
