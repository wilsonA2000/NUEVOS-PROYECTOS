/**
 * Utilidades de Testing para el Sistema de Contratos
 * Incluye mocks, helpers y factories para generar datos de prueba
 * Facilita la creación y configuración de tests unitarios
 */

import { 
  LandlordControlledContractData,
  ContractWorkflowState,
  ContractStatistics,
  ContractListResponse,
  LandlordData,
  TenantData,
  PropertyType,
  DocumentType,
  ContractObjection,
  LandlordContractGuarantee,
  ContractWorkflowHistory
} from '../types/landlordContract';

// =====================================================================
// FACTORIES PARA GENERAR DATOS DE PRUEBA
// =====================================================================

/**
 * Factory para crear datos de arrendador
 */
export const createMockLandlordData = (overrides: Partial<LandlordData> = {}): LandlordData => ({
  full_name: 'Juan Carlos Pérez',
  document_type: 'CC' as DocumentType,
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
  profession: 'Arquitecto',
  ...overrides
});

/**
 * Factory para crear datos de arrendatario
 */
export const createMockTenantData = (overrides: Partial<TenantData> = {}): TenantData => ({
  full_name: 'Ana María González',
  document_type: 'CC' as DocumentType,
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
  emergency_relationship: 'Hermano',
  ...overrides
});

/**
 * Factory para crear contratos de prueba
 */
