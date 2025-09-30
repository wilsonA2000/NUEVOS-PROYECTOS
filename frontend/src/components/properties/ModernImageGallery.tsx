/**
 * Modern Image Gallery Component
 * Features: Smooth transitions, Lightbox, Zoom, Touch gestures, Keyboard navigation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Dialog,
  DialogContent,
  Fade,
  Zoom,
  useMediaQuery,
  useTheme,
  Stack,
  Chip,
  Backdrop,
  ButtonBase,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import {
  Close as CloseIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  PhotoCamera as PhotoIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { keyframes, styled } from '@mui/material/styles';
import { useSwipeable } from 'react-swipeable';

// Animations
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const thumbnailHover = keyframes`
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.1);
  }
`;

// Styled Components
const MainImageContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: 500,
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
  backgroundColor: theme.palette.grey[100],
  cursor: 'pointer',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  
  '&:hover': {
    transform: 'scale(1.02)',
    boxShadow: `0 20px 40px ${theme.palette.common.black}30`,
    '& .image-overlay': {
      opacity: 1,
    },
    '& .zoom-indicator': {
      opacity: 1,
    },
  },

  [theme.breakpoints.down('md')]: {
    height: 400,
  },
  [theme.breakpoints.down('sm')]: {
    height: 300,
  },
}));

const MainImage = styled('img')(({ theme }) => ({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
  animation: `${scaleIn} 0.6s ease-out`,
}));

const ImageOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.6) 100%)',
  opacity: 0,
  transition: 'opacity 0.3s ease',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
}));

const ZoomIndicator = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: theme.palette.common.white,
  borderRadius: '50%',
  width: 60,
  height: 60,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0,
  transition: 'opacity 0.3s ease',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
}));

const ThumbnailContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  overflowX: 'auto',
  overflowY: 'hidden',
  padding: theme.spacing(1, 0),
  marginTop: theme.spacing(2),
  scrollbarWidth: 'thin',
  scrollbarColor: `${theme.palette.primary.main} ${theme.palette.grey[200]}`,
  
  '&::-webkit-scrollbar': {
    height: 8,
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.grey[200],
    borderRadius: 4,
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.primary.main,
    borderRadius: 4,
    '&:hover': {
      background: theme.palette.primary.dark,
    },
  },
}));

const ThumbnailCard = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive: boolean }>(({ theme, isActive }) => ({
  position: 'relative',
  width: 80,
  height: 60,
  minWidth: 80,
  borderRadius: theme.spacing(1),
  overflow: 'hidden',
  border: `3px solid ${isActive ? theme.palette.primary.main : 'transparent'}`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  animation: `${fadeInUp} 0.4s ease-out`,
  
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 8px 24px ${theme.palette.common.black}25`,
    border: `3px solid ${theme.palette.primary.main}`,
  },

  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s ease',
  },

  '&:hover img': {
    transform: 'scale(1.1)',
  },
}));

const LightboxContainer = styled(DialogContent)(({ theme }) => ({
  padding: 0,
  backgroundColor: theme.palette.common.black,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  minHeight: '100vh',
  overflow: 'hidden',
}));

const LightboxImage = styled('img')<{ zoom: number }>(({ zoom }) => ({
  maxWidth: '90vw',
  maxHeight: '90vh',
  objectFit: 'contain',
  transform: `scale(${zoom})`,
  transition: 'transform 0.3s ease',
  cursor: zoom > 1 ? 'grab' : 'zoom-in',
  
  '&:active': {
    cursor: zoom > 1 ? 'grabbing' : 'zoom-in',
  },
}));

const LightboxControls = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  display: 'flex',
  gap: theme.spacing(1),
  zIndex: 1,
}));

const NavigationButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  backgroundColor: 'rgba(255,255,255,0.9)',
  color: theme.palette.common.black,
  width: 56,
  height: 56,
  zIndex: 1,
  transition: 'all 0.3s ease',
  
  '&:hover': {
    backgroundColor: theme.palette.common.white,
    transform: 'translateY(-50%) scale(1.1)',
  },

  [theme.breakpoints.down('sm')]: {
    width: 48,
    height: 48,
  },
}));

const ImageCounter = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(2),
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: 'rgba(0,0,0,0.7)',
  color: theme.palette.common.white,
  padding: theme.spacing(1, 2),
  borderRadius: theme.spacing(3),
  fontSize: '0.875rem',
  fontWeight: 500,
}));

const ControlButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: 'rgba(255,255,255,0.9)',
  color: theme.palette.common.black,
  margin: theme.spacing(0.5),
  
  '&:hover': {
    backgroundColor: theme.palette.common.white,
  },
}));

interface PropertyImage {
  id: string;
  image?: string;
  image_url: string;
  caption?: string;
  is_main?: boolean;
}

interface ModernImageGalleryProps {
  images: PropertyImage[];
  title?: string;
  initialIndex?: number;
  onImageChange?: (index: number) => void;
  className?: string;
}

export const ModernImageGallery: React.FC<ModernImageGalleryProps> = ({
  images = [],
  title,
  initialIndex = 0,
  onImageChange,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const imageRef = useRef<HTMLImageElement>(null);

  // Sort images to show main image first
  const sortedImages = React.useMemo(() => {
    if (!images || images.length === 0) return [];
    const mainImage = images.find(img => img.is_main);
    const otherImages = images.filter(img => !img.is_main);
    return mainImage ? [mainImage, ...otherImages] : images;
  }, [images]);

  const currentImage = sortedImages[currentIndex];

  // Navigation functions
  const goToNext = useCallback(() => {
    if (sortedImages.length > 1) {
      const nextIndex = (currentIndex + 1) % sortedImages.length;
      setCurrentIndex(nextIndex);
      onImageChange?.(nextIndex);
    }
  }, [currentIndex, sortedImages.length, onImageChange]);

  const goToPrevious = useCallback(() => {
    if (sortedImages.length > 1) {
      const prevIndex = currentIndex === 0 ? sortedImages.length - 1 : currentIndex - 1;
      setCurrentIndex(prevIndex);
      onImageChange?.(prevIndex);
    }
  }, [currentIndex, sortedImages.length, onImageChange]);

  const goToImage = useCallback((index: number) => {
    setCurrentIndex(index);
    onImageChange?.(index);
  }, [onImageChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          setLightboxOpen(false);
          break;
        case '=':
        case '+':
          setZoom(prev => Math.min(prev + 0.5, 3));
          break;
        case '-':
          setZoom(prev => Math.max(prev - 0.5, 0.5));
          break;
        case '0':
          setZoom(1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [lightboxOpen, goToNext, goToPrevious]);

  // Touch gestures
  const swipeHandlers = useSwipeable({
    onSwipedLeft: goToNext,
    onSwipedRight: goToPrevious,
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  // Fullscreen API
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // Download image
  const downloadImage = useCallback(() => {
    if (currentImage?.image_url) {
      const link = document.createElement('a');
      link.href = currentImage.image_url;
      link.download = `property-image-${currentIndex + 1}.jpg`;
      link.click();
    }
  }, [currentImage, currentIndex]);

  // Reset zoom when image changes
  useEffect(() => {
    setZoom(1);
    setImageLoading(true);
    setImageError(false);
  }, [currentIndex]);

  if (!sortedImages.length) {
    return (
      <Box
        className={className}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 300,
          backgroundColor: 'grey.100',
          borderRadius: 2,
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <PhotoIcon sx={{ fontSize: 64, color: 'grey.400' }} />
        <Typography color="text.secondary">
          No hay imágenes disponibles
        </Typography>
      </Box>
    );
  }

  return (
    <Box className={className}>
      {/* Main Image */}
      <MainImageContainer onClick={() => setLightboxOpen(true)}>
        {imageLoading && (
          <Skeleton
            variant="rectangular"
            width="100%"
            height="100%"
            animation="wave"
          />
        )}
        
        {imageError ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              flexDirection: 'column',
              gap: 2,
              color: 'text.secondary',
            }}
          >
            <PhotoIcon sx={{ fontSize: 64 }} />
            <Typography>Error al cargar imagen</Typography>
          </Box>
        ) : (
          <MainImage
            src={currentImage?.image_url || currentImage?.image}
            alt={currentImage?.caption || `Imagen ${currentIndex + 1}`}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            style={{ display: imageLoading ? 'none' : 'block' }}
          />
        )}
        
        {/* Image Overlay */}
        <ImageOverlay className="image-overlay">
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Chip
              label={`${currentIndex + 1} de ${sortedImages.length}`}
              size="small"
              sx={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                fontWeight: 500,
              }}
            />
            {currentImage?.is_main && (
              <Chip
                label="Principal"
                size="small"
                sx={{
                  backgroundColor: theme.palette.warning.main,
                  color: theme.palette.warning.contrastText,
                  fontWeight: 500,
                }}
              />
            )}
          </Box>
          
          <Box>
            {currentImage?.caption && (
              <Typography
                variant="body2"
                sx={{
                  color: 'white',
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  fontWeight: 500,
                }}
              >
                {currentImage.caption}
              </Typography>
            )}
          </Box>
        </ImageOverlay>
        
        {/* Zoom Indicator */}
        <ZoomIndicator className="zoom-indicator">
          <ZoomInIcon sx={{ color: 'text.secondary' }} />
        </ZoomIndicator>
        
        {/* Navigation Arrows */}
        {sortedImages.length > 1 && (
          <>
            <NavigationButton
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              sx={{ left: 16 }}
              size="large"
            >
              <PrevIcon />
            </NavigationButton>
            
            <NavigationButton
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              sx={{ right: 16 }}
              size="large"
            >
              <NextIcon />
            </NavigationButton>
          </>
        )}
      </MainImageContainer>

      {/* Thumbnails */}
      {sortedImages.length > 1 && (
        <ThumbnailContainer>
          {sortedImages.map((image, index) => (
            <ThumbnailCard
              key={image.id}
              isActive={index === currentIndex}
              onClick={() => goToImage(index)}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <img
                src={image.image_url || image.image}
                alt={image.caption || `Thumbnail ${index + 1}`}
                loading="lazy"
              />
            </ThumbnailCard>
          ))}
        </ThumbnailContainer>
      )}

      {/* Lightbox Modal */}
      <Dialog
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        maxWidth={false}
        fullScreen
        TransitionComponent={Zoom}
        TransitionProps={{
          timeout: 400,
        }}
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
          },
        }}
      >
        <Backdrop open sx={{ backgroundColor: 'rgba(0,0,0,0.95)' }}>
          <LightboxContainer {...swipeHandlers}>
            {/* Controls */}
            <LightboxControls>
              <ControlButton
                onClick={() => setZoom(prev => Math.min(prev + 0.5, 3))}
                disabled={zoom >= 3}
              >
                <ZoomInIcon />
              </ControlButton>
              
              <ControlButton
                onClick={() => setZoom(prev => Math.max(prev - 0.5, 0.5))}
                disabled={zoom <= 0.5}
              >
                <ZoomOutIcon />
              </ControlButton>
              
              <ControlButton onClick={downloadImage}>
                <DownloadIcon />
              </ControlButton>
              
              <ControlButton onClick={toggleFullscreen}>
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </ControlButton>
              
              <ControlButton
                onClick={() => setLightboxOpen(false)}
                sx={{
                  backgroundColor: 'rgba(244,67,54,0.9)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(244,67,54,1)',
                  },
                }}
              >
                <CloseIcon />
              </ControlButton>
            </LightboxControls>

            {/* Main Lightbox Image */}
            {currentImage && (
              <LightboxImage
                ref={imageRef}
                src={currentImage.image_url || currentImage.image}
                alt={currentImage.caption || `Imagen ${currentIndex + 1}`}
                zoom={zoom}
                onClick={() => setZoom(zoom === 1 ? 2 : 1)}
              />
            )}

            {/* Navigation Arrows */}
            {sortedImages.length > 1 && (
              <>
                <NavigationButton
                  onClick={goToPrevious}
                  sx={{ left: 24 }}
                  size="large"
                >
                  <PrevIcon />
                </NavigationButton>
                
                <NavigationButton
                  onClick={goToNext}
                  sx={{ right: 24 }}
                  size="large"
                >
                  <NextIcon />
                </NavigationButton>
              </>
            )}

            {/* Image Counter */}
            <ImageCounter>
              {currentIndex + 1} de {sortedImages.length}
              {currentImage?.caption && ` - ${currentImage.caption}`}
            </ImageCounter>
          </LightboxContainer>
        </Backdrop>
      </Dialog>
    </Box>
  );
};

export default ModernImageGallery;