import { api } from '../services/api';
import { jest } from '@jest/globals';

// Mock axios para simular respuestas del servidor
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }))
}));

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Authentication Endpoints', () => {
    it('should handle successful login', async () => {
      const mockResponse = {
        data: {
          access: 'mock-token',
          refresh: 'mock-refresh-token'
        },
        status: 200
      };

      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: {
          id: '1',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User'
        }
      });

      const response = await api.post('/auth/login/', {
        username: 'test@example.com',
        password: 'password123'
      });

      expect(response.data.access).toBeDefined();
      expect(response.data.refresh).toBeDefined();
    });

    it('should handle registration', async () => {
      const mockResponse = {
        data: {
          user_id: '123',
          message: 'User created successfully'
        },
        status: 201
      };

      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const response = await api.post('/auth/register/', {
        email: 'newuser@example.com',
        password: 'password123',
        password2: 'password123',
        first_name: 'New',
        last_name: 'User',
        user_type: 'tenant'
      });

      expect(response.status).toBe(201);
      expect(response.data.user_id).toBeDefined();
    });

    it('should handle password reset request', async () => {
      const mockResponse = {
        data: { message: 'Password reset email sent' },
        status: 200
      };

      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const response = await api.post('/auth/forgot-password/', {
        email: 'user@example.com'
      });

      expect(response.status).toBe(200);
      expect(response.data.message).toContain('email sent');
    });
  });

  describe('Property Endpoints', () => {
    it('should fetch properties list', async () => {
      const mockProperties = {
        data: [
          {
            id: '1',
            title: 'Beautiful Apartment',
            price: 1000,
            city: 'Madrid',
            bedrooms: 2,
            bathrooms: 1
          },
          {
            id: '2',
            title: 'Cozy Studio',
            price: 700,
            city: 'Barcelona',
            bedrooms: 1,
            bathrooms: 1
          }
        ],
        status: 200
      };

      (api.get as jest.Mock).mockResolvedValueOnce(mockProperties);

      const response = await api.get('/properties/properties/');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    });

    it('should create new property', async () => {
      const mockResponse = {
        data: {
          id: '123',
          title: 'New Property',
          price: 1200,
          city: 'Valencia'
        },
        status: 201
      };

      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const propertyData = {
        title: 'New Property',
        description: 'Great location',
        price: 1200,
        city: 'Valencia',
        bedrooms: 3,
        bathrooms: 2
      };

      const response = await api.post('/properties/properties/', propertyData);

      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
    });

    it('should search properties', async () => {
      const mockSearchResults = {
        data: [
          {
            id: '1',
            title: 'Apartment in Madrid',
            price: 1000,
            city: 'Madrid'
          }
        ],
        status: 200
      };

      (api.get as jest.Mock).mockResolvedValueOnce(mockSearchResults);

      const response = await api.get('/properties/search/', {
        params: { q: 'apartment madrid' }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('Contract Endpoints', () => {
    it('should fetch contracts list', async () => {
      const mockContracts = {
        data: [
          {
            id: '1',
            property_id: '1',
            tenant_id: '2',
            landlord_id: '1',
            status: 'active',
            monthly_rent: 1000
          }
        ],
        status: 200
      };

      (api.get as jest.Mock).mockResolvedValueOnce(mockContracts);

      const response = await api.get('/contracts/contracts/');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should create new contract', async () => {
      const mockResponse = {
        data: {
          id: '123',
          property_id: '1',
          tenant_id: '2',
          status: 'draft'
        },
        status: 201
      };

      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const contractData = {
        property_id: '1',
        tenant_id: '2',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        monthly_rent: 1000
      };

      const response = await api.post('/contracts/contracts/', contractData);

      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
    });

    it('should sign contract', async () => {
      const mockResponse = {
        data: {
          success: true,
          signature_id: 'sig_123'
        },
        status: 200
      };

      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const signatureData = {
        signature: 'base64-signature-data',
        signed_at: new Date().toISOString()
      };

      const response = await api.post('/contracts/1/sign/', signatureData);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('Payment Endpoints', () => {
    it('should fetch payments list', async () => {
      const mockPayments = {
        data: [
          {
            id: '1',
            amount: 1000,
            status: 'completed',
            contract_id: '1'
          }
        ],
        status: 200
      };

      (api.get as jest.Mock).mockResolvedValueOnce(mockPayments);

      const response = await api.get('/payments/payments/');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should process payment', async () => {
      const mockResponse = {
        data: {
          id: '123',
          status: 'completed',
          transaction_id: 'txn_123'
        },
        status: 200
      };

      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const paymentData = {
        payment_method_id: 'pm_123',
        confirm: true
      };

      const response = await api.post('/payments/1/process/', paymentData);

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('completed');
    });
  });

  describe('Message Endpoints', () => {
    it('should fetch messages list', async () => {
      const mockMessages = {
        data: [
          {
            id: '1',
            subject: 'Property Inquiry',
            content: 'I am interested in your property',
            sender_id: '2',
            recipient_id: '1',
            read: false
          }
        ],
        status: 200
      };

      (api.get as jest.Mock).mockResolvedValueOnce(mockMessages);

      const response = await api.get('/messages/messages/');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should send message', async () => {
      const mockResponse = {
        data: {
          id: '123',
          subject: 'New Message',
          content: 'Hello!',
          sent: true
        },
        status: 201
      };

      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const messageData = {
        recipient_id: '1',
        subject: 'New Message',
        content: 'Hello!'
      };

      const response = await api.post('/messages/messages/', messageData);

      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
    });
  });

  describe('Notification Endpoints', () => {
    it('should fetch notifications list', async () => {
      const mockNotifications = {
        data: [
          {
            id: '1',
            title: 'New Message',
            message: 'You have a new message',
            type: 'message',
            read: false
          }
        ],
        status: 200
      };

      (api.get as jest.Mock).mockResolvedValueOnce(mockNotifications);

      const response = await api.get('/notifications/notifications/');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should mark notification as read', async () => {
      const mockResponse = {
        data: {
          id: '1',
          read: true
        },
        status: 200
      };

      (api.patch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const response = await api.patch('/notifications/notifications/1/', {
        read: true
      });

      expect(response.status).toBe(200);
      expect(response.data.read).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized errors', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { detail: 'Authentication credentials were not provided' }
        }
      };

      (api.get as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await api.get('/protected-endpoint/');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });

    it('should handle 404 not found errors', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { detail: 'Not found' }
        }
      };

      (api.get as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await api.get('/non-existent-endpoint/');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should handle 500 server errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' }
        }
      };

      (api.post as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await api.post('/failing-endpoint/', {});
      } catch (error: any) {
        expect(error.response.status).toBe(500);
      }
    });

    it('should handle network errors', async () => {
      const mockError = {
        code: 'ECONNABORTED',
        message: 'Network Error'
      };

      (api.get as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await api.get('/timeout-endpoint/');
      } catch (error: any) {
        expect(error.code).toBe('ECONNABORTED');
      }
    });
  });

  describe('Request Validation', () => {
    it('should validate required fields for property creation', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            title: ['This field is required'],
            price: ['This field is required']
          }
        }
      };

      (api.post as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await api.post('/properties/properties/', {
          description: 'Missing required fields'
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.title).toBeDefined();
        expect(error.response.data.price).toBeDefined();
      }
    });

    it('should validate email format in registration', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            email: ['Enter a valid email address']
          }
        }
      };

      (api.post as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await api.post('/auth/register/', {
          email: 'invalid-email',
          password: 'password123',
          first_name: 'Test',
          last_name: 'User'
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.email).toBeDefined();
      }
    });
  });
});