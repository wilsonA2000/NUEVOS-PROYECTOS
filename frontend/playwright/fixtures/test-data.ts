/**
 * Test Data Fixtures para Playwright Tests
 */

export const CREDENTIALS = {
  landlord: {
    email: 'admin@verihome.com',
    password: 'admin123',
    name: 'Admin VeriHome',
  },
  tenant: {
    email: 'letefon100@gmail.com',
    password: 'adim123',
    name: 'Leidy Tenant',
  },
  serviceProvider: {
    email: 'serviceprovider@verihome.com',
    password: 'service123',
    name: 'Proveedor Servicios Test',
  },
};

export const TEST_PROPERTY = {
  title: 'Apartamento Test E2E',
  description: 'Propiedad creada automáticamente por Playwright',
  type: 'apartment',
  address: 'Calle 100 #15-20',
  city: 'Bogotá',
  state: 'Cundinamarca',
  zipCode: '110111',
  area: 80,
  bedrooms: 2,
  bathrooms: 2,
  price: 1500000,
  deposit: 1500000,
};

export const TEST_CONTRACT = {
  duration: 12,
  paymentDay: 5,
  utilitiesIncluded: true,
  petsAllowed: false,
  smokingAllowed: false,
};