export const createMockContract = (
  state: ContractWorkflowState = 'DRAFT',
  overrides: Partial<LandlordControlledContractData> = {}
): LandlordControlledContractData => ({
  id: `contract-${Math.random().toString(36).substr(2, 9)}`,
  contract_number: `VH-2025-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
  current_state: state,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  property_id: `property-${Math.random().toString(36).substr(2, 9)}`,
  property_address: 'Apartamento 501, Torre Central, El Poblado',
  property_type: 'apartamento' as PropertyType,
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
  special_clauses: [],
  landlord_data: createMockLandlordData(),
  landlord_approved: false,
  tenant_approved: false,
  landlord_signed: false,
  tenant_signed: false,
  published: false,
  workflow_history: [],
  ...overrides
});

/**
 * Factory para crear múltiples contratos con diferentes estados
 */
export const createMockContractCollection = (count: number = 5): LandlordControlledContractData[] => {
  const states: ContractWorkflowState[] = [
    'DRAFT',
    'TENANT_INVITED',
    'TENANT_REVIEWING',
    'LANDLORD_REVIEWING',
    'READY_TO_SIGN',
    'PUBLISHED'
  ];

  return Array.from({ length: count }, (_, index) => {
    const state = states[index % states.length];
    const baseRent = 2000000 + (index * 500000);
    
    return createMockContract(state, {
      monthly_rent: baseRent,
      security_deposit: baseRent,
      property_address: `Propiedad ${index + 1}, Sector ${['El Poblado', 'Chapinero', 'Zona Rosa', 'La Calera', 'Unicentro'][index % 5]}`,
      tenant_data: state !== 'DRAFT' && state !== 'TENANT_INVITED' ? createMockTenantData() : undefined,
      tenant_email: state === 'TENANT_INVITED' ? `tenant${index}@example.com` : undefined,
      landlord_approved: ['BOTH_REVIEWING', 'READY_TO_SIGN', 'FULLY_SIGNED', 'PUBLISHED'].includes(state),
      tenant_approved: ['BOTH_REVIEWING', 'READY_TO_SIGN', 'FULLY_SIGNED', 'PUBLISHED'].includes(state),
      landlord_signed: ['FULLY_SIGNED', 'PUBLISHED'].includes(state),
      tenant_signed: ['FULLY_SIGNED', 'PUBLISHED'].includes(state),
      published: state === 'PUBLISHED',
      start_date: state === 'PUBLISHED' ? new Date(2025, 1, 1).toISOString() : undefined,
      end_date: state === 'PUBLISHED' ? new Date(2026, 0, 31).toISOString() : undefined,
      published_at: state === 'PUBLISHED' ? new Date().toISOString() : undefined
    });
  });
};

/**
 * Factory para crear estadísticas de contratos
 */
export const createMockStatistics = (overrides: Partial<ContractStatistics> = {}): ContractStatistics => ({
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
  occupancy_rate: 88.5,
  ...overrides
});

/**
 * Factory para crear respuesta de lista de contratos
 */
export const createMockContractListResponse = (
  contracts: LandlordControlledContractData[] = createMockContractCollection(),
  overrides: Partial<ContractListResponse> = {}
): ContractListResponse => ({
  contracts,
  total_count: contracts.length,
  page: 1,
  page_size: 10,
  has_next: false,
  has_previous: false,
  ...overrides
});

/**
 * Factory para crear objeciones de contrato
 */
export const createMockObjection = (overrides: Partial<ContractObjection> = {}): ContractObjection => ({
  id: `objection-${Math.random().toString(36).substr(2, 9)}`,
  contract_id: 'contract-123',
  objected_by_user_id: 'user-456',
  objected_by_type: 'tenant',
  field_name: 'monthly_rent',
  section: 'economic_terms',
  current_value: '2500000',
  proposed_value: '2200000',
  justification: 'El canon propuesto está por encima del promedio del mercado para propiedades similares en la zona.',
  priority: 'HIGH',
  status: 'PENDING',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  attachments: [],
  ...overrides
});

/**
 * Factory para crear garantías de contrato
 */
export const createMockGuarantee = (overrides: Partial<LandlordContractGuarantee> = {}): LandlordContractGuarantee => ({
  id: `guarantee-${Math.random().toString(36).substr(2, 9)}`,
  contract_id: 'contract-123',
  guarantee_type: 'personal',
  amount: 2500000,
  description: 'Garantía personal del arrendatario',
  guarantor_name: 'María Elena Rodríguez',
  guarantor_document_type: 'CC',
  guarantor_document_number: '23456789',
  guarantor_phone: '+57 310 234 5678',
  guarantor_email: 'maria.rodriguez@example.com',
  guarantor_address: 'Calle 456 #78-90',
  guarantor_income: 8000000,
  status: 'pending',
  verified: false,
  documents: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

/**
 * Factory para crear historial de workflow
 */
export const createMockWorkflowHistory = (
  action: string = 'contract_created',
  overrides: Partial<ContractWorkflowHistory> = {}
): ContractWorkflowHistory => ({
  id: `history-${Math.random().toString(36).substr(2, 9)}`,
  contract_id: 'contract-123',
  performed_by_user_id: 'user-123',
  performed_by_type: 'landlord',
  action_type: action,
  description: `Contrato ${action.replace('_', ' ')}`,
  old_state: 'DRAFT',
  new_state: 'TENANT_INVITED',
  data_changes: {},
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0...',
  created_at: new Date().toISOString(),
  ...overrides
});

// =====================================================================
// HELPERS PARA TESTING
// =====================================================================

/**
 * Helper para crear usuarios mock
 */
export const createMockUser = (userType: 'landlord' | 'tenant' = 'landlord', overrides = {}) => ({
  id: `user-${userType}-${Math.random().toString(36).substr(2, 9)}`,
  email: `${userType}@test.com`,
  user_type: userType,
  full_name: userType === 'landlord' ? 'Juan Carlos Pérez' : 'Ana María González',
  ...overrides
});

/**
 * Helper para crear respuestas de invitación
 */
export const createMockInvitationResponse = (overrides = {}) => ({
  invitation_id: `inv-${Math.random().toString(36).substr(2, 9)}`,
  invitation_token: `token-${Math.random().toString(36).substr(2, 16)}`,
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  invitation_url: `https://verihome.com/contracts/invitation/token-${Math.random().toString(36).substr(2, 16)}`,
  ...overrides
});

/**
 * Helper para crear historial de invitaciones
 */
export const createMockInvitationsHistory = (count: number = 3) => ({
  invitations: Array.from({ length: count }, (_, index) => ({
    id: `inv-${index + 1}`,
    tenant_email: `tenant${index + 1}@example.com`,
    tenant_name: index === 0 ? `Usuario ${index + 1}` : undefined,
    invitation_method: ['email', 'sms', 'whatsapp'][index % 3],
    status: ['pending', 'accepted', 'expired'][index % 3],
    created_at: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + (7 - index) * 24 * 60 * 60 * 1000).toISOString(),
    accepted_at: index === 1 ? new Date(Date.now() - index * 12 * 60 * 60 * 1000).toISOString() : undefined
  }))
});

/**
 * Helper para generar errores de API mock
 */
