/**
 * Fase E2 - MessageThread con contextos relacionales (Fase 1.9.6).
 *
 * Valida que los threads pueden vincularse opcionalmente a:
 *   - property
 *   - contract (legacy Contract)
 *   - service_order
 *
 * El serializer debe aceptar y exponer los 3 FKs.
 *
 * Flujo:
 *   1. Seed `service_order_ready` (tenemos service_id + property + contract).
 *   2. Crear thread general → property=null, contract=null, service_order=null.
 *   3. Crear thread con property → FK poblada.
 *   4. Crear thread con service_order (del seed) → FK poblada.
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
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

test('Fase E2 · MessageThread acepta FKs property / contract / service_order', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('service_order_ready');

  const providerTokens = await getAuthToken(seed.service_provider_email, seed.password);
  const clientTokens = await getAuthToken(seed.landlord_email, seed.password);
  expect(providerTokens).toBeTruthy();
  expect(clientTokens).toBeTruthy();
  const providerToken = providerTokens!.access;
  const clientToken = clientTokens!.access;

  // Crear ServiceOrder para tener un service_order_id real
  const orderResp = await apiPost(providerToken, '/services/orders/', {
    client: seed.landlord_id,
    service: seed.service_id,
    title: 'Orden para thread',
    amount: '100000',
  });
  expect(orderResp.ok).toBe(true);
  const orderId = (orderResp.body as any).id;

  // --- Thread 1: general (sin FK) ---
  logStep(ctx, 'landlord', 'thread-general', 'start');
  const generalResp = await apiPost(clientToken, '/messages/threads/', {
    subject: 'Saludo general',
    thread_type: 'general',
  });
  logStep(ctx, 'landlord', 'thread-general', generalResp.ok ? 'ok' : 'fail', {
    status: generalResp.status,
    body: generalResp.body,
  });
  expect(generalResp.ok, `general thread 2xx (${generalResp.status})`).toBe(true);
  const general = generalResp.body as any;
  expect(general.property).toBeFalsy();
  expect(general.contract).toBeFalsy();
  expect(general.service_order).toBeFalsy();

  // --- Thread 2: con property ---
  logStep(ctx, 'landlord', 'thread-property', 'start');
  const propResp = await apiPost(clientToken, '/messages/threads/', {
    subject: 'Consulta sobre propiedad',
    thread_type: 'inquiry',
    property: seed.property_id,
  });
  logStep(ctx, 'landlord', 'thread-property', propResp.ok ? 'ok' : 'fail', {
    status: propResp.status,
  });
  expect(propResp.ok).toBe(true);
  expect((propResp.body as any).property).toBe(seed.property_id);

  // --- Thread 3: con service_order ---
  logStep(ctx, 'landlord', 'thread-service-order', 'start');
  const soResp = await apiPost(clientToken, '/messages/threads/', {
    subject: 'Coordinación de servicio',
    thread_type: 'service',
    service_order: orderId,
  });
  logStep(ctx, 'landlord', 'thread-service-order', soResp.ok ? 'ok' : 'fail', {
    status: soResp.status,
    body: soResp.body,
  });
  expect(soResp.ok, `service_order thread 2xx (${soResp.status})`).toBe(true);
  expect((soResp.body as any).service_order).toBe(orderId);
});
