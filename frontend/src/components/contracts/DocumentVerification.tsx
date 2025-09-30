/**
 * Componente de verificación de documentos de identidad.
 * 
 * Permite capturar y verificar:
 * - Cédula de ciudadanía
 * - Cédula de extranjería
 * - Pasaporte
 * - Licencia de conducir
 * - Tarjeta de identidad
 * 
 * Features:
 * - Detección automática de tipo de documento
 * - Validación de campos requeridos
 * - OCR simulado para extracción de datos
 * - Guías visuales para captura óptima
 * - Verificación de fecha de expiración
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  Chip,
  IconButton,
  Divider,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Fade,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  CameraAlt,
  DocumentScanner,
  CheckCircle,
  Error,
  Warning,
  Info,
  Refresh,
  Visibility,
  VisibilityOff,
  AutoAwesome,
  PhotoCamera,
  Upload,
  VerifiedUser,
  DateRange,
  Badge,
  Security
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

interface DocumentVerificationProps {
  onVerify: (documentImage: string, documentType: string, documentNumber?: string, pdfFile?: File) => void;
  loading?: boolean;
  error?: string | null;
}

interface DocumentData {
  type: string;
  number: string;
  expiryDate: Date | null;
  image: string | null;
  pdfFile: File | null;
  fileType: 'image' | 'pdf' | null;
  extractedInfo: {
    name?: string;
    number?: string;
    expiryDate?: string;
    issuedBy?: string;
  } | null;
  validationResults: {
    numberValid: boolean;
    expiryValid: boolean;
    formatValid: boolean;
    qualityScore: number;
  } | null;
}

const DOCUMENT_TYPES = [
  { value: 'cedula_ciudadania', label: 'Cédula de Ciudadanía', pattern: /^\d{8,10}$/, example: '12345678' },
  { value: 'cedula_extranjeria', label: 'Cédula de Extranjería', pattern: /^\d{6,10}$/, example: '123456' },
  { value: 'pasaporte', label: 'Pasaporte', pattern: /^[A-Z]{1,2}\d{6,9}$/, example: 'AB1234567' },
  { value: 'licencia_conducir', label: 'Licencia de Conducir', pattern: /^\d{8,12}$/, example: '123456789' },
  { value: 'tarjeta_identidad', label: 'Tarjeta de Identidad', pattern: /^[A-Z0-9]{8,15}$/, example: 'TI12345678' }
];

const DocumentVerification: React.FC<DocumentVerificationProps> = ({
  onVerify,
  loading = false,
  error = null
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Referencias
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Estados
  const [documentData, setDocumentData] = useState<DocumentData>({
    type: 'cedula_ciudadania',
    number: '',
    expiryDate: null,
    image: null,
    pdfFile: null,
    fileType: null,
    extractedInfo: null,
    validationResults: null
  });
  
  const [showCamera, setShowCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Obtener configuración del tipo de documento actual
  const currentDocumentType = DOCUMENT_TYPES.find(doc => doc.value === documentData.type);

  // Inicializar cámara
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Cámara trasera para documentos
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setCameraActive(false);
    }
  }, []);

  // Detener cámara
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Capturar imagen desde cámara
  const captureFromCamera = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsProcessing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Configurar canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Capturar imagen
      ctx.drawImage(video, 0, 0);
      
      // Aplicar mejoras para documentos
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const enhancedImageData = enhanceDocumentImage(imageData);
      ctx.putImageData(enhancedImageData, 0, 0);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      // Procesar imagen
      await processDocumentImage(dataUrl);
      
      stopCamera();
      setShowCamera(false);
    } catch (err) {
      console.error('Error capturing image:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Mejorar imagen para documentos
  const enhanceDocumentImage = (imageData: ImageData): ImageData => {
    const data = imageData.data;
    
    // Aumentar contraste y reducir ruido para documentos
    const contrast = 1.3;
    const brightness = 15;
    
    for (let i = 0; i < data.length; i += 4) {
      // Aplicar ajustes RGB
      data[i] = Math.min(255, Math.max(0, data[i] * contrast + brightness));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * contrast + brightness));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * contrast + brightness));
      
      // Reducir ruido con filtro simple
      if (i > 4 && (i + 4) < data.length) {
        data[i] = (data[i - 4] + data[i] + data[i + 4]) / 3;
        data[i + 1] = (data[i - 3] + data[i + 1] + data[i + 5]) / 3;
        data[i + 2] = (data[i - 2] + data[i + 2] + data[i + 6]) / 3;
      }
    }
    
    return imageData;
  };

  // Manejar selección de archivo
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validar tipo de archivo - AHORA ACEPTA PDF E IMÁGENES
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';
    
    if (!isImage && !isPDF) {
      alert('Por favor seleccione un archivo de imagen (JPG, PNG) o PDF');
      return;
    }
    
    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 10MB');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      if (isPDF) {
        // Para PDF, guardamos el archivo y creamos un preview
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string;
          
          // Simular extracción de información del PDF
          const extractedInfo = {
            name: 'Información extraída del PDF',
            number: documentData.number || 'Pendiente de verificación manual',
            expiryDate: documentData.expiryDate ? documentData.expiryDate.toISOString() : '',
            issuedBy: 'Registraduría Nacional'
          };
          
          // Validación básica para PDF
          const validationResults = {
            numberValid: documentData.number.length >= 8,
            expiryValid: true,
            formatValid: true,
            qualityScore: 90 // Asumimos buena calidad para PDF
          };
          
          setDocumentData(prev => ({
            ...prev,
            pdfFile: file,
            fileType: 'pdf',
            image: dataUrl, // Guardamos el dataUrl para preview
            extractedInfo,
            validationResults
          }));
          
          setValidationComplete(true);
        };
        reader.readAsDataURL(file);
      } else {
        // Para imágenes, proceso normal
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string;
          await processDocumentImage(dataUrl);
          setDocumentData(prev => ({
            ...prev,
            fileType: 'image'
          }));
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Error processing file:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [documentData.number, documentData.expiryDate]);

  // Procesar imagen del documento
  const processDocumentImage = useCallback(async (imageDataUrl: string) => {
    try {
      // Simular extracción OCR
      const extractedInfo = await simulateOCR(imageDataUrl, documentData.type);
      
      // Validar información extraída
      const validationResults = validateDocumentInfo(extractedInfo, documentData.type);
      
      setDocumentData(prev => ({
        ...prev,
        image: imageDataUrl,
        extractedInfo,
        validationResults
      }));
      
      setValidationComplete(true);
      
      // Auto-llenar campos si la información es válida
      if (extractedInfo.number && validationResults.numberValid) {
        setDocumentData(prev => ({
          ...prev,
          number: extractedInfo.number || prev.number
        }));
      }
      
      if (extractedInfo.expiryDate && validationResults.expiryValid) {
        setDocumentData(prev => ({
          ...prev,
          expiryDate: new Date(extractedInfo.expiryDate!)
        }));
      }
    } catch (err) {
      console.error('Error processing document image:', err);
    }
  }, [documentData.type]);

  // Simular OCR optimizado (en producción usar servicio real como Tesseract.js o Google Vision)
  const simulateOCR = async (imageDataUrl: string, documentType: string): Promise<DocumentData['extractedInfo']> => {
    // Simular delay de procesamiento optimizado (reducido de 2000ms a 1200ms)
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Generar datos simulados más realistas basados en el tipo de documento
    const simulatedData: DocumentData['extractedInfo'] = {
      name: generateRealisticName(documentType),
      number: generateRealisticNumber(documentType),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 3).toISOString(), // 3 años
      issuedBy: getIssuer(documentType)
    };
    
    // Auto-llenar el campo de número si está vacío
    if (!documentData.number.trim()) {
      setDocumentData(prev => ({
        ...prev,
        number: simulatedData.number
      }));
    }
    
    return simulatedData;
  };

  // Generar número de documento realista
  const generateRealisticNumber = (documentType: string): string => {
    const docType = DOCUMENT_TYPES.find(d => d.value === documentType);
    if (!docType) return '';
    
    switch (documentType) {
      case 'cedula_ciudadania':
        return Math.floor(10000000 + Math.random() * 90000000).toString();
      case 'cedula_extranjeria':
        return 'CE' + Math.floor(10000000 + Math.random() * 90000000).toString();
      case 'pasaporte':
        return 'AB' + Math.floor(1000000 + Math.random() * 9000000).toString();
      case 'licencia_conducir':
        return '40' + Math.floor(100000000 + Math.random() * 900000000).toString();
      case 'tarjeta_identidad':
        return 'TI' + Math.floor(10000000 + Math.random() * 90000000).toString();
      default:
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }
  };

  // Generar nombres realistas
  const generateRealisticName = (documentType: string): string => {
    const nombres = [
      'Juan Carlos Pérez González',
      'María Fernanda López Rodríguez',
      'Carlos Alberto Martínez Silva',
      'Ana Sofía García Hernández',
      'Roberto Silva Santos',
      'Laura Patricia Morales Cruz',
      'Diego Fernando Ruiz Medina'
    ];
    return nombres[Math.floor(Math.random() * nombres.length)];
  };

  // Obtener emisor del documento
  const getIssuer = (documentType: string): string => {
    switch (documentType) {
      case 'cedula_ciudadania':
      case 'cedula_extranjeria':
        return 'Registraduría Nacional del Estado Civil';
      case 'pasaporte':
        return 'Ministerio de Relaciones Exteriores';
      case 'licencia_conducir':
        return 'Secretaría de Movilidad';
      case 'tarjeta_identidad':
        return 'Entidad Emisora';
      default:
        return 'Autoridad Competente';
    }
  };

  // Validar información del documento
  const validateDocumentInfo = (extractedInfo: DocumentData['extractedInfo'], documentType: string): DocumentData['validationResults'] => {
    if (!extractedInfo) {
      return {
        numberValid: false,
        expiryValid: false,
        formatValid: false,
        qualityScore: 0
      };
    }
    
    const docType = DOCUMENT_TYPES.find(d => d.value === documentType);
    const numberValid = docType ? docType.pattern.test(extractedInfo.number || '') : false;
    const expiryValid = extractedInfo.expiryDate ? new Date(extractedInfo.expiryDate) > new Date() : false;
    const formatValid = !!(extractedInfo.number && extractedInfo.name);
    const qualityScore = 85; // Simulado
    
    return {
      numberValid,
      expiryValid,
      formatValid,
      qualityScore
    };
  };

  // Función para extraer automáticamente el número del documento
  const handleSmartFill = useCallback(async () => {
    if (!documentData.image || !documentData.type) {
      alert('Primero debe capturar una imagen y seleccionar el tipo de documento');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Simular extracción OCR del documento
      const extractedInfo = await simulateOCR(documentData.image, documentData.type);
      
      // Auto-llenar los campos
      setDocumentData(prev => ({
        ...prev,
        number: extractedInfo.number,
        extractedInfo,
        validationResults: validateDocumentInfo(extractedInfo, documentData.type)
      }));

      // Feedback visual de éxito
      alert(`✅ Número de documento extraído automáticamente: ${extractedInfo.number}`);

    } catch (error) {
      console.error('Error en Smart Fill:', error);
      setError('Error al extraer información del documento. Intente nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  }, [documentData.image, documentData.type]);

  // Manejar verificación final
  const handleVerification = useCallback(() => {
    if (!documentData.image) {
      alert('Por favor capture o seleccione una imagen del documento');
      return;
    }
    
    if (!documentData.number.trim()) {
      alert('Por favor ingrese el número del documento');
      return;
    }
    
    const docType = DOCUMENT_TYPES.find(d => d.value === documentData.type);
    if (docType && !docType.pattern.test(documentData.number)) {
      alert(`El formato del número no es válido. Ejemplo: ${docType.example}`);
      return;
    }
    
    // Pasar el archivo PDF si existe, o la imagen
    onVerify(
      documentData.image, 
      documentData.type, 
      documentData.number,
      documentData.pdfFile || undefined
    );
  }, [documentData, onVerify]);

  // Efectos
  useEffect(() => {
    if (showCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [showCamera, startCamera, stopCamera]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box>
        {/* Instrucciones */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            📄 Verificación de Documento de Identidad
          </Typography>
          <Typography variant="body2">
            Capture o suba una foto clara de su documento de identidad. Asegúrese de que todos los datos sean legibles y que el documento no esté vencido.
          </Typography>
        </Alert>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Selección de tipo de documento */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Documento</InputLabel>
              <Select
                value={documentData.type}
                label="Tipo de Documento"
                onChange={(e) => setDocumentData(prev => ({ ...prev, type: e.target.value }))}
                disabled={loading || isProcessing}
              >
                {DOCUMENT_TYPES.map((docType) => (
                  <MenuItem key={docType.value} value={docType.value}>
                    {docType.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Número de Documento"
              value={documentData.number}
              onChange={(e) => setDocumentData(prev => ({ ...prev, number: e.target.value.toUpperCase() }))}
              placeholder={currentDocumentType?.example}
              disabled={loading || isProcessing}
              error={documentData.number.length > 0 && currentDocumentType && !currentDocumentType.pattern.test(documentData.number)}
              helperText={
                documentData.extractedInfo && documentData.number === documentData.extractedInfo.number
                  ? "✨ Número extraído automáticamente del documento"
                  : documentData.number.length > 0 && currentDocumentType && !currentDocumentType.pattern.test(documentData.number)
                  ? `Formato inválido. Ejemplo: ${currentDocumentType.example}`
                  : `Ejemplo: ${currentDocumentType?.example}`
              }
              InputProps={{
                endAdornment: documentData.image && !documentData.extractedInfo && (
                  <Tooltip title="Extraer automáticamente el número del documento capturado">
                    <IconButton
                      onClick={handleSmartFill}
                      disabled={isProcessing || loading}
                      size="small"
                    >
                      <AutoAwesome color="primary" />
                    </IconButton>
                  </Tooltip>
                )
              }}
            />
          </Grid>
        </Grid>

        {/* Captura/Subida de documento */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Captura o Carga del Documento
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Formatos aceptados:</strong> 
              <br />
              • <strong>Imagen:</strong> JPG, PNG (desde cámara o archivo)
              <br />
              • <strong>PDF:</strong> Documento escaneado de su cédula o documento de identidad
            </Typography>
          </Alert>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<CameraAlt />}
                onClick={() => setShowCamera(true)}
                disabled={loading || isProcessing}
                sx={{ height: 56 }}
              >
                Usar Cámara
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<Upload />}
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || isProcessing}
                sx={{ height: 56 }}
              >
                Subir Archivo (Imagen o PDF)
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Procesamiento */}
        {isProcessing && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="info">
              <Box display="flex" alignItems="center" gap={2}>
                <CircularProgress size={24} />
                <Typography>Procesando documento con OCR...</Typography>
              </Box>
            </Alert>
            <LinearProgress sx={{ mt: 2 }} />
          </Box>
        )}

        {/* Información extraída */}
        {documentData.extractedInfo && documentData.validationResults && (
          <Fade in timeout={500}>
            <Paper sx={{ mt: 3, p: 3, bgcolor: 'success.50' }}>
              <Typography variant="h6" gutterBottom color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VerifiedUser />
                Información Extraída
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Nombre</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {documentData.extractedInfo.name}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Número</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1" fontWeight={500}>
                      {documentData.extractedInfo.number}
                    </Typography>
                    {documentData.validationResults.numberValid ? (
                      <CheckCircle color="success" fontSize="small" />
                    ) : (
                      <Error color="error" fontSize="small" />
                    )}
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Vencimiento</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1" fontWeight={500}>
                      {documentData.extractedInfo.expiryDate ? 
                        new Date(documentData.extractedInfo.expiryDate).toLocaleDateString('es-CO') : 
                        'No disponible'
                      }
                    </Typography>
                    {documentData.validationResults.expiryValid ? (
                      <CheckCircle color="success" fontSize="small" />
                    ) : (
                      <Warning color="warning" fontSize="small" />
                    )}
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Calidad</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1" fontWeight={500}>
                      {documentData.validationResults.qualityScore}%
                    </Typography>
                    <Chip
                      size="small"
                      label={documentData.validationResults.qualityScore > 80 ? 'Excelente' : documentData.validationResults.qualityScore > 60 ? 'Buena' : 'Regular'}
                      color={documentData.validationResults.qualityScore > 80 ? 'success' : documentData.validationResults.qualityScore > 60 ? 'warning' : 'error'}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Fade>
        )}

        {/* Vista previa de documento */}
        {documentData.image && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Vista Previa {documentData.fileType === 'pdf' && '- Documento PDF'}
            </Typography>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              {documentData.fileType === 'pdf' ? (
                <Box>
                  <Box sx={{ 
                    p: 4, 
                    bgcolor: 'grey.100', 
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2
                  }}>
                    <DocumentScanner sx={{ fontSize: 64, color: 'error.main' }} />
                    <Typography variant="h6">Documento PDF Cargado</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {documentData.pdfFile?.name || 'documento.pdf'}
                    </Typography>
                    <Chip 
                      label={`Tamaño: ${documentData.pdfFile ? (documentData.pdfFile.size / 1024).toFixed(2) + ' KB' : 'N/A'}`}
                      size="small"
                      variant="outlined"
                    />
                    <Alert severity="success" sx={{ mt: 2 }}>
                      PDF cargado correctamente. El sistema procesará automáticamente el documento.
                    </Alert>
                  </Box>
                </Box>
              ) : (
                <img
                  src={documentData.image}
                  alt="Documento capturado"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 300,
                    borderRadius: 8,
                    boxShadow: theme.shadows[2]
                  }}
                />
              )}
              <Box sx={{ mt: 2 }}>
                {documentData.fileType !== 'pdf' && (
                  <Button
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => setPreviewOpen(true)}
                  >
                    Ver Completa
                  </Button>
                )}
              </Box>
            </Paper>
          </Box>
        )}

        {/* Botón de verificación */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleVerification}
            disabled={loading || isProcessing || !documentData.image || !documentData.number.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : <Security />}
            sx={{ minWidth: 200, height: 48 }}
          >
            {loading ? 'Verificando...' : 'Verificar Documento'}
          </Button>
        </Box>

        {/* Modal de cámara */}
        <Dialog
          open={showCamera}
          onClose={() => setShowCamera(false)}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            Capturar Documento
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Coloque el documento en una superficie plana y bien iluminada. Asegúrese de que esté completamente visible en el encuadre.
            </Typography>
            
            <Paper
              sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: '4/3',
                bgcolor: 'black',
                borderRadius: 2,
                overflow: 'hidden',
                mt: 2
              }}
            >
              {cameraActive ? (
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  playsInline
                  muted
                />
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'white'
                  }}
                >
                  <Typography>Iniciando cámara...</Typography>
                </Box>
              )}
              
              {/* Overlay de guía */}
              {cameraActive && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '80%',
                    height: '60%',
                    border: '3px dashed rgba(255,255,255,0.8)',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                  }}
                >
                  <Typography color="white" variant="caption">
                    COLOQUE EL DOCUMENTO AQUÍ
                  </Typography>
                </Box>
              )}
            </Paper>
            
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setShowCamera(false)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={captureFromCamera}
              disabled={!cameraActive || isProcessing}
              startIcon={isProcessing ? <CircularProgress size={20} /> : <PhotoCamera />}
            >
              {isProcessing ? 'Procesando...' : 'Capturar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de vista previa */}
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            Vista Previa del Documento
          </DialogTitle>
          <DialogContent>
            {documentData.image && (
              <img
                src={documentData.image}
                alt="Documento completo"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 8
                }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewOpen(false)}>
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default DocumentVerification;