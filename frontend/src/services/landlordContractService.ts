/**
 * Servicio de API para el Sistema de Contratos Controlado por Arrendador
 * Integra con el backend Django y maneja todo el workflow de contratos
 */

import { api } from './api';
import {
  LandlordControlledContractData,
  ContractListResponse,
  ContractFilters,
  ContractStatistics,
  ContractObjection,
  LandlordContractGuarantee,
  ContractWorkflowHistory,
  CreateContractPayload,
  CompleteLandlordDataPayload,
  SendTenantInvitationPayload,
  AcceptInvitationPayload,
  CompleteTenantDataPayload,
  SubmitObjectionPayload,
  RespondObjectionPayload,
  ApproveContractPayload,
  DigitalSignaturePayload,
  PublishContractPayload,
} from '../types/landlordContract';

const BASE_URL = '/contracts/landlord';
const TENANT_BASE_URL = '/contracts/tenant';

export class LandlordContractService {
  // =====================================================================
  // OPERACIONES DEL ARRENDADOR
  // =====================================================================

  /**
   * Crear un nuevo borrador de contrato
   */
  static async createContractDraft(payload: CreateContractPayload): Promise<LandlordControlledContractData> {
    // Transformar el payload al formato que espera el serializer backend
    const backendPayload = {
      property: payload.property_id,
      basic_terms: {
        monthly_rent: payload.basic_terms.monthly_rent,
        security_deposit: payload.basic_terms.security_deposit,
        duration_months: payload.basic_terms.duration_months,
        utilities_included: payload.basic_terms.utilities_included,
        pets_allowed: payload.basic_terms.pets_allowed,
        smoking_allowed: payload.basic_terms.smoking_allowed
      },
      // Incluir datos del arrendador si están disponibles
      landlord_data: payload.landlord_data || {},
      property_data: payload.property_data || {},
      guarantee_terms: payload.guarantee_terms || {},
      special_clauses: payload.special_clauses || [],
      // Mantener también campos individuales para compatibilidad
      monthly_rent: payload.basic_terms.monthly_rent,
      security_deposit: payload.basic_terms.security_deposit,
      contract_duration_months: payload.basic_terms.duration_months,
      utilities_included: payload.basic_terms.utilities_included,
      pets_allowed: payload.basic_terms.pets_allowed,
      smoking_allowed: payload.basic_terms.smoking_allowed
    };

    console.log('🚀 SENDING CONTRACT PAYLOAD:', {
      originalPayload: payload,
      transformedPayload: backendPayload,
      endpoint: `${BASE_URL}/contracts/`
    });

    const response = await api.post(`${BASE_URL}/contracts/`, backendPayload);
    return response.data;
  }

  /**
   * Método alias para compatibilidad con tests y componentes legacy
   * Convierte datos genéricos a CreateContractPayload y llama createContractDraft
   */
  static async createContract(contractData: any): Promise<LandlordControlledContractData> {
    // Transformar datos genéricos directamente al formato backend
    const backendPayload = {
      property: contractData.property_id || contractData.propertyId || contractData.property || '',
      basic_terms: {
        monthly_rent: Number(contractData.monthly_rent || contractData.monthlyRent || 0),
        security_deposit: Number(contractData.security_deposit || contractData.securityDeposit || 0),
        duration_months: Number(contractData.duration_months || contractData.durationMonths || contractData.contract_duration_months || 12),
        utilities_included: Boolean(contractData.utilities_included || contractData.utilitiesIncluded || false),
        pets_allowed: Boolean(contractData.pets_allowed || contractData.petsAllowed || false),
        smoking_allowed: Boolean(contractData.smoking_allowed || contractData.smokingAllowed || false)
      },
      // Mantener también campos individuales para compatibilidad
      monthly_rent: Number(contractData.monthly_rent || contractData.monthlyRent || 0),
      security_deposit: Number(contractData.security_deposit || contractData.securityDeposit || 0),
      contract_duration_months: Number(contractData.duration_months || contractData.durationMonths || contractData.contract_duration_months || 12),
      utilities_included: Boolean(contractData.utilities_included || contractData.utilitiesIncluded || false),
      pets_allowed: Boolean(contractData.pets_allowed || contractData.petsAllowed || false),
      smoking_allowed: Boolean(contractData.smoking_allowed || contractData.smokingAllowed || false)
    };

    console.log('🚀 SENDING LEGACY CONTRACT PAYLOAD:', {
      originalData: contractData,
      transformedPayload: backendPayload
    });

    const response = await api.post(`${BASE_URL}/contracts/`, backendPayload);
    return response.data;
  }

