/**
 * Fase H3 - Service Provider Subscriptions Page (UI real).
 *
 * service_provider loguea, navega a /app/subscriptions, ve los planes
 * disponibles, se suscribe al plan básico, y verifica que el badge de
 * plan activo aparece. Complementa a Fase F3 (API pura).
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  attachLoggers,
  createRunContext,
  getAuthToken,
  logStep,
  runSeed,
  snap,
} from '../helpers/multi-user-logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-h');

test.describe.configure({ mode: 'serial' });

async function loginViaLocalStorage(
  context: BrowserContext,
  page: Page,
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ access, refresh }) => {
      window.localStorage.setItem('access_token', access);
      window.localStorage.setItem('refresh_token', refresh);
    },
    { access: accessToken, refresh: refreshToken },
  );
}

test('Fase H3 · service_provider ve planes y se suscribe desde UI', async ({ browser }) => {
  test.setTimeout(180_000);
  const ctx = createRunContext(REPORT_DIR);
  // Seed crea plan "Plan E2E básico" + ya subscribe al provider.
  // Para testar "subscribe desde cero" hay que cancelar primero via API.
  const seed = runSeed('service_order_ready');
  logStep(ctx, 'system', 'seed', 'ok', { plan_id: seed.subscription_plan_id });

  const providerAuth = await getAuthToken(seed.service_provider_email, seed.password);
  expect(providerAuth).toBeTruthy();

  // Cancelar la suscripción activa que dejó el seed, para que UI
  // muestre "suscribirse" en vez de "cancelar".
  await fetch('http://localhost:8000/api/v1/services/subscriptions/cancel/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerAuth!.access}`,
    },
    body: JSON.stringify({ reason: 'Preparación H3' }),
  }).catch(() => null);
  logStep(ctx, 'system', 'pre-cancel', 'ok');

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  attachLoggers(page, 'service_provider', ctx);
  await loginViaLocalStorage(context, page, providerAuth!.access, providerAuth!.refresh);

  logStep(ctx, 'service_provider', 'goto-subscriptions', 'start');
  await page.goto('/app/subscriptions', { waitUntil: 'networkidle' });
  await snap(page, ctx, 'service_provider', 'subscriptions-landing');

  // Esperar a que aparezca al menos un plan (el seed creó "Plan E2E básico").
  await expect(page.getByText(/Plan E2E básico/i)).toBeVisible({ timeout: 20000 });
  logStep(ctx, 'service_provider', 'plans-visible', 'ok');

  // Click en el botón "Suscribirse" del primer plan.
  const subscribeBtn = page.getByRole('button', { name: /suscrib/i }).first();
  await expect(subscribeBtn).toBeVisible({ timeout: 10000 });
  await subscribeBtn.click();
  logStep(ctx, 'service_provider', 'subscribe-click', 'ok');
  await snap(page, ctx, 'service_provider', 'post-subscribe');

  // Confirmar en dialog si aparece.
  const confirm = page.getByRole('button', { name: /confirmar|aceptar|suscribir/i });
  const hasConfirm = await confirm.first().isVisible().catch(() => false);
  if (hasConfirm) {
    await confirm.first().click();
  }

  // La UI debe mostrar ahora el plan como activo/current.
  await expect(
    page.getByText(/trial|activ/i).first(),
  ).toBeVisible({ timeout: 15000 });
  logStep(ctx, 'service_provider', 'active-badge-visible', 'ok');
});
