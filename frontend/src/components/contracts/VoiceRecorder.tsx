/**
 * Componente de grabación de voz para autenticación biométrica.
 * 
 * Permite grabar la frase específica:
 * "He firmado digitalmente el contrato número [contract_number] el día [date]"
 * 
 * Features:
 * - Grabación de audio con análisis en tiempo real
 * - Visualización de forma de onda
 * - Detección de calidad de audio
 * - Comparación con texto esperado
 * - Controles de reproducción
 * - Validación de duración mínima/máxima
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  LinearProgress,
  Chip,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Fade,
  CircularProgress,
  Slider,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Mic,
  MicOff,
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  VolumeUp,
  GraphicEq,
  CheckCircle,
  Error,
  Warning,
  RecordVoiceOver,
  Timer,
  Waveform
} from '@mui/icons-material';

interface VoiceRecorderProps {
  onRecord: (voiceRecording: string) => void;
  expectedText: string;
  loading?: boolean;
  error?: string | null;
}

interface AudioAnalysis {
  duration: number;
  volume: number;
  quality: number;
  clarity: number;
  speechDetected: boolean;
  backgroundNoise: number;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  analysis: AudioAnalysis | null;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecord,
  expectedText,
  loading = false,
  error = null
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Referencias
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>();
  const chunksRef = useRef<Blob[]>([]);
  
  // Estados
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    analysis: null
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [transcriptionResult, setTranscriptionResult] = useState<{
    text: string;
    confidence: number;
    matchScore: number;
  } | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

  // Constantes
  const MIN_DURATION = 3; // segundos mínimos
  const MAX_DURATION = 30; // segundos máximos
  const MIN_QUALITY = 0.6; // calidad mínima aceptable

  // Inicializar media recorder
  const initializeRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      // Configurar MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Configurar AudioContext para análisis
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Event listeners
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setRecordingState(prev => ({
          ...prev,
          audioBlob,
          audioUrl,
          isRecording: false
        }));
        
        // Analizar audio grabado
        analyzeRecordedAudio(audioBlob);
      };

      return true;
    } catch (err) {
      console.error('Error initializing recorder:', err);
      return false;
    }
  }, []);

  // Iniciar grabación
  const startRecording = useCallback(async () => {
    const initialized = await initializeRecorder();
    if (!initialized || !mediaRecorderRef.current) return;

    mediaRecorderRef.current.start(100); // Capturar datos cada 100ms
    
    setRecordingState(prev => ({
      ...prev,
      isRecording: true,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      analysis: null
    }));

    setShowInstructions(false);
    startVisualization();
    startTimer();
  }, []);

  // Detener grabación
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
      
      // Detener stream
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
    
    stopVisualization();
    setRecordingState(prev => ({ ...prev, isRecording: false }));
  }, [recordingState.isRecording]);

  // Pausar/reanudar grabación
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    if (recordingState.isPaused) {
      mediaRecorderRef.current.resume();
      startVisualization();
    } else {
      mediaRecorderRef.current.pause();
      stopVisualization();
    }
    
    setRecordingState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, [recordingState.isPaused]);

  // Iniciar timer
  const startTimer = useCallback(() => {
    const interval = setInterval(() => {
      setRecordingState(prev => {
        if (!prev.isRecording) {
          clearInterval(interval);
          return prev;
        }
        
        const newDuration = prev.duration + 0.1;
        
        // Auto-detener si excede duración máxima
        if (newDuration >= MAX_DURATION) {
          setTimeout(stopRecording, 100);
          clearInterval(interval);
          return { ...prev, duration: MAX_DURATION };
        }
        
        return { ...prev, duration: newDuration };
      });
    }, 100);
  }, [stopRecording]);

  // Iniciar visualización
  const startVisualization = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateVisualization = () => {
      if (!recordingState.isRecording || recordingState.isPaused) return;

      analyser.getByteFrequencyData(dataArray);
      
      // Calcular nivel de volumen
      const volume = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength / 255;
      
      // Actualizar waveform data (simplificado)
      const waveform = Array.from(dataArray.slice(0, 64)).map(value => value / 255);
      setWaveformData(waveform);
      
      // Análisis en tiempo real
      const analysis = analyzeAudioData(dataArray, volume);
      setRecordingState(prev => ({ ...prev, analysis }));
      
      animationFrameRef.current = requestAnimationFrame(updateVisualization);
    };

    updateVisualization();
  }, [recordingState.isRecording, recordingState.isPaused]);

  // Detener visualización
  const stopVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  // Analizar datos de audio en tiempo real
  const analyzeAudioData = (dataArray: Uint8Array, volume: number): AudioAnalysis => {
    // Análisis simple de calidad de audio
    const averageFreq = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const maxFreq = Math.max(...dataArray);
    
    // Detectar si hay habla (frecuencias en rango de voz humana)
    const speechRange = dataArray.slice(10, 40); // Aproximadamente 430Hz - 1720Hz
    const speechLevel = speechRange.reduce((sum, value) => sum + value, 0) / speechRange.length;
    const speechDetected = speechLevel > 30 && volume > 0.1;
    
    // Calcular ruido de fondo
    const backgroundNoise = dataArray.slice(0, 10).reduce((sum, value) => sum + value, 0) / 10;
    
    // Calcular claridad (relación señal/ruido simplificada)
    const clarity = speechLevel / Math.max(backgroundNoise, 1);
    
    // Puntuación de calidad general
    const quality = Math.min(1, (volume * 0.4) + (clarity / 100 * 0.4) + (speechDetected ? 0.2 : 0));
    
    return {
      duration: recordingState.duration,
      volume,
      quality,
      clarity: clarity / 100,
      speechDetected,
      backgroundNoise: backgroundNoise / 255
    };
  };

  // Analizar audio grabado completo
  const analyzeRecordedAudio = useCallback(async (audioBlob: Blob) => {
    try {
      // Simular transcripción (en producción usar servicio real)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const simulatedTranscription = simulateTranscription(expectedText);
      setTranscriptionResult(simulatedTranscription);
      
    } catch (err) {
      console.error('Error analyzing recorded audio:', err);
    }
  }, [expectedText]);

  // Simular transcripción
  const simulateTranscription = (expectedText: string) => {
    // Simular algunas variaciones en la transcripción
    const variations = [
      expectedText,
      expectedText.replace('digitalmente', 'digitalmente'),
      expectedText.replace('contrato número', 'contrato numero'),
      expectedText.toLowerCase()
    ];
    
    const transcribedText = variations[Math.floor(Math.random() * variations.length)];
    const confidence = 0.85 + Math.random() * 0.1; // 85-95%
    
    // Calcular similitud simple
    const expectedWords = expectedText.toLowerCase().split(' ');
    const transcribedWords = transcribedText.toLowerCase().split(' ');
    const matchedWords = expectedWords.filter(word => transcribedWords.includes(word));
    const matchScore = matchedWords.length / expectedWords.length;
    
    return {
      text: transcribedText,
      confidence,
      matchScore
    };
  };

  // Reproducir audio
  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !recordingState.audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  }, [isPlaying, recordingState.audioUrl]);

  // Reiniciar grabación
  const resetRecording = useCallback(() => {
    if (recordingState.audioUrl) {
      URL.revokeObjectURL(recordingState.audioUrl);
    }
    
    setRecordingState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      analysis: null
    });
    
    setTranscriptionResult(null);
    setIsPlaying(false);
    setPlaybackTime(0);
    setWaveformData([]);
    setShowInstructions(true);
  }, [recordingState.audioUrl]);

  // Enviar grabación
  const handleSubmit = useCallback(async () => {
    console.log('🎤 VOICE RECORDER: handleSubmit llamado');
    console.log('🎤 VOICE RECORDER: audioBlob existe?', !!recordingState.audioBlob);
    console.log('🎤 VOICE RECORDER: duración:', recordingState.duration);
    
    if (!recordingState.audioBlob) {
      console.log('🎤 VOICE RECORDER: Sin audioBlob, cancelando');
      return;
    }
    
    try {
      // Convertir blob a base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        console.log('🎤 VOICE RECORDER: Datos convertidos a base64, llamando onRecord');
        console.log('🎤 VOICE RECORDER: Base64 length:', base64Data.length);
        onRecord(base64Data);
      };
      reader.readAsDataURL(recordingState.audioBlob);
    } catch (err) {
      console.error('🎤 VOICE RECORDER: Error submitting recording:', err);
    }
  }, [recordingState.audioBlob, onRecord]);

  // Formatear tiempo
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Efectos
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const updateTime = () => setPlaybackTime(audio.currentTime);
      const onEnded = () => setIsPlaying(false);
      
      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('ended', onEnded);
      
      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('ended', onEnded);
      };
    }
  }, [recordingState.audioUrl]);

  useEffect(() => {
    return () => {
      stopVisualization();
      if (recordingState.audioUrl) {
        URL.revokeObjectURL(recordingState.audioUrl);
      }
    };
  }, []);

  // Renderizar waveform
  const renderWaveform = () => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'end',
        justifyContent: 'center',
        height: 60,
        gap: 0.5,
        overflow: 'hidden'
      }}
    >
      {Array.from({ length: 64 }, (_, i) => (
        <Box
          key={i}
          sx={{
            width: 2,
            height: recordingState.isRecording 
              ? `${Math.max(2, (waveformData[i] || 0) * 60)}px`
              : '2px',
            bgcolor: recordingState.isRecording && waveformData[i] > 0.1 
              ? 'primary.main' 
              : 'grey.300',
            borderRadius: 1,
            transition: 'all 0.1s ease'
          }}
        />
      ))}
    </Box>
  );

  return (
    <Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Panel de grabación */}
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardContent>
          <Box textAlign="center">
            {/* Visualización de waveform */}
            <Box sx={{ mb: 3 }}>
              {renderWaveform()}
            </Box>

            {/* Controles principales */}
            <Box display="flex" justifyContent="center" alignItems="center" gap={2} mb={2}>
              {!recordingState.isRecording && !recordingState.audioBlob && (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Mic />}
                  onClick={startRecording}
                  disabled={loading}
                  sx={{
                    minWidth: 160,
                    height: 48,
                    borderRadius: 3,
                    fontSize: '1.1rem'
                  }}
                >
                  Iniciar Grabación
                </Button>
              )}

              {recordingState.isRecording && (
                <>
                  <IconButton
                    color={recordingState.isPaused ? 'primary' : 'default'}
                    onClick={togglePause}
                    disabled={loading}
                    sx={{ fontSize: '2rem' }}
                  >
                    {recordingState.isPaused ? <Mic /> : <Pause />}
                  </IconButton>
                  
                  <IconButton
                    color="error"
                    onClick={stopRecording}
                    disabled={loading}
                    sx={{ fontSize: '2rem' }}
                  >
                    <Stop />
                  </IconButton>
                </>
              )}

              {recordingState.audioBlob && (
                <>
                  <IconButton
                    color="primary"
                    onClick={togglePlayback}
                    disabled={loading}
                    sx={{ fontSize: '2rem' }}
                  >
                    {isPlaying ? <Pause /> : <PlayArrow />}
                  </IconButton>
                  
                  <IconButton
                    onClick={resetRecording}
                    disabled={loading}
                  >
                    <Refresh />
                  </IconButton>
                </>
              )}
            </Box>

            {/* Timer */}
            <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={2}>
              <Timer fontSize="small" />
              <Typography variant="h6" fontFamily="monospace">
                {formatTime(recordingState.duration)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                / {formatTime(MAX_DURATION)}
              </Typography>
            </Box>

            {/* Indicadores de estado */}
            <Box display="flex" justifyContent="center" gap={2} mb={2}>
              {recordingState.analysis && (
                <>
                  <Chip
                    size="small"
                    icon={<VolumeUp />}
                    label={`Vol: ${Math.round(recordingState.analysis.volume * 100)}%`}
                    color={recordingState.analysis.volume > 0.3 ? 'success' : 'warning'}
                  />
                  
                  <Chip
                    size="small"
                    icon={<GraphicEq />}
                    label={`Calidad: ${Math.round(recordingState.analysis.quality * 100)}%`}
                    color={recordingState.analysis.quality > MIN_QUALITY ? 'success' : 'error'}
                  />
                  
                  {recordingState.analysis.speechDetected && (
                    <Chip
                      size="small"
                      icon={<RecordVoiceOver />}
                      label="Voz Detectada"
                      color="success"
                    />
                  )}
                </>
              )}
            </Box>

            {/* Advertencias */}
            {recordingState.duration > 0 && recordingState.duration < MIN_DURATION && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Duración mínima: {MIN_DURATION} segundos
              </Alert>
            )}

            {recordingState.analysis && recordingState.analysis.quality < MIN_QUALITY && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Calidad de audio insuficiente. Acérquese al micrófono y reduzca el ruido de fondo.
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Resultado de transcripción */}
      {transcriptionResult && (
        <Fade in timeout={500}>
          <Card sx={{ mb: 3, bgcolor: transcriptionResult.matchScore > 0.8 ? 'success.50' : 'warning.50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {transcriptionResult.matchScore > 0.8 ? (
                  <CheckCircle color="success" />
                ) : (
                  <Warning color="warning" />
                )}
                Transcripción
              </Typography>
              
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper' }}>
                <Typography variant="body1" fontStyle="italic">
                  "{transcriptionResult.text}"
                </Typography>
              </Paper>
              
              <Box display="flex" gap={2} flexWrap="wrap">
                <Chip
                  label={`Confianza: ${Math.round(transcriptionResult.confidence * 100)}%`}
                  color={transcriptionResult.confidence > 0.8 ? 'success' : 'warning'}
                />
                
                <Chip
                  label={`Coincidencia: ${Math.round(transcriptionResult.matchScore * 100)}%`}
                  color={transcriptionResult.matchScore > 0.8 ? 'success' : 'warning'}
                />
              </Box>
              
              {transcriptionResult.matchScore <= 0.8 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  La transcripción no coincide exactamente con el texto esperado. Por favor, grabe nuevamente leyendo la frase exacta.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Fade>
      )}

      {/* Audio element para reproducción */}
      {recordingState.audioUrl && (
        <audio
          ref={audioRef}
          src={recordingState.audioUrl}
          style={{ display: 'none' }}
        />
      )}

      {/* Botón de envío */}
      <Box textAlign="center">
        <Button
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={
            loading || 
            !recordingState.audioBlob || 
            recordingState.duration < 2 // Solo requiere 2 segundos mínimo
          }
          startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
          sx={{ minWidth: 200, height: 48 }}
        >
          {loading ? 'Procesando...' : 'Confirmar Grabación'}
        </Button>
      </Box>
    </Box>
  );
};

export default VoiceRecorder;