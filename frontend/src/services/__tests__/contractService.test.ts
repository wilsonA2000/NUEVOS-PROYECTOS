import contractService from '../services/contractService';
import { api } from '../api';
import { jest } from '@jest/globals';

// Mock the API
jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('ContractService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockContract = {
    id: '1',
    title: 'Test Contract',
    property_id: '1',
    landlord_id: '1',
    tenant_id: '2',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    monthly_rent: 1000,
    status: 'draft' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const mockCreateContractDto = {
    title: 'New Contract',
    property_id: '1',
    tenant_id: '2',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    monthly_rent: 1200
  };

  describe('getContracts', () => {
    it('should fetch all contracts successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockContract] });

      const result = await contractService.getContracts();

      expect(mockedApi.get).toHaveBeenCalledWith('/contracts/contracts/');
      expect(result).toEqual([mockContract]);
    });

    it('should handle API errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(contractService.getContracts()).rejects.toThrow('API Error');
    });
  });

  describe('getContract', () => {
    it('should fetch single contract successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockContract });

      const result = await contractService.getContract('1');

      expect(mockedApi.get).toHaveBeenCalledWith('/contracts/contracts/1/');
      expect(result).toEqual(mockContract);
    });
  });

  describe('createContract', () => {
    it('should create contract successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockContract });

      const result = await contractService.createContract(mockCreateContractDto);

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/contracts/', mockCreateContractDto);
      expect(result).toEqual(mockContract);
    });
  });

  describe('updateContract', () => {
    it('should update contract successfully', async () => {
      const updatedContract = { ...mockContract, title: 'Updated Contract' };
      mockedApi.put.mockResolvedValueOnce({ data: updatedContract });

      const result = await contractService.updateContract('1', { title: 'Updated Contract' });

      expect(mockedApi.put).toHaveBeenCalledWith('/contracts/contracts/1/', { title: 'Updated Contract' });
      expect(result).toEqual(updatedContract);
    });
  });

  describe('deleteContract', () => {
    it('should delete contract successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: {} });

      await contractService.deleteContract('1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/contracts/contracts/1/');
    });
  });

  describe('signContract', () => {
    it('should sign contract successfully', async () => {
      const signatureData = {
        signature: 'base64-signature-data',
        signed_at: '2024-01-01T12:00:00Z'
      };
      
      mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

      const result = await contractService.signContract('1', signatureData);

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/1/sign/', signatureData);
      expect(result).toEqual({ success: true });
    });
  });

  describe('verifySignature', () => {
    it('should verify signature successfully', async () => {
      const verificationData = {
        signature_hash: 'hash123',
        public_key: 'public-key-data'
      };
      
      mockedApi.post.mockResolvedValueOnce({ data: { valid: true } });

      const result = await contractService.verifySignature('1', verificationData);

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/1/verify-signature/', verificationData);
      expect(result).toEqual({ valid: true });
    });
  });

  describe('activateContract', () => {
    it('should activate contract successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { status: 'active' } });

      const result = await contractService.activateContract('1');

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/1/activate/');
      expect(result).toEqual({ status: 'active' });
    });
  });

  describe('uploadDocument', () => {
    it('should upload document successfully', async () => {
      const formData = new FormData();
      formData.append('file', new File(['test'], 'test.pdf'));
      
      mockedApi.post.mockResolvedValueOnce({ data: { document_id: 'doc123' } });

      const result = await contractService.uploadDocument('1', formData);

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/1/documents/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      expect(result).toEqual({ document_id: 'doc123' });
    });
  });

  describe('getExpiringContracts', () => {
    it('should fetch expiring contracts successfully', async () => {
      const expiringContracts = [
        { ...mockContract, end_date: '2024-02-01' }
      ];
      
      mockedApi.get.mockResolvedValueOnce({ data: expiringContracts });

      const result = await contractService.getExpiringContracts();

      expect(mockedApi.get).toHaveBeenCalledWith('/contracts/reports/expiring/');
      expect(result).toEqual(expiringContracts);
    });
  });

  describe('getPendingSignatures', () => {
    it('should fetch pending signatures successfully', async () => {
      const pendingSignatures = [
        { contract_id: '1', pending_party: 'tenant' }
      ];
      
      mockedApi.get.mockResolvedValueOnce({ data: pendingSignatures });

      const result = await contractService.getPendingSignatures();

      expect(mockedApi.get).toHaveBeenCalledWith('/contracts/reports/pending-signatures/');
      expect(result).toEqual(pendingSignatures);
    });
  });

  describe('getContractStats', () => {
    it('should fetch contract stats successfully', async () => {
      const stats = {
        total_contracts: 10,
        active_contracts: 7,
        pending_signatures: 2,
        expiring_soon: 1
      };
      
      mockedApi.get.mockResolvedValueOnce({ data: stats });

      const result = await contractService.getContractStats();

      expect(mockedApi.get).toHaveBeenCalledWith('/contracts/stats/');
      expect(result).toEqual(stats);
    });
  });
});