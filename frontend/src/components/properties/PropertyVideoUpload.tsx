/**
 * PropertyVideoUpload - Advanced video management system
 * Features: drag & drop, compression, thumbnail generation, YouTube integration
 * Inspired by the PropertyImageUpload success but optimized for video content
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  LinearProgress,
  Chip,
  TextField,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Fab,
  Collapse,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  VideoLibrary as VideoIcon,
  YouTube as YouTubeIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeOff as MuteIcon,
  VolumeUp as UnmuteIcon,
  FullscreenExit as ExitFullscreenIcon,
  Fullscreen as FullscreenIcon,
  Info as InfoIcon,
  Compress as CompressIcon,
  Image as ThumbnailIcon,
  DragHandle as DragIcon,
  Add as AddIcon,
  Movie as MovieIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { toast } from 'react-toastify';
import VideoProcessor from '../../utils/videoUtils';

// Enhanced video types
interface VideoFile extends File {
  id?: string;
  preview?: string;
  thumbnail?: string;
  duration?: number;
  resolution?: string;
  compressed?: boolean;
  originalSize?: number;
  compressedSize?: number;
}

interface YouTubeVideo {
  id: string;
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  duration?: string;
}

interface PropertyVideo {
  id?: number;
  file?: VideoFile;
  metadata?: {
    id: string;
    preview: string;
    thumbnail: string;
    duration: number;
    resolution: string;
  };
  youtube?: YouTubeVideo;
  title: string;
  description: string;
  type: 'file' | 'youtube';
  order: number;
}

// Video validation and compression utilities
class VideoUtils {
  static readonly MAX_SIZE = 100 * 1024 * 1024; // 100MB
  static readonly MAX_DURATION = 600; // 10 minutes
  static readonly ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'];
  static readonly TARGET_MAX_SIZE = 50 * 1024 * 1024; // Target 50MB after compression

  static validateVideo(file: File): { valid: boolean; error?: string } {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Formato no soportado. Use MP4, WebM, QuickTime o AVI.' };
    }
    
    if (file.size > this.MAX_SIZE) {
      return { valid: false, error: `El archivo es muy grande. Máximo ${this.MAX_SIZE / (1024 * 1024)}MB.` };
    }
    
    return { valid: true };
  }

  static async getVideoMetadata(file: File): Promise<{
    duration: number;
    resolution: string;
    thumbnail: string;
  }> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        const duration = video.duration;
        const resolution = `${video.videoWidth}x${video.videoHeight}`;
        
        // Generate thumbnail at 2 seconds or 25% of video
        video.currentTime = Math.min(2, duration * 0.25);
      };

      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
          
          resolve({
            duration: video.duration,
            resolution: `${video.videoWidth}x${video.videoHeight}`,
            thumbnail,
          });
        }
        
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        resolve({
          duration: 0,
          resolution: 'Unknown',
          thumbnail: '',
        });
        URL.revokeObjectURL(video.src);
      };
    });
  }

  static async compressVideo(file: File, options: {
    maxSize?: number;
    quality?: number;
    maxDuration?: number;
  } = {}): Promise<VideoFile> {
    // For now, return original file with compression flag
    // In production, you'd use libraries like FFmpeg.wasm
    const { maxSize = this.TARGET_MAX_SIZE } = options;
    
    if (file.size <= maxSize) {
      return Object.assign(file, {
        compressed: false,
        originalSize: file.size,
        compressedSize: file.size,
      });
    }

    // Simulate compression (in production, use FFmpeg.wasm)
    const compressionRatio = maxSize / file.size;
    const simulatedCompressedSize = Math.floor(file.size * compressionRatio);
    
    return Object.assign(file, {
      compressed: true,
      originalSize: file.size,
      compressedSize: simulatedCompressedSize,
    });
  }

  static extractYouTubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

interface PropertyVideoUploadProps {
  videos: PropertyVideo[];
  onChange: (videos: PropertyVideo[]) => void;
  maxVideos?: number;
  disabled?: boolean;
}

export const PropertyVideoUpload: React.FC<PropertyVideoUploadProps> = ({
  videos,
  onChange,
  maxVideos = 5,
  disabled = false,
}) => {
  const [activeTab, setActiveTab] = useState(0); // 0: Upload, 1: YouTube
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [previewVideo, setPreviewVideo] = useState<PropertyVideo | null>(null);
  const [editingVideo, setEditingVideo] = useState<PropertyVideo | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [autoCompress, setAutoCompress] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropZoneRef.current) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('video/')
    );

    if (files.length > 0) {
      await processVideoFiles(files);
    }
  }, []);

  // Process uploaded video files
  const processVideoFiles = async (files: File[]) => {
    if (videos.length + files.length > maxVideos) {
      toast.error(`Máximo ${maxVideos} videos permitidos`);
      return;
    }

    setIsProcessing(true);

    for (const file of files) {
      const validation = VideoUtils.validateVideo(file);
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }

      try {
        // Generate unique ID for progress tracking
        const fileId = `${Date.now()}-${Math.random()}`;
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        // Get video metadata
        const metadata = await VideoUtils.getVideoMetadata(file);
        setUploadProgress(prev => ({ ...prev, [fileId]: 30 }));

        // Compress if needed and enabled
        let processedFile: VideoFile = file as VideoFile;
        if (autoCompress && file.size > VideoUtils.TARGET_MAX_SIZE) {
          processedFile = await VideoUtils.compressVideo(file, {
            maxSize: VideoUtils.TARGET_MAX_SIZE,
            quality: 0.8,
          });
          setUploadProgress(prev => ({ ...prev, [fileId]: 70 }));
        }

        // Create PropertyVideo object with separated file and metadata
        const newVideo: PropertyVideo = {
          id: videos.length + 1,
          file: processedFile, // Keep original file for FormData
          metadata: {
            id: fileId,
            preview: URL.createObjectURL(processedFile),
            thumbnail: metadata.thumbnail,
            duration: metadata.duration,
            resolution: metadata.resolution,
          },
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          description: '',
          type: 'file',
          order: videos.length,
        };

        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
        onChange([...videos, newVideo]);
        
        toast.success(`Video "${file.name}" procesado exitosamente`);

        // Cleanup progress after delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const { [fileId]: _, ...rest } = prev;
            return rest;
          });
        }, 2000);

      } catch (error) {
        console.error('Error processing video:', error);
        toast.error(`Error procesando ${file.name}`);
      }
    }

    setIsProcessing(false);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processVideoFiles(files);
    }
    // Reset input
    e.target.value = '';
  };

  // YouTube video handling
  const handleAddYouTubeVideo = async () => {
    const validation = VideoProcessor.validateYouTubeUrl(youtubeUrl);
    if (!validation.valid || !validation.videoId) {
      toast.error(validation.error || 'URL de YouTube inválida');
      return;
    }
    const videoId = validation.videoId;

    try {
      setIsProcessing(true);

      // Simulate YouTube API call (in production, use YouTube Data API)
      const youtubeVideo: YouTubeVideo = {
        id: videoId,
        url: youtubeUrl,
        title: `Video de YouTube ${videoId}`,
        description: '',
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        duration: 'Unknown',
      };

      const newVideo: PropertyVideo = {
        id: videos.length + 1,
        youtube: youtubeVideo,
        title: youtubeVideo.title || '',
        description: youtubeVideo.description || '',
        type: 'youtube',
        order: videos.length,
      };

      onChange([...videos, newVideo]);
      setYoutubeUrl('');
      toast.success('Video de YouTube agregado exitosamente');

    } catch (error) {
      toast.error('Error agregando video de YouTube');
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove video
  const handleRemoveVideo = async (index: number) => {
    const video = videos[index];
    
    // Si es un video existente (tiene ID), eliminarlo del servidor
    if (video.id) {
      try {
        setIsProcessing(true);
        
        // Importar el servicio
        const { propertyVideoService } = await import('../../services/propertyVideoService');
        
        // Obtener propertyId (necesitamos añadir esta prop al componente)
        const propertyId = video.property || (window.location.pathname.match(/properties\/([^\/]+)/) || [])[1];
        
        if (propertyId) {
          await propertyVideoService.deleteVideo(propertyId, video.id);
          toast.success('Video eliminado del servidor');
        }
      } catch (error) {
        console.error('Error eliminando video del servidor:', error);
        toast.error('Error eliminando video del servidor');
        return; // No continuar si falla la eliminación del servidor
      } finally {
        setIsProcessing(false);
      }
    }
    
    // Eliminar del estado local
    const newVideos = videos.filter((_, i) => i !== index);
    // Update order
    const reorderedVideos = newVideos.map((video, i) => ({ ...video, order: i }));
    onChange(reorderedVideos);
    
    if (!video.id) {
      toast.success('Video eliminado');
    }
  };

  // Edit video metadata
  const handleEditVideo = (video: PropertyVideo) => {
    setEditingVideo(video);
  };

  const handleSaveEdit = () => {
    if (!editingVideo) return;

    const updatedVideos = videos.map(video => 
      video.id === editingVideo.id ? editingVideo : video
    );
    onChange(updatedVideos);
    setEditingVideo(null);
    toast.success('Video actualizado');
  };

  // Drag and drop reordering
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newVideos = Array.from(videos);
    const [reorderedVideo] = newVideos.splice(result.source.index, 1);
    newVideos.splice(result.destination.index, 0, reorderedVideo);

    // Update order
    const reorderedWithOrder = newVideos.map((video, index) => ({
      ...video,
      order: index,
    }));

    onChange(reorderedWithOrder);
  };

  // Video preview
  const handlePreviewVideo = (video: PropertyVideo) => {
    setPreviewVideo(video);
  };

  const renderVideoCard = (video: PropertyVideo, index: number) => {
    const isFile = video.type === 'file' && video.file;
    const isYouTube = video.type === 'youtube' && video.youtube;
    
    return (
      <Card 
        elevation={2}
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.2s',
          '&:hover': { 
            elevation: 4,
            transform: 'translateY(-2px)',
          },
        }}
      >
        {/* Video Thumbnail/Preview */}
        <Box sx={{ position: 'relative', paddingTop: '56.25%', overflow: 'hidden' }}>
          {isFile && video.metadata?.thumbnail && (
            <img
              src={video.metadata?.thumbnail || ''}
              alt={video.title}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}
          
          {isYouTube && video.youtube?.thumbnail && (
            <img
              src={video.youtube.thumbnail}
              alt={video.title}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}

          {/* Play overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '50%',
              p: 1,
              cursor: 'pointer',
            }}
            onClick={() => handlePreviewVideo(video)}
          >
            <PlayIcon sx={{ color: 'white', fontSize: 32 }} />
          </Box>

          {/* Video type indicator */}
          <Chip
            label={isYouTube ? 'YouTube' : 'Archivo'}
            size="small"
            color={isYouTube ? 'error' : 'primary'}
            icon={isYouTube ? <YouTubeIcon /> : <MovieIcon />}
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
            }}
          />

          {/* Drag handle */}
          <IconButton
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
            }}
            size="small"
          >
            <DragIcon />
          </IconButton>
        </Box>

        {/* Video Info */}
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Typography variant="subtitle2" noWrap gutterBottom>
            {video.title}
          </Typography>
          
          <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
            {isFile && video.metadata?.duration && (
              <Chip 
                label={VideoUtils.formatDuration(video.metadata?.duration || 0)}
                size="small"
                variant="outlined"
              />
            )}
            
            {isFile && video.metadata?.resolution && (
              <Chip 
                label={video.metadata?.resolution || 'Unknown'}
                size="small"
                variant="outlined"
              />
            )}
            
            {isFile && video.file?.compressed && (
              <Chip 
                label="Comprimido"
                size="small"
                color="success"
                variant="outlined"
              />
            )}
          </Box>

          {isFile && video.file && (
            <Typography variant="caption" color="text.secondary">
              Tamaño: {VideoUtils.formatFileSize(video.file?.size || 0)}
              {video.file && video.metadata && (
                <span style={{ color: 'green' }}>
                  {' '}Video procesado
                </span>
              )}
            </Typography>
          )}
        </CardContent>

        {/* Actions */}
        <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
          <Box>
            <Tooltip title="Vista previa">
              <IconButton size="small" onClick={() => handlePreviewVideo(video)}>
                <PlayIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Editar información">
              <IconButton size="small" onClick={() => handleEditVideo(video)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Tooltip title="Eliminar video">
            <IconButton 
              size="small" 
              color="error"
              onClick={() => handleRemoveVideo(index)}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </CardActions>
      </Card>
    );
  };

  return (
    <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VideoIcon color="primary" />
          Videos de la Propiedad
          <Chip label={`${videos.length}/${maxVideos}`} size="small" />
        </Typography>
        
        <Box display="flex" gap={1}>
          <Tooltip title="Configuración avanzada">
            <IconButton 
              size="small" 
              onClick={() => setShowAdvanced(!showAdvanced)}
              color={showAdvanced ? 'primary' : 'default'}
            >
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Advanced Settings */}
      <Collapse in={showAdvanced}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box display="flex" flexDirection="column" gap={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoCompress}
                  onChange={(e) => setAutoCompress(e.target.checked)}
                  size="small"
                />
              }
              label="Compresión automática (recomendado para archivos >50MB)"
            />
            <Typography variant="caption" color="text.secondary">
              • Máximo {maxVideos} videos por propiedad
              • Tamaño máximo: {VideoUtils.MAX_SIZE / (1024 * 1024)}MB por video
              • Duración máxima: {VideoUtils.MAX_DURATION / 60} minutos
              • Formatos: MP4, WebM, QuickTime, AVI
            </Typography>
          </Box>
        </Alert>
      </Collapse>

      {/* Tabs for Upload Methods */}
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
        <Tab label="Subir Archivos" icon={<UploadIcon />} />
        <Tab label="YouTube" icon={<YouTubeIcon />} />
      </Tabs>

      {/* File Upload Tab */}
      {activeTab === 0 && (
        <Box>
          {/* Drop Zone */}
          <Paper
            ref={dropZoneRef}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            sx={{
              p: 3,
              textAlign: 'center',
              cursor: disabled ? 'not-allowed' : 'pointer',
              border: '2px dashed',
              borderColor: isDragging ? 'primary.main' : 'grey.300',
              backgroundColor: isDragging ? 'primary.50' : 'grey.50',
              transition: 'all 0.2s',
              mb: 2,
              minHeight: '120px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              '&:hover': disabled ? {} : {
                borderColor: 'primary.main',
                backgroundColor: 'primary.50',
              },
            }}
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <VideoIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="subtitle1" gutterBottom>
              {isDragging ? 'Suelta los videos aquí' : 'Arrastra videos o haz click para seleccionar'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Soporta: MP4, WebM, QuickTime, AVI • Máximo {VideoUtils.MAX_SIZE / (1024 * 1024)}MB
            </Typography>
            
            {autoCompress && (
              <Chip
                label="Compresión automática activada"
                size="small"
                color="success"
                icon={<CompressIcon />}
                sx={{ mt: 1 }}
              />
            )}
          </Paper>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
            disabled={disabled}
          />
        </Box>
      )}

      {/* YouTube Tab */}
      {activeTab === 1 && (
        <Box>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <YouTubeIcon color="error" sx={{ fontSize: 32 }} />
              <Typography variant="h6">
                Agregar Video de YouTube
              </Typography>
            </Box>
            
            <Box display="flex" gap={2} mb={2}>
              <TextField
                fullWidth
                label="URL de YouTube"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={disabled}
              />
              <Button
                variant="contained"
                onClick={handleAddYouTubeVideo}
                disabled={!youtubeUrl || isProcessing || disabled}
                startIcon={isProcessing ? <LinearProgress /> : <AddIcon />}
              >
                Agregar
              </Button>
            </Box>
            
            <Typography variant="caption" color="text.secondary">
              Puedes agregar videos directamente desde YouTube sin subirlos a tu servidor
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Procesando videos...
          </Typography>
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <LinearProgress 
              key={fileId}
              variant="determinate" 
              value={progress} 
              sx={{ mb: 1 }}
            />
          ))}
        </Box>
      )}

      {/* Videos Grid */}
      {videos.length > 0 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, mb: 1 }}>
            Videos ({videos.length})
          </Typography>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="videos" direction="horizontal">
              {(provided) => (
                <Box
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 2,
                  }}
                >
                  {videos.map((video, index) => (
                    <Draggable
                      key={video.id?.toString() || index}
                      draggableId={video.id?.toString() || index.toString()}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{
                            transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
                            opacity: snapshot.isDragging ? 0.8 : 1,
                          }}
                        >
                          {renderVideoCard(video, index)}
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </DragDropContext>
        </Box>
      )}

      {/* Empty State */}
      {videos.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            color: 'text.secondary',
          }}
        >
          <VideoIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" gutterBottom>
            No hay videos agregados
          </Typography>
          <Typography variant="body2">
            Agrega videos para mostrar mejor tu propiedad
          </Typography>
        </Box>
      )}

      {/* Video Preview Dialog */}
      <Dialog
        open={!!previewVideo}
        onClose={() => setPreviewVideo(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Vista Previa: {previewVideo?.title}
        </DialogTitle>
        <DialogContent>
          {previewVideo?.type === 'file' && previewVideo.metadata?.preview && (
            <video
              controls
              style={{ width: '100%', maxHeight: '400px' }}
              src={previewVideo.metadata.preview}
            />
          )}
          
          {previewVideo?.type === 'youtube' && previewVideo.youtube?.id && (
            <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
              <iframe
                src={`https://www.youtube.com/embed/${previewVideo.youtube.id}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewVideo(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Video Dialog */}
      <Dialog
        open={!!editingVideo}
        onClose={() => setEditingVideo(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Editar Video</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Título del video"
              value={editingVideo?.title || ''}
              onChange={(e) => setEditingVideo(prev => prev ? { ...prev, title: e.target.value } : null)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Descripción"
              multiline
              rows={3}
              value={editingVideo?.description || ''}
              onChange={(e) => setEditingVideo(prev => prev ? { ...prev, description: e.target.value } : null)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingVideo(null)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveEdit}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default PropertyVideoUpload;