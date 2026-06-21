// Escaneo de accesibilidad (axe-core) sobre páginas clave. Reporta violaciones
// agrupadas por impacto. No falla el build (informativo) salvo violaciones
// 'critical'. Uso: BASE_URL=http://localhost node scripts/a11y-scan.mjs
import { chromium } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

const BASE = process.env.BASE_URL || 'http://localhost';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await context.newPage();

const scan = async label => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  const top = [];
  for (const v of results.violations) {
    byImpact[v.impact] = (byImpact[v.impact] || 0) + v.nodes.length;
    top.push(`${v.impact}: ${v.id} (${v.nodes.length}) - ${v.help}`);
  }
  console.log(`\n### ${label}`);
  console.log(`   crit=${byImpact.critical} serious=${byImpact.serious} moderate=${byImpact.moderate} minor=${byImpact.minor}`);
  top.slice(0, 8).forEach(t => console.log('   - ' + t.slice(0, 150)));
  return byImpact;
};

const totals = { critical: 0, serious: 0, moderate: 0, minor: 0 };
const add = b => Object.keys(totals).forEach(k => (totals[k] += b[k] || 0));

// públicas
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1200);
add(await scan('login'));
await page.goto(BASE + '/register', { waitUntil: 'networkidle', timeout: 25000 });
await page.waitForTimeout(1200);
add(await scan('register'));

// login
await page.locator('input[type="email"]').first().fill('admin@verihome.local').catch(() => {});
await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
await page.locator('input[type="email"]').first().fill('admin@verihome.local');
await page.locator('input[type="password"]').first().fill('AdminLocal2026');
await page.locator('button[type="submit"], button:has-text("Iniciar")').first().click();
await page.waitForURL('**/app/**', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);

for (const [label, path] of [
  ['dashboard', '/app/dashboard'],
  ['properties', '/app/properties'],
  ['contracts', '/app/contracts'],
  ['payments', '/app/payments'],
]) {
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForTimeout(1500);
  add(await scan(label));
}

await browser.close();
console.log('\n=== TOTALES a11y ===');
console.log(totals);
