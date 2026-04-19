/**
 * Fase F2 - Sistema de tickets internos (SupportTicket).
 *
 * Flujo:
 *   1. Usuario común crea ticket (POST /core/tickets/) → status='open'.
 *   2. Admin asigna a sí mismo (POST /tickets/{id}/assign/) →
 *      status='in_progress'.
 *   3. Admin responde (POST /tickets/{id}/respond/) → TicketResponse.
 *   4. Admin resuelve (POST /tickets/{id}/resolve/) → status='resolved'.
 *
 * Guards:
 *   - Usuario no staff no puede asignar ni resolver.
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
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-f');

test.describe.configure({ mode: 'serial' });

test('Fase F2 · ticket lifecycle (create → assign → respond → resolve)', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('minimal');
  logStep(ctx, 'system', 'seed', 'ok', { admin: seed.admin_email });

  const tenantTokens = await getAuthToken(seed.tenant_email, seed.password);
  const adminTokens = await getAuthToken(seed.admin_email, seed.password);
  expect(tenantTokens).toBeTruthy();
  expect(adminTokens).toBeTruthy();
  const tenantToken = tenantTokens!.access;
  const adminToken = adminTokens!.access;

  // --- Paso 1: tenant crea ticket ---
  logStep(ctx, 'tenant', 'create-ticket', 'start');
  const createResp = await apiPost(tenantToken, '/core/tickets/', {
    subject: 'No puedo acceder al panel',
    description: 'Al hacer login aparece un 500 después de introducir el código.',
    category: 'technical',
    priority: 'high',
  });
  logStep(ctx, 'tenant', 'create-ticket', createResp.ok ? 'ok' : 'fail', {
    status: createResp.status,
    body: createResp.body,
  });
  expect(createResp.ok, `create 2xx (${createResp.status})`).toBe(true);
  const ticket = createResp.body as any;
  expect(ticket.status).toBe('open');
  const ticketId = ticket.id as string;

  // --- Guard: tenant NO puede asignar ---
  const forbiddenAssign = await apiPost(
    tenantToken,
    `/core/tickets/${ticketId}/assign/`,
    { assigned_to: seed.admin_id },
  );
  expect(forbiddenAssign.status).toBe(403);

  // --- Paso 2: admin asigna a sí mismo ---
  logStep(ctx, 'admin', 'assign-ticket', 'start');
  const assignResp = await apiPost(
    adminToken,
    `/core/tickets/${ticketId}/assign/`,
    { assigned_to: seed.admin_id },
  );
  logStep(ctx, 'admin', 'assign-ticket', assignResp.ok ? 'ok' : 'fail', {
    status: assignResp.status,
  });
  expect(assignResp.ok).toBe(true);
  expect((assignResp.body as any).status).toBe('in_progress');

  // --- Paso 3: admin responde ---
  logStep(ctx, 'admin', 'respond-ticket', 'start');
  const respondResp = await apiPost(
    adminToken,
    `/core/tickets/${ticketId}/respond/`,
    {
      message: 'Ya corregimos el tema. Intenta iniciar sesión nuevamente y nos dices si persiste.',
    },
  );
  logStep(ctx, 'admin', 'respond-ticket', respondResp.ok ? 'ok' : 'fail', {
    status: respondResp.status,
  });
  expect(respondResp.ok).toBe(true);

  // --- Guard: respond sin message → 400 ---
  const emptyResp = await apiPost(
    adminToken,
    `/core/tickets/${ticketId}/respond/`,
    {},
  );
  expect(emptyResp.status).toBe(400);

  // --- Paso 4: admin resuelve ---
  logStep(ctx, 'admin', 'resolve-ticket', 'start');
  const resolveResp = await apiPost(
    adminToken,
    `/core/tickets/${ticketId}/resolve/`,
  );
  logStep(ctx, 'admin', 'resolve-ticket', resolveResp.ok ? 'ok' : 'fail', {
    status: resolveResp.status,
  });
  expect(resolveResp.ok).toBe(true);
  expect((resolveResp.body as any).status).toBe('resolved');

  // --- Stats endpoint (solo staff) ---
  const statsResp = await apiGet(adminToken, '/core/tickets/stats/');
  expect(statsResp.ok).toBe(true);
  expect((statsResp.body as any).total).toBeGreaterThanOrEqual(1);
});
