/**
 * Fase E3 - Audit Trail global refleja acciones reales (Fase 1.9.7).
 *
 * Realiza un puñado de acciones auditables (match.accept,
 * service_order.accept, rating.create) y verifica que el endpoint
 * `/core/audit-logs/` expone las filas correspondientes con los
 * filtros de activity_type.
 *
 * Este test cierra el ciclo de trazabilidad molecular: signals
 * (1.9.1/1.9.5) + FKs (1.9.3/1.9.4/1.9.6) + helper log_activity
 * (1.9.7) todos deben producir evidencia visible.
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

test('Fase E3 · audit-logs expone acciones instrumentadas (service_order.accept + rating.create)', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('service_order_ready');

  const providerTokens = await getAuthToken(seed.service_provider_email, seed.password);
  const clientTokens = await getAuthToken(seed.landlord_email, seed.password);
  const adminTokens = await getAuthToken(seed.admin_email, seed.password);
  expect(providerTokens).toBeTruthy();
  expect(clientTokens).toBeTruthy();
  expect(adminTokens).toBeTruthy();
  const providerToken = providerTokens!.access;
  const clientToken = clientTokens!.access;
  const adminToken = adminTokens!.access;

  // --- Acción 1: service_order.accept (Fase 1.9.7) ---
  const createOrderResp = await apiPost(providerToken, '/services/orders/', {
    client: seed.landlord_id,
    service: seed.service_id,
    title: 'Orden auditable',
    amount: '120000',
  });
  expect(createOrderResp.ok).toBe(true);
  const orderId = (createOrderResp.body as any).id;

  await apiPost(providerToken, `/services/orders/${orderId}/send/`);
  const acceptResp = await apiPost(clientToken, `/services/orders/${orderId}/accept/`);
  expect(acceptResp.ok).toBe(true);
  logStep(ctx, 'landlord', 'audit-trigger-accept-order', 'ok', { order_id: orderId });

  // --- Acción 2: rating.create ---
  const ratingResp = await apiPost(clientToken, '/ratings/ratings/', {
    service_order: orderId,
    overall_rating: 10,
    title: 'Servicio auditable',
    review_text: 'Calificación con propósito de auditoría.',
  });
  expect(ratingResp.ok).toBe(true);
  logStep(ctx, 'landlord', 'audit-trigger-rating', 'ok');

  // --- Verificación: admin consulta audit-logs con filtro ---
  // El endpoint filtra por activity_type exacto; en la fase 1.9.7 los
  // action_type canónicos instrumentados son "service_order.accept" y
  // "rating.create". El serializer de UserActivityLog ya expone el campo.
  const auditResp = await apiGet(
    adminToken,
    '/core/audit-logs/?activity_type=service_order.accept',
  );
  expect(auditResp.ok, `audit-logs 200 (${auditResp.status})`).toBe(true);
  const soRows = ((auditResp.body as any)?.results ?? auditResp.body) as any[];
  logStep(ctx, 'admin', 'audit-logs-service-order', 'ok', { count: soRows.length });
  expect(soRows.length, 'debe existir ≥ 1 audit log de service_order.accept').toBeGreaterThanOrEqual(1);
  const soLog = soRows.find((r) => r.activity_type === 'service_order.accept');
  expect(soLog).toBeTruthy();

  const ratingAuditResp = await apiGet(
    adminToken,
    '/core/audit-logs/?activity_type=rating.create',
  );
  expect(ratingAuditResp.ok).toBe(true);
  const ratingRows = ((ratingAuditResp.body as any)?.results ?? ratingAuditResp.body) as any[];
  logStep(ctx, 'admin', 'audit-logs-rating', 'ok', { count: ratingRows.length });
  expect(ratingRows.length, 'debe existir ≥ 1 audit log de rating.create').toBeGreaterThanOrEqual(1);
});
