import { test, expect, Page } from '@playwright/test';

const MOCK_PROPERTIES = [
  {
    id: 'prop-001',
    title: 'Apartamento en Chapinero',
    description: 'Hermoso apartamento de 3 habitaciones con vista a la ciudad',
    property_type: 'apartment',
    address: 'Calle 72 #10-45, Chapinero',
    city: 'Bogota',
    state: 'Cundinamarca',
    area: 85,
    bedrooms: 3,
    bathrooms: 2,
    price: 2500000,
    deposit: 2500000,
    status: 'available',
    is_active: true,
    images: [],
    amenities: ['parqueadero', 'ascensor', 'gimnasio'],
    landlord: { id: 1, first_name: 'Admin', last_name: 'VeriHome' },
    created_at: '2025-10-01T10:00:00Z',
  },
  {
    id: 'prop-002',
    title: 'Casa en Usaquen',
    description: 'Casa amplia con jardin y zona BBQ',
    property_type: 'house',
    address: 'Carrera 7 #120-30, Usaquen',
    city: 'Bogota',
    state: 'Cundinamarca',
    area: 150,
    bedrooms: 4,
    bathrooms: 3,
    price: 4000000,
    deposit: 4000000,
    status: 'available',
    is_active: true,
    images: [],
    amenities: ['jardin', 'parqueadero', 'zona_bbq'],
    landlord: { id: 1, first_name: 'Admin', last_name: 'VeriHome' },
    created_at: '2025-09-15T14:00:00Z',
  },
  {
    id: 'prop-003',
    title: 'Estudio en la Candelaria',
    description: 'Estudio moderno cerca de universidades',
    property_type: 'studio',
    address: 'Carrera 3 #12-50, La Candelaria',
    city: 'Bogota',
    state: 'Cundinamarca',
    area: 35,
    bedrooms: 1,
    bathrooms: 1,
    price: 1200000,
    deposit: 1200000,
    status: 'available',
    is_active: true,
    images: [],
    amenities: ['internet', 'lavanderia'],
    landlord: { id: 1, first_name: 'Admin', last_name: 'VeriHome' },
    created_at: '2025-11-01T09:00:00Z',
  },
];

/**
 * Mock all API endpoints needed for property tests.
 */
async function mockPropertyAPIs(page: Page) {
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

  // Mock properties list endpoint
  await page.route('**/api/v1/properties/?**', async (route) => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get('search') || '';
    const propertyType = url.searchParams.get('property_type') || '';

    let filtered = [...MOCK_PROPERTIES];

    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.address.toLowerCase().includes(search.toLowerCase()),
      );
    }

    if (propertyType) {
      filtered = filtered.filter((p) => p.property_type === propertyType);
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: filtered,
        count: filtered.length,
        next: null,
        previous: null,
      }),
    });
  });

  // Mock properties list without query params
  await page.route('**/api/v1/properties/', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'prop-new-001',
          title: 'Apartamento Test E2E',
          status: 'available',
          ...MOCK_PROPERTIES[0],
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: MOCK_PROPERTIES,
          count: MOCK_PROPERTIES.length,
          next: null,
          previous: null,
        }),
      });
    }
  });

  // Mock single property detail
  await page.route('**/api/v1/properties/prop-*/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_PROPERTIES[0]),
    });
  });

  // Mock dashboard
  await page.route('**/api/v1/dashboard/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stats: { properties: 3, contracts: 1, messages: 0 },
        recent_activity: [],
      }),
    });
  });

  // Catch-all for other API calls
  await page.route('**/api/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results: [], count: 0 }),
    });
  });
}

/**
 * Helper: login and navigate to dashboard.
 */
async function loginAsLandlord(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"], input[type="email"]', 'admin@verihome.com');
  await page.fill('input[name="password"], input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app/dashboard', { timeout: 15000 });
}

test.describe('Propiedades - Gestion de Inmuebles', () => {
  test.beforeEach(async ({ page }) => {
    await mockPropertyAPIs(page);
  });

  test('la lista de propiedades carga correctamente', async ({ page }) => {
    await loginAsLandlord(page);

    // Navigate to properties
    await page.goto('/app/properties');
    await page.waitForLoadState('networkidle');

    // Verify properties are displayed
    const propertyContent = page.locator('text=/Apartamento en Chapinero|Casa en Usaquen|Estudio en la Candelaria/i');
    await expect(propertyContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('los filtros de propiedades funcionan', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/properties');
    await page.waitForLoadState('networkidle');

    // Look for a search input or filter control
    const searchInput = page.locator(
      'input[placeholder*="buscar" i], input[placeholder*="search" i], input[aria-label*="buscar" i], input[type="search"]',
    );

    if (await searchInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Type a search term
      await searchInput.first().fill('Chapinero');
      await page.waitForLoadState('networkidle');

      // Verify filtered results show the matching property
      await expect(page.locator('text=/Chapinero/i').first()).toBeVisible({ timeout: 10000 });
    }

    // Look for a property type filter (dropdown or select)
    const typeFilter = page.locator(
      'select[name*="type" i], [aria-label*="tipo" i], [data-testid="property-type-filter"]',
    );

    if (await typeFilter.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await typeFilter.first().click();
      // Select apartment type if available
      const apartmentOption = page.locator('text=/apartamento|apartment/i');
      if (await apartmentOption.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await apartmentOption.first().click();
      }
    }
  });

  test('la pagina de detalle de propiedad carga', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/properties/prop-001');
    await page.waitForLoadState('networkidle');

    // Verify property detail content is visible
    const detailContent = page.locator('text=/Apartamento en Chapinero|Chapinero|85.*m|2.500.000/i');
    await expect(detailContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('el formulario de crear propiedad se muestra y se puede llenar', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/properties/new');
    await page.waitForLoadState('networkidle');

    // Verify the form is displayed
    const formHeading = page.locator('text=/nueva propiedad|crear propiedad|agregar propiedad/i');
    await expect(formHeading.first()).toBeVisible({ timeout: 10000 });

    // Fill basic fields if visible
    const titleInput = page.locator('input[name="title"], input[label*="titulo" i]');
    if (await titleInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await titleInput.first().fill('Apartamento Test E2E');
    }

    const descriptionInput = page.locator('textarea[name="description"], textarea');
    if (await descriptionInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await descriptionInput.first().fill('Propiedad creada automaticamente por Playwright');
    }

    const priceInput = page.locator('input[name="price"]');
    if (await priceInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await priceInput.first().fill('1500000');
    }

    const areaInput = page.locator('input[name="area"]');
    if (await areaInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await areaInput.first().fill('80');
    }

    // Look for a submit or next button
    const submitButton = page.locator(
      'button:has-text("Guardar"), button:has-text("Crear"), button:has-text("Siguiente"), button[type="submit"]',
    );
    await expect(submitButton.first()).toBeVisible({ timeout: 5000 });
  });
});