  /**
   * Completar datos del arrendador
   */
  static async completeLandlordData(payload: CompleteLandlordDataPayload): Promise<{
    contract: LandlordControlledContractData;
    invitation_token: string;
  }> {
    const response = await api.post(`${BASE_URL}/contracts/${payload.contract_id}/complete-landlord-data/`, {
      landlord_data: payload.landlord_data,
    });
    return response.data;
  }

  /**
   * Enviar invitación al arrendatario
   */
  static async sendTenantInvitation(payload: SendTenantInvitationPayload): Promise<{ success: boolean }> {
    const response = await api.post(`${BASE_URL}/contracts/${payload.contract_id}/send-invitation/`, {
      tenant_email: payload.tenant_email,
      personal_message: payload.personal_message,
    });
    return response.data;
  }

  /**
   * Obtener contratos del arrendador
   */
  static async getLandlordContracts(
    filters?: ContractFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<ContractListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const response = await api.get(`${BASE_URL}/contracts/?${params.toString()}`);
    return response.data;
  }

  /**
   * Obtener un contrato específico del arrendador
   */
  static async getLandlordContract(contractId: string): Promise<LandlordControlledContractData> {
    const response = await api.get(`${BASE_URL}/contracts/${contractId}/`);
    return response.data;
  }

  /**
   * Obtener contrato para edición con datos formateados para el editor
   */
  static async getContractForEditing(contractId: string): Promise<LandlordControlledContractData> {
    try {
      // Usar el endpoint existente pero con datos formateados para edición
      const response = await api.get(`${BASE_URL}/contracts/${contractId}/`);
      const contractData = response.data;

      // Formatear los datos para el editor si es necesario
      const formattedContract: LandlordControlledContractData = {
        id: contractData.id,
        contract_number: contractData.contract_number,
        current_state: contractData.current_state,
        contract_template: contractData.contract_template || 'rental_urban',
        
        // Basic terms con valores por defecto
        basic_terms: {
          monthly_rent: contractData.monthly_rent || 0,
          security_deposit: contractData.security_deposit || 0,
          duration_months: contractData.contract_duration_months || 12,
          utilities_included: contractData.utilities_included || false,
          pets_allowed: contractData.pets_allowed || false,
          smoking_allowed: contractData.smoking_allowed || false,
          payment_day: contractData.payment_day || 5,
          guarantee_type: contractData.basic_terms?.guarantee_type || 'none',
          guarantee_data: contractData.basic_terms?.guarantee_data || {},
          requires_biometric_codeudor: contractData.basic_terms?.requires_biometric_codeudor || false
        },

        // Landlord data con valores por defecto
        landlord_data: {
          full_name: contractData.landlord_data?.full_name || '',
          document_type: contractData.landlord_data?.document_type || 'CC',
          document_number: contractData.landlord_data?.document_number || '',
          phone: contractData.landlord_data?.phone || '',
          email: contractData.landlord_data?.email || '',
          address: contractData.landlord_data?.address || '',
          city: contractData.landlord_data?.city || ''
        },

        // Property data con valores por defecto
        property_data: {
          property_id: contractData.property_data?.property_id || contractData.property?.id || '',
          property_address: contractData.property_data?.property_address || contractData.property?.address || '',
          property_area: contractData.property_data?.property_area || contractData.property?.area || 0,
          property_type: contractData.property_data?.property_type || contractData.property?.property_type || 'apartment',
          property_furnished: contractData.property_data?.property_furnished || contractData.property?.furnished || false
        },

        // Tenant data (puede estar vacío en modo draft)
        tenant_data: contractData.tenant_data || null,

        // Special clauses
        special_clauses: contractData.special_clauses || [],

        // Contract states
        landlord_approved: contractData.landlord_approved || false,
        tenant_approved: contractData.tenant_approved || false,
        landlord_signed: contractData.landlord_signed || false,
        tenant_signed: contractData.tenant_signed || false,

        // Timestamps
        created_at: contractData.created_at,
        updated_at: contractData.updated_at,
        signed_at: contractData.signed_at,

        // Optional fields
        tenant_email: contractData.tenant_email,
        invitation_token: contractData.invitation_token,
        published_at: contractData.published_at
      };

      console.log('✅ Contract loaded for editing:', formattedContract.id);
      return formattedContract;

    } catch (error) {
      console.error('❌ Error loading contract for editing:', error);
      throw error;
    }
  }

