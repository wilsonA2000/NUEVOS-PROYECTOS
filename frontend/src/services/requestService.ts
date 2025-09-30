/**
 * Request Service - Maneja todas las operaciones relacionadas con solicitudes
 */
import api from './api';

export interface BaseRequest {
  id: string;
  request_type: string;
  request_type_display: string;
  title: string;
  description: string;
  requester: {
    id: string;
    email: string;
    full_name: string;
    user_type: string;
  };
  assignee: {
    id: string;
    email: string;
    full_name: string;
    user_type: string;
  };
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled' | 'on_hold';
  status_display: string;
  status_color: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  priority_display: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  completed_at?: string;
  response_message: string;
  response_date?: string;
  is_overdue: boolean;
  metadata: any;
  attachments: RequestAttachment[];
  comments: RequestComment[];
}

export interface PropertyInterestRequest extends BaseRequest {
  property: string;
  property_title: string;
  property_address: string;
  property_rent_price: number;
  monthly_income?: number;
  employment_type: string;
  preferred_move_in_date?: string;
  lease_duration_months: number;
  number_of_occupants: number;
  has_pets: boolean;
  pet_details: string;
  smoking_allowed: boolean;
  has_rental_references: boolean;
  has_employment_proof: boolean;
  has_credit_check: boolean;
}

export interface ServiceRequest extends BaseRequest {
  property: string;
  property_title: string;
  property_address: string;
  service_category: string;
  service_category_display: string;
  estimated_cost?: number;
  actual_cost?: number;
  preferred_date?: string;
  preferred_time?: string;
  flexible_schedule: boolean;
  location_details: string;
  urgency_level: string;
}

export interface ContractSignatureRequest extends BaseRequest {
  contract: string;
  contract_title: string;
  contract_type: string;
  rental_amount: number;
  security_deposit: number;
  lease_start_date: string;
  lease_end_date: string;
  landlord_signed: boolean;
  tenant_signed: boolean;
  landlord_signature_date?: string;
  tenant_signature_date?: string;
  documents_uploaded: boolean;
  verification_completed: boolean;
}

export interface MaintenanceRequest extends BaseRequest {
  property: string;
  property_title: string;
  property_address: string;
  maintenance_type: string;
  maintenance_type_display: string;
  affected_area: string;
  issue_description: string;
  photos_uploaded: boolean;
  access_instructions: string;
  requires_tenant_presence: boolean;
  estimated_duration_hours?: number;
}

export interface RequestAttachment {
  id: string;
  file: string;
  filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: {
    id: string;
    full_name: string;
  };
}

export interface RequestComment {
  id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  author: {
    id: string;
    full_name: string;
    user_type: string;
  };
}

export interface RequestStats {
  total_requests: number;
  pending_requests: number;
  in_progress_requests: number;
  completed_requests: number;
  overdue_requests: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  recent_activity: BaseRequest[];
}

export interface CreatePropertyInterestData {
  property: string;
  title?: string;
  description: string;
  priority?: string;
  monthly_income?: number;
  employment_type: string;
  preferred_move_in_date?: string;
  lease_duration_months: number;
  number_of_occupants: number;
  has_pets: boolean;
  pet_details?: string;
  smoking_allowed: boolean;
  has_rental_references: boolean;
  has_employment_proof: boolean;
  has_credit_check: boolean;
}

export interface CreateServiceRequestData {
  property: string;
  assignee: string;
  title: string;
  description: string;
  service_category: string;
  estimated_cost?: number;
  preferred_date?: string;
  preferred_time?: string;
  flexible_schedule: boolean;
  location_details?: string;
  urgency_level: string;
  priority?: string;
}

export interface CreateMaintenanceRequestData {
  property: string;
  assignee: string;
  title: string;
  description: string;
  maintenance_type: string;
  affected_area: string;
  issue_description: string;
  access_instructions?: string;
  requires_tenant_presence: boolean;
  estimated_duration_hours?: number;
  priority?: string;
}

export interface RequestActionData {
  action: 'accept' | 'reject' | 'complete' | 'cancel' | 'assign' | 'update_status';
  message?: string;
  assignee_id?: string;
  new_status?: string;
  metadata?: any;
}

class RequestService {
  private baseUrl = '/requests/api';

  // Base Requests
  async getMyRequests() {
    return api.get(`${this.baseUrl}/base/`);
  }

  async getRequest(id: string) {
    return api.get(`${this.baseUrl}/base/${id}/`);
  }

  async getDashboardStats() {
    return api.get(`${this.baseUrl}/base/dashboard_stats/`);
  }

  async getMySentRequests() {
    return api.get(`${this.baseUrl}/base/my_sent_requests/`);
  }

