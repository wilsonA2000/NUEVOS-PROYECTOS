/**
 * Componente universal de carga de archivos
 * Soporta imágenes, videos, documentos PDF, Office, texto, comprimidos
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  Description as DocumentIcon,
  Archive as ArchiveIcon,
  TextSnippet as TextIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';

// Configuración de validación
const FILE_VALIDATION = {
  maxSize: 50 * 1024 * 1024, // 50MB
  maxCount: 40,
  allowedTypes: [
    // Imágenes
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp',
    // Videos
    'video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/mkv',
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv', 'application/rtf',
    // Comprimidos
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg'
  ],
  allowedExtensions: [
    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp',
    '.mp4', '.webm', '.mov', '.avi', '.mkv',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.rtf', '.zip', '.rar', '.7z',
    '.mp3', '.wav', '.ogg'
  ]
};

interface FileData {
  file: File;
  id: string;
  preview?: string;
  type: 'image' | 'video' | 'document' | 'archive' | 'audio' | 'text' | 'other';
  size: string;
  uploaded?: boolean;
}

interface UniversalFileUploadProps {
  files: FileData[];
  onFilesChange: (files: FileData[]) => void;
  maxFiles?: number;
  maxSize?: number;
  acceptedTypes?: string[];
  label?: string;
  helperText?: string;
  disabled?: boolean;
  showPreview?: boolean;
  allowReorder?: boolean;
}

const UniversalFileUpload: React.FC<UniversalFileUploadProps> = ({
  files = [],
  onFilesChange,
  maxFiles = FILE_VALIDATION.maxCount,
  maxSize = FILE_VALIDATION.maxSize,
  acceptedTypes = FILE_VALIDATION.allowedTypes,
  label = "Cargar Archivos",
  helperText = "Arrastra archivos aquí o haz clic para seleccionar",
  disabled = false,
  showPreview = true,
  allowReorder = true
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determinar tipo de archivo
  const getFileType = (file: File): FileData['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type === 'application/pdf' || 
        file.type.includes('word') || 
        file.type.includes('excel') || 
        file.type.includes('powerpoint') ||
        file.type === 'application/rtf') return 'document';
    if (file.type.includes('zip') || 
        file.type.includes('rar') || 
        file.type.includes('7z')) return 'archive';
    if (file.type.startsWith('text/')) return 'text';
    return 'other';
  };

  // Obtener icono según tipo
  const getFileIcon = (type: FileData['type']) => {
    switch (type) {
      case 'image': return <ImageIcon />;
      case 'video': return <VideoIcon />;
      case 'document': return <DocumentIcon />;
      case 'archive': return <ArchiveIcon />;
      case 'text': return <TextIcon />;
      default: return <DocumentIcon />;
    }
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Validar archivos
  const validateFiles = (newFiles: File[]): { valid: FileData[], errors: string[] } => {
    const errors: string[] = [];
    const valid: FileData[] = [];

    // Verificar límite total
    if (files.length + newFiles.length > maxFiles) {
      errors.push(`Máximo ${maxFiles} archivos permitidos`);
      return { valid, errors };
    }

    newFiles.forEach((file, index) => {
      // Validar tipo
      if (!acceptedTypes.includes(file.type)) {
        errors.push(`Archivo ${index + 1}: Tipo no permitido`);
        return;
      }

      // Validar tamaño
      if (file.size > maxSize) {
        errors.push(`Archivo ${index + 1}: Tamaño máximo ${formatFileSize(maxSize)}`);
        return;
      }

      // Crear preview para imágenes
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      const fileData: FileData = {
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        preview,
        type: getFileType(file),
        size: formatFileSize(file.size),
        uploaded: false
      };

      valid.push(fileData);
    });

    return { valid, errors };
  };

  // Manejar selección de archivos
  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    setUploading(true);
    setErrors([]);

    const fileArray = Array.from(selectedFiles);
    const { valid, errors } = validateFiles(fileArray);

    if (errors.length > 0) {
      setErrors(errors);
    }

    if (valid.length > 0) {
      onFilesChange([...files, ...valid]);
    }

    setUploading(false);
  }, [files, onFilesChange, maxFiles, maxSize, acceptedTypes]);

  // Eventos drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (!disabled && e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [disabled, handleFileSelect]);

  // Eliminar archivo
  const handleRemoveFile = (fileId: string) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    onFilesChange(updatedFiles);
  };

  // Ver archivo
  const handleViewFile = (fileData: FileData) => {
    setPreviewFile(fileData);
  };

  return (
    <Box>
      {/* Área de carga */}
      <Paper
        elevation={isDragOver ? 4 : 1}
        sx={{
          p: 3,
          border: `2px dashed ${isDragOver ? theme.palette.primary.main : theme.palette.grey[300]}`,
          bgcolor: isDragOver ? theme.palette.primary.light + '10' : 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: disabled ? theme.palette.grey[300] : theme.palette.primary.main,
            bgcolor: disabled ? 'transparent' : theme.palette.primary.light + '05'
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <UploadIcon sx={{ fontSize: 48, color: 'primary.main', opacity: disabled ? 0.5 : 1 }} />
          
          <Typography variant="h6" textAlign="center" color={disabled ? 'text.disabled' : 'text.primary'}>
            {label}
          </Typography>
          
          <Typography variant="body2" textAlign="center" color="text.secondary">
            {helperText}
          </Typography>

          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
            disabled={disabled || uploading}
            sx={{ mt: 1 }}
          >
            {uploading ? 'Subiendo...' : 'Seleccionar Archivos'}
          </Button>

          <Typography variant="caption" color="text.secondary" textAlign="center">
            Máximo {maxFiles} archivos • Tamaño máximo {formatFileSize(maxSize)}
            <br />
            Formatos: Imágenes, Videos, PDF, Office, Texto, Comprimidos
          </Typography>
        </Box>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={disabled}
        />
      </Paper>

      {/* Errores */}
      {errors.length > 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Lista de archivos */}
      {files.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Archivos Seleccionados ({files.length}/{maxFiles})
          </Typography>

          <List>
            {files.map((fileData, index) => (
              <ListItem
                key={fileData.id}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: 'background.paper'
                }}
              >
                {allowReorder && (
                  <ListItemIcon>
                    <DragIcon />
                  </ListItemIcon>
                )}
                
                <ListItemIcon>
                  {getFileIcon(fileData.type)}
                </ListItemIcon>
                
                <ListItemText
                  primary={fileData.file.name}
                  secondary={
                    <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                      <Chip label={fileData.type} size="small" variant="outlined" />
                      <Chip label={fileData.size} size="small" />
                      {fileData.uploaded && (
                        <Chip label="Subido" size="small" color="success" />
                      )}
                    </Box>
                  }
                />
                
                <ListItemSecondaryAction>
                  <Box display="flex" gap={1}>
                    {showPreview && fileData.type === 'image' && (
                      <IconButton onClick={() => handleViewFile(fileData)} size="small">
                        <ViewIcon />
                      </IconButton>
                    )}
                    
                    <IconButton 
                      onClick={() => handleRemoveFile(fileData.id)} 
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Modal de vista previa */}
      <Dialog
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Vista Previa: {previewFile?.file.name}</DialogTitle>
        <DialogContent>
          {previewFile?.type === 'image' && previewFile.preview && (
            <Box display="flex" justifyContent="center">
              <img
                src={previewFile.preview}
                alt={previewFile.file.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain'
                }}
              />
            </Box>
          )}
          {previewFile?.type !== 'image' && (
            <Typography variant="body1" textAlign="center" py={4}>
              Vista previa no disponible para este tipo de archivo
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewFile(null)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UniversalFileUpload;