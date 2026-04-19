/**
 * Fase C1 - Verificación presencial end-to-end.
 *
 * Actores:
 *   - admin (is_staff) crea la visita y aprueba el reporte final.
 *   - verification_agent (is_staff + VerificationAgent profile) la
 *     ejecuta: start → complete → submit report.
 *
 * Flujo:
 *   1. Seed `verification_ready` crea Agent profile + visita 'pending'.
 *   2. Admin asigna agente (POST assign_agent) → status='scheduled'.
 *   3. Agent inicia (POST start) → status='in_progress'.
 *   4. Agent completa (POST complete) → status='completed',
 *      verification_passed=true (audit log 1.9.7).
 *   5. Agent crea VerificationReport (POST /reports/).
 *   6. Admin aprueba (POST /reports/{id}/approve/) → approved_by_admin=true.
 *
 * Guards:
 *   - Agent sin perfil no puede iniciar visita.
 *   - Admin no staff no puede aprobar reporte.
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
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-c');

test.describe.configure({ mode: 'serial' });

test('Fase C1 · verificación presencial: admin asigna → agent start→complete → admin approve', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('verification_ready');
  logStep(ctx, 'system', 'seed', 'ok', {
    agent: seed.verification_agent_email,
    visit_id: seed.visit_id,
  });

  const adminTokens = await getAuthToken(seed.admin_email, seed.password);
  const agentTokens = await getAuthToken(seed.verification_agent_email, seed.password);
  expect(adminTokens).toBeTruthy();
  expect(agentTokens).toBeTruthy();
  const adminToken = adminTokens!.access;
  const agentToken = agentTokens!.access;

  const visitId = seed.visit_id;
  const agentProfileId = seed.agent_profile_id;
  expect(visitId).toBeTruthy();
  expect(agentProfileId).toBeTruthy();

  // --- Paso 1: admin asigna agente ---
  logStep(ctx, 'admin', 'assign-agent', 'start');
  const assignResp = await apiPost(
    adminToken,
    `/verification/visits/${visitId}/assign_agent/`,
    { agent: agentProfileId },
  );
  logStep(ctx, 'admin', 'assign-agent', assignResp.ok ? 'ok' : 'fail', {
    status: assignResp.status,
    body: assignResp.body,
  });
  expect(assignResp.ok).toBe(true);
  expect((assignResp.body as any).status).toBe('scheduled');

  // --- Paso 2: agent inicia ---
  logStep(ctx, 'verification_agent', 'start-visit', 'start');
  const startResp = await apiPost(agentToken, `/verification/visits/${visitId}/start/`);
  logStep(ctx, 'verification_agent', 'start-visit', startResp.ok ? 'ok' : 'fail', {
    status: startResp.status,
  });
  expect(startResp.ok).toBe(true);
  expect((startResp.body as any).status).toBe('in_progress');

  // --- Paso 3: agent completa ---
  logStep(ctx, 'verification_agent', 'complete-visit', 'start');
  const completeResp = await apiPost(
    agentToken,
    `/verification/visits/${visitId}/complete/`,
    { passed: true, notes: 'Identidad y dirección verificadas sin observaciones.' },
  );
  logStep(ctx, 'verification_agent', 'complete-visit', completeResp.ok ? 'ok' : 'fail', {
    status: completeResp.status,
  });
  expect(completeResp.ok).toBe(true);
  expect((completeResp.body as any).status).toBe('completed');
  expect((completeResp.body as any).verification_passed).toBe(true);

  // --- Paso 4: admin crea reporte (agente no tiene permiso de CRUD sobre
  //     reports, sólo admin, según IsStaffUser del ViewSet).
  logStep(ctx, 'admin', 'create-report', 'start');
  const reportResp = await apiPost(adminToken, '/verification/reports/', {
    visit: visitId,
    overall_condition: 'good',
    initial_rating: 8,
    identity_verified: true,
    document_type_verified: 'CC',
    document_number_verified: '1234567890',
    person_lives_at_address: true,
    person_cooperative: true,
    references_verified: true,
    findings: 'Persona identificada correctamente en la dirección indicada.',
    recommendations: 'Sin observaciones. Apto para contratar.',
  });
  logStep(ctx, 'admin', 'create-report', reportResp.ok ? 'ok' : 'fail', {
    status: reportResp.status,
    body: reportResp.body,
  });
  expect(reportResp.ok, `create report 2xx (${reportResp.status})`).toBe(true);
  const reportId = (reportResp.body as any).id;
  expect(reportId).toBeTruthy();

  // --- Paso 5: admin aprueba reporte ---
  logStep(ctx, 'admin', 'approve-report', 'start');
  const approveResp = await apiPost(
    adminToken,
    `/verification/reports/${reportId}/approve/`,
    { notes: 'Aprobado sin observaciones.' },
  );
  logStep(ctx, 'admin', 'approve-report', approveResp.ok ? 'ok' : 'fail', {
    status: approveResp.status,
  });
  expect(approveResp.ok).toBe(true);
  expect((approveResp.body as any).approved_by_admin).toBe(true);

  // Verificar que la visita final mantiene el estado completado + auditoría
  const finalVisit = await apiGet(adminToken, `/verification/visits/${visitId}/`);
  expect((finalVisit.body as any).status).toBe('completed');
  expect((finalVisit.body as any).verification_passed).toBe(true);
});
