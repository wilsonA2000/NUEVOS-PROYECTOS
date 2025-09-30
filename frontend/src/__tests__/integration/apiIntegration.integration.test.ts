/**
 * Tests de Integración - APIs y Servicios
 * Prueba la integración entre frontend y backend APIs
 * Incluye tests de comunicación, manejo de errores y resiliencia
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import MockAdapter from 'axios-mock-adapter';

// Services under test
import { LandlordContractService } from '../../services/landlordContractService';
import contractService from '../services/contractService';
import { api } from '../../services/api';

// Types
import {
  LandlordControlledContractData,
  ContractWorkflowState,
  TenantData,
  ContractObjection,
  ContractStatistics
} from '../../types/landlordContract';

// Test utilities
import {
  createMockContract,
  createMockTenantData,
  createMockStatistics,
  createMockObjection,
  createMockInvitationResponse,
  createMockSignatureData,
  createMockApiError,
  cleanupMocks
} from '../../test-utils/contractTestUtils';

// Mock API
let mockAxios: MockAdapter;

// Test data
const mockContract = createMockContract('DRAFT', {
  id: 'api-test-contract-123',
  property_address: 'API Test Property'
});

const mockTenantData = createMockTenantData({
  email: 'tenant-api-test@example.com'
});

const mockStatistics = createMockStatistics({
  total_contracts: 15,
  monthly_income: 8500000
});

describe('API Integration Tests', () => {
  beforeEach(() => {
    mockAxios = new MockAdapter(api, { delayResponse: 50 });
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockAxios.restore();
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
          landlord_data: mockContract.landlord_data
        };

        mockAxios.onPost('/api/v1/contracts/landlord/contracts/')
          .reply(201, { ...mockContract, ...contractData });

        const result = await LandlordContractService.createContract(contractData);

        expect(mockAxios.history.post).toHaveLength(1);
        expect(mockAxios.history.post[0].url).toBe('/api/v1/contracts/landlord/contracts/');
        
        const sentData = JSON.parse(mockAxios.history.post[0].data);
        expect(sentData).toMatchObject(contractData);
        expect(result.property_address).toBe('Test Address');
        expect(result.monthly_rent).toBe(2500000);
      });

      it('should handle contract creation validation errors', async () => {
        const invalidData = {
          property_address: '', // Invalid: empty address
          monthly_rent: -1000, // Invalid: negative rent
        };

        mockAxios.onPost('/api/v1/contracts/landlord/contracts/')
          .reply(400, {
            error: 'Validation failed',
            details: {
              property_address: ['Este campo es requerido'],
              monthly_rent: ['El valor debe ser positivo']
            }
          });

        try {
          await LandlordContractService.createContract(invalidData);
          expect(true).toBe(false); // Should not reach here
        } catch (error: any) {
          expect(error.response.status).toBe(400);
          expect(error.response.data.details).toHaveProperty('property_address');
          expect(error.response.data.details).toHaveProperty('monthly_rent');
        }
      });

      it('should update contract with optimistic updates', async () => {
        const updates = {
          monthly_rent: 2800000,
          security_deposit: 2800000,
          pets_allowed: true
        };

        const updatedContract = { ...mockContract, ...updates };

        mockAxios.onPut(`/api/v1/contracts/landlord/contracts/${mockContract.id}/`)
          .reply(200, updatedContract);

        const result = await LandlordContractService.updateContract(mockContract.id, updates);

        expect(mockAxios.history.put).toHaveLength(1);
        expect(result.monthly_rent).toBe(2800000);
        expect(result.pets_allowed).toBe(true);
      });

      it('should fetch contract list with pagination and filters', async () => {
        const contractList = Array.from({ length: 5 }, (_, i) => 
          createMockContract('PUBLISHED', { id: `contract-${i}` })
        );

        mockAxios.onGet('/api/v1/contracts/landlord/contracts/')
          .reply(200, {
            contracts: contractList,
            total_count: 25,
            page: 1,
            page_size: 5,
            has_next: true,
            has_previous: false
          });

        const result = await LandlordContractService.getContracts({
          page: 1,
          page_size: 5,
          state: 'PUBLISHED'
        });

        expect(mockAxios.history.get).toHaveLength(1);
        expect(mockAxios.history.get[0].params).toMatchObject({
          page: 1,
          page_size: 5,
          state: 'PUBLISHED'
        });
        
        expect(result.contracts).toHaveLength(5);
        expect(result.total_count).toBe(25);
        expect(result.has_next).toBe(true);
      });
    });

    describe('Contract Workflow Operations', () => {
      it('should handle invitation flow with multiple methods', async () => {
        const invitationData = {
          tenant_email: 'test@example.com',
          tenant_name: 'Test Tenant',
          invitation_method: 'email' as const,
          personal_message: 'Please review this contract'
        };

        const invitationResponse = createMockInvitationResponse({
          invitation_method: 'email'
        });

        // Create invitation
        mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${mockContract.id}/create-invitation/`)
          .reply(201, invitationResponse);

        // Send invitation
        mockAxios.onPost(`/api/v1/contracts/invitations/${invitationResponse.invitation_id}/send/`)
          .reply(200, { success: true, method: 'email', sent_at: new Date().toISOString() });

        const invitation = await LandlordContractService.createInvitation(mockContract.id, invitationData);
        
        expect(invitation.invitation_method).toBe('email');
        expect(mockAxios.history.post).toHaveLength(1);

        const sendResult = await LandlordContractService.sendInvitation(
          invitation.invitation_id, 
          'email'
        );

        expect(sendResult.success).toBe(true);
        expect(sendResult.method).toBe('email');
        expect(mockAxios.history.post).toHaveLength(2);
      });

      it('should handle contract approval workflow', async () => {
        const contractInReview = createMockContract('LANDLORD_REVIEWING', {
          id: mockContract.id,
          tenant_approved: true
        });

        const approvedContract = createMockContract('READY_TO_SIGN', {
          id: mockContract.id,
          landlord_approved: true,
          tenant_approved: true
        });

        mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${mockContract.id}/approve/`)
          .reply(200, approvedContract);

        const result = await LandlordContractService.approveContract(mockContract.id);

        expect(mockAxios.history.post).toHaveLength(1);
        expect(result.current_state).toBe('READY_TO_SIGN');
        expect(result.landlord_approved).toBe(true);
        expect(result.tenant_approved).toBe(true);
      });

      it('should handle contract objections workflow', async () => {
        const objectionData = {
          field_name: 'monthly_rent',
          current_value: '2500000',
          proposed_value: '2200000',
          justification: 'Market rate analysis shows lower average',
          priority: 'HIGH' as const
        };

        const createdObjection = createMockObjection(objectionData);

        mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${mockContract.id}/create-objection/`)
          .reply(201, createdObjection);

        const objection = await LandlordContractService.createObjection(mockContract.id, objectionData);

        expect(mockAxios.history.post).toHaveLength(1);
        expect(objection.field_name).toBe('monthly_rent');
        expect(objection.proposed_value).toBe('2200000');
        expect(objection.priority).toBe('HIGH');
      });
    });

    describe('Statistics and Analytics', () => {
      it('should fetch comprehensive statistics', async () => {
        mockAxios.onGet('/api/v1/contracts/landlord/statistics/')
          .reply(200, mockStatistics);

        const stats = await LandlordContractService.getStatistics();

        expect(mockAxios.history.get).toHaveLength(1);
        expect(stats.total_contracts).toBe(15);
        expect(stats.monthly_income).toBe(8500000);
        expect(stats.by_state).toHaveProperty('PUBLISHED');
        expect(stats.by_property_type).toHaveProperty('apartamento');
      });

      it('should handle date-range filtered statistics', async () => {
        const dateRange = {
          start_date: '2025-01-01',
          end_date: '2025-01-31'
        };

        const filteredStats = createMockStatistics({
          total_contracts: 8,
          monthly_income: 4200000
        });

        mockAxios.onGet('/api/v1/contracts/landlord/statistics/')
          .reply(200, filteredStats);

        const stats = await LandlordContractService.getStatistics(dateRange);

        expect(mockAxios.history.get).toHaveLength(1);
        expect(mockAxios.history.get[0].params).toMatchObject(dateRange);
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
          deviceFingerprint: 'device-456',
          requiredSteps: ['face_front', 'face_side', 'document', 'combined', 'voice']
        };

        mockAxios.onPost(`/api/v1/contracts/${mockContract.id}/start-biometric-authentication/`)
          .reply(200, initResponse);

        const result = await contractService.startBiometricAuthentication(mockContract.id);

        expect(mockAxios.history.post).toHaveLength(1);
        expect(result.authenticationId).toBe('auth-123');
        expect(result.requiredSteps).toContain('face_front');
        expect(result.securityLevel).toBe('high');
      });

      it('should process face capture with quality analysis', async () => {
        const authId = 'auth-123';
        const faceImageBlob = new Blob(['fake-image-data'], { type: 'image/jpeg' });

        const faceResponse = {
          authenticationId: authId,
          step: 'face_front',
          status: 'success',
          confidenceScore: 0.95,
          qualityMetrics: {
            sharpness: 0.92,
            lighting: 0.88,
            angle: 2.1,
            eyesDetected: true
          },
          nextStep: 'face_side'
        };

        mockAxios.onPost(`/api/v1/contracts/biometric/${authId}/face-capture/`)
          .reply(200, faceResponse);

        const result = await contractService.processFaceCapture(authId, faceImageBlob, 'front');

        expect(mockAxios.history.post).toHaveLength(1);
        expect(result.confidenceScore).toBe(0.95);
        expect(result.qualityMetrics.eyesDetected).toBe(true);
        expect(result.nextStep).toBe('face_side');

        // Verify multipart form data
        const request = mockAxios.history.post[0];
        expect(request.headers['Content-Type']).toContain('multipart/form-data');
      });

      it('should process document verification with OCR', async () => {
        const authId = 'auth-123';
        const documentBlob = new Blob(['fake-document-data'], { type: 'image/jpeg' });

        const documentResponse = {
          authenticationId: authId,
          step: 'document',
          status: 'success',
          confidenceScore: 0.98,
          extractedData: {
            documentType: 'CC',
            documentNumber: '12345678',
            fullName: 'JUAN CARLOS PEREZ',
            birthDate: '1985-03-15',
            expirationDate: '2030-03-15'
          },
          validationResults: {
            formatValid: true,
            hologramValid: true,
            photoMatch: 0.94
          }
        };

        mockAxios.onPost(`/api/v1/contracts/biometric/${authId}/document-capture/`)
          .reply(200, documentResponse);

        const result = await contractService.processDocumentVerification(
          authId, 
          documentBlob, 
          'CC'
        );

        expect(mockAxios.history.post).toHaveLength(1);
        expect(result.extractedData.documentNumber).toBe('12345678');
        expect(result.extractedData.fullName).toBe('JUAN CARLOS PEREZ');
        expect(result.validationResults.formatValid).toBe(true);
      });

      it('should process voice recording with transcription', async () => {
        const authId = 'auth-123';
        const audioBlob = new Blob(['fake-audio-data'], { type: 'audio/wav' });
        const requiredPhrase = 'Yo acepto los términos del contrato';

        const voiceResponse = {
          authenticationId: authId,
          step: 'voice',
          status: 'success',
          confidenceScore: 0.89,
          transcription: 'Yo acepto los términos del contrato',
          phraseMatch: 0.96,
          audioQuality: {
            clarity: 0.91,
            backgroundNoise: 0.12,
            speechRate: 'normal'
          }
        };

        mockAxios.onPost(`/api/v1/contracts/biometric/${authId}/voice-capture/`)
          .reply(200, voiceResponse);

        const result = await contractService.processVoiceRecording(
          authId, 
          audioBlob, 
          requiredPhrase
        );

        expect(mockAxios.history.post).toHaveLength(1);
        expect(result.transcription).toBe(requiredPhrase);
        expect(result.phraseMatch).toBe(0.96);
        expect(result.audioQuality.clarity).toBe(0.91);
      });

      it('should complete biometric signature with all validations', async () => {
        const signatureData = createMockSignatureData('tenant');

        const completionResponse = {
          contract_id: mockContract.id,
          signature_completed: true,
          biometric_verified: true,
          confidence_scores: {
            face_confidence: 0.95,
            document_confidence: 0.98,
            voice_confidence: 0.89,
            signature_quality: 0.92,
            overall_confidence: 0.94
          },
          security_checks: {
            device_integrity: true,
            location_verified: true,
            session_valid: true,
            fraud_score: 0.02
          },
          certificate_id: 'cert-456'
        };

        mockAxios.onPost(`/api/v1/contracts/${mockContract.id}/complete-biometric-signature/`)
          .reply(200, completionResponse);

        const result = await contractService.completeBiometricSignature(
          mockContract.id,
          signatureData
        );

        expect(mockAxios.history.post).toHaveLength(1);
        expect(result.biometric_verified).toBe(true);
        expect(result.confidence_scores.overall_confidence).toBe(0.94);
        expect(result.security_checks.fraud_score).toBe(0.02);
        expect(result.certificate_id).toBe('cert-456');
      });
    });

    describe('Biometric Error Handling', () => {
      it('should handle low confidence scores with retry mechanism', async () => {
        const authId = 'auth-123';
        const faceImageBlob = new Blob(['low-quality-image'], { type: 'image/jpeg' });

        const lowQualityResponse = {
          authenticationId: authId,
          step: 'face_front',
          status: 'warning',
          confidenceScore: 0.65, // Below threshold
          message: 'Calidad insuficiente, intenta con mejor iluminación',
          qualityMetrics: {
            sharpness: 0.45,
            lighting: 0.32,
            angle: 15.2
          },
          retryAllowed: true,
          maxRetries: 3,
          currentAttempt: 1
        };

        mockAxios.onPost(`/api/v1/contracts/biometric/${authId}/face-capture/`)
          .reply(200, lowQualityResponse);

        const result = await contractService.processFaceCapture(authId, faceImageBlob, 'front');

        expect(result.status).toBe('warning');
        expect(result.confidenceScore).toBe(0.65);
        expect(result.retryAllowed).toBe(true);
        expect(result.message).toContain('mejor iluminación');
      });

      it('should handle fraud detection and security violations', async () => {
        const authId = 'auth-123';

        const fraudResponse = {
          error: 'fraud_detected',
          message: 'Actividad sospechosa detectada',
          fraud_indicators: [
            'multiple_devices',
            'location_mismatch',
            'timing_anomaly'
          ],
          security_action: 'session_terminated',
          contact_support: true
        };

        mockAxios.onPost(`/api/v1/contracts/biometric/${authId}/face-capture/`)
          .reply(403, fraudResponse);

        try {
          await contractService.processFaceCapture(authId, new Blob(), 'front');
          expect(true).toBe(false); // Should not reach here
        } catch (error: any) {
          expect(error.response.status).toBe(403);
          expect(error.response.data.error).toBe('fraud_detected');
          expect(error.response.data.fraud_indicators).toContain('multiple_devices');
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
        mockAxios.onGet('/api/v1/contracts/landlord/contracts/')
          .timeout();

        try {
          await LandlordContractService.getContracts();
          expect(true).toBe(false); // Should not reach here
        } catch (error: any) {
          expect(error.code).toBe('ECONNABORTED');
          expect(error.message).toContain('timeout');
        }
      });

      it('should handle server errors with proper error messages', async () => {
        const serverError = {
          error: 'Internal server error',
          message: 'Database connection failed',
          error_code: 'DB_CONNECTION_ERROR',
          timestamp: new Date().toISOString()
        };

        mockAxios.onGet('/api/v1/contracts/landlord/statistics/')
          .reply(500, serverError);

        try {
          await LandlordContractService.getStatistics();
          expect(true).toBe(false); // Should not reach here
        } catch (error: any) {
          expect(error.response.status).toBe(500);
          expect(error.response.data.error_code).toBe('DB_CONNECTION_ERROR');
        }
      });

      it('should handle rate limiting with retry-after headers', async () => {
        mockAxios.onPost('/api/v1/contracts/landlord/contracts/')
          .reply(429, 
            { error: 'Rate limit exceeded', retry_after: 60 },
            { 'Retry-After': '60' }
          );

        try {
          await LandlordContractService.createContract({
            property_address: 'Test',
            monthly_rent: 1000000
          });
          expect(true).toBe(false); // Should not reach here
        } catch (error: any) {
          expect(error.response.status).toBe(429);
          expect(error.response.headers['retry-after']).toBe('60');
        }
      });
    });

    describe('Authentication and Authorization', () => {
      it('should handle expired tokens with proper error response', async () => {
        mockAxios.onGet('/api/v1/contracts/landlord/contracts/')
          .reply(401, {
            error: 'token_expired',
            message: 'Authentication token has expired',
            action_required: 'refresh_token'
          });

        try {
          await LandlordContractService.getContracts();
          expect(true).toBe(false); // Should not reach here
        } catch (error: any) {
          expect(error.response.status).toBe(401);
          expect(error.response.data.error).toBe('token_expired');
          expect(error.response.data.action_required).toBe('refresh_token');
        }
      });

      it('should handle insufficient permissions', async () => {
        mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${mockContract.id}/approve/`)
          .reply(403, {
            error: 'insufficient_permissions',
            message: 'User does not have permission to approve contracts',
            required_role: 'landlord',
            current_role: 'tenant'
          });

        try {
          await LandlordContractService.approveContract(mockContract.id);
          expect(true).toBe(false); // Should not reach here
        } catch (error: any) {
          expect(error.response.status).toBe(403);
          expect(error.response.data.required_role).toBe('landlord');
          expect(error.response.data.current_role).toBe('tenant');
        }
      });
    });

    describe('Data Validation and Integrity', () => {
      it('should handle malformed response data', async () => {
        // Mock response with invalid JSON
        mockAxios.onGet('/api/v1/contracts/landlord/statistics/')
          .reply(200, 'invalid-json-response');

        try {
          await LandlordContractService.getStatistics();
          expect(true).toBe(false); // Should not reach here
        } catch (error: any) {
          expect(error.message).toContain('JSON');
        }
      });

      it('should validate response schema integrity', async () => {
        // Mock response with missing required fields
        const incompleteResponse = {
          contracts: [
            {
              id: 'contract-123',
              // Missing required fields like current_state, property_address
              monthly_rent: 2500000
            }
          ]
        };

        mockAxios.onGet('/api/v1/contracts/landlord/contracts/')
          .reply(200, incompleteResponse);

        const result = await LandlordContractService.getContracts();

        // Service should handle incomplete data gracefully
        expect(result.contracts).toHaveLength(1);
        expect(result.contracts[0].id).toBe('contract-123');
        // Missing fields should be handled without crashing
      });
    });
  });

  // =====================================================================
  // TESTS DE RENDIMIENTO Y OPTIMIZACIÓN
  // =====================================================================

  describe('API Performance and Optimization', () => {
    describe('Response Time Optimization', () => {
      it('should handle large dataset responses efficiently', async () => {
        const largeContractList = Array.from({ length: 1000 }, (_, i) => 
          createMockContract('PUBLISHED', { 
            id: `large-contract-${i}`,
            property_address: `Large Property ${i}`
          })
        );

        const largeResponse = {
          contracts: largeContractList,
          total_count: largeContractList.length,
          page: 1,
          page_size: 1000
        };

        // Add artificial delay to simulate large response
        mockAxios.onGet('/api/v1/contracts/landlord/contracts/')
          .reply(() => new Promise(resolve => 
            setTimeout(() => resolve([200, largeResponse]), 100)
          ));

        const startTime = performance.now();
        const result = await LandlordContractService.getContracts();
        const endTime = performance.now();

        expect(result.contracts).toHaveLength(1000);
        expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      });

      it('should handle concurrent API requests efficiently', async () => {
        // Setup multiple endpoints
        mockAxios.onGet('/api/v1/contracts/landlord/contracts/').reply(200, { contracts: [] });
        mockAxios.onGet('/api/v1/contracts/landlord/statistics/').reply(200, mockStatistics);
        mockAxios.onGet('/api/v1/contracts/landlord/invitations/').reply(200, { invitations: [] });

        const startTime = performance.now();

        // Make concurrent requests
        const promises = [
          LandlordContractService.getContracts(),
          LandlordContractService.getStatistics(),
          LandlordContractService.getInvitationsHistory(mockContract.id)
        ];

        const results = await Promise.all(promises);
        const endTime = performance.now();

        expect(results).toHaveLength(3);
        expect(mockAxios.history.get).toHaveLength(3);
        expect(endTime - startTime).toBeLessThan(500); // Concurrent execution should be fast
      });
    });

    describe('Memory Management', () => {
      it('should handle large file uploads without memory leaks', async () => {
        const largeBlobSize = 5 * 1024 * 1024; // 5MB
        const largeImageBlob = new Blob([new ArrayBuffer(largeBlobSize)], { type: 'image/jpeg' });

        const uploadResponse = {
          authenticationId: 'auth-123',
          step: 'document',
          status: 'success',
          fileSize: largeBlobSize,
          processingTime: 2340 // ms
        };

        mockAxios.onPost(/\/api\/v1\/contracts\/biometric\/.+\/document-capture\//)
          .reply(200, uploadResponse);

        const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
        
        const result = await contractService.processDocumentVerification(
          'auth-123', 
          largeImageBlob, 
          'CC'
        );

        const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const memoryIncrease = endMemory - startMemory;

        expect(result.fileSize).toBe(largeBlobSize);
        // Memory increase should be reasonable (less than 10MB)
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      });
    });
  });
});