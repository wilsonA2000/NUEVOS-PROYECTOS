/**
 * F5 · Fase C7 — Dashboard de Analytics VeriHome ID
 *
 * Admin (`abogado.e2e@verihome.com`) entra a /app/admin/verihome-id/analytics,
 * la página llama a GET /verification/acts/analytics/ y renderiza los
 * 3 gráficos chart.js. Validamos:
 *   - API responde con shape esperado (summary, by_verdict, timeline,
 *     subscore_avg, window_months).
 *   - UI muestra el header + métricas + 3 paneles de gráficos.
 *   - Cambiar la ventana temporal (3m → 12m) re-dispara la query.
 */

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runSeed,
  getAuthToken,
  apiGet,
  createRunContext,
  logStep,
  attachLoggers,
  snap,
} from '../helpers/multi-user-logger';

const __filename_c7 = fileURLToPath(import.meta.url);
const __dirname_c7 = path.dirname(__filename_c7);

interface SeedResult {
  admin_email: string;
  password: string;
  act_id: string;
  [k: string]: unknown;
}

test.describe.configure({ mode: 'serial' });

test.describe('F5 · C7 · Admin dashboard analytics VeriHome ID', () => {
  let seed: SeedResult;
  let adminToken: string;
  const ctx = createRunContext(
    path.resolve(__dirname_c7, '..', '..', 'e2e-logs', 'fase-c7'),
  );

  test.beforeAll(async () => {
    seed = runSeed('vhid_act_in_progress') as unknown as SeedResult;
    logStep(ctx, 'system', 'seed', 'ok', { act_id: seed.act_id });
    const auth = await getAuthToken(seed.admin_email, seed.password);
    expect(auth, 'admin login fallo').not.toBeNull();
    adminToken = auth!.access;
  });

  test('API: GET /verification/acts/analytics/ devuelve shape esperado', async () => {
    const res = await apiGet(adminToken, '/verification/acts/analytics/?months=6');
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.summary).toBeTruthy();
    expect(body.by_verdict).toBeTruthy();
    expect(body.by_status).toBeTruthy();
    expect(Array.isArray(body.timeline)).toBe(true);
    expect(body.subscore_avg).toBeTruthy();
    expect(body.window_months).toBe(6);

    const summary = body.summary as Record<string, number>;
    expect(summary.total).toBeGreaterThanOrEqual(1);
    expect(summary).toHaveProperty('avg_total_score');
    expect(summary).toHaveProperty('avg_visit_score');
    expect(summary).toHaveProperty('avg_digital_score');

    const verdicts = body.by_verdict as Record<string, number>;
    expect(verdicts).toHaveProperty('aprobado');
    expect(verdicts).toHaveProperty('observado');
    expect(verdicts).toHaveProperty('rechazado');

    logStep(ctx, 'admin', 'analytics-api-shape', 'ok', { total: summary.total });
  });

  test('UI: admin carga /app/admin/verihome-id/analytics y ve métricas + gráficos', async ({
    page,
  }) => {
    attachLoggers(page, 'admin', ctx);

    // Login admin
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', seed.admin_email);
    await page.fill('input[name="password"], input[type="password"]', seed.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app/**', { timeout: 30_000 });

    // Navegar al dashboard de analytics
    await page.goto('/app/admin/verihome-id/analytics');
    await page.waitForLoadState('domcontentloaded');

    // Esperar a que se renderice el contenedor principal
    await expect(page.getByTestId('verihome-id-analytics')).toBeVisible({
      timeout: 15_000,
    });

    // Header
    await expect(page.getByRole('heading', { name: /Analytics VeriHome ID/i })).toBeVisible();

    // Métricas de resumen visibles
    await expect(page.getByText('Total actas')).toBeVisible();
    await expect(page.getByText('Aprobadas')).toBeVisible();
    await expect(page.getByText('Rechazadas')).toBeVisible();
    await expect(page.getByText('Score total promedio')).toBeVisible();

    // Los tres títulos de gráficos
    await expect(page.getByText(/Distribución por veredicto/i)).toBeVisible();
    await expect(page.getByText(/Evolución mensual/i)).toBeVisible();
    await expect(page.getByText(/Promedio por sub-puntaje/i)).toBeVisible();

    await snap(page, ctx, 'admin', 'analytics-loaded');
    logStep(ctx, 'admin', 'analytics-ui-rendered', 'ok');
  });

  test('UI: cambiar ventana temporal a 12 meses re-dispara la query', async ({
    page,
  }) => {
    attachLoggers(page, 'admin', ctx);

    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', seed.admin_email);
    await page.fill('input[name="password"], input[type="password"]', seed.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app/**', { timeout: 30_000 });

    await page.goto('/app/admin/verihome-id/analytics');
    await expect(page.getByTestId('verihome-id-analytics')).toBeVisible({
      timeout: 15_000,
    });

    // Interceptar la próxima request al endpoint analytics
    const analyticsReq = page.waitForResponse(
      r => r.url().includes('/verification/acts/analytics/') && r.url().includes('months=12'),
      { timeout: 10_000 },
    );

    // Cambiar ventana a 12 meses
    await page.getByTestId('analytics-window-select').click();
    await page.getByRole('option', { name: '12 meses' }).click();

    const response = await analyticsReq;
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.window_months).toBe(12);
    logStep(ctx, 'admin', 'analytics-window-12', 'ok');
  });
});
