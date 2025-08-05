export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'owner' | 'tenant' | 'service_provider';
  avatar?: string;
  phone?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  user_type: 'landlord' | 'tenant' | 'service_provider';
  interview_code: string;
  phone_number: string;
  whatsapp?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  nationality?: string;
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | 'other';
  country: string;
  state: string;
  city: string;
  postal_code?: string;
  employment_status?: 'employed' | 'self_employed' | 'student' | 'unemployed' | 'retired';
  monthly_income?: number;
  currency?: 'COP' | 'USD';
  employer_name?: string;
  job_title?: string;
  years_employed?: number;
  company_name?: string;
  property_types?: string[];
  total_properties?: number;
  years_experience?: number;
  current_address?: string;
  rental_history?: boolean;
  credit_score?: number;
  pets?: boolean;
  family_size?: number;
  service_category?: string;
  specialties?: string[];
  business_name?: string;
  hourly_rate?: number;
  hourly_rate_currency?: 'COP' | 'USD';
  service_areas?: string[];
  preferred_property_types?: string[];
  budget_range?: 'low' | 'medium' | 'high' | 'luxury';
  preferred_locations?: string[];
  move_in_date?: string;
  lease_duration?: 'short_term' | 'long_term' | 'flexible';
  source?: string;
  marketing_consent?: boolean;
  terms_accepted?: boolean;
  privacy_policy_accepted?: boolean;
}

export interface UpdateProfileDto {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface UserResume {
  id: string;
  user: string;
  personal_info: {
    full_name: string;
    date_of_birth: string;
    nationality: string;
    marital_status: string;
    identification_number: string;
    identification_type: string;
  };
  contact_info: {
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };
  education: {
    highest_degree: string;
    institution: string;
    graduation_year: number;
    field_of_study: string;
    additional_certifications: string[];
  };
  employment: {
    current_employer: string;
    position: string;
    employment_type: string;
    years_employed: number;
    monthly_income: number;
    employment_status: string;
  };
  financial_info: {
    credit_score: number;
    bank_references: string[];
    income_sources: string[];
    monthly_expenses: number;
    savings_amount: number;
  };
  references: {
    personal_references: Array<{
      name: string;
      relationship: string;
      phone: string;
      email: string;
    }>;
    professional_references: Array<{
      name: string;
      position: string;
      company: string;
      phone: string;
      email: string;
    }>;
  };
  housing_history: Array<{
    address: string;
    landlord_name: string;
    landlord_phone: string;
    rent_amount: number;
    lease_start: string;
    lease_end: string;
    reason_for_leaving: string;
  }>;
  documents: {
    identification_document: string;
    proof_of_income: string;
    bank_statements: string[];
    rental_history: string[];
    credit_report: string;
  };
  verification_status: {
    identity_verified: boolean;
    income_verified: boolean;
    references_verified: boolean;
    documents_verified: boolean;
    overall_verified: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface UpdateResumeDto {
  personal_info?: Partial<UserResume['personal_info']>;
  contact_info?: Partial<UserResume['contact_info']>;
  education?: Partial<UserResume['education']>;
  employment?: Partial<UserResume['employment']>;
  financial_info?: Partial<UserResume['financial_info']>;
  references?: Partial<UserResume['references']>;
  housing_history?: UserResume['housing_history'];
  documents?: Partial<UserResume['documents']>;
}

export interface UserSettings {
  id: string;
  user: string;
  notifications: {
    email_notifications: boolean;
    sms_notifications: boolean;
    newsletter: boolean;
    property_alerts: boolean;
    message_notifications: boolean;
    payment_reminders: boolean;
  };
  privacy: {
    profile_visibility: 'public' | 'private' | 'contacts_only';
    show_contact_info: boolean;
    show_property_history: boolean;
    allow_messages: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    currency: string;
    date_format: string;
    theme: 'light' | 'dark' | 'auto';
  };
  security: {
    two_factor_enabled: boolean;
    login_notifications: boolean;
    session_timeout: number;
  };
  created_at: string;
  updated_at: string;
} 