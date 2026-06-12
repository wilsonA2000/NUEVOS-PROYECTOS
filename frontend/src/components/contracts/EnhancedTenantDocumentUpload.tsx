import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
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
  Stack,
  Grid,
  Fade,
  Dialog,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
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
  CheckCircleOutline as CheckCircleOutlineIcon,
  HighlightOff as HighlightOffIcon,
  HelpOutline as HelpOutlineIcon,
  NoteAdd as NoteAddIcon,
  History as HistoryIcon,
  Dashboard as DashboardIcon,
  SwapHoriz as SwapHorizIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { vhColors } from '../../theme/tokens';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';


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
    requires_correction: 'info',
  };
  return colors[status as keyof typeof colors] || 'default';
};

const getStatusAccentColor = (status: string): string => {
  const map: Record<string, string> = {
    pending: 'warning.main',
    approved: 'success.main',
    rejected: 'error.main',
    requires_correction: 'info.main',
  };
  return map[status] || 'grey.400';
};

const getStatusIcon = (status: string) => {
  const iconStyle = { fontSize: '1.2rem' };
  switch (status) {
    case 'approved':
      return <CheckCircleIcon sx={{ ...iconStyle, color: vhColors.success }} />;
    case 'rejected':
      return <HighlightOffIcon sx={{ ...iconStyle, color: vhColors.error }} />;
    case 'requires_correction':
      return <EditIcon sx={{ ...iconStyle, color: vhColors.accentBlue }} />;
    default:
      return <AccessTimeIcon sx={{ ...iconStyle, color: vhColors.warning }} />;
  }
};

