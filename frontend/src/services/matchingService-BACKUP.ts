/**
 * Matching Service - Handles all matching-related API operations
 * FIXED: Import corrected from apiClient to api - Timestamp: 2025-08-31T01:27:00Z
 */
import api from './api';

export interface MatchRequest {
  id: string;
  match_code: string;
  property: string;
  tenant: string;
  landlord: string;
  status: 'pending' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tenant_message: string;
  tenant_phone: string;
  tenant_email: string;
  monthly_income: number | null;
  employment_type: string;
  preferred_move_in_date: string;
  lease_duration_months: number;
  has_rental_references: boolean;
  has_employment_proof: boolean;
  has_credit_check: boolean;
  number_of_occupants: number;
  has_pets: boolean;
  pet_details: string;
  smoking_allowed: boolean;
  landlord_response: string;
  created_at: string;
  viewed_at: string | null;
  responded_at: string | null;
  expires_at: string;
  follow_up_count: number;
  last_follow_up: string | null;
  compatibility_score?: number;
  is_expired?: boolean;
  can_follow_up?: boolean;
}

export interface CreateMatchRequestData {
  property: string;
  tenant_message: string;
  tenant_phone: string;
  tenant_email: string;
  monthly_income?: number | null;
  employment_type: string;
  preferred_move_in_date?: string;
  lease_duration_months: number;
  has_rental_references: boolean;
  has_employment_proof: boolean;
  has_credit_check: boolean;
  number_of_occupants: number;
  has_pets: boolean;
  pet_details?: string;
  smoking_allowed: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface MatchCriteria {
  id: string;
  preferred_cities: string[];
  max_distance_km: number | null;
  min_price: number | null;
  max_price: number | null;
  property_types: string[];
  min_bedrooms: number;
  min_bathrooms: number;
  min_area: number | null;
  required_amenities: string[];
  pets_required: boolean;
  smoking_required: boolean;
  furnished_required: boolean;
  parking_required: boolean;
  auto_apply_enabled: boolean;
  notification_frequency: 'immediate' | 'daily' | 'weekly';
  created_at: string;
  updated_at: string;
  last_search: string | null;
  matching_properties_count?: number;
}

export interface MatchNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  is_sent: boolean;
  metadata: any;
  created_at: string;
  read_at: string | null;
  sent_at: string | null;
  match_request_code?: string;
  property_title?: string;
  time_since_created?: string;
}

export interface MatchStatistics {
  total_sent?: number;
  total_received?: number;
  pending: number;
  viewed: number;
  accepted: number;
  rejected: number;
  expired: number;
  response_rate: number;
  acceptance_rate: number;
  avg_response_time: number;
  has_criteria?: boolean;
  auto_apply_enabled?: boolean;
  last_search?: string | null;
  active_properties?: number;
  pending_by_property?: Record<string, number>;
}

export interface PropertyMatch {
  property: any;
  match_score: number;
  reasons: string[];
  has_applied: boolean;
}

export interface TenantRecommendation {
  property: any;
  tenant: any;
  compatibility_score: number;
  reasons: string[];
  can_contact: boolean;
}

export interface MatchActionData {
  message?: string;
}

export interface DashboardData {
  user_type: string;
  recent_requests: any[];
  unread_notifications: number;
  statistics: MatchStatistics;
  pending_responses?: number;
  potential_matches?: number;
  pending_requests?: number;
  active_properties?: number;
}

class MatchingService {
  private baseUrl = '/matching';

  // Match Requests
  async getMyMatchRequests() {
    return api.get(`${this.baseUrl}/requests/`);
  }

  async getMatchRequest(id: string) {
    return api.get(`${this.baseUrl}/requests/${id}/`);
  }

  async createMatchRequest(data: CreateMatchRequestData) {
    return api.post(`${this.baseUrl}/requests/`, data);
  }

  async checkExistingMatchRequest(propertyId: string) {
    return api.get(`${this.baseUrl}/check-existing/`, {
      params: { property_id: propertyId }
    });
  }

  async cancelMatchRequest(propertyId: string) {
    return api.delete(`${this.baseUrl}/check-existing/`, {
      params: { property_id: propertyId }
    });
  }

  async markMatchRequestViewed(id: string) {
    return api.post(`${this.baseUrl}/requests/${id}/mark_viewed/`);
  }

  async acceptMatchRequest(id: string, data: MatchActionData = {}) {
    return api.post(`${this.baseUrl}/requests/${id}/accept/`, data);
  }

  async rejectMatchRequest(id: string, data: MatchActionData = {}) {
    return api.post(`${this.baseUrl}/requests/${id}/reject/`, data);
  }

  async getMatchCompatibility(id: string) {
    return api.get(`${this.baseUrl}/requests/${id}/compatibility/`);
  }

  // Match Criteria
  async getMyCriteria() {
    return api.get(`${this.baseUrl}/criteria/`);
  }

  async createCriteria(data: Partial<MatchCriteria>) {
    return api.post(`${this.baseUrl}/criteria/`, data);
  }

  async updateCriteria(id: string, data: Partial<MatchCriteria>) {
    return api.patch(`${this.baseUrl}/criteria/${id}/`, data);
  }

