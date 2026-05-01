/**
 * E5 · Cliente API para `VerificationVisit` (cola del agente).
 */

import { api } from './api';

export type VerificationVisitStatus =
  | 'pending'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'no_show';

export interface VerificationVisit {
  id: string;
  visit_number: string;
  visit_type: string;
  visit_type_display: string;
  agent: string | null;
  agent_name: string;
  agent_code: string;
  target_user: string;
  target_user_name: string;
  target_user_email: string;
  property_ref: string | null;
  status: VerificationVisitStatus;
  status_display: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  visit_address: string;
  visit_city: string;
  started_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  agent_notes: string;
  cancellation_reason: string;
  verification_passed: boolean | null;
  has_report: boolean;
  created_at: string;
  updated_at: string;
}

const BASE = '/verification/visits';

export const agentVisitsApi = {
  async list(params?: {
    status?: VerificationVisitStatus;
  }): Promise<VerificationVisit[]> {
    const { data } = await api.get(`${BASE}/`, { params });
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  async start(id: string): Promise<VerificationVisit> {
    const { data } = await api.post(`${BASE}/${id}/start/`);
    return data;
  },

  async complete(
    id: string,
    body: { passed: boolean; notes?: string },
  ): Promise<VerificationVisit> {
    const { data } = await api.post(`${BASE}/${id}/complete/`, body);
    return data;
  },

  async cancel(id: string, reason: string): Promise<VerificationVisit> {
    const { data } = await api.post(`${BASE}/${id}/cancel/`, { reason });
    return data;
  },
};
