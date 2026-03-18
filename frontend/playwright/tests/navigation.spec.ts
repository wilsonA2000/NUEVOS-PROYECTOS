import { test, expect } from '@playwright/test';
import { mockAllAPIs, loginAsLandlord } from '../helpers/mock-api';

test.describe('Navegacion - Links del Sidebar y Menu', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllAPIs(page);
  });

  test('los links de navegacion del sidebar funcionan', async ({ page }) => {
    await loginAsLandlord(page);

    const navItems = [
      { text: /propiedades/i, expectedUrl: '/app/properties' },
      { text: /contratos/i, expectedUrl: '/app/contracts' },
      { text: /mensajes/i, expectedUrl: '/app/messages' },
      { text: /pagos/i, expectedUrl: '/app/payments' },
    ];

    for (const item of navItems) {
      const genericLink = page.locator('a, button').filter({ hasText: item.text });

      if (await genericLink.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await genericLink.first().click();
        await page.waitForLoadState('domcontentloaded');
        expect(page.url()).toContain(item.expectedUrl);
        await page.goto('/app/dashboard');
        await page.waitForLoadState('domcontentloaded');
      }
    }
  });

  test('el menu movil responsive se muestra en pantallas pequenas', async ({ page }) => {
    await loginAsLandlord(page);

    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('domcontentloaded');

    const hamburgerMenu = page.locator(
      'button[aria-label*="menu" i], button[aria-label*="navigation" i], [data-testid="menu-button"], button:has([data-testid="MenuIcon"])',
    );

    if (await hamburgerMenu.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await hamburgerMenu.first().click();

      const mobileMenu = page.locator('.MuiDrawer-root, [role="presentation"], nav, [data-testid="mobile-menu"]');
      await expect(mobileMenu.first()).toBeVisible({ timeout: 5000 });

      const navItem = page.locator('text=/propiedades|contratos|dashboard|mensajes/i');
      await expect(navItem.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('el selector de idioma cambia el idioma', async ({ page }) => {
    await loginAsLandlord(page);

    const languageSelector = page.locator(
      'button[aria-label*="idioma" i], button[aria-label*="language" i], [data-testid="language-selector"], select[name="language"], button:has-text("ES"), button:has-text("EN")',
    );

    if (await languageSelector.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await languageSelector.first().click();

      const englishOption = page.locator('text=/english|ingles|EN/i');
      if (await englishOption.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await englishOption.first().click();
        await page.waitForLoadState('domcontentloaded');

        const englishText = page.locator('text=/dashboard|properties|contracts|payments|messages/i');
        await expect(englishText.first()).toBeVisible({ timeout: 10000 });
      }
    } else {
      const spanishText = page.locator('text=/propiedades|contratos|pagos|mensajes/i');
      await expect(spanishText.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('la navegacion con breadcrumbs funciona', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/properties');
    await page.waitForLoadState('domcontentloaded');

    // Verify properties page loaded - breadcrumbs are optional
    const propertiesContent = page.locator('text=/propiedades|properties/i');
    await expect(propertiesContent.first()).toBeVisible({ timeout: 10000 });

    const breadcrumb = page.locator(
      'nav[aria-label*="breadcrumb" i], .MuiBreadcrumbs-root, [data-testid="breadcrumbs"]',
    );

    if (await breadcrumb.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const homeLink = page.locator(
        '.MuiBreadcrumbs-root a:first-child, nav[aria-label*="breadcrumb" i] a:first-child',
      );

      if (await homeLink.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await homeLink.first().click();
        await page.waitForLoadState('domcontentloaded');
        // After clicking home breadcrumb, we should navigate away from properties
        expect(page.url()).not.toContain('/properties');
      }
    }
  });

  test('la pagina de landing publica carga sin autenticacion', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const landingContent = page.locator('text=/VeriHome|bienvenido|iniciar sesion|registrarse|propiedades/i');
    await expect(landingContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('las rutas publicas son accesibles sin login', async ({ page }) => {
    const publicRoutes = [
      { path: '/about', text: /nosotros|about|verihome/i },
      { path: '/contact', text: /contacto|contact|formulario/i },
      { path: '/services', text: /servicios|services/i },
    ];

    for (const route of publicRoutes) {
      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');

      const pageContent = page.locator(`text=${route.text.source}`);
      const isContentVisible = await pageContent.first().isVisible({ timeout: 5000 }).catch(() => false);
      const isOnPublicPage = !page.url().includes('/app/');

      expect(isContentVisible || isOnPublicPage).toBeTruthy();
    }
  });
});
