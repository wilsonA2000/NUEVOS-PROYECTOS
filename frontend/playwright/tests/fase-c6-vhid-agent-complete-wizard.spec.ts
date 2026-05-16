/**
 * F4 · Fase C6 — Wizard "completar visita" del agente verificador
 *
 * El agente (`agente.e2e@verihome.com`) entra a `/app/agente/visitas`,
 * abre el wizard de completar visita sobre una `VerificationVisit`
 * en estado `in_progress` con `FieldVisitAct` draft pre-existente
 * (seed `vhid_act_in_progress`), navega los 5 pasos del Stepper:
 *
 *   1. Ubicación GPS  (mocked via grantPermissions + setGeolocation).
 *   2. Fotos sección VII  (se omiten — opcionales).
 *   3. Observaciones + risk_flags + veredicto del agente.
 *   4. Score de visita (8 sub-puntajes 0.0-0.5).
 *   5. Resumen y cierre.
 *
 * Al cerrar el wizard se valida:
 *   - La visita pasa a `status=completed` (API).
 *   - El acta refleja `payload.observaciones_agente`, `payload.gps`,
 *     `payload.risk_flags` y `visit_score_total` actualizado.
 */

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runSeed,
  getAuthToken,
  apiGet,
  createRunContext,
  logStep,
  attachLoggers,
  snap,
} from '../helpers/multi-user-logger';

const __filename_c6 = fileURLToPath(import.meta.url);
const __dirname_c6 = path.dirname(__filename_c6);

interface SeedResult {
  verification_agent_email: string;
  password: string;
  field_request_id: string;
  visit_id: string;
  act_id: string;
  agent_profile_id: string;
  [k: string]: unknown;
}

// Coordenadas Bucaramanga centro (donde se programó la visita en el seed).
const MOCK_GEO = { latitude: 7.119349, longitude: -73.122742, accuracy: 12 };

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

test.describe.configure({ mode: 'serial' });

