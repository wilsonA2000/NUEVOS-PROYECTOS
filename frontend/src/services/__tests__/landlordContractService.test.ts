/**
 * Tests Unitarios para LandlordContractService
 * Cubre todos los métodos del servicio de contratos controlados por arrendador
 * Incluye tests para workflow, validaciones, errores y casos edge
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import MockAdapter from 'axios-mock-adapter';
import { api } from '../api';
import { LandlordContractService } from '../landlordContractService';
import {
  LandlordControlledContractData,
  ContractWorkflowState,
  ContractFilters,
  ContractStatistics,
  CreateContractPayload,
  SendTenantInvitationPayload,
  CompleteTenantDataPayload,
  DigitalSignaturePayload,
  ApproveContractPayload,
  PublishContractPayload,
  TenantData,
  LandlordData,
} from '../../types/landlordContract';

// Mock del adaptador HTTP
let mockAxios: MockAdapter;

// Datos de prueba
const mockLandlordData: LandlordData = {
  full_name: 'Juan Carlos Pérez',
  document_type: 'CC',
  document_number: '12345678',
  phone: '+57 300 123 4567',
  email: 'juan.perez@example.com',
  address: 'Calle 123 #45-67',
  city: 'Bogotá',
  department: 'Cundinamarca',
  country: 'Colombia',
  emergency_contact: 'María Pérez',
  emergency_phone: '+57 300 765 4321',
  bank_account: '1234567890',
  bank_name: 'Banco de Bogotá',
  account_type: 'savings',
  profession: 'Arquitecto'
};

const mockTenantData: TenantData = {
  full_name: 'Ana María González',
  document_type: 'CC',
  document_number: '87654321',
  phone: '+57 301 987 6543',
  email: 'ana.gonzalez@example.com',
  current_address: 'Carrera 15 #20-30',
  city: 'Medellín',
  department: 'Antioquia',
  country: 'Colombia',
  employment_type: 'employee',
  company_name: 'TechCorp S.A.S',
  position: 'Desarrolladora Senior',
  monthly_income: 5000000,
  personal_references: [
    {
      name: 'Carlos Silva',
      relationship: 'Amigo',
      phone: '+57 302 111 2222',
      years_known: 5
    }
  ],
  commercial_references: [
    {
      type: 'bank',
      institution_name: 'Bancolombia',
      phone: '+57 1 343 0000',
      relationship_duration_months: 24,
      payment_behavior: 'excellent'
    }
  ],
  emergency_contact: 'Luis González',
  emergency_phone: '+57 302 555 6666',
  emergency_relationship: 'Hermano'
};

const mockContract: LandlordControlledContractData = {
  id: 'contract-123',
  contract_number: 'VH-2025-001',
  current_state: 'DRAFT',
  created_at: '2025-01-01T10:00:00Z',
  updated_at: '2025-01-01T10:00:00Z',
  property_id: 'property-456',
  property_address: 'Apartamento 501, Torre Central, El Poblado',
  property_type: 'apartamento',
  property_area: 80,
  property_stratum: 5,
  property_rooms: 2,
  property_bathrooms: 2,
  property_parking_spaces: 1,
  property_furnished: true,
  monthly_rent: 2500000,
  security_deposit: 2500000,
  contract_duration_months: 12,
  rent_increase_type: 'ipc',
  payment_day: 5,
  utilities_included: false,
  internet_included: true,
  pets_allowed: false,
  smoking_allowed: false,
  guests_policy: 'limited',
  max_occupants: 2,
  guarantor_required: true,
  guarantor_type: 'personal',
  maintenance_responsibility: 'tenant',
  utilities_responsibility: 'tenant',
  insurance_responsibility: 'tenant',
  special_clauses: ['Mantenimiento de aires acondicionados por cuenta del arrendador'],
  landlord_data: mockLandlordData,
  landlord_approved: false,
  tenant_approved: false,
  landlord_signed: false,
  tenant_signed: false,
  published: false,
  workflow_history: []
};

const mockStatistics: ContractStatistics = {
  total_contracts: 15,
  by_state: {
    'DRAFT': 3,
    'TENANT_INVITED': 2,
    'TENANT_REVIEWING': 1,
    'LANDLORD_REVIEWING': 2,
    'OBJECTIONS_PENDING': 1,
    'BOTH_REVIEWING': 1,
    'READY_TO_SIGN': 2,
    'FULLY_SIGNED': 1,
    'PUBLISHED': 2,
    'EXPIRED': 0,
    'TERMINATED': 0,
    'CANCELLED': 0
  },
  by_property_type: {
    'apartamento': 8,
    'casa': 5,
    'local_comercial': 1,
    'oficina': 1,
    'bodega': 0,
    'habitacion': 0,
    'finca': 0,
    'lote': 0
  },
  average_rent: 2800000,
  total_rent_value: 42000000,
  pending_signatures: 3,
  expiring_soon: 1,
  objections_pending: 1,
  fully_executed: 2,
  monthly_income: 5600000,
  occupancy_rate: 85.7
};

describe('LandlordContractService', () => {
  beforeEach(() => {
    mockAxios = new MockAdapter(api);
  });

  afterEach(() => {
    mockAxios.restore();
    jest.clearAllMocks();
  });

  // =====================================================================
  // TESTS DE CREACIÓN Y GESTIÓN DE CONTRATOS
  // =====================================================================

  describe('Contract Creation and Management', () => {
    it('should create a new contract draft successfully', async () => {
      const payload: CreateContractPayload = {
        property_id: 'property-456',
        contract_template: 'standard_rental',
        basic_terms: {
          monthly_rent: 2500000,
          security_deposit: 2500000,
          duration_months: 12,
          utilities_included: false,
          pets_allowed: false,
          smoking_allowed: false
        }
      };

      mockAxios.onPost('/api/v1/contracts/landlord/contracts/').reply(201, mockContract);

      const result = await LandlordContractService.createContractDraft(payload);

      expect(result).toEqual(mockContract);
      expect(result.current_state).toBe('DRAFT');
      expect(result.monthly_rent).toBe(2500000);
    });

    it('should handle contract creation errors', async () => {
      const payload: CreateContractPayload = {
        property_id: '',
        contract_template: 'invalid',
        basic_terms: {
          monthly_rent: 0,
          security_deposit: 0,
          duration_months: 0,
          utilities_included: false,
          pets_allowed: false,
          smoking_allowed: false
        }
      };

      mockAxios.onPost('/api/v1/contracts/landlord/contracts/').reply(400, {
        error: 'Invalid contract data',
        details: {
          property_id: ['This field is required'],
          monthly_rent: ['Must be greater than 0']
        }
      });

      await expect(LandlordContractService.createContractDraft(payload))
        .rejects
        .toThrow();
    });

    it('should update contract draft successfully', async () => {
      const contractId = 'contract-123';
      const updateData = {
        monthly_rent: 2800000,
        security_deposit: 2800000,
        special_clauses: ['Nueva cláusula especial']
      };

      const updatedContract = {
        ...mockContract,
        ...updateData,
        updated_at: '2025-01-01T11:00:00Z'
      };

      mockAxios.onPatch(`/api/v1/contracts/landlord/contracts/${contractId}/`)
        .reply(200, updatedContract);

      const result = await LandlordContractService.updateContractDraft(contractId, updateData);

      expect(result.monthly_rent).toBe(2800000);
      expect(result.special_clauses).toContain('Nueva cláusula especial');
    });

    it('should get landlord contracts with filters', async () => {
      const filters: ContractFilters = {
        state: ['DRAFT', 'TENANT_INVITED'],
        min_rent: 2000000,
        max_rent: 4000000
      };

      const mockResponse = {
        contracts: [mockContract],
        total_count: 1,
        page: 1,
        page_size: 10,
        has_next: false,
        has_previous: false
      };

      mockAxios.onGet(/\/api\/v1\/contracts\/landlord\/contracts\/.*/)
        .reply(200, mockResponse);

      const result = await LandlordContractService.getLandlordContracts(filters, 1, 10);

      expect(result.contracts).toHaveLength(1);
      expect(result.total_count).toBe(1);
      expect(result.contracts[0].current_state).toBe('DRAFT');
    });

    it('should get specific landlord contract', async () => {
      const contractId = 'contract-123';

      mockAxios.onGet(`/api/v1/contracts/landlord/contracts/${contractId}/`)
        .reply(200, mockContract);

      const result = await LandlordContractService.getLandlordContract(contractId);

      expect(result).toEqual(mockContract);
      expect(result.id).toBe(contractId);
    });
  });

  // =====================================================================
  // TESTS DE WORKFLOW Y ESTADOS
  // =====================================================================

  describe('Workflow and State Management', () => {
    it('should complete landlord data successfully', async () => {
      const payload = {
        contract_id: 'contract-123',
        landlord_data: mockLandlordData
      };

      const expectedResponse = {
        contract: {
          ...mockContract,
          landlord_data: mockLandlordData,
          current_state: 'DRAFT' as ContractWorkflowState
        },
        invitation_token: 'secure-token-12345'
      };

      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${payload.contract_id}/complete-landlord-data/`)
        .reply(200, expectedResponse);

      const result = await LandlordContractService.completeLandlordData(payload);

      expect(result.contract.landlord_data.full_name).toBe('Juan Carlos Pérez');
      expect(result.invitation_token).toBeTruthy();
    });

    it('should send tenant invitation', async () => {
      const payload: SendTenantInvitationPayload = {
        contract_id: 'contract-123',
        tenant_email: 'ana.gonzalez@example.com',
        tenant_phone: '+57 301 987 6543',
        tenant_name: 'Ana María González',
        invitation_method: 'email',
        personal_message: 'Te invito a revisar el contrato de arrendamiento',
        expires_in_days: 7
      };

      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${payload.contract_id}/send-invitation/`)
        .reply(200, { success: true });

      const result = await LandlordContractService.sendTenantInvitation(payload);

      expect(result.success).toBe(true);
    });

    it('should approve landlord contract', async () => {
      const payload: ApproveContractPayload = {
        contract_id: 'contract-123'
      };

      const approvedContract = {
        ...mockContract,
        landlord_approved: true,
        landlord_approved_at: '2025-01-01T12:00:00Z',
        current_state: 'BOTH_REVIEWING' as ContractWorkflowState
      };

      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${payload.contract_id}/approve/`)
        .reply(200, approvedContract);

      const result = await LandlordContractService.approveLandlordContract(payload);

      expect(result.landlord_approved).toBe(true);
      expect(result.current_state).toBe('BOTH_REVIEWING');
    });

    it('should sign landlord contract with biometric data', async () => {
      const payload: DigitalSignaturePayload = {
        contract_id: 'contract-123',
        signature_data: {
          signature_image: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
          signature_metadata: {
            width: 300,
            height: 150,
            timestamp: '2025-01-01T13:00:00Z'
          },
          biometric_data: {
            face_confidence: 0.95,
            document_confidence: 0.98,
            voice_confidence: 0.92,
            overall_confidence: 0.95
          },
          device_info: {
            user_agent: 'Mozilla/5.0...',
            screen_resolution: '1920x1080',
            device_type: 'desktop'
          },
          location: {
            latitude: 4.5709,
            longitude: -74.2973,
            accuracy: 10
          },
          timestamp: '2025-01-01T13:00:00Z'
        }
      };

      const signedContract = {
        ...mockContract,
        landlord_signed: true,
        landlord_signed_at: '2025-01-01T13:00:00Z',
        landlord_signature_data: payload.signature_data,
        current_state: 'READY_TO_SIGN' as ContractWorkflowState
      };

      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${payload.contract_id}/sign/`)
        .reply(200, signedContract);

      const result = await LandlordContractService.signLandlordContract(payload);

      expect(result.landlord_signed).toBe(true);
      expect(result.landlord_signature_data).toBeDefined();
      expect(result.current_state).toBe('READY_TO_SIGN');
    });

    it('should publish contract successfully', async () => {
      const payload: PublishContractPayload = {
        contract_id: 'contract-123'
      };

      const publishedContract = {
        ...mockContract,
        published: true,
        published_at: '2025-01-01T14:00:00Z',
        current_state: 'PUBLISHED' as ContractWorkflowState
      };

      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${payload.contract_id}/publish/`)
        .reply(200, publishedContract);

      const result = await LandlordContractService.publishContract(payload);

      expect(result.published).toBe(true);
      expect(result.current_state).toBe('PUBLISHED');
      expect(result.published_at).toBeTruthy();
    });
  });

  // =====================================================================
  // TESTS DE OPERACIONES DEL ARRENDATARIO
  // =====================================================================

  describe('Tenant Operations', () => {
    it('should accept tenant invitation', async () => {
      const payload = {
        invitation_token: 'secure-token-12345'
      };

      const contractWithTenant = {
        ...mockContract,
        current_state: 'TENANT_REVIEWING' as ContractWorkflowState,
        tenant_email: 'ana.gonzalez@example.com'
      };

      mockAxios.onPost('/api/v1/contracts/tenant/accept-invitation/')
        .reply(200, contractWithTenant);

      const result = await LandlordContractService.acceptTenantInvitation(payload);

      expect(result.current_state).toBe('TENANT_REVIEWING');
      expect(result.tenant_email).toBe('ana.gonzalez@example.com');
    });

    it('should complete tenant data', async () => {
      const payload: CompleteTenantDataPayload = {
        contract_id: 'contract-123',
        tenant_data: mockTenantData
      };

      const contractWithTenantData = {
        ...mockContract,
        tenant_data: mockTenantData,
        current_state: 'LANDLORD_REVIEWING' as ContractWorkflowState
      };

      mockAxios.onPost(`/api/v1/contracts/tenant/contracts/${payload.contract_id}/complete-data/`)
        .reply(200, contractWithTenantData);

      const result = await LandlordContractService.completeTenantData(payload);

      expect(result.tenant_data?.full_name).toBe('Ana María González');
      expect(result.current_state).toBe('LANDLORD_REVIEWING');
    });

    it('should get tenant contracts', async () => {
      const filters: ContractFilters = {
        tenant_id: 'tenant-789'
      };

      const mockResponse = {
        contracts: [mockContract],
        total_count: 1,
        page: 1,
        page_size: 10,
        has_next: false,
        has_previous: false
      };

      mockAxios.onGet(/\/api\/v1\/contracts\/tenant\/contracts\/.*/)
        .reply(200, mockResponse);

      const result = await LandlordContractService.getTenantContracts(filters);

      expect(result.contracts).toHaveLength(1);
      expect(result.total_count).toBe(1);
    });

    it('should approve tenant contract', async () => {
      const payload: ApproveContractPayload = {
        contract_id: 'contract-123'
      };

      const approvedContract = {
        ...mockContract,
        tenant_approved: true,
        tenant_approved_at: '2025-01-01T12:00:00Z',
        current_state: 'BOTH_REVIEWING' as ContractWorkflowState
      };

      mockAxios.onPost(`/api/v1/contracts/tenant/contracts/${payload.contract_id}/approve/`)
        .reply(200, approvedContract);

      const result = await LandlordContractService.approveTenantContract(payload);

      expect(result.tenant_approved).toBe(true);
      expect(result.current_state).toBe('BOTH_REVIEWING');
    });

    it('should sign tenant contract', async () => {
      const payload: DigitalSignaturePayload = {
        contract_id: 'contract-123',
        signature_data: {
          signature_image: 'data:image/png;base64,tenant-signature...',
          signature_metadata: { width: 300, height: 150, timestamp: '2025-01-01T13:30:00Z' },
          device_info: { user_agent: 'Mozilla/5.0...', device_type: 'mobile' },
          timestamp: '2025-01-01T13:30:00Z'
        }
      };

      const signedContract = {
        ...mockContract,
        tenant_signed: true,
        tenant_signed_at: '2025-01-01T13:30:00Z',
        tenant_signature_data: payload.signature_data,
        current_state: 'FULLY_SIGNED' as ContractWorkflowState
      };

      mockAxios.onPost(`/api/v1/contracts/tenant/contracts/${payload.contract_id}/sign/`)
        .reply(200, signedContract);

      const result = await LandlordContractService.signTenantContract(payload);

      expect(result.tenant_signed).toBe(true);
      expect(result.current_state).toBe('FULLY_SIGNED');
    });
  });

  // =====================================================================
  // TESTS DE ESTADÍSTICAS Y DASHBOARDS
  // =====================================================================

  describe('Statistics and Dashboard', () => {
    it('should get landlord statistics', async () => {
      mockAxios.onGet('/api/v1/contracts/landlord/statistics/')
        .reply(200, mockStatistics);

      const result = await LandlordContractService.getLandlordStatistics();

      expect(result.total_contracts).toBe(15);
      expect(result.average_rent).toBe(2800000);
      expect(result.monthly_income).toBe(5600000);
      expect(result.occupancy_rate).toBe(85.7);
    });

    it('should get contract statistics (unified)', async () => {
      mockAxios.onGet('/api/v1/contracts/statistics/')
        .reply(200, mockStatistics);

      const result = await LandlordContractService.getContractStatistics();

      expect(result).toEqual(mockStatistics);
      expect(result.by_state.PUBLISHED).toBe(2);
      expect(result.by_property_type.apartamento).toBe(8);
    });

    it('should get landlord dashboard data', async () => {
      const dashboardData = {
        active_contracts: 2,
        pending_signatures: 3,
        monthly_income: 5600000,
        expiring_contracts: 1,
        recent_activities: [],
        contract_status_breakdown: {
          'DRAFT': 3,
          'PUBLISHED': 2,
          'READY_TO_SIGN': 2
        }
      };

      mockAxios.onGet('/api/v1/contracts/landlord/dashboard/')
        .reply(200, dashboardData);

      const result = await LandlordContractService.getLandlordDashboard();

      expect(result.active_contracts).toBe(2);
      expect(result.monthly_income).toBe(5600000);
      expect(result.contract_status_breakdown.PUBLISHED).toBe(2);
    });

    it('should get tenant dashboard data', async () => {
      const dashboardData = {
        active_contracts: 1,
        pending_actions: 2,
        next_payment_due: '2025-02-05',
        total_monthly_rent: 2500000,
        recent_activities: [],
        contract_status_breakdown: {
          'TENANT_REVIEWING': 1,
          'PUBLISHED': 1
        }
      };

      mockAxios.onGet('/api/v1/contracts/tenant/dashboard/')
        .reply(200, dashboardData);

      const result = await LandlordContractService.getTenantDashboard();

      expect(result.active_contracts).toBe(1);
      expect(result.total_monthly_rent).toBe(2500000);
      expect(result.pending_actions).toBe(2);
    });
  });

  // =====================================================================
  // TESTS DE SISTEMA DE INVITACIONES
  // =====================================================================

  describe('Invitation System', () => {
    it('should create tenant invitation with secure token', async () => {
      const payload = {
        contract_id: 'contract-123',
        tenant_email: 'ana.gonzalez@example.com',
        tenant_phone: '+57 301 987 6543',
        tenant_name: 'Ana María González',
        invitation_method: 'email' as const,
        personal_message: 'Te invito a revisar el contrato',
        expires_in_days: 7
      };

      const invitationResponse = {
        invitation_id: 'inv-456',
        invitation_token: 'secure-token-789',
        expires_at: '2025-01-08T10:00:00Z',
        invitation_url: 'https://verihome.com/contracts/invitation/secure-token-789'
      };

      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${payload.contract_id}/create-invitation/`)
        .reply(201, invitationResponse);

      const result = await LandlordContractService.createTenantInvitation(payload);

      expect(result.invitation_token).toBe('secure-token-789');
      expect(result.invitation_url).toContain('secure-token-789');
      expect(result.expires_at).toBeTruthy();
    });

    it('should verify invitation token', async () => {
      const token = 'secure-token-789';
      const verificationResponse = {
        is_valid: true,
        contract_id: 'contract-123',
        expires_at: '2025-01-08T10:00:00Z',
        landlord_name: 'Juan Carlos Pérez',
        property_address: 'Apartamento 501, Torre Central, El Poblado'
      };

      mockAxios.onPost('/api/v1/contracts/verify-invitation/')
        .reply(200, verificationResponse);

      const result = await LandlordContractService.verifyInvitationToken(token);

      expect(result.is_valid).toBe(true);
      expect(result.contract_id).toBe('contract-123');
      expect(result.landlord_name).toBe('Juan Carlos Pérez');
    });

    it('should handle invalid invitation token', async () => {
      const token = 'invalid-token';
      const verificationResponse = {
        is_valid: false,
        error: 'Token de invitación inválido o expirado'
      };

      mockAxios.onPost('/api/v1/contracts/verify-invitation/')
        .reply(200, verificationResponse);

      const result = await LandlordContractService.verifyInvitationToken(token);

      expect(result.is_valid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should get contract invitations history', async () => {
      const contractId = 'contract-123';
      const invitationsResponse = {
        invitations: [
          {
            id: 'inv-456',
            tenant_email: 'ana.gonzalez@example.com',
            tenant_name: 'Ana María González',
            invitation_method: 'email',
            status: 'accepted',
            created_at: '2025-01-01T10:00:00Z',
            expires_at: '2025-01-08T10:00:00Z',
            accepted_at: '2025-01-02T09:30:00Z'
          }
        ]
      };

      mockAxios.onGet(`/api/v1/contracts/landlord/contracts/${contractId}/invitations/`)
        .reply(200, invitationsResponse);

      const result = await LandlordContractService.getContractInvitations(contractId);

      expect(result.invitations).toHaveLength(1);
      expect(result.invitations[0].status).toBe('accepted');
      expect(result.invitations[0].tenant_email).toBe('ana.gonzalez@example.com');
    });
  });

  // =====================================================================
  // TESTS DE UTILIDADES Y HELPERS
  // =====================================================================

  describe('Utilities and Helpers', () => {
    it('should format currency correctly', () => {
      expect(LandlordContractService.formatCurrency(2500000)).toBe('$2.500.000');
      expect(LandlordContractService.formatCurrency(0)).toBe('$0');
      expect(LandlordContractService.formatCurrency(1000000.50)).toBe('$1.000.001');
    });

    it('should calculate total deposits correctly', () => {
      const contract = {
        ...mockContract,
        security_deposit: 2500000,
        utilities_deposit: 200000,
        pet_deposit: 300000,
        cleaning_deposit: 150000,
        key_deposit: 50000,
        pets_allowed: true
      };

      const total = LandlordContractService.calculateTotalDeposits(contract);
      
      expect(total).toBe(3200000); // Sum of all deposits including pet_deposit
    });

    it('should calculate total deposits without pet deposit when pets not allowed', () => {
      const contract = {
        ...mockContract,
        security_deposit: 2500000,
        utilities_deposit: 200000,
        pet_deposit: 300000,
        cleaning_deposit: 150000,
        key_deposit: 50000,
        pets_allowed: false
      };

      const total = LandlordContractService.calculateTotalDeposits(contract);
      
      expect(total).toBe(2900000); // Sum without pet_deposit
    });

    it('should validate if contract is ready for next step', () => {
      // Draft contract with landlord data
      const draftContract = {
        ...mockContract,
        current_state: 'DRAFT' as ContractWorkflowState,
        landlord_data: mockLandlordData,
        monthly_rent: 2500000
      };
      expect(LandlordContractService.isContractReadyForNextStep(draftContract)).toBe(true);

      // Draft contract without landlord data
      const incompleteDraft = {
        ...mockContract,
        current_state: 'DRAFT' as ContractWorkflowState,
        landlord_data: { ...mockLandlordData, full_name: '' },
        monthly_rent: 0
      };
      expect(LandlordContractService.isContractReadyForNextStep(incompleteDraft)).toBe(false);
    });

    it('should get next required action correctly', () => {
      const draftContract = {
        ...mockContract,
        current_state: 'DRAFT' as ContractWorkflowState
      };
      
      expect(LandlordContractService.getNextRequiredAction(draftContract, 'landlord'))
        .toBe('Completar datos y enviar invitación');
      
      expect(LandlordContractService.getNextRequiredAction(draftContract, 'tenant'))
        .toBe('Esperando invitación');

      const readyToSignContract = {
        ...mockContract,
        current_state: 'READY_TO_SIGN' as ContractWorkflowState,
        landlord_signed: false,
        tenant_signed: false
      };

      expect(LandlordContractService.getNextRequiredAction(readyToSignContract, 'landlord'))
        .toBe('Firmar digitalmente');
    });
  });

  // =====================================================================
  // TESTS DE MANEJO DE ERRORES
  // =====================================================================

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockAxios.onGet('/api/v1/contracts/landlord/statistics/')
        .networkError();

      await expect(LandlordContractService.getLandlordStatistics())
        .rejects
        .toThrow('Network Error');
    });

    it('should handle 404 errors for non-existent contracts', async () => {
      const contractId = 'non-existent-contract';

      mockAxios.onGet(`/api/v1/contracts/landlord/contracts/${contractId}/`)
        .reply(404, { error: 'Contract not found' });

      await expect(LandlordContractService.getLandlordContract(contractId))
        .rejects
        .toThrow();
    });

    it('should handle validation errors on contract creation', async () => {
      const invalidPayload: CreateContractPayload = {
        property_id: '',
        contract_template: '',
        basic_terms: {
          monthly_rent: -1000,
          security_deposit: -500,
          duration_months: 0,
          utilities_included: false,
          pets_allowed: false,
          smoking_allowed: false
        }
      };

      mockAxios.onPost('/api/v1/contracts/landlord/contracts/')
        .reply(400, {
          error: 'Validation failed',
          details: {
            property_id: ['Este campo es requerido'],
            monthly_rent: ['Debe ser mayor que 0'],
            duration_months: ['Debe ser mayor que 0']
          }
        });

      await expect(LandlordContractService.createContractDraft(invalidPayload))
        .rejects
        .toThrow();
    });

    it('should handle server errors gracefully', async () => {
      mockAxios.onGet('/api/v1/contracts/statistics/')
        .reply(500, { error: 'Internal server error' });

      await expect(LandlordContractService.getContractStatistics())
        .rejects
        .toThrow();
    });

    it('should handle timeout errors', async () => {
      mockAxios.onPost('/api/v1/contracts/landlord/contracts/')
        .timeout();

      const payload: CreateContractPayload = {
        property_id: 'property-456',
        contract_template: 'standard_rental',
        basic_terms: {
          monthly_rent: 2500000,
          security_deposit: 2500000,
          duration_months: 12,
          utilities_included: false,
          pets_allowed: false,
          smoking_allowed: false
        }
      };

      await expect(LandlordContractService.createContractDraft(payload))
        .rejects
        .toThrow('timeout');
    });
  });

  // =====================================================================
  // TESTS DE INTEGRACIÓN DE WORKFLOWS COMPLEJOS
  // =====================================================================

  describe('Complex Workflow Integration', () => {
    it('should complete full landlord workflow', async () => {
      const contractId = 'contract-123';

      // 1. Create contract
      mockAxios.onPost('/api/v1/contracts/landlord/contracts/')
        .reply(201, mockContract);

      // 2. Complete landlord data
      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${contractId}/complete-landlord-data/`)
        .reply(200, {
          contract: { ...mockContract, landlord_data: mockLandlordData },
          invitation_token: 'secure-token-123'
        });

      // 3. Send invitation
      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${contractId}/send-invitation/`)
        .reply(200, { success: true });

      // Execute workflow
      const createPayload: CreateContractPayload = {
        property_id: 'property-456',
        contract_template: 'standard_rental',
        basic_terms: {
          monthly_rent: 2500000,
          security_deposit: 2500000,
          duration_months: 12,
          utilities_included: false,
          pets_allowed: false,
          smoking_allowed: false
        }
      };

      const contract = await LandlordContractService.createContractDraft(createPayload);
      expect(contract.current_state).toBe('DRAFT');

      const landlordDataResult = await LandlordContractService.completeLandlordData({
        contract_id: contractId,
        landlord_data: mockLandlordData
      });
      expect(landlordDataResult.invitation_token).toBeTruthy();

      const invitationResult = await LandlordContractService.sendTenantInvitation({
        contract_id: contractId,
        tenant_email: 'ana.gonzalez@example.com',
        personal_message: 'Te invito a revisar el contrato'
      });
      expect(invitationResult.success).toBe(true);
    });

    it('should handle complete tenant acceptance workflow', async () => {
      const contractId = 'contract-123';
      const invitationToken = 'secure-token-123';

      // Mock sequence: accept invitation -> complete data -> approve
      mockAxios.onPost('/api/v1/contracts/tenant/accept-invitation/')
        .reply(200, {
          ...mockContract,
          current_state: 'TENANT_REVIEWING',
          tenant_email: 'ana.gonzalez@example.com'
        });

      mockAxios.onPost(`/api/v1/contracts/tenant/contracts/${contractId}/complete-data/`)
        .reply(200, {
          ...mockContract,
          tenant_data: mockTenantData,
          current_state: 'LANDLORD_REVIEWING'
        });

      mockAxios.onPost(`/api/v1/contracts/tenant/contracts/${contractId}/approve/`)
        .reply(200, {
          ...mockContract,
          tenant_approved: true,
          current_state: 'BOTH_REVIEWING'
        });

      // Execute tenant workflow
      const acceptedContract = await LandlordContractService.acceptTenantInvitation({
        invitation_token: invitationToken
      });
      expect(acceptedContract.current_state).toBe('TENANT_REVIEWING');

      const completedContract = await LandlordContractService.completeTenantData({
        contract_id: contractId,
        tenant_data: mockTenantData
      });
      expect(completedContract.current_state).toBe('LANDLORD_REVIEWING');

      const approvedContract = await LandlordContractService.approveTenantContract({
        contract_id: contractId
      });
      expect(approvedContract.tenant_approved).toBe(true);
      expect(approvedContract.current_state).toBe('BOTH_REVIEWING');
    });
  });
});