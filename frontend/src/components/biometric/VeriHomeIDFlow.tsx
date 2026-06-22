/**
 * Orquestador de la fase digital del flujo VeriHome ID (pre-visita).
 *
 * Conecta los componentes individuales (CedulaCapture × 2,
 * LivenessCapture, OCR, face match) en un stepper coherente. Al
 * terminar emite un payload completo con score parcial; el caller
 * decide qué hacer (enviar al backend, agendar visita, etc.).
 *
 * NO toca el flujo biométrico legacy (`BiometricAuthenticationFlow`)
 * para no romper producción. Es un componente independiente que
 * se expone como página o modal nuevo cuando se decida activar.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';

import CedulaCapture, { type CedulaCaptureMetadata } from './CedulaCapture';
import LivenessCapture, { type LivenessResult } from './LivenessCapture';
import { useFaceApi } from '../../hooks/useFaceApi';
import { useTesseract } from '../../hooks/useTesseract';
import {
  parseColombianId,
  type ParsedColombianID,
} from '../../lib/colombianIdParser';
import { compareFaceImages, type FaceMatchResult } from '../../lib/faceMatch';
import {
  computeVerihomeIdScore,
  type VerihomeIdScoreBreakdown,
} from '../../lib/verihomeIdScore';

export interface VeriHomeIDDigitalResult {
  documentTypeDeclared: string;
  documentNumberDeclared: string;
  fullNameDeclared: string;
  cedulaAnverso: string | null;
  cedulaAnversoMetadata: CedulaCaptureMetadata | null;
  cedulaReverso: string | null;
  cedulaReversoMetadata: CedulaCaptureMetadata | null;
  ocr: ParsedColombianID | null;
  liveness: LivenessResult | null;
  faceMatch: FaceMatchResult | null;
  score: VerihomeIdScoreBreakdown;
  completedAt: string;
}

export interface VeriHomeIDFlowProps {
  onComplete: (result: VeriHomeIDDigitalResult) => void;
  onCancel?: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'cedula_ciudadania', label: 'Cédula de Ciudadanía' },
  { value: 'cedula_extranjeria', label: 'Cédula de Extranjería' },
  { value: 'tarjeta_identidad', label: 'Tarjeta de Identidad' },
  { value: 'pasaporte', label: 'Pasaporte' },
];

const STEPS = [
  'Datos personales',
  'Cédula anverso',
  'Cédula reverso',
  'Liveness facial',
  'Verificación cruzada',
];

const VeriHomeIDFlow: React.FC<VeriHomeIDFlowProps> = ({
  onComplete,
  onCancel,
}) => {
  const { faceapi } = useFaceApi();
  const { recognize: ocrRecognize, ready: ocrReady } = useTesseract('spa');

  const [stepIndex, setStepIndex] = useState(0);
  const [docType, setDocType] = useState('cedula_ciudadania');
  const [docNumber, setDocNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [anverso, setAnverso] = useState<string | null>(null);
  const [anversoMeta, setAnversoMeta] = useState<CedulaCaptureMetadata | null>(
    null,
  );
  const [reverso, setReverso] = useState<string | null>(null);
  const [reversoMeta, setReversoMeta] = useState<CedulaCaptureMetadata | null>(
    null,
  );
  const [ocrResult, setOcrResult] = useState<ParsedColombianID | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [livenessResult, setLivenessResult] = useState<LivenessResult | null>(
    null,
  );
  const [faceMatchResult, setFaceMatchResult] =
    useState<FaceMatchResult | null>(null);
  const [matchRunning, setMatchRunning] = useState(false);
  const [finalScore, setFinalScore] = useState<VerihomeIdScoreBreakdown | null>(
    null,
  );

  const handleStartFlow = () => {
    if (!fullName.trim() || fullName.trim().split(/\s+/).length < 2) {
      setFormError('Ingresa nombre completo (al menos 2 palabras)');
      return;
    }
    if (!docNumber.trim() || docNumber.trim().length < 5) {
      setFormError('Ingresa un número de documento válido');
      return;
    }
    setFormError(null);
    setStepIndex(1);
  };

  const handleAnversoCapture = async (
    image: string,
    metadata: CedulaCaptureMetadata,
  ) => {
    setAnverso(image);
    setAnversoMeta(metadata);

    if (ocrReady) {
      setOcrRunning(true);
      try {
        const { lines } = await ocrRecognize(image);
        const parsed = parseColombianId(lines);
        setOcrResult(parsed);
      } catch {
        // OCR opcional; continuamos
      } finally {
        setOcrRunning(false);
      }
    }

    setStepIndex(2);
  };

  const handleReversoCapture = (
    image: string,
    metadata: CedulaCaptureMetadata,
  ) => {
    setReverso(image);
    setReversoMeta(metadata);
    setStepIndex(3);
  };

  const handleLivenessComplete = async (result: LivenessResult) => {
    setLivenessResult(result);

    if (faceapi && anverso) {
      setMatchRunning(true);
      try {
        const match = await compareFaceImages(faceapi, anverso, result.selfie);
        setFaceMatchResult(match);
      } catch {
        // match opcional; continuamos al cierre
      } finally {
        setMatchRunning(false);
      }
    }
    setStepIndex(4);
  };

  useEffect(() => {
    if (stepIndex !== 4) return;
    if (matchRunning) return;

    const score = computeVerihomeIdScore({
      documentTypeDeclared: docType,
      documentNumberDeclared: docNumber,
      fullNameDeclared: fullName,
      parsedFromOCR: ocrResult,
      liveness: livenessResult,
      faceMatch: faceMatchResult,
    });
    setFinalScore(score);
  }, [
    stepIndex,
    matchRunning,
    docType,
    docNumber,
    fullName,
    ocrResult,
    livenessResult,
    faceMatchResult,
  ]);

  const handleSubmit = () => {
    if (!finalScore) return;
    onComplete({
      documentTypeDeclared: docType,
      documentNumberDeclared: docNumber,
      fullNameDeclared: fullName,
      cedulaAnverso: anverso,
      cedulaAnversoMetadata: anversoMeta,
      cedulaReverso: reverso,
      cedulaReversoMetadata: reversoMeta,
      ocr: ocrResult,
      liveness: livenessResult,
      faceMatch: faceMatchResult,
      score: finalScore,
      completedAt: new Date().toISOString(),
    });
  };

  const renderStep = () => {
    switch (stepIndex) {
      case 0:
        return (
          <Stack spacing={2}>
            <Typography variant='body2' color='text.secondary'>
              Ingresa tus datos como aparecen en tu documento de identidad.
              Estos datos se contrastarán con la información extraída
              automáticamente de la cédula.
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Tipo de documento</InputLabel>
              <Select
                value={docType}
                label='Tipo de documento'
                onChange={e => setDocType(e.target.value)}
              >
                {DOCUMENT_TYPES.map(t => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label='Número de documento'
              value={docNumber}
              onChange={e => setDocNumber(e.target.value)}
              fullWidth
            />
            <TextField
              label='Nombre completo'
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              fullWidth
            />
            {formError && <Alert severity='error'>{formError}</Alert>}
            <Stack direction='row' spacing={2}>
              {onCancel && (
                <Button variant='text' onClick={onCancel}>
                  Cancelar
                </Button>
              )}
              <Box sx={{ flex: 1 }} />
              <Button variant='contained' onClick={handleStartFlow}>
                Continuar
              </Button>
            </Stack>
          </Stack>
        );

      case 1:
        return (
          <CedulaCapture
            key='cedula-anverso'
            side='anverso'
            onCapture={handleAnversoCapture}
            onCancel={onCancel}
          />
        );

      case 2:
        return (
          <CedulaCapture
            key='cedula-reverso'
            side='reverso'
            onCapture={handleReversoCapture}
            onCancel={onCancel}
          />
        );

      case 3:
        return (
          <LivenessCapture
            onComplete={handleLivenessComplete}
            onCancel={onCancel}
          />
        );

      case 4: {
        if (matchRunning || !finalScore) {
          return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={32} />
              <Typography sx={{ mt: 2 }}>Preparando envío…</Typography>
            </Box>
          );
        }

        // El veredicto lo decide el SERVIDOR (match facial real con
        // LocalFacialProvider). Aquí solo enviamos las capturas; el resultado
        // se muestra en la pantalla de cierre.
        return (
          <Stack spacing={2}>
            <Alert severity='info'>
              Tus documentos y tu selfie están listos. Al enviar, validamos tu
              identidad de forma segura en el servidor.
            </Alert>
            <Stack direction='row' spacing={2}>
              {onCancel && (
                <Button variant='text' onClick={onCancel}>
                  Cancelar
                </Button>
              )}
              <Box sx={{ flex: 1 }} />
              <Button variant='contained' onClick={handleSubmit}>
                Enviar verificación
              </Button>
            </Stack>
          </Stack>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant='h5'>
            VeriHome ID — Verificación digital
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Antes de agendar tu visita en campo necesitamos validar tu identidad
            de forma digital.
          </Typography>
        </Box>

        <Stepper activeStep={stepIndex} alternativeLabel>
          {STEPS.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {ocrRunning && (
          <Alert severity='info'>Extrayendo información del documento…</Alert>
        )}

        {renderStep()}
      </Stack>
    </Paper>
  );
};

export default VeriHomeIDFlow;
