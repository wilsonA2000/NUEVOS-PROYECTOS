/**
 * F1 · Fase C4 — Banner + Gate cuando tenant en estado `wait_visit`
 *
 * Tenant completó el flujo digital (`digital_verdict=aprobado`) pero la
 * visita presencial aún no ocurrió. El banner debe mostrar el mensaje
 * informativo (severity info) sin CTA, y el Gate del PropertyForm debe
 * dejar el botón "Crear Propiedad" deshabilitado con tooltip explicativo.
 *
 * Modo seed: `vhid_tenant_wait_visit`.
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

const __filename_c4 = fileURLToPath(import.meta.url);
const __dirname_c4 = path.dirname(__filename_c4);

interface SeedResult {
  tenant_email: string;
  password: string;
  property_id: string;
  field_request_id: string;
  [k: string]: unknown;
}

test.describe.configure({ mode: 'serial' });

test.describe('F1 · C4 · Banner + Gate wait_visit', () => {
  let seed: SeedResult;
  let tenantToken: string;
  const ctx = createRunContext(
    path.resolve(__dirname_c4, '..', '..', 'e2e-logs', 'fase-c4'),
  );

  test.beforeAll(async () => {
    seed = runSeed('vhid_tenant_wait_visit') as unknown as SeedResult;
    logStep(ctx, 'system', 'seed', 'ok', {
      property_id: seed.property_id,
      field_request_id: seed.field_request_id,
    });
    const auth = await getAuthToken(seed.tenant_email, seed.password);
    expect(auth, 'tenant login fallo').not.toBeNull();
    tenantToken = auth!.access;
  });

  test('API: wait_visit sigue bloqueando crear match-request (next_step=wait_visit)', async () => {
    const res = await apiPost(tenantToken, '/matching/requests/', {
      property: seed.property_id,
      tenant_message: 'Solicitud test C4',
      monthly_income: '3000000',
      employment_type: 'employed',
    });
    logStep(ctx, 'tenant', 'api-match-request-wait', res.status === 403 ? 'ok' : 'fail', {
      status: res.status,
      body: res.body,
    });

    expect(res.status, JSON.stringify(res.body)).toBe(403);
    const body = res.body as Record<string, unknown>;
    expect(body.code).toBe('verihome_id_required');
    expect(body.next_step).toBe('wait_visit');
  });

  test('UI: Dashboard muestra banner wait_visit (severity info, sin CTA)', async ({
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
    await page.waitForURL('**/app/**', { timeout: 30000 });
    await page.goto('/app/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const banner = page.getByTestId('vhid-banner');
    await expect(banner).toBeVisible({ timeout: 15000 });
    await expect(banner).toHaveAttribute('data-vhid-next-step', 'wait_visit');
    await expect(
      banner.getByText(/Tu visita VeriHome ID está pendiente/i),
    ).toBeVisible();

    // wait_visit NO renderiza CTA "Iniciar verificación"
    await expect(page.getByTestId('vhid-banner-cta')).toHaveCount(0);
    await snap(page, ctx, 'tenant', 'dashboard-banner-wait-visit');
  });

  test('UI: PropertyForm renderiza Gate con botón Crear disabled + tooltip', async ({
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
    await page.waitForURL('**/app/**', { timeout: 30000 });

    await page.goto('/app/properties/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // dejar que el form monte y el hook resuelva

    const gate = page.getByTestId('vhid-gate-create_property');
    await expect(gate).toBeVisible({ timeout: 15000 });
    await expect(gate).toHaveAttribute('data-vhid-blocked', 'true');
    await expect(gate).toHaveAttribute('data-vhid-next-step', 'wait_visit');

    const submitButton = gate.getByRole('button', { name: /Crear Propiedad/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeDisabled();
    await snap(page, ctx, 'tenant', 'property-form-gate-disabled');

    // El tooltip aparece sobre el wrapper (span) — al hover debería verse
    await gate.hover();
    await expect(
      page.getByText(/Tu visita VeriHome ID está pendiente/i).first(),
    ).toBeVisible({ timeout: 10000 });
    logStep(ctx, 'tenant', 'gate-tooltip', 'ok');
  });
});
