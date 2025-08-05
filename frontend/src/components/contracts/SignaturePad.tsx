import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import {
  Clear as ClearIcon,
  Check as CheckIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Security as SecurityIcon,
  VerifiedUser as VerifiedIcon,
  Fingerprint as FingerprintIcon
} from '@mui/icons-material';

interface SignaturePadProps {
  onSignatureComplete: (signatureData: SignatureData) => void;
  contractId: string;
  signerName: string;
  isLoading?: boolean;
  onCancel?: () => void;
}

interface SignatureData {
  signature: string;
  timestamp: Date;
  signerInfo: {
    name: string;
    ipAddress: string;
    userAgent: string;
    geolocation?: GeolocationPosition;
  };
  verification: {
    hash: string;
    method: 'digital_signature';
    metadata: Record<string, any>;
  };
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureComplete,
  contractId,
  signerName,
  isLoading = false,
  onCancel
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configure canvas
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Add white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  };

  const startDrawing = (pos: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (pos: { x: number; y: number }) => {
    if (!isDrawing) return;
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    setSignatureDataUrl('');
  };

  const captureSignature = async () => {
    if (isEmpty) return;

    setIsCapturing(true);

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not available');

      // Capture signature as data URL
      const dataUrl = canvas.toDataURL('image/png');
      setSignatureDataUrl(dataUrl);

      // Get user info
      const position = await getCurrentPosition();
      
      // Create signature hash for verification
      const signatureHash = await generateSignatureHash(dataUrl);

      const signatureData: SignatureData = {
        signature: dataUrl,
        timestamp: new Date(),
        signerInfo: {
          name: signerName,
          ipAddress: await getClientIP(),
          userAgent: navigator.userAgent,
          geolocation: position
        },
        verification: {
          hash: signatureHash,
          method: 'digital_signature',
          metadata: {
            contractId,
            canvasSize: {
              width: canvas.width,
              height: canvas.height
            },
            devicePixelRatio: window.devicePixelRatio,
            timestamp: Date.now()
          }
        }
      };

      setShowPreview(true);
      
      // Call parent callback after user confirms
      // onSignatureComplete(signatureData);
      
    } catch (error) {
      console.error('Error capturing signature:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const confirmSignature = () => {
    if (!signatureDataUrl) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create final signature data
    const signatureData: SignatureData = {
      signature: signatureDataUrl,
      timestamp: new Date(),
      signerInfo: {
        name: signerName,
        ipAddress: 'pending', // Will be filled by backend
        userAgent: navigator.userAgent,
      },
      verification: {
        hash: 'pending', // Will be generated by backend
        method: 'digital_signature',
        metadata: {
          contractId,
          canvasSize: {
            width: canvas.width,
            height: canvas.height
          }
        }
      }
    };

    onSignatureComplete(signatureData);
    setShowPreview(false);
  };

  // Helper functions
  const getCurrentPosition = (): Promise<GeolocationPosition | undefined> => {
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          () => resolve(undefined),
          { timeout: 5000 }
        );
      } else {
        resolve(undefined);
      }
    });
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  const generateSignatureHash = async (dataUrl: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(dataUrl + Date.now());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  return (
    <>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <EditIcon sx={{ mr: 1 }} />
          Firma Digital del Contrato
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Firmante:</strong> {signerName}
          </Typography>
          <Typography variant="body2">
            Por favor, firme en el área designada abajo. Su firma será verificada digitalmente 
            y tendrá validez legal.
          </Typography>
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Área de Firma
          </Typography>
          <Box
            sx={{
              border: '2px dashed #ccc',
              borderRadius: 1,
              position: 'relative',
              background: '#fafafa'
            }}
          >
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              style={{
                width: '100%',
                height: '200px',
                cursor: 'crosshair',
                display: 'block',
                background: 'white'
              }}
              onMouseDown={(e) => startDrawing(getMousePos(e))}
              onMouseMove={(e) => draw(getMousePos(e))}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={(e) => {
                e.preventDefault();
                startDrawing(getTouchPos(e));
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                draw(getTouchPos(e));
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                stopDrawing();
              }}
            />
            {isEmpty && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#aaa',
                  pointerEvents: 'none',
                  textAlign: 'center'
                }}
              >
                <EditIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="body2">
                  Firme aquí con el mouse o dedo
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={clearSignature}
              disabled={isEmpty || isLoading}
            >
              Limpiar
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onCancel && (
              <Button
                variant="text"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={isCapturing ? <CircularProgress size={20} /> : <CheckIcon />}
              onClick={captureSignature}
              disabled={isEmpty || isLoading || isCapturing}
            >
              {isCapturing ? 'Capturando...' : 'Firmar Contrato'}
            </Button>
          </Box>
        </Box>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <SecurityIcon color="primary" />
            </Grid>
            <Grid item xs>
              <Typography variant="body2" fontWeight="medium">
                Seguridad y Verificación
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Su firma será verificada con hash criptográfico, ubicación GPS, 
                dirección IP y datos del dispositivo para garantizar su autenticidad.
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <VisibilityIcon sx={{ mr: 1 }} />
          Confirmar Firma Digital
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Una vez confirmada, esta firma tendrá validez legal y no podrá ser modificada.
            </Typography>
          </Alert>

          <Typography variant="subtitle2" gutterBottom>
            Vista Previa de la Firma:
          </Typography>
          {signatureDataUrl && (
            <Box sx={{ mb: 2, textAlign: 'center' }}>
              <img
                src={signatureDataUrl}
                alt="Signature preview"
                style={{
                  maxWidth: '100%',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Firmante:</strong> {signerName}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Fecha:</strong> {new Date().toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  icon={<VerifiedIcon />}
                  label="Verificación Criptográfica"
                  color="primary"
                  size="small"
                />
                <Chip
                  icon={<SecurityIcon />}
                  label="Ubicación GPS"
                  color="primary"
                  size="small"
                />
                <Chip
                  icon={<SecurityIcon />}
                  label="Dirección IP"
                  color="primary"
                  size="small"
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>
            Revisar Firma
          </Button>
          <Button
            variant="contained"
            onClick={confirmSignature}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : <VerifiedIcon />}
          >
            {isLoading ? 'Firmando...' : 'Confirmar y Firmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SignaturePad;