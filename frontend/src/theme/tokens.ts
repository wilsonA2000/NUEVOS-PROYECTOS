/**
 * VeriHome design tokens (VIS-2, 2026-04-14).
 *
 * Tokens tipados que complementan el tema MUI para eliminar gradientes, sombras
 * y colores de etapa hardcoded. Usar en lugar de valores crudos.
 *
 * Ejemplo:
 *   import { vh, stageToken } from '@/theme/tokens';
 *   sx={{ boxShadow: vh.shadows.card, borderRadius: vh.radius.md }}
 */
import theme from './index';

const p = theme.palette;

export const vh = {
  gradients: {
    primary: `linear-gradient(135deg, ${p.primary.main} 0%, ${p.primary.dark} 100%)`,
    secondary: `linear-gradient(135deg, ${p.secondary.main} 0%, ${p.secondary.dark} 100%)`,
    success: `linear-gradient(135deg, ${p.success.main} 0%, ${p.success.dark} 100%)`,
    warning: `linear-gradient(135deg, ${p.warning.main} 0%, ${p.warning.dark} 100%)`,
    error: `linear-gradient(135deg, ${p.error.main} 0%, ${p.error.dark} 100%)`,
    hero: `linear-gradient(135deg, ${p.primary.main} 0%, ${p.secondary.main} 100%)`,
    surface: `linear-gradient(180deg, ${p.background.paper} 0%, ${p.background.default} 100%)`,
    subtle: `linear-gradient(180deg, ${p.primary.main}0A 0%, transparent 100%)`,
  },
  shadows: {
    subtle: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
    card: '0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)',
    elevated: '0 12px 32px rgba(15, 23, 42, 0.12), 0 4px 8px rgba(15, 23, 42, 0.06)',
    glow: `0 0 0 3px ${p.primary.main}22, 0 8px 24px ${p.primary.main}22`,
    glowSuccess: `0 0 0 3px ${p.success.main}22, 0 8px 24px ${p.success.main}22`,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24,
    pill: 999,
  },
  spacing: {
    cardPadding: 3,
    sectionGap: 4,
    modalPadding: 3,
  },
  border: {
    subtle: `1px solid ${p.divider}`,
    emphasis: `1px solid ${p.primary.main}33`,
  },
  transitions: {
    hover: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    emphasis: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export type StageKind =
  | 'pending'
  | 'inProgress'
  | 'success'
  | 'error'
  | 'neutral';

export const stageToken = (kind: StageKind) => {
  switch (kind) {
    case 'pending':
      return { color: p.warning.main, bg: `${p.warning.main}14`, border: `${p.warning.main}33` };
    case 'inProgress':
      return { color: p.info.main, bg: `${p.info.main}14`, border: `${p.info.main}33` };
    case 'success':
      return { color: p.success.main, bg: `${p.success.main}14`, border: `${p.success.main}33` };
    case 'error':
      return { color: p.error.main, bg: `${p.error.main}14`, border: `${p.error.main}33` };
    default:
      return { color: p.text.secondary, bg: p.action.hover, border: p.divider };
  }
};
