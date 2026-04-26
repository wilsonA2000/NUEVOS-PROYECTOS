/**
 * VeriHome ID — onboarding digital end-to-end smoke.
 *
 * Estrategia: NO simulamos OpenCV/Tesseract/face-api en headless (es
 * caro e inestable). Validamos las dos capas que importan:
 *   1. API: POST /api/v1/verification/onboarding/ con payload sintético
 *      (3 imágenes 1x1 PNG en base64) → 201 + verdict server-side.
 *   2. UI: la página /app/verihome-id/onboarding renderiza el flujo
 *      sin crashear (paso 0 visible, sin red error).
 */

import { expect, test, type APIRequestContext } from '@playwright/test';

const BACKEND = process.env.PLAYWRIGHT_BACKEND_URL || 'http://localhost:8000';
const TENANT_EMAIL = process.env.E2E_TENANT_EMAIL || 'letefon100@gmail.com';
const TENANT_PASSWORD = process.env.E2E_PASSWORD || 'admin123';

const DUMMY_PNG =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=';

async function getJwt(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BACKEND}/api/token/`, {
    data: { email: TENANT_EMAIL, password: TENANT_PASSWORD },
  });
  expect(res.ok(), `login falló (${res.status()})`).toBeTruthy();
  const body = await res.json();
  expect(body.access).toBeTruthy();
  return body.access as string;
}

function basePayload(scoreTotal: string) {
  return {
    document_type_declared: 'cedula_ciudadania',
    document_number_declared: '1234567890',
    full_name_declared: 'Wilson E2E Tester',
    cedula_anverso: DUMMY_PNG,
    cedula_reverso: DUMMY_PNG,
    selfie: DUMMY_PNG,
    ocr_data: { document_number: '1234567890', first_names: 'WILSON' },
    liveness_data: { qualityScore: 0.85, totalDurationMs: 4200 },
    face_match_data: { similarity: 0.78, passed: true },
    digital_score: { observaciones: [], total: parseFloat(scoreTotal) },
    digital_score_total: scoreTotal,
  };
}

test.describe('VeriHome ID onboarding (C-NEXT)', () => {
  test('POST onboarding con score alto devuelve verdict aprobado', async ({
    request,
  }) => {
    const token = await getJwt(request);

    const res = await request.post(
      `${BACKEND}/api/v1/verification/onboarding/`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: basePayload('0.45'),
      },
    );

    if (res.status() === 429) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Throttle alcanzado en este run',
      });
      return;
    }

    expect(res.status(), `body=${await res.text()}`).toBe(201);
    const body = await res.json();
    expect(body.digital_verdict).toBe('aprobado');
    expect(body.status).toBe('digital_completed');
    expect(body.cedula_anverso_url).toMatch(/verihome_id\//);
    expect(body.cedula_reverso_url).toMatch(/verihome_id\//);
    expect(body.selfie_url).toMatch(/verihome_id\//);
  });

  test('GET /me devuelve el último onboarding del usuario', async ({
    request,
  }) => {
    const token = await getJwt(request);

    const res = await request.get(
      `${BACKEND}/api/v1/verification/onboarding/me/`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.user_email).toBe(TENANT_EMAIL);
      expect(['aprobado', 'observado', 'rechazado']).toContain(
        body.digital_verdict,
      );
    }
  });

  test('Score bajo persiste con verdict=rechazado y status=rejected', async ({
    request,
  }) => {
    const token = await getJwt(request);

    const res = await request.post(
      `${BACKEND}/api/v1/verification/onboarding/`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: basePayload('0.10'),
      },
    );

    // El throttle es 4/hour: si un test anterior consumió el cupo,
    // saltamos en lugar de fallar.
    if (res.status() === 429) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Throttle alcanzado en este run',
      });
      return;
    }

    expect(res.status(), `body=${await res.text()}`).toBe(201);
    const body = await res.json();
    expect(body.digital_verdict).toBe('rechazado');
    expect(body.status).toBe('rejected');
  });

  test('UI: página onboarding renderiza header VeriHome ID sin crashes', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', TENANT_EMAIL);
    await page.fill(
      'input[name="password"], input[type="password"]',
      TENANT_PASSWORD,
    );
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app/**', { timeout: 30000 });

    await page.goto('/app/verihome-id/onboarding');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/app/verihome-id/onboarding');

    // El header propio de la página onboarding debe estar visible
    await expect(
      page.getByRole('heading', { name: /^VeriHome ID$/i }).first(),
    ).toBeVisible({ timeout: 10000 });

    // ErrorBoundary NO debe haber capturado nada
    const html = await page.content();
    expect(html).not.toContain('Algo salió mal');
    expect(html).not.toContain('Se ha producido un error');

    // Sin errores fatales en consola
    const fatal = errors.filter(
      e =>
        !e.toLowerCase().includes('mapbox') &&
        !e.toLowerCase().includes('failed to load'),
    );
    expect(fatal, fatal.join('\n')).toEqual([]);
  });
});
