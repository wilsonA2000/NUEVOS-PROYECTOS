/**
 * Servicio VeriHome ID — onboarding digital.
 *
 * Encapsula la comunicación con `/api/v1/verification/onboarding/`.
 * Convierte el `VeriHomeIDDigitalResult` del flujo a la forma que el
 * backend espera (base64 plano para imágenes, JSON estructurados para
 * OCR/liveness/match/score).
 */

import type { VeriHomeIDDigitalResult } from '../components/biometric/VeriHomeIDFlow';
import { api } from './api';

export type OnboardingVerdict = 'aprobado' | 'observado' | 'rechazado';

export type OnboardingStatus =
  | 'digital_completed'
  | 'visit_scheduled'
  | 'visit_completed'
  | 'rejected';

export interface OnboardingResponse {
  id: string;
  user: string;
  user_email: string;
  user_full_name: string;
  document_type_declared: string;
  document_number_declared: string;
  full_name_declared: string;
  cedula_anverso_url: string | null;
  cedula_reverso_url: string | null;
  selfie_url: string | null;
  ocr_data: unknown;
  liveness_data: unknown;
  face_match_data: unknown;
  digital_score: unknown;
  digital_score_total: string;
  digital_verdict: OnboardingVerdict;
  scheduled_visit: string | null;
  status: OnboardingStatus;
  created_at: string;
  updated_at: string;
}

function buildPayload(result: VeriHomeIDDigitalResult) {
  return {
    document_type_declared: result.documentTypeDeclared,
    document_number_declared: result.documentNumberDeclared,
    full_name_declared: result.fullNameDeclared,
    cedula_anverso: result.cedulaAnverso,
    cedula_reverso: result.cedulaReverso,
    selfie: result.liveness?.selfie ?? null,
    ocr_data: result.ocr,
    liveness_data: result.liveness
      ? {
          steps: result.liveness.steps,
          qualityScore: result.liveness.qualityScore,
          totalDurationMs: result.liveness.totalDurationMs,
          capturedAt: result.liveness.capturedAt,
        }
      : null,
    face_match_data: result.faceMatch,
    digital_score: result.score,
    digital_score_total: result.score.total.toFixed(3),
  };
}

export async function submitOnboarding(
  result: VeriHomeIDDigitalResult,
): Promise<OnboardingResponse> {
  const { data } = await api.post<OnboardingResponse>(
    '/verification/onboarding/',
    buildPayload(result),
  );
  return data;
}

export async function getMyOnboarding(): Promise<OnboardingResponse | null> {
  try {
    const { data } = await api.get<OnboardingResponse>(
      '/verification/onboarding/me/',
    );
    return data;
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      (error as { response?: { status?: number } }).response?.status === 404
    ) {
      return null;
    }
    throw error;
  }
}
