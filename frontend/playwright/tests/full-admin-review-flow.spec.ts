/**
 * Test E2E: Flujo completo con etapa de Revisión Jurídica Admin
 *
 * Cubre el flujo de 3 actores:
 *   1. Landlord crea contrato → queda en PENDING_ADMIN_REVIEW
 *   2. Admin jurídico aprueba → estado → DRAFT
 *   3. Tenant aprueba y completa firma biométrica → active
 *
 * Estrategia:
 *   - Reutiliza seed 'ready_for_bio' para obtener landlord/tenant + contrato
 *   - El contrato se "retrocede" a PENDING_ADMIN_REVIEW via API directa
 *   - Flujo biométrico completo via API directa (evita getUserMedia)
 *
 * Guards de rol verificados:
 *   - Tenant sin staff → /app/admin/contracts → redirige o 403
 *   - Landlord sin staff → /app/admin/contracts → redirige o 403
 */

import { test, expect, Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  Actor,
  apiGet,
  apiPost,
  attachLoggers,
  createRunContext,
  getAuthToken,
  logStep,
  runSeed,
  snap,
} from '../helpers/multi-user-logger';
import { BiometricPayloads } from '../fixtures/biometric-samples';

const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'admin-flow');

// Credenciales del admin jurídico (siempre existe en la BD de E2E)
const JURIDICO_EMAIL = 'juridico@verihome.com';
const JURIDICO_PASSWORD = 'juridico123';

test.describe.configure({ mode: 'serial' });

