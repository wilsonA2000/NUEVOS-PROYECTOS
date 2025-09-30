/**
 * Componente mejorado para captura facial con contexto y navegación
 */

import React from 'react';
import {
  Box,
  Typography,
  Alert,
  Paper,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowForward as ArrowForwardIcon,
  PhotoCamera as PhotoCameraIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import SimpleProfessionalCamera from './SimpleProfessionalCamera';

interface EnhancedFaceCaptureProps {
  onCapture: (image: string) => void;
  onError?: (error: string) => void;
  currentStep?: number;
  totalSteps?: number;
  stepName?: string;
  onCancel?: () => void;
  loading?: boolean;
}

const EnhancedFaceCapture: React.FC<EnhancedFaceCaptureProps> = ({
  onCapture,
  onError,
  currentStep = 1,
  totalSteps = 4,
  stepName = 'Captura Facial',
  onCancel,
  loading = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'grey.50'
    }}>
      {/* Header con contexto */}
      <Paper elevation={1} sx={{ borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ p: 2 }}>
          {/* Navegación superior */}
          <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={2}>
              {onCancel && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onCancel}
                  startIcon={<CloseIcon />}
                >
                  Cancelar
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
          </Box>

          {/* Instrucciones */}
          <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 0 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Tome una foto frontal clara de su rostro</strong>
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '0.875rem' }}>
              <li>Mantenga su rostro centrado y bien iluminado</li>
              <li>Retire gafas oscuras, gorras o cualquier objeto que cubra su cara</li>
              <li>Mire directamente a la cámara con expresión neutra</li>
              <li>Asegúrese de que todo su rostro sea visible</li>
            </Box>
          </Alert>
        </Box>
      </Paper>

      {/* Área de cámara optimizada - Compacta y centrada */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center', // Centrar horizontalmente
        p: 1,
        height: '320px'
      }}>
        <Box sx={{ 
          width: '100%',
          maxWidth: '400px', // Ancho máximo del área de cámara
          height: '100%'
        }}>
          <SimpleProfessionalCamera
            onCapture={onCapture}
            onError={onError}
            instructions="Tome una foto frontal clara de su rostro"
          />
        </Box>
      </Box>

      {/* Footer con información adicional */}
      <Paper elevation={2} sx={{ 
        borderRadius: '12px 12px 0 0',
        p: 2,
        bgcolor: 'background.paper'
      }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              <PhotoCameraIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              Esta foto se usará para verificar su identidad
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Sus datos están protegidos y se procesan de forma segura
            </Typography>
          </Box>
          
          {/* Indicador de progreso */}
          <Box textAlign="right">
            <Typography variant="body2" fontWeight="600" color="primary.main">
              {Math.round((currentStep / totalSteps) * 100)}% Completado
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Siguiente: Verificación de Documento
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default EnhancedFaceCapture;