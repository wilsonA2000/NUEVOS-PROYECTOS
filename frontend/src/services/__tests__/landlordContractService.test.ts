/**
 * Comprehensive tests for LandlordContractService
 * Covers contract CRUD, workflow states, invitation system,
 * tenant operations, guarantees, PDF generation, and utilities.
 */

import { LandlordContractService } from '../landlordContractService';
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

describe('LandlordContractService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockContract = {
    id: 'contract-123',
    contract_number: 'VH-2025-001',
    current_state: 'DRAFT',
    monthly_rent: 2500000,
    security_deposit: 2500000,
    contract_duration_months: 12,
    landlord_data: {
      full_name: 'Juan Carlos Perez',
      document_type: 'CC',
      document_number: '12345678',
      phone: '+57 300 123 4567',
      email: 'juan@example.com',
      address: 'Calle 123',
      city: 'Bogota',
    },
    landlord_approved: false,
    tenant_approved: false,
    landlord_signed: false,
    tenant_signed: false,
    published: false,
    special_clauses: [],
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-01T10:00:00Z',
  };

  // ===== CONTRACT DRAFT CREATION =====

  describe('createContractDraft', () => {
    it('should create a new contract draft with transformed payload', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockContract });

      const payload = {
        property_id: 'prop-456',
        contract_template: 'standard_rental',
        basic_terms: {
          monthly_rent: 2500000,
          security_deposit: 2500000,
          duration_months: 12,
          utilities_included: false,
          pets_allowed: false,
          smoking_allowed: false,
        },
      };

      const result = await LandlordContractService.createContractDraft(payload);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/contracts/landlord/contracts/',
        expect.objectContaining({
          property: 'prop-456',
          basic_terms: expect.objectContaining({
            monthly_rent: 2500000,
            duration_months: 12,
          }),
        }),
      );
      expect(result).toEqual(mockContract);
    });

    it('should handle economic_terms fallback in payload', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockContract });

      const payload = {
        property_id: 'prop-456',
        contract_template: 'standard_rental',
        basic_terms: {},
        economic_terms: {
          monthly_rent: 3000000,
          security_deposit: 3000000,
        },
        contract_terms: {
          duration_months: 24,
        },
      };

      await LandlordContractService.createContractDraft(payload as any);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/contracts/landlord/contracts/',
        expect.objectContaining({
          basic_terms: expect.objectContaining({
            monthly_rent: 3000000,
            duration_months: 24,
          }),
        }),
      );
    });
  });

  describe('createContract (legacy alias)', () => {
    it('should transform generic data and create contract', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockContract });

      const genericData = {
        property_id: 'prop-456',
        monthly_rent: 2500000,
        security_deposit: 2500000,
        duration_months: 12,
        utilities_included: false,
        pets_allowed: true,
      };

      const result = await LandlordContractService.createContract(genericData);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/contracts/landlord/contracts/',
        expect.objectContaining({
          property: 'prop-456',
          pets_allowed: true,
        }),
      );
      expect(result).toEqual(mockContract);
    });
  });

  // ===== UPDATE AND FETCH =====

  describe('updateContractDraft', () => {
    it('should update contract draft with PATCH', async () => {
      const updatedContract = { ...mockContract, monthly_rent: 2800000 };
      mockedApi.patch.mockResolvedValueOnce({ data: updatedContract });

      const result = await LandlordContractService.updateContractDraft(
        'contract-123',
        {
          monthly_rent: 2800000,
        } as any,
      );

      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/contracts/landlord/contracts/contract-123/',
        {
          monthly_rent: 2800000,
        },
      );
      expect(result.monthly_rent).toBe(2800000);
    });
  });

  describe('getLandlordContracts', () => {
    it('should fetch landlord contracts with pagination', async () => {
      const mockResponse = {
        contracts: [mockContract],
        total_count: 1,
        page: 1,
        page_size: 10,
      };
      mockedApi.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await LandlordContractService.getLandlordContracts(
        undefined,
        1,
        10,
      );

      expect(mockedApi.get).toHaveBeenCalledWith(
        expect.stringContaining('/contracts/landlord/contracts/'),
      );
      expect(result.contracts).toHaveLength(1);
    });

    it('should pass filters as URL params', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: { contracts: [], total_count: 0 },
      });

      await LandlordContractService.getLandlordContracts(
        { state: ['DRAFT'] } as any,
        2,
        5,
      );

      const calledUrl = mockedApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('page_size=5');
      expect(calledUrl).toContain('state=DRAFT');
    });
  });

  describe('getLandlordContract', () => {
    it('should fetch a specific contract by id', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockContract });

      const result =
        await LandlordContractService.getLandlordContract('contract-123');

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/contracts/landlord/contracts/contract-123/',
      );
      expect(result.id).toBe('contract-123');
    });
  });

  // ===== INVITATION SYSTEM =====

  describe('sendTenantInvitation', () => {
    it('should send tenant invitation with email and message', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

      const result = await LandlordContractService.sendTenantInvitation({
        contract_id: 'contract-123',
        tenant_email: 'tenant@example.com',
        personal_message: 'Bienvenido al contrato',
      });

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/contracts/landlord/contracts/contract-123/send-invitation/',
        expect.objectContaining({
          tenant_email: 'tenant@example.com',
        }),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('createTenantInvitation', () => {
    it('should create invitation with secure token', async () => {
      const invResponse = {
        invitation_id: 'inv-1',
        invitation_token: 'token-abc',
        expires_at: '2025-02-01T00:00:00Z',
        invitation_url: 'https://verihome.com/invitation/token-abc',
      };
      mockedApi.post.mockResolvedValueOnce({ data: invResponse });

      const result = await LandlordContractService.createTenantInvitation({
        contract_id: 'contract-123',
        tenant_email: 'tenant@example.com',
        invitation_method: 'email',
        expires_in_days: 7,
      });

      expect(result.invitation_token).toBe('token-abc');
      expect(result.invitation_url).toContain('token-abc');
    });
  });

  describe('verifyInvitationToken', () => {
    it('should verify a valid token', async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: {
          is_valid: true,
          contract_id: 'contract-123',
          landlord_name: 'Juan Perez',
        },
      });

      const result =
        await LandlordContractService.verifyInvitationToken('valid-token');

      expect(result.is_valid).toBe(true);
      expect(result.contract_id).toBe('contract-123');
    });

    it('should handle invalid token', async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: { is_valid: false },
      });

      const result =
        await LandlordContractService.verifyInvitationToken('bad-token');

      expect(result.is_valid).toBe(false);
    });
  });

  // ===== TENANT OPERATIONS =====

  describe('acceptTenantInvitation', () => {
    it('should accept invitation with token', async () => {
      const acceptedContract = {
        ...mockContract,
        current_state: 'TENANT_REVIEWING',
      };
      mockedApi.post.mockResolvedValueOnce({ data: acceptedContract });

      const result = await LandlordContractService.acceptTenantInvitation({
        invitation_token: 'token-abc',
      });

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/contracts/tenant/accept-invitation/',
        {
          invitation_token: 'token-abc',
        },
      );
      expect(result.current_state).toBe('TENANT_REVIEWING');
    });
  });

  describe('completeTenantData', () => {
    it('should submit tenant personal data', async () => {
      const tenantData = {
        full_name: 'Ana Gonzalez',
        document_type: 'CC',
        document_number: '87654321',
      };
      mockedApi.post.mockResolvedValueOnce({
        data: {
          ...mockContract,
          tenant_data: tenantData,
          current_state: 'LANDLORD_REVIEWING',
        },
      });

      const result = await LandlordContractService.completeTenantData({
        contract_id: 'contract-123',
        tenant_data: tenantData as any,
      });

      expect(result.current_state).toBe('LANDLORD_REVIEWING');
    });
  });

  // ===== GUARANTEE METHODS =====

  describe('createGuarantee', () => {
    it('should create a guarantee for a contract', async () => {
      const guarantee = { id: 'guar-1', type: 'personal', status: 'pending' };
      mockedApi.post.mockResolvedValueOnce({ data: guarantee });

      const result = await LandlordContractService.createGuarantee(
        'contract-123',
        {
          guarantee_type: 'personal',
        } as any,
      );

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/contracts/contract-123/guarantees/',
        {
          guarantee_type: 'personal',
        },
      );
      expect(result.id).toBe('guar-1');
    });
  });

  describe('getContractGuarantees', () => {
    it('should fetch guarantees for a contract', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [{ id: 'guar-1' }] });

      const result =
        await LandlordContractService.getContractGuarantees('contract-123');

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/contracts/contract-123/guarantees/',
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('verifyGuarantee', () => {
    it('should verify guarantee with notes', async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: { id: 'guar-1', verified: true },
      });

      const result = await LandlordContractService.verifyGuarantee(
        'guar-1',
        'Verificacion aprobada',
      );

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/contracts/guarantees/guar-1/verify/',
        {
          verification_notes: 'Verificacion aprobada',
        },
      );
    });
  });

  // ===== PDF METHODS =====

  describe('generateContractPDF', () => {
    it('should generate PDF with options', async () => {
      const pdfResponse = {
        pdf_generated: true,
        download_url: '/download/contract.pdf',
      };
      mockedApi.get.mockResolvedValueOnce({ data: pdfResponse });

      const result = await LandlordContractService.generateContractPDF(
        'contract-123',
        {
          includeSignatures: true,
          includeBiometric: true,
        },
      );

      const calledUrl = mockedApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('include_signatures=true');
      expect(calledUrl).toContain('include_biometric=true');
      expect(result.pdf_generated).toBe(true);
    });
  });

  describe('generateContractPreview', () => {
    it('should generate a preview PDF', async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: {
          pdf_url: 'https://example.com/preview.pdf',
          expires_at: '2025-02-01',
        },
      });

      const result =
        await LandlordContractService.generateContractPreview('contract-123');

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/contracts/contract-123/generate-preview/',
      );
      expect(result.pdf_url).toBeDefined();
    });
  });

  // ===== APPROVAL AND SIGNING =====

  describe('approveLandlordContract', () => {
    it('should approve contract as landlord', async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: { ...mockContract, landlord_approved: true },
      });

      const result = await LandlordContractService.approveLandlordContract({
        contract_id: 'contract-123',
      });

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/contracts/landlord/contracts/contract-123/approve/',
      );
      expect(result.landlord_approved).toBe(true);
    });
  });

  describe('publishContract', () => {
    it('should publish a fully signed contract', async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: { ...mockContract, published: true, current_state: 'PUBLISHED' },
      });

      const result = await LandlordContractService.publishContract({
        contract_id: 'contract-123',
      });

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/contracts/landlord/contracts/contract-123/publish/',
      );
      expect(result.published).toBe(true);
      expect(result.current_state).toBe('PUBLISHED');
    });
  });

  // ===== UTILITY METHODS =====

  describe('formatCurrency', () => {
    it('should format Colombian pesos', () => {
      const formatted = LandlordContractService.formatCurrency(2500000);
      expect(formatted).toContain('2.500.000');
    });

    it('should handle zero', () => {
      const formatted = LandlordContractService.formatCurrency(0);
      expect(formatted).toContain('0');
    });
  });

  describe('isContractReadyForNextStep', () => {
    it('should return true for DRAFT with valid landlord data and rent', () => {
      const contract = { ...mockContract, current_state: 'DRAFT' as any };
      expect(
        LandlordContractService.isContractReadyForNextStep(contract as any),
      ).toBe(true);
    });

    it('should return false for DRAFT without landlord name', () => {
      const contract = {
        ...mockContract,
        current_state: 'DRAFT' as any,
        landlord_data: { ...mockContract.landlord_data, full_name: '' },
        monthly_rent: 0,
      };
      expect(
        LandlordContractService.isContractReadyForNextStep(contract as any),
      ).toBe(false);
    });

    it('should return true for BOTH_REVIEWING when both approved', () => {
      const contract = {
        ...mockContract,
        current_state: 'BOTH_REVIEWING' as any,
        landlord_approved: true,
        tenant_approved: true,
      };
      expect(
        LandlordContractService.isContractReadyForNextStep(contract as any),
      ).toBe(true);
    });
  });

  describe('getNextRequiredAction', () => {
    it('should return correct action for landlord on DRAFT', () => {
      const action = LandlordContractService.getNextRequiredAction(
        mockContract as any,
        'landlord',
      );
      expect(action).toBe('Completar datos y enviar invitación');
    });

    it('should return correct action for tenant on DRAFT', () => {
      const action = LandlordContractService.getNextRequiredAction(
        mockContract as any,
        'tenant',
      );
      expect(action).toBe('Esperando invitación');
    });

    it('should return sign action for unsigned landlord on READY_TO_SIGN', () => {
      const contract = {
        ...mockContract,
        current_state: 'READY_TO_SIGN' as any,
        landlord_signed: false,
      };
      const action = LandlordContractService.getNextRequiredAction(
        contract as any,
        'landlord',
      );
      expect(action).toBe('Firmar digitalmente');
    });
  });

  // ===== ERROR HANDLING =====

  describe('Error Handling', () => {
    it('should propagate API errors on createContractDraft', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Validation failed'));

      await expect(
        LandlordContractService.createContractDraft({
          property_id: '',
          contract_template: '',
          basic_terms: {
            monthly_rent: 0,
            security_deposit: 0,
            duration_months: 0,
            utilities_included: false,
            pets_allowed: false,
            smoking_allowed: false,
          },
        }),
      ).rejects.toThrow('Validation failed');
    });

    it('should propagate 404 errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Not found'));

      await expect(
        LandlordContractService.getLandlordContract('nonexistent'),
      ).rejects.toThrow('Not found');
    });
  });
});
