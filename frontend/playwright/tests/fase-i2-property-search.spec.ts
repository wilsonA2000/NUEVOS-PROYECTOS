/**
 * Fase I2 - Property search & filters (API).
 *
 * Valida que `PropertyViewSet` soporta los filtros documentados:
 *   - `?city=Bogotá` → sólo las 2 Bogotá.
 *   - `?search=Cedritos` → sólo 1 (la de Cedritos).
 *   - `?city=Medellín&listing_type=rent` → la del Poblado.
 *   - `?ordering=-rent_price` → trae el más caro primero.
 *
 * El seed `property_search_ready` crea 4 propiedades distribuidas en
 * 3 ciudades con precios distintos.
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  apiGet,
  createRunContext,
  getAuthToken,
  logStep,
  runSeed,
} from '../helpers/multi-user-logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-i');

test.describe.configure({ mode: 'serial' });

test('Fase I2 · property search + filters (city, search, ordering)', async () => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('property_search_ready');
  const ids = (seed.property_search_ids as unknown as string[]) || [];
  expect(ids.length, 'seed debe crear ≥ 4 properties').toBeGreaterThanOrEqual(4);
  logStep(ctx, 'system', 'seed', 'ok', { count: ids.length });

  const tokens = await getAuthToken(seed.tenant_email, seed.password);
  expect(tokens).toBeTruthy();
  const token = tokens!.access;

  // Helper: filtra la respuesta a sólo las properties del seed
  // (para evitar ruido de properties previas).
  const filterOursOnly = (rows: any[]) =>
    rows.filter((r) => ids.includes(String(r.id)));

  // --- Filtro 1: city=Bogotá ---
  logStep(ctx, 'tenant', 'search-by-city', 'start');
  const bogotaResp = await apiGet(token, '/properties/?city=Bogotá');
  expect(bogotaResp.ok).toBe(true);
  const bogotaRows = filterOursOnly(
    ((bogotaResp.body as any)?.results ?? bogotaResp.body) as any[],
  );
  const bogotaCities = new Set(bogotaRows.map((r) => r.city));
  logStep(ctx, 'tenant', 'search-by-city', 'ok', {
    count: bogotaRows.length,
    cities: Array.from(bogotaCities),
  });
  expect(bogotaRows.length).toBe(2);
  expect(bogotaCities.size).toBe(1);
  expect(bogotaCities.has('Bogotá')).toBe(true);

  // --- Filtro 2: search=Cedritos ---
  const cedritosResp = await apiGet(token, '/properties/?search=Cedritos');
  expect(cedritosResp.ok).toBe(true);
  const cedritosRows = filterOursOnly(
    ((cedritosResp.body as any)?.results ?? cedritosResp.body) as any[],
  );
  expect(cedritosRows.length, 'sólo 1 property coincide "Cedritos"').toBe(1);
  expect(String(cedritosRows[0].title)).toContain('Cedritos');

  // --- Filtro 3: city=Medellín & listing_type=rent ---
  const medResp = await apiGet(
    token,
    '/properties/?city=Medellín&listing_type=rent',
  );
  expect(medResp.ok).toBe(true);
  const medRows = filterOursOnly(
    ((medResp.body as any)?.results ?? medResp.body) as any[],
  );
  expect(medRows.length).toBe(1);
  expect(medRows[0].city).toBe('Medellín');

  // --- Filtro 4: ordering=-rent_price (caro primero) ---
  const orderedResp = await apiGet(token, '/properties/?ordering=-rent_price');
  expect(orderedResp.ok).toBe(true);
  const ours = filterOursOnly(
    ((orderedResp.body as any)?.results ?? orderedResp.body) as any[],
  );
  // Cedritos (2.8M) es la más cara de nuestro seed, debe aparecer antes
  // que las otras 3.
  const cedritosIdx = ours.findIndex((r) => String(r.title).includes('Cedritos'));
  const chapineroIdx = ours.findIndex((r) => String(r.title).includes('Chapinero'));
  expect(cedritosIdx, 'Cedritos debe estar en el resultado').toBeGreaterThanOrEqual(0);
  expect(chapineroIdx, 'Chapinero debe estar en el resultado').toBeGreaterThanOrEqual(0);
  expect(cedritosIdx).toBeLessThan(chapineroIdx);
  logStep(ctx, 'tenant', 'ordering-check', 'ok', {
    cedritos_idx: cedritosIdx,
    chapinero_idx: chapineroIdx,
  });
});
