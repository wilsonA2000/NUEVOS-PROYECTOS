import { test, expect, Page } from '@playwright/test';

/**
 * Mock API responses for authentication tests.
 * All API calls are intercepted so no real backend is needed.
 */
async function mockAuthAPIs(page: Page) {
  // Mock login endpoint - success
  await page.route('**/api/v1/auth/login/**', async (route, request) => {
    const body = request.postDataJSON?.() ?? {};
    let postData: Record<string, string> = {};
    try {
      postData = typeof request.postData() === 'string'
        ? JSON.parse(request.postData()!)
        : {};
    } catch {
      postData = {};
    }

    if (postData.email === 'admin@verihome.com' && postData.password === 'admin123') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access: 'fake-access-token-landlord',
          refresh: 'fake-refresh-token-landlord',
          user: {
            id: 1,
            email: 'admin@verihome.com',
            first_name: 'Admin',
            last_name: 'VeriHome',
            role: 'landlord',
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Credenciales inválidas. Por favor verifique su email y contraseña.',
        }),
      });
    }
  });

  // Mock user profile endpoint
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

  // Mock token refresh
  await page.route('**/api/v1/auth/token/refresh/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access: 'refreshed-access-token',
      }),
    });
  });

  // Mock logout
  await page.route('**/api/v1/auth/logout/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Sesión cerrada correctamente.' }),
    });
  });

  // Mock dashboard data so redirect works
  await page.route('**/api/v1/dashboard/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stats: { properties: 5, contracts: 2, messages: 3 },
        recent_activity: [],
      }),
    });
  });

  // Catch-all for other API requests to prevent hanging
  await page.route('**/api/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results: [], count: 0 }),
    });
  });
}

test.describe('Autenticacion - Flujo de Login/Logout', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthAPIs(page);
  });

  test('la pagina de login se renderiza correctamente', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Verify login form elements are present
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('login con credenciales validas redirige al dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill credentials
    await page.fill('input[name="email"], input[type="email"]', 'admin@verihome.com');
    await page.fill('input[name="password"], input[type="password"]', 'admin123');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/app/dashboard', { timeout: 15000 });

    // Verify we are on the dashboard
    expect(page.url()).toContain('/app/dashboard');
  });

  test('login con credenciales invalidas muestra error', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill invalid credentials
    await page.fill('input[name="email"], input[type="email"]', 'usuario@invalido.com');
    await page.fill('input[name="password"], input[type="password"]', 'claveIncorrecta123');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for error message to appear
    const errorMessage = page.locator('text=/error|inválid|incorrect|credenciales/i');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('logout cierra la sesion y redirige', async ({ page }) => {
    // First, login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"], input[type="email"]', 'admin@verihome.com');
    await page.fill('input[name="password"], input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app/dashboard', { timeout: 15000 });

    // Now logout - look for user menu or logout button
    const userMenu = page.locator('[aria-label="user menu"], [data-testid="user-menu"], button:has([data-testid="AccountCircleIcon"]), button:has([data-testid="PersonIcon"])');
    if (await userMenu.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await userMenu.first().click();
    }

    const logoutButton = page.locator('text=/cerrar sesión|logout|salir/i');
    if (await logoutButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutButton.first().click();
    }

    // After logout, should be redirected away from /app
    await page.waitForURL(/\/(login)?$/, { timeout: 10000 });
    expect(page.url()).not.toContain('/app/dashboard');
  });

  test('redirige al login cuando no esta autenticado', async ({ page }) => {
    // Try to access a protected route directly without being logged in
    await page.goto('/app/dashboard');
    await page.waitForLoadState('networkidle');

    // Should redirect to login or landing page
    await page.waitForURL(/\/(login)?$/, { timeout: 10000 });
    expect(page.url()).not.toContain('/app/dashboard');
  });
});
