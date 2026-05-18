/**
 * C10 · Componente para verificar email con OTP de 6 dígitos.
 *
 * Flujo:
 *   1. Usuario click "Enviar código a mi email" → POST /email-otp/request/.
 *   2. Aparece input de 6 dígitos + contador regresivo.
 *   3. Usuario tipea código → POST /email-otp/verify/.
 *   4. Si OK: chip verde "Email verificado +0.05 score" + onSuccess().
 *
 * Backend permite 1 request/minuto. Errores 429 muestran segundos
 * de espera; errores 400 muestran "código incorrecto" con contador.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Email as EmailIcon,
  MarkEmailRead as MarkEmailReadIcon,
} from '@mui/icons-material';

import { emailOtpApi } from '../../services/emailOtpApi';

interface Props {
  email: string;
  onVerified?: (scoreBonus: number) => void;
}

const EmailOtpVerifier: React.FC<Props> = ({ email, onVerified }) => {
  const [phase, setPhase] = useState<'idle' | 'sent' | 'verified'>('idle');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (phase !== 'sent' || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, secondsLeft]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const handleRequest = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await emailOtpApi.request();
      setPhase('sent');
      setCode('');
      setSecondsLeft(res.validity_minutes * 60);
      setResendIn(60);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: string; retry_after_seconds?: number } } };
      if (e?.response?.status === 429) {
        setResendIn(e.response.data?.retry_after_seconds ?? 60);
        setError(
          e.response.data?.detail ||
            'Esperá unos segundos antes de pedir otro código.',
        );
      } else {
        setError(e?.response?.data?.detail || 'No se pudo enviar el código.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('El código debe tener 6 dígitos.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await emailOtpApi.verify(code);
      setPhase('verified');
      onVerified?.(res.email_otp_score);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; attempts?: number } } };
      const detail = e?.response?.data?.detail || 'Código inválido.';
      const attempts = e?.response?.data?.attempts;
      setError(
        attempts ? `${detail} (intento ${attempts}/5)` : detail,
      );
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'verified') {
    return (
      <Paper
        variant='outlined'
        sx={{ p: 2, bgcolor: 'success.50', borderColor: 'success.main' }}
        data-testid='email-otp-verifier'
        data-otp-phase='verified'
      >
        <Stack direction='row' spacing={1.5} alignItems='center'>
          <MarkEmailReadIcon color='success' />
          <Box>
            <Typography variant='subtitle2' color='success.main'>
              Email verificado
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {email} · +0.05 al score VeriHome ID.
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
      data-testid='email-otp-verifier'
      data-otp-phase={phase}
    >
      <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 1 }}>
        <EmailIcon color='primary' />
        <Typography variant='subtitle2' fontWeight={600}>
          Verificación de email
        </Typography>
      </Stack>
      <Typography variant='caption' color='text.secondary' display='block' sx={{ mb: 2 }}>
        Te enviaremos un código de 6 dígitos a <b>{email}</b>. Suma 0.05 al
        sub-puntaje email_otp del scoring VeriHome ID.
      </Typography>

      {phase === 'idle' && (
        <Button
          variant='contained'
          onClick={handleRequest}
          disabled={busy || resendIn > 0}
          startIcon={busy ? <CircularProgress size={16} /> : <EmailIcon />}
          data-testid='email-otp-request'
        >
          {resendIn > 0
            ? `Reintentá en ${resendIn}s`
            : 'Enviar código a mi email'}
        </Button>
      )}

      {phase === 'sent' && (
        <Stack spacing={2}>
          <Alert severity='info'>
            Código enviado. Vence en {Math.floor(secondsLeft / 60)}:
            {String(secondsLeft % 60).padStart(2, '0')}.
          </Alert>
          <TextField
            label='Código de 6 dígitos'
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputProps={{ inputMode: 'numeric', maxLength: 6, 'data-testid': 'email-otp-code-input' }}
            fullWidth
          />
          <Stack direction='row' spacing={1.5}>
            <Button
              variant='contained'
              color='success'
              onClick={handleVerify}
              disabled={busy || code.length !== 6 || secondsLeft === 0}
              startIcon={busy ? <CircularProgress size={16} /> : <MarkEmailReadIcon />}
              data-testid='email-otp-verify'
            >
              Verificar
            </Button>
            <Button
              variant='outlined'
              onClick={handleRequest}
              disabled={busy || resendIn > 0}
              data-testid='email-otp-resend'
            >
              {resendIn > 0 ? `Reenviar en ${resendIn}s` : 'Reenviar'}
            </Button>
          </Stack>
        </Stack>
      )}

      {error && (
        <Alert severity='error' sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Paper>
  );
};

export default EmailOtpVerifier;
