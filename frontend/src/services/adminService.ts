/**
 * 🔐 ADMIN SERVICE (Plan Maestro V2.0)
 *
 * Servicio para operaciones administrativas del Dashboard de Administración Legal.
 * Solo accesible por usuarios con is_staff=True o is_superuser=True.
 *
 * Endpoints consumidos:
 * - /api/v1/contracts/admin/pending/
 * - /api/v1/contracts/admin/stats/
 * - /api/v1/contracts/admin/contracts/{id}/approve/
 * - /api/v1/contracts/admin/contracts/{id}/reject/
 * - /api/v1/core/stats/overview/
 * - /api/v1/core/audit/report/
 * - /api/v1/core/security/analysis/
 */

import { api } from './api';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AdminContractSummary {
  id: string;
  contract_number?: string;
  property_title?: string;
  property_address: string;
  landlord_name: string;
  landlord_email: string;
  tenant_name?: string;
  tenant_email?: string;
  current_state?: string;
  created_at: string;
  updated_at?: string;
  days_pending: number;
  review_cycle_count?: number;
  is_urgent?: boolean; // > 7 days pending (computed client-side if not provided)
  is_locked?: boolean;
  monthly_rent: number;
}

export interface AdminContractDetail extends AdminContractSummary {
  // Datos del contrato
  start_date: string;
  end_date: string;
  deposit_amount: number;
  payment_day: number;

  // Codeudor
  has_codeudor: boolean;
  codeudor_name?: string;
  codeudor_email?: string;

  // Cláusulas
  clauses: {
    key: string;
    title: string;
    content: string;
    is_custom: boolean;
  }[];

  // 1.9.2: Historial de workflow desde ContractWorkflowHistory
  history_entries: {
    id: string;
    action_type: string;
    action_description: string;
    performed_by_name?: string;
    user_role: 'landlord' | 'tenant' | 'system' | 'admin';
    old_state?: string;
    new_state?: string;
    timestamp: string;
    changes_made?: Record<string, unknown>;
  }[];

  // Notas de devolución (si aplica)
  tenant_return_notes?: string;
  admin_rejection_notes?: string;
}

export interface AdminContractStats {
  total_contracts: number;
  pending_review: number;
  approved_today: number;
  rejected_today: number;
  avg_review_time_hours: number;
  urgent_contracts: number; // > 7 days pending
  by_state: Record<string, number>;
}

export interface AdminApprovalPayload {
  notes?: string;
  skip_notification?: boolean;
}

export interface AdminRejectionPayload {
  notes: string; // Required for rejection
  requires_resubmission: boolean;
}

export interface AuditReportRequest {
  date_from: string;
  date_to: string;
  include_sections: string[]; // contracts, users, security, payments
  format: 'json' | 'pdf' | 'csv';
}

export interface AuditReportResponse {
  report_id: string;
  generated_at: string;
  date_range: {
    from: string;
    to: string;
  };
  sections: Record<string, unknown>;
  download_url?: string;
}

export interface SecurityAnalysis {
  risk_score: number; // 0-100
  suspicious_ips: {
    ip: string;
    failed_attempts: number;
    last_attempt: string;
  }[];
  recent_failed_logins: {
    email: string;
    ip: string;
    timestamp: string;
    reason: string;
  }[];
  active_alerts: {
    id: string;
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    created_at: string;
  }[];
}

export interface SystemOverview {
  users: {
    total: number;
    active_today: number;
    new_this_month: number;
    by_type: Record<string, number>;
  };
  contracts: {
    total: number;
    active: number;
    pending_review: number;
    completed_this_month: number;
  };
  properties: {
    total: number;
    available: number;
    rented: number;
  };
  payments: {
    total_volume: number;
    pending: number;
    completed_this_month: number;
  };
  system_health: {
    api_latency_ms: number;
    database_status: 'healthy' | 'degraded' | 'down';
    cache_status: 'healthy' | 'degraded' | 'down';
    websocket_status: 'healthy' | 'degraded' | 'down';
  };
}

// ============================================================================
// ADMIN CONTRACT ENDPOINTS
// ============================================================================

/**
 * Obtener lista de contratos pendientes de revisión admin
 */
export const getPendingContracts = async (): Promise<AdminContractSummary[]> => {
  const response = await api.get('/contracts/admin/pending/');
  // Backend devuelve { count: number, contracts: array }
  // Extraemos solo el array de contratos
  return response.data?.contracts || [];
};

/**
 * Obtener estadísticas de contratos para admin
 */
export const getContractStats = async (): Promise<AdminContractStats> => {
  const response = await api.get('/contracts/admin/stats/');
  return response.data;
};

/**
 * Obtener detalle de un contrato para revisión
 */
export const getContractForReview = async (contractId: string): Promise<AdminContractDetail> => {
  const response = await api.get(`/contracts/admin/contracts/${contractId}/`);
  return response.data;
};

/**
 * Aprobar un contrato (PENDING_ADMIN_REVIEW → DRAFT)
 */
export const approveContract = async (
  contractId: string,
  payload: AdminApprovalPayload = {},
): Promise<{ success: boolean; message: string; new_state: string }> => {
  const response = await api.post(`/contracts/admin/contracts/${contractId}/approve/`, payload);
  return response.data;
};

/**
 * Rechazar un contrato (vuelve al arrendador para correcciones)
 */
