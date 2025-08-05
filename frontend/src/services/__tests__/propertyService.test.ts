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
    city: 'Madrid',
    state: 'Madrid',
    zip_code: '28001',
    country: 'Spain',
    property_type: 'apartment' as const,
    bedrooms: 2,
    bathrooms: 1,
    square_meters: 80,
    price: 1000,
    currency: 'EUR',
    available: true,
    owner_id: '1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    images: [],
    amenities: []
  };

  const mockCreatePropertyDto = {
    title: 'New Apartment',
    description: 'Great location',
    address: '456 Oak St',
    city: 'Barcelona',
    state: 'Catalonia',
    zip_code: '08001',
    country: 'Spain',
    property_type: 'apartment' as const,
    bedrooms: 3,
    bathrooms: 2,
    square_meters: 100,
    price: 1200,
    currency: 'EUR'
  };

  describe('getProperties', () => {
    it('should fetch all properties successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockProperty] });

      const result = await propertyService.getProperties();

      expect(mockedApi.get).toHaveBeenCalledWith('/properties/properties/');
      expect(result).toEqual([mockProperty]);
    });

    it('should fetch properties with filters', async () => {
      const filters = {
        city: 'Madrid',
        min_price: 500,
        max_price: 1500,
        bedrooms: 2
      };

      mockedApi.get.mockResolvedValueOnce({ data: [mockProperty] });

      const result = await propertyService.getProperties(filters);

      expect(mockedApi.get).toHaveBeenCalledWith('/properties/properties/', { params: filters });
      expect(result).toEqual([mockProperty]);
    });

    it('should handle API errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(propertyService.getProperties()).rejects.toThrow('API Error');
    });
  });

  describe('getProperty', () => {
    it('should fetch single property successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockProperty });

      const result = await propertyService.getProperty('1');

      expect(mockedApi.get).toHaveBeenCalledWith('/properties/properties/1/');
      expect(result).toEqual(mockProperty);
    });
  });

  describe('createProperty', () => {
    it('should create property successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockProperty });

      const result = await propertyService.createProperty(mockCreatePropertyDto);

      expect(mockedApi.post).toHaveBeenCalledWith('/properties/properties/', mockCreatePropertyDto);
      expect(result).toEqual(mockProperty);
    });

    it('should handle validation errors', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { title: ['This field is required'] }
        }
      };

      mockedApi.post.mockRejectedValueOnce(mockError);

      await expect(propertyService.createProperty(mockCreatePropertyDto)).rejects.toThrow();
    });
  });

  describe('updateProperty', () => {
    it('should update property successfully', async () => {
      const updatedProperty = { ...mockProperty, title: 'Updated Apartment' };
      mockedApi.put.mockResolvedValueOnce({ data: updatedProperty });

      const result = await propertyService.updateProperty('1', { title: 'Updated Apartment' });

      expect(mockedApi.put).toHaveBeenCalledWith('/properties/properties/1/', { title: 'Updated Apartment' });
      expect(result).toEqual(updatedProperty);
    });
  });

  describe('deleteProperty', () => {
    it('should delete property successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: {} });

      await propertyService.deleteProperty('1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/properties/properties/1/');
    });
  });

  describe('searchProperties', () => {
    it('should search properties successfully', async () => {
      const searchQuery = 'apartment madrid';
      mockedApi.get.mockResolvedValueOnce({ data: [mockProperty] });

      const result = await propertyService.searchProperties(searchQuery);

      expect(mockedApi.get).toHaveBeenCalledWith('/properties/search/', { params: { q: searchQuery } });
      expect(result).toEqual([mockProperty]);
    });

    it('should search with filters', async () => {
      const searchQuery = 'apartment';
      const filters = { city: 'Madrid', min_price: 500 };
      
      mockedApi.get.mockResolvedValueOnce({ data: [mockProperty] });

      const result = await propertyService.searchProperties(searchQuery, filters);

      expect(mockedApi.get).toHaveBeenCalledWith('/properties/search/', { 
        params: { q: searchQuery, ...filters } 
      });
      expect(result).toEqual([mockProperty]);
    });
  });

  describe('uploadImages', () => {
    it('should upload images successfully', async () => {
      const formData = new FormData();
      formData.append('images', new File(['test'], 'test.jpg'));
      
      mockedApi.post.mockResolvedValueOnce({ data: { images: ['image1.jpg'] } });

      const result = await propertyService.uploadImages('1', formData);

      expect(mockedApi.post).toHaveBeenCalledWith('/properties/1/images/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      expect(result).toEqual({ images: ['image1.jpg'] });
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

  describe('addToFavorites', () => {
    it('should add property to favorites successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

      const result = await propertyService.addToFavorites('1');

      expect(mockedApi.post).toHaveBeenCalledWith('/properties/1/favorites/');
      expect(result).toEqual({ success: true });
    });
  });

  describe('removeFromFavorites', () => {
    it('should remove property from favorites successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: { success: true } });

      const result = await propertyService.removeFromFavorites('1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/properties/1/favorites/');
      expect(result).toEqual({ success: true });
    });
  });

  describe('getPropertyStats', () => {
    it('should fetch property statistics successfully', async () => {
      const stats = {
        total_properties: 10,
        available_properties: 7,
        rented_properties: 3,
        average_price: 1100
      };
      
      mockedApi.get.mockResolvedValueOnce({ data: stats });

      const result = await propertyService.getPropertyStats();

      expect(mockedApi.get).toHaveBeenCalledWith('/properties/stats/');
      expect(result).toEqual(stats);
    });
  });

  describe('getRecommendations', () => {
    it('should fetch property recommendations successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockProperty] });

      const result = await propertyService.getRecommendations('1');

      expect(mockedApi.get).toHaveBeenCalledWith('/properties/1/recommendations/');
      expect(result).toEqual([mockProperty]);
    });
  });

  describe('reportProperty', () => {
    it('should report property successfully', async () => {
      const reportData = {
        reason: 'inappropriate_content',
        description: 'This listing contains false information'
      };
      
      mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

      const result = await propertyService.reportProperty('1', reportData);

      expect(mockedApi.post).toHaveBeenCalledWith('/properties/1/report/', reportData);
      expect(result).toEqual({ success: true });
    });
  });
});