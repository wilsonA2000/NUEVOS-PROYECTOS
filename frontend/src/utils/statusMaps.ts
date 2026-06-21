/**
 * Centralizado: mapping de estados de contrato/match a tokens semánticos.
 *
 * Reemplaza condicionales `status === 'X' ? 'success' : ...` esparcidos por
 * la UI. Usar con StatusChip:
 *   <StatusChip kind={contractStateKind(contract.status)} label={...} />
 */
import type { StageKind } from '../theme/tokens';

export const CONTRACT_STATE_KIND: Record<string, StageKind> = {
  draft: 'neutral',
  tenant_review: 'inProgress',
  tenant_approved: 'success',
  objections_pending: 'pending',
  tenant_biometric: 'inProgress',
  guarantor_biometric: 'inProgress',
  landlord_biometric: 'inProgress',
  biometric_completed: 'success',
  ready_to_publish: 'pending',
  published: 'inProgress',
  active: 'success',
  fully_signed: 'success',
  pending_signature: 'pending',
  partially_signed: 'pending',
  suspended: 'error',
  expired: 'error',
  terminated: 'error',
  cancelled: 'error',
  ready_for_authentication: 'pending',
  pending_authentication: 'inProgress',
  pending_tenant_biometric: 'inProgress',
  pending_landlord_biometric: 'inProgress',
  // Estados del workflow LCC en MAYÚSCULAS (current_state del dashboard del
  // arrendatario / candidatos). Conviven con los slugs en minúscula.
  TENANT_INVITED: 'inProgress',
  TENANT_REVIEWING: 'pending',
  LANDLORD_REVIEWING: 'pending',
  BOTH_REVIEWING: 'pending',
  OBJECTIONS_PENDING: 'error',
  READY_TO_SIGN: 'inProgress',
  FULLY_SIGNED: 'success',
  PUBLISHED: 'success',
  EXPIRED: 'error',
  TERMINATED: 'error',
  CANCELLED: 'error',
};

export const contractStateKind = (status?: string): StageKind =>
  (status && CONTRACT_STATE_KIND[status]) || 'neutral';

export const MATCH_STATUS_KIND: Record<string, StageKind> = {
  pending: 'pending',
  viewed: 'inProgress',
  accepted: 'success',
  rejected: 'error',
  cancelled: 'error',
  expired: 'error',
};

export const matchStatusKind = (status?: string): StageKind =>
  (status && MATCH_STATUS_KIND[status]) || 'neutral';

export const MATCH_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  viewed: 'Vista',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  expired: 'Expirada',
};

export const matchStatusLabel = (status?: string): string =>
  (status && MATCH_STATUS_LABEL[status]) || status || '—';

/**
 * Etiqueta legible en español para estados de contrato.
 * Evita mostrar el slug interno (`pending_tenant_biometric`) al usuario.
 */
export const CONTRACT_STATE_LABEL: Record<string, string> = {
  draft: 'Borrador',
  tenant_review: 'En revisión por arrendatario',
  tenant_approved: 'Aprobado por arrendatario',
  objections_pending: 'Con objeciones pendientes',
  tenant_biometric: 'Biometría arrendatario',
  guarantor_biometric: 'Biometría garante',
  landlord_biometric: 'Biometría arrendador',
  biometric_completed: 'Biometría completa',
  ready_to_publish: 'Listo para publicar',
  published: 'Publicado',
  active: 'Activo',
  fully_signed: 'Firmado',
  pending_signature: 'Pendiente firma',
  partially_signed: 'Parcialmente firmado',
  suspended: 'Suspendido',
  expired: 'Expirado',
  terminated: 'Terminado',
  cancelled: 'Cancelado',
  ready_for_authentication: 'Listo para autenticar',
  pending_authentication: 'Autenticación en curso',
  pending_tenant_biometric: 'Esperando arrendatario',
  pending_landlord_biometric: 'Esperando arrendador',
  // Workflow LCC (MAYÚSCULAS).
  TENANT_INVITED: 'Invitación Pendiente',
  TENANT_REVIEWING: 'Revisando Contrato',
  LANDLORD_REVIEWING: 'Arrendador Revisando',
  BOTH_REVIEWING: 'Revisión Conjunta',
  OBJECTIONS_PENDING: 'Objeciones Pendientes',
  READY_TO_SIGN: 'Listo para Firmar',
  FULLY_SIGNED: 'Contrato Firmado',
  PUBLISHED: 'Contrato Activo',
  EXPIRED: 'Expirado',
  TERMINATED: 'Terminado',
  CANCELLED: 'Cancelado',
};

export const contractStateLabel = (status?: string): string =>
  (status && CONTRACT_STATE_LABEL[status]) || status || '—';
