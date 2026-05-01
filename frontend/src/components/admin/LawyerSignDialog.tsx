/**
 * C11 · Diálogo de confirmación para firma de abogado.
 *
 * Wilson revisa el acta consolidada (PDF + secciones I-VIII), confirma
 * la T.P. precargada desde backend (settings.LAWYER_TP_NUMBER) y firma.
 * El backend cierra el bloque de la cadena.
 */

import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { Gavel as GavelIcon } from '@mui/icons-material';

import { FieldVisitAct } from '../../services/fieldVisitActsApi';

interface Props {
  open: boolean;
  act: FieldVisitAct | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LawyerSignDialog: React.FC<Props> = ({
  open,
  act,
  loading = false,
  onClose,
  onConfirm,
}) => {
  if (!act) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <GavelIcon color='primary' />
        Firmar acta {act.act_number}
      </DialogTitle>
      <DialogContent>
        <DialogContentText component='div'>
          <Stack spacing={1.5}>
            <Typography variant='body2'>
              Estás por certificar como abogado titulado el acta de
              verificación de identidad del usuario
              {' '}
              <strong>{act.target_user_name || act.target_user_email}</strong>.
            </Typography>
            <Alert severity='info'>
              Esta acción cierra el bloque {`#${(act.block_number ?? 0) + 0}`}{' '}
              de la cadena de integridad. La firma queda registrada conforme a
              la Ley 527 de 1999 (mensajes de datos) con tu credencial admin
              y tu T.P. configurada en backend.
            </Alert>
            <Typography variant='body2' color='text.secondary'>
              Confirmás haber revisado el PDF generado y aceptás que el SHA-256
              registrado:
              {' '}
              <code>
                {act.pdf_sha256
                  ? `${act.pdf_sha256.slice(0, 16)}…`
                  : 'pendiente'}
              </code>
              {' '}
              corresponde al documento que estás firmando.
            </Typography>
          </Stack>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant='contained'
          color='primary'
          onClick={onConfirm}
          disabled={loading}
          startIcon={<GavelIcon />}
        >
          {loading ? 'Firmando…' : 'Firmar y sellar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LawyerSignDialog;
