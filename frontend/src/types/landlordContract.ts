/**
 * Tipos TypeScript para el Sistema de Contratos Controlado por Arrendador
 * Basado en modelos del backend Django y legislación colombiana
 */

// Estados del workflow de contratos
export type ContractWorkflowState =
  | 'DRAFT'                    // Borrador del arrendador
  | 'TENANT_INVITED'           // Arrendatario invitado
  | 'TENANT_REVIEWING'         // Arrendatario revisando
  | 'LANDLORD_REVIEWING'       // Arrendador revisando datos del arrendatario
  | 'OBJECTIONS_PENDING'       // Objeciones pendientes de resolver
  | 'BOTH_REVIEWING'           // Ambas partes revisando términos finales
  | 'READY_TO_SIGN'            // Listo para firmas digitales
  | 'FULLY_SIGNED'             // Completamente firmado
  | 'PUBLISHED'                // Publicado (activo)
  | 'EXPIRED'                  // Expirado
  | 'TERMINATED'               // Terminado anticipadamente
  | 'CANCELLED';               // Cancelado

// Tipos de documento colombianos
export type DocumentType = 'CC' | 'CE' | 'NIT' | 'PP';

// Tipos de propiedad
export type PropertyType = 
  | 'apartamento' 
  | 'casa' 
  | 'local_comercial' 
  | 'oficina' 
  | 'bodega' 
  | 'habitacion'
  | 'finca'
  | 'lote';

// Tipos de incremento de canon
export type RentIncreaseType = 'fixed' | 'ipc' | 'negotiated' | 'none';

// Políticas de huéspedes
export type GuestsPolicy = 'unlimited' | 'limited' | 'no_overnight' | 'prior_approval';

// Responsabilidad de mantenimiento
export type MaintenanceResponsibility = 'landlord' | 'tenant' | 'shared';

// Tipos de garantía
export type GuarantorType = 'personal' | 'company' | 'insurance' | 'deposit' | 'mixed';

// Prioridad de objeciones
export type ObjectionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Estado de objeciones
export type ObjectionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

// Datos del arrendador
export interface LandlordData {
  full_name: string;
  document_type: DocumentType;
  document_number: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  department?: string;
  country?: string;
  emergency_contact: string;
  emergency_phone?: string;
  bank_account?: string;
  bank_name?: string;
  account_type?: 'savings' | 'checking';
  tax_id?: string;
  profession?: string;
  company?: string;
}

// Datos del arrendatario
export interface TenantData {
  full_name: string;
  document_type: DocumentType;
  document_number: string;
  phone: string;
  email: string;
  current_address: string;
  city: string;
  department?: string;
  country?: string;
  
  // Información laboral
  employment_type: 'employee' | 'independent' | 'business_owner' | 'retired' | 'student' | 'unemployed';
  company_name?: string;
  position?: string;
  work_address?: string;
  work_phone?: string;
  monthly_income: number;
  additional_income?: number;
  income_verification_documents?: string[];
  
  // Referencias
  personal_references: PersonalReference[];
  commercial_references: CommercialReference[];
  
  // Emergencia
  emergency_contact: string;
  emergency_phone: string;
  emergency_relationship: string;
  
  // Mascotas (si aplica)
  has_pets?: boolean;
  pet_details?: PetDetails[];
  
  // Información adicional
  household_members?: HouseholdMember[];
  previous_rental_history?: PreviousRental[];
  special_needs?: string;
  additional_comments?: string;
}

// Referencia personal
export interface PersonalReference {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  years_known: number;
}

// Referencia comercial
export interface CommercialReference {
  type: 'bank' | 'credit_card' | 'store' | 'previous_landlord' | 'employer';
  institution_name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  account_number?: string;
  relationship_duration_months: number;
  payment_behavior?: 'excellent' | 'good' | 'regular' | 'poor';
}

// Detalles de mascotas
export interface PetDetails {
  type: 'dog' | 'cat' | 'bird' | 'fish' | 'other';
  breed?: string;
  name: string;
  age: number;
  weight?: number;
  vaccinated: boolean;
  spayed_neutered?: boolean;
  special_needs?: string;
}

// Miembro del hogar
export interface HouseholdMember {
  name: string;
  relationship: string;
  age: number;
  document_number?: string;
  occupation?: string;
}

// Historial de arriendos previos
export interface PreviousRental {
  address: string;
  landlord_name: string;
  landlord_phone: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  reason_for_leaving: string;
  recommendation?: 'excellent' | 'good' | 'regular' | 'poor';
}

// Datos principales del contrato
export interface LandlordControlledContractData {
  // Identificación
  id?: string;
  contract_number?: string;
  current_state: ContractWorkflowState;
  
