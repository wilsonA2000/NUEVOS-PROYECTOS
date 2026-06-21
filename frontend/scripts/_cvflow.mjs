import { chromium } from '@playwright/test';
const log = (...a) => console.log(...a);
const b = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const ctx = await b.newContext({ permissions: ['camera'], viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
p.setDefaultTimeout(8000);
const errs = [], bad = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 150)); });
p.on('pageerror', e => errs.push('PAGEERR:' + String(e).slice(0, 220)));
p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().split('/').slice(3).join('/').slice(0, 70)); });
try {
  await p.goto('http://localhost/login', { waitUntil: 'networkidle' });
  await p.locator('input[type="email"]').first().fill('admin@verihome.local');
  await p.locator('input[type="password"]').first().fill('VeriHome2026!');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForURL('**/app/**', { timeout: 20000 }).catch(() => log('no redirect'));
  log('logged in');
  await p.goto('http://localhost/app/verihome-id/onboarding', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  const inputs = p.locator('.MuiInputBase-input');
  log('inputs:', await inputs.count());
  await inputs.nth(1).fill('1098765432').catch(() => log('fill1 fail'));
  await inputs.nth(2).fill('Juan Perez Gomez').catch(() => log('fill2 fail'));
  await p.waitForTimeout(300);
  await p.locator('button:has-text("Continuar")').first().click().catch(() => log('continuar fail'));
  log('--> Continuar clickeado');
  for (const ms of [2000, 3000, 5000, 8000]) {
    await p.waitForTimeout(ms);
    const s = await p.evaluate(() => ({ cv: typeof window.cv, mat: !!(window.cv && window.cv.Mat), vid: !!document.querySelector('video'), carg: document.body.innerText.includes('Cargando motor') }));
    log(`  cv=${s.cv} mat=${s.mat} video=${s.vid} cargandoMotor=${s.carg}`);
  }
  await p.screenshot({ path: '/tmp/vh_final.png' });
  log('4xx/5xx:', [...new Set(bad)].join(' | ') || '(ninguno)');
  log('errores:', [...new Set(errs)].join(' | ') || '(ninguno)');
} catch (e) { log('SCRIPT ERROR:', String(e).slice(0, 200)); }
await b.close();
log('DONE');
