/**
 * Lazy-load de face-api.js (fork @vladmandic/face-api mantenido) + modelos.
 *
 * Carga vía CDN en runtime para evitar inflar el bundle. Tres modelos
 * son suficientes para el flujo VeriHome ID:
 *   - tinyFaceDetector: detección rápida de bbox del rostro
 *   - faceLandmark68Net: 68 puntos faciales (para yaw/pitch/roll)
 *   - faceRecognitionNet: descriptor 128-d para match cédula↔selfie
 *
 * Los modelos se descargan una vez (~7MB total) y quedan cacheados por
 * el browser. Instancias subsecuentes del hook resuelven inmediato.
 */

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    faceapi?: FaceApiModule;
    __faceApiLoading?: Promise<FaceApiModule>;
  }
}

export interface FaceApiPoint {
  x: number;
  y: number;
}

export interface FaceLandmarks {
  positions: FaceApiPoint[];
  getJawOutline: () => FaceApiPoint[];
  getNose: () => FaceApiPoint[];
  getLeftEye: () => FaceApiPoint[];
  getRightEye: () => FaceApiPoint[];
  getMouth: () => FaceApiPoint[];
}

export interface FaceDetection {
  box: { x: number; y: number; width: number; height: number };
  score: number;
}

export interface FaceDetectionWithLandmarks {
  detection: FaceDetection;
  landmarks: FaceLandmarks;
  alignedRect?: { box: { x: number; y: number; width: number; height: number } };
}

export interface FaceDetectionWithDescriptor extends FaceDetectionWithLandmarks {
  descriptor: Float32Array;
}

export interface FaceApiModule {
  nets: {
    tinyFaceDetector: { loadFromUri: (uri: string) => Promise<void> };
    faceLandmark68Net: { loadFromUri: (uri: string) => Promise<void> };
    faceRecognitionNet: { loadFromUri: (uri: string) => Promise<void> };
  };
  TinyFaceDetectorOptions: new (opts?: {
    inputSize?: number;
    scoreThreshold?: number;
  }) => unknown;
  detectSingleFace: (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    options?: unknown,
  ) => {
    withFaceLandmarks: () => {
      withFaceDescriptor: () => Promise<FaceDetectionWithDescriptor | undefined>;
      run: () => Promise<FaceDetectionWithLandmarks | undefined>;
    };
    run: () => Promise<FaceDetection | undefined>;
  };
  euclideanDistance: (a: Float32Array, b: Float32Array) => number;
}

const SCRIPT_URL =
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js';
const MODEL_URL =
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';

function loadScript(): Promise<FaceApiModule> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('face-api.js requires browser'));
  }
  if (window.faceapi) return Promise.resolve(window.faceapi);
  if (window.__faceApiLoading) return window.__faceApiLoading;

  window.__faceApiLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.faceapi) resolve(window.faceapi);
      else reject(new Error('face-api no inicializó tras carga'));
    };
    script.onerror = () => reject(new Error('No se pudo cargar face-api.js'));
    document.head.appendChild(script);
  });

  return window.__faceApiLoading;
}

async function loadModels(faceapi: FaceApiModule): Promise<void> {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
}

export interface UseFaceApiResult {
  faceapi: FaceApiModule | null;
  ready: boolean;
  error: string | null;
}

export function useFaceApi(): UseFaceApiResult {
  const [faceapi, setFaceapi] = useState<FaceApiModule | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadScript()
      .then(async loaded => {
        await loadModels(loaded);
        if (!cancelled) setFaceapi(loaded);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Error cargando face-api.js');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { faceapi, ready: faceapi !== null, error };
}
