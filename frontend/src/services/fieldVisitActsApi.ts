/**
 * C11 · Cliente API para `FieldVisitAct` (acta VeriHome ID).
 * Endpoints expuestos por `verification.api_views.FieldVisitActViewSet`.
 */

import { api } from './api';

export type FieldVisitActStatus =
  | 'draft'
  | 'signed_by_parties'
  | 'signed_by_lawyer'
  | 'sealed';

export interface FieldVisitAct {
  id: string;
  act_number: string;
  field_request: string;
  visit: string;
  visit_number: string;
  target_user_email: string;
  target_user_name: string;
  payload: Record<string, unknown>;
  pdf_file: string | null;
  pdf_url: string | null;
  pdf_sha256: string;
  verified_signature: Record<string, unknown> | null;
  verified_signed_at: string | null;
  agent_signature: Record<string, unknown> | null;
  agent_signed_at: string | null;
  lawyer_user: string | null;
  lawyer_email: string | null;
  lawyer_signed_at: string | null;
  lawyer_tp_number: string;
  lawyer_full_name: string;
  lawyer_cc: string;
  lawyer_certificate_fingerprint: string;
  prev_act: string | null;
  prev_hash: string;
  payload_hash: string;
  final_hash: string;
  block_number: number | null;
  status: FieldVisitActStatus;
  status_display: string;
  geolocation_lat: string | null;
  geolocation_lng: string | null;
  ip_address: string | null;
  visit_score_breakdown: Record<string, number>;
  visit_score_total: string;
  digital_score_total: string;
  digital_verdict: 'aprobado' | 'observado' | 'rechazado' | null;
  total_score: string;
  final_verdict: 'aprobado' | 'observado' | 'rechazado';
  final_verdict_display: string;
  created_at: string;
  updated_at: string;
}

export interface ChainVerification {
  ok: boolean;
  total: number;
  errors: Array<{
    act_id: string;
    act_number: string;
    code: string;
    expected?: unknown;
    actual?: unknown;
  }>;
}

export type FinalVerdict = 'aprobado' | 'observado' | 'rechazado';

export interface ScoringRow {
  act_id: string;
  act_number: string;
  user_id: string;
  user_email: string;
  user_name: string;
  digital_score_total: string;
  digital_verdict: 'aprobado' | 'observado' | 'rechazado' | null;
  visit_score_total: string;
  visit_score_breakdown: Record<string, number>;
  total_score: string;
  final_verdict: FinalVerdict;
  status: FieldVisitActStatus;
  block_number: number | null;
  sealed: boolean;
  created_at: string;
}

export interface ScoringResponse {
  summary: {
    total: number;
    aprobados: number;
    observados: number;
    rechazados: number;
  };
  results: ScoringRow[];
}

export interface ScoringFilters {
  verdict?: FinalVerdict;
  status?: FieldVisitActStatus;
  min_score?: number;
  max_score?: number;
}

const BASE = '/verification/acts';

export const fieldVisitActsApi = {
  async list(params?: { status?: FieldVisitActStatus }): Promise<FieldVisitAct[]> {
    const { data } = await api.get(`${BASE}/`, { params });
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  async retrieve(id: string): Promise<FieldVisitAct> {
    const { data } = await api.get(`${BASE}/${id}/`);
    return data;
  },

  async createDraft(payload: {
    field_request: string;
    visit: string;
    payload: Record<string, unknown>;
  }): Promise<FieldVisitAct> {
    const { data } = await api.post(`${BASE}/`, payload);
    return data;
  },

  async updatePayload(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<FieldVisitAct> {
    const { data } = await api.patch(`${BASE}/${id}/`, { payload });
    return data;
  },

  async partiesSign(
    id: string,
    body: {
      verified_signature: Record<string, unknown>;
      agent_signature: Record<string, unknown>;
      geolocation_lat?: number | null;
      geolocation_lng?: number | null;
    },
  ): Promise<FieldVisitAct> {
    const { data } = await api.post(`${BASE}/${id}/parties-sign/`, body);
    return data;
  },

  async generatePdf(
    id: string,
  ): Promise<{ pdf_url: string | null; pdf_sha256: string }> {
    const { data } = await api.post(`${BASE}/${id}/generate-pdf/`);
    return data;
  },

  async lawyerSign(id: string): Promise<FieldVisitAct> {
    const { data } = await api.post(`${BASE}/${id}/lawyer-sign/`);
    return data;
  },

  async verifyChain(): Promise<ChainVerification> {
    const { data } = await api.get(`${BASE}/verify-chain/`);
    return data;
  },

  async updateVisitScore(
    id: string,
    body: {
      visit_score_breakdown: Record<string, number>;
      visit_score_total: number;
    },
  ): Promise<FieldVisitAct> {
    const { data } = await api.post(`${BASE}/${id}/visit-score/`, body);
    return data;
  },

  async scoring(filters?: ScoringFilters): Promise<ScoringResponse> {
    const params: Record<string, string | number> = {};
    if (filters?.verdict) params.verdict = filters.verdict;
    if (filters?.status) params.status = filters.status;
    if (filters?.min_score !== undefined) params.min_score = filters.min_score;
    if (filters?.max_score !== undefined) params.max_score = filters.max_score;
    const { data } = await api.get(`${BASE}/scoring/`, { params });
    return data;
  },

  pdfDownloadUrl(id: string): string {
    const base =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
      'http://localhost:8000/api/v1';
    return `${base}/verification/acts/${id}/pdf/`;
  },
};
