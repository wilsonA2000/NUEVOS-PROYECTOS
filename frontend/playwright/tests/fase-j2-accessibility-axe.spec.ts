/**
 * Fase J2 - Accesibilidad WCAG con axe-core.
 *
 * Ejecuta una auditoría automatizada de accesibilidad sobre dos
 * páginas públicas clave:
 *   - Landing page (`/`)
 *   - Página de login (`/login`)
 *
 * Se reportan violaciones "serious" y "critical" únicamente (WCAG 2.1
 * AA como baseline). El test NO falla por issues menores; sólo por
 * "critical" para no bloquear la suite por polish cosméticos. El
 * listado completo se deja en `e2e-logs/fase-j/` para revisión.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createRunContext, logStep, snap } from '../helpers/multi-user-logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-j');

test.describe.configure({ mode: 'serial' });

/** Corre axe y devuelve violations serios o críticos. */
async function runAxe(page: any) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  return results.violations.filter((v: any) =>
    ['serious', 'critical'].includes(v.impact),
  );
}

test('Fase J2 · accesibilidad baseline en landing y login', async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = createRunContext(REPORT_DIR);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // --- Landing ---
  logStep(ctx, 'system', 'axe-landing', 'start');
  await page.goto('/', { waitUntil: 'networkidle' });
  await snap(page, ctx, 'system', 'landing');
  const landingViolations = await runAxe(page);
  fs.writeFileSync(
    path.join(ctx.runDir, 'axe-landing.json'),
    JSON.stringify(landingViolations, null, 2),
  );
  logStep(ctx, 'system', 'axe-landing', 'ok', {
    count: landingViolations.length,
    ids: landingViolations.map((v) => v.id),
  });
  // Solo fallar por CRITICAL.
  const landingCritical = landingViolations.filter((v) => v.impact === 'critical');
  expect(
    landingCritical,
    `Landing tiene ${landingCritical.length} violaciones CRITICAL`,
  ).toEqual([]);

  // --- Login ---
  logStep(ctx, 'system', 'axe-login', 'start');
  await page.goto('/login', { waitUntil: 'networkidle' });
  await snap(page, ctx, 'system', 'login');
  const loginViolations = await runAxe(page);
  fs.writeFileSync(
    path.join(ctx.runDir, 'axe-login.json'),
    JSON.stringify(loginViolations, null, 2),
  );
  logStep(ctx, 'system', 'axe-login', 'ok', {
    count: loginViolations.length,
    ids: loginViolations.map((v) => v.id),
  });
  const loginCritical = loginViolations.filter((v) => v.impact === 'critical');
  expect(
    loginCritical,
    `Login tiene ${loginCritical.length} violaciones CRITICAL`,
  ).toEqual([]);
});