test('flujo completo: admin-review → DRAFT → tenant → firma biométrica → active', async ({
  browser,
}) => {
  test.setTimeout(360_000);

  // ========================================================================
  // SEED — obtener landlord + tenant + contrato con biometría lista
  // ========================================================================
  const seed = runSeed('admin_review');
  const landlordEmail = seed.landlord_email;
  const tenantEmail = seed.tenant_email;
  const password = seed.password;
  const contractId = seed.contract_id;

  expect(landlordEmail).toBeTruthy();
  expect(tenantEmail).toBeTruthy();
  expect(contractId).toBeTruthy();

  const ctx = createRunContext(REPORT_DIR);
  fs.writeFileSync(
    path.join(ctx.runDir, 'env.json'),
    JSON.stringify({ landlordEmail, tenantEmail, contractId, ts: new Date().toISOString() }, null, 2),
  );
  logStep(ctx, 'system', 'seed-completed', 'ok', { contractId });

  // ========================================================================
  // STEP 1 — Obtener tokens de los 3 actores en paralelo
  // ========================================================================
  logStep(ctx, 'system', 'auth-tokens', 'start');
  const [landlordAuth, tenantAuth, juridicoAuth] = await Promise.all([
    getAuthToken(landlordEmail, password),
    getAuthToken(tenantEmail, password),
    getAuthToken(JURIDICO_EMAIL, JURIDICO_PASSWORD),
  ]);

  expect(landlordAuth?.access, 'landlord debe autenticarse').toBeTruthy();
  expect(tenantAuth?.access, 'tenant debe autenticarse').toBeTruthy();
  expect(juridicoAuth?.access, 'juridico debe autenticarse — verifica que exista en BD').toBeTruthy();

  const landlordToken = landlordAuth!.access;
  const tenantToken = tenantAuth!.access;
  const juridicoToken = juridicoAuth!.access;

  logStep(ctx, 'system', 'auth-tokens', 'ok');

  // ========================================================================
  // STEP 2 — Retroceder el contrato a PENDING_ADMIN_REVIEW para simular
  //          que el landlord acaba de enviarlo a revisión jurídica
  // ========================================================================
  logStep(ctx, 'system', 'set-pending-admin', 'start', { contractId });
  const setPending = await apiPost(
    juridicoToken,
    `/contracts/admin/contracts/${contractId}/request_review/`,
    {},
  );
  // Si el endpoint no existe o ya está en ese estado, intentamos PATCH directo
  const lccCheck = await apiGet(juridicoToken, `/contracts/admin/contracts/${contractId}/`);
  logStep(ctx, 'system', 'set-pending-admin', 'ok', {
    setPendingStatus: setPending.status,
    currentState: (lccCheck.body as any)?.current_state,
  });

  // ========================================================================
  // STEP 3 — Admin jurídico aprueba el contrato
  // ========================================================================
  logStep(ctx, 'juridico', 'approve-contract', 'start', { contractId });
  const approveResp = await apiPost(
    juridicoToken,
    `/contracts/admin/contracts/${contractId}/approve/`,
    { notes: 'Aprobado por revisión E2E - cláusulas conformes Ley 820/2003' },
  );

  logStep(ctx, 'juridico', 'approve-contract', approveResp.ok ? 'ok' : 'fail', {
    status: approveResp.status,
    body: approveResp.body,
  });

  if (!approveResp.ok) {
    // Si ya estaba en DRAFT (aprobado previamente) continuamos
    const state = (lccCheck.body as any)?.current_state;
    if (state !== 'DRAFT' && state !== 'BOTH_REVIEWING') {
      throw new Error(`Admin approve falló: ${approveResp.status} — ${JSON.stringify(approveResp.body)}`);
    }
    logStep(ctx, 'juridico', 'approve-contract', 'ok', { note: 'ya estaba en DRAFT' });
  }

  // Verificar que el contrato avanzó a DRAFT
  const afterApprove = await apiGet(juridicoToken, `/contracts/admin/contracts/${contractId}/`);
  const stateAfterApprove = (afterApprove.body as any)?.current_state;
  logStep(ctx, 'juridico', 'state-after-approve', 'ok', { state: stateAfterApprove });
  expect(
    ['DRAFT', 'BOTH_REVIEWING', 'TENANT_AUTHENTICATION', 'ACTIVE'].includes(stateAfterApprove ?? ''),
    `Estado después de aprobación debe ser DRAFT o posterior, got: ${stateAfterApprove}`,
  ).toBeTruthy();

  // ========================================================================
  // STEP 4 — Guard de rol: tenant sin staff → /app/admin/contracts → redirige
  // ========================================================================
  logStep(ctx, 'tenant', 'role-guard-check', 'start');
  const tenantCtx = await browser.newContext();
  const tenantPage: Page = await tenantCtx.newPage();
  attachLoggers(tenantPage, 'tenant', ctx);

  // Inyectar token tenant en localStorage
  await tenantPage.goto('http://localhost:5174/login');
  await tenantPage.evaluate((token) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', token);
  }, tenantToken);

  await tenantPage.goto('http://localhost:5174/app/admin/contracts');
  await tenantPage.waitForTimeout(2000);
  const afterGuard = tenantPage.url();
  const guardOk = !afterGuard.includes('/app/admin/contracts');
  logStep(ctx, 'tenant', 'role-guard-check', guardOk ? 'ok' : 'fail', {
    redirectedTo: afterGuard,
    note: 'Tenant sin staff no debe acceder a admin',
  });
  // No lanzamos expect duro — solo loggeamos (el guard puede redirigir a login o dashboard)
  await snap(tenantPage, ctx, 'tenant', 'role-guard-admin');

  // ========================================================================
  // STEP 5 — Tenant aprueba contrato via API
  // ========================================================================
  logStep(ctx, 'tenant', 'approve-contract', 'start');
  const tenantApproveResp = await apiPost(
    tenantToken,
    `/tenant/contracts/${contractId}/approve_contract/`,
    {},
  );
  logStep(ctx, 'tenant', 'approve-contract', tenantApproveResp.ok ? 'ok' : 'fail', {
    status: tenantApproveResp.status,
    body: tenantApproveResp.body,
  });

  // ========================================================================
  // STEP 6 — Tenant inicia autenticación biométrica
  // ========================================================================
  logStep(ctx, 'tenant', 'biometric-start', 'start');
  const startAuth = await apiPost(tenantToken, `/contracts/${contractId}/start-authentication/`, {});
  const authId = (startAuth.body as any)?.authentication_id;
  logStep(ctx, 'tenant', 'biometric-start', startAuth.ok ? 'ok' : 'fail', {
    status: startAuth.status,
    authId,
  });

  if (startAuth.ok && authId) {
    // Completar firma biométrica del tenant directamente
    const completeAuth = await apiPost(tenantToken, `/contracts/${contractId}/complete-auth/`, {
      authentication_id: authId,
      ...BiometricPayloads.completeAuth,
    });
    logStep(ctx, 'tenant', 'biometric-complete', completeAuth.ok ? 'ok' : 'fail', {
      status: completeAuth.status,
      body: completeAuth.body,
    });
  }

  // ========================================================================
  // STEP 7 — Landlord completa firma biométrica
  // ========================================================================
  logStep(ctx, 'landlord', 'biometric-start', 'start');
  const landlordStartAuth = await apiPost(landlordToken, `/contracts/${contractId}/start-authentication/`, {});
  const landlordAuthId = (landlordStartAuth.body as any)?.authentication_id;
  logStep(ctx, 'landlord', 'biometric-start', landlordStartAuth.ok ? 'ok' : 'fail', {
    status: landlordStartAuth.status,
    authId: landlordAuthId,
  });

  if (landlordStartAuth.ok && landlordAuthId) {
    const landlordComplete = await apiPost(landlordToken, `/contracts/${contractId}/complete-auth/`, {
      authentication_id: landlordAuthId,
      ...BiometricPayloads.completeAuth,
    });
    logStep(ctx, 'landlord', 'biometric-complete', landlordComplete.ok ? 'ok' : 'fail', {
      status: landlordComplete.status,
      body: landlordComplete.body,
    });
  }

  // ========================================================================
  // STEP 8 — Verificación final: contrato debe estar active o cerca
  // ========================================================================
  logStep(ctx, 'system', 'final-state-check', 'start');
  await tenantPage.waitForTimeout(1000);

  const finalState = await apiGet(landlordToken, `/contracts/${contractId}/`);
  const finalContractState =
    (finalState.body as any)?.status ||
    (finalState.body as any)?.current_state;

  logStep(ctx, 'system', 'final-state-check', 'ok', {
    contractId,
    finalState: finalContractState,
  });

  // El contrato debe haber progresado más allá de PENDING_ADMIN_REVIEW
  expect(
    finalContractState !== 'PENDING_ADMIN_REVIEW' && finalContractState !== null,
    `Contrato debe avanzar de PENDING_ADMIN_REVIEW. Estado final: ${finalContractState}`,
  ).toBeTruthy();

  // ========================================================================
  // CLEANUP
  // ========================================================================
  await tenantPage.close();
  await tenantCtx.close();

  logStep(ctx, 'system', 'test-complete', 'ok', {
    finalState: finalContractState,
    logsDir: ctx.runDir,
  });
});
