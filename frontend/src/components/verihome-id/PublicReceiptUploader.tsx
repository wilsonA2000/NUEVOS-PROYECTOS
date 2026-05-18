/**
 * C10b · Sube recibo público (luz/agua/gas) y suma +0.05 al score
 * VeriHome ID si la fecha es <60 días y la dirección matchea con la
 * registrada en el usuario.
 *
 * El OCR es client-side con Tesseract.js (CDN). El backend valida fecha
 * y dirección sobre el texto declarado y guarda la imagen como evidencia
 * para la visita presencial.
 */

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  TaskAlt as TaskAltIcon,
  UploadFile as UploadFileIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';

import { useTesseract } from '../../hooks/useTesseract';
import {
  publicReceiptApi,
  PublicReceiptType,
  PublicReceiptUploadResponse,
} from '../../services/publicReceiptApi';

interface Props {
  onVerified?: (scoreBonus: number) => void;
}

type Phase = 'idle' | 'ocr' | 'ready' | 'sending' | 'verified' | 'rejected';

const RECEIPT_TYPES: { value: PublicReceiptType; label: string }[] = [
  { value: 'electricity', label: 'Energía' },
  { value: 'water', label: 'Acueducto' },
  { value: 'gas', label: 'Gas' },
];

const REJECTION_LABEL: Record<string, string> = {
  receipt_too_old:
    'El recibo tiene más de 60 días. Subí uno más reciente (luz, agua o gas).',
  address_mismatch:
    'La dirección del recibo no coincide con la dirección registrada en tu perfil.',
  issue_date_in_future:
    'La fecha de emisión es futura, revisá los datos del recibo.',
};