export const rejectContract = async (
  contractId: string,
  payload: AdminRejectionPayload,
): Promise<{ success: boolean; message: string; new_state: string }> => {
  const response = await api.post(`/contracts/admin/contracts/${contractId}/reject/`, payload);
  return response.data;
};

/**
 * Re-aprobar un contrato después de correcciones (RE_PENDING_ADMIN → DRAFT)
 */
export const reApproveContract = async (
  contractId: string,
  payload: AdminApprovalPayload = {},
): Promise<{ success: boolean; message: string; new_state: string; cycle: number }> => {
  const response = await api.post(`/contracts/admin/contracts/${contractId}/re-approve/`, payload);
  return response.data;
};

// ============================================================================
// AUDIT & SECURITY ENDPOINTS
// ============================================================================

/**
 * Obtener overview general del sistema
 */
export const getSystemOverview = async (): Promise<SystemOverview> => {
  const response = await api.get('/core/stats/overview/');
  return response.data;
};

/**
 * Generar reporte de auditoría
 */
export const generateAuditReport = async (
  request: AuditReportRequest,
): Promise<AuditReportResponse> => {
  const response = await api.post('/core/audit/report/', request);
  return response.data;
};

/**
 * Obtener análisis de seguridad
 */
export const getSecurityAnalysis = async (): Promise<SecurityAnalysis> => {
  const response = await api.get('/core/security/analysis/');
  return response.data;
};

/**
 * Exportar logs del sistema
 */
export const exportLogs = async (params: {
  date_from: string;
  date_to: string;
  format: 'json' | 'csv';
  filter_type?: string;
}): Promise<{ download_url: string; records_count: number }> => {
  const response = await api.post('/core/logs/export/', params);
  return response.data;
};

// ============================================================================
// ADM-001 — Audit log global (ADM-001, Fase 1.9.7)
// ============================================================================

export interface AuditLogEntry {
  id: string;
  user: string;
  user_name: string;
  activity_type: string;
  activity_type_display: string;
  description: string;
  model_name?: string;
  object_id?: string;
  object_repr?: string;
  metadata: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  session_key?: string;
  timestamp: string;
  formatted_timestamp?: string;
  time_since?: string;
}

export interface AuditLogPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditLogEntry[];
}

export interface AuditLogFilters {
  user?: string;
  activity_type?: string;
  model_name?: string;
  days?: number;
  date_from?: string;  // ISO 8601
  date_to?: string;    // ISO 8601
  page?: number;
  page_size?: number;
}

/**
 * Lista paginada del audit trail global (solo staff).
 * Backend: `/api/v1/core/audit-logs/` (GlobalAuditLogAPIView).
 */
export const getAuditLogs = async (
  filters: AuditLogFilters = {},
): Promise<AuditLogPage> => {
  const params: Record<string, string | number> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== null) {
      params[key] = value as string | number;
    }
  });
  const response = await api.get('/core/audit-logs/', { params });
  return response.data;
};

/**
 * Limpiar logs antiguos (con dry-run opcional)
 */
export const cleanupLogs = async (params: {
  retention_days: number;
  dry_run?: boolean;
}): Promise<{ records_deleted: number; space_freed_mb: number; dry_run: boolean }> => {
  const response = await api.post('/core/logs/cleanup/', params);
  return response.data;
};

// ============================================================================
// DOCUMENT ACCESS AUDIT
// ============================================================================

/**
 * Obtener historial de accesos a documentos (admin only)
 */
export const getDocumentAccessHistory = async (
  documentId: string,
): Promise<{
  document_id: string;
  document_type: string;
  is_locked: boolean;
  total_accesses: number;
  access_history: {
    id: string;
    user_email: string;
    user_name: string;
    action: string;
    action_display: string;
    ip_address: string;
    timestamp: string;
  }[];
}> => {
  const response = await api.get(`/documents/${documentId}/access-history/`);
  return response.data;
};

// ============================================================================
// CIRCULAR WORKFLOW ADMIN ACTIONS
// ============================================================================

/**
 * Obtener contratos en ciclo de corrección (RE_PENDING_ADMIN)
 */
export const getContractsInCorrectionCycle = async (): Promise<AdminContractSummary[]> => {
  const response = await api.get('/contracts/admin/correction-cycle/');
  return response.data;
};

/**
 * Ver historial completo del workflow circular
 */
export const getCircularWorkflowHistory = async (
  contractId: string,
): Promise<{
  contract_id: string;
  review_cycle_count: number;
  total_days_in_review: number;
  history: {
    cycle: number;
    events: {
      action: string;
      user_email: string;
      timestamp: string;
      notes?: string;
    }[];
  }[];
}> => {
  const response = await api.get(`/contracts/admin/contracts/${contractId}/workflow-history/`);
  return response.data;
};

// ============================================================================
// ADMIN SERVICE OBJECT
// ============================================================================

export const AdminService = {
  // Contracts
  getPendingContracts,
  getContractStats,
  getContractForReview,
  approveContract,
  rejectContract,
  reApproveContract,
  getContractsInCorrectionCycle,
  getCircularWorkflowHistory,

  // Audit & Security
  getSystemOverview,
  generateAuditReport,
  getSecurityAnalysis,
  exportLogs,
  cleanupLogs,
  getAuditLogs,

  // Document Access
  getDocumentAccessHistory,
};

export default AdminService;
