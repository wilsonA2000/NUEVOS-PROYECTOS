/**
 * Componente mejorado para grabación de voz con contexto y navegación
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Paper,
  Button,
  useTheme,
  useMediaQuery,
  Chip,
  LinearProgress,
  Grid
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Mic as MicIcon,
  Info as InfoIcon,
  VolumeUp as VolumeUpIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import VoiceRecorder from './VoiceRecorder';

interface EnhancedVoiceRecordingProps {
  onSuccess: (data: any) => void;
  onError?: (error: string) => void;
  currentStep?: number;
  totalSteps?: number;
  stepName?: string;
  onBack?: () => void;
  loading?: boolean;
  voiceText?: string;
  educationalPhrase?: string;
  userInfo?: {
    fullName?: string;
    documentNumber?: string;
    documentIssueDate?: string;
  };
}

const EnhancedVoiceRecording: React.FC<EnhancedVoiceRecordingProps> = ({
  onSuccess,
  onError,
  currentStep = 3,
  totalSteps = 4,
  stepName = 'Grabación de Voz',
  onBack,
  loading = false,
  voiceText = "Acepto los términos y condiciones de este contrato",
  educationalPhrase = "La educación es la llave dorada que abre todas las puertas del conocimiento",
  userInfo
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Estados para manejar las dos grabaciones
  const [recordingPhase, setRecordingPhase] = useState<'identification' | 'cultural' | 'completed'>('identification');
  const [identificationRecording, setIdentificationRecording] = useState<string | null>(null);
  const [culturalRecording, setCulturalRecording] = useState<string | null>(null);

  // Manejar la primera grabación (identificación)
  const handleIdentificationRecording = (audioData: any) => {
    console.log('🎤 FASE 1: Grabación de identificación completada', audioData ? 'CON DATOS' : 'SIN DATOS');
    console.log('🎤 FASE 1: audioData length:', audioData?.length || 'undefined');
    console.log('🎤 FASE 1: Avanzando a fase cultural...');
    
    setIdentificationRecording(audioData);
    setRecordingPhase('cultural');
    
    console.log('🎤 FASE 1: Cambio de fase ejecutado, nueva fase: cultural');
  };

  // Manejar la segunda grabación (cultural)
  const handleCulturalRecording = (audioData: any) => {
    console.log('🎤 FASE 2: Grabación cultural completada', audioData ? 'CON DATOS' : 'SIN DATOS');
    console.log('🎤 FASE 2: identificationRecording disponible?', !!identificationRecording);
    
    setCulturalRecording(audioData);
    setRecordingPhase('completed');
    
    // Enviar ambas grabaciones al componente padre
    const completeData = {
      identificationRecording: identificationRecording,
      culturalRecording: audioData,
      educationalPhrase: educationalPhrase,
      userInfo: userInfo
    };
    
    console.log('🎤 ENVIANDO DATOS COMPLETOS AL PADRE:', completeData);
    console.log('🎤 DATOS DETALLADOS:', {
      hasIdentification: !!identificationRecording,
      hasCultural: !!audioData,
      hasUserInfo: !!userInfo,
      hasPhrase: !!educationalPhrase
    });
    
    onSuccess(completeData);
  };

  // Reiniciar el proceso
  const handleReset = () => {
    setRecordingPhase('identification');
    setIdentificationRecording(null);
    setCulturalRecording(null);
  };

  // Obtener el texto actual según la fase
  const getCurrentText = () => {
    return recordingPhase === 'identification' ? voiceText : educationalPhrase;
  };

  // Obtener el título según la fase
  const getCurrentTitle = () => {
    if (recordingPhase === 'identification') {
      return userInfo?.fullName && userInfo?.documentNumber && userInfo?.documentIssueDate
        ? 'Grabación 1/2: Información de Identificación Personal'
        : 'Grabación 1/2: Proporcione su Información de Identificación';
    } else if (recordingPhase === 'cultural') {
      return 'Grabación 2/2: Verificación Cultural y Anti-Bot';
    } else {
      return '✅ Verificación de Voz Completada';
    }
  };

  // Debug log para verificar qué fase está activa
  console.log('🎤 ENHANCED VOICE: Renderizando fase actual:', recordingPhase);
  console.log('🎤 ENHANCED VOICE: Estado grabaciones:', {
    identification: !!identificationRecording,
    cultural: !!culturalRecording
  });

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'grey.50'
    }}>
      {/* Header compacto */}
      <Paper elevation={1} sx={{ borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ p: 1 }}>
          {/* Navegación superior - muy compacta */}
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              {onBack && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onBack}
                  startIcon={<ArrowBackIcon />}
                  sx={{ fontSize: '0.75rem', py: 0.5 }}
                >
                  Anterior
                </Button>
              )}
              <Box>
                <Typography variant="subtitle1" fontWeight="600" sx={{ fontSize: '1rem' }}>
                  {stepName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Paso {currentStep} de {totalSteps}
                </Typography>
              </Box>
            </Box>

            {/* Progreso visual compacto */}
            <Chip 
              label={`${Math.round((currentStep / totalSteps) * 100)}%`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>

          {/* Instrucciones compactas */}
          <Alert 
            severity={recordingPhase === 'identification' ? 'info' : recordingPhase === 'cultural' ? 'warning' : 'success'} 
            icon={<InfoIcon />} 
            sx={{ mt: 1, mb: 0, py: 1 }}
          >
            <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.875rem' }}>
              <strong>{getCurrentTitle()}</strong>
            </Typography>

            {/* Progreso de grabaciones - compacto */}
            <Box sx={{ mb: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={recordingPhase === 'identification' ? 25 : recordingPhase === 'cultural' ? 75 : 100}
                sx={{ height: 4, borderRadius: 2 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                {recordingPhase === 'identification' && 'Paso 1/2: ID'}
                {recordingPhase === 'cultural' && 'Paso 2/2: Cultural'}
                {recordingPhase === 'completed' && 'Completado'}
              </Typography>
            </Box>

            {/* Explicación según la fase */}
            {recordingPhase === 'identification' && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                {userInfo?.fullName && userInfo?.documentNumber && userInfo?.documentIssueDate
                  ? 'Grabe la siguiente información de identificación personal'
                  : 'Proporcione su información de identificación personal'
                }
              </Typography>
            )}

            {recordingPhase === 'cultural' && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>🎭 Ahora grabe la siguiente frase educativa</strong><br/>
                Esta verificación cultural confirma que es una persona real y promueve la lectura.
              </Typography>
            )}

            {recordingPhase === 'completed' && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>🎉 ¡Excelente! Ha completado ambas verificaciones de voz</strong><br/>
                Su identidad ha sido verificada y ha demostrado sus habilidades de lectura.
              </Typography>
            )}
            
            {/* Información del usuario si está disponible - Solo en fase de identificación */}
            {recordingPhase === 'identification' && userInfo?.fullName && userInfo?.documentNumber && userInfo?.documentIssueDate && (
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 1.5, 
                  mt: 1, 
                  mb: 2,
                  bgcolor: 'success.50',
                  borderColor: 'success.200'
                }}
              >
                <Typography variant="caption" color="success.main" fontWeight="600" sx={{ mb: 1, display: 'block' }}>
                  ✓ Información detectada:
                </Typography>
                <Grid container spacing={1} sx={{ fontSize: '0.875rem' }}>
                  <Grid item xs={12}>
                    <Typography variant="body2">
                      <strong>Nombre:</strong> {userInfo.fullName}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      <strong>Documento:</strong> {userInfo.documentNumber}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      <strong>Expedición:</strong> {userInfo.documentIssueDate}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {/* Indicador de primera grabación completada */}
            {recordingPhase === 'cultural' && identificationRecording && (
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 1.5, 
                  mt: 1, 
                  mb: 2,
                  bgcolor: 'success.50',
                  borderColor: 'success.200'
                }}
              >
                <Typography variant="caption" color="success.main" fontWeight="600" sx={{ mb: 1, display: 'block' }}>
                  ✅ Grabación 1/2 completada: Información de identidad registrada
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ahora proceda con la verificación cultural para demostrar sus habilidades de lectura.
                </Typography>
              </Paper>
            )}
            
            {/* Frase a grabar destacada - Solo mostrar si no está completado */}
            {recordingPhase !== 'completed' && (
              <>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    mt: 1, 
                    bgcolor: recordingPhase === 'identification' ? 'primary.50' : 'warning.50',
                    borderColor: recordingPhase === 'identification' ? 'primary.200' : 'warning.200'
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                    <VolumeUpIcon color={recordingPhase === 'identification' ? 'primary' : 'warning'} fontSize="small" />
                    <Typography variant="subtitle2" color={recordingPhase === 'identification' ? 'primary.main' : 'warning.main'} fontWeight="600">
                      {recordingPhase === 'identification' 
                        ? (userInfo?.fullName && userInfo?.documentNumber && userInfo?.documentIssueDate
                            ? 'Información a grabar:'
                            : 'Información requerida:')
                        : '📚 Frase educativa a grabar:'
                      }
                    </Typography>
                  </Box>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontStyle: 'italic',
                      fontWeight: 500,
                      color: 'text.primary',
                      lineHeight: 1.4
                    }}
                  >
                    "{getCurrentText()}"
                  </Typography>
                </Paper>

                <Box component="ul" sx={{ m: '8px 0 0 0', pl: 2, fontSize: '0.875rem' }}>
                  <li>Hable con voz clara y a volumen normal</li>
                  <li>
                    {recordingPhase === 'identification' 
                      ? (userInfo?.fullName && userInfo?.documentNumber && userInfo?.documentIssueDate
                          ? 'Pronuncie la información completa tal como aparece arriba'
                          : 'Diga claramente: su nombre completo, número de documento y fecha de expedición')
                      : 'Lea la frase educativa completa, respetando la puntuación'
                    }
                  </li>
                  <li>Grabe en un ambiente silencioso</li>
                  <li>Puede repetir la grabación si no queda satisfecho</li>
                  {recordingPhase === 'cultural' && (
                    <li><strong>💡 Esta verificación demuestra que es una persona real y promueve la cultura</strong></li>
                  )}
                </Box>
              </>
            )}

            {/* Resumen final cuando está completado */}
            {recordingPhase === 'completed' && (
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  mt: 1, 
                  bgcolor: 'success.50',
                  borderColor: 'success.200'
                }}
              >
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>✅ Verificaciones completadas:</strong>
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '0.875rem' }}>
                  <li>✅ Identidad personal verificada</li>
                  <li>✅ Capacidad de lectura demostrada</li>
                  <li>✅ Verificación anti-bot completada</li>
                </Box>
              </Paper>
            )}
          </Alert>
        </Box>
      </Paper>

      {/* Área de grabación */}
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
          {/* Componente de grabación */}
          <Box sx={{ flex: 1, p: 2 }}>
            {recordingPhase === 'identification' && (
              <VoiceRecorder
                onRecord={handleIdentificationRecording}
                expectedText={getCurrentText()}
                loading={loading}
              />
            )}
            
            {recordingPhase === 'cultural' && (
              <VoiceRecorder
                onRecord={handleCulturalRecording}
                expectedText={getCurrentText()}
                loading={loading}
              />
            )}

            {recordingPhase === 'completed' && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                gap: 3
              }}>
                <Box sx={{ fontSize: '4rem' }}>🎉</Box>
                <Typography variant="h5" fontWeight="600" color="success.main">
                  ¡Verificación Completada!
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Ha completado exitosamente ambas verificaciones de voz.
                  El sistema procederá automáticamente al siguiente paso.
                </Typography>
                
                <Button
                  variant="outlined"
                  onClick={handleReset}
                  size="small"
                  sx={{ mt: 2 }}
                >
                  Repetir Verificaciones
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Footer compacto */}
      <Paper elevation={1} sx={{ 
        borderRadius: 0,
        p: 1,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider'
      }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            <MicIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
            Verificación segura por voz
          </Typography>
          
          <Typography variant="caption" color="primary.main" fontWeight="600">
            Siguiente: Firma Digital
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default EnhancedVoiceRecording;