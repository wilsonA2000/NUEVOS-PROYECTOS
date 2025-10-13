import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as DocumentIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import api from '../../services/api';

interface MatchDocumentUploadProps {
  open: boolean;
  onClose: () => void;
  matchId: string;
  onUploadSuccess?: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'tomador_cedula_ciudadania', label: 'Cédula de Ciudadanía' },
  { value: 'tomador_pasaporte', label: 'Pasaporte' },
  { value: 'tomador_cedula_extranjeria', label: 'Cédula de Extranjería' },
  { value: 'tomador_certificado_laboral', label: 'Certificado Laboral' },
  { value: 'tomador_carta_recomendacion', label: 'Carta de Recomendación' },
  { value: 'codeudor_cedula_ciudadania', label: 'Codeudor: Cédula de Ciudadanía' },
  { value: 'codeudor_pasaporte', label: 'Codeudor: Pasaporte' },
  { value: 'codeudor_cedula_extranjeria', label: 'Codeudor: Cédula de Extranjería' },
  { value: 'codeudor_certificado_laboral', label: 'Codeudor: Certificado Laboral' },
  { value: 'codeudor_libertad_tradicion', label: 'Codeudor: Certificado de Libertad y Tradición' },
  { value: 'otros', label: 'Otros Documentos' }
];

export const MatchDocumentUpload: React.FC<MatchDocumentUploadProps> = ({
  open,
  onClose,
  matchId,
  onUploadSuccess
}) => {
  const [documentType, setDocumentType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [otherDescription, setOtherDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validar tamaño (5MB max)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('El archivo no debe superar 5MB');
        return;
      }

      // Validar tipo (solo PDFs)
      if (selectedFile.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!documentType || !file) {
      setError('Debe seleccionar un tipo de documento y un archivo');
      return;
    }

    if (documentType === 'otros' && !otherDescription.trim()) {
      setError('Debe proporcionar una descripción para documentos tipo "Otros"');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('document_type', documentType);
      formData.append('document_file', file);

      if (documentType === 'otros' && otherDescription) {
        formData.append('other_description', otherDescription);
      }

      const response = await api.post(
        `/matching/match-requests/${matchId}/upload-document/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('✅ Documento subido exitosamente:', response.data);

      setSuccess(true);

      // Limpiar formulario
      setDocumentType('');
      setFile(null);
      setOtherDescription('');

      // Notificar éxito
      if (onUploadSuccess) {
        setTimeout(() => {
          onUploadSuccess();
          handleClose();
        }, 1500);
      }

    } catch (err: any) {
      console.error('❌ Error al subir documento:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Error desconocido';
      setError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setDocumentType('');
      setFile(null);
      setOtherDescription('');
      setSuccess(false);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DocumentIcon sx={{ mr: 1 }} />
          Subir Documento del Arrendatario
        </Box>
        <IconButton size="small" onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {success && (
          <Alert
            severity="success"
            icon={<CheckIcon />}
            sx={{ mb: 2 }}
          >
            ✅ Documento subido exitosamente. El arrendador será notificado.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
          Los documentos se vincularán automáticamente a esta solicitud de match y serán revisados por el arrendador.
        </Alert>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Tipo de Documento *</InputLabel>
          <Select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            label="Tipo de Documento *"
            disabled={uploading || success}
          >
            {DOCUMENT_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {documentType === 'otros' && (
          <TextField
            fullWidth
            label="Descripción del documento"
            value={otherDescription}
            onChange={(e) => setOtherDescription(e.target.value)}
            disabled={uploading || success}
            sx={{ mb: 3 }}
            helperText="Especifique qué tipo de documento está subiendo"
          />
        )}

        <Paper
          sx={{
            p: 3,
            border: '2px dashed',
            borderColor: file ? 'success.main' : 'grey.300',
            backgroundColor: file ? 'success.50' : 'grey.50',
            textAlign: 'center',
            transition: 'all 0.3s ease'
          }}
        >
          <input
            accept="application/pdf"
            style={{ display: 'none' }}
            id="document-upload-file"
            type="file"
            onChange={handleFileChange}
            disabled={uploading || success}
          />
          <label htmlFor="document-upload-file">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadIcon />}
              disabled={uploading || success}
              sx={{ mb: 1 }}
            >
              Seleccionar Archivo PDF
            </Button>
          </label>

          {file ? (
            <Box sx={{ mt: 2 }}>
              <Chip
                icon={<DocumentIcon />}
                label={file.name}
                onDelete={() => setFile(null)}
                color="success"
                sx={{ maxWidth: '100%' }}
              />
              <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                Tamaño: {(file.size / 1024).toFixed(2)} KB
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Solo archivos PDF (máx. 5MB)
            </Typography>
          )}
        </Paper>

        <Alert severity="warning" sx={{ mt: 3 }}>
          <strong>Importante:</strong>
          <List dense sx={{ mt: 1 }}>
            <ListItem sx={{ py: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>•</ListItemIcon>
              <ListItemText primary="Solo se permiten archivos PDF" />
            </ListItem>
            <ListItem sx={{ py: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>•</ListItemIcon>
              <ListItemText primary="Tamaño máximo: 5MB" />
            </ListItem>
            <ListItem sx={{ py: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>•</ListItemIcon>
              <ListItemText primary="Asegúrese de que el documento sea legible" />
            </ListItem>
          </List>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={handleClose}
          disabled={uploading}
          variant="outlined"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!documentType || !file || uploading || success}
          variant="contained"
          startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
            }
          }}
        >
          {uploading ? 'Subiendo...' : 'Subir Documento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MatchDocumentUpload;
