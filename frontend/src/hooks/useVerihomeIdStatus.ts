/**
 * VHID-ENF · Hook para consultar estado VeriHome ID del usuario actual.
 * Consume `/api/v1/verification/onboarding/status/`.
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '../services/api';

export type VerihomeIdNextStep =
  | 'start_onboarding'
  | 'wait_visit'
  | 'complete';

export interface VerihomeIdStatus {
  is_verified: boolean;
  has_onboarding: boolean;
  onboarding_status:
    | 'digital_completed'
    | 'visit_scheduled'
    | 'visit_completed'
    | 'rejected'
    | null;
  digital_verdict: 'aprobado' | 'observado' | 'rechazado' | null;
  digital_score_total: string | null;
  act_status:
    | 'draft'
    | 'signed_by_parties'
    | 'signed_by_lawyer'
    | 'sealed'
    | null;
  block_number: number | null;
  next_step: VerihomeIdNextStep;
  blocking_actions: Array<'create_property' | 'apply_match' | 'start_biometric'>;
}

export const VERIHOME_ID_STATUS_KEY = ['verihome-id-status'] as const;

export function useVerihomeIdStatus() {
  return useQuery<VerihomeIdStatus>({
    queryKey: VERIHOME_ID_STATUS_KEY,
    queryFn: async () => {
      const { data } = await api.get('/verification/onboarding/status/');
      return data;
    },
    staleTime: 60_000,
    retry: false,
  });
}