  async getMyReceivedRequests() {
    return api.get(`${this.baseUrl}/base/my_received_requests/`);
  }

  async getMyRejectedRequests() {
    return api.get(`${this.baseUrl}/base/?status=rejected`);
  }

  async performRequestAction(id: string, data: RequestActionData) {
    return api.post(`${this.baseUrl}/base/${id}/perform_action/`, data);
  }

  async getUserProfile(userId: string) {
    return api.get(`/users/${userId}/profile/`);
  }

  async getUserResume(userId: string) {
    return api.get(`/users/${userId}/resume/`);
  }

  // Nueva función para evaluación unificada de candidatos
  async getCandidateEvaluation(userId: string, propertyId?: string) {
    const url = propertyId 
      ? `/users/${userId}/evaluation/?property_id=${propertyId}`
      : `/users/${userId}/evaluation/`;
    
    return api.get(url);
  }

  // Property Interest Requests
  async getPropertyInterestRequests() {
    return api.get(`${this.baseUrl}/property-interest/`);
  }

  async createPropertyInterestRequest(data: CreatePropertyInterestData) {
    return api.post(`${this.baseUrl}/property-interest/`, data);
  }

  async getPropertyInterestRequest(id: string) {
    return api.get(`${this.baseUrl}/property-interest/${id}/`);
  }

  // Service Requests
  async getServiceRequests() {
    return api.get(`${this.baseUrl}/services/`);
  }

  async createServiceRequest(data: CreateServiceRequestData) {
    return api.post(`${this.baseUrl}/services/`, data);
  }

  async getServiceRequest(id: string) {
    return api.get(`${this.baseUrl}/services/${id}/`);
  }

  // Contract Signature Requests
  async getContractRequests() {
    return api.get(`${this.baseUrl}/contracts/`);
  }

  async getContractRequest(id: string) {
    return api.get(`${this.baseUrl}/contracts/${id}/`);
  }

  async signContract(id: string) {
    return api.post(`${this.baseUrl}/contracts/${id}/sign_contract/`);
  }

  // Maintenance Requests
  async getMaintenanceRequests() {
    return api.get(`${this.baseUrl}/maintenance/`);
  }

  async createMaintenanceRequest(data: CreateMaintenanceRequestData) {
    return api.post(`${this.baseUrl}/maintenance/`, data);
  }

  async getMaintenanceRequest(id: string) {
    return api.get(`${this.baseUrl}/maintenance/${id}/`);
  }

  // Comments
  async getRequestComments(requestId: string) {
    return api.get(`${this.baseUrl}/base/${requestId}/comments/`);
  }

  async addRequestComment(requestId: string, content: string, isInternal = false) {
    return api.post(`${this.baseUrl}/base/${requestId}/comments/`, {
      content,
      is_internal: isInternal
    });
  }

  // Notifications
  async getRequestNotifications() {
    return api.get(`${this.baseUrl}/notifications/`);
  }

  async markNotificationAsRead(id: string) {
    return api.post(`${this.baseUrl}/notifications/${id}/mark_as_read/`);
  }

  async markAllNotificationsAsRead() {
    return api.post(`${this.baseUrl}/notifications/mark_all_as_read/`);
  }

  // Utility functions
  getStatusColor(status: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'info';
      case 'completed':
        return 'success';
      case 'rejected':
        return 'error';
      case 'cancelled':
        return 'default';
      case 'on_hold':
        return 'secondary';
      default:
        return 'default';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'in_progress':
        return 'En Progreso';
      case 'completed':
        return 'Completado';
      case 'rejected':
        return 'Rechazado';
      case 'cancelled':
        return 'Cancelado';
      case 'on_hold':
        return 'En Espera';
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

  getRequestTypeText(type: string): string {
    switch (type) {
      case 'property_interest':
        return 'Interés en Propiedad';
      case 'service_request':
        return 'Solicitud de Servicio';
      case 'contract_signature':
        return 'Firma de Contrato';
      case 'maintenance_request':
        return 'Solicitud de Mantenimiento';
      case 'tenant_verification':
        return 'Verificación de Arrendatario';
      case 'landlord_inquiry':
        return 'Consulta a Arrendador';
      case 'property_viewing':
        return 'Visita a Propiedad';
      case 'rent_negotiation':
        return 'Negociación de Renta';
      case 'lease_renewal':
        return 'Renovación de Contrato';
      case 'damage_report':
        return 'Reporte de Daños';
      default:
        return type;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-CO');
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('es-CO');
  }

  isOverdue(dueDateString: string, status: string): boolean {
    if (!dueDateString || ['completed', 'rejected', 'cancelled'].includes(status)) {
      return false;
    }
    return new Date(dueDateString) < new Date();
  }
}

export const requestService = new RequestService();
export default requestService;