import { Page, Route } from '@playwright/test';

export const MOCK_USER_LANDLORD = {
  id: 1,
  email: 'admin@verihome.com',
  first_name: 'Admin',
  last_name: 'VeriHome',
  user_type: 'landlord',
  is_verified: true,
  phone: '+57 300 123 4567',
};

export const MOCK_USER_TENANT = {
  id: 2,
  email: 'letefon100@gmail.com',
  first_name: 'Leidy',
  last_name: 'Tenant',
  user_type: 'tenant',
  is_verified: true,
};

// Default empty paginated response
const EMPTY_LIST = { results: [], count: 0, next: null, previous: null };

/**
 * Route handler type: receives url and route, returns true if handled
 */
type RouteHandler = (url: string, route: Route) => Promise<boolean>;

/**
 * Create a single unified API mock interceptor.
 * Uses ONE page.route() call to avoid LIFO ordering issues.
 * Additional handlers can be added via the extraHandlers parameter.
 */
export async function mockAllAPIs(
  page: Page,
  user = MOCK_USER_LANDLORD,
  extraHandlers: RouteHandler[] = [],
) {
  await page.route(/localhost:8000/, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // 1. Try extra handlers first (domain-specific mocks)
    for (const handler of extraHandlers) {
      if (await handler(url, route)) return;
    }

    // 2. Auth: Login
    if (url.includes('/users/auth/login')) {
      let postData: Record<string, string> = {};
      try {
        const raw = route.request().postData();
        postData = raw ? JSON.parse(raw) : {};
      } catch {
        postData = {};
      }

      const validCreds = [
        { email: 'admin@verihome.com', password: 'admin123' },
        { email: 'letefon100@gmail.com', password: 'admin123' },
        { email: 'serviceprovider@verihome.com', password: 'service123' },
      ];

      const isValid = validCreds.some(
        (c) => c.email === postData.email && c.password === postData.password,
      );

      await route.fulfill({
        status: isValid ? 200 : 401,
        contentType: 'application/json',
        body: isValid
          ? JSON.stringify({ access: 'fake-access-token', refresh: 'fake-refresh-token' })
          : JSON.stringify({ detail: 'Credenciales inválidas. Por favor verifique su email y contraseña.' }),
      });
      return;
    }

    // 3. Auth: User profile
    if (url.includes('/users/auth/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(user),
      });
      return;
    }

    // 4. Auth: Token refresh
    if (url.includes('/users/auth/token/refresh')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access: 'refreshed-access-token' }),
      });
      return;
    }

    // 5. Auth: Logout
    if (url.includes('/users/auth/logout')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Sesión cerrada correctamente.' }),
      });
      return;
    }

    // 6. Dashboard
    if (url.includes('/dashboard/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          properties: { total: 3, occupied: 1, available: 2, maintenance: 0, trend: 5 },
          finances: { monthlyIncome: 5000000, monthlyExpenses: 1000000, pendingPayments: 0, profit: 4000000, trend: 3 },
          contracts: { active: 2, expiringSoon: 0, pending: 1, total: 3, trend: 0 },
          users: { tenants: 2, landlords: 1, serviceProviders: 1, newThisMonth: 0, trend: 0 },
          ratings: { average: 4.5, total: 10, distribution: { 1: 0, 2: 0, 3: 1, 4: 3, 5: 6 } },
          activities: [],
        }),
      });
      return;
    }

    // 7. Catch-all: empty response
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(EMPTY_LIST),
    });
  });
}

