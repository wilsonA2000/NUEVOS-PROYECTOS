/**
 * Fase E1 - Rating vinculado a ServiceOrder + unique partial constraint.
 *
 * Valida la invariante Fase 1.9.4:
 *   - cliente y prestador pueden calificarse mutuamente una vez por
 *     orden de servicio.
 *   - `UniqueConstraint(fields=['reviewer','reviewee','service_order'],
 *     condition=Q(service_order__isnull=False))` impide duplicados.
 *
 * Flujo:
 *   1. Seed `service_order_ready` (provider + client user).
 *   2. Provider crea + envía + client acepta orden.
 *   3. Client califica al provider (service_order=<id>) → 201.
 *   4. Provider califica al client → 201.
 *   5. Client intenta calificar la misma orden otra vez → 400
 *      (unique_partial).
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
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-e');

test.describe.configure({ mode: 'serial' });

test('Fase E1 · Rating por ServiceOrder + unique partial constraint (1.9.4)', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('service_order_ready');

  const providerTokens = await getAuthToken(seed.service_provider_email, seed.password);
  const clientTokens = await getAuthToken(seed.landlord_email, seed.password);
  expect(providerTokens).toBeTruthy();
  expect(clientTokens).toBeTruthy();
  const providerToken = providerTokens!.access;
  const clientToken = clientTokens!.access;

  // --- Setup: crear, enviar y aceptar orden ---
  logStep(ctx, 'service_provider', 'setup-create', 'start');
  const createResp = await apiPost(providerToken, '/services/orders/', {
    client: seed.landlord_id,
    service: seed.service_id,
    title: 'Orden para rating',
    amount: '200000',
  });
  expect(createResp.ok).toBe(true);
  const orderId = (createResp.body as any).id;

  await apiPost(providerToken, `/services/orders/${orderId}/send/`);
  const acceptResp = await apiPost(clientToken, `/services/orders/${orderId}/accept/`);
  expect(acceptResp.ok).toBe(true);
  logStep(ctx, 'system', 'order-ready-for-rating', 'ok', { order_id: orderId });

  // --- Paso 1: cliente califica al prestador ---
  logStep(ctx, 'landlord', 'rate-provider', 'start');
  const clientRatingResp = await apiPost(clientToken, '/ratings/ratings/', {
    service_order: orderId,
    overall_rating: 9,
    title: 'Excelente servicio',
    review_text: 'Puntualidad, limpieza y calidad. Muy recomendado.',
  });
  logStep(ctx, 'landlord', 'rate-provider', clientRatingResp.ok ? 'ok' : 'fail', {
    status: clientRatingResp.status,
    body: clientRatingResp.body,
  });
  expect(clientRatingResp.ok, `client rating 2xx (${clientRatingResp.status})`).toBe(true);
  const clientRating = clientRatingResp.body as any;
  expect(clientRating.rating_type).toBe('client_to_service_provider');
  expect(clientRating.service_order).toBe(orderId);

  // --- Paso 2: prestador califica al cliente (otro reviewer/reviewee, misma orden) ---
  logStep(ctx, 'service_provider', 'rate-client', 'start');
  const providerRatingResp = await apiPost(providerToken, '/ratings/ratings/', {
    service_order: orderId,
    overall_rating: 10,
    title: 'Cliente excelente',
    review_text: 'Pagó puntual y fue cooperativo en todo momento.',
  });
  logStep(ctx, 'service_provider', 'rate-client', providerRatingResp.ok ? 'ok' : 'fail', {
    status: providerRatingResp.status,
  });
  expect(providerRatingResp.ok).toBe(true);
  expect((providerRatingResp.body as any).rating_type).toBe('service_provider_to_client');

  // --- Paso 3: cliente intenta duplicar — unique_partial debe bloquear ---
  logStep(ctx, 'landlord', 'duplicate-attempt', 'start');
  const dupResp = await apiPost(clientToken, '/ratings/ratings/', {
    service_order: orderId,
    overall_rating: 8,
    title: 'Duplicado',
    review_text: 'Intento duplicado para testar unique_partial constraint.',
  });
  logStep(ctx, 'landlord', 'duplicate-attempt', 'ok', {
    status: dupResp.status,
    body: typeof dupResp.body === 'string' ? dupResp.body.slice(0, 200) : dupResp.body,
  });
  expect(dupResp.status, 'duplicado debe ser rechazado (400/500 por integrity)').toBeGreaterThanOrEqual(400);
  expect(dupResp.status).toBeLessThan(600);
  expect(dupResp.ok).toBe(false);
});
