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
