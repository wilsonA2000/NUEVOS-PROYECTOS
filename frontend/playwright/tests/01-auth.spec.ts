import { test, expect } from '@playwright/test';
import { CREDENTIALS } from '../fixtures/test-data';

test.describe('Authentication Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should login as landlord successfully', async ({ page }) => {
    // Navigate to login
    await page.click('text=Iniciar Sesión');

    // Fill credentials
    await page.fill('input[name="email"]', CREDENTIALS.landlord.email);
    await page.fill('input[name="password"]', CREDENTIALS.landlord.password);

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/app/dashboard');

    // Verify logged in
    await expect(page.locator('text=' + CREDENTIALS.landlord.name)).toBeVisible();
  });

  test('should login as tenant successfully', async ({ page }) => {
    await page.click('text=Iniciar Sesión');
    await page.fill('input[name="email"]', CREDENTIALS.tenant.email);
    await page.fill('input[name="password"]', CREDENTIALS.tenant.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app/dashboard');
    await expect(page.locator('text=' + CREDENTIALS.tenant.name)).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.click('text=Iniciar Sesión');
    await page.fill('input[name="email"]', 'invalid@test.com');
    await page.fill('input[name="password"]', 'wrong123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=/error|inválid|incorrect/i')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.click('text=Iniciar Sesión');
    await page.fill('input[name="email"]', CREDENTIALS.landlord.email);
    await page.fill('input[name="password"]', CREDENTIALS.landlord.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app/dashboard');

    // Logout
    await page.click('[aria-label="user menu"]'); // Avatar/menu
    await page.click('text=Cerrar Sesión');

    // Verify redirect to home/login
    await page.waitForURL(/\/(login)?$/);
  });
});