function inferIssueDate(text: string): string | null {
  // Acepta dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd y "12 de marzo de 2026".
  const numeric = text.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
  if (numeric) {
    const d = numeric[1] ?? '';
    const m = numeric[2] ?? '';
    let y = numeric[3] ?? '';
    if (y.length === 2) y = `20${y}`;
    const date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
}

function inferAmount(text: string): string | null {
  // Toma el monto más grande en formato colombiano (123.456 o 123,456.78).
  const matches = Array.from(text.matchAll(/\$?\s*([\d.,]{4,})/g));
  let best: number | null = null;
  for (const m of matches) {
    const raw = (m[1] ?? '').replace(/[.,]/g, '');
    if (!raw) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (best === null || n > best) best = n;
  }
  return best ? String(best) : null;
}

const PublicReceiptUploader: React.FC<Props> = ({ onVerified }) => {
  const { recognize, ready: ocrReady, error: ocrError } = useTesseract('spa');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PublicReceiptUploadResponse | null>(
    null,
  );

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receiptType, setReceiptType] =
    useState<PublicReceiptType>('electricity');
  const [declaredAddress, setDeclaredAddress] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [declaredAmount, setDeclaredAmount] = useState('');
  const [ocrText, setOcrText] = useState('');

  const canSubmit = useMemo(
    () =>
      !!file &&
      !!declaredAddress.trim() &&
      !!issueDate &&
      ['accepted', 'idle', 'ready', 'rejected'].indexOf(phase) >= 0 &&
      phase !== 'sending',
    [file, declaredAddress, issueDate, phase],
  );

  const handleFile = (next: File | null) => {
    setFile(next);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
    setPhase(next ? 'ready' : 'idle');
    setError(null);
  };

  const handleOcr = async () => {
    if (!file) return;
    setPhase('ocr');
    setError(null);
    try {
      const { text } = await recognize(URL.createObjectURL(file));
      setOcrText(text);
      const detectedDate = inferIssueDate(text);
      if (detectedDate && !issueDate) setIssueDate(detectedDate);
      const detectedAmount = inferAmount(text);
      if (detectedAmount && !declaredAmount) setDeclaredAmount(detectedAmount);
      setPhase('ready');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo procesar el OCR.',
      );
      setPhase('ready');
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setPhase('sending');
    setError(null);
    try {
      const res = await publicReceiptApi.upload({
        image: file,
        receipt_type: receiptType,
        declared_address: declaredAddress.trim(),
        issue_date: issueDate,
        declared_amount: declaredAmount || undefined,
        ocr_text: ocrText || undefined,
      });
      setResponse(res);
      if (res.status === 'accepted') {
        setPhase('verified');
        onVerified?.(res.public_receipt_score);
      } else {
        setPhase('rejected');
      }
    } catch (err: unknown) {
      const e = err as {
        response?: {
          status?: number;
          data?: { detail?: string; retry_after_seconds?: number };
        };
      };
      if (e?.response?.status === 429) {
        setError(
          e.response.data?.detail ||
            'Esperá unos segundos antes de subir otro recibo.',
        );
      } else {
        setError(e?.response?.data?.detail || 'No se pudo procesar el recibo.');
      }
      setPhase('ready');
    }
  };

  if (phase === 'verified') {
    return (
      <Paper
        variant='outlined'
        sx={{ p: 2, bgcolor: 'success.50', borderColor: 'success.main' }}
        data-testid='public-receipt-uploader'
        data-receipt-phase='verified'
      >
        <Stack direction='row' spacing={1.5} alignItems='center'>
          <TaskAltIcon color='success' />
          <Box>
            <Typography variant='subtitle2' color='success.main'>
              Recibo público verificado
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              Coincide con tu dirección registrada · +0.05 al score VeriHome ID.
            </Typography>
          </Box>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      variant='outlined'
      sx={{ p: 2 }}
      data-testid='public-receipt-uploader'
      data-receipt-phase={phase}
    >
      <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 1 }}>
        <ReceiptIcon color='primary' />
        <Typography variant='subtitle2' fontWeight={600}>
          Recibo público (luz, agua o gas)
        </Typography>
      </Stack>
      <Typography
        variant='caption'
        color='text.secondary'
        display='block'
        sx={{ mb: 2 }}
      >
        Subí un recibo de menos de 60 días. Si la dirección coincide con la tuya
        registrada, suma 0.05 al sub-puntaje <code>public_receipt</code> del
        scoring VeriHome ID.
      </Typography>

      <Stack spacing={2}>
        <Button
          variant='outlined'
          component='label'
          startIcon={<UploadFileIcon />}
          data-testid='public-receipt-file-input'
        >
          {file ? file.name : 'Seleccionar imagen del recibo'}
          <input
            type='file'
            accept='image/*'
            hidden
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
          />
        </Button>

        {previewUrl && (
          <Box
            component='img'
            src={previewUrl}
            alt='Vista previa del recibo'
            sx={{
              maxHeight: 200,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              objectFit: 'contain',
              alignSelf: 'flex-start',
            }}
          />
        )}

        {file && (
          <Button
            variant='text'
            size='small'
            startIcon={
              phase === 'ocr' ? (
                <CircularProgress size={14} />
              ) : (
                <AutoAwesomeIcon />
              )
            }
            disabled={!ocrReady || phase === 'ocr' || phase === 'sending'}
            onClick={handleOcr}
            data-testid='public-receipt-ocr'
          >
            {ocrReady
              ? phase === 'ocr'
                ? 'Procesando OCR…'
                : 'Detectar fecha y monto con OCR'
              : 'Cargando motor OCR…'}
          </Button>
        )}

        <TextField
          select
          label='Tipo de recibo'
          value={receiptType}
          onChange={e => setReceiptType(e.target.value as PublicReceiptType)}
          inputProps={{ 'data-testid': 'public-receipt-type' }}
          fullWidth
        >
          {RECEIPT_TYPES.map(opt => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label='Dirección que figura en el recibo'
          value={declaredAddress}
          onChange={e => setDeclaredAddress(e.target.value)}
          inputProps={{ 'data-testid': 'public-receipt-address' }}
          fullWidth
        />

        <TextField
          label='Fecha de emisión'
          type='date'
          value={issueDate}
          onChange={e => setIssueDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          inputProps={{ 'data-testid': 'public-receipt-date' }}
          fullWidth
        />

        <TextField
          label='Monto (opcional)'
          value={declaredAmount}
          onChange={e =>
            setDeclaredAmount(e.target.value.replace(/[^\d.]/g, ''))
          }
          inputProps={{ inputMode: 'decimal' }}
          fullWidth
        />

        <Button
          variant='contained'
          color='success'
          onClick={handleSubmit}
          disabled={!canSubmit || phase === 'sending'}
          startIcon={
            phase === 'sending' ? (
              <CircularProgress size={16} />
            ) : (
              <TaskAltIcon />
            )
          }
          data-testid='public-receipt-submit'
        >
          Enviar recibo
        </Button>
      </Stack>

      {ocrError && (
        <Alert severity='warning' sx={{ mt: 2 }}>
          {ocrError}. Podés enviar el recibo igual, completando los campos a
          mano.
        </Alert>
      )}

      {phase === 'rejected' && response && (
        <Alert severity='warning' sx={{ mt: 2 }}>
          {REJECTION_LABEL[response.rejection_reason || ''] ||
            'No se pudo validar el recibo.'}
        </Alert>
      )}

      {error && (
        <Alert severity='error' sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Paper>
  );
};

export default PublicReceiptUploader;
