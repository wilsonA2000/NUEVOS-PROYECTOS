/**
 * Auditoría E2E de botones y formularios: Profile, Settings, Resume, ResumeEdit.
 *
 * Dos casos independientes:
 *   - CASO A · landlord
 *   - CASO B · tenant
 *
 * Cada caso: login → visita cada página → ejecuta N acciones → captura
 * summary.json global con contadores ok/fail/not_found/slow y lista de
 * failures con evidencia.
 *
 * Outputs: e2e-logs/buttons/run-<timestamp>/
 */
import { test, expect, Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  Actor,
  attachLoggers,
  createRunContext,
  logStep,
  runSeed,
  snap,
  RunContext,
} from '../helpers/multi-user-logger';
import {
  AuditAction,
  AuditSummary,
  runAudit,
  writeGlobalSummary,
} from '../helpers/button-auditor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'buttons');

test.describe.configure({ mode: 'serial' });

// ============================================================================
// Helpers comunes
// ============================================================================
async function uiLogin(
  page: Page,
  ctx: RunContext,
  actor: Actor,
  email: string,
  password: string,
): Promise<void> {
  logStep(ctx, actor, 'ui-login', 'start', { email });
  await page.goto('/login');
  await page.waitForSelector('input[name="email"]', { timeout: 30000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL(/\/app\/|\/$/, { timeout: 20000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
  logStep(ctx, actor, 'ui-login', 'ok', { url: page.url() });
}

async function gotoAndWait(page: Page, urlPath: string): Promise<void> {
  await page.goto(urlPath);
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(500);
}

// ============================================================================
// Acciones para /app/profile
// ============================================================================
function buildProfileActions(actor: Actor): AuditAction[] {
  const commonActions: AuditAction[] = [
    { name: 'load-profile', selector: 'text=/perfil|profile/i', kind: 'exists' },
    {
      name: 'click-edit',
      selector: { role: 'button', name: /editar perfil/i },
      kind: 'click',
      postDelayMs: 1500,
    },
    // Tab Personal
    {
      name: 'tab-personal',
      selector: { role: 'tab', name: /personal/i },
      kind: 'tab-click',
      postDelayMs: 300,
    },
    { name: 'fill-first-name', selector: 'input[name="first_name"]', kind: 'fill', value: 'AuditUser' },
    { name: 'fill-last-name', selector: 'input[name="last_name"]', kind: 'fill', value: 'ButtonTest' },
    { name: 'fill-phone', selector: 'input[name="phone_number"]', kind: 'fill', value: '+573001234567' },
    { name: 'fill-whatsapp', selector: 'input[name="whatsapp"]', kind: 'fill', value: '+573009876543', skipIfNotFound: true },
    { name: 'fill-nationality', selector: 'input[name="nationality"]', kind: 'fill', value: 'Colombiana' },
    // family_size está en el tab Personal (común), no en Arrendatario
    { name: 'fill-family-size', selector: 'input[name="family_size"]', kind: 'fill', value: '2', skipIfNotFound: true },
    // Tab Ubicación
    {
      name: 'tab-ubicacion',
      selector: { role: 'tab', name: /ubicaci[oó]n/i },
      kind: 'tab-click',
      postDelayMs: 300,
    },
    { name: 'fill-country', selector: 'input[name="country"]', kind: 'fill', value: 'Colombia' },
    { name: 'fill-state', selector: 'input[name="state"]', kind: 'fill', value: 'Santander' },
    { name: 'fill-city', selector: 'input[name="city"]', kind: 'fill', value: 'Bucaramanga' },
    { name: 'fill-postal-code', selector: 'input[name="postal_code"]', kind: 'fill', value: '680001', skipIfNotFound: true },
    // Tab Laboral
    {
      name: 'tab-laboral',
      selector: { role: 'tab', name: /laboral/i },
      kind: 'tab-click',
      postDelayMs: 300,
    },
    { name: 'fill-employer', selector: 'input[name="employer_name"]', kind: 'fill', value: 'Empresa Test', skipIfNotFound: true },
    { name: 'fill-job-title', selector: 'input[name="job_title"]', kind: 'fill', value: 'QA Auditor', skipIfNotFound: true },
    { name: 'fill-monthly-income', selector: 'input[name="monthly_income"]', kind: 'fill', value: '3500000', skipIfNotFound: true },
  ];

  // Tab role-specific
  if (actor === 'landlord') {
    commonActions.push(
      {
        name: 'tab-arrendador',
        selector: { role: 'tab', name: /arrendador/i },
        kind: 'tab-click',
        skipIfNotFound: true,
        postDelayMs: 300,
      },
      { name: 'fill-company-name', selector: 'input[name="company_name"]', kind: 'fill', value: 'VeriHome Test', skipIfNotFound: true },
      { name: 'fill-total-properties', selector: 'input[name="total_properties"]', kind: 'fill', value: '3', skipIfNotFound: true },
      { name: 'fill-years-experience', selector: 'input[name="years_experience"]', kind: 'fill', value: '5', skipIfNotFound: true },
    );
  } else {
    commonActions.push(
      {
        name: 'tab-arrendatario',
        selector: { role: 'tab', name: /arrendatario/i },
        kind: 'tab-click',
        skipIfNotFound: true,
        postDelayMs: 300,
      },
      // budget_range y move_in_date son los campos reales del tab Arrendatario
      { name: 'fill-move-in-date', selector: 'input[name="move_in_date"]', kind: 'fill', value: '2026-06-01', skipIfNotFound: true },
    );
  }

  // Guardar cambios + validar API · botón dice "Guardar (N campos)"
  commonActions.push({
    name: 'save-profile',
    selector: { role: 'button', name: /^guardar(\s|$)/i },
    kind: 'click',
    expectedApi: { method: 'PATCH', pathMatch: /\/users\/profile\/$/, timeoutMs: 15000 },
    postDelayMs: 1500,
  });

  return commonActions;
}

// ============================================================================
// Acciones para /app/settings
// ============================================================================
function buildSettingsActions(): AuditAction[] {
  // Settings usa react-hook-form Controller con Switch MUI sin name en DOM.
  // Los Switches se identifican por el label de FormControlLabel.
  return [
    { name: 'load-settings', selector: 'text=/ajustes|configuraci[oó]n|settings/i', kind: 'exists' },
    // Switches por label (toggle alterna el estado)
    {
      name: 'toggle-email-notifications',
      selector: { role: 'checkbox', name: /notificaciones por email/i },
      kind: 'toggle',
      skipIfNotFound: true,
    },
    {
      name: 'toggle-sms-notifications',
      selector: { role: 'checkbox', name: /notificaciones por sms/i },
      kind: 'toggle',
      skipIfNotFound: true,
    },
    {
      name: 'toggle-newsletter',
      selector: { role: 'checkbox', name: /^newsletter$/i },
      kind: 'toggle',
      skipIfNotFound: true,
    },
    {
      name: 'toggle-property-alerts',
      selector: { role: 'checkbox', name: /alertas de propiedades/i },
      kind: 'toggle',
      skipIfNotFound: true,
    },
    {
      name: 'toggle-message-notifications',
      selector: { role: 'checkbox', name: /notificaciones de mensajes/i },
      kind: 'toggle',
      skipIfNotFound: true,
    },
    {
      name: 'toggle-payment-reminders',
      selector: { role: 'checkbox', name: /recordatorios de pagos/i },
      kind: 'toggle',
      skipIfNotFound: true,
    },
    // El accordion "Seguridad" no está expandido por defecto; click para abrirlo
    {
      name: 'expand-security-accordion',
      selector: { role: 'button', name: /^seguridad$/i },
      kind: 'click',
      skipIfNotFound: true,
      postDelayMs: 500,
    },
    {
      name: 'toggle-2fa',
      selector: { role: 'checkbox', name: /autenticaci[oó]n de dos factores|2fa/i },
      kind: 'toggle',
      skipIfNotFound: true,
    },
    {
      name: 'toggle-login-notifications',
      selector: { role: 'checkbox', name: /notificaciones de inicio de sesi[oó]n/i },
      kind: 'toggle',
      skipIfNotFound: true,
    },
    // Guardar ajustes + validar API
    {
      name: 'save-settings',
      selector: { role: 'button', name: /guardar ajustes|guardar cambios|^guardar$/i },
      kind: 'click',
      expectedApi: { method: 'PUT', pathMatch: /\/users\/settings\/$/, timeoutMs: 15000 },
      postDelayMs: 1500,
    },
  ];
}

// ============================================================================
// Acciones para /app/resume
// ============================================================================
function buildResumeActions(): AuditAction[] {
  return [
    { name: 'load-resume', selector: 'text=/hoja de vida|resume/i', kind: 'exists' },
    // El botón puede ser "Editar" o "Crear Hoja de Vida" según exista o no
    {
      name: 'edit-or-create',
      selector: { role: 'button', name: /editar|crear hoja/i },
      kind: 'click',
      postDelayMs: 1500,
    },
  ];
}

// ============================================================================
// Acciones para /app/resume/edit
// ============================================================================
function buildResumeEditActions(): AuditAction[] {
  // ResumeEdit usa MUI TextField con label visible (no name en DOM).
  // Usar getByLabel para cada campo.
  return [
    { name: 'load-resume-edit', selector: 'text=/hoja de vida|resume/i', kind: 'exists' },
    // Personal
    { name: 'fill-date-of-birth', selector: { label: /fecha de nacimiento/i }, kind: 'fill', value: '1990-01-15', skipIfNotFound: true },
    { name: 'fill-nationality-resume', selector: { label: /^nacionalidad$/i }, kind: 'fill', value: 'Colombiana', skipIfNotFound: true },
    { name: 'fill-marital-status', selector: { label: /estado civil/i }, kind: 'fill', value: 'Soltero', skipIfNotFound: true },
    { name: 'fill-dependents', selector: { label: /n[uú]mero de dependientes/i }, kind: 'fill', value: '0', skipIfNotFound: true },
    // Educativa
    { name: 'fill-institution', selector: { label: /^instituci[oó]n$/i }, kind: 'fill', value: 'Universidad Test', skipIfNotFound: true },
    { name: 'fill-field-of-study', selector: { label: /campo de estudio/i }, kind: 'fill', value: 'Ingeniería', skipIfNotFound: true },
    { name: 'fill-graduation-year', selector: { label: /a[ñn]o de graduaci[oó]n/i }, kind: 'fill', value: '2015', skipIfNotFound: true },
    // Laboral
    { name: 'fill-current-employer', selector: { label: /empleador actual/i }, kind: 'fill', value: 'Empresa Test E2E', skipIfNotFound: true },
    { name: 'fill-current-position', selector: { label: /cargo actual/i }, kind: 'fill', value: 'QA Engineer', skipIfNotFound: true },
    { name: 'fill-monthly-salary', selector: { label: /salario mensual/i }, kind: 'fill', value: '4000000', skipIfNotFound: true },
    { name: 'fill-supervisor-name', selector: { label: /nombre del supervisor/i }, kind: 'fill', value: 'Sup Test', skipIfNotFound: true },
    { name: 'fill-supervisor-phone', selector: { label: /tel[eé]fono del supervisor/i }, kind: 'fill', value: '+573001112233', skipIfNotFound: true },
    { name: 'fill-supervisor-email', selector: { label: /email del supervisor/i }, kind: 'fill', value: 'sup@test.com', skipIfNotFound: true },
    // Financiera
    { name: 'fill-bank-name', selector: { label: /banco|nombre del banco/i }, kind: 'fill', value: 'Bancolombia', skipIfNotFound: true },
    { name: 'fill-account-type', selector: { label: /tipo de cuenta/i }, kind: 'fill', value: 'Ahorros', skipIfNotFound: true },
    { name: 'fill-monthly-expenses', selector: { label: /gastos mensuales/i }, kind: 'fill', value: '1500000', skipIfNotFound: true },
    // Emergencia: labels reales en ResumeEdit.tsx:605,613,622
    { name: 'fill-emergency-name', selector: { label: /^nombre del contacto$/i }, kind: 'fill', value: 'Madre E2E', skipIfNotFound: true },
    // "Teléfono" y "Relación" están duplicados (Emergencia + 2 Referencias),
    // usamos el primero (Emergencia aparece antes en el DOM)
    { name: 'fill-emergency-phone', selector: { label: /^tel[eé]fono$/i }, kind: 'fill', value: '+573004445566', skipIfNotFound: true },
    { name: 'fill-emergency-relation', selector: { label: /^relaci[oó]n$/i }, kind: 'fill', value: 'Madre', skipIfNotFound: true },
    // Referencias · sección "Referencia Personal" (subtítulo en la misma Card)
    // Los TextField dentro tienen labels genéricos "Nombre", "Email", "Teléfono", "Relación"
    // Usamos .first() en el helper; Playwright selecciona el primer match.
    // Para Ref1, los labels aparecen DESPUÉS de emergency, así que .first() ya lo tomó.
    // Usamos labels exactos (los genéricos duplicados) y confiamos en orden DOM.
    { name: 'fill-ref1-name', selector: { label: /^nombre$/i }, kind: 'fill', value: 'Ref 1 E2E', skipIfNotFound: true },
    { name: 'fill-ref1-email', selector: { label: /^email$/i }, kind: 'fill', value: 'ref1@test.com', skipIfNotFound: true },
    // Guardar
    {
      name: 'save-resume',
      selector: { role: 'button', name: /guardar cambios|^guardar$/i },
      kind: 'click',
      // Resume puede ser PUT si existe o POST si crea; aceptamos cualquier método
      expectedApi: { method: 'PUT', pathMatch: /\/users\/resume\/$/, timeoutMs: 15000 },
      postDelayMs: 1500,
      skipIfNotFound: true,
    },
  ];
}

// ============================================================================
// Casos de prueba
// ============================================================================
async function runButtonAudit(browser: any, actor: Actor, email: string, password: string) {
  const ctx = createRunContext(REPORT_DIR);
  fs.writeFileSync(
    path.join(ctx.runDir, 'env.json'),
    JSON.stringify({ actor, email, ts: new Date().toISOString() }, null, 2),
  );

  const bctx = await browser.newContext({
    recordVideo: { dir: path.join(ctx.runDir, 'videos', actor) },
    viewport: { width: 1366, height: 820 },
    permissions: ['camera', 'microphone'],
  });
  const page = await bctx.newPage();
  attachLoggers(page, actor, ctx);

  const summaries: AuditSummary[] = [];

  try {
    await uiLogin(page, ctx, actor, email, password);

    // === Profile ===
    await gotoAndWait(page, '/app/profile');
    await snap(page, ctx, actor, 'profile-loaded');
    summaries.push(
      await runAudit(page, ctx, actor, 'profile', buildProfileActions(actor)),
    );

    // === Settings ===
    await gotoAndWait(page, '/app/settings');
    await snap(page, ctx, actor, 'settings-loaded');
    summaries.push(
      await runAudit(page, ctx, actor, 'settings', buildSettingsActions()),
    );

    // === Resume (display) ===
    await gotoAndWait(page, '/app/resume');
    await snap(page, ctx, actor, 'resume-loaded');
    summaries.push(
      await runAudit(page, ctx, actor, 'resume', buildResumeActions()),
    );

    // === Resume Edit ===
    // (el click anterior ya nos pudo haber llevado aquí; forzar gotoAndWait)
    await gotoAndWait(page, '/app/resume/edit');
    await snap(page, ctx, actor, 'resume-edit-loaded');
    summaries.push(
      await runAudit(page, ctx, actor, 'resume-edit', buildResumeEditActions()),
    );

    writeGlobalSummary(ctx, actor, summaries);
  } finally {
    await page.close({ runBeforeUnload: false }).catch(() => null);
    await bctx.close();
    logStep(ctx, 'system', 'run-complete', 'ok', {
      runDir: ctx.runDir,
      totals: summaries.reduce(
        (acc, s) => ({
          total: acc.total + s.total,
          ok: acc.ok + s.ok,
          fail: acc.fail + s.fail,
          not_found: acc.not_found + s.not_found,
        }),
        { total: 0, ok: 0, fail: 0, not_found: 0 },
      ),
    });
  }
}

test('CASO A - landlord: audita botones de perfil/ajustes/resume', async ({ browser }) => {
  test.setTimeout(300_000);
  const seed = runSeed('minimal');
  await runButtonAudit(browser, 'landlord', seed.landlord_email, seed.password);
});

test('CASO B - tenant: audita botones de perfil/ajustes/resume', async ({ browser }) => {
  test.setTimeout(300_000);
  const seed = runSeed('minimal');
  await runButtonAudit(browser, 'tenant', seed.tenant_email, seed.password);
});
