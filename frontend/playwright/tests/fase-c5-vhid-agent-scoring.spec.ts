/**
 * F1 · Fase C5 — Agente captura visit_score, veredicto compuesto se recalcula
 *
 * El agente verificador (`agente.e2e@verihome.com`) abre el detalle del
 * acta `draft`, mueve un slider en la UI para validar el componente,
 * persiste los 8 sub-scores via API (`POST /verification/acts/{id}/visit-score/`),
 * recarga la página y confirma que el bloque "Veredicto compuesto" del
 * AdminFieldVisitActDetail recalculó `total_score` y `final_verdict`.
 *
 * Modo seed: `vhid_act_in_progress`.
 */

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runSeed,
  getAuthToken,
  apiPost,
  apiGet,
  createRunContext,
  logStep,
  attachLoggers,
  snap,
} from '../helpers/multi-user-logger';

const __filename_c5 = fileURLToPath(import.meta.url);
const __dirname_c5 = path.dirname(__filename_c5);

interface SeedResult {
  verification_agent_email: string;
  password: string;
  property_id: string;
  field_request_id: string;
  visit_id: string;
  act_id: string;
  agent_profile_id: string;
  [k: string]: unknown;
}

const SUBSCORE_KEYS = [
  'cedula_real',
  'observacion_visual',
  'recibo_publico',
  'comprobante_laboral',
  'email_otp',
  'telefono_otp',
  'cruces_oficiales',
  'inmueble_existe',
] as const;

// Sub-scores al máximo (suman 0.500). Combinado con digital 0.450 → 0.950 = aprobado.
const FULL_BREAKDOWN: Record<(typeof SUBSCORE_KEYS)[number], number> = {
  cedula_real: 0.10,
  observacion_visual: 0.05,
  recibo_publico: 0.05,
  comprobante_laboral: 0.05,
  email_otp: 0.05,
  telefono_otp: 0.05,
  cruces_oficiales: 0.10,
  inmueble_existe: 0.05,
};

test.describe.configure({ mode: 'serial' });

test.describe('F1 · C5 · Agente captura visit_score y veredicto compuesto', () => {
  let seed: SeedResult;
  let agentToken: string;
  const ctx = createRunContext(
    path.resolve(__dirname_c5, '..', '..', 'e2e-logs', 'fase-c5'),
  );

  test.beforeAll(async () => {
    seed = runSeed('vhid_act_in_progress') as unknown as SeedResult;
    logStep(ctx, 'system', 'seed', 'ok', {
      act_id: seed.act_id,
      visit_id: seed.visit_id,
    });
    const auth = await getAuthToken(seed.verification_agent_email, seed.password);
    expect(auth, 'agent login fallo').not.toBeNull();
    agentToken = auth!.access;
  });

  test('UI: detalle del acta renderiza VisitScoreEditor con sliders interactivos', async ({
    page,
  }) => {
    attachLoggers(page, 'verification_agent', ctx);
    await page.goto('/login');
    await page.fill(
      'input[name="email"], input[type="email"]',
      seed.verification_agent_email,
    );
    await page.fill(
      'input[name="password"], input[type="password"]',
      seed.password,
    );
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app/**', { timeout: 30000 });

    await page.goto(`/app/admin/visitas/${seed.act_id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);

    const editor = page.getByTestId('visit-score-editor');
    await expect(editor).toBeVisible({ timeout: 15000 });
    for (const key of SUBSCORE_KEYS) {
      await expect(page.getByTestId(`visit-score-slider-${key}`)).toBeVisible();
    }
    await snap(page, ctx, 'verification_agent', 'editor-initial');

    // Tocar un slider via input range nativo (MUI lo expone como input[type=range])
    const slider = editor
      .getByTestId('visit-score-slider-cedula_real')
      .locator('input[type="range"]');
    await expect(slider).toHaveCount(1);
    await slider.evaluate((el, val) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(el, String(val));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, 0.1);
    logStep(ctx, 'verification_agent', 'slider-cedula_real-set', 'ok');
  });

  test('API: POST /visit-score/ persiste 8 sub-scores → 200 OK', async () => {
    logStep(ctx, 'verification_agent', 'visit-score-post', 'start');
    const total = Object.values(FULL_BREAKDOWN).reduce((s, v) => s + v, 0);
    const res = await apiPost(
      agentToken,
      `/verification/acts/${seed.act_id}/visit-score/`,
      {
        visit_score_breakdown: FULL_BREAKDOWN,
        visit_score_total: total,
      },
    );
    logStep(
      ctx,
      'verification_agent',
      'visit-score-post',
      res.ok ? 'ok' : 'fail',
      { status: res.status, body: res.body },
    );
    expect(res.status, JSON.stringify(res.body)).toBe(200);
  });

  test('API: GET /acts/{id}/ refleja total_score recalculado y verdict aprobado', async () => {
    const res = await apiGet(agentToken, `/verification/acts/${seed.act_id}/`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(parseFloat(String(body.visit_score_total))).toBeCloseTo(0.5, 3);
    expect(parseFloat(String(body.total_score))).toBeCloseTo(0.95, 3);
    expect(body.final_verdict).toBe('aprobado');
  });

  test('UI: AdminFieldVisitActDetail muestra Veredicto compuesto recalculado', async ({
    page,
  }) => {
    attachLoggers(page, 'verification_agent', ctx);
    await page.goto('/login');
    await page.fill(
      'input[name="email"], input[type="email"]',
      seed.verification_agent_email,
    );
    await page.fill(
      'input[name="password"], input[type="password"]',
      seed.password,
    );
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app/**', { timeout: 30000 });

    await page.goto(`/app/admin/visitas/${seed.act_id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);

    const verdictBlock = page.getByText(/Veredicto compuesto/i).locator('..');
    await expect(verdictBlock).toBeVisible({ timeout: 15000 });

    // El total compuesto 0.950 con verdict aprobado debe estar en el bloque
    await expect(page.getByText('0.950').first()).toBeVisible();
    await expect(
      page.getByText(/^Aprobado$/i).first(),
    ).toBeVisible();
    await snap(page, ctx, 'verification_agent', 'verdict-recalculated');
    logStep(ctx, 'verification_agent', 'verdict-block-visible', 'ok');
  });
});
