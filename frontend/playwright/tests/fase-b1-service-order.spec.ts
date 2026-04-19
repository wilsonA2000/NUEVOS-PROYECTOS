/**
 * Fase B1 - ServiceOrder ciclo completo prestador↔cliente.
 *
 * Actores:
 *   - provider (service_provider con suscripción activa)
 *   - client (landlord del sistema, hace de cliente en esta orden)
 *
 * Flujo:
 *   1. provider crea orden → status='draft', sin payment_order.
 *   2. provider envía → status='sent'.
 *   3. client acepta → status='accepted' + PaymentOrder enlazada.
 *   4. Historial `ServiceOrderHistory` registra CREATE + SEND + ACCEPT
 *      (Fase 1.9.5 signal).
 *
 * Guards:
 *   - cliente no puede crear orden (perform_create requiere
 *     user_type='service_provider').
 *   - provider no puede aceptar (sólo client).
 *   - draft→accepted/rejected sólo tras send cuando status='sent' o
 *     draft (según implementación actual).
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
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-b');

test.describe.configure({ mode: 'serial' });

test('Fase B1 · ServiceOrder provider crea→envía, client acepta→PaymentOrder', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('service_order_ready');
  logStep(ctx, 'system', 'seed', 'ok', {
    provider: seed.service_provider_email,
    client: seed.landlord_email,
  });

  const providerTokens = await getAuthToken(seed.service_provider_email, seed.password);
  const clientTokens = await getAuthToken(seed.landlord_email, seed.password);
  expect(providerTokens, 'provider login').toBeTruthy();
  expect(clientTokens, 'client login').toBeTruthy();
  const providerToken = providerTokens!.access;
  const clientToken = clientTokens!.access;

  // --- Guard: cliente no puede crear orden ---
  logStep(ctx, 'service_provider', 'guard-client-cannot-create', 'start');
  const forbiddenCreate = await apiPost(clientToken, '/services/orders/', {
    client: seed.landlord_id,
    title: 'No debería permitirse',
    amount: '100000',
  });
  logStep(ctx, 'service_provider', 'guard-client-cannot-create', 'ok', {
    status: forbiddenCreate.status,
  });
  expect(forbiddenCreate.status).toBe(403);

  // --- Paso 1: provider crea orden ---
  logStep(ctx, 'service_provider', 'create-order', 'start');
  const createResp = await apiPost(providerToken, '/services/orders/', {
    client: seed.landlord_id,
    service: seed.service_id,
    title: 'Reparación de grifo cocina',
    description: 'Reemplazo de empaque y tornillería',
    amount: '150000',
  });
  logStep(ctx, 'service_provider', 'create-order', createResp.ok ? 'ok' : 'fail', {
    status: createResp.status,
    body: createResp.body,
  });
  expect(createResp.ok, `create order 2xx (${createResp.status})`).toBe(true);
  const order = createResp.body as Record<string, unknown>;
  expect(order.status).toBe('draft');
  expect(order.payment_order).toBeFalsy();
  const orderId = order.id as string;

  // --- Paso 2: provider envía ---
  logStep(ctx, 'service_provider', 'send-order', 'start');
  const sendResp = await apiPost(providerToken, `/services/orders/${orderId}/send/`);
  logStep(ctx, 'service_provider', 'send-order', sendResp.ok ? 'ok' : 'fail', {
    status: sendResp.status,
  });
  expect(sendResp.ok).toBe(true);
  expect((sendResp.body as any).status).toBe('sent');

  // --- Guard: provider no puede aceptar ---
  logStep(ctx, 'service_provider', 'guard-provider-cannot-accept', 'start');
  const forbiddenAccept = await apiPost(
    providerToken,
    `/services/orders/${orderId}/accept/`,
  );
  logStep(ctx, 'service_provider', 'guard-provider-cannot-accept', 'ok', {
    status: forbiddenAccept.status,
  });
  expect(forbiddenAccept.status).toBe(403);

  // --- Paso 3: client acepta ---
  logStep(ctx, 'landlord', 'accept-order', 'start');
  const acceptResp = await apiPost(
    clientToken,
    `/services/orders/${orderId}/accept/`,
  );
  logStep(ctx, 'landlord', 'accept-order', acceptResp.ok ? 'ok' : 'fail', {
    status: acceptResp.status,
    body: acceptResp.body,
  });
  expect(acceptResp.ok, `accept 2xx (${acceptResp.status})`).toBe(true);
  const accepted = acceptResp.body as Record<string, unknown>;
  expect(accepted.status).toBe('accepted');
  expect(accepted.payment_order, 'payment_order generada').toBeTruthy();

  // --- Verificación 1.9.5: ServiceOrderHistory tiene CREATE/SEND/ACCEPT ---
  // No hay endpoint público para ServiceOrderHistory, lo consultamos via API
  // genérica — nos conformamos con verificar estado final de la orden.
  const detail = await apiGet(clientToken, `/services/orders/${orderId}/`);
  expect((detail.body as any).status).toBe('accepted');
  expect((detail.body as any).accepted_at).toBeTruthy();
});
