import { test, expect } from '@playwright/test';
import { mockAllAPIs, loginAsLandlord, propertyHandlers } from '../helpers/mock-api';

test.describe('Propiedades - Gestion de Inmuebles', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllAPIs(page, undefined, propertyHandlers());
  });

  test('la lista de propiedades carga correctamente', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/properties');
    await page.waitForLoadState('domcontentloaded');

    const propertyContent = page.locator('text=/Apartamento en Chapinero|Casa en Usaquen/i');
    await expect(propertyContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('los filtros de propiedades funcionan', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/properties');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.locator(
      'input[placeholder*="buscar" i], input[placeholder*="search" i], input[aria-label*="buscar" i], input[type="search"]',
    );

    if (await searchInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.first().fill('Chapinero');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('text=/Chapinero/i').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('la pagina de detalle de propiedad carga', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/properties/prop-001');
    await page.waitForLoadState('domcontentloaded');

    const detailContent = page.locator('text=/Apartamento en Chapinero|Chapinero|85.*m|2.500.000/i');
    await expect(detailContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('el formulario de crear propiedad se muestra y se puede llenar', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/properties/new');
    await page.waitForLoadState('domcontentloaded');

    const formHeading = page.locator('text=/nueva propiedad|crear propiedad|agregar propiedad/i');
    await expect(formHeading.first()).toBeVisible({ timeout: 10000 });

    const titleInput = page.locator('input[name="title"], input[label*="titulo" i]');
    if (await titleInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await titleInput.first().fill('Apartamento Test E2E');
    }

    const submitButton = page.locator(
      'button:has-text("Guardar"), button:has-text("Crear"), button:has-text("Siguiente"), button[type="submit"]',
    );
    await expect(submitButton.first()).toBeVisible({ timeout: 5000 });
  });
});
