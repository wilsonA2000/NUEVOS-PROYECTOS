/**
 * F1 · Fase C3 — VHID enforcement para tenant sin onboarding
 *
 * Garantiza que el backend bloquea acciones críticas con 403 +
 * `code === 'verihome_id_required'` y que el frontend reacciona vía
 * `VerihomeIdRequiredListener` (snackbar + redirect a /verihome-id/onboarding).
 *
 * Modo seed: `vhid_tenant_unverified`.
 */

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runSeed,
  getAuthToken,
  apiPost,
  createRunContext,
  logStep,
  attachLoggers,
  snap,
} from '../helpers/multi-user-logger';

const __filename_c3 = fileURLToPath(import.meta.url);
const __dirname_c3 = path.dirname(__filename_c3);

const BACKEND = process.env.PLAYWRIGHT_BACKEND_URL || 'http://localhost:8000';

interface SeedResult {
  tenant_email: string;
  password: string;
  property_id: string;
  [k: string]: unknown;
}

test.describe.configure({ mode: 'serial' });

test.describe('F1 · C3 · VHID enforcement tenant sin onboarding', () => {
  let seed: SeedResult;
  let tenantToken: string;
  const ctx = createRunContext(
    path.resolve(__dirname_c3, '..', '..', 'e2e-logs', 'fase-c3'),
  );

  test.beforeAll(async () => {
    seed = runSeed('vhid_tenant_unverified') as unknown as SeedResult;
    logStep(ctx, 'system', 'seed', 'ok', { property_id: seed.property_id });
    const auth = await getAuthToken(seed.tenant_email, seed.password);
    expect(auth, 'tenant login fallo').not.toBeNull();
    tenantToken = auth!.access;
  });

  test('POST /matching/requests/ → 403 verihome_id_required + next_step=start_onboarding', async () => {
    logStep(ctx, 'tenant', 'create-match-request', 'start');
    const res = await apiPost(tenantToken, '/matching/requests/', {
      property: seed.property_id,
      tenant_message: 'Solicitud test C3',
      monthly_income: '3000000',
      employment_type: 'employed',
    });
    logStep(
      ctx,
      'tenant',
      'create-match-request',
      res.status === 403 ? 'ok' : 'fail',
      { status: res.status, body: res.body },
    );

    expect(res.status, JSON.stringify(res.body)).toBe(403);
    const body = res.body as Record<string, unknown>;
    expect(body.code).toBe('verihome_id_required');
    expect(body.next_step).toBe('start_onboarding');
  });

  test('UI: tenant en /app/dashboard ve banner VHID warning', async ({
    page,
  }) => {
    attachLoggers(page, 'tenant', ctx);
    await page.goto('/login');
    await page.fill(
      'input[name="email"], input[type="email"]',
      seed.tenant_email,
    );
    await page.fill(
      'input[name="password"], input[type="password"]',
      seed.password,
    );
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app/**', { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.goto('/app/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const banner = page.getByTestId('vhid-banner');
    await expect(banner).toBeVisible({ timeout: 30000 });
    await expect(banner).toHaveAttribute('data-vhid-next-step', 'start_onboarding');
    await expect(
      banner.getByText(/Verificación VeriHome ID requerida/i),
    ).toBeVisible();

    const cta = page.getByTestId('vhid-banner-cta');
    await expect(cta).toBeVisible();
    await snap(page, ctx, 'tenant', 'dashboard-banner');

    await cta.click();
    await page.waitForURL('**/verihome-id/onboarding', { timeout: 15000 });
    expect(page.url()).toContain('/app/verihome-id/onboarding');
    logStep(ctx, 'tenant', 'banner-cta-redirect', 'ok');
  });
});
