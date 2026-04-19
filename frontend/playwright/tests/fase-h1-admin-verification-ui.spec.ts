/**
 * Fase H1 - Admin Verification Dashboard (UI real).
 *
 * Complementa Fase C1 (API pura) con interacción UI real: admin
 * loguea, navega a /app/admin/verification, ve la visita del seed,
 * asigna agente desde el modal, y verifica que el estado se
 * actualiza en la tabla.
 *
 * Seed: `verification_ready` (ya genera Agent profile + visita
 * pending). Si el seed cambia, el resto del test se adapta por
 * texto, no por índices.
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  attachLoggers,
  createRunContext,
  getAuthToken,
  logStep,
  runSeed,
  snap,
} from '../helpers/multi-user-logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-h');

test.describe.configure({ mode: 'serial' });

/** Login programático: setea token en localStorage sin pasar por /login. */
async function loginViaLocalStorage(
  context: BrowserContext,
  page: Page,
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ access, refresh }) => {
      window.localStorage.setItem('access_token', access);
      window.localStorage.setItem('refresh_token', refresh);
    },
    { access: accessToken, refresh: refreshToken },
  );
}

test('Fase H1 · admin navega a /app/admin/verification, ve visita pending y asigna agente', async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('verification_ready');
  logStep(ctx, 'system', 'seed', 'ok', {
    visit_id: seed.visit_id,
    agent_profile_id: seed.agent_profile_id,
  });

  const adminAuth = await getAuthToken(seed.admin_email, seed.password);
  expect(adminAuth, 'admin login').toBeTruthy();

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  attachLoggers(page, 'admin', ctx);

  await loginViaLocalStorage(context, page, adminAuth!.access, adminAuth!.refresh);

  logStep(ctx, 'admin', 'goto-verification', 'start');
  await page.goto('/app/admin/verification', { waitUntil: 'networkidle' });
  await snap(page, ctx, 'admin', 'verification-landing');

  // Esperar a que cargue el dashboard (título o tab "Agentes").
  await expect(page.getByText(/Gestión de Agentes/i)).toBeVisible({ timeout: 20000 });

  // Cambiar a la tab "Visitas Programadas".
  logStep(ctx, 'admin', 'switch-tab-visitas', 'start');
  await page.getByRole('tab', { name: /Visitas Programadas/i }).click();
  await snap(page, ctx, 'admin', 'visitas-tab');

  // Verificar que la visita del seed está listada por visit_number.
  // El seed genera un visit_number tipo "VIS-2026-XXXXX". Esperamos por
  // el texto de esa tabla.
  await expect(page.getByText(/VIS-\d{4}-\d{5}/).first()).toBeVisible({
    timeout: 20000,
  });
  logStep(ctx, 'admin', 'visit-row-visible', 'ok');

  // Click en "Asignar" del row pending (sólo hay uno gracias al seed).
  const assignButtons = page.getByRole('button', { name: /^Asignar$/ });
  await expect(assignButtons.first()).toBeVisible({ timeout: 10000 });
  await assignButtons.first().click();
  await snap(page, ctx, 'admin', 'assign-dialog');

  // Dialog open: seleccionar agente.
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // El select está dentro del dialog
  await dialog.getByLabel(/Agente disponible/i).click();
  // Elegir el primer item de la lista desplegable.
  const firstOption = page.getByRole('option').first();
  await expect(firstOption).toBeVisible({ timeout: 8000 });
  await firstOption.click();
  await snap(page, ctx, 'admin', 'agent-selected');

  // Confirmar.
  await dialog.getByRole('button', { name: /Confirmar/i }).click();
  logStep(ctx, 'admin', 'assign-submit', 'ok');

  // Tras la asignación, la visita debería cambiar de estado en la
  // tabla (ya no aparece "Asignar" en esa fila). Esperamos a que
  // desaparezca el primer botón Asignar o que aparezca "Iniciar".
  await expect(async () => {
    const visible = await assignButtons.first().isVisible().catch(() => false);
    if (visible) {
      throw new Error('Asignar sigue visible — el estado no cambió');
    }
  }).toPass({ timeout: 15000 });

  await snap(page, ctx, 'admin', 'post-assign');
  logStep(ctx, 'admin', 'state-updated', 'ok');
});
