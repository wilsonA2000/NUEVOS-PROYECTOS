/**
 * Fase A2 - Admin rechaza contrato en revisión jurídica.
 *
 * Estado inicial: LCC en PENDING_ADMIN_REVIEW (seed mode=admin_review).
 * Acción: POST /contracts/admin/contracts/{id}/reject/ con notas.
 * Resultado esperado:
 *   - current_state → CANCELLED
 *   - admin_reviewed=True, admin_reviewer=admin_id
 *   - admin_review_notes empieza por "RECHAZADO:"
 *   - ContractWorkflowHistory recibe fila STATE_CHANGE PENDING_ADMIN_REVIEW→CANCELLED
 *
 * Además valida el guard "debe proporcionar notas" (POST sin notes → 400).
 * Y el guard de conflicto de intereses: landlord intenta rechazar su
 * propio contrato como si fuera admin (debe 403).
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

test('Fase A2 · admin rechaza contrato → CANCELLED', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('admin_review');
  logStep(ctx, 'system', 'seed', 'ok', { lcc_id: seed.lcc_id });
  const lccId = seed.lcc_id;
  expect(lccId).toBeTruthy();

  const adminTokens = await getAuthToken(seed.admin_email, seed.password);
  const landlordTokens = await getAuthToken(seed.landlord_email, seed.password);
  expect(adminTokens).toBeTruthy();
  expect(landlordTokens).toBeTruthy();
  const adminToken = adminTokens!.access;
  const landlordToken = landlordTokens!.access;

  // --- Guard 1: reject sin notes → 400 ---
  logStep(ctx, 'admin', 'reject-without-notes', 'start');
  const noNotesResp = await apiPost(
    adminToken,
    `/contracts/admin/contracts/${lccId}/reject/`,
    {},
  );
  logStep(ctx, 'admin', 'reject-without-notes', 'ok', { status: noNotesResp.status });
  expect(noNotesResp.status).toBe(400);

  // --- Guard 2: landlord (no staff) no puede rechazar → 403 ---
  logStep(ctx, 'landlord', 'reject-as-non-staff', 'start');
  const forbiddenResp = await apiPost(
    landlordToken,
    `/contracts/admin/contracts/${lccId}/reject/`,
    { notes: 'intento ilegal' },
  );
  logStep(ctx, 'landlord', 'reject-as-non-staff', 'ok', { status: forbiddenResp.status });
  expect(forbiddenResp.status).toBe(403);

  // --- Happy path: admin rechaza con notas ---
  logStep(ctx, 'admin', 'reject-with-notes', 'start');
  const rejectResp = await apiPost(
    adminToken,
    `/contracts/admin/contracts/${lccId}/reject/`,
    { notes: 'El canon propuesto excede el IPC permitido por Ley 820.' },
  );
  logStep(ctx, 'admin', 'reject-with-notes', rejectResp.ok ? 'ok' : 'fail', {
    status: rejectResp.status,
    body: rejectResp.body,
  });
  expect(rejectResp.ok).toBe(true);

  // Verificar estado final consultando como landlord (el admin no está en
  // el queryset de LandlordContractViewSet, que filtra por request.user).
  const detail = await apiGet(landlordToken, `/contracts/landlord/contracts/${lccId}/`);
  const body = detail.body as Record<string, unknown>;
  expect(body.current_state).toBe('CANCELLED');
  expect(body.admin_reviewed).toBe(true);
  expect(String(body.admin_review_notes ?? '')).toMatch(/^RECHAZADO/);

  // Historial
  const histResp = await apiGet(adminToken, `/contracts/landlord/history/?contract=${lccId}`);
  const historyResults = ((histResp.body as any)?.results ?? histResp.body) as any[];
  const transitions = historyResults.map((h) => `${h.old_state}→${h.new_state}`);
  expect(transitions).toContain('PENDING_ADMIN_REVIEW→CANCELLED');
});
