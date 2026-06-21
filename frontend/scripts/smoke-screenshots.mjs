// Smoke visual con Chromium headless (Playwright). Carga la app prod-local,
// hace login y captura screenshots para verificación visual. Throwaway.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost';
const OUT = '/tmp/vh-shots';
mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log('[smoke]', ...a);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
page.on('console', m => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', e => errors.push(String(e)));

try {
  // 1) Landing / login público
  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  log('login title:', await page.title());
  await page.screenshot({ path: OUT + '/1-login.png', fullPage: false });

  // 2) Login con admin local
  // Campos típicos email/password — usar selectores robustos.
  const email = page.locator('input[type="email"], input[name="email"]').first();
  const pass = page.locator('input[type="password"]').first();
  await email.fill('admin@verihome.local');
  await pass.fill('AdminLocal2026');
  await page.screenshot({ path: OUT + '/2-login-filled.png' });
  await page.locator('button[type="submit"], button:has-text("Iniciar")').first().click();

  // 3) Esperar navegación a la app
  await page.waitForTimeout(3500);
  log('post-login url:', page.url());
  await page.screenshot({ path: OUT + '/3-after-login.png', fullPage: false });

  // 4) Dashboard (si redirigió a /app)
  if (!page.url().includes('/app')) {
    await page.goto(BASE + '/app/dashboard', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }
  await page.screenshot({ path: OUT + '/4-dashboard.png', fullPage: false });

  log('console errors:', errors.length);
  errors.slice(0, 8).forEach(e => log('  err:', e.slice(0, 140)));
} catch (e) {
  log('FALLO:', String(e).slice(0, 300));
  await page.screenshot({ path: OUT + '/error.png' }).catch(() => {});
} finally {
  await browser.close();
  log('screenshots en', OUT);
}
