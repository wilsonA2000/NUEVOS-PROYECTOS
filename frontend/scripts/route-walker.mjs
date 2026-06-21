// Smoke ESTRICTO de navegador (Chromium headless). Loguea y recorre las rutas
// públicas + /app/*, y FALLA (exit 1) si alguna ruta tiene:
//   - #root vacío (white screen)
//   - error de consola / pageerror
//   - respuesta 4xx/5xx inesperada (fuera del allowlist)
// Detecta white-screens, crashes y mismatches API que build/jest no ven.
// Uso: BASE_URL=http://localhost node scripts/route-walker.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost';
const OUT = '/tmp/vh-shots';
mkdirSync(OUT, { recursive: true });

// 4xx/5xx aceptables (comportamiento por diseño, no bugs):
//  - onboarding/me 404 = "el usuario no tiene onboarding" (manejado -> null)
const ALLOW_4XX = [/\/verification\/onboarding\/me\//];

const PUBLIC = [
  ['home', '/'],
  ['login', '/login'],
  ['register', '/register'],
];
const APP = [
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

const visit = async (name, path) => {
  const issues = [];
  const onConsole = m => {
    if (m.type() !== 'error') return;
    // "Failed to load resource" = ruido de red, ya cubierto (con allowlist)
    // por el handler de respuestas. Aquí solo errores JS reales.
    if (/Failed to load resource/i.test(m.text())) return;
    issues.push('console: ' + m.text());
  };
  const onPageErr = e => issues.push('pageerror: ' + String(e));
  const onResp = r => {
    if (r.status() >= 400 && !ALLOW_4XX.some(re => re.test(r.url())))
      issues.push(`${r.status()} ${r.url().replace(BASE, '')}`);
  };
  page.on('console', onConsole);
  page.on('pageerror', onPageErr);
  page.on('response', onResp);
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(1500);
    const kids = await page.evaluate(() => document.getElementById('root')?.childElementCount ?? -1);
    if (kids <= 0) issues.push('white-screen (#root vacío)');
    await page.screenshot({ path: `${OUT}/r-${name}.png` });
  } catch (e) {
    issues.push('nav-fail: ' + String(e).slice(0, 100));
  }
  page.off('console', onConsole);
  page.off('pageerror', onPageErr);
  page.off('response', onResp);
  return issues;
};

const report = [];

// públicas
for (const [name, path] of PUBLIC) report.push([name, await visit(name, path)]);

// login
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 });
await page.locator('input[type="email"], input[name="email"]').first().fill('admin@verihome.local');
await page.locator('input[type="password"]').first().fill('AdminLocal2026');
await page.locator('button[type="submit"], button:has-text("Iniciar")').first().click();
await page.waitForURL('**/app/**', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);

// autenticadas
for (const [name, path] of APP) report.push([name, await visit(name, path)]);

await browser.close();

console.log('\n=== SMOKE ESTRICTO ===');
let failed = 0;
for (const [name, issues] of report) {
  if (issues.length === 0) {
    console.log('OK  ' + name);
  } else {
    failed++;
    console.log('FAIL ' + name);
    issues.slice(0, 6).forEach(i => console.log('     - ' + i.slice(0, 160)));
  }
}
console.log(`\n${report.length - failed}/${report.length} rutas limpias.`);
if (failed > 0) {
  console.error(`SMOKE FALLÓ: ${failed} ruta(s) con problemas.`);
  process.exit(1);
}
console.log('SMOKE OK.');