  /**
   * Actualizar borrador de contrato
   */
  static async updateContractDraft(
    contractId: string,
    data: Partial<LandlordControlledContractData>
  ): Promise<LandlordControlledContractData> {
    const response = await api.patch(`${BASE_URL}/contracts/${contractId}/`, data);
    return response.data;
  }

  /**
   * Aprobar contrato final (arrendador)
   */
  static async approveLandlordContract(payload: ApproveContractPayload): Promise<LandlordControlledContractData> {
    const response = await api.post(`${BASE_URL}/contracts/${payload.contract_id}/approve/`);
    return response.data;
  }

  /**
   * Firmar contrato digitalmente (arrendador)
   */
  static async signLandlordContract(payload: DigitalSignaturePayload): Promise<LandlordControlledContractData> {
    const response = await api.post(`${BASE_URL}/contracts/${payload.contract_id}/sign/`, {
      signature_data: payload.signature_data,
    });
    return response.data;
  }

  /**
   * Publicar contrato (darle vida jurídica)
   */
  static async publishContract(payload: PublishContractPayload): Promise<LandlordControlledContractData> {
    const response = await api.post(`${BASE_URL}/contracts/${payload.contract_id}/publish/`);
    return response.data;
  }

  /**
   * Obtener estadísticas de contratos del arrendador
   */
  static async getLandlordStatistics(): Promise<ContractStatistics> {
    const response = await api.get(`${BASE_URL}/statistics/`);
    return response.data;
  }

  /**
   * Obtener estadísticas generales de contratos (para ambos roles)
   */
  static async getContractStatistics(): Promise<ContractStatistics> {
    const response = await api.get('/contracts/statistics/');
    return response.data;
  }

  /**
   * Obtener contratos de un usuario (funciona para ambos roles)
   */
  static async getContracts(
    filters?: ContractFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<ContractListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const response = await api.get(`/contracts/?${params.toString()}`);
    return response.data;
  }

  /**
   * Aprobar contrato (funciona para ambos roles)
   */
  static async approveContract(payload: ApproveContractPayload): Promise<LandlordControlledContractData> {
    const response = await api.post(`/contracts/${payload.contract_id}/approve/`);
    return response.data;
  }


  /**
   * Obtener dashboard del arrendador
   */
  static async getLandlordDashboard(): Promise<{
    active_contracts: number;
    pending_signatures: number;
    monthly_income: number;
    expiring_contracts: number;
    recent_activities: ContractWorkflowHistory[];
    contract_status_breakdown: Record<string, number>;
  }> {
    const response = await api.get(`${BASE_URL}/dashboard/`);
    return response.data;
  }

  // =====================================================================
  // OPERACIONES DEL ARRENDATARIO
  // =====================================================================

  /**
   * Aceptar invitación de contrato
   */
  static async acceptTenantInvitation(payload: AcceptInvitationPayload): Promise<LandlordControlledContractData> {
    const response = await api.post(`${TENANT_BASE_URL}/accept-invitation/`, {
      invitation_token: payload.invitation_token,
    });
    return response.data;
  }

  /**
   * Completar datos del arrendatario
   */
  static async completeTenantData(payload: CompleteTenantDataPayload): Promise<LandlordControlledContractData> {
    const response = await api.post(`${TENANT_BASE_URL}/contracts/${payload.contract_id}/complete-data/`, {
      tenant_data: payload.tenant_data,
    });
    return response.data;
  }

  /**
   * Obtener contratos del arrendatario
   */
  static async getTenantContracts(
    filters?: ContractFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<ContractListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const response = await api.get(`${TENANT_BASE_URL}/contracts/?${params.toString()}`);
    return response.data;
  }

  /**
   * Obtener un contrato específico del arrendatario
   */
  static async getTenantContract(contractId: string): Promise<LandlordControlledContractData> {
    const response = await api.get(`${TENANT_BASE_URL}/contracts/${contractId}/`);
    return response.data;
  }

