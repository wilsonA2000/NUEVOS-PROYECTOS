import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  LinearProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tooltip,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Schedule as PendingIcon,
  Description as DocumentIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Folder as FolderIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ThumbUp as ApproveIcon,
  ThumbDown as RejectIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

interface DocumentType {
  id: string;
  type: string;
  display_name: string;
  required: boolean;
  uploaded: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'requires_correction';
  status_display: string;
  status_color: string;
  uploaded_at?: string;
  reviewed_at?: string;
  file_url?: string;
  review_notes?: string;
  other_description?: string;
  original_filename?: string;
  file_size?: number;
}

interface DocumentChecklist {
  tomador_documents: DocumentType[];
  codeudor_documents: DocumentType[];
  otros_documents: DocumentType[];
  total_required: number;
  total_uploaded: number;
  total_approved: number;
  total_pending: number;
  total_rejected: number;
  completion_percentage: number;
  all_required_uploaded: boolean;
  all_approved: boolean;
  can_proceed: boolean;
  property_request_id: string;
  property_title: string;
  tenant_name: string;
  tenant_email: string;
}

interface LandlordDocumentReviewProps {
  processId: string;
  onDocumentReviewed?: () => void;
  onAllApproved?: () => void;
}

const LandlordDocumentReview: React.FC<LandlordDocumentReviewProps> = ({
  processId,
  onDocumentReviewed,
  onAllApproved
}) => {
  const { user } = useAuth();
  
  // Estados principales
  const [checklist, setChecklist] = useState<DocumentChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Estados para review modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'requires_correction'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    loadDocumentChecklist();
  }, [processId]);

  const loadDocumentChecklist = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log(`🔍 Loading document checklist for process ${processId}`);
      const response = await fetch(`/api/v1/requests/api/documents/process/${processId}/checklist/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setChecklist(data);
      console.log(`✅ Loaded ${data.total_uploaded} documents for review`);
    } catch (err: any) {
      setError(err.message || 'Error al cargar documentos');
      console.error('❌ Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDocument = async () => {
    if (!selectedDocument) {
      console.error('❌ No selected document');
      return;
    }
    
    if (!selectedDocument.id) {
      console.error('❌ Selected document has no ID:', selectedDocument);
      setError('Error: Documento sin ID válido');
      return;
    }
    
    try {
      setReviewing(true);
      
      const reviewData = {
        status: reviewStatus,
        review_notes: reviewNotes
      };
      
      console.log(`📝 Reviewing document ${selectedDocument.id}:`, reviewData);
      const response = await fetch(`/api/v1/requests/api/documents/${selectedDocument.id}/review/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al revisar documento');
      }
      
      // Éxito - recargar checklist y cerrar modal
      await loadDocumentChecklist();
      setReviewModalOpen(false);
      resetReviewForm();
      
      if (onDocumentReviewed) {
        onDocumentReviewed();
      }
      
      // Verificar si todos los documentos están aprobados
      const updatedResponse = await fetch(`/api/v1/requests/api/documents/process/${processId}/checklist/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        if (updatedData.all_approved && onAllApproved) {
          onAllApproved();
        }
      }
      
      console.log(`✅ Document ${selectedDocument.id} reviewed successfully`);
      
    } catch (err: any) {
      setError(err.message || 'Error al revisar documento');
      console.error('❌ Error reviewing document:', err);
    } finally {
      setReviewing(false);
    }
  };

  const resetReviewForm = () => {
    setSelectedDocument(null);
    setReviewStatus('approved');
    setReviewNotes('');
  };

  const openReviewModal = (document: DocumentType) => {
    console.log('🔍 Opening review modal for document:', document);
    setSelectedDocument(document);
    // Mapear el estado del documento a valores válidos para el Select
    if (document.status === 'approved') {
      setReviewStatus('approved');
    } else if (document.status === 'rejected') {
      setReviewStatus('rejected');
    } else if (document.status === 'requires_correction') {
      setReviewStatus('requires_correction');
    } else {
      // Para 'pending' u otros estados, usar 'approved' como default
      setReviewStatus('approved');
    }
    setReviewNotes(document.review_notes || '');
    setReviewModalOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckIcon sx={{ color: 'success.main' }} />;
      case 'rejected':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'requires_correction':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'pending':
        return <PendingIcon sx={{ color: 'info.main' }} />;
      default:
        return <DocumentIcon sx={{ color: 'grey.400' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'requires_correction': return 'warning';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const renderDocumentItem = (doc: DocumentType) => {
    return (
      <ListItem
        key={doc.id}
        sx={{
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          mb: 1,
          bgcolor: doc.status === 'approved' ? 'success.50' : 
                  doc.status === 'rejected' ? 'error.50' :
                  doc.status === 'requires_correction' ? 'warning.50' :
                  'background.paper'
        }}
      >
        <ListItemIcon>
          {getStatusIcon(doc.status)}
        </ListItemIcon>
        
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                {doc.display_name}
              </Typography>
              {doc.required && (
                <Chip label="Requerido" size="small" color="warning" />
              )}
            </Box>
          }
          secondary={
            <React.Fragment>
              <Chip 
                label={doc.status_display} 
                size="small" 
                color={getStatusColor(doc.status) as any}
                sx={{ mr: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                Subido: {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'N/A'}
              </Typography>
              {doc.original_filename && (
                <Typography variant="caption" display="block" color="text.secondary">
                  Archivo: {doc.original_filename} ({doc.file_size ? formatFileSize(doc.file_size) : 'N/A'})
                </Typography>
              )}
              {doc.other_description && (
                <Typography variant="caption" display="block" color="text.secondary">
                  Descripción: {doc.other_description}
                </Typography>
              )}
              {doc.review_notes && (
                <Typography variant="caption" display="block" color="text.secondary">
                  Notas: {doc.review_notes}
                </Typography>
              )}
            </React.Fragment>
          }
        />
        
        <ListItemSecondaryAction>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {doc.file_url && (
              <Tooltip title="Ver documento">
                <IconButton
                  size="small"
                  onClick={() => {
                    console.log('🔍 Opening document URL:', doc.file_url);
                    // Construir URL absoluta para el archivo - USAR BACKEND URL
                    const backendUrl = 'http://localhost:8000';  // Django backend
                    const fullUrl = doc.file_url.startsWith('/') 
                      ? `${backendUrl}${doc.file_url}`
                      : doc.file_url;
                    console.log('🌐 Full URL (Backend):', fullUrl);
                    
                    // Intentar abrir en nueva ventana
                    const newWindow = window.open(fullUrl, '_blank');
                    if (!newWindow) {
                      console.warn('⚠️ Popup blocked, trying direct navigation');
                      window.location.href = fullUrl;
                    }
                  }}
                >
                  <ViewIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Revisar documento">
              <IconButton
                size="small"
                color="primary"
                onClick={() => openReviewModal(doc)}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </ListItemSecondaryAction>
      </ListItem>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>Cargando documentos para revisión...</Typography>
      </Box>
    );
  }

  if (!checklist) {
    return (
      <Alert severity="error">
        Error al cargar los documentos del candidato
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header con estadísticas */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📄 Revisión de Documentos - {checklist.property_title}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Candidato: {checklist.tenant_name} ({checklist.tenant_email})
          </Typography>
          
          {/* Progress bar */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                Documentos revisados: {checklist.total_approved + checklist.total_rejected} de {checklist.total_uploaded}
              </Typography>
              <Typography variant="body2">
                {Math.round((checklist.total_approved + checklist.total_rejected) / Math.max(checklist.total_uploaded, 1) * 100)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(checklist.total_approved + checklist.total_rejected) / Math.max(checklist.total_uploaded, 1) * 100}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          
          {/* Stats chips */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`${checklist.total_uploaded} Subidos`} color="info" size="small" />
            <Chip label={`${checklist.total_approved} Aprobados`} color="success" size="small" />
            <Chip label={`${checklist.total_pending} Pendientes`} color="warning" size="small" />
            {checklist.total_rejected > 0 && (
              <Chip label={`${checklist.total_rejected} Rechazados`} color="error" size="small" />
            )}
          </Box>
          
          {/* Status message */}
          {checklist.all_approved && (
            <Alert severity="success" sx={{ mt: 2 }}>
              ¡Excelente! Todos los documentos han sido aprobados. El candidato puede proceder a la etapa de contrato.
            </Alert>
          )}
          
          {checklist.total_pending > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Hay {checklist.total_pending} documentos pendientes de revisión.
            </Alert>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Documentos del TOMADOR */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon />
            <Typography variant="h6">Documentos del Tomador (Inquilino)</Typography>
            <Badge badgeContent={checklist.tomador_documents.filter(d => d.uploaded).length} color="primary">
              <FolderIcon />
            </Badge>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {checklist.tomador_documents.filter(d => d.uploaded).map(doc => (
              renderDocumentItem(doc)
            ))}
            {checklist.tomador_documents.filter(d => d.uploaded).length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No hay documentos del tomador subidos aún.
              </Typography>
            )}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Documentos del CODEUDOR */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessIcon />
            <Typography variant="h6">Documentos del Codeudor</Typography>
            <Badge badgeContent={checklist.codeudor_documents.filter(d => d.uploaded).length} color="primary">
              <FolderIcon />
            </Badge>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {checklist.codeudor_documents.filter(d => d.uploaded).map(doc => (
              renderDocumentItem(doc)
            ))}
            {checklist.codeudor_documents.filter(d => d.uploaded).length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No hay documentos del codeudor subidos aún.
              </Typography>
            )}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Otros documentos */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DocumentIcon />
            <Typography variant="h6">Otros Documentos</Typography>
            <Badge badgeContent={checklist.otros_documents.filter(d => d.uploaded).length} color="primary">
              <FolderIcon />
            </Badge>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {checklist.otros_documents.filter(d => d.uploaded).map(doc => (
              renderDocumentItem(doc)
            ))}
            {checklist.otros_documents.filter(d => d.uploaded).length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No hay otros documentos subidos aún.
              </Typography>
            )}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onClose={() => setReviewModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Revisar Documento</DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Documento: {selectedDocument.display_name}
              </Typography>
              
              {selectedDocument.file_url && (
                <Button
                  variant="outlined"
                  startIcon={<ViewIcon />}
                  onClick={() => {
                    console.log('🔍 Opening document from modal:', selectedDocument.file_url);
                    // Construir URL absoluta para el archivo - USAR BACKEND URL
                    const backendUrl = 'http://localhost:8000';  // Django backend
                    const fullUrl = selectedDocument.file_url.startsWith('/') 
                      ? `${backendUrl}${selectedDocument.file_url}`
                      : selectedDocument.file_url;
                    console.log('🌐 Full URL from modal (Backend):', fullUrl);
                    
                    // Intentar abrir en nueva ventana
                    const newWindow = window.open(fullUrl, '_blank');
                    if (!newWindow) {
                      console.warn('⚠️ Popup blocked in modal, trying direct navigation');
                      window.location.href = fullUrl;
                    }
                  }}
                  sx={{ mb: 2 }}
                >
                  Ver Documento PDF
                </Button>
              )}
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Estado de Revisión</InputLabel>
                <Select
                  value={reviewStatus}
                  label="Estado de Revisión"
                  onChange={(e) => setReviewStatus(e.target.value as any)}
                >
                  <MenuItem value="approved">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ApproveIcon color="success" />
                      Aprobado
                    </Box>
                  </MenuItem>
                  <MenuItem value="rejected">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RejectIcon color="error" />
                      Rechazado
                    </Box>
                  </MenuItem>
                  <MenuItem value="requires_correction">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WarningIcon color="warning" />
                      Requiere Corrección
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Notas de Revisión"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                margin="normal"
                multiline
                rows={3}
                helperText={
                  reviewStatus === 'rejected' || reviewStatus === 'requires_correction' 
                    ? "Explica el motivo del rechazo o qué debe corregirse"
                    : "Comentarios adicionales (opcional)"
                }
                required={reviewStatus === 'rejected' || reviewStatus === 'requires_correction'}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewModalOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleReviewDocument}
            disabled={reviewing || (
              (reviewStatus === 'rejected' || reviewStatus === 'requires_correction') && !reviewNotes.trim()
            )}
            variant="contained"
          >
            {reviewing ? 'Guardando...' : 'Guardar Revisión'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LandlordDocumentReview;