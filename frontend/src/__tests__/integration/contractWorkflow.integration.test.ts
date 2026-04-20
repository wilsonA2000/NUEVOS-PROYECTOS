/**
 * Tests de Integración - Flujo Completo de Contratos
 * Prueba el workflow completo desde la creación hasta la publicación
 * Incluye interacciones entre servicios y APIs
 */

// The api module is already mocked globally in setupTests.ts via __mocks__/api.ts
import { api } from '../../services/api';
import { LandlordContractService } from '../../services/landlordContractService';
import contractService from '../../services/contractService';

// Types
import {
  LandlordControlledContractData,
  ContractWorkflowState,
} from '../../types/landlordContract';

// Test utilities
import {
  createMockContract,
  createMockTenantData,
  createMockUser,
  createMockInvitationResponse,
  createMockSignatureData,
  createMockStatistics,
  createTestDates,
  cleanupMocks,
} from '../../test-utils/contractTestUtils';

// Cast to jest.Mock for typing
const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;

// Mock data para flujo completo
const mockLandlordUser = createMockUser('landlord', {
  id: 'landlord-123',
  email: 'landlord@test.com',
  full_name: 'Juan Carlos Pérez',
});

const mockTenantUser = createMockUser('tenant', {
  id: 'tenant-456',
  email: 'tenant@test.com',
  full_name: 'Ana María González',
});

const mockTenantData = createMockTenantData({
  full_name: 'Ana María González',
  email: 'tenant@test.com',
  phone: '+57 301 987 6543',
  monthly_income: 5000000,
});

// Estados del contrato para el flujo completo
const createContractStates = (baseId: string) => ({
  draft: createMockContract('DRAFT', { id: baseId }),
  tenantInvited: createMockContract('TENANT_INVITED', {
    id: baseId,
    tenant_email: 'tenant@test.com',
  }),
  tenantReviewing: createMockContract('TENANT_REVIEWING', {
    id: baseId,
    tenant_data: mockTenantData,
  }),
  landlordReviewing: createMockContract('LANDLORD_REVIEWING', {
    id: baseId,
    tenant_data: mockTenantData,
    tenant_approved: true,
  }),
  readyToSign: createMockContract('READY_TO_SIGN', {
    id: baseId,
    tenant_data: mockTenantData,
    landlord_approved: true,
    tenant_approved: true,
  }),
  fullySigned: createMockContract('FULLY_SIGNED', {
    id: baseId,
    tenant_data: mockTenantData,
    landlord_approved: true,
    tenant_approved: true,
    landlord_signed: true,
    tenant_signed: true,
  }),
  published: createMockContract('PUBLISHED', {
    id: baseId,
    tenant_data: mockTenantData,
    landlord_approved: true,
    tenant_approved: true,
    landlord_signed: true,
    tenant_signed: true,
    published: true,
    published_at: new Date().toISOString(),
  }),
});

