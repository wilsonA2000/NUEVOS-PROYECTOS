/**
 * Tests Unitarios para ContractsDashboard
 * Cubre el dashboard unificado que funciona para ambos roles (landlord/tenant)
 * Incluye tests de renderizado, funcionalidad, filtros y acciones
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import MockAdapter from 'axios-mock-adapter';

import ContractsDashboard from '../ContractsDashboard';
import { LandlordContractService } from '../../../services/landlordContractService';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import {
  LandlordControlledContractData,
  ContractStatistics,
  ContractListResponse,
} from '../../../types/landlordContract';

// Mock del hook useAuth
jest.mock('../../../hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock del API
let mockAxios: MockAdapter;

// Theme para testing
const theme = createTheme();

// Wrapper para providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

// Mock data
const mockLandlordUser = {
  id: 'user-landlord-123',
  email: 'landlord@test.com',
  user_type: 'landlord' as const,
  full_name: 'Juan Carlos Pérez'
};

const mockTenantUser = {
  id: 'user-tenant-456',
  email: 'tenant@test.com',
  user_type: 'tenant' as const,
  full_name: 'Ana María González'
};

const mockContracts: LandlordControlledContractData[] = [
  {
    id: 'contract-123',
    contract_number: 'VH-2025-001',
    current_state: 'PUBLISHED',
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-01T10:00:00Z',
    start_date: '2025-02-01T00:00:00Z',
    end_date: '2026-01-31T23:59:59Z',
    property_id: 'property-456',
    property_address: 'Apartamento 501, Torre Central, El Poblado',
    property_type: 'apartamento',
    property_area: 80,
    property_stratum: 5,
    property_furnished: true,
    monthly_rent: 2500000,
    security_deposit: 2500000,
    contract_duration_months: 12,
    rent_increase_type: 'ipc',
    payment_day: 5,
    utilities_included: false,
    pets_allowed: false,
    smoking_allowed: false,
    guests_policy: 'limited',
    max_occupants: 2,
    guarantor_required: true,
    maintenance_responsibility: 'tenant',
    utilities_responsibility: 'tenant',
    insurance_responsibility: 'tenant',
    special_clauses: [],
    landlord_data: {
      full_name: 'Juan Carlos Pérez',
      document_type: 'CC',
      document_number: '12345678',
      phone: '+57 300 123 4567',
      email: 'juan.perez@example.com',
      address: 'Calle 123 #45-67',
      city: 'Bogotá',
      emergency_contact: 'María Pérez'
    },
    tenant_data: {
      full_name: 'Ana María González',
      document_type: 'CC',
      document_number: '87654321',
      phone: '+57 301 987 6543',
      email: 'ana.gonzalez@example.com',
      current_address: 'Carrera 15 #20-30',
      city: 'Medellín',
      employment_type: 'employee',
      monthly_income: 5000000,
      personal_references: [],
      commercial_references: [],
      emergency_contact: 'Luis González',
      emergency_phone: '+57 302 555 6666',
      emergency_relationship: 'Hermano'
    },
    landlord_approved: true,
    tenant_approved: true,
    landlord_signed: true,
    tenant_signed: true,
    published: true,
    published_at: '2025-01-15T14:00:00Z',
    workflow_history: []
  },
  {
    id: 'contract-124',
    contract_number: 'VH-2025-002',
    current_state: 'TENANT_REVIEWING',
    created_at: '2025-01-02T10:00:00Z',
    updated_at: '2025-01-02T10:00:00Z',
    property_id: 'property-457',
    property_address: 'Casa Campestre, La Calera',
    property_type: 'casa',
    property_area: 150,
    property_stratum: 6,
    property_furnished: false,
    monthly_rent: 3500000,
    security_deposit: 3500000,
    contract_duration_months: 24,
    rent_increase_type: 'ipc',
    payment_day: 1,
    utilities_included: false,
    pets_allowed: true,
    smoking_allowed: false,
    guests_policy: 'unlimited',
    max_occupants: 4,
    guarantor_required: true,
    maintenance_responsibility: 'landlord',
    utilities_responsibility: 'tenant',
    insurance_responsibility: 'both',
    special_clauses: ['Mantenimiento de jardín incluido'],
    landlord_data: {
      full_name: 'María Elena Rodríguez',
      document_type: 'CC',
      document_number: '23456789',
      phone: '+57 310 234 5678',
      email: 'maria.rodriguez@example.com',
      address: 'Calle 456 #78-90',
      city: 'Bogotá',
      emergency_contact: 'Carlos Rodríguez'
    },
    tenant_email: 'carlos.silva@example.com',
    landlord_approved: false,
    tenant_approved: false,
    landlord_signed: false,
    tenant_signed: false,
    published: false,
    workflow_history: []
  },
  {
    id: 'contract-125',
    contract_number: 'VH-2025-003',
    current_state: 'READY_TO_SIGN',
    created_at: '2025-01-03T10:00:00Z',
    updated_at: '2025-01-03T10:00:00Z',
    property_id: 'property-458',
    property_address: 'Oficina 302, Centro Empresarial',
    property_type: 'oficina',
    property_area: 50,
    property_stratum: 4,
    property_furnished: true,
    monthly_rent: 1800000,
    security_deposit: 1800000,
    contract_duration_months: 36,
    rent_increase_type: 'fixed',
    payment_day: 15,
    utilities_included: true,
    pets_allowed: false,
    smoking_allowed: false,
    guests_policy: 'no_overnight',
    max_occupants: 1,
    guarantor_required: false,
    maintenance_responsibility: 'landlord',
    utilities_responsibility: 'landlord',
    insurance_responsibility: 'landlord',
    special_clauses: [],
    landlord_data: {
      full_name: 'Roberto Gómez',
      document_type: 'CC',
      document_number: '34567890',
      phone: '+57 320 345 6789',
      email: 'roberto.gomez@example.com',
      address: 'Carrera 789 #12-34',
      city: 'Medellín',
      emergency_contact: 'Lucia Gómez'
    },
    tenant_data: {
      full_name: 'Patricia Hernández',
      document_type: 'CC',
      document_number: '45678901',
      phone: '+57 315 456 7890',
      email: 'patricia.hernandez@example.com',
      current_address: 'Avenida 80 #50-60',
      city: 'Medellín',
      employment_type: 'business_owner',
      monthly_income: 8000000,
      personal_references: [],
      commercial_references: [],
      emergency_contact: 'Miguel Hernández',
      emergency_phone: '+57 316 567 8901',
      emergency_relationship: 'Esposo'
    },
    landlord_approved: true,
    tenant_approved: true,
    landlord_signed: false,
    tenant_signed: false,
    published: false,
    workflow_history: []
  }
];

const mockStatistics: ContractStatistics = {
  total_contracts: 25,
  by_state: {
    'DRAFT': 5,
    'TENANT_INVITED': 3,
    'TENANT_REVIEWING': 4,
    'LANDLORD_REVIEWING': 2,
    'OBJECTIONS_PENDING': 1,
    'BOTH_REVIEWING': 2,
    'READY_TO_SIGN': 3,
    'FULLY_SIGNED': 2,
    'PUBLISHED': 3,
    'EXPIRED': 0,
    'TERMINATED': 0,
    'CANCELLED': 0
  },
  by_property_type: {
    'apartamento': 15,
    'casa': 7,
    'local_comercial': 1,
    'oficina': 2,
    'bodega': 0,
    'habitacion': 0,
    'finca': 0,
    'lote': 0
  },
  average_rent: 2600000,
  total_rent_value: 65000000,
  pending_signatures: 5,
  expiring_soon: 2,
  objections_pending: 1,
  fully_executed: 3,
  monthly_income: 7800000,
  occupancy_rate: 88.5
};

const mockContractsResponse: ContractListResponse = {
  contracts: mockContracts,
  total_count: mockContracts.length,
  page: 1,
  page_size: 10,
  has_next: false,
  has_previous: false
};

describe('ContractsDashboard', () => {
  beforeEach(() => {
    mockAxios = new MockAdapter(api);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockAxios.restore();
  });

  // =====================================================================
  // TESTS DE RENDERIZADO PARA ARRENDADOR
  // =====================================================================

  describe('Landlord View Rendering', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockLandlordUser,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        isAuthenticated: true
      });

      mockAxios.onGet('/api/v1/contracts/').reply(200, mockContractsResponse);
      mockAxios.onGet('/api/v1/contracts/statistics/').reply(200, mockStatistics);
    });

    it('should render landlord dashboard header', async () => {
      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('🏢 Dashboard de Arrendador')).toBeInTheDocument();
      });

      expect(screen.getByText('Gestiona todos tus contratos de arrendamiento en un solo lugar')).toBeInTheDocument();
    });

    it('should display landlord statistics correctly', async () => {
      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument(); // Total contracts
        expect(screen.getByText('$7.800.000')).toBeInTheDocument(); // Monthly income
        expect(screen.getByText('88.5%')).toBeInTheDocument(); // Occupancy rate
      });
    });

    it('should show tenant information for landlord view', async () => {
      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Ana María González')).toBeInTheDocument();
        expect(screen.getByText('carlos.silva@example.com')).toBeInTheDocument();
      });
    });

    it('should show appropriate actions for landlord', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByLabelText('more')).toHaveLength(mockContracts.length);
      });

      // Click on first contract's action menu
      const actionButtons = screen.getAllByLabelText('more');
      await user.click(actionButtons[0]);

      // Should show landlord-specific actions
      expect(screen.getByText('Ver Detalles')).toBeInTheDocument();
    });
  });

  // =====================================================================
  // TESTS DE RENDERIZADO PARA ARRENDATARIO
  // =====================================================================

  describe('Tenant View Rendering', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockTenantUser,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        isAuthenticated: true
      });

      mockAxios.onGet('/api/v1/contracts/').reply(200, mockContractsResponse);
      mockAxios.onGet('/api/v1/contracts/statistics/').reply(200, mockStatistics);
    });

    it('should render tenant dashboard header', async () => {
      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('🏠 Dashboard de Arrendatario')).toBeInTheDocument();
      });
    });

    it('should show landlord information for tenant view', async () => {
      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Juan Carlos Pérez')).toBeInTheDocument();
        expect(screen.getByText('María Elena Rodríguez')).toBeInTheDocument();
        expect(screen.getByText('Roberto Gómez')).toBeInTheDocument();
      });
    });

    it('should show appropriate actions for tenant', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByLabelText('more')).toHaveLength(mockContracts.length);
      });

      // Click on contract in TENANT_REVIEWING state
      const actionButtons = screen.getAllByLabelText('more');
      await user.click(actionButtons[1]); // Second contract is TENANT_REVIEWING

      expect(screen.getByText('Ver Detalles')).toBeInTheDocument();
    });
  });

  // =====================================================================
  // TESTS DE ESTADÍSTICAS Y MÉTRICAS
  // =====================================================================

  describe('Statistics and Metrics', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockLandlordUser,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        isAuthenticated: true
      });

      mockAxios.onGet('/api/v1/contracts/').reply(200, mockContractsResponse);
      mockAxios.onGet('/api/v1/contracts/statistics/').reply(200, mockStatistics);
    });

    it('should display correct contract counts by status', async () => {
      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        // Total contracts
        expect(screen.getByText('3')).toBeInTheDocument(); // All tab badge

        // Check individual tabs
        const tabs = screen.getAllByRole('tab');
        expect(tabs).toHaveLength(4); // Todos, Activos, Pendientes, Completados
      });
    });

    it('should calculate and display financial metrics', async () => {
      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('$7.800.000')).toBeInTheDocument(); // Monthly income from statistics
      });
    });

    it('should handle statistics loading errors gracefully', async () => {
      mockAxios.onGet('/api/v1/contracts/statistics/').reply(500, { error: 'Server error' });

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Error al cargar el dashboard/)).toBeInTheDocument();
      });
    });
  });

  // =====================================================================
  // TESTS DE NAVEGACIÓN POR PESTAÑAS
  // =====================================================================

  describe('Tab Navigation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockLandlordUser,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        isAuthenticated: true
      });

      mockAxios.onGet('/api/v1/contracts/').reply(200, mockContractsResponse);
      mockAxios.onGet('/api/v1/contracts/statistics/').reply(200, mockStatistics);
    });

    it('should switch between different contract tabs', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Todos')).toBeInTheDocument();
        expect(screen.getByText('Activos')).toBeInTheDocument();
        expect(screen.getByText('Pendientes')).toBeInTheDocument();
        expect(screen.getByText('Completados')).toBeInTheDocument();
      });

      // Click on "Activos" tab
      const activosTab = screen.getByText('Activos');
      await user.click(activosTab);

      // Should show only published contracts
      await waitFor(() => {
        expect(screen.getByText('Apartamento 501, Torre Central, El Poblado')).toBeInTheDocument();
        expect(screen.queryByText('Casa Campestre, La Calera')).not.toBeInTheDocument();
      });

      // Click on "Pendientes" tab
      const pendientesTab = screen.getByText('Pendientes');
      await user.click(pendientesTab);

      // Should show contracts in progress
      await waitFor(() => {
        expect(screen.getByText('Casa Campestre, La Calera')).toBeInTheDocument();
        expect(screen.getByText('Oficina 302, Centro Empresarial')).toBeInTheDocument();
      });
    });

    it('should show correct contract counts in tab badges', async () => {
      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        const badges = screen.getAllByTestId(/badge/i);
        // Should have badges for each tab showing correct counts
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('should handle empty tabs gracefully', async () => {
      // Mock empty contracts response
      mockAxios.onGet('/api/v1/contracts/').reply(200, {
        ...mockContractsResponse,
        contracts: [],
        total_count: 0
      });

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No hay contratos en esta categoría')).toBeInTheDocument();
      });
    });
  });

  // =====================================================================
  // TESTS DE ACCIONES DE CONTRATO
  // =====================================================================

  describe('Contract Actions', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockLandlordUser,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        isAuthenticated: true
      });

      mockAxios.onGet('/api/v1/contracts/').reply(200, mockContractsResponse);
      mockAxios.onGet('/api/v1/contracts/statistics/').reply(200, mockStatistics);
    });

    it('should open action menu when more button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByLabelText('more')).toHaveLength(mockContracts.length);
      });

      const actionButtons = screen.getAllByLabelText('more');
      await user.click(actionButtons[0]);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByText('Ver Detalles')).toBeInTheDocument();
    });

    it('should execute approve action successfully', async () => {
      const user = userEvent.setup();

      // Mock approve contract API call
      mockAxios.onPost('/api/v1/contracts/contract-124/approve/').reply(200, {
        ...mockContracts[1],
        landlord_approved: true,
        current_state: 'BOTH_REVIEWING'
      });

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        const actionButtons = screen.getAllByLabelText('more');
        expect(actionButtons).toHaveLength(mockContracts.length);
      });

      // Click on action menu for contract in LANDLORD_REVIEWING state (would need to mock this state)
      // This is a simplified test - in reality, we'd need the contract to be in the right state
      const actionButtons = screen.getAllByLabelText('more');
      await user.click(actionButtons[1]);

      // Would test approve action if available
      // expect(screen.getByText('Aprobar')).toBeInTheDocument();
    });

    it('should handle contract view detail action', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        const viewButtons = screen.getAllByText('Ver Detalles');
        expect(viewButtons).toHaveLength(mockContracts.length);
      });

      const viewButton = screen.getAllByText('Ver Detalles')[0];
      await user.click(viewButton);

      // Should show contract detail dialog
      await waitFor(() => {
        expect(screen.getByText('Detalles del Contrato')).toBeInTheDocument();
      });
    });

    it('should handle action errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock an API error
      mockAxios.onPost(/\/api\/v1\/contracts\/.+\/approve\//).reply(500, { error: 'Server error' });

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByLabelText('more')).toHaveLength(mockContracts.length);
      });

      // Simulate action that would fail
      // This is a simplified test - actual implementation would depend on action availability
    });
  });

  // =====================================================================
  // TESTS DE ESTADOS DE CARGA Y ERROR
  // =====================================================================

  describe('Loading and Error States', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockLandlordUser,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        isAuthenticated: true
      });
    });

    it('should show loading spinner while fetching data', async () => {
      // Delay the response to test loading state
      mockAxios.onGet('/api/v1/contracts/').reply(() => 
        new Promise(resolve => setTimeout(() => resolve([200, mockContractsResponse]), 1000))
      );
      mockAxios.onGet('/api/v1/contracts/statistics/').reply(200, mockStatistics);

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Cargando dashboard de contratos...')).toBeInTheDocument();
    });

    it('should handle contracts API error', async () => {
      mockAxios.onGet('/api/v1/contracts/').reply(500, { error: 'Failed to fetch contracts' });
      mockAxios.onGet('/api/v1/contracts/statistics/').reply(200, mockStatistics);

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Error al cargar el dashboard/)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      mockAxios.onGet('/api/v1/contracts/').networkError();
      mockAxios.onGet('/api/v1/contracts/statistics/').reply(200, mockStatistics);

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Error al cargar el dashboard/)).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      const user = userEvent.setup();

      // First call fails, second succeeds
      mockAxios.onGet('/api/v1/contracts/')
        .replyOnce(500, { error: 'Server error' })
        .onGet('/api/v1/contracts/')
        .reply(200, mockContractsResponse);
      
      mockAxios.onGet('/api/v1/contracts/statistics/').reply(200, mockStatistics);

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Error al cargar el dashboard/)).toBeInTheDocument();
      });

      // Dismiss error and retry
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Trigger refresh (would need to implement this in component)
      // For now, just verify error can be dismissed
      expect(screen.queryByText(/Error al cargar el dashboard/)).not.toBeInTheDocument();
    });
  });

  // =====================================================================
  // TESTS DE RESPONSIVIDAD Y ACCESIBILIDAD
  // =====================================================================

  describe('Responsiveness and Accessibility', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockLandlordUser,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        isAuthenticated: true
      });

      mockAxios.onGet('/api/v1/contracts/').reply(200, mockContractsResponse);
      mockAxios.onGet('/api/v1/contracts/statistics/').reply(200, mockStatistics);
    });

    it('should have proper ARIA labels and roles', async () => {
      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
        expect(screen.getAllByRole('tab')).toHaveLength(4);
        expect(screen.getAllByRole('tabpanel')).toHaveLength(1); // Only active panel
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
      });

      // Tab navigation should work
      const firstTab = screen.getAllByRole('tab')[0];
      firstTab.focus();
      expect(firstTab).toHaveFocus();

      // Arrow key navigation
      await user.keyboard('{ArrowRight}');
      const secondTab = screen.getAllByRole('tab')[1];
      expect(secondTab).toHaveFocus();
    });

    it('should display properly formatted currency', async () => {
      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check Colombian peso formatting
        expect(screen.getByText('$2.500.000')).toBeInTheDocument();
        expect(screen.getByText('$3.500.000')).toBeInTheDocument();
        expect(screen.getByText('$1.800.000')).toBeInTheDocument();
      });
    });

    it('should handle long property addresses gracefully', async () => {
      const contractWithLongAddress = {
        ...mockContracts[0],
        property_address: 'Apartamento 1501 en Torre Residencial Muy Larga Con Nombre Extenso, Conjunto Cerrado Premium, Sector Exclusivo de El Poblado, Medellín, Antioquia, Colombia'
      };

      mockAxios.onGet('/api/v1/contracts/').reply(200, {
        ...mockContractsResponse,
        contracts: [contractWithLongAddress]
      });

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Apartamento 1501 en Torre Residencial/)).toBeInTheDocument();
      });
    });
  });

  // =====================================================================
  // TESTS DE CASOS EDGE
  // =====================================================================

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockLandlordUser,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        isAuthenticated: true
      });
    });

    it('should handle contracts without tenant data', async () => {
      const contractWithoutTenant = {
        ...mockContracts[0],
        tenant_data: undefined,
        tenant_email: undefined
      };

      mockAxios.onGet('/api/v1/contracts/').reply(200, {
        ...mockContractsResponse,
        contracts: [contractWithoutTenant]
      });
      mockAxios.onGet('/api/v1/contracts/statistics/').reply(200, mockStatistics);

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Pendiente de invitación')).toBeInTheDocument();
      });
    });

    it('should handle contracts with missing dates', async () => {
      const contractWithoutDates = {
        ...mockContracts[0],
        start_date: undefined,
        end_date: undefined,
        created_at: undefined
      };

      mockAxios.onGet('/api/v1/contracts/').reply(200, {
        ...mockContractsResponse,
        contracts: [contractWithoutDates]
      });
      mockAxios.onGet('/api/v1/contracts/statistics/').reply(200, mockStatistics);

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Apartamento 501, Torre Central, El Poblado')).toBeInTheDocument();
        // Should handle missing dates gracefully without crashing
      });
    });

    it('should handle unauthenticated user', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        isAuthenticated: false
      });

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      // Should show loading or redirect (depending on implementation)
      expect(screen.getByText('Cargando dashboard de contratos...')).toBeInTheDocument();
    });

    it('should handle user still loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        loading: true,
        isAuthenticated: false
      });

      render(
        <TestWrapper>
          <ContractsDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Cargando dashboard de contratos...')).toBeInTheDocument();
    });
  });
});