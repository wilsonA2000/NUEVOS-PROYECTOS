import React, { useState, useRef, useEffect } from 'react';
import { Box, Skeleton, CircularProgress } from '@mui/material';
import { useLazyImage, useProgressiveImage, imageUtils } from '../../utils/imageOptimization';

interface PropertyImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  aspectRatio?: string;
  borderRadius?: number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
  loading?: 'lazy' | 'eager';
  placeholder?: boolean;
  progressive?: boolean;
  webpSupport?: boolean;
  sizes?: string;
  srcSet?: string;
  quality?: 'low' | 'medium' | 'high';
  blur?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const PropertyImage: React.FC<PropertyImageProps> = ({
  src,
  alt,
  width = '100%',
  height = 200,
  aspectRatio,
  borderRadius = 8,
  objectFit = 'cover',
  loading = 'lazy',
  placeholder = true,
  progressive = false,
  webpSupport = true,
  sizes,
  srcSet,
  quality = 'medium',
  blur = false,
  onLoad,
  onError,
  onClick,
  className,
  style,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Generar URLs optimizadas
  const optimizedSrc = React.useMemo(() => {
    if (webpSupport) {
      return imageUtils.convertUrl(src, 'webp');
    }
    return src;
  }, [src, webpSupport]);

  // URLs para progressive loading
  const lowQualitySrc = React.useMemo(() => {
    if (progressive) {
      return imageUtils.addSizeToUrl(src, 'small');
    }
    return optimizedSrc;
  }, [src, progressive, optimizedSrc]);

  const highQualitySrc = React.useMemo(() => {
    if (progressive) {
      const qualityMap = {
        low: 'medium',
        medium: 'large',
        high: 'xlarge'
      };
      return imageUtils.addSizeToUrl(optimizedSrc, qualityMap[quality]);
    }
    return optimizedSrc;
  }, [optimizedSrc, progressive, quality]);

  // Hook para lazy loading
  const { imgRef: lazyRef, isLoaded: isLazyLoaded, isInView, error: lazyError } = useLazyImage(
    loading === 'lazy' ? highQualitySrc : optimizedSrc,
    { threshold: 0.1, rootMargin: '50px' }
  );

  // Hook para progressive loading
  const { src: progressiveSrc, isLoaded: isProgressiveLoaded } = useProgressiveImage(
    lowQualitySrc,
    highQualitySrc
  );

  // Determinar la fuente final
  const finalSrc = React.useMemo(() => {
    if (loading === 'eager') {
      return progressive ? progressiveSrc : optimizedSrc;
    }
    return isInView ? (progressive ? progressiveSrc : optimizedSrc) : null;
  }, [loading, progressive, progressiveSrc, optimizedSrc, isInView]);

  // Generar srcSet si no se proporciona
  const finalSrcSet = React.useMemo(() => {
    if (srcSet) return srcSet;
    
    if (webpSupport) {
      const baseSrc = imageUtils.convertUrl(src, 'webp');
      return imageUtils.generateSrcSet(baseSrc, ['300', '600', '900', '1200']);
    }
    
    return imageUtils.generateSrcSet(src, ['300', '600', '900', '1200']);
  }, [srcSet, src, webpSupport]);

  // Placeholder optimizado
  const placeholderSrc = React.useMemo(() => {
    const w = typeof width === 'number' ? width : 400;
    const h = typeof height === 'number' ? height : 300;
    return imageUtils.getPlaceholder(w, h);
  }, [width, height]);

  const handleLoad = () => {
    setImageLoaded(true);
    setShowLoader(false);
    onLoad?.();
  };

  const handleError = () => {
    setImageError(true);
    setShowLoader(false);
    onError?.();
  };

  const handleLoadStart = () => {
    setShowLoader(true);
  };

  // Combinar refs
  const combinedRef = (node: HTMLImageElement | null) => {
    if (imgRef.current !== node) {
      imgRef.current = node;
    }
    if (lazyRef.current !== node) {
      lazyRef.current = node;
    }
  };

  const containerStyle: React.CSSProperties = {
    width,
    height,
    aspectRatio,
    borderRadius,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f5f5f5',
    ...style,
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit,
    transition: 'opacity 0.3s ease, filter 0.3s ease',
    opacity: imageLoaded ? 1 : 0,
    filter: blur && !imageLoaded ? 'blur(5px)' : 'none',
  };

  const loaderStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 2,
  };

  return (
    <Box className={className} style={containerStyle} onClick={onClick}>
      {/* Placeholder/Skeleton */}
      {placeholder && !imageLoaded && !imageError && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          animation="wave"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            borderRadius: borderRadius / 8,
          }}
        />
      )}

      {/* Loader circular */}
      {showLoader && !imageLoaded && !imageError && (
        <Box style={loaderStyle}>
          <CircularProgress size={24} thickness={4} />
        </Box>
      )}

      {/* Imagen principal */}
      {finalSrc && !imageError && (
        <picture>
          {/* Source para WebP si es soportado */}
          {webpSupport && (
            <source
              srcSet={finalSrcSet}
              sizes={sizes || '(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw'}
              type="image/webp"
            />
          )}
          
          {/* Fallback para otros formatos */}
          <img
            ref={combinedRef}
            src={finalSrc}
            srcSet={finalSrcSet}
            sizes={sizes || '(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw'}
            alt={alt}
            style={imageStyle}
            onLoad={handleLoad}
            onError={handleError}
            onLoadStart={handleLoadStart}
            loading={loading}
            decoding="async"
          />
        </picture>
      )}

      {/* Error fallback */}
      {(imageError || lazyError) && (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f0f0f0',
            color: '#999',
            fontSize: '0.875rem',
            textAlign: 'center',
            padding: 2,
          }}
        >
          <Box sx={{ mb: 1, fontSize: '2rem' }}>📷</Box>
          <Box>Error al cargar imagen</Box>
          {/* Intentar cargar imagen de respaldo */}
          <Box
            component="button"
            onClick={() => {
              setImageError(false);
              setImageLoaded(false);
            }}
            sx={{
              mt: 1,
              padding: '4px 8px',
              fontSize: '0.75rem',
              backgroundColor: 'transparent',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#666',
              '&:hover': {
                backgroundColor: '#f5f5f5',
              },
            }}
          >
            Reintentar
          </Box>
        </Box>
      )}

      {/* Blur placeholder para progressive loading */}
      {progressive && !imageLoaded && finalSrc && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${placeholderSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(10px)',
            transform: 'scale(1.1)', // Para ocultar bordes del blur
            opacity: 0.7,
            zIndex: 1,
          }}
        />
      )}
    </Box>
  );
};

export default PropertyImage;