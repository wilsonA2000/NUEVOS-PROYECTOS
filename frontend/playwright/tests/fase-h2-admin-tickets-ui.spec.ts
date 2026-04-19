/**
 * Fase H2 - Admin Tickets Dashboard (UI real).
 *
 * El seed `ticket_ready` crea un SupportTicket abierto. El test:
 *   1. Login admin via localStorage.
 *   2. Navega a /app/admin/tickets.
 *   3. Ve el ticket en la tabla.
 *   4. Lo abre (click en "Ver detalles" / el subject).
 *   5. Responde via formulario.
 *   6. Marca como resuelto.
 *   7. Verifica que el badge de estado cambia a "Resuelto".
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

test('Fase H2 · admin ve ticket, responde y resuelve desde la UI', async ({ browser }) => {
  test.setTimeout(180_000);
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('ticket_ready');
  logStep(ctx, 'system', 'seed', 'ok', { ticket_id: seed.ticket_id });

  const adminAuth = await getAuthToken(seed.admin_email, seed.password);
  expect(adminAuth).toBeTruthy();

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  attachLoggers(page, 'admin', ctx);
  await loginViaLocalStorage(context, page, adminAuth!.access, adminAuth!.refresh);

  logStep(ctx, 'admin', 'goto-tickets', 'start');
  await page.goto('/app/admin/tickets', { waitUntil: 'networkidle' });
  await snap(page, ctx, 'admin', 'tickets-landing');

  // Esperar tabla cargada — el subject del seed debe aparecer.
  await expect(page.getByText(/E2E · Error al generar PDF/)).toBeVisible({ timeout: 20000 });
  logStep(ctx, 'admin', 'ticket-row-visible', 'ok');

  // Abrir el ticket: clic en el subject (o botón ver detalles). El
  // dashboard usa `onClick` en la fila. Usamos el texto.
  await page.getByText(/E2E · Error al generar PDF/).click();
  await snap(page, ctx, 'admin', 'ticket-detail');

  // Escribir respuesta.
  const textarea = page.getByRole('textbox', { name: /respuesta|mensaje|respond/i })
    .or(page.locator('textarea').first());
  await expect(textarea).toBeVisible({ timeout: 10000 });
  await textarea.fill(
    'Gracias por reportarlo. Ya localizamos el problema y estamos aplicando el fix. '
      + 'Recibirás confirmación cuando esté resuelto.',
  );

  // Click en "Responder".
  const respondBtn = page.getByRole('button', { name: /responder|enviar/i }).first();
  await respondBtn.click();
  logStep(ctx, 'admin', 'respond-submit', 'ok');
  await snap(page, ctx, 'admin', 'post-respond');

  // Esperar confirmación (el dialog puede mostrar un toast o actualizar
  // la lista de respuestas).
  await page.waitForTimeout(1500);

  // Click en "Resolver" (dentro del dialog o en la tabla tras cerrar).
  const resolveBtn = page.getByRole('button', { name: /resolver/i }).first();
  await expect(resolveBtn).toBeVisible({ timeout: 10000 });
  await resolveBtn.click();
  logStep(ctx, 'admin', 'resolve-click', 'ok');
  await snap(page, ctx, 'admin', 'resolved');

  // Validar que en la tabla el badge ahora es "Resuelto" / similar.
  // Puede requerir cerrar el dialog primero.
  await expect(
    page.getByText(/resuelto|resolved/i).first(),
  ).toBeVisible({ timeout: 15000 });
  logStep(ctx, 'admin', 'status-resolved-visible', 'ok');
});
