// Detector de sobreingeniería / cruft (read-only). Mapea, sin borrar:
//   1) Componentes/páginas HUÉRFANOS (0 imports no-test) -> candidatos a borrar.
//   2) Archivos grandes (>700 líneas) -> monolitos.
//   3) Nombres "versionados" (Enhanced/Simple/Optimized/Modern/New/V2/Legacy).
//   4) Conteo de `any`.
// Es el "gate" de la metodología de auditoría: úsalo antes de cada limpieza.
// Uso: node scripts/detect-cruft.mjs   (desde frontend/)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const SRC = 'src';
const exts = new Set(['.ts', '.tsx']);
const VERSIONED = /(Enhanced|Simple|Professional|Optimized|Modern|Legacy|V2|^New|Old)/;

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue;
      walk(p);
    } else if (exts.has(extname(e.name))) files.push(p);
  }
})(SRC);

const allText = files.map(f => ({ f, t: readFileSync(f, 'utf8') }));
const isTest = f => /__tests__|\.test\.|\.spec\./.test(f);

// helper: ¿cuántos archivos NO-test (distintos del propio) referencian el basename?
const importers = base =>
  allText.filter(
    ({ f, t }) =>
      !isTest(f) &&
      basename(f).replace(/\.\w+$/, '') !== base &&
      new RegExp(`['"/]${base}['"]`).test(t),
  ).length;

// 1) Huérfanos (solo componentes/páginas)
const orphans = [];
for (const f of files) {
  if (isTest(f)) continue;
  if (!/\/(components|pages)\//.test(f)) continue;
  if (!f.endsWith('.tsx')) continue;
  const base = basename(f, '.tsx');
  // index/barrels y archivos triviales se ignoran
  if (base === 'index') continue;
  if (importers(base) === 0) {
    const lines = readFileSync(f, 'utf8').split('\n').length;
    orphans.push({ f: f.replace('src/', ''), lines });
  }
}

// 2) Monolitos
const big = allText
  .map(({ f, t }) => ({ f: f.replace('src/', ''), lines: t.split('\n').length }))
  .filter(x => x.lines > 700)
  .sort((a, b) => b.lines - a.lines);

// 3) Versionados
const versioned = files
  .filter(f => VERSIONED.test(basename(f)) && !isTest(f))
  .map(f => f.replace('src/', ''));

// 4) any
const anyCount = allText.reduce(
  (n, { t }) => n + (t.match(/: any\b|as any\b|<any>/g) || []).length,
  0,
);

const out = (title, arr, fmt) => {
  console.log(`\n=== ${title} (${arr.length}) ===`);
  arr.slice(0, 40).forEach(x => console.log('  ' + fmt(x)));
};

out('HUÉRFANOS — 0 imports no-test (candidatos a BORRAR, re-verificar gate)', orphans.sort((a, b) => b.lines - a.lines), x => `${x.lines.toString().padStart(5)}  ${x.f}`);
out('MONOLITOS >700 líneas (contener, no reescribir)', big, x => `${x.lines.toString().padStart(5)}  ${x.f}`);
out('NOMBRES VERSIONADOS (revisar viejo+nuevo coexistiendo)', versioned, x => x);
console.log(`\n=== any en el código: ${anyCount} ===`);
console.log('\nNota: HUÉRFANOS son CANDIDATOS. Re-verifica el gate antes de borrar');
console.log('(imports lazy/barrel/uso por JSX) y nunca borres tests que pasan.');
