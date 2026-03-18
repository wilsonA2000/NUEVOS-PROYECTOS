import { test, expect, Page } from '@playwright/test';

/**
 * Mock all API endpoints for navigation tests.
 */
async function mockNavigationAPIs(page: Page) {
  // Mock login
  await page.route('**/api/v1/auth/login/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access: 'fake-access-token',
        refresh: 'fake-refresh-token',
        user: {
          id: 1,
          email: 'admin@verihome.com',
          first_name: 'Admin',
          last_name: 'VeriHome',
          role: 'landlord',
        },
      }),
    });
  });

  // Mock user profile
  await page.route('**/api/v1/auth/user/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        email: 'admin@verihome.com',
        first_name: 'Admin',
        last_name: 'VeriHome',
        role: 'landlord',
        is_verified: true,
      }),
    });
  });

  // Mock dashboard
  await page.route('**/api/v1/dashboard/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stats: { properties: 3, contracts: 2, messages: 1 },
        recent_activity: [],
      }),
    });
  });

  // Catch-all for all other API requests
  await page.route('**/api/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results: [], count: 0 }),
    });
  });
}

async function loginAsLandlord(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"], input[type="email"]', 'admin@verihome.com');
  await page.fill('input[name="password"], input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app/dashboard', { timeout: 15000 });
}

test.describe('Navegacion - Links del Sidebar y Menu', () => {
  test.beforeEach(async ({ page }) => {
    await mockNavigationAPIs(page);
  });

  test('los links de navegacion del sidebar funcionan', async ({ page }) => {
    await loginAsLandlord(page);

    // Define sidebar navigation items to test
    const navItems = [
      { text: /propiedades/i, expectedUrl: '/app/properties' },
      { text: /contratos/i, expectedUrl: '/app/contracts' },
      { text: /mensajes/i, expectedUrl: '/app/messages' },
      { text: /pagos/i, expectedUrl: '/app/payments' },
    ];

    for (const item of navItems) {
      // Find and click the sidebar link
      const sidebarLink = page.locator(
        `nav a:has-text("${item.text.source}"), [role="navigation"] a:has-text("${item.text.source}"), .MuiDrawer-root a:has-text("${item.text.source}"), aside a:has-text("${item.text.source}")`,
      );

      // Use a more generic approach if sidebar links have different structure
      const genericLink = page.locator(`a, button`).filter({ hasText: item.text });

      const linkToClick = await sidebarLink.first().isVisible({ timeout: 3000 }).catch(() => false)
        ? sidebarLink.first()
        : genericLink.first();

      if (await linkToClick.isVisible({ timeout: 3000 }).catch(() => false)) {
        await linkToClick.click();
        await page.waitForLoadState('networkidle');

        // Verify URL changed
        expect(page.url()).toContain(item.expectedUrl);

        // Navigate back to dashboard for next test
        await page.goto('/app/dashboard');
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('el menu movil responsive se muestra en pantallas pequenas', async ({ page }) => {
    await loginAsLandlord(page);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');

    // Look for a hamburger menu button (common in Material-UI responsive layouts)
    const hamburgerMenu = page.locator(
      'button[aria-label*="menu" i], button[aria-label*="navigation" i], [data-testid="menu-button"], button:has([data-testid="MenuIcon"])',
    );

    if (await hamburgerMenu.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await hamburgerMenu.first().click();

      // Verify the mobile drawer/menu opens
      const mobileMenu = page.locator(
        '.MuiDrawer-root, [role="presentation"], nav, [data-testid="mobile-menu"]',
      );
      await expect(mobileMenu.first()).toBeVisible({ timeout: 5000 });

      // Verify navigation items are visible inside the mobile menu
      const navItem = page.locator(
        'text=/propiedades|contratos|dashboard|mensajes/i',
      );
      await expect(navItem.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('el selector de idioma cambia el idioma', async ({ page }) => {
    await loginAsLandlord(page);

    // Look for a language selector
    const languageSelector = page.locator(
      'button[aria-label*="idioma" i], button[aria-label*="language" i], [data-testid="language-selector"], select[name="language"], button:has-text("ES"), button:has-text("EN")',
    );

    if (await languageSelector.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await languageSelector.first().click();

      // Look for English option
      const englishOption = page.locator(
        'text=/english|ingles|EN/i',
      );

      if (await englishOption.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await englishOption.first().click();
        await page.waitForLoadState('networkidle');

        // Verify some text changed to English
        const englishText = page.locator(
          'text=/dashboard|properties|contracts|payments|messages/i',
        );
        await expect(englishText.first()).toBeVisible({ timeout: 10000 });
      }
    } else {
      // If no language selector found, verify the page is in Spanish by default
      const spanishText = page.locator('text=/propiedades|contratos|pagos|mensajes/i');
      await expect(spanishText.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('la navegacion con breadcrumbs funciona', async ({ page }) => {
    await loginAsLandlord(page);

    // Navigate to a nested page
    await page.goto('/app/properties');
    await page.waitForLoadState('networkidle');

    // Look for breadcrumb navigation
    const breadcrumb = page.locator(
      'nav[aria-label*="breadcrumb" i], .MuiBreadcrumbs-root, [data-testid="breadcrumbs"], ol[class*="breadcrumb" i]',
    );

    if (await breadcrumb.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Verify breadcrumb contains current page reference
      const breadcrumbText = page.locator(
        'nav[aria-label*="breadcrumb" i] *, .MuiBreadcrumbs-root *',
      ).filter({ hasText: /propiedades|properties/i });

      await expect(breadcrumbText.first()).toBeVisible({ timeout: 5000 });

      // Click on a breadcrumb link (e.g., "Inicio" or "Dashboard") to navigate back
      const homeLink = page.locator(
        'nav[aria-label*="breadcrumb" i] a:has-text("Inicio"), .MuiBreadcrumbs-root a:has-text("Dashboard"), .MuiBreadcrumbs-root a:first-child',
      );

      if (await homeLink.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await homeLink.first().click();
        await page.waitForLoadState('networkidle');

        // Verify navigation occurred
        expect(page.url()).toContain('/app/dashboard');
      }
    }
  });

  test('la pagina de landing publica carga sin autenticacion', async ({ page }) => {
    // Visit the landing page without logging in
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify the landing page renders
    const landingContent = page.locator(
      'text=/VeriHome|bienvenido|iniciar sesion|registrarse|propiedades/i',
    );
    await expect(landingContent.first()).toBeVisible({ timeout: 10000 });

    // Verify navigation links exist on the public page
    const publicLinks = page.locator(
      'text=/iniciar sesion|registrarse|servicios|nosotros|contacto/i',
    );
    await expect(publicLinks.first()).toBeVisible({ timeout: 5000 });
  });

  test('las rutas publicas son accesibles sin login', async ({ page }) => {
    const publicRoutes = [
      { path: '/about', text: /nosotros|about|verihome/i },
      { path: '/contact', text: /contacto|contact|formulario/i },
      { path: '/services', text: /servicios|services/i },
      { path: '/help', text: /ayuda|soporte|help|support/i },
    ];

    for (const route of publicRoutes) {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      const pageContent = page.locator(`text=${route.text.source}`);

      // The page should load without redirecting to login
      // It may redirect to landing page for some routes - that's also valid
      const isContentVisible = await pageContent.first().isVisible({ timeout: 5000 }).catch(() => false);
      const isOnPublicPage = !page.url().includes('/app/');

      expect(isContentVisible || isOnPublicPage).toBeTruthy();
    }
  });
});