const getStatusLabel = (status: string): string => {
  const labels = {
    pending: 'Pendiente de Revisión',
    approved: 'Aprobado ',
    rejected: 'Rechazado ',
    requires_correction: 'Requiere Corrección ',
  };
  return labels[status as keyof typeof labels] || status;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
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
}> = React.memo(
  ({ document, onFileSelect, onDelete, onPreview, isUploading, canDelete }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: acceptedFiles => {
        if (acceptedFiles.length > 0) {
          onFileSelect(acceptedFiles[0]!, document.type);
        }
      },
      accept: { 'application/pdf': ['.pdf'] },
      disabled: isUploading || (document.uploaded && document.status === 'approved'),
      multiple: false,
    });

    const isApproved = document.status === 'approved';

    // ── EMPTY STATE: Prominent dropzone ──
    if (!document.uploaded) {
      return (
        <Box
          {...getRootProps()}
          sx={{
            mb: 2,
            p: 2.5,
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : document.required ? 'warning.light' : 'grey.300',
            borderRadius: 2,
            cursor: isUploading ? 'not-allowed' : 'pointer',
            bgcolor: isDragActive ? 'primary.50' : document.required ? 'warning.50' : 'grey.50',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            transition: 'all 0.2s ease',
            '&:hover': !isUploading ? { borderColor: 'primary.main', bgcolor: 'action.hover' } : {},
          }}
        >
          <input {...getInputProps()} />
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1.5,
              bgcolor: isDragActive ? 'primary.100' : document.required ? 'warning.100' : 'grey.200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isUploading ? (
              <AccessTimeIcon sx={{ color: 'text.secondary' }} />
            ) : (
              <CloudUploadIcon
                sx={{ color: isDragActive ? 'primary.main' : document.required ? 'warning.dark' : 'text.disabled' }}
              />
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction='row' alignItems='center' spacing={1} flexWrap='wrap'>
              <Typography variant='subtitle2' fontWeight={600} color='text.primary'>
                {document.display_name}
              </Typography>
              {document.required && (
                <Chip label='Requerido' size='small' color='error' variant='filled' sx={{ height: 20, fontSize: '0.65rem' }} />
              )}
            </Stack>
            <Typography variant='caption' color='text.secondary'>
              {isDragActive ? '¡Suelta el PDF aquí!' : document.description || 'Arrastra un PDF o haz clic para seleccionar'}
            </Typography>
          </Box>
          <Button
            variant='outlined'
            size='small'
            color={document.required ? 'warning' : 'primary'}
            startIcon={<UploadFileIcon />}
            disabled={isUploading}
            sx={{ flexShrink: 0, fontWeight: 600 }}
            onClick={e => e.stopPropagation()}
          >
            {isUploading ? 'Subiendo...' : 'Subir PDF'}
          </Button>
        </Box>
      );
    }

    // ── UPLOADED STATE: Compact info row ──
    return (
      <Card
        elevation={0}
        sx={{
          mb: 1.5,
          border: '1px solid',
          borderColor: isApproved ? 'success.light' : document.status === 'rejected' ? 'error.light' : document.status === 'requires_correction' ? 'info.light' : 'divider',
          bgcolor: isApproved ? 'success.50' : document.status === 'rejected' ? 'error.50' : 'background.paper',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Status icon */}
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              bgcolor:
                isApproved ? 'success.100'
                : document.status === 'rejected' ? 'error.100'
                : document.status === 'requires_correction' ? 'info.100'
                : 'warning.100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {getStatusIcon(document.status)}
          </Box>

          {/* Document info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction='row' alignItems='center' spacing={1} flexWrap='wrap'>
              <Typography variant='body2' fontWeight={600} color='text.primary' noWrap>
                {document.display_name}
              </Typography>
              <Chip
                label={getStatusLabel(document.status)}
                size='small'
                color={getStatusColor(document.status) as any}
                variant='filled'
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
              {document.required && (
                <Chip label='Req.' size='small' color='error' variant='outlined' sx={{ height: 20, fontSize: '0.65rem' }} />
              )}
            </Stack>
            <Typography variant='caption' color='text.secondary'>
              {document.original_filename || 'Documento subido'}
              {document.file_size ? ` · ${formatFileSize(document.file_size)}` : ''}
              {document.uploaded_at
                ? ` · ${format(new Date(document.uploaded_at), 'dd/MM/yyyy', { locale: es })}`
                : ''}
            </Typography>
            {document.review_notes && (
              <Alert
                severity={document.status === 'rejected' ? 'error' : 'info'}
                sx={{ mt: 1, py: 0.5, '& .MuiAlert-message': { py: 0.5 } }}
              >
                <Typography variant='caption'>{document.review_notes}</Typography>
                {document.reviewed_by && (
                  <Typography variant='caption' display='block' sx={{ opacity: 0.8 }}>
                    — {document.reviewed_by.full_name}
                  </Typography>
                )}
              </Alert>
            )}
          </Box>

          {/* Actions */}
          <Stack direction='row' spacing={0.5} flexShrink={0}>
            <Tooltip title='Ver documento' arrow>
              <IconButton size='small' color='primary' onClick={e => { e.stopPropagation(); onPreview(document); }}>
                <VisibilityIcon fontSize='small' />
              </IconButton>
            </Tooltip>
            {canDelete && !isApproved && (
              <Tooltip title='Eliminar' arrow>
                <IconButton size='small' color='error' onClick={e => { e.stopPropagation(); onDelete(document.id ?? ''); }}>
                  <DeleteIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            )}
            {document.status === 'requires_correction' && (
              <Tooltip title='Reemplazar' arrow>
                <Box {...getRootProps()}>
                  <input {...getInputProps()} />
                  <IconButton size='small' color='warning'>
                    <SwapHorizIcon fontSize='small' />
                  </IconButton>
                </Box>
              </Tooltip>
            )}
          </Stack>
        </Box>
        {isUploading && <LinearProgress />}
      </Card>
    );
  },
);

// ============================================================================
// STATS DASHBOARD COMPONENT
// ============================================================================

