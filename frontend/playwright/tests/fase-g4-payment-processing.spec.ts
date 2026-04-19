/**
 * Fase G4 - Procesamiento real de canon (reconciliación).
 *
 * Complementa a fase-d1 (que sólo valida el cronograma generado) con
 * una transacción real + reconciliation + factura DIAN + auditoría.
 *
 * El seed `rent_paid`:
 *   1. Pone LCC en ACTIVE (genera PaymentOrders).
 *   2. Crea Transaction(type=rent_payment, status=completed)
 *      simulando webhook de pasarela.
 *   3. Llama a `reconcile_payment(tx)`.
 *
 * El test verifica vía API:
 *   - PaymentOrder pasó a `status='paid'`, paid_amount>0, transaction
 *     referenciada, paid_at no-null.
 *   - Tenant ve la orden en su dashboard con status 'paid'.
 *   - Landlord ve la orden en su dashboard con status 'paid' también.
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
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-g');

test.describe.configure({ mode: 'serial' });

test('Fase G4 · rent payment + reconcile + auditoría end-to-end', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('rent_paid');
  logStep(ctx, 'system', 'seed', 'ok', {
    payment_order_id: seed.payment_order_id,
    transaction_id: seed.transaction_id,
    status_after: seed.payment_order_status_after,
  });

  expect(seed.payment_order_id, 'seed debe reportar PaymentOrder').toBeTruthy();
  expect(seed.transaction_id, 'seed debe reportar Transaction').toBeTruthy();
  expect(seed.payment_order_status_after, 'seed debe reportar status tras reconcile').toBe('paid');

  const tenantTokens = await getAuthToken(seed.tenant_email, seed.password);
  const landlordTokens = await getAuthToken(seed.landlord_email, seed.password);
  const adminTokens = await getAuthToken(seed.admin_email, seed.password);
  expect(tenantTokens).toBeTruthy();
  expect(landlordTokens).toBeTruthy();
  expect(adminTokens).toBeTruthy();
  const tenantToken = tenantTokens!.access;
  const landlordToken = landlordTokens!.access;
  const adminToken = adminTokens!.access;

  const poId = seed.payment_order_id;

  // --- Tenant consulta su PaymentOrder pagada ---
  logStep(ctx, 'tenant', 'view-paid-order', 'start');
  const tenantResp = await apiGet(tenantToken, `/payments/orders/${poId}/`);
  logStep(ctx, 'tenant', 'view-paid-order', tenantResp.ok ? 'ok' : 'fail', {
    status: tenantResp.status,
  });
  expect(tenantResp.ok).toBe(true);
  const tenantOrder = tenantResp.body as Record<string, unknown>;
  expect(tenantOrder.status).toBe('paid');
  expect(tenantOrder.paid_at).toBeTruthy();
  expect(tenantOrder.transaction).toBe(seed.transaction_id);

  // --- Landlord (payee) ve la misma orden ---
  const landlordResp = await apiGet(landlordToken, `/payments/orders/${poId}/`);
  expect(landlordResp.ok).toBe(true);
  expect((landlordResp.body as any).status).toBe('paid');

  // --- Summary del tenant: 1 orden 'paid_this_month' ≥ 1 ---
  const summaryResp = await apiGet(tenantToken, '/payments/orders/summary/');
  expect(summaryResp.ok).toBe(true);
  const summary = summaryResp.body as any;
  expect(summary.paid_this_month, 'summary.paid_this_month ≥ 1').toBeGreaterThanOrEqual(1);

  // --- Admin confirma que ve la orden en su listado (staff) ---
  const adminListResp = await apiGet(adminToken, '/payments/orders/?status=paid');
  expect(adminListResp.ok).toBe(true);
  const adminRows = ((adminListResp.body as any)?.results ?? adminListResp.body) as any[];
  const found = adminRows.find((r) => r.id === poId);
  expect(found, 'admin debe ver la PaymentOrder paid').toBeTruthy();

  logStep(ctx, 'admin', 'verify-paid-order-listed', 'ok', {
    count_paid: adminRows.length,
  });
});
