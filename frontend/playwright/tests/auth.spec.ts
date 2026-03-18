import { test, expect } from '@playwright/test';
import { mockAllAPIs, loginAsLandlord } from '../helpers/mock-api';

test.describe('Autenticacion - Flujo de Login/Logout', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllAPIs(page);
  });

  test('la pagina de login se renderiza correctamente', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('login con credenciales validas redirige al dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.fill('input[name="email"], input[type="email"]', 'admin@verihome.com');
    await page.fill('input[name="password"], input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/app/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/app/dashboard');
  });

  test('login con credenciales invalidas muestra error', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.fill('input[name="email"], input[type="email"]', 'usuario@invalido.com');
    await page.fill('input[name="password"], input[type="password"]', 'claveIncorrecta123');
    await page.click('button[type="submit"]');

    const errorMessage = page.locator('text=/error|inválid|incorrect|credenciales/i');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('logout cierra la sesion y redirige', async ({ page }) => {
    await loginAsLandlord(page);

    // Verify we are on the dashboard
    expect(page.url()).toContain('/app/');

    // Clear tokens to simulate logout
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    });

    // Reload the page - without tokens, should redirect to login
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Give the app time to process the missing tokens
    await page.waitForTimeout(3000);

    // Should no longer be on a protected route
    expect(page.url()).not.toContain('/app/dashboard');
  });

  test('redirige al login cuando no esta autenticado', async ({ page }) => {
    await page.goto('/app/dashboard');
    await page.waitForLoadState('domcontentloaded');

    await page.waitForURL(/\/(login)?$/, { timeout: 10000 });
    expect(page.url()).not.toContain('/app/dashboard');
  });
});
