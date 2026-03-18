/**
 * Comprehensive tests for contractService
 * Covers CRUD operations, biometric authentication flow (9 methods),
 * Colombian contract integration, and error handling.
 */

import { contractService } from '../contractService';
import { api } from '../api';

// Mock the API module
jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('ContractService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockContract = {
    id: 'contract-1',
    title: 'Test Contract',
    property_id: 'prop-1',
    landlord_id: 'landlord-1',
    tenant_id: 'tenant-1',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    monthly_rent: 2500000,
    status: 'draft' as const,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  // ===== CRUD OPERATIONS =====

  describe('getContracts', () => {
    it('should fetch all contracts as array', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockContract] });

      const result = await contractService.getContracts();

      expect(mockedApi.get).toHaveBeenCalledWith('/contracts/contracts/', { params: undefined });
      expect(result).toEqual([mockContract]);
    });

    it('should handle paginated response', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: { results: [mockContract], count: 1 } });

      const result = await contractService.getContracts();

      expect(result).toEqual([mockContract]);
    });

    it('should return empty array for unexpected response format', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: null });

      const result = await contractService.getContracts();

      expect(result).toEqual([]);
    });

    it('should pass filters to API', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockContract] });
      const filters = { status: 'active' };

      await contractService.getContracts(filters as any);

      expect(mockedApi.get).toHaveBeenCalledWith('/contracts/contracts/', { params: filters });
    });
  });

  describe('getContract', () => {
    it('should fetch single contract by id', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockContract });

      const result = await contractService.getContract('contract-1');

      expect(mockedApi.get).toHaveBeenCalledWith('/contracts/contracts/contract-1/');
      expect(result).toEqual(mockContract);
    });
  });

  describe('createContract', () => {
    it('should create a new contract', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockContract });
      const contractData = { title: 'New Contract', property_id: 'prop-1' };

      const result = await contractService.createContract(contractData as any);

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/contracts/', contractData);
      expect(result).toEqual(mockContract);
    });
  });

  describe('updateContract', () => {
    it('should update contract with PATCH', async () => {
      const updatedContract = { ...mockContract, title: 'Updated' };
      mockedApi.patch.mockResolvedValueOnce({ data: updatedContract });

      const result = await contractService.updateContract('contract-1', { title: 'Updated' } as any);

      expect(mockedApi.patch).toHaveBeenCalledWith('/contracts/contracts/contract-1/', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });
  });

  describe('deleteContract', () => {
    it('should delete contract', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: {} });

      await contractService.deleteContract('contract-1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/contracts/contracts/contract-1/');
    });
  });

  // ===== BIOMETRIC AUTHENTICATION FLOW (9 METHODS) =====

  describe('startBiometricAuthentication', () => {
    it('should start biometric authentication process', async () => {
      const authResponse = { authentication_id: 'auth-123', status: 'started', voice_text: 'Acepto los terminos' };
      mockedApi.post.mockResolvedValueOnce({ data: authResponse });

      const result = await contractService.startBiometricAuthentication('contract-1');

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/contract-1/start-authentication/');
      expect(result).toEqual(authResponse);
    });

    it('should propagate errors', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Authentication failed'));

      await expect(contractService.startBiometricAuthentication('contract-1')).rejects.toThrow('Authentication failed');
    });
  });

  describe('processFaceCapture', () => {
    it('should send front and side images for face capture', async () => {
      const captureResponse = { success: true, face_confidence: 0.95 };
      mockedApi.post.mockResolvedValueOnce({ data: captureResponse });

      const result = await contractService.processFaceCapture('contract-1', 'base64-front', 'base64-side');

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/contract-1/auth/face-capture/', {
        face_front_image: 'base64-front',
        face_side_image: 'base64-side',
      });
      expect(result.face_confidence).toBe(0.95);
    });
  });

  describe('processDocumentVerification', () => {
    it('should send document for verification with type and number', async () => {
      const docResponse = { success: true, document_confidence: 0.98, extracted_data: { name: 'Juan Perez' } };
      mockedApi.post.mockResolvedValueOnce({ data: docResponse });

      const result = await contractService.processDocumentVerification('contract-1', 'base64-doc', 'cedula', '12345678');

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/contract-1/auth/document-capture/', {
        document_image: 'base64-doc',
        document_type: 'cedula',
        document_number: '12345678',
      });
      expect(result.document_confidence).toBe(0.98);
    });

    it('should send empty string when document number is not provided', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

      await contractService.processDocumentVerification('contract-1', 'base64-doc', 'pasaporte');

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/contract-1/auth/document-capture/', {
        document_image: 'base64-doc',
        document_type: 'pasaporte',
        document_number: '',
      });
    });
  });

  describe('processCombinedVerification', () => {
    it('should send combined image for cross-validation', async () => {
      const combinedResponse = { success: true, combined_confidence: 0.93 };
      mockedApi.post.mockResolvedValueOnce({ data: combinedResponse });

      const result = await contractService.processCombinedVerification('contract-1', 'base64-combined');

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/contract-1/auth/combined-capture/', {
        combined_image: 'base64-combined',
      });
      expect(result.combined_confidence).toBe(0.93);
    });
  });

  describe('processVoiceVerification', () => {
    it('should send voice recording with expected text', async () => {
      const voiceResponse = { success: true, voice_confidence: 0.91, transcription: 'Acepto los terminos' };
      mockedApi.post.mockResolvedValueOnce({ data: voiceResponse });

      const result = await contractService.processVoiceVerification('contract-1', 'base64-voice', 'Acepto los terminos');

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/contract-1/auth/voice-capture/', {
        voice_recording: 'base64-voice',
        expected_text: 'Acepto los terminos',
      });
      expect(result.voice_confidence).toBe(0.91);
    });
  });

  describe('completeAuthentication', () => {
    it('should complete the biometric authentication process', async () => {
      const completeResponse = { success: true, overall_confidence: 0.94, status: 'completed' };
      mockedApi.post.mockResolvedValueOnce({ data: completeResponse });

      const result = await contractService.completeAuthentication('contract-1');

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/contract-1/complete-auth/');
      expect(result.overall_confidence).toBe(0.94);
    });
  });

  describe('getBiometricAuthenticationStatus', () => {
    it('should fetch current authentication status', async () => {
      const statusResponse = {
        status: 'in_progress',
        completed_steps: { face_front: true, face_side: true, document: false, combined: false, voice: false },
        progress: 40,
      };
      mockedApi.get.mockResolvedValueOnce({ data: statusResponse });

      const result = await contractService.getBiometricAuthenticationStatus('contract-1');

      expect(mockedApi.get).toHaveBeenCalledWith('/contracts/contract-1/auth/status/');
      expect(result.progress).toBe(40);
      expect(result.completed_steps.face_front).toBe(true);
    });
  });

  describe('generateContractPDF', () => {
    it('should generate a PDF for the contract', async () => {
      const pdfResponse = { pdf_url: 'https://example.com/contract.pdf', generated: true };
      mockedApi.post.mockResolvedValueOnce({ data: pdfResponse });

      const result = await contractService.generateContractPDF('contract-1');

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/contract-1/generate-pdf/');
      expect(result.pdf_url).toBeDefined();
    });
  });

  describe('editContractBeforeAuth', () => {
    it('should edit contract before authentication with PATCH', async () => {
      const editResponse = { id: 'contract-1', monthly_rent: 3000000 };
      mockedApi.patch.mockResolvedValueOnce({ data: editResponse });

      const result = await contractService.editContractBeforeAuth('contract-1', { monthly_rent: 3000000 });

      expect(mockedApi.patch).toHaveBeenCalledWith('/contracts/contract-1/edit-before-auth/', { monthly_rent: 3000000 });
      expect(result.monthly_rent).toBe(3000000);
    });
  });

  // ===== CONTRACT STATES =====

  describe('activateContract', () => {
    it('should activate a fully signed contract', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { ...mockContract, status: 'active' } });

      const result = await contractService.activateContract('contract-1');

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/contracts/contract-1/activate/');
      expect(result.status).toBe('active');
    });
  });

  describe('suspendContract', () => {
    it('should suspend an active contract with reason', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { ...mockContract, status: 'suspended' } });

      const result = await contractService.suspendContract('contract-1', 'Non-payment');

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/contracts/contract-1/suspend/', { reason: 'Non-payment' });
    });
  });

  // ===== SIGNATURES =====

  describe('signContract', () => {
    it('should sign contract with signature data', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

      const signatureData = {
        signature: 'base64-signature-data',
        timestamp: '2025-01-01T12:00:00Z',
        signerInfo: { name: 'Test User' },
        verification: { hash: 'abc123' },
      };

      await contractService.signContract('contract-1', signatureData as any);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/contracts/contracts/contract-1/sign/',
        expect.objectContaining({
          signature_data: expect.objectContaining({
            signature: 'base64-signature-data',
          }),
          verification_level: 'basic',
        }),
      );
    });
  });

  // ===== REPORTS =====

  describe('getExpiringContracts', () => {
    it('should fetch expiring contracts', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockContract] });

      const result = await contractService.getExpiringContracts();

      expect(mockedApi.get).toHaveBeenCalledWith('/contracts/reports/expiring/');
      expect(result).toEqual([mockContract]);
    });
  });

  describe('getContractStats', () => {
    it('should fetch contract statistics', async () => {
      const stats = { total_contracts: 10, active_contracts: 7 };
      mockedApi.get.mockResolvedValueOnce({ data: stats });

      const result = await contractService.getContractStats();

      expect(mockedApi.get).toHaveBeenCalledWith('/contracts/stats/');
      expect(result.total_contracts).toBe(10);
    });
  });

  // ===== DOCUMENT MANAGEMENT =====

  describe('uploadDocument', () => {
    it('should upload document with multipart form data', async () => {
      const formData = new FormData();
      formData.append('file', new File(['test'], 'test.pdf'));
      mockedApi.post.mockResolvedValueOnce({ data: { document_id: 'doc-1' } });

      const result = await contractService.uploadDocument('contract-1', formData);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/contracts/contracts/contract-1/documents/upload/',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      expect(result.document_id).toBe('doc-1');
    });
  });

  // ===== COLOMBIAN CONTRACT INTEGRATION =====

  describe('validateMatchForContract', () => {
    it('should validate a match request for contract creation', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { valid: true } });

      const result = await contractService.validateMatchForContract('match-1');

      expect(mockedApi.post).toHaveBeenCalledWith('/matching/requests/match-1/validate-contract/');
      expect(result.valid).toBe(true);
    });
  });

  describe('createContractFromMatch', () => {
    it('should create a contract from an accepted match', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { contract_id: 'new-contract' } });

      const contractData = { monthly_rent: 2500000, duration_months: 12 };
      const result = await contractService.createContractFromMatch('match-1', contractData);

      expect(mockedApi.post).toHaveBeenCalledWith('/matching/requests/match-1/create-contract/', contractData);
      expect(result.contract_id).toBe('new-contract');
    });
  });

  // ===== ERROR HANDLING =====

  describe('Error Handling', () => {
    it('should propagate API errors on getContracts', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(contractService.getContracts()).rejects.toThrow('Network Error');
    });

    it('should propagate API errors on createContract', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Validation Error'));

      await expect(contractService.createContract({} as any)).rejects.toThrow('Validation Error');
    });

    it('should propagate API errors on biometric endpoints', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Contract locked'));

      await expect(contractService.startBiometricAuthentication('contract-1')).rejects.toThrow('Contract locked');
    });
  });
});
