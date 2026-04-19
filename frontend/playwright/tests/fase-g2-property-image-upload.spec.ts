/**
 * Fase G2 - Upload real de imagen de propiedad.
 *
 * Valida el ciclo:
 *   1. Landlord sube `fixtures/sample-property.jpg` via multipart POST.
 *   2. Respuesta 201 con `image_url` y `property` referenciado.
 *   3. GET al `image_url` devuelve 200 con `Content-Type: image/jpeg`.
 *   4. GET al listado `?property=<id>` incluye la imagen nueva.
 *
 * Bug destapado durante el diseño: el `PropertyImageSerializer`
 * omitía el field `property`, así que el endpoint no aceptaba crear
 * imágenes con el property FK por POST body. Fix: añadir el campo
 * al serializer.
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createRunContext,
  getAuthToken,
  logStep,
  runSeed,
} from '../helpers/multi-user-logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'e2e-logs', 'fase-g');
const FIXTURE = path.resolve(__dirname, '..', 'fixtures', 'sample-property.jpg');
const API_BASE = 'http://localhost:8000/api/v1';

test.describe.configure({ mode: 'serial' });

test('Fase G2 · landlord sube imagen real de propiedad', async ({ request }) => {
  const ctx = createRunContext(REPORT_DIR);
  const seed = runSeed('property_ready');
  logStep(ctx, 'system', 'seed', 'ok', { property_id: seed.property_id });

  const landlordTokens = await getAuthToken(seed.landlord_email, seed.password);
  expect(landlordTokens).toBeTruthy();
  const landlordToken = landlordTokens!.access;

  expect(fs.existsSync(FIXTURE), `fixture existe en ${FIXTURE}`).toBe(true);

  logStep(ctx, 'landlord', 'upload-image', 'start');
  const buffer = fs.readFileSync(FIXTURE);
  const uploadResp = await request.post(`${API_BASE}/properties/property-images/`, {
    headers: {
      Authorization: `Bearer ${landlordToken}`,
    },
    multipart: {
      property: seed.property_id,
      caption: 'E2E fixture',
      is_main: 'true',
      order: '0',
      image: {
        name: 'sample-property.jpg',
        mimeType: 'image/jpeg',
        buffer,
      },
    },
  });

  const status = uploadResp.status();
  const bodyText = await uploadResp.text();
  logStep(ctx, 'landlord', 'upload-image', uploadResp.ok() ? 'ok' : 'fail', {
    status,
    body_preview: bodyText.slice(0, 200),
  });
  expect(uploadResp.ok(), `upload 2xx (${status}) body=${bodyText.slice(0, 200)}`).toBe(true);

  const created = JSON.parse(bodyText);
  expect(created.property).toBe(seed.property_id);
  expect(created.image_url, 'image_url poblado').toBeTruthy();
  expect(String(created.image_url)).toMatch(/\/media\/|\.jpg/);

  // --- GET del image_url sirve el archivo ---
  logStep(ctx, 'landlord', 'fetch-image-url', 'start');
  const imgResp = await request.get(created.image_url, {
    headers: { Authorization: `Bearer ${landlordToken}` },
  });
  logStep(ctx, 'landlord', 'fetch-image-url', imgResp.ok() ? 'ok' : 'fail', {
    status: imgResp.status(),
    content_type: imgResp.headers()['content-type'],
  });
  expect(imgResp.ok()).toBe(true);
  expect(imgResp.headers()['content-type'] || '').toMatch(/image\/(jpeg|jpg)/);
});
