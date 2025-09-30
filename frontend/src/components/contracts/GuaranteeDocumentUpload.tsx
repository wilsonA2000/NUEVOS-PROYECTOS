/**
 * Componente especializado para subir documentos de garantía
 * 
 * Maneja 3 tipos de garantía:
 * - none: Sin documentos adicionales
 * - codeudor_salario: Documentos laborales y financieros
 * - codeudor_finca_raiz: Documentos inmobiliarios y legales
 * 
 * Features:
 * - Validación por tipo de documento
 * - Preview de archivos PDF
 * - Progress tracking
 * - Error handling robusto
 * - Mobile responsive
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Button,
  Chip,
  Alert,
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider,
  Paper
} from '@mui/material';
import {
  CloudUpload,
  Description,
  PictureAsPdf,
  Image,
  Delete,
  Visibility,
  CheckCircle,
  Error,
  Warning,
  Info,
  Work,
  Home,
  AccountBalance,
  Assignment,
  Gavel,
  Security
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

interface GuaranteeDocument {
  id: string;
  file: File;
  type: string;
  category: 'required' | 'optional';
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress?: number;
  error?: string;
  preview?: string;
}

interface DocumentType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'required' | 'optional';
  acceptedTypes: string[];
  maxSize: number; // in MB
}

interface GuaranteeDocumentUploadProps {
  guaranteeType: 'none' | 'codeudor_salario' | 'codeudor_finca_raiz';
  codeudorName: string;
  onDocumentsChange: (documents: GuaranteeDocument[]) => void;
  existingDocuments?: GuaranteeDocument[];
  disabled?: boolean;
}

// Document type definitions by guarantee type
const DOCUMENT_TYPES: Record<string, DocumentType[]> = {
  codeudor_salario: [
    {
      id: 'carta_laboral',
      name: 'Carta Laboral',
      description: 'Certificación laboral actualizada con menos de 30 días de expedición',
      icon: <Work />,
      category: 'required',
      acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      maxSize: 5
    },
    {
      id: 'desprendibles_pago',
      name: 'Desprendibles de Pago',
      description: 'Últimos 3 desprendibles de pago o nómina',
      icon: <AccountBalance />,
      category: 'required',
      acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      maxSize: 10
    },
    {
      id: 'cedula_codeudor',
      name: 'Cédula del Codeudor',
      description: 'Copia de cédula de ciudadanía por ambas caras',
      icon: <Assignment />,
      category: 'required',
      acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      maxSize: 3
    },
    {
      id: 'autorizacion_centrales',
      name: 'Autorización Centrales de Riesgo',
      description: 'Autorización para consulta en centrales de riesgo crediticio',
      icon: <Security />,
      category: 'required',
      acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      maxSize: 3
    },
    {
      id: 'referencias_comerciales',
      name: 'Referencias Comerciales',
      description: 'Referencias comerciales y/o bancarias (opcional)',
      icon: <Description />,
      category: 'optional',
      acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      maxSize: 5
    }
  ],
  codeudor_finca_raiz: [
    {
      id: 'certificado_libertad',
      name: 'Certificado de Libertad y Tradición',
      description: 'Certificado actualizado con máximo 30 días de expedición',
      icon: <Gavel />,
      category: 'required',
      acceptedTypes: ['application/pdf'],
      maxSize: 5
    },
    {
      id: 'escritura_inmueble',
      name: 'Escritura del Inmueble',
      description: 'Escritura pública de compraventa del inmueble',
      icon: <Description />,
      category: 'required',
      acceptedTypes: ['application/pdf'],
      maxSize: 20
    },
    {
      id: 'cedula_codeudor',
      name: 'Cédula del Codeudor',
      description: 'Copia de cédula de ciudadanía por ambas caras',
      icon: <Assignment />,
      category: 'required',
      acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      maxSize: 3
    },
    {
      id: 'avaluo_comercial',
      name: 'Avalúo Comercial',
      description: 'Avalúo comercial actualizado del inmueble (opcional)',
      icon: <Home />,
      category: 'optional',
      acceptedTypes: ['application/pdf'],
      maxSize: 10
    },
    {
      id: 'impuesto_predial',
      name: 'Recibo de Impuesto Predial',
      description: 'Último recibo de impuesto predial cancelado (opcional)',
      icon: <AccountBalance />,
      category: 'optional',
      acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      maxSize: 3
    }
  ]
};

const GuaranteeDocumentUpload: React.FC<GuaranteeDocumentUploadProps> = ({
  guaranteeType,
  codeudorName,
  onDocumentsChange,
  existingDocuments = [],
  disabled = false
}) => {
  const [documents, setDocuments] = useState<GuaranteeDocument[]>(existingDocuments);
  const [previewDocument, setPreviewDocument] = useState<GuaranteeDocument | null>(null);
  const [uploadError, setUploadError] = useState<string>('');

  // Get document types for current guarantee type
  const documentTypes = DOCUMENT_TYPES[guaranteeType] || [];
  const requiredDocs = documentTypes.filter(doc => doc.category === 'required');
  const optionalDocs = documentTypes.filter(doc => doc.category === 'optional');

  // Calculate completion status
  const requiredUploaded = requiredDocs.filter(docType => 
    documents.some(doc => doc.type === docType.id && doc.status === 'uploaded')
  ).length;
  const completionPercentage = requiredDocs.length > 0 ? (requiredUploaded / requiredDocs.length) * 100 : 0;

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[], docType: DocumentType) => {
    setUploadError('');

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejectedReasons = rejectedFiles.map(rejection => 
        rejection.errors.map((error: any) => error.message).join(', ')
      ).join('; ');
      setUploadError(`Archivos rechazados: ${rejectedReasons}`);
      return;
    }

    // Process accepted files
    acceptedFiles.forEach(file => {
      // Validate file size
      if (file.size > docType.maxSize * 1024 * 1024) {
        setUploadError(`El archivo ${file.name} excede el tamaño máximo de ${docType.maxSize}MB`);
        return;
      }

      const newDocument: GuaranteeDocument = {
        id: `${docType.id}_${Date.now()}_${Math.random()}`,
        file,
        type: docType.id,
        category: docType.category,
        status: 'pending',
        progress: 0
      };

      // Remove existing document of same type (replace)
      setDocuments(prev => {
        const filtered = prev.filter(doc => doc.type !== docType.id);
        return [...filtered, newDocument];
      });

      // Simulate upload
      simulateUpload(newDocument);
    });
  }, []);

  const simulateUpload = (document: GuaranteeDocument) => {
    // Update to uploading status
    updateDocumentStatus(document.id, 'uploading', 0);

    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Simulate random success/failure
        const success = Math.random() > 0.1; // 90% success rate
        
        setTimeout(() => {
          if (success) {
            updateDocumentStatus(document.id, 'uploaded', 100);
          } else {
            updateDocumentStatus(document.id, 'error', 0, 'Error simulado de subida');
          }
        }, 500);
      } else {
        updateDocumentStatus(document.id, 'uploading', progress);
      }
    }, 200);
  };

  const updateDocumentStatus = (documentId: string, status: GuaranteeDocument['status'], progress?: number, error?: string) => {
    setDocuments(prev => {
      const updated = prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, status, progress, error }
          : doc
      );
      
      // Notify parent component
      onDocumentsChange(updated);
      return updated;
    });
  };

  const removeDocument = (documentId: string) => {
    setDocuments(prev => {
      const filtered = prev.filter(doc => doc.id !== documentId);
      onDocumentsChange(filtered);
      return filtered;
    });
  };

  const handlePreviewDocument = (document: GuaranteeDocument) => {
    if (document.file.type === 'application/pdf') {
      const url = URL.createObjectURL(document.file);
      window.open(url, '_blank');
      // Clean up URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } else {
      setPreviewDocument(document);
    }
  };

  const createDropzone = (docType: DocumentType) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: (acceptedFiles, rejectedFiles) => onDrop(acceptedFiles, rejectedFiles, docType),
      accept: docType.acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
      maxFiles: 1,
      disabled
    });

    const existingDoc = documents.find(doc => doc.type === docType.id);

    return (
      <Paper
        {...getRootProps()}
        sx={{
          p: 3,
          border: `2px dashed ${isDragActive ? '#2196f3' : existingDoc?.status === 'uploaded' ? '#4caf50' : '#ccc'}`,
          borderRadius: 2,
          bgcolor: isDragActive ? 'action.hover' : existingDoc?.status === 'uploaded' ? 'success.50' : 'background.paper',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': disabled ? {} : {
            borderColor: '#2196f3',
            bgcolor: 'action.hover'
          }
        }}
      >
        <input {...getInputProps()} />
        
        <Box display="flex" alignItems="center" gap={2}>
          {docType.icon}
          <Box flex={1}>
            <Typography variant="subtitle2" gutterBottom>
              {docType.name}
              {docType.category === 'required' && (
                <Chip label="Requerido" color="error" size="small" sx={{ ml: 1 }} />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {docType.description}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Máximo {docType.maxSize}MB • {docType.acceptedTypes.join(', ')}
            </Typography>
          </Box>
          
          {existingDoc ? (
            <Box display="flex" alignItems="center" gap={1}>
              {existingDoc.status === 'uploading' && (
                <Box sx={{ minWidth: 100 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={existingDoc.progress || 0}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="caption">
                    {Math.round(existingDoc.progress || 0)}%
                  </Typography>
                </Box>
              )}
              
              {existingDoc.status === 'uploaded' && (
                <>
                  <CheckCircle color="success" />
                  <Typography variant="body2" color="success.main">
                    Subido
                  </Typography>
                </>
              )}
              
              {existingDoc.status === 'error' && (
                <>
                  <Error color="error" />
                  <Typography variant="body2" color="error.main">
                    Error
                  </Typography>
                </>
              )}
              
              <Tooltip title="Vista previa">
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewDocument(existingDoc);
                  }}
                  disabled={existingDoc.status !== 'uploaded'}
                >
                  <Visibility />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Eliminar">
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDocument(existingDoc.id);
                  }}
                  color="error"
                >
                  <Delete />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Box display="flex" alignItems="center" gap={1}>
              <CloudUpload color={isDragActive ? 'primary' : 'action'} />
              <Typography variant="body2" color="text.secondary">
                {isDragActive ? 'Suelta aquí' : 'Clic o arrastra'}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    );
  };

  // Don't render if no guarantee type
  if (guaranteeType === 'none') {
    return null;
  }

  return (
    <Card sx={{ mt: 3 }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <Description color="primary" />
            <Typography variant="h6">
              Documentos de Garantía
            </Typography>
          </Box>
        }
        subheader={
          <Box>
            <Typography variant="body2" color="text.secondary">
              {guaranteeType === 'codeudor_salario' 
                ? `Documentos laborales y financieros de ${codeudorName}`
                : `Documentos inmobiliarios del codeudor ${codeudorName}`
              }
            </Typography>
            <Box display="flex" alignItems="center" gap={2} sx={{ mt: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={completionPercentage}
                sx={{ flex: 1, height: 6, borderRadius: 3 }}
                color={completionPercentage === 100 ? 'success' : 'primary'}
              />
              <Typography variant="caption" color="text.secondary">
                {requiredUploaded}/{requiredDocs.length} requeridos
              </Typography>
            </Box>
          </Box>
        }
      />
      
      <CardContent>
        {/* Upload Error */}
        {uploadError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setUploadError('')}>
            {uploadError}
          </Alert>
        )}

        {/* Required Documents */}
        {requiredDocs.length > 0 && (
          <>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Error color="error" />
              Documentos Requeridos
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {requiredDocs.map(docType => (
                <Grid item xs={12} key={docType.id}>
                  {createDropzone(docType)}
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* Optional Documents */}
        {optionalDocs.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info color="info" />
              Documentos Opcionales
            </Typography>
            <Grid container spacing={2}>
              {optionalDocs.map(docType => (
                <Grid item xs={12} key={docType.id}>
                  {createDropzone(docType)}
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* Completion Status */}
        {requiredDocs.length > 0 && (
          <Alert 
            severity={completionPercentage === 100 ? "success" : "warning"}
            sx={{ mt: 3 }}
          >
            <Typography variant="body2">
              {completionPercentage === 100 
                ? `✅ Todos los documentos requeridos han sido subidos correctamente`
                : `⚠️ Faltan ${requiredDocs.length - requiredUploaded} documentos requeridos por subir`
              }
            </Typography>
          </Alert>
        )}
      </CardContent>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Vista Previa: {documentTypes.find(dt => dt.id === previewDocument?.type)?.name}
        </DialogTitle>
        <DialogContent>
          {previewDocument && previewDocument.file.type.startsWith('image/') && (
            <img
              src={URL.createObjectURL(previewDocument.file)}
              alt="Preview"
              style={{ width: '100%', height: 'auto' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDocument(null)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default GuaranteeDocumentUpload;