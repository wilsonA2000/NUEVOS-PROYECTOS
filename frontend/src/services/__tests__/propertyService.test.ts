import { propertyService } from '../propertyService';
import { api } from '../api';
import { jest } from '@jest/globals';

// Mock the API
jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('PropertyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProperty = {
    id: '1',
    title: 'Beautiful Apartment',
    description: 'A wonderful place to live',
    address: '123 Main St',
    city: 'Bogota',
    state: 'Cundinamarca',
    zip_code: '110111',
    country: 'Colombia',
    property_type: 'apartment' as const,
    bedrooms: 2,
    bathrooms: 1,
    square_meters: 80,
    price: 1500000,
    currency: 'COP',
    available: true,
    owner_id: '1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    images: [],
    amenities: [],
  };

  const mockCreatePropertyDto = {
    title: 'New Apartment',
    description: 'Great location',
    address: '456 Oak St',
    city: 'Medellin',
    state: 'Antioquia',
    zip_code: '050001',
    country: 'Colombia',
    property_type: 'apartment' as const,
    bedrooms: 3,
    bathrooms: 2,
    square_meters: 100,
    price: 2000000,
    currency: 'COP',
  };

  describe('getProperties', () => {
    it('should fetch all properties successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockProperty] });

      const result = await propertyService.getProperties();

      expect(mockedApi.get).toHaveBeenCalledWith('/properties/', {
        params: undefined,
      });
      expect(result).toEqual([mockProperty]);
    });

    it('should fetch properties with filters', async () => {
      const filters = {
        city: 'Bogota',
        min_price: 500000,
        max_price: 3000000,
        bedrooms: 2,
      };

      mockedApi.get.mockResolvedValueOnce({ data: [mockProperty] });

      const result = await propertyService.getProperties(filters);

      expect(mockedApi.get).toHaveBeenCalledWith('/properties/', {
        params: filters,
      });
      expect(result).toEqual([mockProperty]);
    });

    it('should handle paginated response with results field', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: { results: [mockProperty], count: 1 },
      });

      const result = await propertyService.getProperties();

      expect(result).toEqual([mockProperty]);
    });

    it('should handle API errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(propertyService.getProperties()).rejects.toThrow(
        'API Error'
      );
    });
  });

  describe('getProperty', () => {
    it('should fetch single property successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockProperty });

      const result = await propertyService.getProperty('1');

      expect(mockedApi.get).toHaveBeenCalledWith('/properties/1/');
      expect(result).toEqual(mockProperty);
    });
  });

  describe('createProperty', () => {
    it('should create property successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockProperty });

      const result = await propertyService.createProperty(
        mockCreatePropertyDto
      );

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/properties/',
        mockCreatePropertyDto,
        undefined
      );
      expect(result).toEqual(mockProperty);
    });

    it('should create property with FormData', async () => {
      const formData = new FormData();
      formData.append('title', 'New Apartment');

      mockedApi.post.mockResolvedValueOnce({ data: mockProperty });

      const result = await propertyService.createProperty(formData);

      expect(mockedApi.post).toHaveBeenCalledWith('/properties/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(result).toEqual(mockProperty);
    });

    it('should handle validation errors', async () => {
      const mockError = new Error('Validation failed');

      mockedApi.post.mockRejectedValueOnce(mockError);

      await expect(
        propertyService.createProperty(mockCreatePropertyDto)
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('updateProperty', () => {
    it('should update property successfully', async () => {
      const updatedProperty = { ...mockProperty, title: 'Updated Apartment' };
      mockedApi.put.mockResolvedValueOnce({ data: updatedProperty });

      const result = await propertyService.updateProperty('1', {
        title: 'Updated Apartment',
      });

      expect(mockedApi.put).toHaveBeenCalledWith(
        '/properties/1/',
        { title: 'Updated Apartment' },
        undefined
      );
      expect(result).toEqual(updatedProperty);
    });

    it('should update property with FormData', async () => {
      const formData = new FormData();
      formData.append('title', 'Updated');

      mockedApi.put.mockResolvedValueOnce({ data: mockProperty });

      const result = await propertyService.updateProperty('1', formData);

      expect(mockedApi.put).toHaveBeenCalledWith('/properties/1/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(result).toEqual(mockProperty);
    });
  });

  describe('deleteProperty', () => {
    it('should delete property successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: {} });

      await propertyService.deleteProperty('1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/properties/1/');
    });
  });

  describe('searchProperties', () => {
    it('should search properties successfully', async () => {
      const filters = { city: 'Bogota', min_price: 500000 };
      mockedApi.get.mockResolvedValueOnce({ data: [mockProperty] });

      const result = await propertyService.searchProperties(filters);

      expect(mockedApi.get).toHaveBeenCalledWith('/properties/search/', {
        params: filters,
      });
      expect(result).toEqual([mockProperty]);
    });

    it('should handle paginated search response', async () => {
      const filters = { city: 'Bogota' };
      mockedApi.get.mockResolvedValueOnce({
        data: { results: [mockProperty], count: 1 },
      });

      const result = await propertyService.searchProperties(filters);

      expect(result).toEqual([mockProperty]);
    });
  });

  describe('getFeaturedProperties', () => {
    it('should fetch featured properties successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockProperty] });

      const result = await propertyService.getFeaturedProperties();

      expect(mockedApi.get).toHaveBeenCalledWith('/properties/featured/');
      expect(result).toEqual([mockProperty]);
    });
  });

  describe('getTrendingProperties', () => {
    it('should fetch trending properties successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockProperty] });

      const result = await propertyService.getTrendingProperties();

      expect(mockedApi.get).toHaveBeenCalledWith('/properties/trending/');
      expect(result).toEqual([mockProperty]);
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: { message: 'Added to favorites' },
      });

      const result = await propertyService.toggleFavorite('1');

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/properties/1/toggle-favorite/'
      );
      expect(result).toEqual({ message: 'Added to favorites' });
    });
  });

  describe('getFavorites', () => {
    it('should fetch user favorites successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockProperty] });

      const result = await propertyService.getFavorites();

      expect(mockedApi.get).toHaveBeenCalledWith('/properties/favorites/');
      expect(result).toEqual([mockProperty]);
    });
  });

  describe('getPropertyStats', () => {
    it('should fetch property statistics successfully', async () => {
      const stats = {
        total_properties: 10,
        available_properties: 7,
        rented_properties: 3,
        average_price: 1500000,
      };

      mockedApi.get.mockResolvedValueOnce({ data: stats });

      const result = await propertyService.getPropertyStats();

      expect(mockedApi.get).toHaveBeenCalledWith('/properties/stats/');
      expect(result).toEqual(stats);
    });
  });

  describe('getPropertyFilters', () => {
    it('should fetch property filters successfully', async () => {
      const filters = {
        cities: ['Bogota', 'Medellin'],
        types: ['apartment', 'house'],
      };

      mockedApi.get.mockResolvedValueOnce({ data: filters });

      const result = await propertyService.getPropertyFilters();

      expect(mockedApi.get).toHaveBeenCalledWith('/properties/filters/');
      expect(result).toEqual(filters);
    });
  });

  describe('contactLandlord', () => {
    it('should contact landlord successfully', async () => {
      const contactData = {
        name: 'John',
        email: 'john@example.com',
        message: 'Interested',
      };

      mockedApi.post.mockResolvedValueOnce({
        data: { message: 'Message sent' },
      });

      const result = await propertyService.contactLandlord('1', contactData);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/properties/1/contact-landlord/',
        contactData
      );
      expect(result).toEqual({ message: 'Message sent' });
    });
  });
});
