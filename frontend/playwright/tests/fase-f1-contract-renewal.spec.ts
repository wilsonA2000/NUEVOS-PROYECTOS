/**
 * Fase F1 - Renovación de contrato con ajuste IPC (Ley 820 Art. 20).
 *
 * Flujo básico:
 *   1. Seed `contract_active` crea Contract legacy activo.
 *   2. Landlord crea ContractRenewal (POST /contracts/renewals/)
 *      con new_start_date, new_end_date, rent_increase_percentage.
 *   3. Verifica 201, status='pending'.
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
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-f');

test.describe.configure({ mode: 'serial' });

test('Fase F1 · crear ContractRenewal con ajuste IPC', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('contract_active');
  logStep(ctx, 'system', 'seed', 'ok', { contract_id: seed.contract_id });

  const landlordTokens = await getAuthToken(seed.landlord_email, seed.password);
  expect(landlordTokens).toBeTruthy();
  const landlordToken = landlordTokens!.access;

  // Fechas: año siguiente con 5% IPC (aprox IPC Colombia 2025)
  const today = new Date();
  const nextYear = today.getFullYear() + 1;
  const newStart = `${nextYear}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const newEnd = `${nextYear + 1}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

  // response_deadline requerido por serializer; 30 días para que tenant
  // responda. requested_by también es required — lo suplimos explícitamente
  // (el serializer actual no lo autoasigna desde request.user).
  const deadline = new Date(Date.now() + 30 * 24 * 3600 * 1000)
    .toISOString()
    .split('T')[0];
  logStep(ctx, 'landlord', 'create-renewal', 'start');
  const renewResp = await apiPost(landlordToken, '/contracts/renewals/', {
    original_contract: seed.contract_id,
    new_start_date: newStart,
    new_end_date: newEnd,
    new_monthly_rent: '1575000',  // +5% sobre 1.500.000
    rent_increase_percentage: '5.00',
    response_deadline: deadline,
    requested_by: seed.landlord_id,
  });
  logStep(ctx, 'landlord', 'create-renewal', renewResp.ok ? 'ok' : 'fail', {
    status: renewResp.status,
    body: renewResp.body,
  });
  expect(renewResp.ok, `renew 2xx (${renewResp.status})`).toBe(true);
  const renewal = renewResp.body as Record<string, unknown>;
  expect(renewal.status).toBe('pending');
  expect(String(renewal.rent_increase_percentage)).toBe('5.00');
});
