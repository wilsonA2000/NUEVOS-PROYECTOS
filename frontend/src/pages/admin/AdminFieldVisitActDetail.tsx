/**
 * C11 · AdminFieldVisitActDetail
 *
 * Detalle de un acta VeriHome ID. Permite generar PDF, firmar como
 * abogado (cierra cadena) y descargar el PDF sellado.
 */

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Gavel as GavelIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';

import LawyerSignDialog from '../../components/admin/LawyerSignDialog';
import VisitScoreEditor from '../../components/admin/VisitScoreEditor';
import {
  FieldVisitAct,
  fieldVisitActsApi,
} from '../../services/fieldVisitActsApi';

const Section: React.FC<{
  title: string;
  rows: Array<[string, React.ReactNode]>;
}> = ({ title, rows }) => (
  <Paper variant='outlined' sx={{ p: 2, mb: 2 }}>
    <Typography variant='subtitle1' fontWeight={600} gutterBottom>
      {title}
    </Typography>
    <Divider sx={{ mb: 1 }} />
    <Grid container spacing={1}>
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <Grid item xs={4}>
            <Typography variant='body2' color='text.secondary'>
              {label}
            </Typography>
          </Grid>
          <Grid item xs={8}>
            <Typography variant='body2'>{value ?? '—'}</Typography>
          </Grid>
        </React.Fragment>
      ))}
    </Grid>
  </Paper>
);

