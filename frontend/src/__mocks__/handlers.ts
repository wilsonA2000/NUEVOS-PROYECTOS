import { http, HttpResponse } from 'msw';

// Mock API handlers for testing
export const handlers = [
  // Auth endpoints
  http.post('/api/v1/auth/login/', () => {
    return HttpResponse.json({
      access: 'mock-access-token',
      refresh: 'mock-refresh-token',
    });
  }),

  http.post('/api/v1/auth/register/', () => {
    return HttpResponse.json({
      user_id: 1,
    }, { status: 201 });
  }),

  http.get('/api/v1/auth/me/', () => {
    return HttpResponse.json({
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      user_type: 'tenant',
      is_verified: true,
      phone_number: '+57 300 123 4567',
      avatar: null,
    });
  }),

  http.post('/api/v1/auth/logout/', () => {
    return HttpResponse.json({});
  }),

  // Properties endpoints
  http.get('/api/v1/properties/', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const propertyType = url.searchParams.get('property_type');
    
    let properties = [
      {
        id: 1,
        title: 'Apartamento en el centro',
        description: 'Hermoso apartamento con vista al parque',
        property_type: 'apartment',
        address: 'Calle 123 #45-67',
        city: 'Bogotá',
        state: 'Cundinamarca',
        country: 'Colombia',
        postal_code: '110111',
        price: 2500000,
        bedrooms: 3,
        bathrooms: 2,
        area: 120,
        is_available: true,
        images: [
          { id: 1, image: '/media/property1.jpg', is_primary: true },
        ],
        landlord: {
          id: 1,
          first_name: 'Juan',
          last_name: 'Pérez',
          email: 'juan@example.com',
        },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
      {
        id: 2,
        title: 'Casa amplia en zona residencial',
        description: 'Casa familiar con jardín',
        property_type: 'house',
        address: 'Carrera 10 #20-30',
        city: 'Medellín',
        state: 'Antioquia',
        country: 'Colombia',
        postal_code: '050001',
        price: 3500000,
        bedrooms: 4,
        bathrooms: 3,
        area: 200,
        is_available: true,
        images: [
          { id: 2, image: '/media/property2.jpg', is_primary: true },
        ],
        landlord: {
          id: 2,
          first_name: 'María',
          last_name: 'González',
          email: 'maria@example.com',
        },
        created_at: '2025-01-02T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      },
    ];

    // Filter by search
    if (search) {
      properties = properties.filter(property =>
        property.title.toLowerCase().includes(search.toLowerCase()) ||
        property.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by property type
    if (propertyType) {
      properties = properties.filter(property => property.property_type === propertyType);
    }

    return HttpResponse.json({
      results: properties,
      count: properties.length,
      next: null,
      previous: null,
    });
  }),

  http.get('/api/v1/properties/:id/', ({ params }) => {
    const { id } = params;
    
    if (id === '1') {
      return HttpResponse.json({
        id: 1,
        title: 'Apartamento en el centro',
        description: 'Hermoso apartamento con vista al parque',
        property_type: 'apartment',
        address: 'Calle 123 #45-67',
        city: 'Bogotá',
        state: 'Cundinamarca',
        country: 'Colombia',
        postal_code: '110111',
        price: 2500000,
        bedrooms: 3,
        bathrooms: 2,
        area: 120,
        is_available: true,
        images: [
          { id: 1, image: '/media/property1.jpg', is_primary: true },
        ],
        latitude: 4.5709,
        longitude: -74.2973,
        landlord: {
          id: 1,
          first_name: 'Juan',
          last_name: 'Pérez',
          email: 'juan@example.com',
        },
        amenities: ['Parqueadero', 'Gimnasio', 'Piscina'],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      });
    }

    return HttpResponse.json(
      { detail: 'Propiedad no encontrada' },
      { status: 404 }
    );
  }),

  http.post('/api/v1/properties/', () => {
    return HttpResponse.json({
      id: 3,
      title: 'Nueva Propiedad',
      description: 'Propiedad creada por test',
      property_type: 'apartment',
      price: 2000000,
      bedrooms: 2,
      bathrooms: 1,
      area: 80,
      city: 'Cali',
      is_available: true,
      created_at: '2025-01-03T00:00:00Z',
      updated_at: '2025-01-03T00:00:00Z',
    }, { status: 201 });
  }),

  http.put('/api/v1/properties/:id/', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id: Number(id),
      title: 'Propiedad Actualizada',
      price: 2800000,
      updated_at: new Date().toISOString(),
    });
  }),

  http.delete('/api/v1/properties/:id/', () => {
    return HttpResponse.json({}, { status: 204 });
  }),

  http.post('/api/v1/properties/:id/toggle-favorite/', () => {
    return HttpResponse.json({
      is_favorite: true,
    });
  }),

  http.get('/api/v1/properties/favorites/', () => {
    return HttpResponse.json({
      results: [
        {
          id: 1,
          title: 'Apartamento favorito',
          price: 2500000,
          is_favorite: true,
        },
      ],
      count: 1,
      next: null,
      previous: null,
    });
  }),

  http.get('/api/v1/properties/search/', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    
    if (query?.includes('apartamento')) {
      return HttpResponse.json({
        results: [
          {
            id: 1,
            title: 'Apartamento en el centro',
            price: 2500000,
          },
        ],
        count: 1,
      });
    }

    return HttpResponse.json({
      results: [],
      count: 0,
    });
  }),

  // Messages endpoints
  http.post('/api/v1/messages/', () => {
    return HttpResponse.json({
      id: 1,
      subject: 'Consulta sobre propiedad',
      content: 'Estoy interesado en esta propiedad',
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  // Contracts endpoints
  http.get('/api/v1/contracts/', () => {
    return HttpResponse.json({
      results: [
        {
          id: 1,
          property: {
            id: 1,
            title: 'Apartamento en el centro',
          },
          tenant: {
            id: 1,
            first_name: 'Juan',
            last_name: 'Tenant',
          },
          status: 'active',
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          monthly_rent: 2500000,
        },
      ],
      count: 1,
    });
  }),

  http.post('/api/v1/contracts/', () => {
    return HttpResponse.json({
      id: 2,
      status: 'pending',
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  // Payments endpoints
  http.get('/api/v1/payments/', () => {
    return HttpResponse.json({
      results: [
        {
          id: 1,
          amount: 2500000,
          status: 'completed',
          payment_date: '2025-01-01T00:00:00Z',
          contract: {
            id: 1,
            property: {
              title: 'Apartamento en el centro',
            },
          },
        },
      ],
      count: 1,
    });
  }),

  http.post('/api/v1/payments/', () => {
    return HttpResponse.json({
      id: 2,
      amount: 2500000,
      status: 'pending',
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  // Error handlers for testing error scenarios
  http.post('/api/v1/auth/login/error', () => {
    return HttpResponse.json(
      { detail: 'Credenciales inválidas' },
      { status: 401 }
    );
  }),

  http.get('/api/v1/properties/error', () => {
    return HttpResponse.json(
      { detail: 'Error del servidor' },
      { status: 500 }
    );
  }),

  // Network error simulation
  http.get('/api/v1/network-error', () => {
    throw new Error('Network Error');
  }),
];

// Export individual handlers for test customization
export const authHandlers = handlers.filter(handler => 
  handler.info.path?.includes('/auth/')
);

export const propertyHandlers = handlers.filter(handler => 
  handler.info.path?.includes('/properties/')
);

export const messageHandlers = handlers.filter(handler => 
  handler.info.path?.includes('/messages/')
);

export const contractHandlers = handlers.filter(handler => 
  handler.info.path?.includes('/contracts/')
);

export const paymentHandlers = handlers.filter(handler => 
  handler.info.path?.includes('/payments/')
);