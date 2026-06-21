import { chromium } from '@playwright/test';
const b = await chromium.launch({ args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'] });
const ctx = await b.newContext({ permissions:['camera'], viewport:{width:1280,height:900} });
const p = await ctx.newPage();
const errs=[]; const bad=[];
p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,150));});
p.on('pageerror',e=>errs.push('PAGEERR:'+String(e).slice(0,220)));
p.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url().slice(0,95));});
await p.goto('http://localhost/login',{waitUntil:'networkidle'});
await p.locator('input[type="email"]').first().fill('admin@verihome.local');
await p.locator('input[type="password"]').first().fill('VeriHome2026!');
await p.locator('button[type="submit"]').first().click();
await p.waitForURL('**/app/**',{timeout:20000}).catch(()=>{});
await p.goto('http://localhost/app/verihome-id/onboarding',{waitUntil:'networkidle'});
await p.waitForTimeout(1500);
await p.getByLabel(/Número de documento/i).fill('1098765432').catch(()=>{});
await p.getByLabel(/Nombre completo/i).fill('Juan Perez Gomez').catch(()=>{});
await p.waitForTimeout(300);
await p.locator('button:has-text("Continuar")').first().click().catch(()=>{});
console.log('--> Continuar clickeado. Monitoreando opencv:');
const poll = async (label) => {
  const s = await p.evaluate(()=>({cv:typeof window.cv, mat:!!(window.cv&&window.cv.Mat), vid:!!document.querySelector('video'), carg:document.body.innerText.includes('Cargando motor')}));
  console.log(`  [${label}] cv=${s.cv} mat=${s.mat} video=${s.vid} cargandoMotor=${s.carg}`);
};
for (const t of ['+2s','+4s','+7s','+12s','+18s']) { await p.waitForTimeout(t==='+2s'?2000:t==='+4s'?2000:t==='+7s'?3000:t==='+12s'?5000:6000); await poll(t); }
await p.screenshot({path:'/tmp/vh_final.png'});
console.log('4xx/5xx:', bad.length?('\n  '+[...new Set(bad)].join('\n  ')):'(ninguno)');
console.log('errores consola:', errs.length?('\n  '+[...new Set(errs)].join('\n  ')):'(ninguno)');
await b.close();
