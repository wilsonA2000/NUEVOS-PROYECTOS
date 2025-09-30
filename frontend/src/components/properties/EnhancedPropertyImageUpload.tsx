/**
 * Enhanced Property Image Upload System
 * Features: Modern UX, Smooth Animations, Real-time Preview, Smart Compression
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogContent,
  Tooltip,
  useMediaQuery,
  useTheme,
  Fade,
  Zoom,
  Slide,
  Stack,
  CircularProgress,
  Backdrop,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Visibility as PreviewIcon,
  DragIndicator as DragIcon,
  PhotoCamera as CameraIcon,
  Image as ImageIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Compress as CompressIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { keyframes, styled } from '@mui/material/styles';

// Animations
const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const shimmerAnimation = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const uploadAnimation = keyframes`
  0% { transform: translateY(100%) scale(0.8); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
`;

// Styled Components
const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isDragActive' && prop !== 'hasImages',
})<{ isDragActive: boolean; hasImages: boolean }>(({ theme, isDragActive, hasImages }) => ({
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.spacing(2),
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  background: isDragActive 
    ? `linear-gradient(135deg, ${theme.palette.primary.main}10, ${theme.palette.primary.main}20)`
    : hasImages ? 'transparent' : theme.palette.background.default,
  minHeight: hasImages ? 120 : 200,
  position: 'relative',
  overflow: 'hidden',
  
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: `${theme.palette.primary.main}08`,
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 24px ${theme.palette.primary.main}20`,
  },

  '&::before': isDragActive ? {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}30, transparent)`,
    animation: `${shimmerAnimation} 1.5s infinite`,
  } : {},
}));

const ImageCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: theme.spacing(1.5),
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: 'pointer',
  animation: `${uploadAnimation} 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)`,
  
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: `0 12px 32px ${theme.palette.common.black}20`,
    '& .image-overlay': {
      opacity: 1,
    },
    '& .image-actions': {
      transform: 'translateY(0)',
    },
  },
}));

const ImageOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.8) 100%)',
  opacity: 0,
  transition: 'opacity 0.3s ease',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: theme.spacing(1),
}));

const ImageActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  justifyContent: 'center',
  transform: 'translateY(20px)',
  transition: 'transform 0.3s ease',
}));

const UploadProgress = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  background: theme.palette.background.paper,
  padding: theme.spacing(1),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const CompressionChip = styled(Chip)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  background: theme.palette.success.main,
  color: theme.palette.success.contrastText,
  fontSize: '0.75rem',
  height: 24,
  animation: `${pulseAnimation} 2s infinite`,
}));

const MainImageBadge = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  left: theme.spacing(1),
  background: theme.palette.warning.main,
  color: theme.palette.warning.contrastText,
  borderRadius: theme.spacing(3),
  padding: theme.spacing(0.5, 1),
  fontSize: '0.75rem',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  zIndex: 2,
}));

interface ImageFile {
  id: string;
  file?: File;
  url: string;
  isMain: boolean;
  uploading?: boolean;
  progress?: number;
  error?: string;
  compressed?: boolean;
  originalSize?: number;
  compressedSize?: number;
}

interface EnhancedPropertyImageUploadProps {
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  maxImages?: number;
  maxSize?: number;
  disabled?: boolean;
  quality?: number;
  autoCompress?: boolean;
}

export const EnhancedPropertyImageUpload: React.FC<EnhancedPropertyImageUploadProps> = ({
  images,
  onImagesChange,
  maxImages = 20,
  maxSize = 5 * 1024 * 1024, // 5MB
  disabled = false,
  quality = 0.8,
  autoCompress = true,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Image compression utility
  const compressImage = useCallback(async (file: File, targetQuality = quality): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate optimal dimensions
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Apply high-quality scaling
        ctx!.imageSmoothingEnabled = true;
        ctx!.imageSmoothingQuality = 'high';
        ctx!.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with quality
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          targetQuality
        );
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, [quality]);

  const handleFileSelect = useCallback(
    async (files: FileList) => {
      if (disabled || images.length >= maxImages) return;

      const remainingSlots = maxImages - images.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      const newImages: ImageFile[] = [];

      setUploadingCount(filesToProcess.length);

      for (const [index, file] of filesToProcess.entries()) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          console.error('Invalid file type:', file.type);
          continue;
        }

        // Validate file size
        if (file.size > maxSize) {
          console.error('File too large:', file.size);
          continue;
        }

        const imageId = `upload-${Date.now()}-${index}`;
        const originalSize = file.size;
        
        // Compress image if needed
        let processedFile = file;
        let compressed = false;
        
        if (autoCompress && file.size > 500 * 1024) { // Compress files larger than 500KB
          try {
            processedFile = await compressImage(file);
            compressed = true;
          } catch (error) {
            console.error('Compression failed:', error);
          }
        }

        const url = URL.createObjectURL(processedFile);
        
        const newImage: ImageFile = {
          id: imageId,
          file: processedFile,
          url,
          isMain: images.length === 0 && index === 0,
          uploading: true,
          progress: 0,
          compressed,
          originalSize,
          compressedSize: processedFile.size,
        };

        newImages.push(newImage);
        
        // Simulate upload progress
        const simulateUpload = () => {
          let progress = 0;
          const interval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress >= 100) {
              progress = 100;
              clearInterval(interval);
              
              // Mark as uploaded
              onImagesChange([
                ...images,
                ...newImages.slice(0, index),
                { ...newImage, uploading: false, progress: 100 },
                ...newImages.slice(index + 1),
              ]);
              
              setUploadingCount(prev => Math.max(0, prev - 1));
            } else {
              // Update progress
              onImagesChange([
                ...images,
                ...newImages.slice(0, index),
                { ...newImage, progress },
                ...newImages.slice(index + 1),
              ]);
            }
          }, 200);
        };
        
        // Start upload simulation
        setTimeout(simulateUpload, index * 100);
      }

      // Add all new images immediately
      onImagesChange([...images, ...newImages]);
    },
    [images, onImagesChange, maxImages, maxSize, disabled, autoCompress, compressImage]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        handleFileSelect(files);
      }
      // Reset input
      e.target.value = '';
    },
    [handleFileSelect]
  );

  const handleImageDelete = useCallback(
    (imageId: string) => {
      const updatedImages = images.filter(img => img.id !== imageId);
      
      // If deleted image was main, make first image main
      if (updatedImages.length > 0) {
        const wasMain = images.find(img => img.id === imageId)?.isMain;
        if (wasMain) {
          updatedImages[0].isMain = true;
        }
      }
      
      onImagesChange(updatedImages);
    },
    [images, onImagesChange]
  );

  const handleSetMainImage = useCallback(
    (imageId: string) => {
      const updatedImages = images.map(img => ({
        ...img,
        isMain: img.id === imageId,
      }));
      onImagesChange(updatedImages);
    },
    [images, onImagesChange]
  );

  const handleDragEnd = useCallback(
    (result: any) => {
      if (!result.destination) return;

      const reorderedImages = Array.from(images);
      const [movedImage] = reorderedImages.splice(result.source.index, 1);
      reorderedImages.splice(result.destination.index, 0, movedImage);

      onImagesChange(reorderedImages);
    },
    [images, onImagesChange]
  );

  const getSavingsPercentage = (original?: number, compressed?: number) => {
    if (!original || !compressed) return 0;
    return Math.round(((original - compressed) / original) * 100);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Box>
      {/* Upload Zone */}
      <DropZone
        isDragActive={dragActive}
        hasImages={images.length > 0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={disabled || images.length >= maxImages}
        />
        
        <Stack spacing={2} alignItems="center">
          {dragActive ? (
            <Zoom in>
              <Box>
                <SpeedIcon sx={{ fontSize: 48, color: 'primary.main' }} />
              </Box>
            </Zoom>
          ) : (
            <Fade in>
              <Box>
                <UploadIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
              </Box>
            </Fade>
          )}
          
          <Box textAlign="center">
            <Typography variant="h6" gutterBottom>
              {dragActive
                ? '¡Suelta las imágenes aquí!'
                : images.length === 0
                ? 'Arrastra imágenes aquí o haz clic para seleccionar'
                : `Agregar más imágenes (${images.length}/${maxImages})`}
            </Typography>
            
            {!dragActive && (
              <Typography variant="body2" color="text.secondary">
                Formatos: JPG, PNG, WebP • Máximo {formatFileSize(maxSize)} cada una
                {autoCompress && ' • Compresión automática habilitada'}
              </Typography>
            )}
          </Box>

          {uploadingCount > 0 && (
            <Slide direction="up" in>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CircularProgress size={16} />
                  <Typography variant="body2">
                    Procesando {uploadingCount} imagen{uploadingCount > 1 ? 'es' : ''}...
                  </Typography>
                </Stack>
              </Alert>
            </Slide>
          )}
        </Stack>
      </DropZone>

      {/* Images Grid */}
      {images.length > 0 && (
        <Box mt={3}>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="images" direction="horizontal">
              {(provided) => (
                <Grid
                  container
                  spacing={2}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {images.map((image, index) => (
                    <Draggable key={image.id} draggableId={image.id} index={index}>
                      {(provided, snapshot) => (
                        <Grid
                          item
                          xs={6}
                          sm={4}
                          md={3}
                          lg={2}
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <ImageCard
                            sx={{
                              transform: snapshot.isDragging
                                ? 'rotate(5deg) scale(1.05)'
                                : undefined,
                              zIndex: snapshot.isDragging ? 1000 : 1,
                            }}
                          >
                            <Box
                              sx={{
                                position: 'relative',
                                paddingBottom: '75%', // 4:3 aspect ratio
                                overflow: 'hidden',
                              }}
                            >
                              <Box
                                component="img"
                                src={image.url}
                                alt={`Image ${index + 1}`}
                                sx={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  transition: 'transform 0.3s ease',
                                }}
                              />
                              
                              {/* Main image badge */}
                              {image.isMain && (
                                <MainImageBadge>
                                  <StarIcon sx={{ fontSize: 14 }} />
                                  Principal
                                </MainImageBadge>
                              )}
                              
                              {/* Compression badge */}
                              {image.compressed && (
                                <CompressionChip
                                  icon={<CompressIcon sx={{ fontSize: 14 }} />}
                                  label={`-${getSavingsPercentage(image.originalSize, image.compressedSize)}%`}
                                  size="small"
                                />
                              )}
                              
                              {/* Overlay */}
                              <ImageOverlay className="image-overlay">
                                <Box />
                                <ImageActions className="image-actions">
                                  <Tooltip title="Vista previa">
                                    <IconButton
                                      size="small"
                                      onClick={() => setPreviewImage(image.url)}
                                      sx={{
                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                        '&:hover': { backgroundColor: 'white' },
                                      }}
                                    >
                                      <PreviewIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  
                                  <Tooltip title={image.isMain ? 'Es imagen principal' : 'Marcar como principal'}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleSetMainImage(image.id)}
                                      sx={{
                                        backgroundColor: image.isMain 
                                          ? 'rgba(255,193,7,0.9)' 
                                          : 'rgba(255,255,255,0.9)',
                                        color: image.isMain ? 'white' : 'inherit',
                                        '&:hover': { 
                                          backgroundColor: image.isMain 
                                            ? 'rgba(255,193,7,1)' 
                                            : 'white' 
                                        },
                                      }}
                                    >
                                      {image.isMain ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                                    </IconButton>
                                  </Tooltip>
                                  
                                  <Tooltip title="Eliminar">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleImageDelete(image.id)}
                                      sx={{
                                        backgroundColor: 'rgba(244,67,54,0.9)',
                                        color: 'white',
                                        '&:hover': { backgroundColor: 'rgba(244,67,54,1)' },
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </ImageActions>
                              </ImageOverlay>
                              
                              {/* Drag handle */}
                              <Box
                                {...provided.dragHandleProps}
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  opacity: 0.7,
                                  cursor: 'grab',
                                  '&:active': { cursor: 'grabbing' },
                                  '&:hover': { opacity: 1 },
                                }}
                              >
                                <DragIcon sx={{ color: 'white', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                              </Box>
                            </Box>
                            
                            {/* Upload progress */}
                            {image.uploading && (
                              <UploadProgress>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={image.progress || 0}
                                    sx={{ flex: 1 }}
                                  />
                                  <Typography variant="caption">
                                    {Math.round(image.progress || 0)}%
                                  </Typography>
                                </Stack>
                              </UploadProgress>
                            )}
                          </ImageCard>
                        </Grid>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Grid>
              )}
            </Droppable>
          </DragDropContext>
        </Box>
      )}

      {/* Preview Modal */}
      <Dialog
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
          },
        }}
      >
        <Backdrop open sx={{ zIndex: (theme) => theme.zIndex.modal - 1 }}>
          <DialogContent
            onClick={() => setPreviewImage(null)}
            sx={{
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '90vh',
            }}
          >
            {previewImage && (
              <Box
                component="img"
                src={previewImage}
                alt="Preview"
                sx={{
                  maxWidth: '90vw',
                  maxHeight: '90vh',
                  objectFit: 'contain',
                  borderRadius: 2,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                }}
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </DialogContent>
        </Backdrop>
      </Dialog>
    </Box>
  );
};

export default EnhancedPropertyImageUpload;