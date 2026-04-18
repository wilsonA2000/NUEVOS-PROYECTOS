/**
 * Tests for matchingService (MatchingServiceFixed class).
 * Covers match request CRUD, criteria, notifications, statistics,
 * contract integration, and utility functions.
 */

import { matchingService } from '../matchingService';
import api from '../api';

// Mock the API module
jest.mock('../api', () => {
  const mock = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
  return {
    __esModule: true,
    default: mock,
    api: mock,
  };
});

const mockedApi = api as jest.Mocked<typeof api>;

describe('MatchingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== MATCH REQUESTS =====

  describe('getMyMatchRequests', () => {
    it('should fetch all match requests', async () => {
      const mockData = [{ id: '1', status: 'pending' }];
      mockedApi.get.mockResolvedValueOnce({ data: mockData });

      const result = await matchingService.getMyMatchRequests();

      expect(mockedApi.get).toHaveBeenCalledWith('/matching/requests/');
      expect(result.data).toEqual(mockData);
    });

    it('should propagate errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(matchingService.getMyMatchRequests()).rejects.toThrow('Network Error');
    });
  });

  describe('getMatchRequest', () => {
    it('should fetch a single match request by id', async () => {
      const mockData = { id: 'match-1', status: 'pending' };
      mockedApi.get.mockResolvedValueOnce({ data: mockData });

      const result = await matchingService.getMatchRequest('match-1');

      expect(mockedApi.get).toHaveBeenCalledWith('/matching/requests/match-1/');
      expect(result.data).toEqual(mockData);
    });
  });

  describe('createMatchRequest', () => {
    it('should create a new match request', async () => {
      const requestData = {
        property: 'prop-1',
        tenant_message: 'I am interested',
        tenant_phone: '+573001234567',
        tenant_email: 'tenant@test.com',
        employment_type: 'employed',
        lease_duration_months: 12,
        has_rental_references: true,
        has_employment_proof: true,
        has_credit_check: false,
        number_of_occupants: 2,
        has_pets: false,
        smoking_allowed: false,
      };
      const mockResponse = { id: 'new-match', ...requestData };
      mockedApi.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await matchingService.createMatchRequest(requestData);

      expect(mockedApi.post).toHaveBeenCalledWith('/matching/requests/', requestData);
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('checkExistingMatchRequest', () => {
    it('should check for existing match request by property id', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: { exists: true } });

      await matchingService.checkExistingMatchRequest('prop-1');

      expect(mockedApi.get).toHaveBeenCalledWith('/matching/check-existing/', {
        params: { property_id: 'prop-1' },
      });
    });
  });

  describe('cancelMatchRequest', () => {
    it('should cancel match request by property id', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: { success: true } });

      await matchingService.cancelMatchRequest('prop-1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/matching/check-existing/', {
        params: { property_id: 'prop-1' },
      });
    });
  });

  describe('cancelMatchRequestById', () => {
    it('should cancel match request by its id', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

      await matchingService.cancelMatchRequestById('match-1');

      expect(mockedApi.post).toHaveBeenCalledWith('/matching/requests/match-1/cancel/');
    });
  });

  // ===== WORKFLOW ACTIONS =====

  describe('markMatchRequestViewed', () => {
    it('should mark request as viewed', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { status: 'viewed' } });

      await matchingService.markMatchRequestViewed('match-1');

      expect(mockedApi.post).toHaveBeenCalledWith('/matching/requests/match-1/mark_viewed/');
    });
  });

  describe('acceptMatchRequest', () => {
    it('should accept request with optional message', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { status: 'accepted' } });

      await matchingService.acceptMatchRequest('match-1', { message: 'Welcome!' });

      expect(mockedApi.post).toHaveBeenCalledWith('/matching/requests/match-1/accept/', {
        message: 'Welcome!',
      });
    });

    it('should accept request without data', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { status: 'accepted' } });

      await matchingService.acceptMatchRequest('match-1');

      expect(mockedApi.post).toHaveBeenCalledWith('/matching/requests/match-1/accept/', {});
    });
  });

  describe('rejectMatchRequest', () => {
    it('should reject request with reason', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { status: 'rejected' } });

      await matchingService.rejectMatchRequest('match-1', { message: 'Not suitable' });

      expect(mockedApi.post).toHaveBeenCalledWith('/matching/requests/match-1/reject/', {
        message: 'Not suitable',
      });
    });
  });

  // ===== MATCH CRITERIA =====

  describe('getMyCriteria', () => {
    it('should fetch user match criteria', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [{ id: 'c-1', max_price: 3000000 }] });

      const result = await matchingService.getMyCriteria();

      expect(mockedApi.get).toHaveBeenCalledWith('/matching/criteria/');
      expect(result.data).toBeDefined();
    });
  });

  describe('createCriteria', () => {
    it('should create match criteria', async () => {
      const criteriaData = { max_price: 3000000, min_bedrooms: 2 };
      mockedApi.post.mockResolvedValueOnce({ data: { id: 'c-1', ...criteriaData } });

      await matchingService.createCriteria(criteriaData);

      expect(mockedApi.post).toHaveBeenCalledWith('/matching/criteria/', criteriaData);
    });
  });

  describe('updateCriteria', () => {
    it('should update match criteria', async () => {
      mockedApi.patch.mockResolvedValueOnce({ data: { id: 'c-1', max_price: 4000000 } });

      await matchingService.updateCriteria('c-1', { max_price: 4000000 });

      expect(mockedApi.patch).toHaveBeenCalledWith('/matching/criteria/c-1/', { max_price: 4000000 });
    });
  });

  describe('deleteCriteria', () => {
    it('should delete match criteria', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: {} });

      await matchingService.deleteCriteria('c-1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/matching/criteria/c-1/');
    });
  });

  // ===== STATISTICS & DASHBOARD =====

  describe('getMatchStatistics', () => {
    it('should fetch match statistics', async () => {
      const stats = { pending: 5, accepted: 3, rejected: 1, response_rate: 0.8 };
      mockedApi.get.mockResolvedValueOnce({ data: stats });

      const result = await matchingService.getMatchStatistics();

      expect(mockedApi.get).toHaveBeenCalledWith('/matching/statistics/');
      expect(result.data).toEqual(stats);
    });
  });

  describe('getDashboardData', () => {
    it('should fetch dashboard data', async () => {
      const dashboard = { user_type: 'landlord', unread_notifications: 3 };
      mockedApi.get.mockResolvedValueOnce({ data: dashboard });

      const result = await matchingService.getDashboardData();

      expect(mockedApi.get).toHaveBeenCalledWith('/matching/dashboard/');
      expect(result.data.user_type).toBe('landlord');
    });
  });

  // ===== CONTRACT INTEGRATION =====

  describe('validateMatchForContract', () => {
    it('should validate a match for contract creation', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { valid: true } });

      const result = await matchingService.validateMatchForContract('match-1');

      expect(mockedApi.post).toHaveBeenCalledWith('/matching/requests/match-1/validate-contract/');
      expect(result.data.valid).toBe(true);
    });
  });

  describe('createContractFromMatch', () => {
    it('should create a contract from match', async () => {
      const contractData = { monthly_rent: 2500000, duration_months: 12 };
      mockedApi.post.mockResolvedValueOnce({ data: { contract_id: 'c-1' } });

      const result = await matchingService.createContractFromMatch('match-1', contractData);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/matching/requests/match-1/create-contract/',
        contractData,
      );
      expect(result.data.contract_id).toBe('c-1');
    });
  });

  // ===== UTILITY FUNCTIONS =====

  describe('getMatchStatusColor', () => {
    it('should return correct color for each status', () => {
      expect(matchingService.getMatchStatusColor('pending')).toBe('warning');
      expect(matchingService.getMatchStatusColor('viewed')).toBe('info');
      expect(matchingService.getMatchStatusColor('accepted')).toBe('success');
      expect(matchingService.getMatchStatusColor('rejected')).toBe('error');
      expect(matchingService.getMatchStatusColor('expired')).toBe('default');
      expect(matchingService.getMatchStatusColor('unknown')).toBe('default');
    });
  });

  describe('getMatchStatusText', () => {
    it('should return Spanish text for each status', () => {
      expect(matchingService.getMatchStatusText('pending')).toBe('Pendiente');
      expect(matchingService.getMatchStatusText('accepted')).toBe('Aceptada');
      expect(matchingService.getMatchStatusText('rejected')).toBe('Rechazada');
      expect(matchingService.getMatchStatusText('unknown')).toBe('unknown');
    });
  });

  describe('getPriorityColor', () => {
    it('should return correct color for each priority', () => {
      expect(matchingService.getPriorityColor('urgent')).toBe('error');
      expect(matchingService.getPriorityColor('high')).toBe('warning');
      expect(matchingService.getPriorityColor('medium')).toBe('primary');
      expect(matchingService.getPriorityColor('low')).toBe('default');
    });
  });

  describe('formatCurrency', () => {
    it('should format Colombian pesos', () => {
      const formatted = matchingService.formatCurrency(2500000);
      expect(formatted).toContain('2.500.000');
    });

    it('should return N/A for null', () => {
      expect(matchingService.formatCurrency(null)).toBe('N/A');
    });
  });

  describe('calculateDaysUntilExpiry', () => {
    it('should return null for null input', () => {
      expect(matchingService.calculateDaysUntilExpiry(null)).toBeNull();
    });

    it('should return positive number for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const result = matchingService.calculateDaysUntilExpiry(futureDate.toISOString());
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(6);
    });
  });

  describe('isMatchExpiringSoon', () => {
    it('should return true when expiring within threshold', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 2);
      expect(matchingService.isMatchExpiringSoon(soonDate.toISOString(), 3)).toBe(true);
    });

    it('should return false for null', () => {
      expect(matchingService.isMatchExpiringSoon(null)).toBe(false);
    });
  });

  describe('getContractStatusColor', () => {
    it('should return correct colors for contract statuses', () => {
      expect(matchingService.getContractStatusColor('DRAFT')).toBe('default');
      expect(matchingService.getContractStatusColor('ACTIVE')).toBe('success');
      expect(matchingService.getContractStatusColor('TERMINATED')).toBe('error');
      expect(matchingService.getContractStatusColor('PENDING_SIG')).toBe('info');
    });
  });

  describe('getEmploymentTypeText', () => {
    it('should return Spanish text for employment types', () => {
      expect(matchingService.getEmploymentTypeText('employed')).toBe('Empleado');
      expect(matchingService.getEmploymentTypeText('self_employed')).toBe('Independiente');
      expect(matchingService.getEmploymentTypeText('student')).toBe('Estudiante');
      expect(matchingService.getEmploymentTypeText('retired')).toBe('Jubilado');
    });
  });

  // ===== ERROR HANDLING =====

  describe('Error Handling', () => {
    it('should propagate errors on getMyMatchRequests', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Server Error'));

      await expect(matchingService.getMyMatchRequests()).rejects.toThrow('Server Error');
    });

    it('should propagate errors on createMatchRequest', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Validation Error'));

      await expect(
        matchingService.createMatchRequest({} as any),
      ).rejects.toThrow('Validation Error');
    });

    it('should propagate errors on acceptMatchRequest', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Not Found'));

      await expect(
        matchingService.acceptMatchRequest('invalid-id'),
      ).rejects.toThrow('Not Found');
    });
  });
});
