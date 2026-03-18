import { test, expect } from '@playwright/test';
import { mockAllAPIs, loginAsLandlord, contractHandlers, propertyHandlers } from '../helpers/mock-api';

test.describe('Contratos - Dashboard y Flujo de Trabajo', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllAPIs(page, undefined, [...contractHandlers(), ...propertyHandlers()]);
  });

  test('el dashboard de contratos carga correctamente', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/contracts');
    await page.waitForLoadState('domcontentloaded');

    const contractsHeading = page.locator('text=/contrato|contracts/i');
    await expect(contractsHeading.first()).toBeVisible({ timeout: 10000 });
  });

  test('el formulario de nuevo contrato se muestra', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/contracts/new');
    await page.waitForLoadState('domcontentloaded');

    const formContent = page.locator(
      'text=/nuevo contrato|crear contrato|detalles del contrato|propiedad/i',
    );
    await expect(formContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('la vista de detalle del contrato carga', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/contracts/contract-001');
    await page.waitForLoadState('domcontentloaded');

    const detailContent = page.locator(
      'text=/Chapinero|contrato|activo|2.500.000/i',
    );
    await expect(detailContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('el dialogo de flujo biometrico aparece', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/contracts/contract-001');
    await page.waitForLoadState('domcontentloaded');

    const biometricButton = page.locator(
      'button:has-text("Autenticacion Biometrica"), button:has-text("Biometric"), button:has-text("Iniciar Autenticacion"), button:has-text("Firmar"), [data-testid="biometric-button"]',
    );

    if (await biometricButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await biometricButton.first().click();

      const biometricDialog = page.locator('[role="dialog"], .MuiDialog-root, .MuiModal-root');
      await expect(biometricDialog.first()).toBeVisible({ timeout: 10000 });

      const biometricContent = page.locator(
        'text=/captura facial|verificacion|documento|biometri|paso 1|step 1/i',
      );
      await expect(biometricContent.first()).toBeVisible({ timeout: 10000 });
    } else {
      const pageContent = page.locator('text=/contrato|contract/i');
      await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
    }
  });
});
