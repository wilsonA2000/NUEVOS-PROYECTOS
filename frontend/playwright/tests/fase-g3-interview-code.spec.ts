/**
 * Fase G3 - Registro con código de entrevista (interview code flow).
 *
 * Flujo:
 *   1. Seed crea 2 InterviewCode: uno válido (7 días), uno expirado
 *      (valid_until 1 día en el pasado).
 *   2. `POST /users/auth/validate-interview-code/` con código válido
 *      → `is_valid: true`.
 *   3. Mismo endpoint con código expirado → `is_valid: false`,
 *      mensaje "expirado".
 *   4. `POST /users/auth/register-with-code/` con datos correctos
 *      + código válido → 201 + user creado.
 *   5. Reintentar registro con el mismo código → 400 "ya fue utilizado".
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  apiPost,
  createRunContext,
  logStep,
  runSeed,
} from '../helpers/multi-user-logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-g');

test.describe.configure({ mode: 'serial' });

test('Fase G3 · validate interview code + register + reuse rejection', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('interview_code_ready');
  logStep(ctx, 'system', 'seed', 'ok', {
    valid_code: seed.interview_code_valid,
    expired_code: seed.interview_code_expired,
  });
  expect(seed.interview_code_valid).toBeTruthy();
  expect(seed.interview_code_expired).toBeTruthy();

  // --- Paso 1: validar código válido ---
  logStep(ctx, 'system', 'validate-valid', 'start');
  const validResp = await apiPost('', '/users/auth/validate-interview-code/', {
    interview_code: seed.interview_code_valid,
  });
  logStep(ctx, 'system', 'validate-valid', validResp.ok ? 'ok' : 'fail', {
    status: validResp.status,
    body: validResp.body,
  });
  expect(validResp.ok).toBe(true);
  expect((validResp.body as any).is_valid).toBe(true);

  // --- Paso 2: validar código expirado ---
  logStep(ctx, 'system', 'validate-expired', 'start');
  const expiredResp = await apiPost('', '/users/auth/validate-interview-code/', {
    interview_code: seed.interview_code_expired,
  });
  logStep(ctx, 'system', 'validate-expired', 'ok', {
    status: expiredResp.status,
    body: expiredResp.body,
  });
  // El backend devuelve 400 con is_valid=false + mensaje descriptivo.
  expect(expiredResp.status).toBeGreaterThanOrEqual(400);
  expect((expiredResp.body as any).is_valid).toBe(false);
  expect(String((expiredResp.body as any).message || '').toLowerCase()).toMatch(
    /expir|invalid|utilizado/i,
  );

  // --- Paso 3: registrar usuario con código válido ---
  logStep(ctx, 'system', 'register-with-valid', 'start');
  const registerResp = await apiPost('', '/users/auth/register-with-code/', {
    interview_code: seed.interview_code_valid,
    email: seed.interview_email_valid,
    password: 'passw0rd-E2E-valid!',
    first_name: 'Nuevo',
    last_name: 'Tenant E2E',
    user_type: 'tenant',
  });
  logStep(ctx, 'system', 'register-with-valid', registerResp.ok ? 'ok' : 'fail', {
    status: registerResp.status,
    body: registerResp.body,
  });
  expect(registerResp.ok, `register 2xx (${registerResp.status})`).toBe(true);
  expect((registerResp.body as any).success).toBe(true);
  expect((registerResp.body as any).user?.email).toBe(seed.interview_email_valid);

  // --- Paso 4: intentar reusar el mismo código → debe rechazar ---
  logStep(ctx, 'system', 'reuse-same-code', 'start');
  const reuseResp = await apiPost('', '/users/auth/register-with-code/', {
    interview_code: seed.interview_code_valid,
    email: `second.${seed.interview_email_valid}`,
    password: 'otro-passw0rd!',
    first_name: 'Duplicado',
    last_name: 'Intento',
    user_type: 'tenant',
  });
  logStep(ctx, 'system', 'reuse-same-code', 'ok', {
    status: reuseResp.status,
    body: reuseResp.body,
  });
  expect(reuseResp.ok).toBe(false);
  expect(reuseResp.status).toBeGreaterThanOrEqual(400);
});