  /**
   * Aprobar contrato final (arrendatario)
   */
  static async approveTenantContract(payload: ApproveContractPayload): Promise<LandlordControlledContractData> {
    const response = await api.post(`${TENANT_BASE_URL}/contracts/${payload.contract_id}/approve/`);
    return response.data;
  }

  /**
   * Firmar contrato digitalmente (arrendatario)
   */
  static async signTenantContract(payload: DigitalSignaturePayload): Promise<LandlordControlledContractData> {
    const response = await api.post(`${TENANT_BASE_URL}/contracts/${payload.contract_id}/sign/`, {
      signature_data: payload.signature_data,
    });
    return response.data;
  }

  /**
   * Obtener dashboard del arrendatario
   */
  static async getTenantDashboard(): Promise<{
    active_contracts: number;
    pending_actions: number;
    next_payment_due: string;
    total_monthly_rent: number;
    recent_activities: ContractWorkflowHistory[];
    contract_status_breakdown: Record<string, number>;
  }> {
    const response = await api.get(`${TENANT_BASE_URL}/dashboard/`);
    return response.data;
  }

  // =====================================================================
  // SISTEMA DE OBJECIONES
  // =====================================================================

  /**
   * Presentar una objeción
   */
  static async submitObjection(payload: SubmitObjectionPayload): Promise<ContractObjection> {
    const response = await api.post(`/contracts/objections/`, payload);
    return response.data;
  }

  /**
   * Responder a una objeción
   */
  static async respondToObjection(payload: RespondObjectionPayload): Promise<ContractObjection> {
    const response = await api.post(`/contracts/objections/${payload.objection_id}/respond/`, {
      response: payload.response,
      response_note: payload.response_note,
    });
    return response.data;
  }

  /**
   * Obtener objeciones de un contrato
   */
  static async getContractObjections(contractId: string): Promise<ContractObjection[]> {
    const response = await api.get(`/contracts/${contractId}/objections/`);
    return response.data;
  }

  /**
   * Obtener una objeción específica
   */
  static async getObjection(objectionId: string): Promise<ContractObjection> {
    const response = await api.get(`/contracts/objections/${objectionId}/`);
    return response.data;
  }

  /**
   * Retirar una objeción
   */
  static async withdrawObjection(objectionId: string): Promise<ContractObjection> {
    const response = await api.post(`/contracts/objections/${objectionId}/withdraw/`);
    return response.data;
  }

  // =====================================================================
  // GARANTÍAS
  // =====================================================================

  /**
   * Crear una garantía
   */
  static async createGuarantee(
    contractId: string,
    guaranteeData: Partial<LandlordContractGuarantee>
  ): Promise<LandlordContractGuarantee> {
    const response = await api.post(`/contracts/${contractId}/guarantees/`, guaranteeData);
    return response.data;
  }

  /**
   * Obtener garantías de un contrato
   */
  static async getContractGuarantees(contractId: string): Promise<LandlordContractGuarantee[]> {
    const response = await api.get(`/contracts/${contractId}/guarantees/`);
    return response.data;
  }

  /**
   * Actualizar una garantía
   */
  static async updateGuarantee(
    guaranteeId: string,
    guaranteeData: Partial<LandlordContractGuarantee>
  ): Promise<LandlordContractGuarantee> {
    const response = await api.patch(`/contracts/guarantees/${guaranteeId}/`, guaranteeData);
    return response.data;
  }

  /**
   * Verificar una garantía
   */
  static async verifyGuarantee(guaranteeId: string, notes?: string): Promise<LandlordContractGuarantee> {
    const response = await api.post(`/contracts/guarantees/${guaranteeId}/verify/`, {
      verification_notes: notes,
    });
    return response.data;
  }

  // =====================================================================
  // HISTORIAL Y AUDITORÍA
  // =====================================================================

  /**
   * Obtener historial completo de un contrato
   */
  static async getContractHistory(contractId: string): Promise<ContractWorkflowHistory[]> {
    const response = await api.get(`/contracts/${contractId}/history/`);
    return response.data;
  }

  /**
   * Obtener actividad reciente del usuario
   */
  static async getRecentActivity(limit: number = 10): Promise<ContractWorkflowHistory[]> {
    const response = await api.get(`/contracts/recent-activity/?limit=${limit}`);
    return response.data;
  }

