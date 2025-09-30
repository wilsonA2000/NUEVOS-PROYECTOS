/**
 * Componente de firma digital para completar el proceso de autenticación biométrica.
 * 
 * Permite al usuario firmar digitalmente después de completar la autenticación biométrica.
 * 
 * Features:
 * - Pad de firma digital con canvas
 * - Validación de firma (no vacía)
 * - Resumen de autenticación biométrica
 * - Información del contrato
 * - Confirmación final con términos y condiciones
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  Card,
  CardContent,
  Grid,
  Divider,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  Chip,
  LinearProgress,
  CircularProgress,
  Fade
} from '@mui/material';
import {
  Draw,
  CheckCircle,
  Security,
  Verified,
  Person,
  DateRange,
  Assignment,
  Clear,
  Save,
  Send,
  Warning,
  Info,
  Gavel
} from '@mui/icons-material';

interface DigitalSignaturePadProps {
  onSign: (signatureData: string) => void;
  contractNumber: string;
  loading?: boolean;
  error?: string | null;
  biometricData?: {
    authenticationId?: string;
    confidenceScores?: {
      face_confidence: number;
      document_confidence: number;
      voice_confidence: number;
      overall_confidence: number;
    };
    voiceText?: string;
    progress?: number;
  };
}

interface SignaturePoint {
  x: number;
  y: number;
  pressure?: number;
  timestamp: number;
}

interface SignatureData {
  points: SignaturePoint[];
  boundingBox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  duration: number;
  startTime: number;
  endTime: number;
}

const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  onSign,
  contractNumber,
  loading = false,
  error = null,
  biometricData
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Referencias
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Estados
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [signatureQuality, setSignatureQuality] = useState(0);
  
  // Configuración del canvas
  const CANVAS_WIDTH = isMobile ? 350 : 500;
  const CANVAS_HEIGHT = isMobile ? 200 : 250;
  const STROKE_WIDTH = 2;
  const STROKE_COLOR = '#2563eb';

  // Inicializar canvas
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar canvas
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Configurar estilo de dibujo
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = STROKE_WIDTH;
    
    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Línea de firma
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(50, canvas.height - 50);
    ctx.lineTo(canvas.width - 50, canvas.height - 50);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Texto indicativo
    ctx.fillStyle = '#9e9e9e';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Firme aquí', canvas.width / 2, canvas.height - 20);
    
    // Restaurar estilo para dibujo
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = STROKE_WIDTH;
  }, []);

  // Obtener coordenadas del evento
  const getEventCoordinates = useCallback((event: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in event && event.touches.length > 0) {
      // Evento táctil
      return {
        x: (event.touches[0].clientX - rect.left) * scaleX,
        y: (event.touches[0].clientY - rect.top) * scaleY
      };
    } else if ('clientX' in event) {
      // Evento de ratón
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
      };
    }

    return { x: 0, y: 0 };
  }, []);

  // Iniciar dibujo
  const startDrawing = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    event.preventDefault();
    
    const coords = getEventCoordinates(event);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    
    // Inicializar datos de firma
    if (!signatureData) {
      setSignatureData({
        points: [],
        boundingBox: {
          minX: coords.x,
          minY: coords.y,
          maxX: coords.x,
          maxY: coords.y
        },
        duration: 0,
        startTime: Date.now(),
        endTime: 0
      });
    }

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  }, [getEventCoordinates, signatureData]);

  // Dibujar
  const draw = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    
    event.preventDefault();
    
    const coords = getEventCoordinates(event);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dibujar línea
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    // Actualizar datos de firma
    setSignatureData(prev => {
      if (!prev) return null;

      const newPoint: SignaturePoint = {
        x: coords.x,
        y: coords.y,
        timestamp: Date.now()
      };

      return {
        ...prev,
        points: [...prev.points, newPoint],
        boundingBox: {
          minX: Math.min(prev.boundingBox.minX, coords.x),
          minY: Math.min(prev.boundingBox.minY, coords.y),
          maxX: Math.max(prev.boundingBox.maxX, coords.x),
          maxY: Math.max(prev.boundingBox.maxY, coords.y)
        }
      };
    });

    setHasSignature(true);
  }, [isDrawing, getEventCoordinates]);

  // Terminar dibujo
  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    setSignatureData(prev => {
      if (!prev) return null;
      
      const endTime = Date.now();
      const duration = endTime - prev.startTime;
      
      const updatedData = {
        ...prev,
        duration,
        endTime
      };
      
      // Calcular calidad de la firma
      const quality = calculateSignatureQuality(updatedData);
      setSignatureQuality(quality);
      
      return updatedData;
    });
  }, [isDrawing]);

  // Calcular calidad de la firma
  const calculateSignatureQuality = (data: SignatureData): number => {
    if (data.points.length < 10) return 0;
    
    // Factores de calidad
    const complexityScore = Math.min(100, data.points.length / 50 * 100); // Más puntos = más compleja
    const sizeScore = Math.min(100, ((data.boundingBox.maxX - data.boundingBox.minX) * (data.boundingBox.maxY - data.boundingBox.minY)) / 10000 * 100);
    const durationScore = Math.min(100, data.duration / 5000 * 100); // Tiempo razonable para firmar
    
    return (complexityScore + sizeScore + durationScore) / 3;
  };

  // Limpiar firma
  const clearSignature = useCallback(() => {
    setSignatureData(null);
    setHasSignature(false);
    setSignatureQuality(0);
    initializeCanvas();
  }, [initializeCanvas]);

  // Generar imagen de la firma
  const generateSignatureImage = useCallback((): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    
    return canvas.toDataURL('image/png');
  }, []);

  // Manejar firma
  const handleSign = useCallback(async () => {
    if (!hasSignature || !termsAccepted || !privacyAccepted) return;
    
    const signatureImage = generateSignatureImage();
    
    // Crear datos completos de la firma
    const completeSignatureData = {
      image: signatureImage,
      signatureData,
      quality: signatureQuality,
      timestamp: new Date().toISOString(),
      contractNumber,
      biometricAuthenticationId: biometricData?.authenticationId,
      device: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
    };
    
    // Convertir a base64 completo
    const signatureBase64 = btoa(JSON.stringify(completeSignatureData));
    
    onSign(`data:application/json;base64,${signatureBase64}`);
  }, [hasSignature, termsAccepted, privacyAccepted, generateSignatureImage, signatureData, signatureQuality, contractNumber, biometricData, onSign]);

  // Efectos
  useEffect(() => {
    initializeCanvas();
  }, [initializeCanvas]);

  // Event listeners para mouse y touch
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => draw(e as any);
    const handleMouseUp = () => stopDrawing();
    const handleTouchMove = (e: TouchEvent) => draw(e as any);
    const handleTouchEnd = () => stopDrawing();

    if (isDrawing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDrawing, draw, stopDrawing]);

  return (
    <Box>
      {/* Resumen de autenticación biométrica */}
      {biometricData?.confidenceScores && (
        <Card sx={{ mb: 3, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.main' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Verified />
              Autenticación Biométrica Completada
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary">Facial</Typography>
                  <Typography variant="h6" color="success.main">
                    {Math.round(biometricData.confidenceScores.face_confidence * 100)}%
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary">Documento</Typography>
                  <Typography variant="h6" color="success.main">
                    {Math.round(biometricData.confidenceScores.document_confidence * 100)}%
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary">Voz</Typography>
                  <Typography variant="h6" color="success.main">
                    {Math.round(biometricData.confidenceScores.voice_confidence * 100)}%
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary">General</Typography>
                  <Typography variant="h6" color="success.main">
                    {Math.round(biometricData.confidenceScores.overall_confidence * 100)}%
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Información del contrato */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          📝 Firma Digital del Contrato
        </Typography>
        <Typography variant="body2" paragraph>
          Está a punto de firmar digitalmente el contrato número <strong>{contractNumber}</strong>.
          Esta firma tendrá validez legal y completará el proceso de autenticación biométrica.
        </Typography>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Chip icon={<Assignment />} label={`Contrato: ${contractNumber}`} />
          <Chip icon={<DateRange />} label={new Date().toLocaleDateString('es-CO')} />
          <Chip icon={<Person />} label="Firma Digital" />
        </Box>
      </Alert>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Pad de firma */}
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Draw />
            Área de Firma
          </Typography>
          
          <Box
            ref={containerRef}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 2
            }}
          >
            <Paper
              elevation={2}
              sx={{
                p: 1,
                bgcolor: 'grey.50',
                border: hasSignature ? '2px solid' : '2px dashed',
                borderColor: hasSignature ? 'success.main' : 'grey.300',
                borderRadius: 2
              }}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{
                  cursor: 'crosshair',
                  touchAction: 'none',
                  display: 'block'
                }}
              />
            </Paper>
          </Box>

          {/* Indicadores de calidad */}
          {hasSignature && (
            <Box sx={{ mb: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Calidad de la firma
                </Typography>
                <Chip
                  size="small"
                  label={`${Math.round(signatureQuality)}%`}
                  color={signatureQuality > 70 ? 'success' : signatureQuality > 40 ? 'warning' : 'error'}
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={signatureQuality}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    bgcolor: signatureQuality > 70 ? 'success.main' : signatureQuality > 40 ? 'warning.main' : 'error.main'
                  }
                }}
              />
            </Box>
          )}

          {/* Controles */}
          <Box display="flex" justifyContent="center" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={clearSignature}
              disabled={!hasSignature || loading}
            >
              Limpiar
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Save />}
              onClick={() => setShowPreview(true)}
              disabled={!hasSignature || loading}
            >
              Vista Previa
            </Button>
          </Box>

          {/* Advertencias */}
          {hasSignature && signatureQuality < 40 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Warning sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
              La calidad de la firma es baja. Considere firmar nuevamente de forma más clara y compleja.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Términos y condiciones */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Gavel />
            Términos y Condiciones
          </Typography>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                disabled={loading}
              />
            }
            label={
              <Typography variant="body2">
                Acepto los{' '}
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setShowTerms(true)}
                  sx={{ p: 0, textDecoration: 'underline' }}
                >
                  términos y condiciones
                </Button>
                {' '}del contrato digital
              </Typography>
            }
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                disabled={loading}
              />
            }
            label={
              <Typography variant="body2">
                Acepto el tratamiento de mis datos biométricos según la política de privacidad
              </Typography>
            }
          />
        </CardContent>
      </Card>

      {/* Botón de firma final */}
      <Box textAlign="center">
        <Button
          variant="contained"
          size="large"
          onClick={handleSign}
          disabled={
            loading || 
            !hasSignature || 
            !termsAccepted || 
            !privacyAccepted ||
            signatureQuality < 30
          }
          startIcon={loading ? <CircularProgress size={20} /> : <Security />}
          sx={{
            minWidth: 250,
            height: 56,
            fontSize: '1.1rem',
            borderRadius: 3
          }}
        >
          {loading ? 'Firmando Contrato...' : 'Firmar Digitalmente'}
        </Button>
      </Box>

      {/* Modal de vista previa */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Vista Previa de la Firma
        </DialogTitle>
        <DialogContent>
          {hasSignature && (
            <Box textAlign="center">
              <img
                src={generateSignatureImage()}
                alt="Vista previa de la firma"
                style={{
                  maxWidth: '100%',
                  border: '1px solid #ddd',
                  borderRadius: 8
                }}
              />
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Calidad: {Math.round(signatureQuality)}% | 
                  Puntos: {signatureData?.points.length || 0} | 
                  Duración: {signatureData ? Math.round(signatureData.duration / 1000) : 0}s
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de términos */}
      <Dialog
        open={showTerms}
        onClose={() => setShowTerms(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Términos y Condiciones - Firma Digital
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Al firmar digitalmente este contrato, usted acepta que:
          </Typography>
          
          <Typography variant="body2" component="div" sx={{ ml: 2 }}>
            • La firma digital tiene la misma validez legal que una firma manuscrita<br />
            • Sus datos biométricos han sido capturados y verificados de forma segura<br />
            • El contrato será ejecutable legalmente una vez completado el proceso<br />
            • Acepta los términos específicos del contrato de arrendamiento<br />
            • La información proporcionada es veraz y completa<br />
            • Comprende sus derechos y obligaciones bajo este contrato
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="body2" paragraph>
            <strong>Tratamiento de Datos Biométricos:</strong>
          </Typography>
          
          <Typography variant="body2" component="div" sx={{ ml: 2 }}>
            • Sus datos biométricos son procesados exclusivamente para verificación de identidad<br />
            • Los datos son cifrados y almacenados de forma segura<br />
            • No se comparten con terceros sin su consentimiento expreso<br />
            • Puede solicitar la eliminación de sus datos biométricos en cualquier momento<br />
            • El procesamiento cumple con las regulaciones de protección de datos vigentes
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTerms(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DigitalSignaturePad;