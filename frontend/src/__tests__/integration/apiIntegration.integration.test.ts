/**
 * Tests de Integración - APIs y Servicios
 * Prueba la integración entre frontend y backend APIs
 * Incluye tests de comunicación, manejo de errores y resiliencia
 */

// The api module is already mocked globally in setupTests.ts via __mocks__/api.ts
import { api } from '../../services/api';
import { LandlordContractService } from '../../services/landlordContractService';
import contractService from '../../services/contractService';

// Test utilities
import {
  createMockContract,
  createMockTenantData,
  createMockStatistics,
  createMockObjection,
  createMockSignatureData,
  cleanupMocks,
} from '../../test-utils/contractTestUtils';

// Cast to jest.Mock for typing
const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPut = api.put as jest.Mock;
const mockPatch = api.patch as jest.Mock;

// Test data
const mockContract = createMockContract('DRAFT', {
  id: 'api-test-contract-123',
  property_address: 'API Test Property',
});

const mockTenantData = createMockTenantData({
  email: 'tenant-api-test@example.com',
});

const mockStatistics = createMockStatistics({
  total_contracts: 15,
  monthly_income: 8500000,
});

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  // =====================================================================
  // TESTS DE INTEGRACIÓN DEL LANDLORD CONTRACT SERVICE
  // =====================================================================

  describe('LandlordContractService API Integration', () => {
    describe('Contract CRUD Operations', () => {
      it('should create contract with proper payload structure', async () => {
        const contractData = {
          property_address: 'Test Address',
          monthly_rent: 2500000,
          contract_duration_months: 12,
          security_deposit: 2500000,
        };

        mockPost.mockResolvedValueOnce({
          data: { ...mockContract, ...contractData },
        });

        const result =
          await LandlordContractService.createContract(contractData);

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(result.property_address).toBe('Test Address');
      });

      it('should handle contract creation validation errors', async () => {
        const invalidData = {
          property_address: '',
          monthly_rent: -1000,
        };

        mockPost.mockRejectedValueOnce({
          response: {
            status: 400,
            data: {
              error: 'Validation failed',
              details: {
                property_address: ['Este campo es requerido'],
                monthly_rent: ['El valor debe ser positivo'],
              },
            },
          },
        });

        try {
          await LandlordContractService.createContract(invalidData);
          fail('Should have thrown');
        } catch (error: any) {
          expect(error.response.status).toBe(400);
          expect(error.response.data.details).toHaveProperty(
            'property_address',
          );
          expect(error.response.data.details).toHaveProperty('monthly_rent');
        }
      });

      it('should update contract draft', async () => {
        const updates = {
          monthly_rent: 2800000,
          security_deposit: 2800000,
          pets_allowed: true,
        };

        const updatedContract = { ...mockContract, ...updates };

        mockPatch.mockResolvedValueOnce({ data: updatedContract });

        const result = await LandlordContractService.updateContractDraft(
          mockContract.id,
          updates,
        );

        expect(mockPatch).toHaveBeenCalledTimes(1);
        expect(result.monthly_rent).toBe(2800000);
        expect(result.pets_allowed).toBe(true);
      });

      it('should fetch contract list with pagination', async () => {
        const contractList = Array.from({ length: 5 }, (_, i) =>
          createMockContract('PUBLISHED', { id: `contract-${i}` }),
        );

        mockGet.mockResolvedValueOnce({
          data: {
            contracts: contractList,
            total_count: 25,
            page: 1,
            page_size: 5,
            has_next: true,
            has_previous: false,
          },
        });

        const result = await LandlordContractService.getContracts(
          undefined,
          1,
          5,
        );

        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(result.contracts).toHaveLength(5);
        expect(result.total_count).toBe(25);
        expect(result.has_next).toBe(true);
      });
    });

    describe('Contract Workflow Operations', () => {
      it('should handle tenant invitation flow', async () => {
        const invitationData = {
          contract_id: mockContract.id,
          tenant_email: 'test@example.com',
          personal_message: 'Please review this contract',
        };

        mockPost.mockResolvedValueOnce({
          data: { success: true },
        });

        const result =
          await LandlordContractService.sendTenantInvitation(invitationData);

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(result.success).toBe(true);
      });

      it('should handle contract approval workflow', async () => {
        const approvedContract = createMockContract('READY_TO_SIGN', {
          id: mockContract.id,
          landlord_approved: true,
          tenant_approved: true,
        });

        mockPost.mockResolvedValueOnce({ data: approvedContract });

        const result = await LandlordContractService.approveLandlordContract({
          contract_id: mockContract.id,
        });

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(result.current_state).toBe('READY_TO_SIGN');
        expect(result.landlord_approved).toBe(true);
      });

      it('should handle contract objections workflow', async () => {
        const objectionData = {
          contract_id: mockContract.id,
          field_name: 'monthly_rent',
          current_value: '2500000',
          proposed_value: '2200000',
          justification: 'Market rate analysis shows lower average',
          priority: 'HIGH' as const,
        };

        const createdObjection = createMockObjection(objectionData);

        mockPost.mockResolvedValueOnce({ data: createdObjection });

        const objection =
          await LandlordContractService.submitObjection(objectionData);

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(objection.field_name).toBe('monthly_rent');
        expect(objection.proposed_value).toBe('2200000');
        expect(objection.priority).toBe('HIGH');
      });
    });

    describe('Statistics and Analytics', () => {
      it('should fetch comprehensive statistics', async () => {
        mockGet.mockResolvedValueOnce({ data: mockStatistics });

        const stats = await LandlordContractService.getLandlordStatistics();

        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(stats.total_contracts).toBe(15);
        expect(stats.monthly_income).toBe(8500000);
        expect(stats.by_state).toHaveProperty('PUBLISHED');
        expect(stats.by_property_type).toHaveProperty('apartamento');
      });

      it('should fetch contract statistics via alternate method', async () => {
        const filteredStats = createMockStatistics({
          total_contracts: 8,
          monthly_income: 4200000,
        });

        mockGet.mockResolvedValueOnce({ data: filteredStats });

        const stats = await LandlordContractService.getContractStatistics();

        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(stats.total_contracts).toBe(8);
      });
    });
  });

  // =====================================================================
  // TESTS DE INTEGRACIÓN DEL CONTRACT SERVICE (BIOMETRIC)
  // =====================================================================

  describe('Contract Service Biometric API Integration', () => {
    describe('Biometric Authentication Flow', () => {
      it('should initialize biometric authentication session', async () => {
        const initResponse = {
          authenticationId: 'auth-123',
          sessionTimeout: 900000,
          securityLevel: 'high',
          requiredSteps: [
            'face_front',
            'face_side',
            'document',
            'combined',
            'voice',
          ],
        };

        mockPost.mockResolvedValueOnce({ data: initResponse });

        const result = await contractService.startBiometricAuthentication(
          mockContract.id,
        );

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(result.authenticationId).toBe('auth-123');
        expect(result.requiredSteps).toContain('face_front');
        expect(result.securityLevel).toBe('high');
      });

      it('should process face capture', async () => {
        const faceResponse = {
          step: 'face_front',
          status: 'success',
          confidenceScore: 0.95,
        };

        mockPost.mockResolvedValueOnce({ data: faceResponse });

        const result = await contractService.processFaceCapture(
          mockContract.id,
          'base64-front-image',
          'base64-side-image',
        );

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(result.confidenceScore).toBe(0.95);
        expect(result.status).toBe('success');
      });

      it('should process document verification with OCR', async () => {
        const documentResponse = {
          step: 'document',
          status: 'success',
          confidenceScore: 0.98,
          extractedData: {
            documentType: 'CC',
            documentNumber: '12345678',
            fullName: 'JUAN CARLOS PEREZ',
          },
          validationResults: {
            formatValid: true,
            hologramValid: true,
            photoMatch: 0.94,
          },
        };

        mockPost.mockResolvedValueOnce({ data: documentResponse });

        const result = await contractService.processDocumentVerification(
          mockContract.id,
          'base64-document-image',
          'CC',
        );

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(result.extractedData.documentNumber).toBe('12345678');
        expect(result.extractedData.fullName).toBe('JUAN CARLOS PEREZ');
        expect(result.validationResults.formatValid).toBe(true);
      });

      it('should process voice verification', async () => {
        const voiceResponse = {
          step: 'voice',
          status: 'success',
          confidenceScore: 0.89,
          transcription: 'Yo acepto los términos del contrato',
        };

        mockPost.mockResolvedValueOnce({ data: voiceResponse });

        const result = await contractService.processVoiceVerification(
          mockContract.id,
          'base64-audio-data',
          'Yo acepto los términos del contrato',
        );

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(result.transcription).toBe(
          'Yo acepto los términos del contrato',
        );
        expect(result.confidenceScore).toBe(0.89);
      });

      it('should complete biometric authentication', async () => {
        const completionResponse = {
          contract_id: mockContract.id,
          signature_completed: true,
          biometric_verified: true,
          confidence_scores: {
            face_confidence: 0.95,
            document_confidence: 0.98,
            voice_confidence: 0.89,
            overall_confidence: 0.94,
          },
          certificate_id: 'cert-456',
        };

        mockPost.mockResolvedValueOnce({ data: completionResponse });

        const result = await contractService.completeAuthentication(
          mockContract.id,
        );

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(result.biometric_verified).toBe(true);
        expect(result.confidence_scores.overall_confidence).toBe(0.94);
        expect(result.certificate_id).toBe('cert-456');
      });
    });

    describe('Biometric Error Handling', () => {
      it('should handle fraud detection and security violations', async () => {
        mockPost.mockRejectedValueOnce({
          response: {
            status: 403,
            data: {
              error: 'fraud_detected',
              fraud_indicators: ['multiple_devices', 'location_mismatch'],
            },
          },
        });

        try {
          await contractService.processFaceCapture(
            mockContract.id,
            'img1',
            'img2',
          );
          fail('Should have thrown');
        } catch (error: any) {
          expect(error.response.status).toBe(403);
          expect(error.response.data.error).toBe('fraud_detected');
          expect(error.response.data.fraud_indicators).toContain(
            'multiple_devices',
          );
        }
      });
    });
  });

  // =====================================================================
  // TESTS DE RESILIENCIA Y MANEJO DE ERRORES
  // =====================================================================

  describe('API Resilience and Error Handling', () => {
    describe('Network Resilience', () => {
      it('should handle network timeouts gracefully', async () => {
        mockGet.mockRejectedValueOnce({
          code: 'ECONNABORTED',
          message: 'timeout of 10000ms exceeded',
        });

        try {
          await LandlordContractService.getContracts();
          fail('Should have thrown');
        } catch (error: any) {
          expect(error.code).toBe('ECONNABORTED');
          expect(error.message).toContain('timeout');
        }
      });

      it('should handle server errors with proper error messages', async () => {
        mockGet.mockRejectedValueOnce({
          response: {
            status: 500,
            data: {
              error: 'Internal server error',
              error_code: 'DB_CONNECTION_ERROR',
            },
          },
        });

        try {
          await LandlordContractService.getLandlordStatistics();
          fail('Should have thrown');
        } catch (error: any) {
          expect(error.response.status).toBe(500);
          expect(error.response.data.error_code).toBe('DB_CONNECTION_ERROR');
        }
      });

      it('should handle rate limiting', async () => {
        mockPost.mockRejectedValueOnce({
          response: {
            status: 429,
            data: { error: 'Rate limit exceeded', retry_after: 60 },
            headers: { 'retry-after': '60' },
          },
        });

        try {
          await LandlordContractService.createContract({
            property_address: 'Test',
            monthly_rent: 1000000,
          });
          fail('Should have thrown');
        } catch (error: any) {
          expect(error.response.status).toBe(429);
        }
      });
    });

    describe('Authentication and Authorization', () => {
      it('should handle expired tokens with proper error response', async () => {
        mockGet.mockRejectedValueOnce({
          response: {
            status: 401,
            data: {
              error: 'token_expired',
              message: 'Authentication token has expired',
              action_required: 'refresh_token',
            },
          },
        });

        try {
          await LandlordContractService.getContracts();
          fail('Should have thrown');
        } catch (error: any) {
          expect(error.response.status).toBe(401);
          expect(error.response.data.error).toBe('token_expired');
          expect(error.response.data.action_required).toBe('refresh_token');
        }
      });

      it('should handle insufficient permissions', async () => {
        mockPost.mockRejectedValueOnce({
          response: {
            status: 403,
            data: {
              error: 'insufficient_permissions',
              required_role: 'landlord',
              current_role: 'tenant',
            },
          },
        });

        try {
          await LandlordContractService.approveLandlordContract({
            contract_id: mockContract.id,
          });
          fail('Should have thrown');
        } catch (error: any) {
          expect(error.response.status).toBe(403);
          expect(error.response.data.required_role).toBe('landlord');
          expect(error.response.data.current_role).toBe('tenant');
        }
      });
    });

    describe('Data Validation and Integrity', () => {
      it('should handle response data gracefully', async () => {
        const incompleteResponse = {
          contracts: [
            {
              id: 'contract-123',
              monthly_rent: 2500000,
            },
          ],
        };

        mockGet.mockResolvedValueOnce({ data: incompleteResponse });

        const result = await LandlordContractService.getContracts();

        expect(result.contracts).toHaveLength(1);
        expect(result.contracts[0].id).toBe('contract-123');
      });
    });
  });

  // =====================================================================
  // TESTS DE RENDIMIENTO Y OPTIMIZACIÓN
  // =====================================================================

  describe('API Performance and Optimization', () => {
    it('should handle large dataset responses efficiently', async () => {
      const largeContractList = Array.from({ length: 100 }, (_, i) =>
        createMockContract('PUBLISHED', {
          id: `large-contract-${i}`,
          property_address: `Large Property ${i}`,
        }),
      );

      const largeResponse = {
        contracts: largeContractList,
        total_count: largeContractList.length,
        page: 1,
        page_size: 100,
      };

      mockGet.mockResolvedValueOnce({ data: largeResponse });

      const startTime = performance.now();
      const result = await LandlordContractService.getContracts();
      const endTime = performance.now();

      expect(result.contracts).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle concurrent API requests efficiently', async () => {
      mockGet.mockResolvedValue({ data: { contracts: [] } });

      const startTime = performance.now();

      const promises = [
        LandlordContractService.getContracts(),
        LandlordContractService.getLandlordStatistics(),
        LandlordContractService.getContracts(),
      ];

      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(3);
      expect(mockGet).toHaveBeenCalledTimes(3);
      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});
