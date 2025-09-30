/**
 * Componente mejorado de verificación de documentos con captura de rostro + documento
 * Requiere:
 * 1. Subir PDF del documento
 * 2. Foto frontal del documento junto al rostro
 * 3. Foto reverso del documento junto al rostro
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardMedia,
  CardActions,
  Chip,
  LinearProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CameraAlt as CameraAltIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Replay as ReplayIcon,
  PictureAsPdf as PdfIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material';
import SimpleProfessionalCamera from './SimpleProfessionalCamera';

interface EnhancedDocumentVerificationProps {
  onVerify: (data: DocumentVerificationData) => void;
  loading?: boolean;
  error?: string | null;
  currentStep?: number;
  totalSteps?: number;
  stepName?: string;
  onBack?: () => void;
}

interface DocumentVerificationData {
  documentType: string;
  documentNumber: string;
  pdfFile: File | null;
  frontPhotoWithFace: string | null;
  backPhotoWithFace: string | null;
}

const DOCUMENT_TYPES = [
  { value: 'cedula_ciudadania', label: 'Cédula de Ciudadanía', pattern: /^\d{6,10}$/ },
  { value: 'cedula_extranjeria', label: 'Cédula de Extranjería', pattern: /^\d{6,10}$/ },
  { value: 'pasaporte', label: 'Pasaporte', pattern: /^[A-Z0-9]{6,20}$/ },
  { value: 'licencia_conducir', label: 'Licencia de Conducir', pattern: /^\d{6,15}$/ }
];

const EnhancedDocumentVerification: React.FC<EnhancedDocumentVerificationProps> = ({
  onVerify,
  loading = false,
  error = null,
  currentStep = 2,
  totalSteps = 4,
  stepName = 'Verificación de Documento',
  onBack
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados principales
  const [documentData, setDocumentData] = useState<DocumentVerificationData>({
    documentType: 'cedula_ciudadania',
    documentNumber: '',
    pdfFile: null,
    frontPhotoWithFace: null,
    backPhotoWithFace: null
  });

  // Estados de UI
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [activePhotoCapture, setActivePhotoCapture] = useState<'front' | 'back' | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Validar si todos los campos están completos
  const isComplete = useCallback(() => {
    return !!(
      documentData.documentType &&
      documentData.documentNumber &&
      documentData.pdfFile &&
      documentData.frontPhotoWithFace &&
      documentData.backPhotoWithFace
    );
  }, [documentData]);

  // Manejar carga de PDF
  const handlePdfUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setDocumentData(prev => ({ ...prev, pdfFile: file }));
      setValidationErrors(prev => prev.filter(e => e !== 'pdf'));
    } else {
      setValidationErrors(prev => [...prev, 'El archivo debe ser un PDF']);
    }
  };

  // Iniciar captura de fotos
  const startPhotoCapture = (side: 'front' | 'back') => {
    setShowInstructionsModal(false);
    setActivePhotoCapture(side);
  };

  // Manejar captura de foto
  const handlePhotoCapture = (image: string) => {
    if (activePhotoCapture === 'front') {
      setDocumentData(prev => ({ ...prev, frontPhotoWithFace: image }));
    } else if (activePhotoCapture === 'back') {
      setDocumentData(prev => ({ ...prev, backPhotoWithFace: image }));
    }
    setActivePhotoCapture(null);
  };

  // Eliminar foto
  const removePhoto = (side: 'front' | 'back') => {
    if (side === 'front') {
      setDocumentData(prev => ({ ...prev, frontPhotoWithFace: null }));
    } else {
      setDocumentData(prev => ({ ...prev, backPhotoWithFace: null }));
    }
  };

  // Validar número de documento
  const validateDocumentNumber = () => {
    const docType = DOCUMENT_TYPES.find(d => d.value === documentData.documentType);
    if (docType && !docType.pattern.test(documentData.documentNumber)) {
      setValidationErrors(['Número de documento inválido para el tipo seleccionado']);
      return false;
    }
    setValidationErrors([]);
    return true;
  };

  // Enviar verificación
  const handleSubmit = () => {
    if (!validateDocumentNumber()) return;
    if (!isComplete()) {
      setValidationErrors(['Por favor complete todos los campos requeridos']);
      return;
    }
    onVerify(documentData);
  };

  // Componente de Modal de Instrucciones
  const InstructionsModal = () => (
    <Dialog 
      open={showInstructionsModal} 
      onClose={() => setShowInstructionsModal(false)}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ bgcolor: 'warning.main', color: 'white' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon />
          <Typography variant="h6">Instrucciones Importantes</Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Para verificar su identidad, necesitamos que tome DOS fotografías en tiempo real:
        </Alert>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            📸 Foto 1: Frente del documento + Su rostro
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Sostenga su documento de identidad (parte frontal) junto a su rostro. 
            Ambos deben ser claramente visibles en la misma foto.
          </Typography>
          
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            📸 Foto 2: Reverso del documento + Su rostro
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Sostenga su documento de identidad (parte posterior) junto a su rostro. 
            Ambos deben ser claramente visibles en la misma foto.
          </Typography>
        </Box>

        <Alert severity="warning">
          <Typography variant="body2" fontWeight="bold">
            Importante:
          </Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Las fotos deben ser tomadas en tiempo real</li>
            <li>No se aceptan fotos de galerías o screenshots</li>
            <li>Asegúrese de que tanto su rostro como el documento sean legibles</li>
            <li>Evite reflejos o sombras sobre el documento</li>
          </ul>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowInstructionsModal(false)} color="inherit">
          Cancelar
        </Button>
        <Button 
          variant="contained" 
          onClick={() => startPhotoCapture('front')}
          startIcon={<PhotoCameraIcon />}
        >
          Comenzar con Foto Frontal
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Componente de Preview de Foto
  const PhotoPreview = ({ image, side, label }: { image: string | null, side: 'front' | 'back', label: string }) => (
    <Card sx={{ height: '100%' }}>
      {image ? (
        <>
          <CardMedia
            component="img"
            height="200"
            image={image}
            alt={label}
            sx={{ objectFit: 'cover' }}
          />
          <CardActions sx={{ justifyContent: 'space-between' }}>
            <Chip 
              icon={<CheckCircleIcon />} 
              label="Capturada" 
              color="success" 
              size="small" 
            />
            <Box>
              <IconButton 
                size="small" 
                onClick={() => window.open(image, '_blank')}
                title="Ver imagen"
              >
                <VisibilityIcon />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => removePhoto(side)}
                color="error"
                title="Eliminar"
              >
                <CloseIcon />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => setActivePhotoCapture(side)}
                title="Retomar"
              >
                <ReplayIcon />
              </IconButton>
            </Box>
          </CardActions>
        </>
      ) : (
        <Box
          sx={{
            height: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100',
            borderRadius: 1,
            border: '2px dashed',
            borderColor: 'grey.400'
          }}
        >
          <CameraAltIcon sx={{ fontSize: 48, color: 'grey.500', mb: 1 }} />
          <Typography variant="body2" color="text.secondary" align="center">
            {label}
          </Typography>
          <Button
            size="small"
            startIcon={<PhotoCameraIcon />}
            onClick={() => side === 'front' ? setShowInstructionsModal(true) : setActivePhotoCapture(side)}
            sx={{ mt: 1 }}
          >
            Tomar Foto
          </Button>
        </Box>
      )}
    </Card>
  );

  // Renderizar captura de foto activa
  if (activePhotoCapture) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {activePhotoCapture === 'front' 
              ? '📸 Tome una foto del FRENTE del documento junto a su rostro'
              : '📸 Tome una foto del REVERSO del documento junto a su rostro'
            }
          </Typography>
          <Typography variant="body2">
            Asegúrese de que tanto su rostro como el documento sean claramente visibles
          </Typography>
        </Alert>
        
        <Box sx={{ flex: 1 }}>
          <SimpleProfessionalCamera
            onCapture={handlePhotoCapture}
            onError={(err) => console.error(err)}
            instructions={
              activePhotoCapture === 'front'
                ? 'Sostenga el FRENTE del documento junto a su rostro'
                : 'Sostenga el REVERSO del documento junto a su rostro'
            }
            mode="document"
            height="500px"
          />
        </Box>

        {/* Botón para volver después de capturar */}
        {(activePhotoCapture === 'front' && documentData.frontPhotoWithFace) ||
         (activePhotoCapture === 'back' && documentData.backPhotoWithFace) ? (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setActivePhotoCapture(null)}
            >
              Volver
            </Button>
            {activePhotoCapture === 'front' && !documentData.backPhotoWithFace && (
              <Button
                variant="contained"
                onClick={() => setActivePhotoCapture('back')}
                startIcon={<PhotoCameraIcon />}
              >
                Continuar con Foto Reverso
              </Button>
            )}
          </Box>
        ) : null}
      </Box>
    );
  }

  // Vista principal
  return (
    <Box>
      {/* Header con instrucciones - compacto */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Complete todos los pasos para verificar su identidad:</strong>
        </Typography>
        <Box component="ol" sx={{ m: 0, pl: 2, fontSize: '0.875rem' }}>
          <li>Suba el PDF de su documento</li>
          <li>Tome una foto del frente del documento junto a su rostro</li>
          <li>Tome una foto del reverso del documento junto a su rostro</li>
        </Box>
      </Alert>

      {/* Errores */}
      {(error || validationErrors.length > 0) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || validationErrors.join(', ')}
        </Alert>
      )}

      {/* Stepper de progreso */}
      <Stepper activeStep={
        !documentData.pdfFile ? 0 : 
        !documentData.frontPhotoWithFace ? 1 :
        !documentData.backPhotoWithFace ? 2 : 3
      } sx={{ mb: 3 }}>
        <Step completed={!!documentData.pdfFile}>
          <StepLabel>PDF del Documento</StepLabel>
        </Step>
        <Step completed={!!documentData.frontPhotoWithFace}>
          <StepLabel>Foto Frontal + Rostro</StepLabel>
        </Step>
        <Step completed={!!documentData.backPhotoWithFace}>
          <StepLabel>Foto Reverso + Rostro</StepLabel>
        </Step>
      </Stepper>

      <Grid container spacing={3}>
        {/* Información del documento */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Información del Documento
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Tipo de Documento</InputLabel>
              <Select
                value={documentData.documentType}
                onChange={(e) => setDocumentData(prev => ({ 
                  ...prev, 
                  documentType: e.target.value 
                }))}
                label="Tipo de Documento"
              >
                {DOCUMENT_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Número de Documento"
              value={documentData.documentNumber}
              onChange={(e) => setDocumentData(prev => ({ 
                ...prev, 
                documentNumber: e.target.value 
              }))}
              onBlur={validateDocumentNumber}
              sx={{ mb: 2 }}
            />

            {/* Upload de PDF */}
            <Box sx={{ mb: 2 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                style={{ display: 'none' }}
              />
              
              {documentData.pdfFile ? (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PdfIcon color="error" />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {documentData.pdfFile.name}
                    </Typography>
                    <IconButton 
                      size="small"
                      onClick={() => setDocumentData(prev => ({ ...prev, pdfFile: null }))}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Box>
                </Paper>
              ) : (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Subir PDF del Documento
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Fotos del documento con rostro */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Fotos de Verificación
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <PhotoPreview
                  image={documentData.frontPhotoWithFace}
                  side="front"
                  label="Frente + Rostro"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <PhotoPreview
                  image={documentData.backPhotoWithFace}
                  side="back"
                  label="Reverso + Rostro"
                />
              </Grid>
            </Grid>

            {/* Botón para iniciar captura de fotos */}
            {!documentData.frontPhotoWithFace && !documentData.backPhotoWithFace && (
              <Button
                fullWidth
                variant="contained"
                startIcon={<CameraAltIcon />}
                onClick={() => setShowInstructionsModal(true)}
                sx={{ mt: 2 }}
                disabled={!documentData.pdfFile || !documentData.documentNumber}
              >
                Usar Cámara para Verificación
              </Button>
            )}
          </Paper>
        </Grid>

        {/* Barra de navegación inferior */}
        <Grid item xs={12}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 2, 
              mt: 2,
              borderRadius: 2,
              bgcolor: 'background.paper'
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between">
              {/* Información del paso y botón anterior */}
              <Box display="flex" alignItems="center" gap={2}>
                {onBack && (
                  <Button
                    variant="outlined"
                    onClick={onBack}
                    startIcon={<CloseIcon />}
                  >
                    Anterior
                  </Button>
                )}
                <Box>
                  <Typography variant="h6" fontWeight="600">
                    {stepName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Paso {currentStep} de {totalSteps}
                  </Typography>
                </Box>
              </Box>

              {/* Botón siguiente */}
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleSubmit}
                disabled={!isComplete() || loading}
                endIcon={loading ? <LinearProgress size={20} /> : <CheckIcon />}
              >
                {loading ? 'Procesando...' : 'Siguiente: Grabación de Voz'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Modal de instrucciones */}
      <InstructionsModal />
    </Box>
  );
};

export default EnhancedDocumentVerification;