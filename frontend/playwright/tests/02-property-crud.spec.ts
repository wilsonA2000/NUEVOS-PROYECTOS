import { test, expect } from '@playwright/test';
import { CREDENTIALS, TEST_PROPERTY } from '../fixtures/test-data';

test.describe('Property CRUD Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as landlord
    await page.goto('/');
    await page.click('text=Iniciar Sesión');
    await page.fill('input[name="email"]', CREDENTIALS.landlord.email);
    await page.fill('input[name="password"]', CREDENTIALS.landlord.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app/dashboard');
  });

  test('should create new property with images', async ({ page }) => {
    // Navigate to properties
    await page.click('text=Propiedades');
    await page.click('text=Nueva Propiedad');

    // Fill basic info
    await page.fill('input[name="title"]', TEST_PROPERTY.title);
    await page.fill('textarea[name="description"]', TEST_PROPERTY.description);
    await page.click('button:has-text("Siguiente")');

    // Fill location
    await page.fill('input[name="address"]', TEST_PROPERTY.address);
    await page.click('button:has-text("Siguiente")');

    // Fill details
    await page.fill('input[name="area"]', TEST_PROPERTY.area.toString());
    await page.fill('input[name="bedrooms"]', TEST_PROPERTY.bedrooms.toString());
    await page.fill('input[name="price"]', TEST_PROPERTY.price.toString());
    await page.click('button:has-text("Siguiente")');

    // Skip images (optional)
    await page.click('button:has-text("Siguiente")');

    // Save
    await page.click('button:has-text("Guardar")');

    // Verify success
    await expect(page.locator('text=/creada|success|éxito/i')).toBeVisible();
    await expect(page.locator(`text=${TEST_PROPERTY.title}`)).toBeVisible();
  });
});
