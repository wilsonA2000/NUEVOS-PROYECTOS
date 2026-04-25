import {
  classifyDigitalScore,
  computeVerihomeIdScore,
} from '../verihomeIdScore';
import type { ParsedColombianID } from '../colombianIdParser';
import type { LivenessResult } from '../../components/biometric/LivenessCapture';
import type { FaceMatchResult } from '../faceMatch';

const baseInputs = {
  documentTypeDeclared: 'cedula_ciudadania',
  documentNumberDeclared: '1234567890',
  fullNameDeclared: 'JUAN GARCIA RODRIGUEZ',
};

const fullOcr: ParsedColombianID = {
  documentNumber: '1234567890',
  fullName: 'JUAN GARCIA RODRIGUEZ',
  firstName: 'JUAN',
  lastName: 'GARCIA RODRIGUEZ',
  dateOfBirth: '1990-03-15',
  expiryDate: null,
  detectedType: 'cedula_ciudadania',
};

const goodLiveness: LivenessResult = {
  selfie: 'data:image/jpeg;base64,fake',
  steps: [],
  qualityScore: 0.9,
  totalDurationMs: 8000,
  capturedAt: new Date().toISOString(),
};

const goodMatch: FaceMatchResult = {
  isMatch: true,
  similarity: 0.85,
  distance: 0.35,
  sourceDetected: true,
  targetDetected: true,
};

describe('computeVerihomeIdScore', () => {
  it('da score alto cuando todo coincide perfectamente', () => {
    const score = computeVerihomeIdScore({
      ...baseInputs,
      parsedFromOCR: fullOcr,
      liveness: goodLiveness,
      faceMatch: goodMatch,
    });
    expect(score.total).toBeGreaterThan(0.4);
    expect(score.observaciones).toHaveLength(0);
  });

  it('penaliza si no se ejecutó OCR', () => {
    const score = computeVerihomeIdScore({
      ...baseInputs,
      parsedFromOCR: null,
      liveness: goodLiveness,
      faceMatch: goodMatch,
    });
    expect(score.total).toBeLessThan(0.4);
    expect(score.observaciones).toContain('OCR no ejecutado');
  });

  it('marca observación si número OCR ≠ declarado', () => {
    const score = computeVerihomeIdScore({
      ...baseInputs,
      parsedFromOCR: { ...fullOcr, documentNumber: '9999999999' },
      liveness: goodLiveness,
      faceMatch: goodMatch,
    });
    expect(score.numeroCoincide).toBe(0);
    expect(score.observaciones.some(o => o.includes('Número'))).toBe(true);
  });

  it('match facial fallido baja el score', () => {
    const score = computeVerihomeIdScore({
      ...baseInputs,
      parsedFromOCR: fullOcr,
      liveness: goodLiveness,
      faceMatch: {
        ...goodMatch,
        isMatch: false,
        similarity: 0,
        distance: 0.85,
      },
    });
    expect(score.matchFacial).toBe(0);
    expect(score.observaciones.some(o => o.includes('Match facial'))).toBe(true);
  });

  it('detecta nombre con baja coincidencia', () => {
    const score = computeVerihomeIdScore({
      ...baseInputs,
      parsedFromOCR: { ...fullOcr, fullName: 'PEDRO PEREZ MARTINEZ' },
      liveness: goodLiveness,
      faceMatch: goodMatch,
    });
    expect(score.nombreCoincide).toBeLessThan(0.03);
    expect(score.observaciones.some(o => o.includes('Nombre'))).toBe(true);
  });

  it('normaliza tildes en comparación de nombres', () => {
    const score = computeVerihomeIdScore({
      ...baseInputs,
      fullNameDeclared: 'JUÁN GARCÍA RODRÍGUEZ',
      parsedFromOCR: fullOcr,
      liveness: goodLiveness,
      faceMatch: goodMatch,
    });
    expect(score.nombreCoincide).toBeGreaterThan(0.04);
  });

  it('total nunca excede 0.5 (cap MAX_DIGITAL_SCORE)', () => {
    const score = computeVerihomeIdScore({
      ...baseInputs,
      parsedFromOCR: fullOcr,
      liveness: { ...goodLiveness, qualityScore: 1.0 },
      faceMatch: { ...goodMatch, similarity: 1.0 },
    });
    expect(score.total).toBeLessThanOrEqual(0.5);
  });

  it('detecta rostro no encontrado en cédula', () => {
    const score = computeVerihomeIdScore({
      ...baseInputs,
      parsedFromOCR: fullOcr,
      liveness: goodLiveness,
      faceMatch: { ...goodMatch, sourceDetected: false, isMatch: false },
    });
    expect(score.observaciones.some(o => o.includes('cédula'))).toBe(true);
  });
});

describe('classifyDigitalScore', () => {
  it('aprueba cuando score >= 0.4', () => {
    expect(classifyDigitalScore(0.45).label).toBe('aprobado');
    expect(classifyDigitalScore(0.5).label).toBe('aprobado');
  });

  it('observa entre 0.25 y 0.4', () => {
    expect(classifyDigitalScore(0.3).label).toBe('observado');
    expect(classifyDigitalScore(0.39).label).toBe('observado');
  });

  it('rechaza por debajo de 0.25', () => {
    expect(classifyDigitalScore(0.1).label).toBe('rechazado');
    expect(classifyDigitalScore(0).label).toBe('rechazado');
  });
});
