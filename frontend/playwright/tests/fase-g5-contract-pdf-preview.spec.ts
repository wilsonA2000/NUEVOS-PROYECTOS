/**
 * Fase G5 - Validación del contenido del PDF de vista previa del contrato.
 *
 * Complementa al flujo biométrico: antes de firmar, ambas partes deben
 * poder descargar una vista previa del PDF con las cláusulas actuales.
 *
 * Flujo:
 *   1. Seed `admin_review` crea LCC + Contract (legacy) con el mismo UUID
 *      en estado PENDING_ADMIN_REVIEW.
 *   2. Landlord pide GET /contracts/{id}/preview-pdf/ con Bearer token.
 *      - status 200
 *      - Content-Type application/pdf
 *      - body empieza con "%PDF-"
 *      - body > 10 KB (PDFs reales con cláusulas > 10 KB siempre)
 *   3. Tenant pide el mismo endpoint - ambos roles tienen permiso.
 *   4. Request sin Authorization → 401 (IsAuthenticated).
 *   5. Usuario no-parte (service_provider) → 403.
 */
import { test, expect, request as apiRequest } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createRunContext,
  getAuthToken,
  logStep,
  runSeed,
} from '../helpers/multi-user-logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-g');

const API_BASE = 'http://localhost:8000/api/v1';

async function fetchPdf(
  accessToken: string,
  contractId: string,
): Promise<{ status: number; contentType: string | null; body: Buffer }> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const req = await apiRequest.newContext({ extraHTTPHeaders: headers });
  try {
    const resp = await req.get(`${API_BASE}/contracts/${contractId}/preview-pdf/`, {
      timeout: 30000,
    });
    const body = await resp.body();
    return {
      status: resp.status(),
      contentType: resp.headers()['content-type'] ?? null,
      body,
    };
  } finally {
    await req.dispose();
  }
}

test.describe.configure({ mode: 'serial' });

test('Fase G5 · preview-pdf devuelve %PDF- válido >10KB para landlord y tenant', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('admin_review');
  logStep(ctx, 'system', 'seed', 'ok', {
    contract_id: seed.contract_id,
    lcc_id: seed.lcc_id,
  });

  expect(seed.contract_id, 'seed debe reportar contract_id').toBeTruthy();
  expect(seed.lcc_id, 'seed debe crear LCC espejo').toBeTruthy();

  const contractId = seed.contract_id;

  const landlordTokens = await getAuthToken(seed.landlord_email, seed.password);
  const tenantTokens = await getAuthToken(seed.tenant_email, seed.password);
  const spTokens = await getAuthToken(seed.service_provider_email, seed.password);
  expect(landlordTokens, 'landlord login').toBeTruthy();
  expect(tenantTokens, 'tenant login').toBeTruthy();
  expect(spTokens, 'service_provider login').toBeTruthy();

  // --- Landlord: debe recibir PDF válido ---
  logStep(ctx, 'landlord', 'preview-pdf', 'start');
  const landlordResp = await fetchPdf(landlordTokens!.access, contractId);
  logStep(ctx, 'landlord', 'preview-pdf', landlordResp.status === 200 ? 'ok' : 'fail', {
    status: landlordResp.status,
    contentType: landlordResp.contentType,
    size: landlordResp.body.length,
  });
  expect(landlordResp.status).toBe(200);
  expect(landlordResp.contentType).toContain('application/pdf');
  expect(landlordResp.body.slice(0, 5).toString('ascii')).toBe('%PDF-');
  expect(landlordResp.body.length).toBeGreaterThan(10 * 1024);

  // --- Tenant: también ve la vista previa ---
  logStep(ctx, 'tenant', 'preview-pdf', 'start');
  const tenantResp = await fetchPdf(tenantTokens!.access, contractId);
  logStep(ctx, 'tenant', 'preview-pdf', tenantResp.status === 200 ? 'ok' : 'fail', {
    status: tenantResp.status,
    size: tenantResp.body.length,
  });
  expect(tenantResp.status).toBe(200);
  expect(tenantResp.contentType).toContain('application/pdf');
  expect(tenantResp.body.slice(0, 5).toString('ascii')).toBe('%PDF-');
  expect(tenantResp.body.length).toBeGreaterThan(10 * 1024);

  // --- Sin autenticación: 401 ---
  logStep(ctx, 'system', 'preview-pdf-no-auth', 'start');
  const anonResp = await fetchPdf('', contractId);
  logStep(ctx, 'system', 'preview-pdf-no-auth', 'ok', { status: anonResp.status });
  expect(anonResp.status).toBe(401);

  // --- Usuario no-parte: 403 ---
  logStep(ctx, 'service_provider', 'preview-pdf-forbidden', 'start');
  const spResp = await fetchPdf(spTokens!.access, contractId);
  logStep(ctx, 'service_provider', 'preview-pdf-forbidden', 'ok', { status: spResp.status });
  expect(spResp.status).toBe(403);
});