describe('Contract Workflow Integration Tests', () => {
  const baseContractId = 'integration-contract-123';
  let contractStates: ReturnType<typeof createContractStates>;

  beforeEach(() => {
    jest.clearAllMocks();
    contractStates = createContractStates(baseContractId);
  });

  afterEach(() => {
    cleanupMocks();
  });

  // =====================================================================
  // FLUJO COMPLETO: ARRENDADOR CREA Y GESTIONA CONTRATO
  // =====================================================================

  describe('Complete Landlord Workflow', () => {
    it('should complete full contract creation workflow', async () => {
      // Step 1: Create contract draft
      mockPost.mockResolvedValueOnce({ data: contractStates.draft });

      const createdContract = await LandlordContractService.createContract({
        property_address: 'Apartamento de Integración Test',
        monthly_rent: 2500000,
        security_deposit: 2500000,
        contract_duration_months: 12,
      });

      expect(createdContract.id).toBe(baseContractId);
      expect(createdContract.current_state).toBe('DRAFT');
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('should send tenant invitation after contract creation', async () => {
      // Step 2: Send invitation
      mockPost.mockResolvedValueOnce({ data: { success: true } });

      const inviteResult = await LandlordContractService.sendTenantInvitation({
        contract_id: baseContractId,
        tenant_email: 'tenant@test.com',
        personal_message: 'Please review this contract',
      });

      expect(inviteResult.success).toBe(true);
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('should handle contract approval workflow', async () => {
      // Approve contract as landlord
      mockPost.mockResolvedValueOnce({ data: contractStates.readyToSign });

      const approvedContract =
        await LandlordContractService.approveLandlordContract({
          contract_id: baseContractId,
        });

      expect(approvedContract.current_state).toBe('READY_TO_SIGN');
      expect(approvedContract.landlord_approved).toBe(true);
      expect(approvedContract.tenant_approved).toBe(true);
    });

    it('should handle contract signing', async () => {
      const signatureData = createMockSignatureData('landlord');

      mockPost.mockResolvedValueOnce({ data: contractStates.fullySigned });

      const signedContract = await LandlordContractService.signLandlordContract(
        {
          contract_id: baseContractId,
          signature_data: signatureData.signature_image,
        }
      );

      expect(signedContract.current_state).toBe('FULLY_SIGNED');
      expect(signedContract.landlord_signed).toBe(true);
    });

    it('should handle contract publication', async () => {
      mockPost.mockResolvedValueOnce({ data: contractStates.published });

      const publishedContract = await LandlordContractService.publishContract({
        contract_id: baseContractId,
      });

      expect(publishedContract.current_state).toBe('PUBLISHED');
      expect(publishedContract.published).toBe(true);
      expect(publishedContract.published_at).toBeDefined();
    });

    it('should complete end-to-end workflow from draft to published', async () => {
      // 1. Create
      mockPost.mockResolvedValueOnce({ data: contractStates.draft });
      const created = await LandlordContractService.createContract({
        monthly_rent: 2500000,
      });
      expect(created.current_state).toBe('DRAFT');

      // 2. Invite tenant
      mockPost.mockResolvedValueOnce({ data: { success: true } });
      await LandlordContractService.sendTenantInvitation({
        contract_id: baseContractId,
        tenant_email: 'tenant@test.com',
      });

      // 3. Approve
      mockPost.mockResolvedValueOnce({ data: contractStates.readyToSign });
      const approved = await LandlordContractService.approveLandlordContract({
        contract_id: baseContractId,
      });
      expect(approved.current_state).toBe('READY_TO_SIGN');

      // 4. Sign
      mockPost.mockResolvedValueOnce({ data: contractStates.fullySigned });
      const signed = await LandlordContractService.signLandlordContract({
        contract_id: baseContractId,
        signature_data: 'base64-signature',
      });
      expect(signed.landlord_signed).toBe(true);

      // 5. Publish
      mockPost.mockResolvedValueOnce({ data: contractStates.published });
      const published = await LandlordContractService.publishContract({
        contract_id: baseContractId,
      });
      expect(published.published).toBe(true);

      expect(mockPost).toHaveBeenCalledTimes(5);
    });
  });

  // =====================================================================
  // FLUJO COMPLETO: ARRENDATARIO REVISA Y ACEPTA CONTRATO
  // =====================================================================

  describe('Complete Tenant Workflow', () => {
    it('should accept tenant invitation', async () => {
      mockPost.mockResolvedValueOnce({ data: contractStates.tenantReviewing });

      const contract = await LandlordContractService.acceptTenantInvitation({
        invitation_token: 'test-token-123',
      });

      expect(contract.current_state).toBe('TENANT_REVIEWING');
    });

    it('should complete tenant data submission', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          ...contractStates.tenantReviewing,
          current_state: 'LANDLORD_REVIEWING',
        },
      });

      const result = await LandlordContractService.completeTenantData({
        contract_id: baseContractId,
        tenant_data: mockTenantData,
      });

      expect(result.current_state).toBe('LANDLORD_REVIEWING');
    });

    it('should approve contract as tenant', async () => {
      mockPost.mockResolvedValueOnce({ data: contractStates.readyToSign });

      const result = await LandlordContractService.approveTenantContract({
        contract_id: baseContractId,
      });

      expect(result.current_state).toBe('READY_TO_SIGN');
      expect(result.tenant_approved).toBe(true);
    });

    it('should handle tenant objections workflow', async () => {
      const objectionData = {
        contract_id: baseContractId,
        field_name: 'monthly_rent',
        current_value: '2500000',
        proposed_value: '2200000',
        justification: 'Precio muy alto para la zona',
        priority: 'HIGH' as const,
      };

      mockPost.mockResolvedValueOnce({
        data: {
          id: 'objection-123',
          ...objectionData,
          status: 'PENDING',
          created_at: new Date().toISOString(),
        },
      });

      const objection =
        await LandlordContractService.submitObjection(objectionData);

      expect(objection.field_name).toBe('monthly_rent');
      expect(objection.proposed_value).toBe('2200000');
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('should sign contract as tenant', async () => {
      mockPost.mockResolvedValueOnce({ data: contractStates.fullySigned });

      const result = await LandlordContractService.signTenantContract({
        contract_id: baseContractId,
        signature_data: 'base64-tenant-signature',
      });

      expect(result.current_state).toBe('FULLY_SIGNED');
      expect(result.tenant_signed).toBe(true);
    });
  });

  // =====================================================================
  // FLUJO COMPLETO: FIRMA BIOMÉTRICA INTEGRADA
  // =====================================================================

  describe('Complete Biometric Signing Workflow', () => {
    it('should complete full biometric authentication and signing', async () => {
      // Step 1: Start biometric auth
      mockPost.mockResolvedValueOnce({
        data: { authenticationId: 'auth-123', securityLevel: 'high' },
      });

      const authInit =
        await contractService.startBiometricAuthentication(baseContractId);
      expect(authInit.authenticationId).toBe('auth-123');

      // Step 2: Face capture
      mockPost.mockResolvedValueOnce({
        data: {
          step: 'face_front',
          status: 'success',
          confidenceScore: 0.95,
          nextStep: 'document',
        },
      });

      const faceResult = await contractService.processFaceCapture(
        baseContractId,
        'front',
        'side'
      );
      expect(faceResult.confidenceScore).toBe(0.95);

      // Step 3: Document verification
      mockPost.mockResolvedValueOnce({
        data: {
          step: 'document',
          status: 'success',
          confidenceScore: 0.98,
          extractedData: {
            documentNumber: '12345678',
            fullName: 'ANA MARIA GONZALEZ',
          },
        },
      });

      const docResult = await contractService.processDocumentVerification(
        baseContractId,
        'doc-img',
        'CC'
      );
      expect(docResult.extractedData.fullName).toBe('ANA MARIA GONZALEZ');

      // Step 4: Voice verification
      mockPost.mockResolvedValueOnce({
        data: {
          step: 'voice',
          status: 'success',
          confidenceScore: 0.89,
          transcription: 'Acepto los términos',
        },
      });

      const voiceResult = await contractService.processVoiceVerification(
        baseContractId,
        'voice-data',
        'Acepto los términos'
      );
      expect(voiceResult.confidenceScore).toBe(0.89);

      // Step 5: Complete authentication
      mockPost.mockResolvedValueOnce({
        data: {
          contract_id: baseContractId,
          biometric_verified: true,
          confidence_scores: { overall_confidence: 0.94 },
          certificate_id: 'cert-123',
        },
      });

      const completion =
        await contractService.completeAuthentication(baseContractId);
      expect(completion.biometric_verified).toBe(true);
      expect(completion.confidence_scores.overall_confidence).toBe(0.94);

      expect(mockPost).toHaveBeenCalledTimes(5);
    });
  });

  // =====================================================================
  // FLUJO COMPLETO: DASHBOARD INTEGRADO
  // =====================================================================

  describe('Dashboard Integration', () => {
    it('should fetch all contract data for dashboard', async () => {
      const allContractStates = [
        contractStates.draft,
        contractStates.tenantInvited,
        contractStates.tenantReviewing,
        contractStates.readyToSign,
        contractStates.published,
      ];

      mockGet.mockResolvedValueOnce({
        data: {
          contracts: allContractStates,
          total_count: allContractStates.length,
          page: 1,
          page_size: 10,
          has_next: false,
          has_previous: false,
        },
      });

      const result = await LandlordContractService.getContracts();

      expect(result.contracts).toHaveLength(5);
      expect(result.total_count).toBe(5);

      // Verify different states are present
      const states = result.contracts.map((c: any) => c.current_state);
      expect(states).toContain('DRAFT');
      expect(states).toContain('PUBLISHED');
    });

    it('should fetch statistics for dashboard display', async () => {
      const stats = createMockStatistics({
        total_contracts: 5,
        monthly_income: 12500000,
        occupancy_rate: 80,
      });

      mockGet.mockResolvedValueOnce({ data: stats });

      const result = await LandlordContractService.getLandlordStatistics();

      expect(result.total_contracts).toBe(5);
      expect(result.monthly_income).toBe(12500000);
      expect(result.occupancy_rate).toBe(80);
    });

    it('should fetch landlord dashboard data', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          active_contracts: 10,
          pending_signatures: 3,
          monthly_income: 25000000,
          expiring_contracts: 2,
          recent_activities: [],
          contract_status_breakdown: { PUBLISHED: 7, DRAFT: 3 },
        },
      });

      const dashboard = await LandlordContractService.getLandlordDashboard();

      expect(dashboard.active_contracts).toBe(10);
      expect(dashboard.pending_signatures).toBe(3);
      expect(dashboard.monthly_income).toBe(25000000);
    });
  });

  // =====================================================================
  // FLUJO COMPLETO: MANEJO DE ERRORES INTEGRADO
  // =====================================================================

  describe('Error Handling Integration', () => {
    it('should handle network errors gracefully across workflow', async () => {
      mockPost.mockRejectedValueOnce({
        message: 'Network Error',
        code: 'ERR_NETWORK',
      });

      try {
        await LandlordContractService.createContract({ monthly_rent: 2500000 });
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.code).toBe('ERR_NETWORK');
      }
    });

    it('should handle validation errors in contract creation', async () => {
      mockPost.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            details: {
              monthly_rent: ['Este campo es requerido'],
              property_address: ['Este campo es requerido'],
            },
          },
        },
      });

      try {
        await LandlordContractService.createContract({});
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.details.monthly_rent).toBeDefined();
      }
    });

    it('should handle unauthorized access during workflow', async () => {
      mockPost.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: 'token_expired', message: 'Token has expired' },
        },
      });

      try {
        await LandlordContractService.approveLandlordContract({
          contract_id: baseContractId,
        });
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('token_expired');
      }
    });

    it('should handle forbidden access for wrong role', async () => {
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
        await LandlordContractService.publishContract({
          contract_id: baseContractId,
        });
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.required_role).toBe('landlord');
      }
    });
  });

  // =====================================================================
  // FLUJO COMPLETO: PERFORMANCE Y OPTIMIZACIÓN
  // =====================================================================

  describe('Performance Integration', () => {
    it('should handle large contract datasets efficiently', async () => {
      const largeContractList = Array.from({ length: 100 }, (_, index) =>
        createMockContract('PUBLISHED', {
          id: `contract-${index}`,
          property_address: `Propiedad ${index}`,
        })
      );

      mockGet.mockResolvedValueOnce({
        data: {
          contracts: largeContractList,
          total_count: largeContractList.length,
          page: 1,
          page_size: 100,
          has_next: false,
          has_previous: false,
        },
      });

      const startTime = performance.now();
      const result = await LandlordContractService.getContracts();
      const endTime = performance.now();

      expect(result.contracts).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle concurrent operations efficiently', async () => {
      // Setup multiple mock responses
      mockGet.mockResolvedValue({
        data: {
          contracts: [],
          total_count: 0,
          page: 1,
          page_size: 10,
          has_next: false,
          has_previous: false,
        },
      });

      const startTime = performance.now();

      const promises = [
        LandlordContractService.getContracts(),
        LandlordContractService.getLandlordStatistics(),
        LandlordContractService.getContracts(),
      ];

      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(3);
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