test.describe('F4 · C6 · Agente completa visita con wizard (GPS + score + acta)', () => {
  let seed: SeedResult;
  let agentToken: string;
  const ctx = createRunContext(
    path.resolve(__dirname_c6, '..', '..', 'e2e-logs', 'fase-c6'),
  );

  test.beforeAll(async () => {
    seed = runSeed('vhid_act_in_progress') as unknown as SeedResult;
    logStep(ctx, 'system', 'seed', 'ok', {
      visit_id: seed.visit_id,
      act_id: seed.act_id,
    });
    const auth = await getAuthToken(
      seed.verification_agent_email,
      seed.password,
    );
    expect(auth, 'agent login fallo').not.toBeNull();
    agentToken = auth!.access;
  });

  test('UI: agente abre wizard desde AgentVisitsQueue y navega los 5 pasos', async ({
    page,
    context,
  }) => {
    attachLoggers(page, 'verification_agent', ctx);

    // Stub de geolocalización: grant + set posición fija.
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation(MOCK_GEO);

    // Login
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
    await page.waitForURL('**/app/**', { timeout: 30_000 });

    // Cola del agente — el seed deja visita en in_progress, hay que
    // cambiar el filtro desde "scheduled" (default) a "in_progress".
    await page.goto('/app/agente/visitas');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await page.getByLabel('Estado').click();
    await page.getByRole('option', { name: 'En curso' }).click();
    await page.waitForTimeout(1000);
    await snap(page, ctx, 'verification_agent', 'queue-in-progress');

    // Abrir wizard
    const completeBtn = page
      .getByRole('button', { name: /Completar visita/i })
      .first();
    await expect(completeBtn).toBeVisible({ timeout: 10_000 });
    await completeBtn.click();

    const wizard = page.getByTestId('agent-complete-visit-wizard');
    await expect(wizard).toBeVisible({ timeout: 5_000 });
    logStep(ctx, 'verification_agent', 'wizard-open', 'ok');
    await snap(page, ctx, 'verification_agent', 'wizard-step-1-gps');

    // PASO 1 — GPS
    await page.getByTestId('wizard-gps-capture').click();
    await expect(page.getByText(/Ubicación capturada/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText(`Lat: ${MOCK_GEO.latitude}`, { exact: false }),
    ).toBeVisible();
    logStep(ctx, 'verification_agent', 'gps-captured', 'ok');
    await page.getByTestId('wizard-next').click();

    // PASO 2 — Fotos (se omite cámara, sólo verificamos UI)
    await expect(page.getByTestId('wizard-step-photos')).toBeVisible();
    await snap(page, ctx, 'verification_agent', 'wizard-step-2-photos');
    await page.getByTestId('wizard-next').click();

    // PASO 3 — Observaciones
    const obsField = page.getByTestId('wizard-observations').locator('textarea').first();
    await obsField.fill(
      'Visita presencial completada. Documento físico verificado. ' +
        'La persona se mostró cooperativa. Dirección coincide con la reportada.',
    );
    // Marcar una bandera de riesgo
    await page.getByText(/cedula adulterada/i).click();
    // Confirmar veredicto Aprobada (default)
    await snap(page, ctx, 'verification_agent', 'wizard-step-3-observations');
    await page.getByTestId('wizard-next').click();

    // PASO 4 — Score (mover sliders al máximo permitido en c/u)
    await expect(page.getByTestId('wizard-step-score')).toBeVisible();
    const targets: Record<(typeof SUBSCORE_KEYS)[number], number> = {
      cedula_real: 0.1,
      observacion_visual: 0.05,
      recibo_publico: 0.05,
      comprobante_laboral: 0.05,
      email_otp: 0.05,
      telefono_otp: 0.05,
      cruces_oficiales: 0.1,
      inmueble_existe: 0.05,
    };
    for (const key of SUBSCORE_KEYS) {
      const slider = page
        .getByTestId(`wizard-score-${key}`)
        .locator('input[type="range"]');
      await slider.evaluate((el, val) => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        setter?.call(el, String(val));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, targets[key]);
    }
    await snap(page, ctx, 'verification_agent', 'wizard-step-4-score');
    await page.getByTestId('wizard-next').click();

    // PASO 5 — Resumen + submit
    await expect(page.getByTestId('wizard-step-summary')).toBeVisible();
    await snap(page, ctx, 'verification_agent', 'wizard-step-5-summary');
    await page.getByTestId('wizard-submit').click();

    // Esperar a que el wizard cierre + snackbar de éxito
    await expect(page.getByTestId('agent-complete-visit-wizard')).toBeHidden({
      timeout: 30_000,
    });
    await expect(page.getByText(/Visita completada/i)).toBeVisible({
      timeout: 5_000,
    });
    logStep(ctx, 'verification_agent', 'wizard-submitted', 'ok');
  });

  test('API: visita queda en status=completed', async () => {
    const res = await apiGet(agentToken, `/verification/visits/${seed.visit_id}/`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.status).toBe('completed');
    expect(body.verification_passed).toBe(true);
    expect(String(body.agent_notes)).toContain('Visita presencial completada');
    logStep(ctx, 'verification_agent', 'visit-completed', 'ok', {
      status: body.status,
    });
  });

  test('API: acta refleja payload del wizard y score actualizado', async () => {
    const res = await apiGet(agentToken, `/verification/acts/${seed.act_id}/`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const body = res.body as Record<string, unknown>;

    const payload = body.payload as Record<string, unknown>;
    expect(payload).toBeTruthy();
    expect(payload.generated_by).toBe('F4_complete_visit_wizard');
    expect(payload.observaciones_agente).toContain('cooperativa');

    const gps = payload.gps as Record<string, number>;
    expect(gps).toBeTruthy();
    expect(gps.lat).toBeCloseTo(MOCK_GEO.latitude, 4);
    expect(gps.lng).toBeCloseTo(MOCK_GEO.longitude, 4);

    const flags = payload.risk_flags as string[];
    expect(Array.isArray(flags)).toBe(true);
    expect(flags).toContain('cedula_adulterada');

    // Score: 0.10 + 0.05*5 + 0.05 + 0.10 = 0.50
    expect(parseFloat(String(body.visit_score_total))).toBeCloseTo(0.5, 3);
    expect(body.final_verdict).toBe('aprobado');
    logStep(ctx, 'verification_agent', 'act-payload-verified', 'ok', {
      total: body.visit_score_total,
      verdict: body.final_verdict,
    });
  });
});
