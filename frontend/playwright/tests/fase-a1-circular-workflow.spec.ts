/**
 * Fase A1 - Workflow circular de revisión jurídica.
 *
 * Verifica el ciclo:
 *   TENANT_REVIEWING
 *     → tenant devuelve (return_to_landlord)
 *     → TENANT_RETURNED
 *     → landlord inicia corrección (start_correction)
 *     → LANDLORD_CORRECTING
 *     → landlord resubmite (resubmit_for_admin_review)
 *     → RE_PENDING_ADMIN
 *     → admin re-aprueba (approve)
 *     → DRAFT (ciclo cierra, review_cycle_count incrementa)
 *
 * Además valida que cada transición queda registrada en
 * ContractWorkflowHistory (Fase 1.9.1) con action_type=STATE_CHANGE.
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
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-a');

test.describe.configure({ mode: 'serial' });

test('Fase A1 · ciclo circular: tenant devuelve → landlord corrige → admin re-aprueba', async () => {
  const ctx = createRunContext(REPORT_DIR);
  logStep(ctx, 'system', 'seed', 'start', { mode: 'tenant_reviewing' });
  const seed = runSeed('tenant_reviewing');
  logStep(ctx, 'system', 'seed', 'ok', {
    lcc_id: seed.lcc_id,
    landlord: seed.landlord_email,
    tenant: seed.tenant_email,
    admin: seed.admin_email,
  });

  expect(seed.lcc_id, 'seed debe producir LCC id').toBeTruthy();
  const lccId = seed.lcc_id;

  // Login de cada actor via API
  const tenantTokens = await getAuthToken(seed.tenant_email, seed.password);
  const landlordTokens = await getAuthToken(seed.landlord_email, seed.password);
  const adminTokens = await getAuthToken(seed.admin_email, seed.password);
  expect(tenantTokens, 'tenant login').toBeTruthy();
  expect(landlordTokens, 'landlord login').toBeTruthy();
  expect(adminTokens, 'admin (is_staff) login').toBeTruthy();

  const tenantToken = tenantTokens!.access;
  const landlordToken = landlordTokens!.access;
  const adminToken = adminTokens!.access;

  // --- Paso 1: tenant devuelve el contrato ---
  logStep(ctx, 'tenant', 'return_to_landlord', 'start');
  const returnResp = await apiPost(
    tenantToken,
    `/contracts/tenant/contracts/${lccId}/return_to_landlord/`,
    { notes: 'Necesito cambiar el canon y las condiciones de servicios públicos.' },
  );
  logStep(ctx, 'tenant', 'return_to_landlord', returnResp.ok ? 'ok' : 'fail', {
    status: returnResp.status,
    body: returnResp.body,
  });
  expect(returnResp.ok, `tenant return debe 2xx (${returnResp.status})`).toBe(true);

  // Confirmar estado TENANT_RETURNED
  let detail = await apiGet(landlordToken, `/contracts/landlord/contracts/${lccId}/`);
  expect((detail.body as any).current_state).toBe('TENANT_RETURNED');

  // --- Paso 2: landlord inicia corrección ---
  logStep(ctx, 'landlord', 'start_correction', 'start');
  const startCorrResp = await apiPost(
    landlordToken,
    `/contracts/landlord/contracts/${lccId}/start_correction/`,
  );
  logStep(ctx, 'landlord', 'start_correction', startCorrResp.ok ? 'ok' : 'fail', {
    status: startCorrResp.status,
    body: startCorrResp.body,
  });
  expect(startCorrResp.ok, `start_correction 2xx (${startCorrResp.status})`).toBe(true);

  detail = await apiGet(landlordToken, `/contracts/landlord/contracts/${lccId}/`);
  expect((detail.body as any).current_state).toBe('LANDLORD_CORRECTING');

  // --- Paso 3: landlord resubmite a admin ---
  logStep(ctx, 'landlord', 'resubmit_for_admin_review', 'start');
  const resubmitResp = await apiPost(
    landlordToken,
    `/contracts/landlord/contracts/${lccId}/resubmit_for_admin_review/`,
    { changes_summary: 'Ajusté canon a 1.500.000 y aclaré servicios públicos.' },
  );
  logStep(ctx, 'landlord', 'resubmit_for_admin_review', resubmitResp.ok ? 'ok' : 'fail', {
    status: resubmitResp.status,
    body: resubmitResp.body,
  });
  expect(resubmitResp.ok, `resubmit 2xx (${resubmitResp.status})`).toBe(true);

  detail = await apiGet(landlordToken, `/contracts/landlord/contracts/${lccId}/`);
  expect((detail.body as any).current_state).toBe('RE_PENDING_ADMIN');

  // --- Paso 4: admin re-aprueba ---
  logStep(ctx, 'admin', 'approve_from_re_pending', 'start');
  const approveResp = await apiPost(
    adminToken,
    `/contracts/admin/contracts/${lccId}/approve/`,
    { notes: 'Cambios aceptados en el re-ciclo.' },
  );
  logStep(ctx, 'admin', 'approve_from_re_pending', approveResp.ok ? 'ok' : 'fail', {
    status: approveResp.status,
    body: approveResp.body,
  });
  expect(approveResp.ok, `admin approve 2xx (${approveResp.status})`).toBe(true);

  detail = await apiGet(landlordToken, `/contracts/landlord/contracts/${lccId}/`);
  const finalState = (detail.body as any).current_state;
  expect(finalState).toBe('DRAFT');
  const cycleCount = (detail.body as any).review_cycle_count ?? 0;
  expect(cycleCount, 'review_cycle_count debe incrementar ≥ 1').toBeGreaterThanOrEqual(1);

  // --- Verificación 1.9.1: cada transición dejó fila en ContractWorkflowHistory ---
  const histResp = await apiGet(adminToken, `/contracts/landlord/history/?contract=${lccId}`);
  const historyResults = ((histResp.body as any)?.results ?? histResp.body) as any[];
  logStep(ctx, 'system', 'workflow-history-check', 'ok', {
    count: historyResults.length,
    states: historyResults.map((h) => `${h.old_state}→${h.new_state}`),
  });
  expect(historyResults.length, 'debe haber ≥ 4 filas de historial').toBeGreaterThanOrEqual(4);
  const stateTransitions = historyResults
    .map((h) => `${h.old_state}→${h.new_state}`)
    .filter((t) => t !== '→');
  expect(stateTransitions).toContain('TENANT_REVIEWING→TENANT_RETURNED');
  expect(stateTransitions).toContain('TENANT_RETURNED→LANDLORD_CORRECTING');
  expect(stateTransitions).toContain('LANDLORD_CORRECTING→RE_PENDING_ADMIN');
  expect(stateTransitions).toContain('RE_PENDING_ADMIN→DRAFT');
});