/**
 * Login helper - fills the login form and waits for redirect.
 */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app/**', { timeout: 30000 });
}

export async function loginAsLandlord(page: Page) {
  await loginAs(page, 'admin@verihome.com', 'admin123');
}

export async function loginAsTenant(page: Page) {
  await loginAs(page, 'letefon100@gmail.com', 'admin123');
}

// ============ Domain-specific mock handler factories ============

export const MOCK_PROPERTIES = [
  {
    id: 'prop-001',
    title: 'Apartamento en Chapinero',
    description: 'Hermoso apartamento de 3 habitaciones',
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
    description: 'Casa amplia con jardin',
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
    amenities: ['jardin', 'parqueadero'],
    landlord: { id: 1, first_name: 'Admin', last_name: 'VeriHome' },
    created_at: '2025-09-15T14:00:00Z',
  },
];

export function propertyHandlers(): RouteHandler[] {
  return [
    async (url, route) => {
      if (!url.includes('/properties')) return false;
      const method = route.request().method();

      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'prop-new-001', ...MOCK_PROPERTIES[0] }),
        });
        return true;
      }

      // Single property detail
      if (url.match(/properties\/prop-\d+/)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PROPERTIES[0]),
        });
        return true;
      }

      // List with search/filter
      const urlObj = new URL(url);
      const search = urlObj.searchParams.get('search') || '';
      let filtered = [...MOCK_PROPERTIES];
      if (search) {
        filtered = filtered.filter(
          (p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.address.toLowerCase().includes(search.toLowerCase()),
        );
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: filtered, count: filtered.length, next: null, previous: null }),
      });
      return true;
    },
  ];
}

export const MOCK_CONTRACTS = [
  {
    id: 'contract-001',
    title: 'Contrato Apartamento Chapinero',
    property: { id: 'prop-001', title: 'Apartamento en Chapinero', address: 'Calle 72 #10-45' },
    tenant: { id: 2, first_name: 'Leidy', last_name: 'Tenant', email: 'tenant@verihome.com' },
    landlord: { id: 1, first_name: 'Admin', last_name: 'VeriHome' },
    status: 'active',
    start_date: '2025-10-01',
    end_date: '2026-10-01',
    monthly_rent: 2500000,
    deposit_amount: 2500000,
    payment_day: 5,
    duration_months: 12,
    created_at: '2025-09-28T10:00:00Z',
    biometric_status: 'completed',
  },
  {
    id: 'contract-002',
    title: 'Contrato Casa Usaquen',
    property: { id: 'prop-002', title: 'Casa en Usaquen', address: 'Carrera 7 #120-30' },
    tenant: null,
    landlord: { id: 1, first_name: 'Admin', last_name: 'VeriHome' },
    status: 'draft',
    start_date: '2025-12-01',
    end_date: '2026-12-01',
    monthly_rent: 4000000,
    deposit_amount: 4000000,
    payment_day: 1,
    duration_months: 12,
    created_at: '2025-11-15T14:00:00Z',
    biometric_status: 'pending',
  },
];

export function contractHandlers(): RouteHandler[] {
  return [
    async (url, route) => {
      if (!url.includes('/contracts') && !url.includes('/landlord/contracts')) return false;
      const method = route.request().method();

      // Biometric: start-authentication
      if (url.includes('start-authentication') && method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            authentication_id: 'bio-auth-001',
            status: 'started',
            message: 'Autenticacion biometrica iniciada correctamente.',
            steps: ['face_capture', 'document_verification', 'combined_capture', 'voice_recording', 'digital_signature'],
            current_step: 'face_capture',
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          }),
        });
        return true;
      }

      // Auth status
      if (url.includes('auth-status')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'pending', current_step: 'face_capture', completed_steps: [], confidence_scores: {} }),
        });
        return true;
      }

      // Single contract detail
      if (url.match(/contracts\/contract-\d+/) && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_CONTRACTS[0]),
        });
        return true;
      }

      // POST create
      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'contract-new-001', status: 'draft', ...MOCK_CONTRACTS[1] }),
        });
        return true;
      }

      // List
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: MOCK_CONTRACTS, count: MOCK_CONTRACTS.length, next: null, previous: null }),
      });
      return true;
    },
  ];
}

export const MOCK_MAINTENANCE = [
  {
    id: 'maint-001',
    title: 'Fuga de agua en el bano',
    description: 'Hay una fuga de agua en el lavamanos',
    property: { id: 'prop-001', title: 'Apartamento en Chapinero', address: 'Calle 72 #10-45' },
    tenant: { id: 2, first_name: 'Leidy', last_name: 'Tenant' },
    status: 'pending',
    priority: 'high',
    category: 'plumbing',
    created_at: '2025-11-10T08:30:00Z',
  },
  {
    id: 'maint-002',
    title: 'Aire acondicionado no funciona',
    description: 'El AC no enciende',
    property: { id: 'prop-001', title: 'Apartamento en Chapinero', address: 'Calle 72 #10-45' },
    tenant: { id: 2, first_name: 'Leidy', last_name: 'Tenant' },
    status: 'in_progress',
    priority: 'medium',
    category: 'hvac',
    created_at: '2025-11-05T14:00:00Z',
  },
];

export function maintenanceHandlers(): RouteHandler[] {
  return [
    async (url, route) => {
      if (!url.includes('/maintenance')) return false;
      const method = route.request().method();

      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'maint-new-001', title: 'Nueva solicitud', status: 'pending' }),
        });
        return true;
      }

      if (url.match(/maintenance\/maint-\d+/)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_MAINTENANCE[0]),
        });
        return true;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: MOCK_MAINTENANCE, count: MOCK_MAINTENANCE.length, next: null, previous: null }),
      });
      return true;
    },
  ];
}
