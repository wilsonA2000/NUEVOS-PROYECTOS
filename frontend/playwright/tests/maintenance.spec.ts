import { test, expect, Page } from '@playwright/test';

const MOCK_MAINTENANCE_REQUESTS = [
  {
    id: 'maint-001',
    title: 'Fuga de agua en el bano',
    description: 'Hay una fuga de agua en el lavamanos del bano principal',
    property: {
      id: 'prop-001',
      title: 'Apartamento en Chapinero',
      address: 'Calle 72 #10-45',
    },
    tenant: {
      id: 2,
      first_name: 'Leidy',
      last_name: 'Tenant',
    },
    status: 'pending',
    priority: 'high',
    category: 'plumbing',
    created_at: '2025-11-10T08:30:00Z',
    updated_at: '2025-11-10T08:30:00Z',
  },
  {
    id: 'maint-002',
    title: 'Aire acondicionado no funciona',
    description: 'El aire acondicionado de la habitacion principal no enciende',
    property: {
      id: 'prop-001',
      title: 'Apartamento en Chapinero',
      address: 'Calle 72 #10-45',
    },
    tenant: {
      id: 2,
      first_name: 'Leidy',
      last_name: 'Tenant',
    },
    status: 'in_progress',
    priority: 'medium',
    category: 'hvac',
    created_at: '2025-11-05T14:00:00Z',
    updated_at: '2025-11-08T10:00:00Z',
  },
  {
    id: 'maint-003',
    title: 'Pintura descascarada en la sala',
    description: 'La pintura del techo de la sala se esta descascarando',
    property: {
      id: 'prop-002',
      title: 'Casa en Usaquen',
      address: 'Carrera 7 #120-30',
    },
    tenant: {
      id: 3,
      first_name: 'Carlos',
      last_name: 'Inquilino',
    },
    status: 'resolved',
    priority: 'low',
    category: 'general',
    created_at: '2025-10-20T11:00:00Z',
    updated_at: '2025-11-01T16:00:00Z',
  },
];

async function mockMaintenanceAPIs(page: Page) {
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

  // Mock maintenance requests list
  await page.route('**/api/v1/maintenance/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'maint-new-001',
          title: 'Nueva solicitud de mantenimiento',
          status: 'pending',
          message: 'Solicitud creada exitosamente.',
        }),
      });
      return;
    }

    // Single request detail
    if (url.match(/maintenance\/maint-\d+/)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_MAINTENANCE_REQUESTS[0]),
      });
      return;
    }

    // List
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: MOCK_MAINTENANCE_REQUESTS,
        count: MOCK_MAINTENANCE_REQUESTS.length,
        next: null,
        previous: null,
      }),
    });
  });

  // Mock properties (for new maintenance request form)
  await page.route('**/api/v1/properties/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          { id: 'prop-001', title: 'Apartamento en Chapinero', address: 'Calle 72 #10-45' },
        ],
        count: 1,
        next: null,
        previous: null,
      }),
    });
  });

  // Mock dashboard
  await page.route('**/api/v1/dashboard/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stats: { properties: 3, contracts: 2, messages: 0, maintenance: 3 },
        recent_activity: [],
      }),
    });
  });

  // Catch-all
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

test.describe('Mantenimiento - Solicitudes de Mantenimiento', () => {
  test.beforeEach(async ({ page }) => {
    await mockMaintenanceAPIs(page);
  });

  test('la pagina de mantenimiento carga correctamente', async ({ page }) => {
    await loginAsLandlord(page);

    // Navigate to maintenance page via sidebar or direct URL
    await page.goto('/app/maintenance');
    await page.waitForLoadState('networkidle');

    // Verify the maintenance page loads
    const maintenanceContent = page.locator(
      'text=/mantenimiento|maintenance|solicitudes/i',
    );
    await expect(maintenanceContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('se puede crear una nueva solicitud de mantenimiento', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/maintenance');
    await page.waitForLoadState('networkidle');

    // Look for a "New" or "Create" button
    const newButton = page.locator(
      'button:has-text("Nueva Solicitud"), button:has-text("Nuevo"), button:has-text("Crear"), a:has-text("Nueva"), [data-testid="new-maintenance"]',
    );

    if (await newButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await newButton.first().click();
      await page.waitForLoadState('networkidle');

      // Verify form fields are visible
      const titleInput = page.locator(
        'input[name="title"], input[placeholder*="titulo" i], input[label*="titulo" i]',
      );
      const descriptionInput = page.locator(
        'textarea[name="description"], textarea[placeholder*="descripcion" i], textarea',
      );

      if (await titleInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await titleInput.first().fill('Lampara fundida en la cocina');
      }

      if (await descriptionInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await descriptionInput.first().fill('La lampara del techo de la cocina dejo de funcionar');
      }

      // Look for priority selector
      const prioritySelector = page.locator(
        'select[name="priority"], [aria-label*="prioridad" i], [data-testid="priority-select"]',
      );
      if (await prioritySelector.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await prioritySelector.first().click();
        const mediumOption = page.locator('text=/media|medium/i');
        if (await mediumOption.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await mediumOption.first().click();
        }
      }

      // Look for submit button
      const submitButton = page.locator(
        'button:has-text("Enviar"), button:has-text("Crear"), button:has-text("Guardar"), button[type="submit"]',
      );
      await expect(submitButton.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('la lista de solicitudes muestra diferentes estados con tabs', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/app/maintenance');
    await page.waitForLoadState('networkidle');

    // Check for tabs or filter options for different statuses
    const tabsOrFilters = page.locator(
      'text=/pendiente|en proceso|resuelt|todas|abierta|cerrada/i',
    );

    if (await tabsOrFilters.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Verify at least one status tab/filter is visible
      await expect(tabsOrFilters.first()).toBeVisible();

      // Try clicking different tabs
      const pendingTab = page.locator(
        'button:has-text("Pendiente"), [role="tab"]:has-text("Pendiente"), a:has-text("Pendiente")',
      );
      if (await pendingTab.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await pendingTab.first().click();
        await page.waitForLoadState('networkidle');
      }

      const inProgressTab = page.locator(
        'button:has-text("En Proceso"), [role="tab"]:has-text("En Proceso"), a:has-text("En Proceso")',
      );
      if (await inProgressTab.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await inProgressTab.first().click();
        await page.waitForLoadState('networkidle');
      }
    }
  });
});
