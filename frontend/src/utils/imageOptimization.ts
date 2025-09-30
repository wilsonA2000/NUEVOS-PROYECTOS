/**
 * Sistema avanzado de optimización de imágenes para VeriHome
 * Incluye: compresión, WebP, responsive, lazy loading, progressive loading
 */

// Tipos de soporte de formatos
interface ImageFormat {
  format: 'webp' | 'avif' | 'jpeg' | 'png' | 'gif';
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
}

interface ImageOptimizationOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
  progressive?: boolean;
  blur?: boolean;
  placeholder?: boolean;
  sizes?: string;
  srcSet?: boolean;
  lazy?: boolean;
}

interface ResponsiveImageSizes {
  thumbnail: { width: 150, height: 150 };
  small: { width: 300, height: 200 };
  medium: { width: 600, height: 400 };
  large: { width: 1200, height: 800 };
  xlarge: { width: 1920, height: 1080 };
}

const DEFAULT_SIZES: ResponsiveImageSizes = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 300, height: 200 },
  medium: { width: 600, height: 400 },
  large: { width: 1200, height: 800 },
  xlarge: { width: 1920, height: 1080 },
};

class ImageOptimizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Detectar soporte de formatos modernos
   */
  async detectFormatSupport(): Promise<{ webp: boolean; avif: boolean }> {
    const webp = await this.supportsFormat('webp');
    const avif = await this.supportsFormat('avif');
    
    return { webp, avif };
  }

  private supportsFormat(format: 'webp' | 'avif'): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      
      if (format === 'webp') {
        img.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
      } else if (format === 'avif') {
        img.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABUAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
      }
    });
  }

  /**
   * Comprimir imagen manteniendo calidad
   */
  async compressImage(
    file: File | Blob,
    options: ImageOptimizationOptions = {}
  ): Promise<Blob> {
    const {
      quality = 0.8,
      maxWidth = 1920,
      maxHeight = 1080,
      format = 'auto',
      progressive = true
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const { width, height } = this.calculateDimensions(
            img.width,
            img.height,
            maxWidth,
            maxHeight
          );

          this.canvas.width = width;
          this.canvas.height = height;

          // Aplicar filtros de optimización
          this.ctx.imageSmoothingEnabled = true;
          this.ctx.imageSmoothingQuality = 'high';

          // Dibujar imagen optimizada
          this.ctx.drawImage(img, 0, 0, width, height);

          // Determinar formato final
          const outputFormat = this.determineOutputFormat(format, file.type);

          // Convertir a blob
          this.canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Error al comprimir imagen'));
              }
            },
            outputFormat,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Error al cargar imagen'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generar múltiples tamaños responsivos
   */
  async generateResponsiveSizes(
    file: File | Blob,
    sizes: Partial<ResponsiveImageSizes> = DEFAULT_SIZES
  ): Promise<Record<string, Blob>> {
    const results: Record<string, Blob> = {};
    
    for (const [sizeName, dimensions] of Object.entries(sizes)) {
      try {
        const compressed = await this.compressImage(file, {
          maxWidth: dimensions.width,
          maxHeight: dimensions.height,
          quality: this.getQualityForSize(sizeName),
          format: 'webp'
        });
        
        results[sizeName] = compressed;
      } catch (error) {
        console.error(`Error generando tamaño ${sizeName}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Crear placeholder blur
   */
  async generateBlurPlaceholder(
    file: File | Blob,
    size = 20
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          this.canvas.width = size;
          this.canvas.height = size;
          
          // Aplicar blur
          this.ctx.filter = 'blur(2px)';
          this.ctx.drawImage(img, 0, 0, size, size);
          
          // Convertir a data URL
          const dataUrl = this.canvas.toDataURL('image/jpeg', 0.3);
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Error generando placeholder'));
      img.src = URL.createObjectURL(file);
    });
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let { width, height } = { width: originalWidth, height: originalHeight };
    
    // Mantener aspect ratio
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }
    
    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }
    
    return { width: Math.round(width), height: Math.round(height) };
  }

  private determineOutputFormat(format: string, originalType: string): string {
    if (format === 'auto') {
      // Usar WebP si es soportado, sino el formato original
      return this.supportsFormat('webp') ? 'image/webp' : originalType;
    }
    
    return `image/${format}`;
  }

  private getQualityForSize(sizeName: string): number {
    const qualityMap: Record<string, number> = {
      thumbnail: 0.7,
      small: 0.8,
      medium: 0.85,
      large: 0.9,
      xlarge: 0.95,
    };
    
    return qualityMap[sizeName] || 0.8;
  }
}

// Instancia global
const imageOptimizer = new ImageOptimizer();

/**
 * Hook para optimización de imágenes
 */
export function useImageOptimization() {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const optimizeImage = async (
    file: File,
    options?: ImageOptimizationOptions
  ): Promise<Blob> => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      setProgress(25);
      const optimized = await imageOptimizer.compressImage(file, options);
      setProgress(100);
      
      return optimized;
    } catch (error) {
      console.error('Error optimizando imagen:', error);
      throw error;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const generateResponsive = async (
    file: File,
    sizes?: Partial<ResponsiveImageSizes>
  ): Promise<Record<string, Blob>> => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      setProgress(25);
      const responsive = await imageOptimizer.generateResponsiveSizes(file, sizes);
      setProgress(100);
      
      return responsive;
    } catch (error) {
      console.error('Error generando imágenes responsivas:', error);
      throw error;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const generatePlaceholder = async (file: File): Promise<string> => {
    try {
      return await imageOptimizer.generateBlurPlaceholder(file);
    } catch (error) {
      console.error('Error generando placeholder:', error);
      throw error;
    }
  };

  return {
    optimizeImage,
    generateResponsive,
    generatePlaceholder,
    isProcessing,
    progress,
  };
}

/**
 * Utilidades para URLs de imágenes
 */
export const imageUtils = {
  /**
   * Convertir URL a diferentes formatos
   */
  convertUrl: (url: string, format: 'webp' | 'avif' | 'jpeg'): string => {
    if (!url || typeof url !== 'string') return url || '';
    const extension = format === 'jpeg' ? 'jpg' : format;
    return url.replace(/\.(jpg|jpeg|png|gif)$/i, `.${extension}`);
  },

  /**
   * Generar srcSet para imágenes responsivas
   */
  generateSrcSet: (baseUrl: string, sizes: string[]): string => {
    if (!baseUrl || typeof baseUrl !== 'string') return '';
    return sizes
      .map(size => `${imageUtils.addSizeToUrl(baseUrl, size)} ${size}w`)
      .join(', ');
  },

  /**
   * Agregar tamaño a URL (asumiendo un patrón específico)
   */
  addSizeToUrl: (url: string, size: string): string => {
    if (!url || typeof url !== 'string') return url || '';
    const extension = url.split('.').pop();
    const baseUrl = url.replace(/\.[^/.]+$/, '');
    return `${baseUrl}_${size}.${extension}`;
  },

  /**
   * Obtener placeholder optimizado
   */
  getPlaceholder: (width: number, height: number): string => {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#ccc">
          ${width}×${height}
        </text>
      </svg>
    `)}`;
  },

  /**
   * Detectar si la imagen está en viewport
   */
  isInViewport: (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },
};

/**
 * Hook para lazy loading de imágenes
 */
export function useLazyImage(src: string, options: { threshold?: number; rootMargin?: string } = {}) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);

  const { threshold = 0.1, rootMargin = '50px' } = options;

  React.useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(img);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  React.useEffect(() => {
    if (isInView && !isLoaded) {
      const img = new Image();
      
      img.onload = () => {
        setIsLoaded(true);
        setError(null);
      };
      
      img.onerror = () => {
        setError('Error al cargar imagen');
      };
      
      img.src = src;
    }
  }, [isInView, src, isLoaded]);

  return { imgRef, isLoaded, isInView, error };
}

/**
 * Hook para progressive image loading
 */
export function useProgressiveImage(lowQualitySrc: string, highQualitySrc: string) {
  const [currentSrc, setCurrentSrc] = React.useState(lowQualitySrc);
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      setCurrentSrc(highQualitySrc);
      setIsLoaded(true);
    };
    
    img.src = highQualitySrc;
  }, [highQualitySrc]);

  return { src: currentSrc, isLoaded };
}

// Exportar la instancia del optimizador
export { imageOptimizer };

// Importar React para los hooks
import React from 'react';