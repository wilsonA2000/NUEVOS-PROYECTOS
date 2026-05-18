/**
 * C10b · Cliente API para upload de recibos públicos (VeriHome ID).
 * Endpoint en verification.api_views.PublicReceiptViewSet.
 */

import { api } from './api';

export type PublicReceiptType = 'electricity' | 'water' | 'gas';

export type PublicReceiptStatus = 'accepted' | 'rejected';

export type PublicReceiptRejectionReason =
  | 'issue_date_in_future'
  | 'receipt_too_old'
  | 'address_mismatch';

export interface PublicReceiptUploadInput {
  image: File;
  receipt_type: PublicReceiptType;
  declared_address: string;
  issue_date: string;
  declared_amount?: string;
  ocr_text?: string;
}

export interface PublicReceiptUploadResponse {
  id: string;
  status: PublicReceiptStatus;
  rejection_reason: PublicReceiptRejectionReason | null;
  address_match_score: string;
  public_receipt_score: number;
  act_id: string | null;
  visit_score_total: string | null;
  final_verdict: 'aprobado' | 'observado' | 'rechazado' | null;
}

const BASE = '/verification/receipts';

export const publicReceiptApi = {
  async upload(
    input: PublicReceiptUploadInput,
  ): Promise<PublicReceiptUploadResponse> {
    const form = new FormData();
    form.append('image', input.image);
    form.append('receipt_type', input.receipt_type);
    form.append('declared_address', input.declared_address);
    form.append('issue_date', input.issue_date);
    if (input.declared_amount) {
      form.append('declared_amount', input.declared_amount);
    }
    if (input.ocr_text) {
      form.append('ocr_text', input.ocr_text);
    }
    const { data } = await api.post(`${BASE}/upload/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
