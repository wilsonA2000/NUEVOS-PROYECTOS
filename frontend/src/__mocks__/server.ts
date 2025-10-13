import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const baseUrl = 'http://localhost:8000/api/v1';

export const handlers = [
  // Auth endpoints
  http.get(`${baseUrl}/auth/me/`, () => {
    return HttpResponse.json({
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'admin',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
  }),

  // Properties endpoints
  http.get(`${baseUrl}/properties/properties/`, () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'Test Property 1',
        description: 'Test Description 1',
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zip_code: '12345',
        country: 'Test Country',
        property_type: 'house',
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1500,
        price: 250000,
        status: 'available',
        owner_id: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        title: 'Test Property 2',
        description: 'Test Description 2',
        address: '456 Test Ave',
        city: 'Test City',
        state: 'Test State',
        zip_code: '12345',
        country: 'Test Country',
        property_type: 'apartment',
        bedrooms: 2,
        bathrooms: 1,
        square_feet: 1000,
        price: 150000,
        status: 'rented',
        owner_id: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  http.get(`${baseUrl}/properties/properties/:id/`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id: Number(id),
      title: `Test Property ${id}`,
      description: `Test Description ${id}`,
      address: `${id}23 Test St`,
      city: 'Test City',
      state: 'Test State',
      zip_code: '12345',
      country: 'Test Country',
      property_type: 'house',
      bedrooms: 3,
      bathrooms: 2,
      square_feet: 1500,
      price: 250000,
      status: 'available',
      owner_id: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
  }),

  http.post(`${baseUrl}/properties/properties/`, () => {
    return HttpResponse.json({
      id: 3,
      title: 'New Property',
      description: 'New Description',
      address: '789 New St',
      city: 'New City',
      state: 'New State',
      zip_code: '54321',
      country: 'New Country',
      property_type: 'apartment',
      bedrooms: 2,
      bathrooms: 1,
      square_feet: 1000,
      price: 200000,
      status: 'available',
      owner_id: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
  }),

  http.put(`${baseUrl}/properties/properties/:id/`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id: Number(id),
      title: 'Updated Property',
      description: 'Updated Description',
      address: 'Updated Address',
      city: 'Updated City',
      state: 'Updated State',
      zip_code: '54321',
      country: 'Updated Country',
      property_type: 'house',
      bedrooms: 4,
      bathrooms: 3,
      square_feet: 2000,
      price: 300000,
      status: 'available',
      owner_id: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
  }),

  http.delete(`${baseUrl}/properties/properties/:id/`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Messages endpoints
  http.get(`${baseUrl}/messages/`, () => {
    return HttpResponse.json([
      {
        id: 1,
        sender_id: 2,
        recipient_id: 1,
        subject: 'Test Message 1',
        content: 'Test Content 1',
        is_read: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        sender_id: 3,
        recipient_id: 1,
        subject: 'Test Message 2',
        content: 'Test Content 2',
        is_read: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]);
  }),
];

export const server = setupServer(...handlers);