// Walker de rutas autenticadas con Chromium headless. Loguea una vez y visita
// cada ruta /app/*, reportando: #root montado, errores de consola/página, y
// screenshot por ruta. Detecta white-screens / crashes que el build no ve.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost';
const OUT = '/tmp/vh-shots';
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ['dashboard', '/app/dashboard'],
  ['properties', '/app/properties'],
  ['contracts', '/app/contracts'],
  ['payments', '/app/payments'],
  ['messages', '/app/messages'],
  ['services', '/app/services'],
  ['service-requests', '/app/service-requests'],
  ['ratings', '/app/ratings'],
  ['verihome-id', '/app/verihome-id'],
  ['profile', '/app/profile'],
  ['maintenance', '/app/maintenance'],
  ['admin', '/app/admin'],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

// --- login ---
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 });
await page.locator('input[type="email"], input[name="email"]').first().fill('admin@verihome.local');
await page.locator('input[type="password"]').first().fill('AdminLocal2026');
await page.locator('button[type="submit"], button:has-text("Iniciar")').first().click();
await page.waitForURL('**/app/**', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2000);

const results = [];
for (const [name, path] of ROUTES) {
  const errs = [];
  const onConsole = m => m.type() === 'error' && errs.push(m.text());
  const onPageErr = e => errs.push('PAGEERROR: ' + String(e));
  page.on('console', onConsole);
  page.on('pageerror', onPageErr);
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(1800);
    const kids = await page.evaluate(() => document.getElementById('root')?.childElementCount ?? -1);
    const txtLen = await page.evaluate(() => (document.body.innerText || '').trim().length);
    await page.screenshot({ path: `${OUT}/r-${name}.png` });
    results.push({ name, path, kids, txtLen, errs: errs.length, sample: errs[0]?.slice(0, 120) || '' });
  } catch (e) {
    results.push({ name, path, kids: 'NAV-FAIL', txtLen: 0, errs: errs.length, sample: String(e).slice(0, 120) });
  }
  page.off('console', onConsole);
  page.off('pageerror', onPageErr);
}

console.log('\n=== RESULTADO WALKER ===');
console.log('ruta'.padEnd(18), 'root'.padEnd(6), 'texto'.padEnd(7), 'errs');
for (const r of results) {
  const flag = (r.kids > 0 && r.errs === 0 && r.txtLen > 30) ? 'OK ' : '⚠️ ';
  console.log(flag + r.name.padEnd(15), String(r.kids).padEnd(6), String(r.txtLen).padEnd(7), r.errs, r.sample);
}
await browser.close();
