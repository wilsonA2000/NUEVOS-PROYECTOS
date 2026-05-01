/**
 * VHID-ENF · Escucha el evento global `verihomeIdRequired` que dispara
 * el interceptor de api.ts cuando el backend bloquea una acción crítica
 * por falta de verificación. Muestra snackbar y opcionalmente redirige.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { useSnackbar } from '../../contexts/SnackbarContext';
import { VERIHOME_ID_STATUS_KEY } from '../../hooks/useVerihomeIdStatus';

interface VerihomeIdRequiredEventDetail {
  next_step: 'start_onboarding' | 'wait_visit' | 'complete';
  message: string;
}

const VerihomeIdRequiredListener: React.FC = () => {
  const { showWarning } = useSnackbar();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<VerihomeIdRequiredEventDetail>)
        .detail;
      if (!detail) return;

      // Refrescar estado por si cambió (visita programada/sellada).
      queryClient.invalidateQueries({ queryKey: VERIHOME_ID_STATUS_KEY });

      showWarning(
        detail.message ||
          'Necesitás completar tu verificación VeriHome ID antes de esta acción.',
      );
      if (detail.next_step === 'start_onboarding') {
        navigate('/app/verihome-id/onboarding');
      }
    };

    window.addEventListener('verihomeIdRequired', handler as EventListener);
    return () => {
      window.removeEventListener(
        'verihomeIdRequired',
        handler as EventListener,
      );
    };
  }, [navigate, queryClient, showWarning]);

  return null;
};

export default VerihomeIdRequiredListener;