const DocumentStatsDashboard: React.FC<{ stats: DocumentStats }> = ({
  stats,
}) => {
  const progressPercentage =
    stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  const statItems = [
    { label: 'Total', value: stats.total, color: 'text.primary', bgColor: 'grey.50', borderColor: 'divider' },
    { label: 'Pendientes', value: stats.pending, color: 'warning.dark', bgColor: 'warning.50', borderColor: 'warning.200' },
    { label: 'Aprobados', value: stats.approved, color: 'success.dark', bgColor: 'success.50', borderColor: 'success.200' },
    { label: 'Por revisar', value: stats.rejected + stats.requires_correction, color: 'error.dark', bgColor: 'error.50', borderColor: 'error.200' },
  ];

  return (
    <Card elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      {/* Header strip con color VeriHome */}
      <Box sx={{ bgcolor: '#2d4264', px: 2.5, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction='row' alignItems='center' spacing={1}>
          <DashboardIcon sx={{ color: 'white', fontSize: '1.1rem' }} />
          <Typography variant='subtitle2' fontWeight={600} color='white'>
            Resumen de documentos
          </Typography>
        </Stack>
        <Chip
          label={`${progressPercentage}% completado`}
          size='small'
          sx={{
            bgcolor: progressPercentage === 100 ? 'success.light' : 'rgba(255,255,255,0.2)',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.7rem',
          }}
        />
      </Box>

      <CardContent sx={{ pt: 2 }}>
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {statItems.map(({ label, value, color, bgColor }) => (
            <Grid item xs={6} sm={3} key={label}>
              <Box sx={{
                textAlign: 'center',
                p: 1.5,
                bgcolor: bgColor,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
              }}>
                <Typography variant='h4' fontWeight={700} color={color} lineHeight={1}>{value}</Typography>
                <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>{label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box>
          <Stack direction='row' justifyContent='space-between' mb={0.5}>
            <Typography variant='caption' color='text.secondary'>Progreso de aprobación</Typography>
            <Typography variant='caption' fontWeight={600} color={progressPercentage === 100 ? 'success.main' : 'text.secondary'}>
              {stats.approved}/{stats.total}
            </Typography>
          </Stack>
          <LinearProgress
            variant='determinate'
            value={progressPercentage}
            color={progressPercentage === 100 ? 'success' : 'primary'}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAIN ENHANCED COMPONENT
// ============================================================================

const EnhancedTenantDocumentUpload: React.FC<
  EnhancedTenantDocumentUploadProps
> = ({
  processId,
  onDocumentUploaded,

  guaranteeType = 'none',
  codeudorName = '',
  isLandlord = false,
}) => {
  const { showWarning } = useSnackbar();
  const [checklist, setChecklist] = useState<DocumentSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [uploadingDocuments, setUploadingDocuments] = useState<Set<string>>(
    new Set(),
  );

  // Estados para "otros documentos"
  const [isOtherDocument, setIsOtherDocument] = useState(false);
  const [otherDocumentName, setOtherDocumentName] = useState('');
  const [otherDocumentDescription, setOtherDocumentDescription] = useState('');

  // Estados para preview
  const [previewDocument, setPreviewDocument] =
    useState<EnhancedDocumentType | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Estados para confirmación de eliminación
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  // Estado para vista de categorías
  const [viewMode, setViewMode] = useState<'sections' | 'categories'>(
    'sections',
  );

  // Stats
  const stats = useMemo(() => {
    if (!checklist)
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        requires_correction: 0,
      };

    const allDocs = [
      ...checklist.tomador_documents,
      ...checklist.codeudor_documents,
      ...checklist.guarantee_documents,
      ...checklist.otros_documents,
    ];

    return {
      total: allDocs.length,
      pending: allDocs.filter(d => d.status === 'pending').length,
      approved: allDocs.filter(d => d.status === 'approved').length,
      rejected: allDocs.filter(d => d.status === 'rejected').length,
      requires_correction: allDocs.filter(
        d => d.status === 'requires_correction',
      ).length,
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

      const response = await fetch(
        `${API_BASE_URL}/requests/api/documents/process/${processId}/checklist/`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Enhanced validation with status and metadata
      const validatedData: DocumentSection = {
        tomador_documents: Array.isArray(data.tomador_documents)
          ? data.tomador_documents
          : [],
        codeudor_documents: Array.isArray(data.codeudor_documents)
          ? data.codeudor_documents
          : [],
        guarantee_documents: Array.isArray(data.guarantee_documents)
          ? data.guarantee_documents
          : [],
        otros_documents: Array.isArray(data.otros_documents)
          ? data.otros_documents
          : [],
      };

      setChecklist(validatedData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el checklist de documentos');
    } finally {
      setLoading(false);
    }
  }, [processId]);

  const deleteDocument = useCallback(
    async (documentId: string) => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(
          `${API_BASE_URL}/requests/api/documents/${documentId}/delete/`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error('Error al eliminar el documento');
        }

        // Refresh checklist
        await fetchChecklist();
        onDocumentUploaded?.();
      } catch (err) {
        setError('Error al eliminar el documento');
      }
    },
    [fetchChecklist, onDocumentUploaded],
  );

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleFileSelect = useCallback((file: File, documentType: string) => {
    // Validate and potentially rename file if name is too long
    let finalFile = file;
    if (file.name.length > 95) {
      // Leave room for extension
      const extension = file.name.split('.').pop() || 'pdf';
      const timestamp = Date.now();
      const newName = `documento_${documentType}_${timestamp}.${extension}`;

      // Create a new File object with shorter name
      finalFile = new File([file], newName, { type: file.type });

      // Show warning to user
      showWarning(
        `El nombre del archivo era muy largo (${file.name.length} caracteres). Se ha renombrado automaticamente a: ${newName}`,
      );
    }

    setUploadFile(finalFile);

    // Check if it's "otros" type
    const isOtherDoc = documentType === 'otros';
    setIsOtherDocument(isOtherDoc);

    // Para documentos "otros", generar un tipo único con timestamp
    // Esto permite que se suban múltiples documentos personalizados sin sobreescribir
    let finalDocumentType = documentType;
    if (isOtherDoc) {
      const timestamp = Date.now();
      finalDocumentType = `otros_${timestamp}`;
    }

    setSelectedDocumentType(finalDocumentType);

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
        formData.append(
          'other_description',
          `${otherDocumentName}: ${otherDocumentDescription}`,
        );
      }

      // Upload file

      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${API_BASE_URL}/requests/api/documents/upload/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(
            errorJson.error ||
              errorJson.detail ||
              'Error al subir el documento',
          );
        } catch (e) {
          throw new Error('Error al subir el documento');
        }
      }

      // Refresh checklist
      await fetchChecklist();
      onDocumentUploaded?.();
    } catch (err: any) {
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
  }, [
    uploadFile,
    selectedDocumentType,
    processId,
    isOtherDocument,
    otherDocumentName,
    otherDocumentDescription,
    fetchChecklist,
    onDocumentUploaded,
  ]);

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
          <Skeleton variant='rectangular' height={60} />
          <Skeleton variant='rectangular' height={200} />
          <Skeleton variant='rectangular' height={200} />
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Alert
          severity='error'
          action={
            <Button color='inherit' size='small' onClick={fetchChecklist}>
              <RefreshIcon sx={{ mr: 0.5 }} /> Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (!checklist) return null;

  const categorizedDocuments = {
    TOMADOR: checklist.tomador_documents,
    CODEUDOR: checklist.codeudor_documents,
    GARANTIA: checklist.guarantee_documents,
    OTROS: checklist.otros_documents,
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {isLandlord && (
        <Box sx={{ px: 3, pt: 2.5 }}>
          <DocumentStatsDashboard stats={stats} />
        </Box>
      )}

      {/* Compact header with toggle */}
      <Box sx={{ px: 3, pt: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Typography variant='body2' color='text.secondary'>
          {stats.approved}/{stats.total} documentos aprobados
        </Typography>
        <ToggleButtonGroup value={viewMode} exclusive onChange={(_e, newMode) => newMode && setViewMode(newMode)} size='small'>
          <ToggleButton value='sections' sx={{ px: 1.5 }}>
            <FolderIcon sx={{ fontSize: '0.9rem', mr: 0.5 }} /> Secciones
          </ToggleButton>
          <ToggleButton value='categories' sx={{ px: 1.5 }}>
            <CategoryIcon sx={{ fontSize: '0.9rem', mr: 0.5 }} /> Categorías
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Document Sections */}
      {viewMode === 'sections' ? (
        <Box sx={{ px: 3, pb: 3 }}>
        <Stack spacing={3}>
          {/* Tomador Documents */}
          <Fade in timeout={1000}>
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
              <Accordion
                defaultExpanded
                sx={{
                  background: 'transparent',
                  boxShadow: 'none',
                  '&:before': { display: 'none' },
                  '& .MuiAccordionDetails-root': { padding: '20px' },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.8)' }} />}
                  sx={{
                    bgcolor: '#2d4264',
                    '&:hover': { filter: 'brightness(0.88)' },
                    '&.Mui-expanded': { filter: 'brightness(0.85)' },
                    '& .MuiAccordionSummary-content': { my: 1 },
                  }}
                >
                  <Stack direction='row' alignItems='center' spacing={2} sx={{ width: '100%', mr: 1 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 36, height: 36 }}>
                      <PersonIcon sx={{ color: 'white', fontSize: '1.1rem' }} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant='subtitle1' fontWeight={600} color='white'>Documentos del Tomador</Typography>
                      <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.75)' }}>
                        {checklist.tomador_documents.filter(d => d.uploaded).length}/{checklist.tomador_documents.length} subidos
                      </Typography>
                    </Box>
                    <Chip
                      label={`${checklist.tomador_documents.filter(d => d.status === 'approved').length} aprobados`}
                      size='small'
                      sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600, fontSize: '0.7rem' }}
                    />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  {checklist.tomador_documents.map(doc => (
                    <EnhancedDocumentItem
                      key={doc.type}
                      document={doc}
                      onFileSelect={handleFileSelect}
                      onDelete={id => {
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
            </Card>
          </Fade>

          {/* Codeudor Documents */}
          <Fade in timeout={1200}>
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
              <Accordion
                sx={{
                  background: 'transparent',
                  boxShadow: 'none',
                  '&:before': { display: 'none' },
                  '& .MuiAccordionDetails-root': { padding: '20px' },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.8)' }} />}
                  sx={{
                    bgcolor: '#5c3d1a',
                    '&:hover': { filter: 'brightness(0.88)' },
                    '&.Mui-expanded': { filter: 'brightness(0.85)' },
                    '& .MuiAccordionSummary-content': { my: 1 },
                  }}
                >
                  <Stack direction='row' alignItems='center' spacing={2} sx={{ width: '100%', mr: 1 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 36, height: 36 }}>
                      <PeopleIcon sx={{ color: 'white', fontSize: '1.1rem' }} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant='subtitle1' fontWeight={600} color='white'>Documentos del Codeudor</Typography>
                      <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.85)' }}>
                        {checklist.codeudor_documents.filter(d => d.uploaded).length}/{checklist.codeudor_documents.length} subidos
                      </Typography>
                    </Box>
                    <Chip
                      label={`${checklist.codeudor_documents.filter(d => d.status === 'approved').length} aprobados`}
                      size='small'
                      sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600, fontSize: '0.7rem' }}
                    />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  {checklist.codeudor_documents.map(doc => (
                    <EnhancedDocumentItem
                      key={doc.type}
                      document={doc}
                      onFileSelect={handleFileSelect}
                      onDelete={id => {
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
            </Card>
          </Fade>

          {/* Otros Documentos Section */}
          <Fade in timeout={1400}>
            <Card elevation={0} sx={{ border: '1px dashed', borderColor: 'primary.light', overflow: 'hidden' }}>
              <AccordionSummary
                component='div'
                sx={{ cursor: 'default', '&:hover': { bgcolor: 'transparent' } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', py: 0.5 }}>
                  <Avatar sx={{ bgcolor: 'info.main', width: 40, height: 40 }}>
                    <NoteAddIcon sx={{ fontSize: '1.1rem' }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction='row' alignItems='center' spacing={1}>
                      <Typography variant='subtitle1' fontWeight={600} color='text.primary'>
                        Documentos Adicionales
                      </Typography>
                      <Chip label='Opcional' size='small' color='info' variant='outlined' />
                      {checklist.otros_documents?.length > 0 && (
                        <Chip
                          label={`${checklist.otros_documents.length} subido${checklist.otros_documents.length !== 1 ? 's' : ''}`}
                          size='small'
                          color='success'
                          variant='outlined'
                        />
                      )}
                    </Stack>
                    <Typography variant='caption' color='text.secondary'>
                      Cartas de recomendación, referencias comerciales, certificados adicionales
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>

              <Box sx={{ px: 3, pb: 3 }}>
                {/* Documentos ya subidos */}
                {checklist.otros_documents?.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Alert severity='success' sx={{ mb: 2 }}>
                      <Typography variant='body2' fontWeight={600}>
                        {checklist.otros_documents.length} documento{checklist.otros_documents.length !== 1 ? 's' : ''} personalizado{checklist.otros_documents.length !== 1 ? 's' : ''} subido{checklist.otros_documents.length !== 1 ? 's' : ''}
                      </Typography>
                      <Typography variant='caption'>Puedes agregar más con el botón de abajo</Typography>
                    </Alert>
                    {checklist.otros_documents.map((doc, index) => (
                      <EnhancedDocumentItem
                        key={doc.id || doc.type || `otros_${index}`}
                        document={doc}
                        onFileSelect={handleFileSelect}
                        onDelete={id => { setDocumentToDelete(id); setDeleteConfirmOpen(true); }}
                        onPreview={handlePreview}
                        isUploading={uploadingDocuments.has(doc.type)}
                        canDelete={!isLandlord}
                      />
                    ))}
                  </Box>
                )}

                {(!checklist.otros_documents || checklist.otros_documents.length === 0) && (
                  <Alert severity='info' sx={{ mb: 2 }}>
                    <Typography variant='body2' fontWeight={600}>Sin documentos adicionales</Typography>
                    <Typography variant='caption'>Haz clic en el botón para agregar tu primer documento personalizado</Typography>
                  </Alert>
                )}

                <input
                  type='file'
                  accept='.pdf'
                  style={{ display: 'none' }}
                  id='other-document-upload'
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) { handleFileSelect(file, 'otros'); e.target.value = ''; }
                  }}
                />
                <label htmlFor='other-document-upload' style={{ width: '100%', display: 'block' }}>
                  <Button
                    component='span'
                    variant='outlined'
                    color='primary'
                    fullWidth
                    startIcon={<NoteAddIcon />}
                    sx={{ py: 1.5, fontWeight: 600 }}
                  >
                    {checklist.otros_documents?.length > 0 ? 'Agregar otro documento' : 'Subir documento personalizado'}
                  </Button>
                </label>
              </Box>
            </Card>
          </Fade>
        </Stack>
        </Box>
      ) : (
        // Category View
        <Box sx={{ px: 3, pb: 3 }}>
        <Grid container spacing={3}>
          {Object.entries(categorizedDocuments).map(
            ([category, documents], index) => {
              const catConfig: Record<string, { color: 'primary' | 'warning' | 'success' | 'info'; label: string; icon: React.ReactNode }> = {
                TOMADOR: { color: 'primary', label: 'Documentos del Tomador', icon: <PersonIcon /> },
                CODEUDOR: { color: 'warning', label: 'Documentos del Codeudor', icon: <PeopleIcon /> },
                GARANTIA: { color: 'success', label: 'Garantías', icon: <FolderIcon /> },
                OTROS: { color: 'info', label: 'Otros Documentos', icon: <NoteAddIcon /> },
              };
              const cfg = catConfig[category] ?? catConfig['OTROS']!;

              return (
                <Grid item xs={12} lg={6} key={category}>
                  <Fade in timeout={800 + index * 200}>
                    <Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                      {/* Category header strip */}
                      <Box sx={{ bgcolor: `${cfg.color}.main`, px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Stack direction='row' alignItems='center' spacing={1.5}>
                          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32 }}>
                            {React.cloneElement(cfg.icon as React.ReactElement, { sx: { fontSize: '1rem', color: 'white' } })}
                          </Avatar>
                          <Box>
                            <Typography variant='subtitle2' fontWeight={600} color='white'>{cfg.label}</Typography>
                            <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.8)' }}>
                              {documents.length} documento{documents.length !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        </Stack>
                        <Badge badgeContent={documents.filter(d => d.uploaded).length} max={99} color='default'>
                          <FolderIcon sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.4rem' }} />
                        </Badge>
                      </Box>

                      <CardContent sx={{ pt: 2 }}>

                        <Box
                          sx={{ maxHeight: '600px', overflowY: 'auto', pr: 1 }}
                        >
                          {documents.map(doc => (
                            <EnhancedDocumentItem
                              key={doc.type}
                              document={doc}
                              onFileSelect={handleFileSelect}
                              onDelete={id => {
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
                          <Box
                            sx={{
                              textAlign: 'center',
                              py: 4,
                              color: 'text.secondary',
                            }}
                          >
                            <Typography
                              variant='body2'
                              sx={{ fontStyle: 'italic' }}
                            >
                              No hay documentos en esta categoría
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Fade>
                </Grid>
              );
            },
          )}
        </Grid>
        </Box>
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
        maxWidth='sm'
        fullWidth
      >
        {/* Header VeriHome branded */}
        <Box sx={{ bgcolor: '#2d4264', px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CloudUploadIcon sx={{ color: 'white' }} />
          <Typography variant='h6' fontWeight={600} color='white'>
            {isOtherDocument ? 'Documento Personalizado' : 'Confirmar Subida'}
          </Typography>
        </Box>

        <DialogContent sx={{ pt: 2.5 }}>
          {uploadFile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, mb: 2.5, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
              <PdfIcon color='error' />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant='body2' fontWeight={600} noWrap>{uploadFile.name}</Typography>
                <Typography variant='caption' color='text.secondary'>{(uploadFile.size / 1024).toFixed(1)} KB · PDF</Typography>
              </Box>
              <Chip label='Listo' size='small' color='success' variant='outlined' />
            </Box>
          )}

          {isOtherDocument && (
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label='Nombre del documento'
                placeholder='Ej: Referencia comercial, Carta de recomendación...'
                value={otherDocumentName}
                onChange={e => setOtherDocumentName(e.target.value)}
                required
                helperText='Nombre descriptivo para identificar este documento'
              />
              <TextField
                fullWidth
                label='Descripción'
                placeholder='Describe brevemente qué tipo de documento estás subiendo...'
                value={otherDocumentDescription}
                onChange={e => setOtherDocumentDescription(e.target.value)}
                multiline
                rows={3}
                required
                helperText='Para qué sirve este documento en el proceso'
              />
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
          <Button
            onClick={() => {
              setUploadModalOpen(false);
              setOtherDocumentName('');
              setOtherDocumentDescription('');
              setIsOtherDocument(false);
            }}
            variant='outlined'
            color='inherit'
          >
            Cancelar
          </Button>
          <Button
            variant='contained'
            onClick={handleUpload}
            disabled={isOtherDocument && (!otherDocumentName.trim() || !otherDocumentDescription.trim())}
            startIcon={<CloudUploadIcon />}
          >
            Subir Documento
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth='xs'
        fullWidth
      >
        <Box sx={{ bgcolor: 'error.main', px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarningIcon sx={{ color: 'white' }} />
          <Typography variant='h6' fontWeight={600} color='white'>Eliminar documento</Typography>
        </Box>

        <DialogContent sx={{ pt: 3, textAlign: 'center' }}>
          <Avatar sx={{ bgcolor: 'error.50', width: 56, height: 56, mx: 'auto', mb: 2, border: '2px solid', borderColor: 'error.light' }}>
            <DeleteIcon color='error' />
          </Avatar>
          <Typography variant='body1' fontWeight={600} gutterBottom>¿Confirmar eliminación?</Typography>
          <Typography variant='body2' color='text.secondary'>
            Esta acción no se puede deshacer. El archivo se eliminará permanentemente.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5, justifyContent: 'center' }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} variant='outlined' color='inherit'>
            Cancelar
          </Button>
          <Button variant='contained' color='error' onClick={handleDeleteConfirm} startIcon={<DeleteIcon />}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Modal */}
      <Dialog
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        maxWidth='xl'
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        {/* Header VeriHome branded */}
        <Box sx={{ bgcolor: '#1e2d40', px: 3, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction='row' alignItems='center' spacing={1.5}>
            <PdfIcon sx={{ color: 'white', fontSize: '1.4rem' }} />
            <Box>
              <Typography variant='subtitle2' fontWeight={600} color='white'>Vista Previa del Documento</Typography>
              <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.75)' }}>{previewDocument?.display_name}</Typography>
            </Box>
          </Stack>
          <IconButton onClick={() => setPreviewModalOpen(false)} size='small' sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <DialogContent sx={{ height: 'calc(90vh - 60px)', p: 0, overflow: 'hidden', bgcolor: 'grey.100' }}>
          {previewDocument?.file_url ? (
            <iframe
              src={
                previewDocument.file_url.startsWith('http')
                  ? previewDocument.file_url
                  : `${API_BASE_URL.replace('/api/v1', '')}${previewDocument.file_url}`
              }
              width='100%'
              height='100%'
              style={{ border: 'none', display: 'block' }}
              title='Document Preview'
            />
          ) : (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Stack alignItems='center' spacing={2} sx={{ textAlign: 'center', p: 4 }}>
                <Avatar sx={{ bgcolor: 'error.light', width: 64, height: 64 }}>
                  <ErrorIcon color='error' sx={{ fontSize: '2rem' }} />
                </Avatar>
                <Typography variant='h6' fontWeight={600}>Vista previa no disponible</Typography>
                <Typography variant='body2' color='text.secondary'>No se puede mostrar este documento en este momento.</Typography>
              </Stack>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default EnhancedTenantDocumentUpload;