  async deleteCriteria(id: string) {
    return api.delete(`${this.baseUrl}/criteria/${id}/`);
  }

  async findMatches(criteriaId: string) {
    return api.get(`${this.baseUrl}/criteria/${criteriaId}/find_matches/`);
  }

  // Potential Matches
  async getPotentialMatches(limit = 10) {
    return api.get(`${this.baseUrl}/potential-matches/`, {
      params: { limit }
    });
  }

  async getLandlordRecommendations(limit = 10) {
    return api.get(`${this.baseUrl}/landlord-recommendations/`, {
      params: { limit }
    });
  }

  // Match Notifications
  async getMyNotifications() {
    return api.get(`${this.baseUrl}/notifications/`);
  }

  async markNotificationRead(id: string) {
    return api.post(`${this.baseUrl}/notifications/${id}/mark_read/`);
  }

  async markAllNotificationsRead() {
    return api.post(`${this.baseUrl}/notifications/mark_all_read/`);
  }

  // Statistics
  async getMatchStatistics() {
    return api.get(`${this.baseUrl}/statistics/`);
  }

  // Auto Apply
  async autoApplyMatches() {
    return api.post(`${this.baseUrl}/auto-apply/`);
  }

  // Dashboard
  async getDashboardData() {
    return api.get(`${this.baseUrl}/dashboard/`);
  }

  // Contract Integration Methods
  async validateMatchForContract(matchId: string) {
    return api.post(`${this.baseUrl}/requests/${matchId}/validate-contract/`);
  }

  async createContractFromMatch(matchId: string, contractData: any) {
    return api.post(`${this.baseUrl}/requests/${matchId}/create-contract/`, contractData);
  }

  async verifyIdentityForContract(contractId: string, documents: any) {
    return api.post(`${this.baseUrl}/contracts/${contractId}/verify-identity/`, documents);
  }

  async generateLegalClauses(contractId: string) {
    return api.post(`${this.baseUrl}/contracts/${contractId}/generate-clauses/`);
  }

  async signMatchContract(contractId: string, signatureData: any) {
    return api.post(`${this.baseUrl}/contracts/${contractId}/sign/`, signatureData);
  }

  async downloadMatchContractPDF(contractId: string) {
    return api.get(`${this.baseUrl}/contracts/${contractId}/download-pdf/`, {
      responseType: 'blob'
    });
  }

  async getContractMilestones(contractId: string) {
    return api.get(`${this.baseUrl}/contracts/${contractId}/milestones/`);
  }

  // Contract Status Utilities
  getContractStatusColor(status: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
    switch (status) {
      case 'DRAFT':
        return 'default';
      case 'PENDING_VER':
        return 'warning';
      case 'PENDING_SIG':
        return 'info';
      case 'PARTIAL_SIG':
        return 'primary';
      case 'SIGNED':
        return 'success';
      case 'NOTARIZED':
        return 'success';
      case 'ACTIVE':
        return 'success';
      case 'TERMINATED':
        return 'error';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  }

  getContractStatusText(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'Borrador';
      case 'PENDING_VER':
        return 'Pendiente Verificación';
      case 'PENDING_SIG':
        return 'Pendiente de Firmas';
      case 'PARTIAL_SIG':
        return 'Parcialmente Firmado';
      case 'SIGNED':
        return 'Firmado';
      case 'NOTARIZED':
        return 'Autenticado';
      case 'ACTIVE':
        return 'Vigente';
      case 'TERMINATED':
        return 'Terminado';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  }

  // Utility functions
  getMatchStatusColor(status: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'viewed':
        return 'info';
      case 'accepted':
        return 'success';
      case 'rejected':
        return 'error';
      case 'expired':
        return 'default';
      default:
        return 'default';
    }
  }

  getMatchStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'viewed':
        return 'Vista';
      case 'accepted':
        return 'Aceptada';
      case 'rejected':
        return 'Rechazada';
      case 'expired':
        return 'Expirada';
      default:
        return status;
    }
  }

  getPriorityColor(priority: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'primary';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  }

  getPriorityText(priority: string): string {
    switch (priority) {
      case 'urgent':
        return 'Urgente';
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Baja';
      default:
        return priority;
    }
  }

  formatCurrency(amount: number | null): string {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CO');
  }

  formatDateTime(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('es-CO');
  }

  calculateDaysUntilExpiry(expiresAt: string | null): number | null {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isMatchExpiringSoon(expiresAt: string | null, daysThreshold = 3): boolean {
    const daysLeft = this.calculateDaysUntilExpiry(expiresAt);
    return daysLeft !== null && daysLeft <= daysThreshold && daysLeft > 0;
  }

  getEmploymentTypeText(type: string): string {
    switch (type) {
      case 'employed':
        return 'Empleado';
      case 'self_employed':
        return 'Independiente';
      case 'student':
        return 'Estudiante';
      case 'retired':
        return 'Jubilado';
      case 'other':
        return 'Otro';
      default:
        return type;
    }
  }
}

export const matchingService = new MatchingService();
export default matchingService;