export const createMockApiError = (status: number = 400, message: string = 'API Error') => ({
  response: {
    status,
    data: {
      error: message,
      details: status === 400 ? {
        field1: ['Este campo es requerido'],
        field2: ['Formato inválido']
      } : undefined
    }
  }
});

/**
 * Helper para simular estados de workflow complejos
 */
export const createComplexWorkflowScenario = () => ({
  draft: createMockContract('DRAFT'),
  invited: createMockContract('TENANT_INVITED', {
    tenant_email: 'invited@example.com'
  }),
  reviewing: createMockContract('TENANT_REVIEWING', {
    tenant_data: createMockTenantData()
  }),
  pendingApproval: createMockContract('LANDLORD_REVIEWING', {
    tenant_data: createMockTenantData(),
    tenant_approved: true
  }),
  readyToSign: createMockContract('READY_TO_SIGN', {
    tenant_data: createMockTenantData(),
    landlord_approved: true,
    tenant_approved: true
  }),
  fullySigned: createMockContract('FULLY_SIGNED', {
    tenant_data: createMockTenantData(),
    landlord_approved: true,
    tenant_approved: true,
    landlord_signed: true,
    tenant_signed: true
  }),
  published: createMockContract('PUBLISHED', {
    tenant_data: createMockTenantData(),
    landlord_approved: true,
    tenant_approved: true,
    landlord_signed: true,
    tenant_signed: true,
    published: true,
    published_at: new Date().toISOString()
  })
});

/**
 * Helper para generar datos de firmas digitales
 */
export const createMockSignatureData = (userType: 'landlord' | 'tenant' = 'landlord') => ({
  signature_image: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
  signature_metadata: {
    width: 300,
    height: 150,
    timestamp: new Date().toISOString()
  },
  biometric_data: {
    face_confidence: 0.95,
    document_confidence: 0.98,
    voice_confidence: 0.92,
    overall_confidence: 0.95
  },
  device_info: {
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    screen_resolution: '1920x1080',
    device_type: 'desktop'
  },
  location: {
    latitude: 4.5709,
    longitude: -74.2973,
    accuracy: 10
  },
  timestamp: new Date().toISOString()
});

/**
 * Helper para crear configuraciones de test comunes
 */
export const getTestConfig = () => ({
  apiBaseUrl: '/api/v1',
  mockDelayMs: 100,
  defaultPageSize: 10,
  maxRetries: 3,
  timeoutMs: 5000
});

/**
 * Helper para crear estados de loading para tests
 */
export const createLoadingStates = () => ({
  idle: { loading: false, error: null },
  loading: { loading: true, error: null },
  success: { loading: false, error: null },
  error: { loading: false, error: 'Something went wrong' }
});

/**
 * Helper para validar estructura de contratos
 */
export const validateContractStructure = (contract: any): contract is LandlordControlledContractData => {
  return (
    typeof contract === 'object' &&
    contract !== null &&
    typeof contract.id === 'string' &&
    typeof contract.current_state === 'string' &&
    typeof contract.property_address === 'string' &&
    typeof contract.monthly_rent === 'number' &&
    typeof contract.landlord_data === 'object'
  );
};

/**
 * Helper para generar fechas de test
 */
export const createTestDates = () => {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  return {
    now: now.toISOString(),
    oneWeekAgo: oneWeekAgo.toISOString(),
    oneWeekFromNow: oneWeekFromNow.toISOString(),
    oneMonthFromNow: oneMonthFromNow.toISOString(),
    oneYearFromNow: oneYearFromNow.toISOString()
  };
};

/**
 * Helper para limpiar mocks después de tests
 */
export const cleanupMocks = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  jest.restoreAllMocks();
};

// Export de constantes útiles para testing
export const TEST_CONSTANTS = {
  VALID_EMAIL: 'test@example.com',
  VALID_PHONE: '+57 300 123 4567',
  VALID_DOCUMENT: '12345678',
  INVALID_EMAIL: 'invalid-email',
  INVALID_PHONE: '123',
  LONG_TEXT: 'A'.repeat(1000),
  SPECIAL_CHARS: '!@#$%^&*()[]{}|;:,.<>?',
  EMPTY_STRING: '',
  NULL_VALUE: null,
  UNDEFINED_VALUE: undefined
} as const;