  // Fechas importantes
  created_at?: string;
  updated_at?: string;
  invitation_expires_at?: string;
  start_date?: string;
  end_date?: string;
  published_at?: string;
  fully_signed_at?: string;
  
  // Información básica de la propiedad
  property_id: string;
  property_address: string;
  property_type: PropertyType;
  property_area: number;
  property_stratum: number;
  property_floors?: number;
  property_rooms?: number;
  property_bathrooms?: number;
  property_parking_spaces?: number;
  property_furnished: boolean;
  property_description?: string;
  
  // Términos económicos
  monthly_rent: number;
  security_deposit: number;
  administration_fee?: number;
  utilities_deposit?: number;
  pet_deposit?: number;
  cleaning_deposit?: number;
  key_deposit?: number;
  
  // Términos del contrato
  contract_duration_months: number;
  rent_increase_type: RentIncreaseType;
  rent_increase_percentage?: number;
  payment_day: number; // Día del mes para pago (1-31)
  late_payment_fee_percentage?: number;
  grace_period_days?: number;
  
  // Servicios incluidos
  utilities_included: boolean;
  internet_included: boolean;
  cable_tv_included: boolean;
  cleaning_service_included: boolean;
  maintenance_included: boolean;
  security_service_included: boolean;
  
  // Políticas de la propiedad
  pets_allowed: boolean;
  smoking_allowed: boolean;
  guests_policy: GuestsPolicy;
  max_occupants: number;
  noise_restrictions?: string;
  party_policy?: string;
  modification_policy?: string;
  
  // Garantías
  guarantor_required: boolean;
  guarantor_type?: GuarantorType;
  insurance_required?: boolean;
  co_signer_required?: boolean;
  
  // Responsabilidades
  maintenance_responsibility: MaintenanceResponsibility;
  utilities_responsibility: 'landlord' | 'tenant' | 'shared';
  insurance_responsibility: 'landlord' | 'tenant' | 'both';
  
  // Cláusulas especiales
  special_clauses: string[];
  termination_conditions?: string[];
  renewal_conditions?: string[];
  
  // Datos de las partes
  landlord_data: LandlordData;
  tenant_data?: TenantData;
  tenant_email?: string;
  
  // Control de workflow
  invitation_token?: string;
  landlord_approved: boolean;
  tenant_approved: boolean;
  landlord_approved_at?: string;
  tenant_approved_at?: string;
  
  // Firmas digitales
  landlord_signed: boolean;
  tenant_signed: boolean;
  landlord_signed_at?: string;
  tenant_signed_at?: string;
  landlord_signature_data?: Record<string, any>;
  tenant_signature_data?: Record<string, any>;
  
  // Estado de publicación
  published: boolean;
  
  // Historial del workflow (JSON)
  workflow_history: WorkflowHistoryEntry[];
  
  // Metadatos
  created_by_user_id?: string;
  last_modified_by_user_id?: string;
  template_version?: string;
  legal_framework_version?: string;
}

// Entrada del historial de workflow
export interface WorkflowHistoryEntry {
  timestamp: string;
  user: string;
  user_type: 'landlord' | 'tenant' | 'system';
  action: string;
  description: string;
  old_state?: ContractWorkflowState;
  new_state?: ContractWorkflowState;
  ip_address?: string;
  user_agent?: string;
  additional_data?: Record<string, any>;
}

// Objeción del contrato
export interface ContractObjection {
  id: string;
  contract_id: string;
  objected_by_user_id: string;
  objected_by_type: 'landlord' | 'tenant';
  
  // Detalles de la objeción
  field_name: string;
  section: string;
  current_value: string;
  proposed_value: string;
  justification: string;
  priority: ObjectionPriority;
  
  // Estado y respuesta
  status: ObjectionStatus;
  response_note?: string;
  responded_by_user_id?: string;
  responded_at?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  
  // Archivos adjuntos (si aplica)
  attachments?: ObjectionAttachment[];
  
  // Metadatos
  legal_basis?: string;
  affects_other_clauses?: string[];
  estimated_cost_impact?: number;
}

// Adjunto de objeción
export interface ObjectionAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  description?: string;
  uploaded_at: string;
}

// Garantía del contrato
export interface LandlordContractGuarantee {
  id: string;
  contract_id: string;
  
  // Tipo y detalles
  guarantee_type: GuarantorType;
  amount: number;
  description?: string;
  
  // Información del garante (si aplica)
  guarantor_name?: string;
  guarantor_document_type?: DocumentType;
  guarantor_document_number?: string;
  guarantor_phone?: string;
  guarantor_email?: string;
  guarantor_address?: string;
  guarantor_income?: number;
  guarantor_assets?: Record<string, any>;
  
  // Información de póliza/seguro (si aplica)
  insurance_company?: string;
  policy_number?: string;
  policy_amount?: number;
  policy_start_date?: string;
  policy_end_date?: string;
  
