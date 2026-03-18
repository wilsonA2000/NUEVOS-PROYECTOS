import { test, expect } from '@playwright/test';
import { CREDENTIALS } from '../fixtures/test-data';

test.describe('Matching and Messages Tests', () => {
  test('tenant can create match request', async ({ page }) => {
    // Login as tenant
    await page.goto('/');
    await page.click('text=Iniciar Sesión');
    await page.fill('input[name="email"]', CREDENTIALS.tenant.email);
    await page.fill('input[name="password"]', CREDENTIALS.tenant.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app/dashboard');

    // Go to properties
    await page.click('text=Propiedades');

    // View property details (if any exist)
    const firstProperty = page.locator('[data-testid="property-card"]').first();
    if (await firstProperty.isVisible()) {
      await firstProperty.click();

      // Click apply/match button
      const applyButton = page.locator('button:has-text("Aplicar")');
      if (await applyButton.isVisible()) {
        await applyButton.click();

        // Verify match request form opens
        await expect(page.locator('text=/solicitud|match|aplicar/i')).toBeVisible();
      }
    }
  });

  test('messages module is accessible', async ({ page }) => {
    // Login as tenant
    await page.goto('/');
    await page.click('text=Iniciar Sesión');
    await page.fill('input[name="email"]', CREDENTIALS.tenant.email);
    await page.fill('input[name="password"]', CREDENTIALS.tenant.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app/dashboard');

    // Click messages in menu
    await page.click('text=Mensajes');

    // Verify messages page loads
    await expect(page.locator('h1, h2, h3, h4').filter({ hasText: /mensaje/i })).toBeVisible();
  });
});
