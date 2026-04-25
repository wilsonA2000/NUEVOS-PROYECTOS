/**
 * Match facial entre dos imágenes usando face-api.js.
 *
 * Usa face-api.js descriptor 128-d (FaceNet-style). La comparación
 * estándar es distancia euclidiana: face-api recomienda umbral 0.6
 * para la misma persona en condiciones controladas. Subimos a 0.55
 * para reducir falsos positivos en el contexto de cédula, donde la
 * foto suele ser de baja calidad y mayor edad.
 *
 * Output: similarity 0..1 derivado de 1 - distance/threshold, con
 * boolean isMatch para uso directo.
 */

import type { FaceApiModule } from '../hooks/useFaceApi';

export interface FaceMatchResult {
  isMatch: boolean;
  similarity: number;
  distance: number;
  sourceDetected: boolean;
  targetDetected: boolean;
}

const DEFAULT_DISTANCE_THRESHOLD = 0.55;

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar imagen para matching'));
    img.src = src;
  });
}

async function getFaceDescriptor(
  faceapi: FaceApiModule,
  image: HTMLImageElement,
): Promise<Float32Array | null> {
  const result = await faceapi
    .detectSingleFace(
      image,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.4,
      }),
    )
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result?.descriptor ?? null;
}

export async function compareFaceImages(
  faceapi: FaceApiModule,
  sourceDataUrl: string,
  targetDataUrl: string,
  distanceThreshold = DEFAULT_DISTANCE_THRESHOLD,
): Promise<FaceMatchResult> {
  const [sourceImg, targetImg] = await Promise.all([
    loadImage(sourceDataUrl),
    loadImage(targetDataUrl),
  ]);

  const [sourceDesc, targetDesc] = await Promise.all([
    getFaceDescriptor(faceapi, sourceImg),
    getFaceDescriptor(faceapi, targetImg),
  ]);

  if (!sourceDesc || !targetDesc) {
    return {
      isMatch: false,
      similarity: 0,
      distance: 1,
      sourceDetected: sourceDesc !== null,
      targetDetected: targetDesc !== null,
    };
  }

  const distance = faceapi.euclideanDistance(sourceDesc, targetDesc);
  const isMatch = distance <= distanceThreshold;
  const similarity = Math.max(0, Math.min(1, 1 - distance / distanceThreshold));

  return {
    isMatch,
    similarity,
    distance,
    sourceDetected: true,
    targetDetected: true,
  };
}
