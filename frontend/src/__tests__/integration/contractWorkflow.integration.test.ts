/**
 * Tests de Integración - Flujo Completo de Contratos
 * Prueba el workflow completo desde la creación hasta la publicación
 * Incluye interacciones entre servicios, componentes y APIs
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import MockAdapter from 'axios-mock-adapter';
import React from 'react';

// Components under test
import LandlordContractManager from '../../components/contracts/LandlordContractManager';
import TenantContractReview from '../../components/contracts/TenantContractReview';
import BiometricContractSigning from '../../components/contracts/BiometricContractSigning';
import ContractsDashboard from '../../components/contracts/ContractsDashboard';

// Services
import { LandlordContractService } from '../../services/landlordContractService';
import { api } from '../../services/api';

// Types
import {
  LandlordControlledContractData,
  ContractWorkflowState,
  TenantData,
  ContractObjection
} from '../../types/landlordContract';

// Test utilities
import {
  createMockContract,
  createMockTenantData,
  createMockUser,
  createMockInvitationResponse,
  createMockSignatureData,
  createTestDates,
  cleanupMocks
} from '../../test-utils/contractTestUtils';

// Mock hooks
import { useAuth } from '../../hooks/useAuth';
jest.mock('../../hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock API
let mockAxios: MockAdapter;

// Theme para testing
const theme = createTheme();

// Test wrapper con providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

// Mock data para flujo completo
const mockLandlordUser = createMockUser('landlord', {
  id: 'landlord-123',
  email: 'landlord@test.com',
  full_name: 'Juan Carlos Pérez'
});

const mockTenantUser = createMockUser('tenant', {
  id: 'tenant-456',
  email: 'tenant@test.com',
  full_name: 'Ana María González'
});

const mockTenantData = createMockTenantData({
  full_name: 'Ana María González',
  email: 'tenant@test.com',
  phone: '+57 301 987 6543',
  monthly_income: 5000000
});

// Estados del contrato para el flujo completo
const createContractStates = (baseContract: LandlordControlledContractData) => ({
  draft: { ...baseContract, current_state: 'DRAFT' as ContractWorkflowState },
  tenantInvited: { 
    ...baseContract, 
    current_state: 'TENANT_INVITED' as ContractWorkflowState,
    tenant_email: 'tenant@test.com'
  },
  tenantReviewing: { 
    ...baseContract, 
    current_state: 'TENANT_REVIEWING' as ContractWorkflowState,
    tenant_data: mockTenantData
  },
  landlordReviewing: { 
    ...baseContract, 
    current_state: 'LANDLORD_REVIEWING' as ContractWorkflowState,
    tenant_data: mockTenantData,
    tenant_approved: true
  },
  readyToSign: { 
    ...baseContract, 
    current_state: 'READY_TO_SIGN' as ContractWorkflowState,
    tenant_data: mockTenantData,
    landlord_approved: true,
    tenant_approved: true
  },
  fullySigned: { 
    ...baseContract, 
    current_state: 'FULLY_SIGNED' as ContractWorkflowState,
    tenant_data: mockTenantData,
    landlord_approved: true,
    tenant_approved: true,
    landlord_signed: true,
    tenant_signed: true
  },
  published: { 
    ...baseContract, 
    current_state: 'PUBLISHED' as ContractWorkflowState,
    tenant_data: mockTenantData,
    landlord_approved: true,
    tenant_approved: true,
    landlord_signed: true,
    tenant_signed: true,
    published: true,
    published_at: new Date().toISOString()
  }
});

describe('Contract Workflow Integration Tests', () => {
  let baseContract: LandlordControlledContractData;
  let contractStates: ReturnType<typeof createContractStates>;

  beforeAll(() => {
    // Configurar mocks globales para APIs del navegador
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }]
      })
    } as any;

    global.MediaRecorder = jest.fn().mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      state: 'inactive'
    })) as any;

    global.HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
      fillStyle: '',
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) }))
    });

    global.HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock-signature');
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  beforeEach(() => {
    mockAxios = new MockAdapter(api);
    jest.clearAllMocks();

    // Crear contrato base para tests
    baseContract = createMockContract('DRAFT', {
      id: 'integration-contract-123',
      property_address: 'Apartamento de Integración, El Poblado'
    });

    contractStates = createContractStates(baseContract);
  });

  afterEach(() => {
    mockAxios.restore();
    cleanupMocks();
  });

  afterAll(() => {
    // Limpiar mocks globales
    delete (global.navigator as any).mediaDevices;
    delete (global as any).MediaRecorder;
  });

  // =====================================================================
  // FLUJO COMPLETO: ARRENDADOR CREA Y GESTIONA CONTRATO
  // =====================================================================

  describe('Complete Landlord Workflow', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockLandlordUser,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        isAuthenticated: true
      });
    });

    it('should complete full contract creation and invitation workflow', async () => {
      const user = userEvent.setup();

      // Mock APIs para flujo completo
      mockAxios.onPost('/api/v1/contracts/landlord/contracts/').reply(201, contractStates.draft);
      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${baseContract.id}/create-invitation/`)
        .reply(201, createMockInvitationResponse());
      mockAxios.onPost(/\/api\/v1\/contracts\/invitations\/.+\/send\//)
        .reply(200, { success: true, method: 'email' });

      render(
        <TestWrapper>
          <LandlordContractManager />
        </TestWrapper>
      );

      // Paso 1: Crear nuevo contrato
      const createButton = await screen.findByText('Crear Nuevo Contrato');
      await user.click(createButton);

      // Llenar formulario básico
      const addressInput = screen.getByLabelText(/Dirección de la Propiedad/);
      await user.type(addressInput, 'Apartamento de Integración Test');

      const rentInput = screen.getByLabelText(/Canon de Arrendamiento/);
      await user.clear(rentInput);
      await user.type(rentInput, '2500000');

      // Guardar contrato
      const saveButton = screen.getByText('Crear Contrato');
      await user.click(saveButton);

      // Verificar creación exitosa
      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(1);
        expect(mockAxios.history.post[0].url).toBe('/api/v1/contracts/landlord/contracts/');
      });

      // Paso 2: Invitar arrendatario
      await waitFor(() => {
        expect(screen.getByText('Invitar Arrendatario')).toBeInTheDocument();
      });

      const inviteButton = screen.getByText('Invitar Arrendatario');
      await user.click(inviteButton);

      // Llenar datos de invitación
      const emailInput = screen.getByLabelText(/Email del Arrendatario/);
      await user.type(emailInput, 'tenant@test.com');

      const nameInput = screen.getByLabelText(/Nombre del Arrendatario/);
      await user.type(nameInput, 'Ana María González');

      // Enviar invitación
      const sendInviteButton = screen.getByText('Enviar Invitación');
      await user.click(sendInviteButton);

      // Verificar invitación enviada
      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(3); // Create + CreateInvitation + Send
        expect(screen.getByText(/Invitación Enviada/)).toBeInTheDocument();
      });
    });

    it('should handle contract editing and approval workflow', async () => {
      const user = userEvent.setup();

      // Mock contrato en estado LANDLORD_REVIEWING
      mockAxios.onGet('/api/v1/contracts/landlord/contracts/')
        .reply(200, { contracts: [contractStates.landlordReviewing] });
      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${baseContract.id}/approve/`)
        .reply(200, contractStates.readyToSign);

      render(
        <TestWrapper>
          <LandlordContractManager />
        </TestWrapper>
      );

      // Esperar carga de contratos
      await waitFor(() => {
        expect(screen.getByText('Apartamento de Integración, El Poblado')).toBeInTheDocument();
      });

      // Abrir acciones del contrato
      const moreButton = screen.getByLabelText('more');
      await user.click(moreButton);

      // Aprobar contrato
      const approveButton = screen.getByText('Aprobar');
      await user.click(approveButton);

      // Confirmar aprobación
      const confirmButton = screen.getByText('Confirmar Aprobación');
      await user.click(confirmButton);

      // Verificar aprobación
      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(1);
        expect(mockAxios.history.post[0].url).toContain('/approve/');
      });
    });
  });

  // =====================================================================
  // FLUJO COMPLETO: ARRENDATARIO REVISA Y ACEPTA CONTRATO
  // =====================================================================

  describe('Complete Tenant Workflow', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockTenantUser,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        isAuthenticated: true
      });
    });

    it('should complete tenant review and approval workflow', async () => {
      const user = userEvent.setup();

      // Mock contrato en estado TENANT_REVIEWING
      mockAxios.onGet(`/api/v1/contracts/tenant/contract/${baseContract.id}/`)
        .reply(200, contractStates.tenantReviewing);
      mockAxios.onPost(`/api/v1/contracts/tenant/contract/${baseContract.id}/submit-data/`)
        .reply(200, { ...contractStates.tenantReviewing, current_state: 'LANDLORD_REVIEWING' });
      mockAxios.onPost(`/api/v1/contracts/tenant/contract/${baseContract.id}/approve/`)
        .reply(200, contractStates.readyToSign);

      render(
        <TestWrapper>
          <TenantContractReview contractId={baseContract.id} />
        </TestWrapper>
      );

      // Esperar carga del contrato
      await waitFor(() => {
        expect(screen.getByText('Apartamento de Integración, El Poblado')).toBeInTheDocument();
      });

      // Paso 1: Completar datos personales
      const fullNameInput = screen.getByLabelText(/Nombre Completo/);
      await user.clear(fullNameInput);
      await user.type(fullNameInput, 'Ana María González');

      const phoneInput = screen.getByLabelText(/Teléfono/);
      await user.type(phoneInput, '+57 301 987 6543');

      const incomeInput = screen.getByLabelText(/Ingresos Mensuales/);
      await user.type(incomeInput, '5000000');

      // Guardar datos
      const saveDataButton = screen.getByText('Guardar Datos');
      await user.click(saveDataButton);

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(1);
        expect(mockAxios.history.post[0].url).toContain('/submit-data/');
      });

      // Paso 2: Aprobar contrato
      const approveButton = screen.getByText('Aprobar Contrato');
      await user.click(approveButton);

      // Confirmar aprobación
      const confirmButton = screen.getByText('Confirmar Aprobación');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(2);
        expect(mockAxios.history.post[1].url).toContain('/approve/');
      });
    });

    it('should handle tenant objections workflow', async () => {
      const user = userEvent.setup();

      // Mock APIs para objeciones
      mockAxios.onGet(`/api/v1/contracts/tenant/contract/${baseContract.id}/`)
        .reply(200, contractStates.tenantReviewing);
      mockAxios.onPost(`/api/v1/contracts/tenant/contract/${baseContract.id}/create-objection/`)
        .reply(201, {
          id: 'objection-123',
          field_name: 'monthly_rent',
          current_value: '2500000',
          proposed_value: '2200000',
          justification: 'Precio muy alto para la zona'
        });

      render(
        <TestWrapper>
          <TenantContractReview contractId={baseContract.id} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Apartamento de Integración, El Poblado')).toBeInTheDocument();
      });

      // Crear objeción
      const objectButton = screen.getByText('Crear Objeción');
      await user.click(objectButton);

      // Seleccionar campo a objetar
      const fieldSelect = screen.getByLabelText(/Campo a Objetar/);
      await user.click(fieldSelect);
      await user.click(screen.getByText('Canon de Arrendamiento'));

      // Proponer nuevo valor
      const proposedValueInput = screen.getByLabelText(/Valor Propuesto/);
      await user.type(proposedValueInput, '2200000');

      // Justificación
      const justificationInput = screen.getByLabelText(/Justificación/);
      await user.type(justificationInput, 'El precio está por encima del promedio de mercado');

      // Enviar objeción
      const submitObjectionButton = screen.getByText('Enviar Objeción');
      await user.click(submitObjectionButton);

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(1);
        expect(mockAxios.history.post[0].url).toContain('/create-objection/');
      });
    });
  });

  // =====================================================================
  // FLUJO COMPLETO: FIRMA BIOMÉTRICA INTEGRADA
  // =====================================================================

  describe('Complete Biometric Signing Workflow', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockTenantUser,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        isAuthenticated: true
      });
    });

    it('should complete full biometric authentication and signing', async () => {
      const user = userEvent.setup();

      // Mock APIs para flujo biométrico completo
      mockAxios.onPost(`/api/v1/contracts/${baseContract.id}/start-biometric-authentication/`)
        .reply(200, { authenticationId: 'auth-123' });

      // Mock responses para cada paso biométrico
      const mockBiometricSteps = {
        face_front: {
          authenticationId: 'auth-123',
          step: 'face_front',
          status: 'success',
          confidenceScore: 0.95,
          nextStep: 'face_side',
          completedSteps: { face_front: true, face_side: false, document: false, combined: false, voice: false }
        },
        face_side: {
          authenticationId: 'auth-123',
          step: 'face_side',
          status: 'success',
          confidenceScore: 0.92,
          nextStep: 'document',
          completedSteps: { face_front: true, face_side: true, document: false, combined: false, voice: false }
        },
        document: {
          authenticationId: 'auth-123',
          step: 'document',
          status: 'success',
          confidenceScore: 0.98,
          nextStep: 'combined',
          completedSteps: { face_front: true, face_side: true, document: true, combined: false, voice: false }
        },
        combined: {
          authenticationId: 'auth-123',
          step: 'combined',
          status: 'success',
          confidenceScore: 0.94,
          nextStep: 'voice',
          completedSteps: { face_front: true, face_side: true, document: true, combined: true, voice: false }
        },
        voice: {
          authenticationId: 'auth-123',
          step: 'voice',
          status: 'success',
          confidenceScore: 0.89,
          nextStep: 'signature',
          completedSteps: { face_front: true, face_side: true, document: true, combined: true, voice: true }
        }
      };

      mockAxios.onPost(`/api/v1/contracts/biometric/auth-123/face-capture/`)
        .replyOnce(200, mockBiometricSteps.face_front)
        .onPost(`/api/v1/contracts/biometric/auth-123/face-capture/`)
        .replyOnce(200, mockBiometricSteps.face_side);

      mockAxios.onPost(`/api/v1/contracts/biometric/auth-123/document-capture/`)
        .reply(200, mockBiometricSteps.document);

      mockAxios.onPost(`/api/v1/contracts/biometric/auth-123/combined-capture/`)
        .reply(200, mockBiometricSteps.combined);

      mockAxios.onPost(`/api/v1/contracts/biometric/auth-123/voice-capture/`)
        .reply(200, mockBiometricSteps.voice);

      mockAxios.onPost(`/api/v1/contracts/${baseContract.id}/complete-biometric-signature/`)
        .reply(200, {
          contract_id: baseContract.id,
          signature_completed: true,
          biometric_verified: true,
          confidence_scores: {
            face_confidence: 0.95,
            document_confidence: 0.98,
            voice_confidence: 0.89,
            overall_confidence: 0.94
          }
        });

      const mockOnSuccess = jest.fn();
      const mockOnError = jest.fn();

      render(
        <TestWrapper>
          <BiometricContractSigning
            open={true}
            onClose={jest.fn()}
            contractId={baseContract.id}
            onSuccess={mockOnSuccess}
            onError={mockOnError}
          />
        </TestWrapper>
      );

      // Verificar inicialización
      await waitFor(() => {
        expect(screen.getByText('Firma Digital con Verificación Biométrica')).toBeInTheDocument();
        expect(mockAxios.history.post).toHaveLength(1);
      });

      // Paso 1: Captura frontal
      await waitFor(() => {
        expect(screen.getByText('Capturar Foto Frontal')).toBeInTheDocument();
      });

      const frontalCaptureButton = screen.getByText('Capturar Foto Frontal');
      await user.click(frontalCaptureButton);

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(2);
      });

      // Paso 2: Captura lateral
      await waitFor(() => {
        expect(screen.getByText('Capturar Foto Lateral')).toBeInTheDocument();
      });

      const lateralCaptureButton = screen.getByText('Capturar Foto Lateral');
      await user.click(lateralCaptureButton);

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(3);
      });

      // Paso 3: Documento
      await waitFor(() => {
        expect(screen.getByText('Capturar Documento')).toBeInTheDocument();
      });

      const documentCaptureButton = screen.getByText('Capturar Documento');
      await user.click(documentCaptureButton);

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(4);
      });

      // Paso 4: Foto combinada
      await waitFor(() => {
        expect(screen.getByText('Capturar Foto Combinada')).toBeInTheDocument();
      });

      const combinedCaptureButton = screen.getByText('Capturar Foto Combinada');
      await user.click(combinedCaptureButton);

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(5);
      });

      // Paso 5: Grabación de voz
      await waitFor(() => {
        expect(screen.getByText('Comenzar Grabación')).toBeInTheDocument();
      });

      const recordButton = screen.getByText('Comenzar Grabación');
      await user.click(recordButton);

      // Simular grabación
      const stopButton = await screen.findByText('Detener Grabación');
      await user.click(stopButton);

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(6);
      });

      // Paso 6: Firma digital final
      await waitFor(() => {
        expect(screen.getByText('Firmar Contrato')).toBeInTheDocument();
      });

      const signButton = screen.getByText('Firmar Contrato');
      await user.click(signButton);

      // Verificar firma completada
      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(7);
        expect(mockOnSuccess).toHaveBeenCalled();
      }, { timeout: 5000 });
    });
  });

  // =====================================================================
  // FLUJO COMPLETO: DASHBOARD INTEGRADO
  // =====================================================================

  describe('Complete Dashboard Integration', () => {
    it('should show complete contract workflow in dashboard', async () => {
      const user = userEvent.setup();

      mockUseAuth.mockReturnValue({
        user: mockLandlordUser,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        isAuthenticated: true
      });

      // Mock contratos en diferentes estados
      const allContractStates = [
        contractStates.draft,
        contractStates.tenantInvited,
        contractStates.tenantReviewing,
        contractStates.readyToSign,
        contractStates.published
      ];

      mockAxios.onGet('/api/v1/contracts/').reply(200, {
        contracts: allContractStates,
        total_count: allContractStates.length
      });

      mockAxios.onGet('/api/v1/contracts/statistics/').reply(200, {
        total_contracts: allContractStates.length,
        by_state: {
          'DRAFT': 1,
          'TENANT_INVITED': 1,
          'TENANT_REVIEWING': 1,
          'READY_TO_SIGN': 1,
          'PUBLISHED': 1
        },
        monthly_income: 12500000,
        occupancy_rate: 80
      });

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      // Verificar carga del dashboard
      await waitFor(() => {
        expect(screen.getByText('🏢 Dashboard de Arrendador')).toBeInTheDocument();
      });

      // Verificar estadísticas
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // Total contracts
        expect(screen.getByText('$12.500.000')).toBeInTheDocument(); // Monthly income
      });

      // Verificar contratos en diferentes estados
      expect(screen.getByText('Apartamento de Integración, El Poblado')).toBeInTheDocument();

      // Probar navegación por pestañas
      const activosTab = screen.getByText('Activos');
      await user.click(activosTab);

      await waitFor(() => {
        // Solo debería mostrar contratos publicados
        const contractCards = screen.getAllByText(/Apartamento de Integración/);
        expect(contractCards.length).toBeGreaterThan(0);
      });

      const pendientesTab = screen.getByText('Pendientes');
      await user.click(pendientesTab);

      await waitFor(() => {
        // Debería mostrar contratos en proceso
        expect(screen.getByText(/TENANT_INVITED|TENANT_REVIEWING|READY_TO_SIGN/)).toBeInTheDocument();
      });
    });
  });

  // =====================================================================
  // FLUJO COMPLETO: MANEJO DE ERRORES INTEGRADO
  // =====================================================================

  describe('Complete Error Handling Integration', () => {
    it('should handle network errors gracefully across workflow', async () => {
      const user = userEvent.setup();

      mockUseAuth.mockReturnValue({
        user: mockLandlordUser,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        isAuthenticated: true
      });

      // Mock errores de red
      mockAxios.onPost('/api/v1/contracts/landlord/contracts/').networkError();

      render(
        <TestWrapper>
          <LandlordContractManager />
        </TestWrapper>
      );

      // Intentar crear contrato
      const createButton = await screen.findByText('Crear Nuevo Contrato');
      await user.click(createButton);

      const addressInput = screen.getByLabelText(/Dirección de la Propiedad/);
      await user.type(addressInput, 'Test Property');

      const saveButton = screen.getByText('Crear Contrato');
      await user.click(saveButton);

      // Verificar manejo de error
      await waitFor(() => {
        expect(screen.getByText(/Error de conexión/)).toBeInTheDocument();
      });
    });

    it('should handle validation errors in complete workflow', async () => {
      const user = userEvent.setup();

      mockUseAuth.mockReturnValue({
        user: mockTenantUser,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        isAuthenticated: true
      });

      // Mock error de validación
      mockAxios.onGet(`/api/v1/contracts/tenant/contract/${baseContract.id}/`)
        .reply(200, contractStates.tenantReviewing);
      mockAxios.onPost(`/api/v1/contracts/tenant/contract/${baseContract.id}/submit-data/`)
        .reply(400, {
          error: 'Validation failed',
          details: {
            monthly_income: ['Este campo es requerido'],
            phone: ['Formato de teléfono inválido']
          }
        });

      render(
        <TestWrapper>
          <TenantContractReview contractId={baseContract.id} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Apartamento de Integración, El Poblado')).toBeInTheDocument();
      });

      // Intentar guardar con datos inválidos
      const saveButton = screen.getByText('Guardar Datos');
      await user.click(saveButton);

      // Verificar errores de validación
      await waitFor(() => {
        expect(screen.getByText('Este campo es requerido')).toBeInTheDocument();
        expect(screen.getByText('Formato de teléfono inválido')).toBeInTheDocument();
      });
    });
  });

  // =====================================================================
  // FLUJO COMPLETO: PERFORMANCE Y OPTIMIZACIÓN
  // =====================================================================

  describe('Complete Performance Integration', () => {
    it('should handle large datasets efficiently', async () => {
      mockUseAuth.mockReturnValue({
        user: mockLandlordUser,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        isAuthenticated: true
      });

      // Crear dataset grande
      const largeContractList = Array.from({ length: 100 }, (_, index) => 
        createMockContract('PUBLISHED', {
          id: `contract-${index}`,
          property_address: `Propiedad ${index}, Sector ${index % 10}`
        })
      );

      mockAxios.onGet('/api/v1/contracts/').reply(200, {
        contracts: largeContractList,
        total_count: largeContractList.length
      });

      mockAxios.onGet('/api/v1/contracts/statistics/').reply(200, {
        total_contracts: largeContractList.length,
        by_state: { 'PUBLISHED': largeContractList.length },
        monthly_income: 250000000,
        occupancy_rate: 95
      });

      const startTime = performance.now();

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      // Verificar carga rápida
      await waitFor(() => {
        expect(screen.getByText('🏢 Dashboard de Arrendador')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Verificar que el renderizado fue eficiente (menos de 2 segundos)
      expect(renderTime).toBeLessThan(2000);

      // Verificar que se muestran los datos
      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument(); // Total contracts
      });
    });
  });
});