const AdminFieldVisitActDetail: React.FC = () => {
  const { actId } = useParams<{ actId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    severity: 'success' | 'error' | 'info';
    message: string;
  }>({ open: false, severity: 'info', message: '' });

  const actQuery = useQuery<FieldVisitAct>({
    queryKey: ['field-visit-act', actId],
    queryFn: () => fieldVisitActsApi.retrieve(actId as string),
    enabled: !!actId,
  });

  const generatePdfMutation = useMutation({
    mutationFn: () => fieldVisitActsApi.generatePdf(actId as string),
    onSuccess: () => {
      setSnackbar({
        open: true,
        severity: 'success',
        message: 'PDF del acta generado correctamente.',
      });
      queryClient.invalidateQueries({ queryKey: ['field-visit-act', actId] });
    },
    onError: () =>
      setSnackbar({
        open: true,
        severity: 'error',
        message: 'No se pudo generar el PDF.',
      }),
  });

  const lawyerSignMutation = useMutation({
    mutationFn: () => fieldVisitActsApi.lawyerSign(actId as string),
    onSuccess: data => {
      setSnackbar({
        open: true,
        severity: 'success',
        message: `Acta sellada en bloque #${data.block_number}.`,
      });
      setSignDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['field-visit-act', actId] });
      queryClient.invalidateQueries({ queryKey: ['field-visit-acts'] });
      queryClient.invalidateQueries({
        queryKey: ['field-visit-acts-chain'],
      });
    },
    onError: () =>
      setSnackbar({
        open: true,
        severity: 'error',
        message:
          'No se pudo firmar como abogado. Verificá tus permisos o el estado del acta.',
      }),
  });

  if (actQuery.isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (actQuery.isError || !actQuery.data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error'>No se pudo cargar el acta solicitada.</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          component={RouterLink}
          to='/app/admin/visitas'
          sx={{ mt: 2 }}
        >
          Volver al listado
        </Button>
      </Box>
    );
  }

  const act = actQuery.data;
  const canGeneratePdf = act.status === 'signed_by_parties';
  const canLawyerSign = act.status === 'signed_by_parties' && !!act.pdf_sha256;
  const isSealed = act.status === 'sealed';

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        sx={{ mb: 2 }}
      >
        <Stack direction='row' spacing={1.5} alignItems='center'>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/app/admin/visitas')}
          >
            Volver
          </Button>
          <Typography variant='h5' fontWeight={600}>
            {act.act_number}
          </Typography>
          <Chip
            color={isSealed ? 'success' : 'info'}
            label={act.status_display}
          />
        </Stack>

        <Stack direction='row' spacing={1}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => actQuery.refetch()}
          >
            Refrescar
          </Button>
          <Button
            startIcon={<DescriptionIcon />}
            variant='outlined'
            disabled={!canGeneratePdf || generatePdfMutation.isPending}
            onClick={() => generatePdfMutation.mutate()}
          >
            {generatePdfMutation.isPending ? 'Generando…' : 'Generar PDF'}
          </Button>
          {act.pdf_url && (
            <Button
              startIcon={<DownloadIcon />}
              variant='outlined'
              href={fieldVisitActsApi.pdfDownloadUrl(act.id)}
              target='_blank'
              rel='noopener noreferrer'
            >
              Descargar PDF
            </Button>
          )}
          <Button
            startIcon={<GavelIcon />}
            variant='contained'
            color='primary'
            disabled={!canLawyerSign}
            onClick={() => setSignDialogOpen(true)}
          >
            Firmar como abogado
          </Button>
        </Stack>
      </Stack>

      <Section
        title='Identificación'
        rows={[
          ['Verificado', act.target_user_name],
          ['Email', act.target_user_email],
          ['Visita', act.visit_number],
        ]}
      />

      <Section
        title='Firmas'
        rows={[
          [
            'Verificado',
            act.verified_signed_at
              ? new Date(act.verified_signed_at).toLocaleString('es-CO')
              : 'Pendiente',
          ],
          [
            'Agente',
            act.agent_signed_at
              ? new Date(act.agent_signed_at).toLocaleString('es-CO')
              : 'Pendiente',
          ],
          [
            'Abogado',
            act.lawyer_signed_at
              ? `${act.lawyer_full_name} (T.P. ${act.lawyer_tp_number}) — ${new Date(
                  act.lawyer_signed_at,
                ).toLocaleString('es-CO')}`
              : 'Pendiente',
          ],
        ]}
      />

      <Box sx={{ mb: 2 }}>
        <VisitScoreEditor
          actId={act.id}
          initialBreakdown={act.visit_score_breakdown}
          initialTotal={parseFloat(act.visit_score_total || '0')}
          disabled={act.status !== 'draft'}
        />
      </Box>

      <Paper variant='outlined' sx={{ p: 2, mb: 2 }}>
        <Typography variant='subtitle1' fontWeight={600} gutterBottom>
          Veredicto compuesto
        </Typography>
        <Stack
          direction='row'
          spacing={3}
          alignItems='center'
          justifyContent='space-between'
          flexWrap='wrap'
        >
          <Stack>
            <Typography variant='caption' color='text.secondary'>
              Digital
            </Typography>
            <Typography variant='h6'>
              {parseFloat(act.digital_score_total || '0').toFixed(3)}
            </Typography>
          </Stack>
          <Stack>
            <Typography variant='caption' color='text.secondary'>
              Visita
            </Typography>
            <Typography variant='h6'>
              {parseFloat(act.visit_score_total || '0').toFixed(3)}
            </Typography>
          </Stack>
          <Stack>
            <Typography variant='caption' color='text.secondary'>
              Total
            </Typography>
            <Typography variant='h5' fontWeight={700}>
              {parseFloat(act.total_score || '0').toFixed(3)}
            </Typography>
          </Stack>
          <Chip
            color={
              act.final_verdict === 'aprobado'
                ? 'success'
                : act.final_verdict === 'observado'
                  ? 'warning'
                  : 'error'
            }
            label={act.final_verdict_display}
          />
        </Stack>
      </Paper>

      <Section
        title='Cadena de integridad'
        rows={[
          ['Bloque', act.block_number !== null ? `#${act.block_number}` : '—'],
          [
            'Hash anterior',
            <code key='prev' style={{ fontSize: 12 }}>
              {act.prev_hash || '—'}
            </code>,
          ],
          [
            'Hash payload+PDF',
            <code key='payload' style={{ fontSize: 12 }}>
              {act.payload_hash || '—'}
            </code>,
          ],
          [
            'Hash final',
            <code key='final' style={{ fontSize: 12 }}>
              {act.final_hash || '—'}
            </code>,
          ],
          ['SHA-256 PDF', act.pdf_sha256 || '—'],
        ]}
      />

      <Section
        title='Payload (secciones I-VIII)'
        rows={[
          [
            'JSON',
            <pre
              key='payload-json'
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
              }}
            >
              {JSON.stringify(act.payload, null, 2)}
            </pre>,
          ],
        ]}
      />

      <LawyerSignDialog
        open={signDialogOpen}
        act={act}
        loading={lawyerSignMutation.isPending}
        onClose={() => setSignDialogOpen(false)}
        onConfirm={() => lawyerSignMutation.mutate()}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminFieldVisitActDetail;
