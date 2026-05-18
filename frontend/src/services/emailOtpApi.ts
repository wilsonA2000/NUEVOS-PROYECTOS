/**
 * C10 · Cliente API para OTP por email (VeriHome ID).
 * Endpoints en verification.api_views.EmailOtpViewSet.
 */

import { api } from './api';

export interface EmailOtpRequestResponse {
  message: string;
  expires_at: string;
  validity_minutes: number;
}

export interface EmailOtpVerifyResponse {
  message: string;
  email_otp_score: number;
  act_id: string | null;
  visit_score_total: string | null;
  final_verdict: 'aprobado' | 'observado' | 'rechazado' | null;
}

const BASE = '/verification/email-otp';

export const emailOtpApi = {
  async request(): Promise<EmailOtpRequestResponse> {
    const { data } = await api.post(`${BASE}/request/`);
    return data;
  },

  async verify(code: string): Promise<EmailOtpVerifyResponse> {
    const { data } = await api.post(`${BASE}/verify/`, { code });
    return data;
  },
};
