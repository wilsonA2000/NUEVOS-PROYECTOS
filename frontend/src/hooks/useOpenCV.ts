/**
 * Lazy-load de OpenCV.js vía CDN.
 *
 * OpenCV.js pesa ~8MB. Cargarlo sólo cuando un componente lo necesite
 * (CedulaCapture y futuros) evita inflar el bundle inicial. El script
 * se inyecta una sola vez globalmente; instancias subsecuentes del hook
 * resuelven inmediatamente.
 */

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    cv?: OpenCVModule;
    __openCVLoading?: Promise<OpenCVModule>;
  }
}

export interface OpenCVModule {
  Mat: new () => OpenCVMat;
  matFromImageData: (imageData: ImageData) => OpenCVMat;
  cvtColor: (src: OpenCVMat, dst: OpenCVMat, code: number) => void;
  Canny: (
    src: OpenCVMat,
    dst: OpenCVMat,
    threshold1: number,
    threshold2: number,
  ) => void;
  findContours: (
    src: OpenCVMat,
    contours: OpenCVMatVector,
    hierarchy: OpenCVMat,
    mode: number,
    method: number,
  ) => void;
  contourArea: (contour: OpenCVMat) => number;
  approxPolyDP: (
    curve: OpenCVMat,
    approxCurve: OpenCVMat,
    epsilon: number,
    closed: boolean,
  ) => void;
  arcLength: (curve: OpenCVMat, closed: boolean) => number;
  boundingRect: (contour: OpenCVMat) => OpenCVRect;
  MatVector: new () => OpenCVMatVector;
  COLOR_RGBA2GRAY: number;
  COLOR_RGBA2RGB: number;
  RETR_EXTERNAL: number;
  CHAIN_APPROX_SIMPLE: number;
  GaussianBlur: (
    src: OpenCVMat,
    dst: OpenCVMat,
    ksize: { width: number; height: number },
    sigmaX: number,
  ) => void;
  Size: new (
    width: number,
    height: number,
  ) => { width: number; height: number };
}

export interface OpenCVMat {
  delete: () => void;
  rows: number;
  cols: number;
  data: Uint8ClampedArray;
  data32S: Int32Array;
}

export interface OpenCVMatVector {
  delete: () => void;
  size: () => number;
  get: (index: number) => OpenCVMat;
}

export interface OpenCVRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// opencv.js (oficial 4.13.0, ~11MB, wasm embebido) se sirve SELF-HOSTED desde
// el mismo origen (public/vendor/opencv.js → nginx). Antes se bajaba de
// docs.opencv.org/4.x, que: (a) hace 301 a /4.13.0, (b) no tiene edge local y
// (c) 11MB sin timeout → el usuario quedaba en "Cargando…" infinito. Mismo
// origen = rápido, sin redirect, funciona offline (crítico para identidad).
const CDN_URL = '/vendor/opencv.js';

// Si la carga (10 MB + init WASM) no termina en este tiempo, fallamos con error
// claro en vez de dejar al usuario en un spinner infinito.
const LOAD_TIMEOUT_MS = 45_000;

function loadOpenCV(): Promise<OpenCVModule> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('OpenCV.js requires browser environment'));
  }

  if (window.cv && (window.cv as { Mat?: unknown }).Mat) {
    return Promise.resolve(window.cv as OpenCVModule);
  }

  if (window.__openCVLoading) {
    return window.__openCVLoading;
  }

  window.__openCVLoading = new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      // Permitir reintento: si quedó cacheada una promesa rechazada, los
      // siguientes montajes fallarían para siempre.
      delete window.__openCVLoading;
      reject(new Error('OpenCV.js tardó demasiado en cargar (timeout)'));
    }, LOAD_TIMEOUT_MS);

    const done = (cv: OpenCVModule) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(cv);
    };
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      delete window.__openCVLoading;
      reject(err);
    };

    const script = document.createElement('script');
    script.src = CDN_URL;
    script.async = true;

    script.onload = () => {
      const checkReady = () => {
        if (settled) return;
        const cv = window.cv as
          | { Mat?: unknown; onRuntimeInitialized?: () => void }
          | undefined;
        if (cv && cv.Mat) {
          done(window.cv as OpenCVModule);
          return;
        }
        if (cv) {
          cv.onRuntimeInitialized = () => done(window.cv as OpenCVModule);
          return;
        }
        setTimeout(checkReady, 100);
      };
      checkReady();
    };

    script.onerror = () =>
      fail(new Error('No se pudo cargar OpenCV.js desde CDN'));
    document.head.appendChild(script);
  });

  return window.__openCVLoading;
}

export interface UseOpenCVResult {
  cv: OpenCVModule | null;
  ready: boolean;
  error: string | null;
}

export function useOpenCV(): UseOpenCVResult {
  const [cv, setCv] = useState<OpenCVModule | null>(
    typeof window !== 'undefined' &&
      window.cv &&
      (window.cv as { Mat?: unknown }).Mat
      ? (window.cv as OpenCVModule)
      : null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cv) return;

    let cancelled = false;

    loadOpenCV()
      .then(loaded => {
        if (!cancelled) setCv(loaded);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Error cargando OpenCV.js');
      });

    return () => {
      cancelled = true;
    };
  }, [cv]);

  return { cv, ready: cv !== null, error };
}
