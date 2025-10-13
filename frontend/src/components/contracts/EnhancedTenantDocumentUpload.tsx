import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Modal,
  Button,
  LinearProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Avatar,
  IconButton,
  Chip,
  Card,
  CardContent,
  Skeleton,
  TextField,
  Tooltip,
  Divider,
  Stack,
  Grid,
  Fade,
  Grow,
  Zoom,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Collapse,
  ToggleButton,
  ToggleButtonGroup,
  Slide
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import {
  ExpandMore as ExpandMoreIcon,
  Folder as FolderIcon,
  CheckCircle as CheckCircleIcon,
  UploadFile as UploadFileIcon,
  CloudUpload as CloudUploadIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
  Category as CategoryIcon,
  PictureAsPdf as PdfIcon,
  Refresh as RefreshIcon,
  AutoAwesome as AutoAwesomeIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  HighlightOff as HighlightOffIcon,
  HelpOutline as HelpOutlineIcon,
  NoteAdd as NoteAddIcon,
  History as HistoryIcon,
  Dashboard as DashboardIcon,
  SwapHoriz as SwapHorizIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================================================
// MODERN ANIMATIONS & STYLED COMPONENTS
// ============================================================================

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 5px rgba(102, 126, 234, 0.3); }
  50% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.6), 0 0 30px rgba(118, 75, 162, 0.4); }