  // =====================================================================
  // UTILIDADES Y VALIDACIONES
  // =====================================================================

  /**
   * Validar datos antes de crear contrato
   */
  static async validateContractData(data: Partial<LandlordControlledContractData>): Promise<{
    is_valid: boolean;
    errors: Record<string, string[]>;
    warnings: Record<string, string[]>;
  }> {
    const response = await api.post('/contracts/validate/', data);
    return response.data;
  }

  /**
   * Obtener plantillas de contrato disponibles
   */
  static async getContractTemplates(): Promise<{
    templates: {
      id: string;
      name: string;
      description: string;
      legal_framework: string;
      version: string;
      is_default: boolean;
    }[];
  }> {
    const response = await api.get('/contracts/templates/');
    return response.data;
  }

  /**
   * Generar PDF preview del contrato
   */
  static async generateContractPreview(contractId: string): Promise<{
    pdf_url: string;
    expires_at: string;
  }> {
    const response = await api.post(`/contracts/${contractId}/generate-preview/`);
    return response.data;
  }

  /**
   * Descargar contrato final firmado
   */
  static async downloadSignedContract(contractId: string): Promise<Blob> {
    const response = await api.get(`/contracts/${contractId}/download/`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Verificar estado de un token de invitación
   */
  static async verifyInvitationToken(token: string): Promise<{
    is_valid: boolean;
    contract_id?: string;
    expires_at?: string;
    landlord_name?: string;
    property_address?: string;
  }> {
    const response = await api.post('/contracts/verify-invitation/', {
      invitation_token: token,
    });
    return response.data;
  }

  /**
   * Obtener información pública de un contrato para invitación
   */
  static async getContractInvitationInfo(token: string): Promise<{
    contract_id: string;
    property_address: string;
    monthly_rent: number;
    landlord_name: string;
    contract_duration_months: number;
    invitation_expires_at: string;
  }> {
    const response = await api.get(`/contracts/invitation-info/${token}/`);
    return response.data;
  }

  // =====================================================================
  // GENERACIÓN Y DESCARGA DE PDFs
  // =====================================================================

  /**
   * Generar PDF del contrato con firmas digitales
   */
  static async generateContractPDF(contractId: string, options?: {
    includeSignatures?: boolean;
    includeBiometric?: boolean;
    download?: boolean;
  }): Promise<{
    contract_id: string;
    contract_number: string;
    pdf_generated: boolean;
    file_size: number;
    generated_at: string;
    includes_signatures: boolean;
    includes_biometric: boolean;
    download_url: string;
  }> {
    const params = new URLSearchParams();
    if (options?.includeSignatures !== undefined) {
      params.append('include_signatures', options.includeSignatures.toString());
    }
    if (options?.includeBiometric !== undefined) {
      params.append('include_biometric', options.includeBiometric.toString());
    }
    if (options?.download !== undefined) {
      params.append('download', options.download.toString());
    }

    const response = await api.get(`${BASE_URL}/contracts/${contractId}/generate_pdf/?${params.toString()}`);
    return response.data;
  }

  /**
   * Descargar PDF del contrato firmado
   */
  static async downloadSignedContractPDF(contractId: string): Promise<Blob> {
    const response = await api.get(`${BASE_URL}/contracts/${contractId}/download_pdf/`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Generar vista previa del PDF sin firmas
   */
  static async previewContractPDF(contractId: string): Promise<Blob> {
    const response = await api.get(`${BASE_URL}/contracts/${contractId}/preview_pdf/`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Descargar PDF con opciones personalizadas
   */
  static async downloadContractPDF(contractId: string, filename?: string, options?: {
    includeSignatures?: boolean;
    includeBiometric?: boolean;
  }): Promise<void> {
    const params = new URLSearchParams();
    params.append('download', 'true');
    if (options?.includeSignatures !== undefined) {
      params.append('include_signatures', options.includeSignatures.toString());
    }
    if (options?.includeBiometric !== undefined) {
      params.append('include_biometric', options.includeBiometric.toString());
    }

    const response = await api.get(`${BASE_URL}/contracts/${contractId}/generate_pdf/?${params.toString()}`, {
      responseType: 'blob',
    });

    // Crear enlace de descarga
    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `contrato_${contractId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Abrir PDF en nueva ventana para visualización
   */
  static async openContractPDF(contractId: string, options?: {
    includeSignatures?: boolean;
    includeBiometric?: boolean;
  }): Promise<void> {
    const params = new URLSearchParams();
    if (options?.includeSignatures !== undefined) {
      params.append('include_signatures', options.includeSignatures.toString());
    }
    if (options?.includeBiometric !== undefined) {
      params.append('include_biometric', options.includeBiometric.toString());
    }

    const response = await api.get(`${BASE_URL}/contracts/${contractId}/preview_pdf/?${params.toString()}`, {
      responseType: 'blob',
    });

    // Abrir en nueva ventana
    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    // Limpiar URL después de un tiempo
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 10000);
  }

  // =====================================================================
  // SISTEMA DE INVITACIONES CON TOKENS SEGUROS
  // =====================================================================

  /**
   * Crear y enviar invitación de contrato con token seguro
   */
  static async createTenantInvitation(payload: {
    contract_id: string;
    tenant_email: string;
    tenant_phone?: string;
    tenant_name?: string;
    invitation_method?: 'email' | 'sms' | 'whatsapp';
    personal_message?: string;
    expires_in_days?: number;
  }): Promise<{
    invitation_id: string;
    invitation_token: string;
    expires_at: string;
    invitation_url: string;
  }> {
    const response = await api.post(`${BASE_URL}/contracts/${payload.contract_id}/create-invitation/`, {
      tenant_email: payload.tenant_email,
      tenant_phone: payload.tenant_phone,
      tenant_name: payload.tenant_name,
      invitation_method: payload.invitation_method || 'email',
      personal_message: payload.personal_message,
      expires_in_days: payload.expires_in_days || 7,
    });
    return response.data;
  }

  /**
   * Enviar invitación por el método especificado
   */
  static async sendInvitationNotification(
    invitationId: string,
    method: 'email' | 'sms' | 'whatsapp'
  ): Promise<{ success: boolean; method: string; sent_at: string }> {
    const response = await api.post(`/contracts/invitations/${invitationId}/send/`, {
      method,
    });
    return response.data;
  }


  /**
   * Aceptar invitación con token
   */
  static async acceptInvitationWithToken(token: string): Promise<{
    contract: LandlordControlledContractData;
    requires_tenant_data: boolean;
  }> {
    const response = await api.post(`${TENANT_BASE_URL}/accept-invitation/`, {
      invitation_token: token,
    });
    return response.data;
  }

  /**
   * Obtener historial de invitaciones de un contrato
   */
  static async getContractInvitations(contractId: string): Promise<{
    invitations: {
      id: string;
      tenant_email: string;
      tenant_name?: string;
      invitation_method: string;
      status: 'pending' | 'accepted' | 'expired' | 'cancelled';
      created_at: string;
      expires_at: string;
      accepted_at?: string;
    }[];
  }> {
    const response = await api.get(`${BASE_URL}/contracts/${contractId}/invitations/`);
    return response.data;
  }

  /**
   * Cancelar invitación activa
   */
  static async cancelInvitation(invitationId: string): Promise<{ success: boolean }> {
    const response = await api.post(`/contracts/invitations/${invitationId}/cancel/`);
    return response.data;
  }

  /**
   * Reenviar invitación existente
   */
  static async resendInvitation(
    invitationId: string,
    newMethod?: 'email' | 'sms' | 'whatsapp'
  ): Promise<{ success: boolean; method: string; sent_at: string }> {
    const response = await api.post(`/contracts/invitations/${invitationId}/resend/`, {
      method: newMethod,
    });
    return response.data;
  }

  // =====================================================================
  // NOTIFICACIONES Y COMUNICACIÓN
  // =====================================================================

  /**
   * Reenviar invitación a arrendatario
   */
  static async resendTenantInvitation(contractId: string): Promise<{ success: boolean }> {
    const response = await api.post(`${BASE_URL}/contracts/${contractId}/resend-invitation/`);
    return response.data;
  }

  /**
   * Enviar recordatorio personalizado
   */
  static async sendCustomReminder(contractId: string, message: string, recipient: 'tenant' | 'landlord'): Promise<{ success: boolean }> {
    const response = await api.post(`/contracts/${contractId}/send-reminder/`, {
      message,
      recipient,
    });
    return response.data;
  }

  // =====================================================================
  // GESTIÓN DE ARCHIVOS
  // =====================================================================

  /**
   * Subir documento adjunto
   */
  static async uploadDocument(
    contractId: string,
    file: File,
    documentType: string,
    description?: string
  ): Promise<{
    document_id: string;
    file_url: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (description) {
      formData.append('description', description);
    }

    const response = await api.post(`/contracts/${contractId}/documents/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Obtener documentos de un contrato
   */
  static async getContractDocuments(contractId: string): Promise<{
    documents: {
      id: string;
      document_type: string;
      file_name: string;
      file_url: string;
      description: string;
      uploaded_by: string;
      uploaded_at: string;
    }[];
  }> {
    const response = await api.get(`/contracts/${contractId}/documents/`);
    return response.data;
  }

  // =====================================================================
  // UTILIDADES DE FORMATO Y HELPERS
  // =====================================================================

  /**
   * Formatear moneda colombiana
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Calcular total de depósitos
   */
  static calculateTotalDeposits(contract: LandlordControlledContractData): number {
    const {
      security_deposit = 0,
      utilities_deposit = 0,
      pet_deposit = 0,
      cleaning_deposit = 0,
      key_deposit = 0,
    } = contract;

    return security_deposit + utilities_deposit + 
           (contract.pets_allowed ? pet_deposit : 0) + 
           cleaning_deposit + key_deposit;
  }

  /**
   * Validar si el contrato está listo para el siguiente paso
   */
  static isContractReadyForNextStep(contract: LandlordControlledContractData): boolean {
    switch (contract.current_state) {
      case 'DRAFT':
        return !!(contract.landlord_data.full_name && contract.monthly_rent > 0);
      case 'TENANT_INVITED':
        return !!contract.tenant_email;
      case 'TENANT_REVIEWING':
        return !!contract.tenant_data?.full_name;
      case 'LANDLORD_REVIEWING':
        return true; // Arrendador puede aprobar en cualquier momento
      case 'BOTH_REVIEWING':
        return contract.landlord_approved && contract.tenant_approved;
      case 'READY_TO_SIGN':
        return true;
      case 'FULLY_SIGNED':
        return true; // Listo para publicar
      default:
        return false;
    }
  }

  /**
   * Obtener próxima acción requerida
   */
  static getNextRequiredAction(contract: LandlordControlledContractData, userType: 'landlord' | 'tenant'): string {
    switch (contract.current_state) {
      case 'DRAFT':
        return userType === 'landlord' ? 'Completar datos y enviar invitación' : 'Esperando invitación';
      case 'TENANT_INVITED':
        return userType === 'tenant' ? 'Aceptar invitación y completar datos' : 'Esperando respuesta del arrendatario';
      case 'TENANT_REVIEWING':
        return userType === 'tenant' ? 'Completar datos personales' : 'Esperando datos del arrendatario';
      case 'LANDLORD_REVIEWING':
        return userType === 'landlord' ? 'Revisar datos del arrendatario' : 'Esperando aprobación del arrendador';
      case 'OBJECTIONS_PENDING':
        return 'Resolver objeciones pendientes';
      case 'BOTH_REVIEWING':
        return contract.landlord_approved && contract.tenant_approved 
          ? 'Proceder con firmas digitales'
          : userType === 'landlord' && !contract.landlord_approved
            ? 'Aprobar contrato final'
            : userType === 'tenant' && !contract.tenant_approved
              ? 'Aprobar contrato final'
              : 'Esperando aprobación de la otra parte';
      case 'READY_TO_SIGN':
        return userType === 'landlord' && !contract.landlord_signed
          ? 'Firmar digitalmente'
          : userType === 'tenant' && !contract.tenant_signed
            ? 'Firmar digitalmente'
            : 'Esperando firma de la otra parte';
      case 'FULLY_SIGNED':
        return userType === 'landlord' ? 'Publicar contrato' : 'Esperando publicación';
      case 'PUBLISHED':
        return 'Contrato activo';
      default:
        return 'Estado desconocido';
    }
  }
}

export default LandlordContractService;
/* Cache busted: 2025-08-06T04:42:27.040Z - CONTRACT_SERVICE */

/* FORCE RELOAD 1754456937777 - LANDLORD_CONTRACT_SERVICE - Nuclear fix applied */

/* PAYLOAD FIX 1754467945892 - BACKEND SERIALIZER ALIGNMENT - Property ID and fields fixed */
