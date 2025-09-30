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
  console.log('🖼️ PropertyImage component render:', { src, alt, width, height });
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // ULTIMATE FIX: Absolute simplification - NO optimization interference
  const optimizedSrc = React.useMemo(() => {
    console.log('🔍 PropertyImage RAW INPUT:', { src, type: typeof src });
    
    if (!src || typeof src !== 'string' || src.trim() === '') {
      console.log('❌ PropertyImage: Invalid/empty src, using placeholder');
      return '/placeholder-property.jpg';
    }
    
    const cleanSrc = src.trim();
    console.log('🧼 PropertyImage CLEANED SRC:', cleanSrc);
    
    // ZERO INTERFERENCE: All HTTP URLs pass through untouched
    if (cleanSrc.startsWith('http://') || cleanSrc.startsWith('https://')) {
      console.log('🚀 PropertyImage: HTTP URL DIRECT PASSTHROUGH:', cleanSrc);
      return cleanSrc;
    }
    
    // For relative URLs, prefix with base URL
    if (cleanSrc.startsWith('/media/') || cleanSrc.startsWith('media/')) {
      const baseUrl = 'http://127.0.0.1:8001';
      const fullUrl = baseUrl + (cleanSrc.startsWith('/') ? cleanSrc : '/' + cleanSrc);
      console.log('🔗 PropertyImage: RELATIVE TO ABSOLUTE:', { cleanSrc, fullUrl });
      return fullUrl;
    }
    
    // Fallback for any other path format
    console.log('✅ PropertyImage: Using original src as fallback:', cleanSrc);
    return cleanSrc;
  }, [src]);

  // URLs para progressive loading - SIMPLIFICADO
  const lowQualitySrc = React.useMemo(() => {
    if (!progressive || !optimizedSrc) return optimizedSrc;
    
    // Solo aplicar progressive loading si imageUtils está disponible
    if (imageUtils?.addSizeToUrl) {
      try {
        return imageUtils.addSizeToUrl(optimizedSrc, 'small');
      } catch (error) {
        console.log('⚠️ PropertyImage: Progressive loading failed, using original');
        return optimizedSrc;
      }
    }
    return optimizedSrc;
  }, [progressive, optimizedSrc]);

  const highQualitySrc = React.useMemo(() => {
    if (!progressive || !optimizedSrc) return optimizedSrc;
    
    // Solo aplicar progressive loading si imageUtils está disponible
    if (imageUtils?.addSizeToUrl) {
      try {
        const qualityMap = {
          low: 'medium',
          medium: 'large',
          high: 'xlarge'
        };
        return imageUtils.addSizeToUrl(optimizedSrc, qualityMap[quality]);
      } catch (error) {
        console.log('⚠️ PropertyImage: High quality loading failed, using original');
        return optimizedSrc;
      }
    }
    return optimizedSrc;
  }, [progressive, optimizedSrc, quality]);

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

  // ULTIMATE ENGINEERING: Zero-complexity source determination
  const finalSrc = React.useMemo(() => {
    console.log('🎯 PropertyImage FINAL SRC DETERMINATION:', { optimizedSrc, loading, isInView });
    
    // Fail fast on invalid sources
    if (!optimizedSrc || typeof optimizedSrc !== 'string' || optimizedSrc.trim() === '') {
      console.log('❌ PropertyImage: Invalid final source, using placeholder');
      return '/placeholder-property.jpg';
    }
    
    // Skip lazy loading check for now to debug
    // if (loading === 'lazy' && !isInView) {
    //   return null;
    // }
    
    // Direct return - no more complexity
    console.log('✅ PropertyImage: USING FINAL SRC:', optimizedSrc);
    return optimizedSrc;
  }, [optimizedSrc]);

  // DISABLE SRCSET FOR DEBUGGING
  const finalSrcSet = undefined;

  // Placeholder optimizado
  const placeholderSrc = React.useMemo(() => {
    const w = typeof width === 'number' ? width : 400;
    const h = typeof height === 'number' ? height : 300;
    return imageUtils.getPlaceholder(w, h);
  }, [width, height]);

  const handleLoad = () => {
    console.log('✅ PropertyImage loaded successfully:', src);
    setImageLoaded(true);
    setShowLoader(false);
    onLoad?.();
  };

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const imgElement = event.target as HTMLImageElement;
    console.error('❌ PropertyImage LOAD FAILED:', {
      originalSrc: src,
      finalSrc: finalSrc,
      imageSrc: imgElement.src,
      errorType: 'Image load error',
      timestamp: new Date().toISOString()
    });
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

      {/* SIMPLIFIED IMAGE - NO PICTURE ELEMENT */}
      {finalSrc && !imageError && (
        <img
          ref={combinedRef}
          src={finalSrc}
          alt={alt}
          style={imageStyle}
          onLoad={handleLoad}
          onError={handleError}
          onLoadStart={handleLoadStart}
          loading="eager"
          decoding="async"
        />
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