  // Estado
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  verified: boolean;
  verification_date?: string;
  verification_notes?: string;
  
  // Documentos
  documents?: GuaranteeDocument[];
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Documento de garantía
export interface GuaranteeDocument {
  id: string;
  document_type: 'id_copy' | 'income_certificate' | 'bank_statement' | 'property_deed' | 'insurance_policy' | 'other';
  file_name: string;
  file_path: string;
  file_size: number;
  description?: string;
  verified: boolean;
  uploaded_at: string;
}

// Historial detallado del workflow
export interface ContractWorkflowHistory {
  id: string;
  contract_id: string;
  performed_by_user_id: string;
  performed_by_type: 'landlord' | 'tenant' | 'system' | 'admin';
  
  // Detalles de la acción
  action_type: string;
  description: string;
  old_state: ContractWorkflowState;
  new_state: ContractWorkflowState;
  
  // Datos adicionales
  data_changes: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  
  // Referencias relacionadas
  related_objection_id?: string;
  related_guarantee_id?: string;
  related_document_id?: string;
  
  // Timestamps
  created_at: string;
  
  // Metadatos de auditoría
  audit_trail?: AuditTrailEntry[];
}

// Entrada de auditoría
export interface AuditTrailEntry {
  timestamp: string;
  action: string;
  user_id: string;
  details: Record<string, any>;
  checksum?: string;
}

// Respuesta de API para listado de contratos
export interface ContractListResponse {
  contracts: LandlordControlledContractData[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

// Filtros para listado de contratos
export interface ContractFilters {
  state?: ContractWorkflowState[];
  property_type?: PropertyType[];
  min_rent?: number;
  max_rent?: number;
  created_after?: string;
  created_before?: string;
  search_query?: string;
  landlord_id?: string;
  tenant_id?: string;
  has_objections?: boolean;
  needs_signature?: boolean;
  expires_soon?: boolean;
}

// Estadísticas de contratos
export interface ContractStatistics {
  total_contracts: number;
  by_state: Record<ContractWorkflowState, number>;
  by_property_type: Record<PropertyType, number>;
  average_rent: number;
  total_rent_value: number;
  pending_signatures: number;
  expiring_soon: number;
  objections_pending: number;
  fully_executed: number;
  monthly_income: number;
  occupancy_rate: number;
}

// Configuración de plantilla
export interface ContractTemplateConfig {
  version: string;
  last_updated: string;
  legal_framework: 'colombia_ley_820' | 'custom';
  default_clauses: string[];
  required_fields: string[];
  validation_rules: Record<string, any>;
  localization: 'es_CO' | 'es_ES' | 'en_US';
}

// Payload para crear contrato
export interface CreateContractPayload {
  property_id: string;
  contract_template: string;
  basic_terms: {
    monthly_rent: number;
    security_deposit: number;
    duration_months: number;
    utilities_included: boolean;
    pets_allowed: boolean;
    smoking_allowed: boolean;
  };
  contract_content?: string;  // Contenido del contrato editado por el arrendador
}

// Payload para completar datos del arrendador
export interface CompleteLandlordDataPayload {
  contract_id: string;
  landlord_data: LandlordData;
}

// Payload para enviar invitación
export interface SendTenantInvitationPayload {
  contract_id: string;
  tenant_email: string;
  tenant_phone?: string;
  tenant_name?: string;
  invitation_method?: 'email' | 'sms' | 'whatsapp';
  personal_message?: string;
  expires_in_days?: number;
}

// Payload para aceptar invitación
export interface AcceptInvitationPayload {
  invitation_token: string;
}

// Payload para completar datos del arrendatario
export interface CompleteTenantDataPayload {
  contract_id: string;
  tenant_data: TenantData;
}

// Payload para presentar objeción
export interface SubmitObjectionPayload {
  contract_id: string;
  field_name: string;
  current_value: string;
  proposed_value: string;
  justification: string;
  priority: ObjectionPriority;
}

// Payload para responder objeción
export interface RespondObjectionPayload {
  objection_id: string;
  response: 'ACCEPTED' | 'REJECTED';
  response_note?: string;
}

// Payload para aprobar contrato
export interface ApproveContractPayload {
  contract_id: string;
}

// Payload para firma digital
export interface DigitalSignaturePayload {
  contract_id: string;
  signature_data: {
    signature_image: string;
    signature_metadata: Record<string, any>;
    biometric_data?: Record<string, any>;
    device_info: Record<string, any>;
    location?: {
      latitude: number;
      longitude: number;
      accuracy: number;
    };
    timestamp: string;
  };
}

// Payload para publicar contrato
export interface PublishContractPayload {
  contract_id: string;
}