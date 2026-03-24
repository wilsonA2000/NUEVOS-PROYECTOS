import { test, expect } from '@playwright/test';
import { mockAllAPIs, loginAs, MOCK_USER_LANDLORD } from '../helpers/mock-api';

const ADMIN_USER = {
  ...MOCK_USER_LANDLORD,
  is_staff: true,
  is_superuser: true,
};

const NON_ADMIN_USER = {
  ...MOCK_USER_LANDLORD,
  is_staff: false,
  is_superuser: false,
};

test.describe('Panel de Administracion - Acceso y Navegacion', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllAPIs(page, ADMIN_USER);
  });

  test('admin puede acceder al dashboard /app/admin', async ({ page }) => {
    await loginAs(page, 'admin@verihome.com', 'admin123');
    await page.goto('/app/admin');
    await page.waitForLoadState('networkidle');

    const adminContent = page.locator('text=/administraci|admin|panel|dashboard/i');
    await expect(adminContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('admin puede navegar a /app/admin/verification', async ({ page }) => {
    await loginAs(page, 'admin@verihome.com', 'admin123');
    await page.goto('/app/admin/verification');
    await page.waitForLoadState('networkidle');

    const content = page.locator('text=/verificaci|verification/i');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('admin puede navegar a /app/admin/tickets', async ({ page }) => {
    await loginAs(page, 'admin@verihome.com', 'admin123');
    await page.goto('/app/admin/tickets');
    await page.waitForLoadState('networkidle');

    const content = page.locator('text=/tickets|soporte|support/i');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('admin puede navegar a /app/admin/contracts', async ({ page }) => {
    await loginAs(page, 'admin@verihome.com', 'admin123');
    await page.goto('/app/admin/contracts');
    await page.waitForLoadState('networkidle');

    const content = page.locator('text=/contrato|contract/i');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('sidebar muestra links especificos de admin', async ({ page }) => {
    await loginAs(page, 'admin@verihome.com', 'admin123');
    await page.goto('/app/admin');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('nav, aside, .MuiDrawer-root, [role="navigation"]');
    if (await sidebar.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const adminLinks = page.locator('text=/verificaci|tickets|auditor|seguridad/i');
      await expect(adminLinks.first()).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Panel de Administracion - Acceso denegado', () => {
  test('usuario no-admin es redirigido desde /app/admin', async ({ page }) => {
    await mockAllAPIs(page, NON_ADMIN_USER);
    await loginAs(page, 'admin@verihome.com', 'admin123');
    await page.goto('/app/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const url = page.url();
    const isRedirected = !url.includes('/app/admin') || url.includes('/app/admin') === false;
    const hasAccessDenied = await page
      .locator('text=/acceso denegado|no autorizado|sin permisos|unauthorized|forbidden/i')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    expect(isRedirected || hasAccessDenied).toBeTruthy();
  });
});