`;

const GradientCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '20px',
  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.1)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%)',
    backgroundSize: '200% 100%',
    animation: `${shimmer} 2s infinite linear`,
  },
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(102, 126, 234, 0.2)',
    animation: `${glow} 2s infinite`,
  }
}));

const StatCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: '16px',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-2px) scale(1.02)',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
  }
}));

const FloatingActionButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '50px',
  padding: '12px 32px',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.95rem',
  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
    transition: 'left 0.5s',
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 30px rgba(102, 126, 234, 0.4)',
    '&::before': {
      left: '100%',
    }
  },
  '&:active': {
    transform: 'translateY(0px)',
  }
}));

const ModernIconButton = styled(IconButton)(({ theme }) => ({
  borderRadius: '12px',
  padding: '12px',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  '&:hover': {
    transform: 'scale(1.1)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  }
}));

const PulseAvatar = styled(Avatar)(({ theme }) => ({
  animation: `${pulse} 2s infinite`,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  '&:hover': {
    animation: 'none',
    transform: 'scale(1.1)',
  }
}));

// ============================================================================
// ENHANCED TYPES & INTERFACES
// ============================================================================

interface EnhancedDocumentType {
  id?: string;
  type: string;
  display_name: string;
  description: string;
  required: boolean;
  uploaded: boolean;
  file_url?: string;
  other_description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'requires_correction';
  review_notes?: string;
  reviewed_by?: {
    id: string;
    full_name: string;
    email: string;
  };
  reviewed_at?: string;
  uploaded_at?: string;
  updated_at?: string;
  file_size?: number;
  original_filename?: string;
  category?: 'TOMADOR' | 'CODEUDOR' | 'OTROS' | 'GARANTIA';
  is_identity_document?: boolean;
}

interface DocumentSection {
  tomador_documents: EnhancedDocumentType[];
  codeudor_documents: EnhancedDocumentType[];
  guarantee_documents: EnhancedDocumentType[];
  otros_documents: EnhancedDocumentType[];
}

interface DocumentStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  requires_correction: number;
}

interface EnhancedTenantDocumentUploadProps {
  processId: string;
  onDocumentUploaded?: () => void;
  matchRequestData?: any;
  guaranteeType?: 'none' | 'codeudor_salario' | 'codeudor_finca_raiz';
  codeudorName?: string;
  isLandlord?: boolean;
}

// ============================================================================
// MODERN UTILITY FUNCTIONS
// ============================================================================

const getStatusColor = (status: string): string => {
  const colors = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    requires_correction: 'info'
  };
  return colors[status] || 'default';
};

const getStatusGradient = (status: string): string => {
  const gradients = {
    pending: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
    approved: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
    rejected: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',
    requires_correction: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)'
  };
  return gradients[status] || 'linear-gradient(135deg, #9E9E9E 0%, #757575 100%)';
};

const getStatusIcon = (status: string) => {
  const iconStyle = { fontSize: '1.2rem' };
  switch(status) {
    case 'approved': return <CheckCircleIcon sx={{ ...iconStyle, color: '#4CAF50' }} />;
    case 'rejected': return <HighlightOffIcon sx={{ ...iconStyle, color: '#F44336' }} />;
    case 'requires_correction': return <EditIcon sx={{ ...iconStyle, color: '#2196F3' }} />;
    default: return <AccessTimeIcon sx={{ ...iconStyle, color: '#FF9800' }} />;
  }
};

const getStatusLabel = (status: string): string => {
  const labels = {
    pending: 'Pendiente de Revisión',
    approved: 'Aprobado ✓',
    rejected: 'Rechazado ✗',
    requires_correction: 'Requiere Corrección ⚠'
  };
  return labels[status] || status;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// ============================================================================
// ENHANCED DOCUMENT ITEM COMPONENT
// ============================================================================

const EnhancedDocumentItem: React.FC<{
  document: EnhancedDocumentType;
  onFileSelect: (file: File, documentType: string) => void;
  onDelete: (documentId: string) => void;
  onPreview: (document: EnhancedDocumentType) => void;
  isUploading: boolean;
  canDelete: boolean;
}> = React.memo(({ document, onFileSelect, onDelete, onPreview, isUploading, canDelete }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0], document.type);
      }
    },
    accept: {
      'application/pdf': ['.pdf']
    },
    disabled: isUploading || (document.uploaded && document.status === 'approved'),
    multiple: false
  });

  const borderColor = useMemo(() => {
    if (isDragActive) return 'primary.main';
    if (document.status === 'approved') return 'success.main';
    if (document.status === 'rejected') return 'error.main';
    if (document.status === 'requires_correction') return 'info.main';
    if (document.required && !document.uploaded) return 'warning.main';
    return 'grey.300';
  }, [isDragActive, document]);

  const backgroundColor = useMemo(() => {
    if (document.status === 'approved') return 'success.50';
    if (document.status === 'rejected') return 'error.50';
    if (document.status === 'requires_correction') return 'info.50';
    if (isDragActive) return 'action.hover';
    return 'background.paper';
  }, [isDragActive, document]);

  return (
    <Slide direction="up" in timeout={600 + Math.random() * 200}>
      <GradientCard
        sx={{
          p: 3,
          mb: 3,
          cursor: (document.status === 'approved') ? 'default' : 'pointer',
          position: 'relative',
          minHeight: '160px',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: getStatusGradient(document.status),
            borderRadius: '20px 20px 0 0',
          },
          ...(document.status === 'approved' && {
            background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(56, 142, 60, 0.1) 100%)',
            '&::after': {
              background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
            }
          }),
          ...(document.status === 'rejected' && {
            background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(211, 47, 47, 0.1) 100%)',
            '&::after': {
              background: 'linear-gradient(135deg, #F44336 0%, #EF5350 100%)',
            }
          }),
          ...(document.status === 'requires_correction' && {
            background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(25, 118, 210, 0.1) 100%)',
            '&::after': {
              background: 'linear-gradient(135deg, #2196F3 0%, #42A5F5 100%)',
            }
          }),
          ...(isDragActive && {
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
            transform: 'scale(1.02)',
            '&::after': {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }
          })
        }}
      >
        <Box {...(document.status !== 'approved' ? getRootProps() : {})}>
          <input {...getInputProps()} />

          <Grid container spacing={2} alignItems="center">
            {/* Status Icon */}
            <Grid item>
              <PulseAvatar
                sx={{
                  background: getStatusGradient(document.status),
                  width: 64,
                  height: 64,
                  border: '3px solid rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                  animation: document.status === 'pending' ? `${float} 3s infinite ease-in-out` : 'none',
                }}
              >
                {getStatusIcon(document.status)}
              </PulseAvatar>
            </Grid>

            {/* Document Info */}
            <Grid item xs>
              <Stack spacing={0.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Typography variant="h6" sx={{
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: 'text.primary',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    {document.display_name}
                  </Typography>
                  {document.required && (
                    <Chip
                      label="REQUERIDO"
                      size="small"
                      sx={{
                        background: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: 24,
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(244, 67, 54, 0.3)',
                        border: 'none',
                        '&:hover': {
                          transform: 'scale(1.05)',
                        }
                      }}
                    />
                  )}
                  {document.category && (
                    <Chip
                      icon={<CategoryIcon sx={{ color: 'white !important' }} />}
                      label={document.category}
                      size="small"
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: 24,
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                        border: 'none',
                        '&:hover': {
                          transform: 'scale(1.05)',
                        }
                      }}
                    />
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary">
                  {document.description}
                </Typography>

                {/* Status Chip with Details */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mt: 1 }}>
                  <Chip
                    icon={getStatusIcon(document.status)}
                    label={getStatusLabel(document.status)}
                    size="medium"
                    sx={{
                      background: getStatusGradient(document.status),
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      height: 32,
                      borderRadius: '16px',
                      boxShadow: '0 3px 12px rgba(0, 0, 0, 0.2)',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 5px 16px rgba(0, 0, 0, 0.25)',
                      }
                    }}
                  />

                  {document.uploaded_at && (
                    <Chip
                      icon={<AccessTimeIcon sx={{ color: 'rgba(255, 255, 255, 0.8) !important' }} />}
                      label={`Subido: ${format(new Date(document.uploaded_at), 'dd/MM/yyyy HH:mm', { locale: es })}`}
                      size="small"
                      sx={{
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        fontSize: '0.7rem',
                        height: 26,
                        borderRadius: '13px',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                      }}
                    />
                  )}

                  {document.file_size && (
                    <Chip
                      label={formatFileSize(document.file_size)}
                      size="small"
                      sx={{
                        background: 'rgba(102, 126, 234, 0.7)',
                        color: 'white',
                        fontSize: '0.7rem',
                        height: 26,
                        borderRadius: '13px',
                        fontWeight: 500,
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                      }}
                    />
                  )}
                </Box>

                {/* Review Notes */}
                {document.review_notes && (
                  <Fade in timeout={800}>
                    <Alert
                      severity={document.status === 'rejected' ? 'error' : 'info'}
                      icon={<InfoIcon />}
                      sx={{
                        mt: 2,
                        borderRadius: '12px',
                        background: document.status === 'rejected'
                          ? 'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(211, 47, 47, 0.05) 100%)'
                          : 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(25, 118, 210, 0.05) 100%)',
                        border: `1px solid ${document.status === 'rejected' ? 'rgba(244, 67, 54, 0.3)' : 'rgba(33, 150, 243, 0.3)'}`,
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        📝 Notas del revisor:
                      </Typography>
                      <Typography variant="body2" sx={{
                        background: 'rgba(255, 255, 255, 0.7)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontStyle: 'italic'
                      }}>
                        {document.review_notes}
                      </Typography>
                      {document.reviewed_by && (
                        <Typography variant="caption" sx={{
                          mt: 1,
                          display: 'block',
                          opacity: 0.8,
                          fontWeight: 500
                        }}>
                          👤 Por: {document.reviewed_by.full_name} • 📅 {format(new Date(document.reviewed_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </Typography>
                      )}
                    </Alert>
                  </Fade>
                )}

                {/* Upload Instructions */}
                {!document.uploaded && (
                  <Fade in timeout={1000}>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      mt: 2,
                      p: 2,
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                      borderRadius: '12px',
                      border: '2px dashed rgba(102, 126, 234, 0.3)',
                      backdropFilter: 'blur(5px)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      ...(isDragActive && {
                        borderColor: '#667eea',
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
                        transform: 'scale(1.02)',
                      })
                    }}>
                      <CloudUploadIcon sx={{
                        color: isDragActive ? '#667eea' : 'text.secondary',
                        fontSize: '1.5rem'
                      }} />
                      <Typography variant="body2" sx={{
                        color: isDragActive ? '#667eea' : 'text.secondary',
                        fontWeight: isDragActive ? 600 : 400,
                        fontSize: '0.9rem'
                      }}>
                        {isDragActive ? '🎯 ¡Suelta el archivo aquí!' : '📎 Arrastra un PDF o haz clic para seleccionar'}
                      </Typography>
                    </Box>
                  </Fade>
                )}
              </Stack>
            </Grid>

            {/* Action Buttons */}
            <Grid item>
              <Stack direction="row" spacing={1.5}>
                {document.uploaded && (
                  <>
                    <Tooltip title="👀 Ver documento" arrow>
                      <ModernIconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(document);
                        }}
                        sx={{
                          background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                          color: 'white',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
                            boxShadow: '0 8px 25px rgba(33, 150, 243, 0.4)',
                          }
                        }}
                      >
                        <VisibilityIcon />
                      </ModernIconButton>
                    </Tooltip>

                    {canDelete && document.status !== 'approved' && (
                      <Tooltip title="🗑️ Eliminar documento" arrow>
                        <ModernIconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(document.id);
                          }}
                          sx={{
                            background: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',
                            color: 'white',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #D32F2F 0%, #C62828 100%)',
                              boxShadow: '0 8px 25px rgba(244, 67, 54, 0.4)',
                            }
                          }}
                        >
                          <DeleteIcon />
                        </ModernIconButton>
                      </Tooltip>
                    )}

                    {document.status === 'requires_correction' && (
                      <Tooltip title="🔄 Reemplazar documento" arrow>
                        <ModernIconButton
                          sx={{
                            background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                            color: 'white',
                            animation: `${pulse} 2s infinite`,
                            '&:hover': {
                              background: 'linear-gradient(135deg, #F57C00 0%, #EF6C00 100%)',
                              boxShadow: '0 8px 25px rgba(255, 152, 0, 0.4)',
                              animation: 'none',
                            }
                          }}
                        >
                          <SwapHorizIcon />
                        </ModernIconButton>
                      </Tooltip>
                    )}
                  </>
                )}
              </Stack>
            </Grid>
          </Grid>

          {/* Upload Progress */}
          {isUploading && (
            <Box sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '6px',
              borderRadius: '0 0 20px 20px',
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.3)',
            }}>
              <LinearProgress
                sx={{
                  height: '100%',
                  background: 'transparent',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%)',
                    backgroundSize: '200% 100%',
                    animation: `${shimmer} 1.5s infinite linear`,
                  }
                }}
              />
            </Box>
          )}
        </Box>
      </GradientCard>
    </Slide>
  );
});

// ============================================================================
// STATS DASHBOARD COMPONENT
// ============================================================================

const DocumentStatsDashboard: React.FC<{ stats: DocumentStats }> = ({ stats }) => {
  const progressPercentage = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  return (
    <Fade in timeout={800}>
      <GradientCard sx={{
        mb: 4,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }
      }}>
        <CardContent sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5" sx={{
              color: 'white',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5
            }}>
              <DashboardIcon sx={{ fontSize: '2rem' }} />
              📊 Panel de Control Documental
            </Typography>

            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '8px 16px',
              borderRadius: '20px',
              backdropFilter: 'blur(10px)'
            }}>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                {progressPercentage}%
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Completado
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={6} sm={3}>
              <StatCard elevation={0} sx={{
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px) scale(1.05)',
                  boxShadow: '0 12px 40px rgba(102, 126, 234, 0.3)',
                }
              }}>
                <Typography variant="h3" sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}>
                  {stats.total}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                  📁 Total
                </Typography>
              </StatCard>
            </Grid>

            <Grid item xs={6} sm={3}>
              <StatCard elevation={0} sx={{
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px) scale(1.05)',
                  boxShadow: '0 12px 40px rgba(255, 152, 0, 0.3)',
                }
              }}>
                <Typography variant="h3" sx={{
                  fontWeight: 800,
                  color: '#FF9800',
                  mb: 1
                }}>
                  {stats.pending}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                  ⏳ Pendientes
                </Typography>
              </StatCard>
            </Grid>

            <Grid item xs={6} sm={3}>
              <StatCard elevation={0} sx={{
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px) scale(1.05)',
                  boxShadow: '0 12px 40px rgba(76, 175, 80, 0.3)',
                }
              }}>
                <Typography variant="h3" sx={{
                  fontWeight: 800,
                  color: '#4CAF50',
                  mb: 1
                }}>
                  {stats.approved}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                  ✅ Aprobados
                </Typography>
              </StatCard>
            </Grid>

            <Grid item xs={6} sm={3}>
              <StatCard elevation={0} sx={{
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px) scale(1.05)',
                  boxShadow: '0 12px 40px rgba(244, 67, 54, 0.3)',
                }
              }}>
                <Typography variant="h3" sx={{
                  fontWeight: 800,
                  color: '#F44336',
                  mb: 1
                }}>
                  {stats.rejected + stats.requires_correction}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                  🔄 Revisar
                </Typography>
              </StatCard>
            </Grid>
          </Grid>

          {/* Progress Bar */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 1, fontWeight: 500 }}>
              Progreso general: {stats.approved} de {stats.total} documentos aprobados
            </Typography>
            <Box sx={{
              height: 8,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.2)',
              overflow: 'hidden'
            }}>
              <Box sx={{
                height: '100%',
                width: `${progressPercentage}%`,
                background: 'linear-gradient(90deg, #4CAF50 0%, #81C784 100%)',
                borderRadius: 4,
                transition: 'width 1s ease-in-out',
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                  animation: `${shimmer} 2s infinite linear`,
                }
              }} />
            </Box>
          </Box>
        </CardContent>
      </GradientCard>
    </Fade>
  );
};

// ============================================================================
// MAIN ENHANCED COMPONENT
// ============================================================================

const EnhancedTenantDocumentUpload: React.FC<EnhancedTenantDocumentUploadProps> = ({
  processId,
  onDocumentUploaded,
  matchRequestData,
  guaranteeType = 'none',
  codeudorName = '',
  isLandlord = false
}) => {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState<DocumentSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [uploadingDocuments, setUploadingDocuments] = useState<Set<string>>(new Set());

  // Estados para "otros documentos"
  const [isOtherDocument, setIsOtherDocument] = useState(false);
  const [otherDocumentName, setOtherDocumentName] = useState('');
  const [otherDocumentDescription, setOtherDocumentDescription] = useState('');

  // Estados para preview
  const [previewDocument, setPreviewDocument] = useState<EnhancedDocumentType | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Estados para confirmación de eliminación
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  // Estado para vista de categorías
  const [viewMode, setViewMode] = useState<'sections' | 'categories'>('sections');

  // Stats
  const stats = useMemo(() => {
    if (!checklist) return { total: 0, pending: 0, approved: 0, rejected: 0, requires_correction: 0 };

    const allDocs = [
      ...checklist.tomador_documents,
      ...checklist.codeudor_documents,
      ...checklist.guarantee_documents,
      ...checklist.otros_documents
    ];

    return {
      total: allDocs.length,
      pending: allDocs.filter(d => d.status === 'pending').length,
      approved: allDocs.filter(d => d.status === 'approved').length,
      rejected: allDocs.filter(d => d.status === 'rejected').length,
      requires_correction: allDocs.filter(d => d.status === 'requires_correction').length
    };
  }, [checklist]);

  // ============================================================================
  // API CALLS
  // ============================================================================

  const fetchChecklist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:8000/api/v1/requests/api/documents/process/${processId}/checklist/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Enhanced validation with status and metadata
      const validatedData: DocumentSection = {
        tomador_documents: Array.isArray(data.tomador_documents) ? data.tomador_documents : [],
        codeudor_documents: Array.isArray(data.codeudor_documents) ? data.codeudor_documents : [],
        guarantee_documents: Array.isArray(data.guarantee_documents) ? data.guarantee_documents : [],
        otros_documents: Array.isArray(data.otros_documents) ? data.otros_documents : []
      };

      setChecklist(validatedData);
    } catch (err: any) {
      console.error('Error loading checklist:', err);
      setError(err.message || 'Error al cargar el checklist de documentos');
    } finally {
      setLoading(false);
    }
  }, [processId]);

  const deleteDocument = useCallback(async (documentId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/v1/requests/api/documents/${documentId}/delete/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el documento');
      }

      // Refresh checklist
      await fetchChecklist();
      onDocumentUploaded?.();
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Error al eliminar el documento');
    }
  }, [fetchChecklist, onDocumentUploaded]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleFileSelect = useCallback((file: File, documentType: string) => {
    // Validate and potentially rename file if name is too long
    let finalFile = file;
    if (file.name.length > 95) { // Leave room for extension
      const extension = file.name.split('.').pop() || 'pdf';
      const timestamp = Date.now();
      const newName = `documento_${documentType}_${timestamp}.${extension}`;

      // Create a new File object with shorter name
      finalFile = new File([file], newName, { type: file.type });

      console.log(`📝 File renamed from "${file.name}" to "${newName}" (original was ${file.name.length} chars)`);

      // Show alert to user
      alert(`⚠️ El nombre del archivo era muy largo (${file.name.length} caracteres). Se ha renombrado automáticamente a: ${newName}`);
    }

    setUploadFile(finalFile);
    setSelectedDocumentType(documentType);

    // Check if it's "otros" type
    const isOtherDoc = documentType === 'otros';
    setIsOtherDocument(isOtherDoc);

    if (!isOtherDoc) {
      setOtherDocumentName('');
      setOtherDocumentDescription('');
    }

    setUploadModalOpen(true);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!uploadFile || !selectedDocumentType) return;

    try {
      setUploadingDocuments(prev => new Set(prev).add(selectedDocumentType));
      setUploadModalOpen(false);

      const formData = new FormData();
      formData.append('document_file', uploadFile);
      formData.append('document_type', selectedDocumentType);
      formData.append('property_request', processId);

      if (isOtherDocument) {
        formData.append('other_description', `${otherDocumentName}: ${otherDocumentDescription}`);
      }

      // Debug logs
      console.log('📤 Upload attempt with:', {
        processId,
        selectedDocumentType,
        fileName: uploadFile.name,
        fileSize: uploadFile.size,
        fileType: uploadFile.type
      });

      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/v1/requests/api/documents/upload/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      console.log('📨 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload error response:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          console.error('❌ Upload error JSON:', errorJson);
          throw new Error(errorJson.error || errorJson.detail || 'Error al subir el documento');
        } catch (e) {
          throw new Error('Error al subir el documento');
        }
      }

      // Refresh checklist
      await fetchChecklist();
      onDocumentUploaded?.();

    } catch (err: any) {
      console.error('Error uploading document:', err);
      setError('Error al subir el documento');
    } finally {
      setUploadingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedDocumentType);
        return newSet;
      });
      setUploadFile(null);
      setSelectedDocumentType('');
      setOtherDocumentName('');
      setOtherDocumentDescription('');
    }
  }, [uploadFile, selectedDocumentType, processId, isOtherDocument, otherDocumentName, otherDocumentDescription, fetchChecklist, onDocumentUploaded]);

  const handleDeleteConfirm = useCallback(() => {
    if (documentToDelete) {
      deleteDocument(documentToDelete);
      setDeleteConfirmOpen(false);
      setDocumentToDelete(null);
    }
  }, [documentToDelete, deleteDocument]);

  const handlePreview = useCallback((document: EnhancedDocumentType) => {
    setPreviewDocument(document);
    setPreviewModalOpen(true);
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Stack spacing={2}>
          <Skeleton variant="rectangular" height={60} />
          <Skeleton variant="rectangular" height={200} />
          <Skeleton variant="rectangular" height={200} />
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchChecklist}>
            <RefreshIcon sx={{ mr: 0.5 }} /> Reintentar
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!checklist) return null;

  const categorizedDocuments = {
    'TOMADOR': checklist.tomador_documents,
    'CODEUDOR': checklist.codeudor_documents,
    'GARANTIA': checklist.guarantee_documents,
    'OTROS': checklist.otros_documents
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header with Title and View Toggle */}
      <Box sx={{ mb: 4 }}>
        <Slide direction="down" in timeout={600}>
          <GradientCard sx={{
            mb: 4,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.15)',
          }}>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'start', md: 'center' }} spacing={2}>
                <Box>
                  <Typography variant="h3" sx={{
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                  }}>
                    <AutoAwesomeIcon sx={{ color: '#667eea', fontSize: '2.5rem' }} />
                    Gestión Inteligente de Documentos
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
                    📋 Sube, revisa y gestiona todos tus documentos de forma centralizada
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'end' }}>
                  <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(e, newMode) => newMode && setViewMode(newMode)}
                    size="medium"
                    sx={{
                      '& .MuiToggleButton-root': {
                        borderRadius: '12px',
                        border: '2px solid rgba(102, 126, 234, 0.2)',
                        color: '#667eea',
                        fontWeight: 600,
                        padding: '8px 20px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                          borderColor: '#667eea',
                          transform: 'translateY(-2px)',
                        },
                        '&.Mui-selected': {
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          borderColor: '#667eea',
                          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                          }
                        }
                      }
                    }}
                  >
                    <ToggleButton value="sections">
                      <FolderIcon sx={{ mr: 1 }} /> 📁 Por Sección
                    </ToggleButton>
                    <ToggleButton value="categories">
                      <CategoryIcon sx={{ mr: 1 }} /> 🏷️ Por Categoría
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Stack>
            </CardContent>
          </GradientCard>
        </Slide>

        {/* Stats Dashboard */}
        {isLandlord && <DocumentStatsDashboard stats={stats} />}
      </Box>

      {/* Document Sections */}
      {viewMode === 'sections' ? (
        <Stack spacing={3}>
          {/* Tomador Documents */}
          <Fade in timeout={1000}>
            <GradientCard>
              <Accordion defaultExpanded sx={{
                background: 'transparent',
                boxShadow: 'none',
                '&:before': { display: 'none' },
                '& .MuiAccordionSummary-root': {
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                  borderRadius: '16px',
                  minHeight: 64,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
                    transform: 'translateY(-2px)',
                  }
                },
                '& .MuiAccordionDetails-root': {
                  padding: '24px',
                }
              }}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: '#667eea', fontSize: '1.5rem' }} />}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <PulseAvatar sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      width: 48,
                      height: 48,
                    }}>
                      <PersonIcon sx={{ color: 'white' }} />
                    </PulseAvatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{
                        fontWeight: 700,
                        color: '#667eea',
                        fontSize: '1.3rem'
                      }}>
                        👤 Documentos del Tomador (Inquilino)
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Documentos personales e información del inquilino principal
                      </Typography>
                    </Box>
                    <Badge
                      badgeContent={checklist.tomador_documents.filter(d => d.uploaded).length}
                      max={99}
                      sx={{
                        '& .MuiBadge-badge': {
                          background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          minWidth: '24px',
                          height: '24px',
                          borderRadius: '12px',
                          boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                        }
                      }}
                    >
                      <FolderIcon sx={{ color: '#667eea', fontSize: '1.8rem' }} />
                    </Badge>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {checklist.tomador_documents.map(doc => (
                    <EnhancedDocumentItem
                      key={doc.type}
                      document={doc}
                      onFileSelect={handleFileSelect}
                      onDelete={(id) => {
                        setDocumentToDelete(id);
                        setDeleteConfirmOpen(true);
                      }}
                      onPreview={handlePreview}
                      isUploading={uploadingDocuments.has(doc.type)}
                      canDelete={!isLandlord}
                    />
                  ))}
                </AccordionDetails>
              </Accordion>
            </GradientCard>
          </Fade>

          {/* Codeudor Documents */}
          <Fade in timeout={1200}>
            <GradientCard>
              <Accordion sx={{
                background: 'transparent',
                boxShadow: 'none',
                '&:before': { display: 'none' },
                '& .MuiAccordionSummary-root': {
                  background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(245, 124, 0, 0.1) 100%)',
                  borderRadius: '16px',
                  minHeight: 64,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(245, 124, 0, 0.15) 100%)',
                    transform: 'translateY(-2px)',
                  }
                },
                '& .MuiAccordionDetails-root': {
                  padding: '24px',
                }
              }}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: '#FF9800', fontSize: '1.5rem' }} />}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <PulseAvatar sx={{
                      background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                      width: 48,
                      height: 48,
                    }}>
                      👥
                    </PulseAvatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{
                        fontWeight: 700,
                        color: '#FF9800',
                        fontSize: '1.3rem'
                      }}>
                        🤝 Documentos del Codeudor
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Documentos del garante o codeudor solidario
                      </Typography>
                    </Box>
                    <Badge
                      badgeContent={checklist.codeudor_documents.filter(d => d.uploaded).length}
                      max={99}
                      sx={{
                        '& .MuiBadge-badge': {
                          background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          minWidth: '24px',
                          height: '24px',
                          borderRadius: '12px',
                          boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)',
                        }
                      }}
                    >
                      <FolderIcon sx={{ color: '#FF9800', fontSize: '1.8rem' }} />
                    </Badge>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {checklist.codeudor_documents.map(doc => (
                    <EnhancedDocumentItem
                      key={doc.type}
                      document={doc}
                      onFileSelect={handleFileSelect}
                      onDelete={(id) => {
                        setDocumentToDelete(id);
                        setDeleteConfirmOpen(true);
                      }}
                      onPreview={handlePreview}
                      isUploading={uploadingDocuments.has(doc.type)}
                      canDelete={!isLandlord}
                    />
                  ))}
                </AccordionDetails>
              </Accordion>
            </GradientCard>
          </Fade>

          {/* Otros Documentos Section */}
          <Fade in timeout={1400}>
            <GradientCard sx={{
              border: '3px dashed rgba(33, 150, 243, 0.3)',
              background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.08) 0%, rgba(3, 169, 244, 0.08) 100%)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #2196F3 0%, #03A9F4 50%, #2196F3 100%)',
                backgroundSize: '200% 100%',
                animation: `${shimmer} 3s infinite linear`,
              }
            }}>
              <CardContent sx={{ pt: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <PulseAvatar sx={{
                    background: 'linear-gradient(135deg, #2196F3 0%, #03A9F4 100%)',
                    width: 56,
                    height: 56,
                    animation: `${float} 4s infinite ease-in-out`,
                  }}>
                    <NoteAddIcon sx={{ color: 'white', fontSize: '1.5rem' }} />
                  </PulseAvatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{
                      color: '#2196F3',
                      fontWeight: 700,
                      fontSize: '1.3rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5
                    }}>
                      📎 Otros Documentos (Personalizables)
                      <Chip
                        label="✨ Opcional"
                        size="small"
                        sx={{
                          background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
                          color: 'white',
                          fontWeight: 600,
                          borderRadius: '12px',
                          boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                        }}
                      />
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
                      🚀 Sube documentos adicionales que consideres importantes para fortalecer tu solicitud
                    </Typography>
                  </Box>
                </Box>

                {/* Show existing otros documents */}
                {checklist.otros_documents && checklist.otros_documents.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{
                      color: '#2196F3',
                      fontWeight: 600,
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      📋 Documentos personalizados subidos:
                    </Typography>
                    {checklist.otros_documents.map(doc => (
                      <EnhancedDocumentItem
                        key={doc.type}
                        document={doc}
                        onFileSelect={handleFileSelect}
                        onDelete={(id) => {
                          setDocumentToDelete(id);
                          setDeleteConfirmOpen(true);
                        }}
                        onPreview={handlePreview}
                        isUploading={uploadingDocuments.has(doc.type)}
                        canDelete={!isLandlord}
                      />
                    ))}
                  </Box>
                )}

                {/* Add new custom document button */}
                <input
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  id="other-document-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(file, 'otros');
                    }
                  }}
                />
                <label htmlFor="other-document-upload" style={{ width: '100%', display: 'block' }}>
                  <FloatingActionButton
                    component="span"
                    fullWidth
                    startIcon={<CloudUploadIcon />}
                    sx={{
                      background: 'linear-gradient(135deg, #2196F3 0%, #03A9F4 100%)',
                      borderRadius: '16px',
                      padding: '16px 24px',
                      fontSize: '1rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      border: '2px dashed rgba(33, 150, 243, 0.5)',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        border: '2px solid #2196F3',
                        transform: 'translateY(-4px) scale(1.02)',
                        boxShadow: '0 12px 40px rgba(33, 150, 243, 0.4)',
                        background: 'linear-gradient(135deg, #1976D2 0%, #0288D1 100%)',
                      }
                    }}
                  >
                    🌟 Subir Documento Personalizado
                  </FloatingActionButton>
                </label>

                <Typography variant="caption" sx={{
                  display: 'block',
                  textAlign: 'center',
                  mt: 2,
                  color: 'text.secondary',
                  fontStyle: 'italic'
                }}>
                  💡 Tip: Puedes subir cartas de recomendación, referencias comerciales, certificados adicionales, etc.
                </Typography>
              </CardContent>
            </GradientCard>
          </Fade>
        </Stack>
      ) : (
        // Category View
        <Grid container spacing={4}>
          {Object.entries(categorizedDocuments).map(([category, documents], index) => {
            const categoryColors = {
              'TOMADOR': { primary: '#667eea', secondary: '#764ba2', emoji: '👤' },
              'CODEUDOR': { primary: '#FF9800', secondary: '#F57C00', emoji: '🤝' },
              'GARANTIA': { primary: '#4CAF50', secondary: '#388E3C', emoji: '🏦' },
              'OTROS': { primary: '#2196F3', secondary: '#1976D2', emoji: '📎' }
            };
            const colors = categoryColors[category] || categoryColors['OTROS'];

            return (
              <Grid item xs={12} lg={6} key={category}>
                <Fade in timeout={800 + index * 200}>
                  <GradientCard sx={{
                    height: '100%',
                    background: `linear-gradient(135deg, rgba(${colors.primary === '#667eea' ? '102, 126, 234' : colors.primary === '#FF9800' ? '255, 152, 0' : colors.primary === '#4CAF50' ? '76, 175, 80' : '33, 150, 243'}, 0.05) 0%, rgba(${colors.secondary === '#764ba2' ? '118, 75, 162' : colors.secondary === '#F57C00' ? '245, 124, 0' : colors.secondary === '#388E3C' ? '56, 142, 60' : '25, 118, 210'}, 0.05) 100%)`,
                    border: `2px solid rgba(${colors.primary === '#667eea' ? '102, 126, 234' : colors.primary === '#FF9800' ? '255, 152, 0' : colors.primary === '#4CAF50' ? '76, 175, 80' : '33, 150, 243'}, 0.2)`,
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                      borderRadius: '20px 20px 0 0',
                    }
                  }}>
                    <CardContent sx={{ pt: 3 }}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 3,
                        pb: 2,
                        borderBottom: `2px solid rgba(${colors.primary === '#667eea' ? '102, 126, 234' : colors.primary === '#FF9800' ? '255, 152, 0' : colors.primary === '#4CAF50' ? '76, 175, 80' : '33, 150, 243'}, 0.1)`
                      }}>
                        <PulseAvatar sx={{
                          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                          width: 48,
                          height: 48,
                        }}>
                          <Typography variant="h6" sx={{ color: 'white' }}>
                            {colors.emoji}
                          </Typography>
                        </PulseAvatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{
                            fontWeight: 700,
                            color: colors.primary,
                            fontSize: '1.2rem'
                          }}>
                            {colors.emoji} {category}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {documents.length} documento{documents.length !== 1 ? 's' : ''} en esta categoría
                          </Typography>
                        </Box>
                        <Badge
                          badgeContent={documents.filter(d => d.uploaded).length}
                          max={99}
                          sx={{
                            '& .MuiBadge-badge': {
                              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              minWidth: '22px',
                              height: '22px',
                              borderRadius: '11px',
                              boxShadow: `0 2px 8px rgba(${colors.primary === '#667eea' ? '102, 126, 234' : colors.primary === '#FF9800' ? '255, 152, 0' : colors.primary === '#4CAF50' ? '76, 175, 80' : '33, 150, 243'}, 0.4)`,
                            }
                          }}
                        >
                          <CategoryIcon sx={{ color: colors.primary, fontSize: '1.5rem' }} />
                        </Badge>
                      </Box>

                      <Box sx={{ maxHeight: '600px', overflowY: 'auto', pr: 1 }}>
                        {documents.map(doc => (
                          <EnhancedDocumentItem
                            key={doc.type}
                            document={doc}
                            onFileSelect={handleFileSelect}
                            onDelete={(id) => {
                              setDocumentToDelete(id);
                              setDeleteConfirmOpen(true);
                            }}
                            onPreview={handlePreview}
                            isUploading={uploadingDocuments.has(doc.type)}
                            canDelete={!isLandlord}
                          />
                        ))}
                      </Box>

                      {documents.length === 0 && (
                        <Box sx={{
                          textAlign: 'center',
                          py: 4,
                          color: 'text.secondary'
                        }}>
                          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                            📄 No hay documentos en esta categoría
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </GradientCard>
                </Fade>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Upload Modal */}
      <Dialog
        open={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setOtherDocumentName('');
          setOtherDocumentDescription('');
          setIsOtherDocument(false);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 20px 60px rgba(102, 126, 234, 0.3)',
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: '20px 20px 0 0',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }
        }}>
          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
            <CloudUploadIcon sx={{ fontSize: '1.8rem' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {isOtherDocument ? '🌟 Subir Documento Personalizado' : '📤 Confirmar Subida'}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <GradientCard sx={{ mb: 3, background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(56, 142, 60, 0.1) 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PdfIcon sx={{ color: '#F44336', fontSize: '2rem' }} />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    📁 Archivo seleccionado:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#667eea', fontWeight: 600 }}>
                    {uploadFile?.name}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </GradientCard>

          {/* Additional fields for otros documents */}
          {isOtherDocument && (
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="✏️ Nombre del documento"
                placeholder="Ej: Referencia comercial, Carta de recomendación..."
                value={otherDocumentName}
                onChange={(e) => setOtherDocumentName(e.target.value)}
                required
                helperText="Escribe un nombre descriptivo para este documento"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                      borderWidth: '2px',
                    }
                  }
                }}
              />

              <TextField
                fullWidth
                label="📝 Descripción del documento"
                placeholder="Describe brevemente qué tipo de documento estás subiendo..."
                value={otherDocumentDescription}
                onChange={(e) => setOtherDocumentDescription(e.target.value)}
                multiline
                rows={3}
                required
                helperText="Explica para qué sirve este documento en el proceso"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                      borderWidth: '2px',
                    }
                  }
                }}
              />
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={() => {
              setUploadModalOpen(false);
              setOtherDocumentName('');
              setOtherDocumentDescription('');
              setIsOtherDocument(false);
            }}
            sx={{
              borderRadius: '12px',
              padding: '10px 24px',
              fontWeight: 600,
              color: '#666',
              border: '2px solid #ddd',
              '&:hover': {
                border: '2px solid #667eea',
                background: 'rgba(102, 126, 234, 0.1)',
              }
            }}
          >
            ❌ Cancelar
          </Button>
          <FloatingActionButton
            onClick={handleUpload}
            disabled={isOtherDocument && (!otherDocumentName.trim() || !otherDocumentDescription.trim())}
            startIcon={<CloudUploadIcon />}
            sx={{
              padding: '10px 24px',
              borderRadius: '12px',
              minWidth: '160px',
            }}
          >
            🚀 Subir Documento
          </FloatingActionButton>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            boxShadow: '0 20px 60px rgba(244, 67, 54, 0.2)',
            maxWidth: '400px',
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',
          color: 'white',
          borderRadius: '20px 20px 0 0',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }
        }}>
          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
            <WarningIcon sx={{ fontSize: '1.8rem' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              ⚠️ Confirmar Eliminación
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3, textAlign: 'center' }}>
          <GradientCard sx={{
            background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(211, 47, 47, 0.1) 100%)',
            border: '2px solid rgba(244, 67, 54, 0.2)',
            mb: 2
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <PulseAvatar sx={{
                  background: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',
                  width: 64,
                  height: 64,
                  animation: `${pulse} 2s infinite`,
                }}>
                  <DeleteIcon sx={{ color: 'white', fontSize: '2rem' }} />
                </PulseAvatar>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#F44336' }}>
                  🗑️ ¿Estás seguro de que deseas eliminar este documento?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Esta acción no se puede deshacer y el archivo se eliminará permanentemente.
                </Typography>
              </Box>
            </CardContent>
          </GradientCard>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 2, justifyContent: 'center' }}>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            sx={{
              borderRadius: '12px',
              padding: '10px 24px',
              fontWeight: 600,
              color: '#666',
              border: '2px solid #ddd',
              minWidth: '120px',
              '&:hover': {
                border: '2px solid #667eea',
                background: 'rgba(102, 126, 234, 0.1)',
              }
            }}
          >
            ❌ Cancelar
          </Button>
          <FloatingActionButton
            onClick={handleDeleteConfirm}
            startIcon={<DeleteIcon />}
            sx={{
              background: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',
              padding: '10px 24px',
              borderRadius: '12px',
              minWidth: '120px',
              '&:hover': {
                background: 'linear-gradient(135deg, #D32F2F 0%, #C62828 100%)',
              }
            }}
          >
            🗑️ Eliminar
          </FloatingActionButton>
        </DialogActions>
      </Dialog>

      {/* Preview Modal */}
      <Dialog
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.15)',
            height: '90vh',
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
          color: 'white',
          borderRadius: '20px 20px 0 0',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }
        }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PdfIcon sx={{ fontSize: '1.8rem' }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  👀 Vista Previa del Documento
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                  📄 {previewDocument?.display_name}
                </Typography>
              </Box>
            </Box>
            <ModernIconButton
              onClick={() => setPreviewModalOpen(false)}
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.3)',
                  transform: 'scale(1.1)',
                }
              }}
            >
              <CloseIcon />
            </ModernIconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{
          height: 'calc(90vh - 120px)',
          p: 0,
          overflow: 'hidden',
          position: 'relative'
        }}>
          {previewDocument?.file_url ? (
            <Box sx={{
              width: '100%',
              height: '100%',
              position: 'relative',
              background: '#f5f5f5',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <iframe
                src={previewDocument.file_url.startsWith('http')
                  ? previewDocument.file_url
                  : `http://localhost:8000${previewDocument.file_url}`}
                width="100%"
                height="100%"
                style={{
                  border: 'none',
                  borderRadius: '0 0 20px 20px',
                  background: 'white'
                }}
                title="Document Preview"
              />
              <Box sx={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)',
                fontSize: '0.85rem',
                fontWeight: 500
              }}>
                📊 Documento PDF
              </Box>
            </Box>
          ) : (
            <Box sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(211, 47, 47, 0.1) 100%)'
            }}>
              <GradientCard sx={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)',
                maxWidth: '400px',
                textAlign: 'center'
              }}>
                <CardContent>
                  <PulseAvatar sx={{
                    background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                    width: 80,
                    height: 80,
                    mx: 'auto',
                    mb: 2,
                  }}>
                    <ErrorIcon sx={{ color: 'white', fontSize: '2.5rem' }} />
                  </PulseAvatar>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    ⚠️ Vista previa no disponible
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No se puede mostrar la vista previa de este documento en este momento.
                  </Typography>
                </CardContent>
              </GradientCard>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default EnhancedTenantDocumentUpload;