/**
 * Fase B2 - ServiceRequest: anónimo vs autenticado (Fase 1.9.3 FKs).
 *
 * `services.ServiceRequest` tiene campos string (requester_name/email/
 * phone) Y campos FK opcionales (requester, property, contract).
 *
 *   - Cuando la petición viene SIN auth → requester queda NULL pero
 *     los strings se preservan.
 *   - Cuando la petición viene CON auth → el serializer auto-asigna
 *     requester = request.user, preservando los strings también.
 *
 * Valida la invariante 1.9.3.
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  apiPost,
  createRunContext,
  getAuthToken,
  logStep,
  runSeed,
} from '../helpers/multi-user-logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-b');

test.describe.configure({ mode: 'serial' });

test('Fase B2 · ServiceRequest anónimo deja requester null, autenticado lo autoasigna', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('service_order_ready');
  logStep(ctx, 'system', 'seed', 'ok', { service_id: seed.service_id });

  const servicePayload = {
    service: seed.service_id,
    requester_name: 'Anonimo Visitante',
    requester_email: 'anonimo@example.com',
    requester_phone: '3001234567',
    message: 'Consulta anónima desde la landing',
  };

  // --- Anónimo (sin Authorization header) ---
  logStep(ctx, 'system', 'anonymous-request', 'start');
  const anonResp = await apiPost('', '/services/requests/', servicePayload);
  logStep(ctx, 'system', 'anonymous-request', anonResp.ok ? 'ok' : 'fail', {
    status: anonResp.status,
    body: anonResp.body,
  });
  expect(anonResp.ok, `anonymous 2xx (${anonResp.status})`).toBe(true);
  const anon = anonResp.body as Record<string, unknown>;
  expect(anon.requester_name).toBe('Anonimo Visitante');
  expect(anon.requester).toBeNull();
  expect(anon.status).toBe('pending');

  // --- Autenticado (el tenant manda solicitud) ---
  const tenantTokens = await getAuthToken(seed.tenant_email, seed.password);
  expect(tenantTokens).toBeTruthy();
  const tenantToken = tenantTokens!.access;

  logStep(ctx, 'tenant', 'authenticated-request', 'start');
  const authResp = await apiPost(tenantToken, '/services/requests/', {
    ...servicePayload,
    requester_name: 'Leidy Tenant',
    requester_email: seed.tenant_email,
    message: 'Solicitud enviada desde cuenta autenticada',
  });
  logStep(ctx, 'tenant', 'authenticated-request', authResp.ok ? 'ok' : 'fail', {
    status: authResp.status,
    body: authResp.body,
  });
  expect(authResp.ok, `authenticated 2xx (${authResp.status})`).toBe(true);
  const auth = authResp.body as Record<string, unknown>;
  expect(auth.requester_name).toBe('Leidy Tenant');
  // FK debe estar seteado al usuario autenticado.
  expect(auth.requester).toBe(seed.tenant_id);
});
