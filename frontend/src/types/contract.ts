import { Property } from './property';
import { User } from './index';

// ===== CORE CONTRACT TYPES =====

export interface Contract {
  id: string;
  contract_number: string;
  title: string;
  contract_type: 'rental' | 'sale' | 'service' | 'other';
  property?: {
    id: string;
    title: string;
    address: string;
  };
  primary_party: User;
  secondary_party: User;
  start_date: string;
  end_date: string;
  monthly_rent?: number;
  deposit_amount?: number;
  total_value?: number;
  status: 'draft' | 'pending_signature' | 'partially_signed' | 'fully_signed' | 'active' | 'suspended' | 'terminated' | 'expired';
  terms: string;
  created_at: string;
  updated_at: string;
  signed_date?: string;
  is_template: boolean;
  template_id?: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  contract_type: 'rental' | 'sale' | 'service' | 'other';
  template_content: string;
  variables: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContractFormData {
  title: string;
  contract_type: 'rental' | 'sale' | 'service' | 'other';
  property_id?: string;
  primary_party_id: string;
  secondary_party_id: string;
  start_date: string;
  end_date: string;
  monthly_rent?: number;
  deposit_amount?: number;
  total_value?: number;
  terms: string;
  template_id?: string;
}

export interface ContractFilters {
  search?: string;
  status?: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
  min_rent?: number;
  max_rent?: number;
  property_id?: string;
}

// ===== DIGITAL SIGNATURE TYPES =====

export interface ContractSignature {
  id: string;
  contract: string;
  signer: User;
  signature_type: 'digital' | 'biometric' | 'wet_signature';
  authentication_method: 'digital_signature' | 'webcam_face' | 'webcam_document' | 'biometric_fingerprint';
  signature_data: string;
  signature_image?: string;
  face_verification_data?: Record<string, any>;
  document_verification_data?: Record<string, any>;
  ip_address: string;
  user_agent: string;
  geolocation?: Record<string, any>;
  verification_hash: string;
  biometric_data?: Record<string, any>;
  device_fingerprint?: Record<string, any>;
  verification_level: 'basic' | 'enhanced' | 'maximum';
  security_checks?: Record<string, any>;
  is_valid: boolean;
  signed_at: string;
  timestamp_token?: string;
  blockchain_hash?: string;
}

export interface SignatureData {
  signature: string;
  timestamp: Date;
  signerInfo: {
    name: string;
    ipAddress: string;
    userAgent: string;
    geolocation?: GeolocationPosition;
  };
  verification: {
    hash: string;
    method: 'digital_signature';
    metadata: Record<string, any>;
  };
}

export interface BiometricData {
  facialRecognition?: {
    imageData: string;
    confidence: number;
    landmarks: FacialLandmarks;
    timestamp: Date;
  };
  documentVerification?: {
    frontImage: string;
    backImage?: string;
    extractedData: DocumentData;
    confidence: number;
    timestamp: Date;
  };
  fingerprint?: {
    template: string;
    quality: number;
    timestamp: Date;
  };
  deviceFingerprint: {
    userAgent: string;
    screenResolution: string;
    timezone: string;
    language: string;
    platform: string;
  };
}

export interface FacialLandmarks {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  nose: { x: number; y: number };
  mouth: { x: number; y: number };
}

export interface DocumentData {
  documentType: string;
  documentNumber: string;
  fullName: string;
  dateOfBirth?: string;
  expirationDate?: string;
  issuingAuthority?: string;
}

// ===== DOCUMENT MANAGEMENT =====

export interface ContractDocument {
  id: string;
  contract: string;
  title: string;
  document_type: 'contract' | 'amendment' | 'addendum' | 'invoice' | 'receipt' | 'photo' | 'other';
  description: string;
  file: string;
  file_size: number;
  mime_type: string;
  uploaded_by: User;
  uploaded_at: string;
  is_signed: boolean;
}

// ===== AMENDMENTS AND CHANGES =====

export interface ContractAmendment {
  id: string;
  contract: string;
  title: string;
  description: string;
  amendment_content: string;
  effective_date: string;
  created_by: User;
  created_at: string;
  is_approved: boolean;
  approved_by?: User;
  approved_at?: string;
}

export interface ContractRenewal {
  id: string;
  contract: string;
  new_end_date: string;
  additional_terms: string;
  monthly_rent_change?: number;
  created_by: User;
  created_at: string;
  is_approved: boolean;
}

export interface ContractTermination {
  id: string;
  contract: string;
  reason: string;
  termination_date: string;
  early_termination: boolean;
  penalty_amount?: number;
  created_by: User;
  created_at: string;
}

// ===== STATISTICS AND REPORTS =====

export interface ContractStats {
  total_contracts: number;
  active_contracts: number;
  pending_signatures: number;
  expiring_soon: number;
  total_value: number;
  contracts_by_status: Record<string, number>;
  contracts_by_type: Record<string, number>;
  monthly_revenue: number;
}

// ===== LEGACY SUPPORT =====

export interface CreateContractDto extends ContractFormData {}
export interface UpdateContractDto extends Partial<ContractFormData> {}