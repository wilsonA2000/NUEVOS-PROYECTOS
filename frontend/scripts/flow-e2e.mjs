// E2E de flujo CON DATOS (build prod). Loguea como admin (arrendador) y recorre
// rutas data-driven: lista de propiedades (con ítem), detalle, y formulario de
// contrato. Captura errores JS/red por paso. Donde viven los bugs reales.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost';
const PROP_ID = process.env.PROP_ID || '';
const OUT = '/tmp/vh-shots';
mkdirSync(OUT, { recursive: true });
const ALLOW = [/\/verification\/onboarding\/me\//];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

const steps = [];
let cur = [];
const onConsole = m => {
  if (m.type() !== 'error') return;
  if (/Failed to load resource/i.test(m.text())) return;
  cur.push('console: ' + m.text().slice(0, 160));
};
const onPageErr = e => cur.push('pageerror: ' + String(e).slice(0, 160));
const onResp = r => {
  if (r.status() >= 400 && !ALLOW.some(re => re.test(r.url())))
    cur.push(`${r.status()} ${r.url().replace(BASE, '')}`);
};
page.on('console', onConsole);
page.on('pageerror', onPageErr);
page.on('response', onResp);

const step = async (name, fn) => {
  cur = [];
  try {
    await fn();
    await page.waitForTimeout(1500);
  } catch (e) {
    cur.push('step-fail: ' + String(e).slice(0, 160));
  }
  const kids = await page.evaluate(() => document.getElementById('root')?.childElementCount ?? -1).catch(() => -1);
  if (kids <= 0) cur.push('white-screen');
  await page.screenshot({ path: `${OUT}/f-${name}.png` }).catch(() => {});
  steps.push([name, [...cur]]);
};

// login
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 });
await page.locator('input[type="email"]').first().fill('admin@verihome.local');
await page.locator('input[type="password"]').first().fill('AdminLocal2026');
await page.locator('button[type="submit"], button:has-text("Iniciar")').first().click();
await page.waitForURL('**/app/**', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);

await step('properties-list', () => page.goto(BASE + '/app/properties', { waitUntil: 'networkidle', timeout: 25000 }));
// ¿aparece la propiedad sembrada?
const propVisible = await page.locator('text=Apto Demo E2E').count().catch(() => 0);

if (PROP_ID) {
  await step('property-detail', () => page.goto(`${BASE}/app/properties/${PROP_ID}`, { waitUntil: 'networkidle', timeout: 25000 }));
}
await step('contract-new', () => page.goto(BASE + '/app/contracts/new', { waitUntil: 'networkidle', timeout: 25000 }));
await step('property-new-form', () => page.goto(BASE + '/app/properties/new', { waitUntil: 'networkidle', timeout: 25000 }));

await browser.close();

console.log('\n=== E2E FLUJO (con datos) ===');
console.log('Propiedad sembrada visible en lista:', propVisible > 0 ? 'SÍ' : 'NO');
let failed = 0;
for (const [name, issues] of steps) {
  if (issues.length === 0) console.log('OK  ' + name);
  else { failed++; console.log('FAIL ' + name); issues.slice(0, 6).forEach(i => console.log('     - ' + i)); }
}
console.log(`\n${steps.length - failed}/${steps.length} pasos limpios.`);
process.exit(failed > 0 ? 1 : 0);
