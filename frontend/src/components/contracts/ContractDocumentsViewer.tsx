import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
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
  Button,
  Grid,
  Paper,
  Divider,
  Alert,
  Tooltip,
  Badge,
  Stack
} from '@mui/material';
import {
  Description as DocumentIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Folder as FolderIcon,
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  CalendarToday as DateIcon
} from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

interface TenantDocument {
  id: string;
  document_type: string;
  display_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'requires_correction';
  file_url: string;
  uploaded_at: string;
  reviewed_at?: string;
  uploaded_by_name: string;
  reviewed_by_name?: string;
  review_notes?: string;
  file_size: number;
  other_description?: string;
}

interface ContractDocumentsViewerProps {
  contractId: string;
  contractStatus: string;
  showTitle?: boolean;
}

const ContractDocumentsViewer: React.FC<ContractDocumentsViewerProps> = ({
  contractId,
  contractStatus,
  showTitle = true
}) => {
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<TenantDocument | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchContractDocuments();
  }, [contractId]);

  const fetchContractDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/contracts/${contractId}/documents/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar documentos');
      }

      const data = await response.json();
      setDocuments(data.tenant_documents || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <ApprovedIcon sx={{ color: 'success.main' }} />;
      case 'rejected':
        return <RejectedIcon sx={{ color: 'error.main' }} />;
      case 'requires_correction':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      default:
        return <InfoIcon sx={{ color: 'info.main' }} />;
    }
  };

  const getStatusColor = (status: string): any => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'requires_correction':
        return 'warning';
      default:
        return 'info';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleViewDocument = (doc: TenantDocument) => {
    setSelectedDocument(doc);
    setViewDialogOpen(true);
  };

  const handleDownloadDocument = (doc: TenantDocument) => {
    const fullUrl = `${API_BASE_URL}${doc.file_url}`;
    window.open(fullUrl, '_blank');
  };

  const categorizeDocuments = () => {
    const tomador = documents.filter(d => 
      d.document_type.startsWith('tomador_') && !d.document_type.includes('legacy')
    );
    const codeudor = documents.filter(d => 
      d.document_type.startsWith('codeudor_') && !d.document_type.includes('legacy')
    );
    const otros = documents.filter(d => 
      d.document_type === 'otros' || 
      (!d.document_type.startsWith('tomador_') && !d.document_type.startsWith('codeudor_'))
    );

    return { tomador, codeudor, otros };
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Cargando documentos...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error al cargar documentos: {error}
      </Alert>
    );
  }

  const { tomador, codeudor, otros } = categorizeDocuments();

  return (
    <>
      <Card>
        <CardContent>
          {showTitle && (
            <>
              <Typography variant="h6" gutterBottom>
                📄 Documentos Asociados al Contrato
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </>
          )}

          {documents.length === 0 ? (
            <Alert severity="info">
              No hay documentos asociados a este contrato
            </Alert>
          ) : (
            <Stack spacing={3}>
              {/* Documentos del Tomador */}
              {tomador.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PersonIcon />
                    Documentos del Inquilino
                    <Badge badgeContent={tomador.length} color="primary">
                      <FolderIcon />
                    </Badge>
                  </Typography>
                  <List>
                    {tomador.map((doc) => (
                      <ListItem key={doc.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                        <ListItemIcon>
                          {getStatusIcon(doc.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography>{doc.display_name}</Typography>
                              <Chip 
                                label={doc.status} 
                                size="small" 
                                color={getStatusColor(doc.status)}
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption">
                              Subido: {new Date(doc.uploaded_at).toLocaleDateString()} • 
                              Tamaño: {formatFileSize(doc.file_size)}
                            </Typography>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Ver documento">
                            <IconButton onClick={() => handleViewDocument(doc)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Descargar">
                            <IconButton onClick={() => handleDownloadDocument(doc)}>
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Documentos del Codeudor */}
              {codeudor.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <BusinessIcon />
                    Documentos del Codeudor
                    <Badge badgeContent={codeudor.length} color="primary">
                      <FolderIcon />
                    </Badge>
                  </Typography>
                  <List>
                    {codeudor.map((doc) => (
                      <ListItem key={doc.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                        <ListItemIcon>
                          {getStatusIcon(doc.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography>{doc.display_name}</Typography>
                              <Chip 
                                label={doc.status} 
                                size="small" 
                                color={getStatusColor(doc.status)}
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption">
                              Subido: {new Date(doc.uploaded_at).toLocaleDateString()} • 
                              Tamaño: {formatFileSize(doc.file_size)}
                            </Typography>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Ver documento">
                            <IconButton onClick={() => handleViewDocument(doc)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Descargar">
                            <IconButton onClick={() => handleDownloadDocument(doc)}>
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Otros Documentos */}
              {otros.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <DocumentIcon />
                    Otros Documentos
                    <Badge badgeContent={otros.length} color="primary">
                      <FolderIcon />
                    </Badge>
                  </Typography>
                  <List>
                    {otros.map((doc) => (
                      <ListItem key={doc.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                        <ListItemIcon>
                          {getStatusIcon(doc.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography>
                                {doc.other_description || doc.display_name}
                              </Typography>
                              <Chip 
                                label={doc.status} 
                                size="small" 
                                color={getStatusColor(doc.status)}
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption">
                              Subido: {new Date(doc.uploaded_at).toLocaleDateString()} • 
                              Tamaño: {formatFileSize(doc.file_size)}
                            </Typography>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Ver documento">
                            <IconButton onClick={() => handleViewDocument(doc)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Descargar">
                            <IconButton onClick={() => handleDownloadDocument(doc)}>
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Resumen de estado */}
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Resumen de Documentos
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Chip 
                      icon={<DocumentIcon />}
                      label={`Total: ${documents.length}`}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <Chip 
                      icon={<ApprovedIcon />}
                      label={`Aprobados: ${documents.filter(d => d.status === 'approved').length}`}
                      color="success"
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <Chip 
                      icon={<WarningIcon />}
                      label={`Pendientes: ${documents.filter(d => d.status === 'pending').length}`}
                      color="warning"
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <Chip 
                      icon={<RejectedIcon />}
                      label={`Rechazados: ${documents.filter(d => d.status === 'rejected').length}`}
                      color="error"
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Dialog para ver detalles del documento */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              Detalles del Documento
            </Typography>
            <IconButton onClick={() => setViewDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Tipo de Documento
                      </Typography>
                      <Typography variant="body1">
                        {selectedDocument.display_name}
                      </Typography>
                    </Box>
                    
                    {selectedDocument.other_description && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Descripción
                        </Typography>
                        <Typography variant="body1">
                          {selectedDocument.other_description}
                        </Typography>
                      </Box>
                    )}

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Estado
                      </Typography>
                      <Chip 
                        label={selectedDocument.status}
                        color={getStatusColor(selectedDocument.status)}
                        size="small"
                      />
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Subido por
                      </Typography>
                      <Typography variant="body1">
                        {selectedDocument.uploaded_by_name} • {new Date(selectedDocument.uploaded_at).toLocaleString()}
                      </Typography>
                    </Box>

                    {selectedDocument.reviewed_at && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Revisado por
                        </Typography>
                        <Typography variant="body1">
                          {selectedDocument.reviewed_by_name} • {new Date(selectedDocument.reviewed_at).toLocaleString()}
                        </Typography>
                      </Box>
                    )}

                    {selectedDocument.review_notes && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Notas de Revisión
                        </Typography>
                        <Alert severity={selectedDocument.status === 'approved' ? 'success' : 'warning'}>
                          {selectedDocument.review_notes}
                        </Alert>
                      </Box>
                    )}

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Tamaño del Archivo
                      </Typography>
                      <Typography variant="body1">
                        {formatFileSize(selectedDocument.file_size)}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<PdfIcon />}
            onClick={() => selectedDocument && handleDownloadDocument(selectedDocument)}
            variant="contained"
          >
            Ver/Descargar PDF
          </Button>
          <Button onClick={() => setViewDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ContractDocumentsViewer;