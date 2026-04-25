/**
 * Score compuesto VeriHome ID — fase digital (pre-visita).
 *
 * Mide la confianza acumulada al final del flujo digital, antes de
 * la visita en campo. La visita aporta ~0.50 adicional al score
 * total (cruces oficiales + acta presencial + firma abogado), por
 * eso el máximo digital es 0.50.
 *
 * Pesos pensados para que un usuario que pasa todas las verificaciones
 * digitales con calidad razonable obtenga 0.45-0.50, mientras que
 * datos inconsistentes o liveness pobre lo bajen.
 */

import type { ParsedColombianID } from './colombianIdParser';
import type { FaceMatchResult } from './faceMatch';
import type { LivenessResult } from '../components/biometric/LivenessCapture';

export interface VerihomeIdInputs {
  documentTypeDeclared: string;
  documentNumberDeclared: string;
  fullNameDeclared: string;
  parsedFromOCR: ParsedColombianID | null;
  liveness: LivenessResult | null;
  faceMatch: FaceMatchResult | null;
}

export interface VerihomeIdScoreBreakdown {
  ocrCompleto: number;
  numeroCoincide: number;
  nombreCoincide: number;
  tipoCoincide: number;
  livenessSuperado: number;
  matchFacial: number;
  total: number;
  observaciones: string[];
}

const MAX_DIGITAL_SCORE = 0.5;

function normalizeName(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function nameSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeName(a).split(' ').filter(Boolean));
  const tokensB = new Set(normalizeName(b).split(' ').filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let common = 0;
  for (const t of tokensA) if (tokensB.has(t)) common++;
  return common / Math.max(tokensA.size, tokensB.size);
}

export function computeVerihomeIdScore(
  inputs: VerihomeIdInputs,
): VerihomeIdScoreBreakdown {
  const observaciones: string[] = [];
  const { parsedFromOCR, liveness, faceMatch } = inputs;

  let ocrCompleto = 0;
  if (parsedFromOCR) {
    const requiredFields = [
      parsedFromOCR.documentNumber,
      parsedFromOCR.fullName,
      parsedFromOCR.detectedType,
    ];
    const present = requiredFields.filter(Boolean).length;
    ocrCompleto = (present / requiredFields.length) * 0.05;
  } else {
    observaciones.push('OCR no ejecutado');
  }

  let numeroCoincide = 0;
  if (
    parsedFromOCR?.documentNumber &&
    inputs.documentNumberDeclared &&
    parsedFromOCR.documentNumber.replace(/\D/g, '') ===
      inputs.documentNumberDeclared.replace(/\D/g, '')
  ) {
    numeroCoincide = 0.1;
  } else if (parsedFromOCR?.documentNumber && inputs.documentNumberDeclared) {
    observaciones.push(
      `Número declarado (${inputs.documentNumberDeclared}) ≠ OCR (${parsedFromOCR.documentNumber})`,
    );
  }

  let nombreCoincide = 0;
  if (parsedFromOCR?.fullName && inputs.fullNameDeclared) {
    const sim = nameSimilarity(parsedFromOCR.fullName, inputs.fullNameDeclared);
    nombreCoincide = sim * 0.05;
    if (sim < 0.5) {
      observaciones.push(
        `Nombre declarado tiene baja coincidencia con OCR (${(sim * 100).toFixed(0)}%)`,
      );
    }
  }

  let tipoCoincide = 0;
  if (
    parsedFromOCR?.detectedType &&
    inputs.documentTypeDeclared &&
    parsedFromOCR.detectedType === inputs.documentTypeDeclared
  ) {
    tipoCoincide = 0.05;
  } else if (parsedFromOCR?.detectedType && inputs.documentTypeDeclared) {
    observaciones.push(
      `Tipo declarado (${inputs.documentTypeDeclared}) ≠ OCR (${parsedFromOCR.detectedType})`,
    );
  }

  let livenessSuperado = 0;
  if (liveness) {
    livenessSuperado = 0.1 + liveness.qualityScore * 0.05;
  } else {
    observaciones.push('Liveness no ejecutado');
  }

  let matchFacial = 0;
  if (faceMatch) {
    if (!faceMatch.sourceDetected) {
      observaciones.push('No se detectó rostro en la cédula');
    } else if (!faceMatch.targetDetected) {
      observaciones.push('No se detectó rostro en la selfie');
    } else if (faceMatch.isMatch) {
      matchFacial = 0.1 + faceMatch.similarity * 0.05;
    } else {
      observaciones.push(
        `Match facial bajo: distance=${faceMatch.distance.toFixed(3)}`,
      );
    }
  } else {
    observaciones.push('Match facial no ejecutado');
  }

  const total = Math.min(
    MAX_DIGITAL_SCORE,
    ocrCompleto +
      numeroCoincide +
      nombreCoincide +
      tipoCoincide +
      livenessSuperado +
      matchFacial,
  );

  return {
    ocrCompleto,
    numeroCoincide,
    nombreCoincide,
    tipoCoincide,
    livenessSuperado,
    matchFacial,
    total,
    observaciones,
  };
}

export function classifyDigitalScore(score: number): {
  label: 'aprobado' | 'observado' | 'rechazado';
  color: 'success' | 'warning' | 'error';
  message: string;
} {
  if (score >= 0.4) {
    return {
      label: 'aprobado',
      color: 'success',
      message: 'Verificación digital aprobada — listo para visita en campo',
    };
  }
  if (score >= 0.25) {
    return {
      label: 'observado',
      color: 'warning',
      message: 'Verificación parcial — la visita resolverá observaciones',
    };
  }
  return {
    label: 'rechazado',
    color: 'error',
    message: 'No se cumplen los mínimos digitales — re-intenta el proceso',
  };
}
