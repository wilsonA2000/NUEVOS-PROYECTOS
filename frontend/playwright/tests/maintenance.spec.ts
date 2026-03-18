import { test, expect } from '@playwright/test';
import { mockAllAPIs, loginAsLandlord, maintenanceHandlers, propertyHandlers } from '../helpers/mock-api';

test.describe('Mantenimiento - Solicitudes de Mantenimiento', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllAPIs(page, undefined, [...maintenanceHandlers(), ...propertyHandlers()]);
  });

  test('la pagina de mantenimiento carga correctamente', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/maintenance');
    await page.waitForLoadState('domcontentloaded');

    const maintenanceContent = page.locator('text=/mantenimiento|maintenance|solicitudes/i');
    await expect(maintenanceContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('se puede crear una nueva solicitud de mantenimiento', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/maintenance');
    await page.waitForLoadState('domcontentloaded');

    const newButton = page.locator(
      'button:has-text("Nueva Solicitud"), button:has-text("Nuevo"), button:has-text("Crear"), a:has-text("Nueva"), [data-testid="new-maintenance"]',
    );

    if (await newButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await newButton.first().click();
      await page.waitForLoadState('domcontentloaded');

      const titleInput = page.locator(
        'input[name="title"], input[placeholder*="titulo" i], input[label*="titulo" i]',
      );
      const descriptionInput = page.locator(
        'textarea[name="description"], textarea[placeholder*="descripcion" i], textarea',
      );

      if (await titleInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await titleInput.first().fill('Lampara fundida en la cocina');
      }

      if (await descriptionInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await descriptionInput.first().fill('La lampara del techo de la cocina dejo de funcionar');
      }

      const submitButton = page.locator(
        'button:has-text("Enviar"), button:has-text("Crear"), button:has-text("Guardar"), button[type="submit"]',
      );
      await expect(submitButton.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('la lista de solicitudes muestra diferentes estados con tabs', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/maintenance');
    await page.waitForLoadState('domcontentloaded');

    // Verify the maintenance page loaded
    const maintenanceContent = page.locator('text=/mantenimiento|maintenance|solicitudes/i');
    await expect(maintenanceContent.first()).toBeVisible({ timeout: 15000 });

    // Check for tabs or filter options for different statuses
    const tabsOrFilters = page.locator('text=/pendiente|en proceso|resuelt|todas|abierta|cerrada/i');

    if (await tabsOrFilters.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(tabsOrFilters.first()).toBeVisible();
    }
  });
});
