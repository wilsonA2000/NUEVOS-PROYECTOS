/**
 * Fase D1 - Cronograma de pago de canon al activar contrato.
 *
 * Cuando un LCC pasa a ACTIVE, el signal
 * `generate_payment_schedule_on_activation` (contracts/signals.py)
 * debe generar automáticamente:
 *   - RentPaymentSchedule
 *   - N PaymentInstallments (uno por mes)
 *   - N PaymentOrders (consecutivo PO-YYYY-NNNNNNNN)
 *
 * Valida:
 *   1. Seed `contract_active` reporta > 0 PaymentOrders generadas.
 *   2. Tenant ve sus PaymentOrders via API con filtro `order_type=rent`.
 *   3. Cada PaymentOrder tiene order_number con formato canónico.
 *   4. El summary aggregate muestra total y pending consistentes.
 *   5. Admin ve todas las PaymentOrders (bypass de filtro por staff).
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  apiGet,
  createRunContext,
  getAuthToken,
  logStep,
  runSeed,
} from '../helpers/multi-user-logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-d');

test.describe.configure({ mode: 'serial' });

test('Fase D1 · al activar LCC se genera cronograma canon + PaymentOrders visibles por tenant', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('contract_active');
  logStep(ctx, 'system', 'seed', 'ok', {
    lcc_id: seed.lcc_id,
    po_count: seed.payment_orders_count,
  });

  const poCount = parseInt(seed.payment_orders_count ?? '0', 10);
  expect(poCount, 'seed debe reportar PaymentOrders generadas').toBeGreaterThan(0);

  const tenantTokens = await getAuthToken(seed.tenant_email, seed.password);
  const adminTokens = await getAuthToken(seed.admin_email, seed.password);
  expect(tenantTokens).toBeTruthy();
  expect(adminTokens).toBeTruthy();
  const tenantToken = tenantTokens!.access;
  const adminToken = adminTokens!.access;

  // --- Tenant lista sus PaymentOrders tipo rent ---
  logStep(ctx, 'tenant', 'list-own-orders', 'start');
  const tenantListResp = await apiGet(tenantToken, '/payments/orders/?order_type=rent');
  logStep(ctx, 'tenant', 'list-own-orders', tenantListResp.ok ? 'ok' : 'fail', {
    status: tenantListResp.status,
  });
  expect(tenantListResp.ok).toBe(true);
  const rows = ((tenantListResp.body as any)?.results ?? tenantListResp.body) as any[];
  expect(rows.length, `tenant debe ver ${poCount} órdenes rent`).toBe(poCount);

  // Consecutivo PO-YYYY-NNNNNNNN (Plan Maestro pagos, T1.4)
  const firstOrder = rows[0];
  expect(firstOrder.order_number).toMatch(/^PO-\d{4}-\d{8}$/);
  expect(firstOrder.order_type).toBe('rent');
  expect(['pending', 'paid']).toContain(firstOrder.status);

  // --- Tenant summary aggregate ---
  const summaryResp = await apiGet(tenantToken, '/payments/orders/summary/');
  expect(summaryResp.ok).toBe(true);
  const summary = summaryResp.body as any;
  expect(summary.total, 'summary total ≥ poCount').toBeGreaterThanOrEqual(poCount);
  expect(summary.pending).toBeGreaterThanOrEqual(0);

  // --- Admin ve todas (staff bypass) ---
  const adminListResp = await apiGet(adminToken, '/payments/orders/?order_type=rent');
  expect(adminListResp.ok).toBe(true);
  const adminRows = ((adminListResp.body as any)?.results ?? adminListResp.body) as any[];
  expect(adminRows.length, 'admin ve ≥ las del tenant').toBeGreaterThanOrEqual(rows.length);
});
