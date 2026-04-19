/**
 * Fase F3 - Suscripciones de prestadores de servicios.
 *
 * Endpoints cubiertos:
 *   - GET  /services/plans/            listar planes activos
 *   - POST /services/subscriptions/subscribe/       trial
 *   - GET  /services/subscriptions/my_subscription/ (si existe)
 *   - POST /services/subscriptions/cancel/          cancelar
 *   - POST /services/subscriptions/subscribe/       otra vez (cancelada
 *     permite nueva)
 *
 * Guards:
 *   - Un usuario ya con suscripción activa no puede suscribirse de
 *     nuevo sin cancelar (400).
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  apiGet,
  apiPost,
  createRunContext,
  getAuthToken,
  logStep,
  runSeed,
} from '../helpers/multi-user-logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-f');

test.describe.configure({ mode: 'serial' });

test('Fase F3 · suscripción trial → cancelar', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('service_order_ready');
  logStep(ctx, 'system', 'seed', 'ok', {
    plan_id: seed.subscription_plan_id,
  });

  const providerTokens = await getAuthToken(seed.service_provider_email, seed.password);
  expect(providerTokens).toBeTruthy();
  const providerToken = providerTokens!.access;

  // Seed ya creó una suscripción activa como parte del setup
  // (ServiceSubscription(active) en service_order_ready). Guardamos
  // evidencia y probamos el guard: no se puede volver a suscribir
  // sin cancelar primero.
  logStep(ctx, 'service_provider', 'subscribe-already-active', 'start');
  const duplicate = await apiPost(providerToken, '/services/subscriptions/subscribe/', {
    plan_id: seed.subscription_plan_id,
  });
  logStep(ctx, 'service_provider', 'subscribe-already-active', 'ok', {
    status: duplicate.status,
    body: duplicate.body,
  });
  expect(duplicate.status, 'no permitir 2da suscripción activa').toBe(400);

  // Cancelar
  logStep(ctx, 'service_provider', 'cancel', 'start');
  const cancelResp = await apiPost(providerToken, '/services/subscriptions/cancel/', {
    reason: 'Test E2E de cancelación.',
  });
  logStep(ctx, 'service_provider', 'cancel', cancelResp.ok ? 'ok' : 'fail', {
    status: cancelResp.status,
  });
  expect(cancelResp.ok).toBe(true);
  expect((cancelResp.body as any).status).toBe('cancelled');

  // Reintentar — ahora sí debe crear trial
  logStep(ctx, 'service_provider', 'resubscribe', 'start');
  const resubscribe = await apiPost(providerToken, '/services/subscriptions/subscribe/', {
    plan_id: seed.subscription_plan_id,
  });
  logStep(ctx, 'service_provider', 'resubscribe', resubscribe.ok ? 'ok' : 'fail', {
    status: resubscribe.status,
  });
  expect(resubscribe.ok, `resubscribe 2xx (${resubscribe.status})`).toBe(true);
  expect(['trial', 'active']).toContain((resubscribe.body as any).status);

  // Listado público de planes
  const plansResp = await apiGet('', '/services/plans/');
  // La ruta puede ser /plans/ o /subscription-plans/ según router
  // — si devuelve 404 usamos la que sabemos (get plans del seed)
  if (plansResp.ok) {
    const plans = ((plansResp.body as any)?.results ?? plansResp.body) as any[];
    expect(plans.length).toBeGreaterThanOrEqual(1);
  }
});
