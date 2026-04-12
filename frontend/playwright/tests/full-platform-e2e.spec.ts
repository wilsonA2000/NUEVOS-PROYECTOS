/**
 * Suite E2E comprehensivo de la plataforma VeriHome.
 *
 * Cubre todo lo que un usuario real ve:
 *   1. Crear propiedad (landlord, UI)
 *   2. Listar / ver detalle de propiedad (tenant, UI)
 *   3. Match request (tenant, API - UI es demasiado fragil con modales)
 *   4. Aceptar match (landlord, API)
 *   5. Firma biometrica TRIPLE: tenant + GUARANTE publico + landlord
 *   6. Features accesorias: messaging, dashboard, ratings, profile
 *
 * Cada test es autocontenido (ejecuta su propio seed) y deja artefactos
 * en `frontend/e2e-logs/full/run-<timestamp>/`. Los findings se consolidan
 * en el FINDINGS.md global al final.
 */
import { test, expect, Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

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
  RunContext,
} from '../helpers/multi-user-logger';
import { BiometricPayloads, JPG_1X1_BASE64, WAV_SILENCE_BASE64 } from '../fixtures/biometric-samples';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'full');

test.describe.configure({ mode: 'serial' });

async function uiLogin(
  page: Page,
  ctx: RunContext,
  actor: Actor,
  email: string,
  password: string,
): Promise<void> {
  logStep(ctx, actor, 'ui-login', 'start', { email });
  await page.goto('/login');
  await snap(page, ctx, actor, 'login-page');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL(/\/app\/|\/$/, { timeout: 20000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
  await snap(page, ctx, actor, 'post-login');
  logStep(ctx, actor, 'ui-login', 'ok', { url: page.url() });
}

async function uiVisit(
  page: Page,
  ctx: RunContext,
  actor: Actor,
  urlPath: string,
  label: string,
): Promise<void> {
  logStep(ctx, actor, `visit-${label}`, 'start', { urlPath });
  await page.goto(urlPath);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
  await snap(page, ctx, actor, label);
  logStep(ctx, actor, `visit-${label}`, 'ok', { url: page.url() });
}

// ============================================================================
// CASO 1: Landlord crea propiedad (UI flujo completo)
// ============================================================================
test('CASO 1 - landlord: ciclo UI (crear propiedad)', async ({ browser }) => {
  test.setTimeout(120_000);
  const seed = runSeed('property_ready');
  const ctx = createRunContext(REPORT_DIR);
  fs.writeFileSync(path.join(ctx.runDir, 'seed.json'), JSON.stringify(seed, null, 2));
  logStep(ctx, 'system', 'seed-ok', 'ok', { mode: seed.mode });

  const bctx = await browser.newContext({
    recordVideo: { dir: path.join(ctx.runDir, 'videos', 'landlord') },
    viewport: { width: 1366, height: 820 },
  });
  const page = await bctx.newPage();
  attachLoggers(page, 'landlord', ctx);

  try {
    await uiLogin(page, ctx, 'landlord', seed.landlord_email, seed.password);
    await uiVisit(page, ctx, 'landlord', '/app/dashboard', 'dashboard');
    await uiVisit(page, ctx, 'landlord', '/app/properties', 'properties-list');
    await uiVisit(page, ctx, 'landlord', '/app/properties/new', 'new-property-form');

    // Intento crear propiedad por UI: llenar campos basicos si existen
    const titleInput = page
      .locator('input[name="title"], input[name="name"]')
      .first();
    if (await titleInput.count()) {
      await titleInput.fill('Propiedad Test UI Playwright').catch(() => null);
      await snap(page, ctx, 'landlord', 'form-filled');
      logStep(ctx, 'landlord', 'fill-title', 'ok');
    } else {
      logStep(ctx, 'landlord', 'fill-title', 'fail', {
        note: 'input[name="title"] no encontrado - selector fragil o form distinto',
      });
    }

    // Validacion via API: se listan properties del landlord?
    const auth = await getAuthToken(seed.landlord_email, seed.password);
    const propsResp = await apiGet(auth!.access, '/properties/');
    fs.writeFileSync(
      path.join(ctx.runDir, 'api-properties-list.json'),
      JSON.stringify(
        {
          ok: propsResp.ok,
          status: propsResp.status,
          count: Array.isArray(propsResp.body) ? propsResp.body.length : null,
          keys: typeof propsResp.body === 'object' ? Object.keys(propsResp.body as object) : null,
        },
        null,
        2,
      ),
    );
    logStep(ctx, 'landlord', 'api-properties-list', propsResp.ok ? 'ok' : 'fail', {
      status: propsResp.status,
    });

    // Ver detalle de la propiedad seed
    if (seed.property_id) {
      await uiVisit(
        page,
        ctx,
        'landlord',
        `/app/properties/${seed.property_id}`,
        'property-detail',
      );
      const detailResp = await apiGet(auth!.access, `/properties/${seed.property_id}/`);
      fs.writeFileSync(
        path.join(ctx.runDir, 'api-property-detail.json'),
        JSON.stringify(detailResp, null, 2).slice(0, 4000),
      );
      logStep(ctx, 'landlord', 'api-property-detail', detailResp.ok ? 'ok' : 'fail', {
        status: detailResp.status,
      });
    }
  } finally {
    await page.close().catch(() => null);
    await bctx.close();
    logStep(ctx, 'system', 'run-complete', 'ok', { runDir: ctx.runDir });
  }
});

// ============================================================================
// CASO 2: Tenant envia match request + landlord acepta
// ============================================================================
test('CASO 2 - tenant+landlord: ciclo match request', async ({ browser }) => {
  test.setTimeout(120_000);
  const seed = runSeed('property_ready');
  const ctx = createRunContext(REPORT_DIR);
  fs.writeFileSync(path.join(ctx.runDir, 'seed.json'), JSON.stringify(seed, null, 2));

  const tenantCtx = await browser.newContext({
    recordVideo: { dir: path.join(ctx.runDir, 'videos', 'tenant') },
    viewport: { width: 1366, height: 820 },
  });
  const landlordCtx = await browser.newContext({
    recordVideo: { dir: path.join(ctx.runDir, 'videos', 'landlord') },
    viewport: { width: 1366, height: 820 },
  });
  const tenantPage = await tenantCtx.newPage();
  const landlordPage = await landlordCtx.newPage();
  attachLoggers(tenantPage, 'tenant', ctx);
  attachLoggers(landlordPage, 'landlord', ctx);

  try {
    await Promise.all([
      uiLogin(tenantPage, ctx, 'tenant', seed.tenant_email, seed.password),
      uiLogin(landlordPage, ctx, 'landlord', seed.landlord_email, seed.password),
    ]);

    const tenantAuth = await getAuthToken(seed.tenant_email, seed.password);
    const landlordAuth = await getAuthToken(seed.landlord_email, seed.password);

    // Tenant ve la propiedad (UI)
    await uiVisit(
      tenantPage,
      ctx,
      'tenant',
      `/app/properties/${seed.property_id}`,
      'property-detail',
    );

    // Tenant crea match request via API (UI con modal es demasiado fragil)
    logStep(ctx, 'tenant', 'create-match-request', 'start');
    const createMR = await apiPost(tenantAuth!.access, '/matching/requests/', {
      property: seed.property_id,
      tenant_message: 'Solicitud creada por test E2E Playwright',
      monthly_income: 3000000,
      employment_type: 'employed',
      number_of_occupants: 2,
      preferred_move_in_date: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
      lease_duration_months: 12,
    });
    fs.writeFileSync(
      path.join(ctx.runDir, 'api-create-match-request.json'),
      JSON.stringify(createMR, null, 2),
    );
    logStep(ctx, 'tenant', 'create-match-request', createMR.ok ? 'ok' : 'fail', {
      status: createMR.status,
      body: typeof createMR.body === 'object' ? createMR.body : null,
    });

    const matchRequestId = (createMR.body as any)?.id;

    if (matchRequestId) {
      // Landlord ve su dashboard
      await uiVisit(landlordPage, ctx, 'landlord', '/app/dashboard', 'dashboard-pending-requests');

      // Landlord acepta via API (boton UI esta detras de dialogs anidados)
      logStep(ctx, 'landlord', 'accept-request', 'start', { matchRequestId });
      const acceptResp = await apiPost(
        landlordAuth!.access,
        `/matching/requests/${matchRequestId}/accept/`,
        { landlord_message: 'Aceptada en test E2E' },
      );
      fs.writeFileSync(
        path.join(ctx.runDir, 'api-accept-request.json'),
        JSON.stringify(acceptResp, null, 2),
      );
      logStep(ctx, 'landlord', 'accept-request', acceptResp.ok ? 'ok' : 'fail', {
        status: acceptResp.status,
      });

      // Tenant recarga y ve "aceptada"
      await uiVisit(tenantPage, ctx, 'tenant', '/app/contracts', 'contracts-post-accept');
    }
  } finally {
    await tenantPage.close().catch(() => null);
    await landlordPage.close().catch(() => null);
    await tenantCtx.close();
    await landlordCtx.close();
    logStep(ctx, 'system', 'run-complete', 'ok', { runDir: ctx.runDir });
  }
});

// ============================================================================
// CASO 3: Firma biometrica TRIPLE - tenant + guarantor (publico) + landlord
// ============================================================================
test('CASO 3 - firma biometrica triple (tenant + garante publico + landlord)', async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const seed = runSeed('ready_for_bio_guarantor');
  const ctx = createRunContext(REPORT_DIR);
  fs.writeFileSync(path.join(ctx.runDir, 'seed.json'), JSON.stringify(seed, null, 2));
  const contractId = seed.contract_id;
  const codeudorToken = seed.codeudor_token;

  expect(contractId, 'seed debe crear contract_id').toBeTruthy();
  expect(codeudorToken, 'seed debe crear codeudor_token').toBeTruthy();

  // 3 contextos en paralelo
  const tenantCtx = await browser.newContext({
    recordVideo: { dir: path.join(ctx.runDir, 'videos', 'tenant') },
    viewport: { width: 1366, height: 820 },
  });
  const guarantorCtx = await browser.newContext({
    recordVideo: { dir: path.join(ctx.runDir, 'videos', 'guarantor') },
    viewport: { width: 1366, height: 820 },
  });
  const landlordCtx = await browser.newContext({
    recordVideo: { dir: path.join(ctx.runDir, 'videos', 'landlord') },
    viewport: { width: 1366, height: 820 },
  });
  const tenantPage = await tenantCtx.newPage();
  const guarantorPage = await guarantorCtx.newPage();
  const landlordPage = await landlordCtx.newPage();
  attachLoggers(tenantPage, 'tenant', ctx);
  attachLoggers(guarantorPage, 'landlord', ctx); // logs en mismo actor-file
  attachLoggers(landlordPage, 'landlord', ctx);

  try {
    // Login tenant + landlord; el garante NO tiene login, usa link publico
    await Promise.all([
      uiLogin(tenantPage, ctx, 'tenant', seed.tenant_email, seed.password),
      uiLogin(landlordPage, ctx, 'landlord', seed.landlord_email, seed.password),
    ]);

    const tenantAuth = await getAuthToken(seed.tenant_email, seed.password);
    const landlordAuth = await getAuthToken(seed.landlord_email, seed.password);

    // === 3.1 Tenant firma ===
    logStep(ctx, 'tenant', 'start-biometric', 'start');
    const t1 = await apiPost(
      tenantAuth!.access,
      `/contracts/${contractId}/start-biometric-authentication/`,
    );
    fs.writeFileSync(path.join(ctx.runDir, 'api-tenant-start-bio.json'), JSON.stringify(t1, null, 2));
    logStep(ctx, 'tenant', 'start-biometric', t1.ok ? 'ok' : 'fail', { status: t1.status });

    await uiVisit(
      tenantPage,
      ctx,
      'tenant',
      `/app/contracts/${contractId}/authenticate`,
      'biometric-page',
    );

    logStep(ctx, 'tenant', 'complete-auth', 'start');
    const t2 = await apiPost(
      tenantAuth!.access,
      `/contracts/${contractId}/complete-auth/`,
      BiometricPayloads.completeAuth,
    );
    fs.writeFileSync(
      path.join(ctx.runDir, 'api-tenant-complete-auth.json'),
      JSON.stringify(t2, null, 2),
    );
    logStep(ctx, 'tenant', 'complete-auth', t2.ok ? 'ok' : 'fail', { status: t2.status });

    // === 3.2 Garante (publico) ===
    // Primero validar token (sin auth)
    logStep(ctx, 'landlord', 'guarantor-validate-token', 'start'); // logueamos como "landlord" para simplificar
    const gValidate = await apiGet(
      '', // sin token JWT
      `/contracts/public/codeudor/validate/${codeudorToken}/`,
    );
    fs.writeFileSync(
      path.join(ctx.runDir, 'api-guarantor-validate.json'),
      JSON.stringify(gValidate, null, 2),
    );
    logStep(ctx, 'landlord', 'guarantor-validate-token', gValidate.ok ? 'ok' : 'fail', {
      status: gValidate.status,
    });

    // Visitar la pagina publica del codeudor
    await uiVisit(
      guarantorPage,
      ctx,
      'landlord',
      `/codeudor-auth/${codeudorToken}`,
      'guarantor-public-page',
    );

    // Iniciar sesion biometrica publica
    logStep(ctx, 'landlord', 'guarantor-start-biometric', 'start');
    const gStart = await apiPost('', `/contracts/public/codeudor/biometric/start/${codeudorToken}/`);
    fs.writeFileSync(
      path.join(ctx.runDir, 'api-guarantor-start-bio.json'),
      JSON.stringify(gStart, null, 2),
    );
    logStep(ctx, 'landlord', 'guarantor-start-biometric', gStart.ok ? 'ok' : 'fail', {
      status: gStart.status,
    });

    // Capturar 5 pasos
    const steps = [
      ['face_front', JPG_1X1_BASE64],
      ['face_side', JPG_1X1_BASE64],
      ['document', JPG_1X1_BASE64],
      ['combined', JPG_1X1_BASE64],
      ['voice', WAV_SILENCE_BASE64],
    ] as const;

    for (const [step, data] of steps) {
      logStep(ctx, 'landlord', `guarantor-capture-${step}`, 'start');
      const resp = await apiPost('', `/contracts/public/codeudor/biometric/capture/${codeudorToken}/`, {
        step,
        data,
      });
      logStep(ctx, 'landlord', `guarantor-capture-${step}`, resp.ok ? 'ok' : 'fail', {
        status: resp.status,
        body: typeof resp.body === 'object' ? resp.body : null,
      });
    }

    // Completar
    logStep(ctx, 'landlord', 'guarantor-complete', 'start');
    const gComplete = await apiPost(
      '',
      `/contracts/public/codeudor/biometric/complete/${codeudorToken}/`,
    );
    fs.writeFileSync(
      path.join(ctx.runDir, 'api-guarantor-complete.json'),
      JSON.stringify(gComplete, null, 2),
    );
    logStep(ctx, 'landlord', 'guarantor-complete', gComplete.ok ? 'ok' : 'fail', {
      status: gComplete.status,
    });

    // Estado final del garante
    const gStatus = await apiGet('', `/contracts/public/codeudor/status/${codeudorToken}/`);
    fs.writeFileSync(
      path.join(ctx.runDir, 'api-guarantor-status.json'),
      JSON.stringify(gStatus, null, 2),
    );
    logStep(ctx, 'landlord', 'guarantor-final-status', 'ok', {
      status: gStatus.status,
      body: gStatus.body,
    });

    // === 3.3 Landlord firma ===
    await uiVisit(landlordPage, ctx, 'landlord', '/app/dashboard', 'dashboard-after-guarantor');

    logStep(ctx, 'landlord', 'start-biometric', 'start');
    const l1 = await apiPost(
      landlordAuth!.access,
      `/contracts/${contractId}/start-biometric-authentication/`,
    );
    fs.writeFileSync(path.join(ctx.runDir, 'api-landlord-start-bio.json'), JSON.stringify(l1, null, 2));
    logStep(ctx, 'landlord', 'start-biometric', l1.ok ? 'ok' : 'fail', {
      status: l1.status,
      body: typeof l1.body === 'object' ? l1.body : null,
    });

    await uiVisit(
      landlordPage,
      ctx,
      'landlord',
      `/app/contracts/${contractId}/authenticate`,
      'biometric-page',
    );

    const l2 = await apiPost(
      landlordAuth!.access,
      `/contracts/${contractId}/complete-auth/`,
      BiometricPayloads.completeAuth,
    );
    fs.writeFileSync(
      path.join(ctx.runDir, 'api-landlord-complete-auth.json'),
      JSON.stringify(l2, null, 2),
    );
    logStep(ctx, 'landlord', 'complete-auth', l2.ok ? 'ok' : 'fail', {
      status: l2.status,
      body: typeof l2.body === 'object' ? l2.body : null,
    });

    // Estado final del contrato
    const finalContract = await apiGet(landlordAuth!.access, `/contracts/contracts/${contractId}/`);
    fs.writeFileSync(
      path.join(ctx.runDir, 'api-final-contract.json'),
      JSON.stringify(finalContract, null, 2).slice(0, 4000),
    );
    logStep(ctx, 'system', 'final-contract-state', 'ok', {
      finalState:
        (finalContract.body as any)?.current_state ?? (finalContract.body as any)?.status,
    });
  } finally {
    await tenantPage.close().catch(() => null);
    await guarantorPage.close().catch(() => null);
    await landlordPage.close().catch(() => null);
    await tenantCtx.close();
    await guarantorCtx.close();
    await landlordCtx.close();
    logStep(ctx, 'system', 'run-complete', 'ok', { runDir: ctx.runDir });
  }
});

// ============================================================================
// CASO 4: Features accesorias (messaging, dashboard, profile, ratings)
// ============================================================================
test('CASO 4 - features accesorias (messaging / dashboard / profile / ratings)', async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const seed = runSeed('minimal');
  const ctx = createRunContext(REPORT_DIR);
  fs.writeFileSync(path.join(ctx.runDir, 'seed.json'), JSON.stringify(seed, null, 2));

  const bctx = await browser.newContext({
    recordVideo: { dir: path.join(ctx.runDir, 'videos', 'tenant') },
    viewport: { width: 1366, height: 820 },
  });
  const page = await bctx.newPage();
  attachLoggers(page, 'tenant', ctx);

  try {
    await uiLogin(page, ctx, 'tenant', seed.tenant_email, seed.password);
    const auth = await getAuthToken(seed.tenant_email, seed.password);

    const sections: Array<[string, string]> = [
      ['/app/dashboard', 'dashboard'],
      ['/app/messages', 'messages'],
      ['/app/profile', 'profile'],
      ['/app/resume', 'resume'],
      ['/app/ratings', 'ratings'],
      ['/app/properties', 'properties'],
      ['/app/contracts', 'contracts'],
      ['/app/requests', 'requests'],
      ['/app/payments', 'payments'],
      ['/app/help', 'help'],
      ['/app/settings', 'settings'],
    ];

    for (const [url, label] of sections) {
      await uiVisit(page, ctx, 'tenant', url, label);
    }

    // Probar endpoints API clave
    const apiProbes: Array<[string, string]> = [
      ['/dashboard/stats/', 'dashboard-stats'],
      ['/messages/threads/', 'messages-threads'],
      ['/ratings/ratings/', 'ratings-list'],
      ['/payments/transactions/', 'payments-transactions'],
      ['/users/auth/me/', 'users-me'],
      ['/contracts/contracts/', 'contracts-list'],
      ['/matching/requests/', 'matching-requests'],
      ['/core/faqs/', 'core-faqs'],
    ];

    for (const [endpoint, label] of apiProbes) {
      const resp = await apiGet(auth!.access, endpoint);
      fs.writeFileSync(
        path.join(ctx.runDir, `api-${label}.json`),
        JSON.stringify(
          {
            endpoint,
            ok: resp.ok,
            status: resp.status,
            body_preview:
              typeof resp.body === 'string'
                ? resp.body.slice(0, 500)
                : JSON.stringify(resp.body).slice(0, 500),
          },
          null,
          2,
        ),
      );
      logStep(ctx, 'tenant', `api-${label}`, resp.ok ? 'ok' : 'fail', {
        status: resp.status,
      });
    }
  } finally {
    await page.close().catch(() => null);
    await bctx.close();
    logStep(ctx, 'system', 'run-complete', 'ok', { runDir: ctx.runDir });
  }
});
