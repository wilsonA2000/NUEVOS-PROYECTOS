/**
 * Lazy-load de Tesseract.js vía CDN para OCR client-side.
 *
 * Tesseract.js pesa ~10MB + corpus de idiomas. Carga sólo cuando se
 * monta un componente que lo usa. La interfaz expuesta es minimalista:
 * `recognize(image, lang)` → string. La construcción del worker
 * persiste entre invocaciones (`tesseract.createWorker` es costoso).
 */

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    Tesseract?: TesseractGlobal;
    __tesseractLoading?: Promise<TesseractGlobal>;
  }
}

interface TesseractGlobal {
  createWorker: (
    lang?: string,
    oem?: number,
    options?: Record<string, unknown>,
  ) => Promise<TesseractWorker>;
}

interface TesseractWorker {
  recognize: (
    image: string | HTMLCanvasElement | ImageData,
  ) => Promise<{ data: { text: string; lines: Array<{ text: string }> } }>;
  terminate: () => Promise<void>;
}

const CDN_URL = 'https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js';

function loadTesseract(): Promise<TesseractGlobal> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Tesseract.js requires browser'));
  }
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (window.__tesseractLoading) return window.__tesseractLoading;

  window.__tesseractLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CDN_URL;
    script.async = true;
    script.onload = () => {
      if (window.Tesseract) {
        resolve(window.Tesseract);
      } else {
        reject(new Error('Tesseract no inicializó tras carga del script'));
      }
    };
    script.onerror = () => reject(new Error('No se pudo cargar Tesseract.js desde CDN'));
    document.head.appendChild(script);
  });

  return window.__tesseractLoading;
}

export interface UseTesseractResult {
  recognize: (
    image: string | HTMLCanvasElement | ImageData,
  ) => Promise<{ text: string; lines: string[] }>;
  ready: boolean;
  error: string | null;
}

export function useTesseract(lang = 'spa'): UseTesseractResult {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<TesseractWorker | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadTesseract()
      .then(async tesseract => {
        const worker = await tesseract.createWorker(lang);
        if (cancelled) {
          await worker.terminate();
          return;
        }
        workerRef.current = worker;
        setReady(true);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Error cargando Tesseract.js');
      });

    return () => {
      cancelled = true;
      if (workerRef.current) {
        workerRef.current.terminate().catch(() => {});
        workerRef.current = null;
      }
    };
  }, [lang]);

  const recognize = async (
    image: string | HTMLCanvasElement | ImageData,
  ): Promise<{ text: string; lines: string[] }> => {
    if (!workerRef.current) {
      throw new Error('Tesseract worker no está listo');
    }
    const result = await workerRef.current.recognize(image);
    const lines = result.data.lines.map(l => l.text.trim()).filter(Boolean);
    return { text: result.data.text, lines };
  };

  return { recognize, ready, error };
}
