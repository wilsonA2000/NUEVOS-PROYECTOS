/**
 * StatusChip — chip semántico unificado para estados/etapas del workflow.
 *
 * Reemplaza a chips con emojis y a lógicas dispersas de `color` en
 * MatchesDashboard, MatchedCandidatesView, ContractDetail, etc.
 *
 * Uso:
 *   <StatusChip kind="success" label="Firmado" icon={<CheckCircleIcon />} />
 *   <StatusChip kind="pending" label="Visita pendiente" />
 */
import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { stageToken, StageKind } from '../../theme/tokens';
import {
  matchStatusKind,
  matchStatusLabel,
  contractStateKind,
  contractStateLabel,
} from '../../utils/statusMaps';

export interface StatusChipProps extends Omit<ChipProps, 'color'> {
  kind: StageKind;
}

const StatusChip: React.FC<StatusChipProps> = ({ kind, sx, ...rest }) => {
  const token = stageToken(kind);
  return (
    <Chip
      size='small'
      variant='outlined'
      sx={{
        color: token.color,
        backgroundColor: token.bg,
        borderColor: token.border,
        fontWeight: 600,
        '& .MuiChip-icon': { color: token.color },
        ...sx,
      }}
      {...rest}
    />
  );
};

export default StatusChip;

// ---------------------------------------------------------------------------
// Resolvers de estado CRUDO → chip (D13). Toman el status del backend y
// resuelven kind + label desde la fuente canónica (utils/statusMaps), para que
// los componentes no repitan mapeos status→color/label ad-hoc.
// ---------------------------------------------------------------------------

/** Chip para el estado de una solicitud de match (status crudo del backend). */
export const MatchStatusChip: React.FC<
  { status: string } & Omit<StatusChipProps, 'kind' | 'label'>
> = ({ status, ...rest }) => (
  <StatusChip
    kind={matchStatusKind(status)}
    label={matchStatusLabel(status)}
    {...rest}
  />
);

/** Chip para el estado/etapa de un contrato (current_state o status crudo). */
export const ContractStatusChip: React.FC<
  { status?: string } & Omit<StatusChipProps, 'kind' | 'label'>
> = ({ status, ...rest }) => (
  <StatusChip
    kind={contractStateKind(status)}
    label={contractStateLabel(status)}
    {...rest}
  />
);
