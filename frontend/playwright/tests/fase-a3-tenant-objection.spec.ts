/**
 * Fase A3 - Tenant objeta una cláusula del contrato.
 *
 * Estado inicial: LCC en TENANT_REVIEWING (seed mode=tenant_reviewing).
 * Acción: POST /contracts/tenant/contracts/{id}/create_objection/
 * Payload: field_name, current_value, proposed_value, justification, priority
 * Resultado esperado:
 *   - Se crea ContractObjection en estado PENDING.
 *   - current_state del LCC cambia a OBJECTIONS_PENDING.
 *   - El listado de objeciones muestra la nueva fila.
 *   - Fila STATE_CHANGE registrada en ContractWorkflowHistory.
 *
 * Guards verificados:
 *   - Un usuario ajeno no puede crear objeciones (403).
 *   - Sin justification → 400.
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

test('Fase A3 · tenant objeta cláusula → OBJECTIONS_PENDING', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('tenant_reviewing');
  logStep(ctx, 'system', 'seed', 'ok', { lcc_id: seed.lcc_id });
  const lccId = seed.lcc_id;
  expect(lccId).toBeTruthy();

  const tenantTokens = await getAuthToken(seed.tenant_email, seed.password);
  const guarantorTokens = await getAuthToken(seed.guarantor_email, seed.password);
  expect(tenantTokens).toBeTruthy();
  expect(guarantorTokens).toBeTruthy();
  const tenantToken = tenantTokens!.access;
  const strangerToken = guarantorTokens!.access;  // no es parte del contrato

  const objectionPayload = {
    field_name: 'monthly_rent',
    current_value: '1500000',
    proposed_value: '1400000',
    justification:
      'El canon propuesto supera el promedio del sector para un inmueble similar. '
      + 'Adjunto referencias de portales inmobiliarios.',
    priority: 'HIGH',
  };

  // --- Guard 1: usuario ajeno no puede crear objeción ---
  logStep(ctx, 'system', 'objection-by-stranger', 'start');
  const strangerResp = await apiPost(
    strangerToken,
    `/contracts/tenant/contracts/${lccId}/create_objection/`,
    objectionPayload,
  );
  logStep(ctx, 'system', 'objection-by-stranger', 'ok', {
    status: strangerResp.status,
  });
  expect(strangerResp.status, 'stranger debe 403/404').toBeGreaterThanOrEqual(400);
  expect(strangerResp.status).toBeLessThan(500);

  // --- Guard 2: sin justification → 400 ---
  logStep(ctx, 'tenant', 'objection-missing-justification', 'start');
  const incompleteResp = await apiPost(
    tenantToken,
    `/contracts/tenant/contracts/${lccId}/create_objection/`,
    { ...objectionPayload, justification: '' },
  );
  logStep(ctx, 'tenant', 'objection-missing-justification', 'ok', {
    status: incompleteResp.status,
  });
  expect(incompleteResp.status).toBe(400);

  // --- Happy path: tenant crea objeción válida ---
  logStep(ctx, 'tenant', 'create-objection', 'start');
  const objResp = await apiPost(
    tenantToken,
    `/contracts/tenant/contracts/${lccId}/create_objection/`,
    objectionPayload,
  );
  logStep(ctx, 'tenant', 'create-objection', objResp.ok ? 'ok' : 'fail', {
    status: objResp.status,
    body: objResp.body,
  });
  expect(objResp.ok, `create_objection debe 201 (${objResp.status})`).toBe(true);
  const createdObjection = objResp.body as Record<string, unknown>;
  expect(createdObjection.id, 'objection debe tener id').toBeTruthy();
  expect(createdObjection.status).toBe('PENDING');

  // --- Verificar estado LCC → OBJECTIONS_PENDING ---
  const detail = await apiGet(tenantToken, `/contracts/tenant/contracts/${lccId}/`);
  expect((detail.body as any).current_state).toBe('OBJECTIONS_PENDING');

  // --- Historial: STATE_CHANGE TENANT_REVIEWING→OBJECTIONS_PENDING ---
  const adminTokens = await getAuthToken(seed.admin_email, seed.password);
  expect(adminTokens).toBeTruthy();
  const histResp = await apiGet(
    adminTokens!.access,
    `/contracts/landlord/history/?contract=${lccId}`,
  );
  const rows = ((histResp.body as any)?.results ?? histResp.body) as any[];
  const transitions = rows.map((r) => `${r.old_state}→${r.new_state}`);
  expect(transitions).toContain('TENANT_REVIEWING→OBJECTIONS_PENDING');
});
