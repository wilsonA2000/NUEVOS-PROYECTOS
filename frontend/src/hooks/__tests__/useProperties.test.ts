import { renderHook, waitFor } from '@testing-library/react';
import { useProperties } from '../useProperties';
import { createWrapper } from '../../test-utils';
import mockAxios from '../../__mocks__/axios';
import { Property } from '../../types/property';
import '@testing-library/jest-dom';

jest.mock('../useLanguage', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: jest.fn(),
    t: (key: string) => key,
  }),
}));

describe('useProperties', () => {
  const mockProperties: Property[] = [
    {
      id: 'uuid-test-1',
      landlord: {
        id: 1,
        email: 'landlord@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'landlord'
      },
      title: 'Test Property 1',
      description: 'Test Description 1',
      property_type: 'house',
      listing_type: 'rent',
      status: 'available',
      address: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country',
      postal_code: '12345',
      latitude: 4.5709,
      longitude: -74.2973,
      bedrooms: 3,
      bathrooms: 2,
      half_bathrooms: 0,
      total_area: 150,
      built_area: 140,
      lot_area: 200,
      parking_spaces: 2,
      floors: 2,
      floor_number: 1,
      year_built: 2020,
      rent_price: 1000,
      sale_price: 250000,
      security_deposit: 1000,
      maintenance_fee: 100,
      minimum_lease_term: 12,
      maximum_lease_term: 24,
      pets_allowed: true,
      smoking_allowed: false,
      furnished: false,
      utilities_included: [],
      property_features: [],
      nearby_amenities: [],
      transportation: [],
      available_from: '2024-01-01',
      last_updated: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      views_count: 10,
      favorites_count: 2,
      is_featured: false,
      is_active: true,
      images: [],
      videos: [],
      amenity_relations: [],
      main_image_url: '',
      formatted_price: '$1,000',
      is_favorited: false
    },
    {
      id: 'uuid-test-2',
      landlord: {
        id: 1,
        email: 'landlord@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'landlord'
      },
      title: 'Test Property 2',
      description: 'Test Description 2',
      property_type: 'apartment',
      listing_type: 'rent',
      status: 'rented',
      address: '456 Test Ave',
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country',
      postal_code: '12345',
      latitude: 4.5709,
      longitude: -74.2973,
      bedrooms: 2,
      bathrooms: 1,
      half_bathrooms: 0,
      total_area: 90,
      built_area: 85,
      lot_area: 0,
      parking_spaces: 1,
      floors: 1,
      floor_number: 3,
      year_built: 2018,
      rent_price: 700,
      security_deposit: 700,
      maintenance_fee: 50,
      minimum_lease_term: 12,
      pets_allowed: false,
      smoking_allowed: false,
      furnished: true,
      utilities_included: ['water', 'electricity'],
      property_features: ['balcony'],
      nearby_amenities: ['gym'],
      transportation: ['metro'],
      available_from: '2024-01-01',
      last_updated: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      views_count: 5,
      favorites_count: 1,
      is_featured: false,
      is_active: true,
      images: [],
      videos: [],
      amenity_relations: [],
      main_image_url: '',
      formatted_price: '$700',
      is_favorited: false
    },
  ];

  const mockNewProperty: Property = {
    id: 'uuid-test-3',
    landlord: {
      id: 1,
      email: 'landlord@test.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'landlord'
    },
    title: 'New Test Property',
    description: 'New Test Description',
    property_type: 'house',
    listing_type: 'rent',
    status: 'available',
    address: '789 Test Blvd',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    postal_code: '12345',
    latitude: 4.5709,
    longitude: -74.2973,
    bedrooms: 4,
    bathrooms: 3,
    half_bathrooms: 1,
    total_area: 200,
    built_area: 180,
    lot_area: 300,
    parking_spaces: 2,
    floors: 2,
    floor_number: 1,
    year_built: 2022,
    rent_price: 1200,
    sale_price: 300000,
    security_deposit: 1200,
    maintenance_fee: 150,
    minimum_lease_term: 12,
    maximum_lease_term: 24,
    pets_allowed: true,
    smoking_allowed: false,
    furnished: false,
    utilities_included: [],
    property_features: [],
    nearby_amenities: [],
    transportation: [],
    available_from: '2024-01-01',
    last_updated: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    views_count: 0,
    favorites_count: 0,
    is_featured: false,
    is_active: true,
    images: [],
    videos: [],
    amenity_relations: [],
    main_image_url: '',
    formatted_price: '$1,200',
    is_favorited: false
  };

  const mockUpdatedProperty: Property = {
    ...mockProperties[0],
    status: 'rented',
  };

  // Variable local para simular el estado mutable de las propiedades
  let propertiesState: Property[];

  beforeEach(() => {
    mockAxios.__resetMockData();
    propertiesState = [...mockProperties];
    mockAxios.__setMockData({ get: propertiesState });

    // Configurar los mocks de axios para que usen propertiesState
    mockAxios.__setMockData({
      get: propertiesState,
      post: (data: any) => {
        const newProperty = { 
          ...mockNewProperty, 
          ...data, 
          id: `uuid-test-${propertiesState.length + 1}`, 
          created_at: '2024-01-01T00:00:00Z', 
          last_updated: '2024-01-01T00:00:00Z' 
        };
        propertiesState.push(newProperty);
        return newProperty;
      },
      patch: (data: any) => {
        const index = propertiesState.findIndex(p => p.id === data.id);
        if (index !== -1) {
          propertiesState[index] = { ...propertiesState[index], ...data.data, last_updated: '2024-01-01T00:00:00Z' };
        }
        return propertiesState[index];
      },
      delete: (id: string) => {
        const index = propertiesState.findIndex(p => p.id === id);
        if (index !== -1) {
          propertiesState.splice(index, 1);
        }
        return true;
      },
    });
  });

  it('should fetch properties successfully', async () => {
    const { result } = renderHook(() => useProperties(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.properties).toBeDefined();
      expect(result.current.properties).toHaveLength(2);
    });
  });

  it('should filter properties by status', async () => {
    const { result } = renderHook(() => useProperties(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.properties).toBeDefined();
    });

    const availableProperties = result.current.properties?.filter(
      (property) => property.status === 'available'
    );

    expect(availableProperties).toHaveLength(1);
    expect(availableProperties?.[0].status).toBe('available');
  });

  it('should create a new property', async () => {
    const { result } = renderHook(() => useProperties(), { wrapper: createWrapper() });

    const newProperty = {
      title: 'New Property',
      description: 'New Description',
      property_type: 'house' as const,
      listing_type: 'rent' as const,
      status: 'available' as const,
      address: 'New Address',
      city: 'New City',
      state: 'New State',
      country: 'New Country',
      postal_code: '12345',
      bedrooms: 3,
      bathrooms: 2,
      half_bathrooms: 0,
      total_area: 200,
      parking_spaces: 2,
      floors: 2,
      rent_price: 1500,
      minimum_lease_term: 12,
      pets_allowed: false,
      smoking_allowed: false,
      furnished: false,
      utilities_included: [],
      property_features: [],
      nearby_amenities: [],
      transportation: [],
      is_featured: false,
      is_active: true,
    };

    await result.current.create.mutateAsync(newProperty);

    await waitFor(() => {
      expect(result.current.properties).toHaveLength(3);
      const lastProperty = result.current.properties?.[result.current.properties.length - 1];
      expect(lastProperty?.title).toBe('New Property');
    });
  });

  it('should update a property', async () => {
    const { result } = renderHook(() => useProperties(), { wrapper: createWrapper() });

    const updatedData = {
      title: 'Updated Property',
      price: 1500
    };

    await result.current.update.mutateAsync({ id: 'uuid-test-1', data: updatedData });

    await waitFor(() => {
      expect(result.current.properties?.[0].title).toBe('Updated Property');
      expect(result.current.properties?.[0].price).toBe(1500);
    });
  });

  it('should delete a property', async () => {
    const { result } = renderHook(() => useProperties(), { wrapper: createWrapper() });

    await result.current.remove.mutateAsync('uuid-test-1');

    await waitFor(() => {
      expect(result.current.properties).toHaveLength(1);
      expect(result.current.properties?.[0].id).toBe('uuid-test-2');
    });
  });
}); 