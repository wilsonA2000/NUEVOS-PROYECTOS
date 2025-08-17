/**
 * Componente mejorado para firma digital con contexto y navegación
 */

import React from 'react';
import {
  Box,
  Typography,
  Alert,
  Paper,
  Button,
  useTheme,
  useMediaQuery,
  Chip,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Done as DoneIcon,
  Draw as DrawIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import DigitalSignaturePad from './DigitalSignaturePad';

interface EnhancedDigitalSignatureProps {
  onSuccess: (data: any) => void;
  onError?: (error: string) => void;
  currentStep?: number;
  totalSteps?: number;
  stepName?: string;
  onBack?: () => void;
  loading?: boolean;
  contractData?: any;
}

const EnhancedDigitalSignature: React.FC<EnhancedDigitalSignatureProps> = ({
  onSuccess,
  onError,
  currentStep = 4,
  totalSteps = 4,
  stepName = 'Firma Digital',
  onBack,
  loading = false,
  contractData
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
              {onBack && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onBack}
                  startIcon={<ArrowBackIcon />}
                >
                  Anterior
                </Button>
              )}
              <Box>
                <Typography variant="h6" fontWeight="600">
                  {stepName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Paso {currentStep} de {totalSteps} - Paso Final
                </Typography>
              </Box>
            </Box>

            {/* Indicador de completación */}
            <Chip 
              icon={<CheckCircleIcon />}
              label="Casi Terminado"
              color="success"
              variant="outlined"
            />
          </Box>

          {/* Resumen del proceso */}
          <Alert severity="success" icon={<SecurityIcon />} sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>🎉 ¡Autenticación biométrica completada con éxito!</strong>
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip size="small" icon={<CheckCircleIcon />} label="Rostro verificado" color="success" variant="outlined" />
              <Chip size="small" icon={<CheckCircleIcon />} label="Documento validado" color="success" variant="outlined" />
              <Chip size="small" icon={<CheckCircleIcon />} label="Voz autenticada" color="success" variant="outlined" />
            </Box>
          </Alert>

          {/* Instrucciones finales */}
          <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 0 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Firme digitalmente para completar el proceso</strong>
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '0.875rem' }}>
              <li>Use su dedo o stylus para firmar en el área designada</li>
              <li>Firme de manera similar a su firma habitual</li>
              <li>Puede limpiar y volver a firmar si es necesario</li>
              <li>Una vez firmado, el contrato será legalmente vinculante</li>
            </Box>
          </Alert>
        </Box>
      </Paper>

      {/* Área de firma */}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        p: 2
      }}>
        <Paper elevation={2} sx={{ 
          height: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Componente de firma digital */}
          <Box sx={{ flex: 1, p: 2 }}>
            <DigitalSignaturePad
              onSign={onSuccess}
              contractNumber={contractData?.contractId || 'CONTRACT-001'}
              loading={loading}
              error={onError ? undefined : undefined}
              biometricData={{
                authenticationId: contractData?.authenticationId,
                confidenceScores: contractData?.confidenceScores,
                voiceText: contractData?.voiceText,
                progress: 100
              }}
            />
          </Box>
        </Paper>
      </Box>

      {/* Footer con información legal */}
      <Paper elevation={2} sx={{ 
        borderRadius: '12px 12px 0 0',
        p: 2,
        bgcolor: 'background.paper'
      }}>
        <Box>
          {/* Información legal */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <AssignmentIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              <strong>Información Legal:</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              • Su firma digital tiene la misma validez legal que una firma manuscrita
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              • Este proceso cumple con la normativa colombiana de firma electrónica
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              • Los datos biométricos se procesan de forma segura y confidencial
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Estado final */}
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="body2" color="text.secondary">
                <DrawIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                Último paso para completar la autenticación
              </Typography>
            </Box>
            
            <Box textAlign="right">
              <Typography variant="body2" fontWeight="600" color="success.main">
                100% Cuando Firme
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Proceso de Autenticación Biométrica
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default EnhancedDigitalSignature;