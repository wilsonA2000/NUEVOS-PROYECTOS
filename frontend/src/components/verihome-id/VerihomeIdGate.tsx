/**
 * VHID-ENF · Wrapper que deshabilita acciones críticas hasta que el
 * usuario esté verificado. Muestra tooltip con el motivo del bloqueo.
 *
 * Uso típico:
 *   <VerihomeIdGate action="create_property">
 *     <Button onClick={handleCreate}>Crear propiedad</Button>
 *   </VerihomeIdGate>
 */

import React from 'react';
import { Box, Tooltip } from '@mui/material';

import { useVerihomeIdStatus } from '../../hooks/useVerihomeIdStatus';

interface Props {
  action: 'create_property' | 'apply_match' | 'start_biometric';
  children: React.ReactElement;
  tooltipPlacement?:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-start'
    | 'top-end'
    | 'bottom-start'
    | 'bottom-end';
}

const ACTION_LABELS: Record<Props['action'], string> = {
  create_property: 'crear propiedades',
  apply_match: 'aplicar a propiedades',
  start_biometric: 'firmar contratos',
};

const VerihomeIdGate: React.FC<Props> = ({
  action,
  children,
  tooltipPlacement = 'top',
}) => {
  const { data } = useVerihomeIdStatus();
  const blocked = !!data && !data.is_verified;
  if (!blocked) return children;

  const message =
    data?.next_step === 'wait_visit'
      ? `Tu visita VeriHome ID está pendiente. Una vez sellada, podrás ${ACTION_LABELS[action]}.`
      : `Completá tu verificación VeriHome ID para ${ACTION_LABELS[action]}.`;

  const wrapped = React.cloneElement(children, {
    disabled: true,
    'aria-disabled': true,
  });

  return (
    <Tooltip title={message} placement={tooltipPlacement} arrow>
      {/* span necesario porque MUI Tooltip no funciona sobre disabled */}
      <Box
        component='span'
        sx={{ display: 'inline-block' }}
        data-testid={`vhid-gate-${action}`}
        data-vhid-blocked='true'
        data-vhid-next-step={data?.next_step ?? ''}
      >
        {wrapped}
      </Box>
    </Tooltip>
  );
};

export default VerihomeIdGate;
