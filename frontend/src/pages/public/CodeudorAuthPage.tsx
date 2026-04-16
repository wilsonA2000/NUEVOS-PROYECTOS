/**
 * Página pública de autenticación biométrica para CODEUDORES
 *
 * Esta página es accesible SIN login - el codeudor recibe un link por email
 * con un token único que le permite completar su autenticación biométrica.
 *
 * Flujo:
 * 1. Codeudor recibe email con link: /codeudor-auth/{token}
 * 2. Al acceder, se valida el token
 * 3. Se muestra información del contrato y del codeudor
 * 4. El codeudor completa el flujo biométrico (4 pasos)
 * 5. Al completar, se muestra modal de confirmación
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
  Chip,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Fade,
} from '@mui/material';
import {
  Security,
  Assignment,
  Person,
  Home,
  CheckCircle,
  CameraAlt,
  DocumentScanner,
  RecordVoiceOver,
  Draw,
  Error as ErrorIcon,
  Timer,
  Shield,
  Verified,
  Celebration,
} from '@mui/icons-material';

// Importar componentes biométricos
import ProfessionalBiometricFlow from '../../components/contracts/ProfessionalBiometricFlow';
import { vh } from '../../theme/tokens';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface CodeudorTokenInfo {
  id: string;
  contract_id: string;
  codeudor_name: string;
  codeudor_email: string;
  codeudor_phone: string;
  codeudor_document_type: string;
  codeudor_document_number: string;
  codeudor_type: 'codeudor_salario' | 'codeudor_finca_raiz';
  status: string;
  expires_at: string;
  contract_info: {
    contract_number: string;
    property_address: string;
    property_city: string;
    landlord_name: string;
    tenant_name: string;
    monthly_rent: number;
    start_date: string;
    end_date: string;
  };
}

interface BiometricSession {
  session_id: string;
  voice_text: string;
  expires_at: string;
}

const CodeudorAuthPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<CodeudorTokenInfo | null>(null);
  const [biometricSession, setBiometricSession] = useState<BiometricSession | null>(null);
  const [showBiometricFlow, setShowBiometricFlow] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  // Pasos del proceso
  const steps = [
    'Verificar Invitación',
    'Revisar Información',
    'Autenticación Biométrica',
    'Completado',
  ];

  // Validar token al cargar
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Token de invitación no proporcionado');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/contracts/public/codeudor/validate/${token}/`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 410) {
            setTokenExpired(true);
            setError(data.error || 'Este enlace ha expirado');
          } else if (response.status === 409) {
            setAlreadyCompleted(true);
            setError(data.error || 'La autenticación ya fue completada');
          } else {
            setError(data.error || 'Token inválido o expirado');
          }
          setLoading(false);
          return;
        }

        setTokenInfo(data);
        setCurrentStep(1); // Paso "Revisar Información"
      } catch (err) {
        setError('Error de conexión. Por favor intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  // Iniciar sesión biométrica
  const handleStartBiometric = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/contracts/public/codeudor/biometric/start/${token}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error iniciando sesión biométrica');
        setLoading(false);
        return;
      }

      setBiometricSession(data);
      setCurrentStep(2); // Paso "Autenticación Biométrica"
      setShowBiometricFlow(true);
    } catch (err) {
      setError('Error de conexión. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Manejar completación del flujo biométrico
  const handleBiometricComplete = async (biometricData: any) => {
    if (!token) return;

    setLoading(true);
    try {
      // Enviar datos biométricos al backend
      const response = await fetch(`${API_BASE_URL}/contracts/public/codeudor/biometric/complete/${token}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: biometricSession?.session_id,
          biometric_data: biometricData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error completando autenticación');
        setLoading(false);
        return;
      }

      // Éxito
      setShowBiometricFlow(false);
      setCurrentStep(3); // Paso "Completado"
      setShowSuccessModal(true);
    } catch (err) {
      setError('Error de conexión. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Formatear moneda colombiana
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Formatear tipo de codeudor
  const formatCodeudorType = (type: string) => {
    const types: Record<string, string> = {
      'codeudor_salario': 'Codeudor con Respaldo Salarial',
      'codeudor_finca_raiz': 'Codeudor con Finca Raíz',
    };
    return types[type] || type;
  };

  // Estado de carga inicial
  if (loading && !tokenInfo) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{ bgcolor: 'grey.50' }}
      >
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6" color="text.secondary">
          Verificando invitación...
        </Typography>
      </Box>
    );
  }

  // Estado de error o token expirado
  if (error || tokenExpired || alreadyCompleted) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{ bgcolor: 'grey.50', p: 3 }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            maxWidth: 500,
            width: '100%',
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <Avatar
            sx={{
              bgcolor: alreadyCompleted ? 'success.main' : 'error.main',
              width: 80,
              height: 80,
              mx: 'auto',
              mb: 3,
            }}
          >
            {alreadyCompleted ? <CheckCircle sx={{ fontSize: 48 }} /> : <ErrorIcon sx={{ fontSize: 48 }} />}
          </Avatar>

          <Typography variant="h5" gutterBottom fontWeight="bold">
            {alreadyCompleted ? 'Autenticación Completada' : tokenExpired ? 'Enlace Expirado' : 'Error de Acceso'}
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {error}
          </Typography>

          {alreadyCompleted && (
            <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                Ya completaste tu autenticación biométrica como codeudor.
                El arrendador será notificado y el proceso continuará.
              </Typography>
            </Alert>
          )}

          {tokenExpired && (
            <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                Los enlaces de invitación son válidos por 7 días.
                Contacta al arrendador para solicitar un nuevo enlace.
              </Typography>
            </Alert>
          )}

          <Button
            variant="contained"
            onClick={() => navigate('/')}
            sx={{ mt: 2 }}
          >
            Ir al Inicio
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!tokenInfo) {
    return null;
  }

  return (
    <>
      {/* Contenido principal */}
      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="lg">
          {/* Header con branding VeriHome */}
          <Paper
            elevation={2}
            sx={{
              p: 3,
              mb: 3,
              background: vh.gradients.primary,
              color: 'white',
              borderRadius: 3,
            }}
          >
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                <Shield sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  VeriHome - Autenticación de Codeudor
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                  Sistema de Verificación Biométrica Segura
                </Typography>
              </Box>
            </Box>

            <Typography variant="body1" sx={{ mb: 2, opacity: 0.95 }}>
              Hola <strong>{tokenInfo.codeudor_name}</strong>, has sido invitado como codeudor
              para el contrato <strong>{tokenInfo.contract_info.contract_number}</strong>.
            </Typography>

            <Chip
              icon={<Verified />}
              label={formatCodeudorType(tokenInfo.codeudor_type)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 'bold',
              }}
            />
          </Paper>

          {/* Stepper de progreso */}
          <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Stepper activeStep={currentStep} alternativeLabel={!isMobile}>
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>

          <Grid container spacing={3}>
            {/* Información del contrato */}
            <Grid item xs={12} md={8}>
              <Card elevation={2} sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Assignment color="primary" />
                    <Typography variant="h6" fontWeight="600">
                      Detalles del Contrato
                    </Typography>
                  </Box>

                  <Typography variant="h6" color="primary" gutterBottom>
                    Contrato #{tokenInfo.contract_info.contract_number}
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Home fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight="500">
                          Propiedad
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {tokenInfo.contract_info.property_address}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {tokenInfo.contract_info.property_city}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Person fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight="500">
                          Partes del Contrato
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Arrendador:</strong> {tokenInfo.contract_info.landlord_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Arrendatario:</strong> {tokenInfo.contract_info.tenant_name}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    Información Financiera
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" fontWeight="500">
                        Renta Mensual
                      </Typography>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(tokenInfo.contract_info.monthly_rent)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" fontWeight="500">
                        Fecha Inicio
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(tokenInfo.contract_info.start_date)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" fontWeight="500">
                        Fecha Fin
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(tokenInfo.contract_info.end_date)}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Información del codeudor */}
              <Card elevation={2} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Person color="primary" />
                    <Typography variant="h6" fontWeight="600">
                      Tu Información como Codeudor
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" fontWeight="500">Nombre Completo</Typography>
                      <Typography variant="body1">{tokenInfo.codeudor_name}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" fontWeight="500">Email</Typography>
                      <Typography variant="body1">{tokenInfo.codeudor_email}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" fontWeight="500">Documento</Typography>
                      <Typography variant="body1">
                        {tokenInfo.codeudor_document_type}: {tokenInfo.codeudor_document_number}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" fontWeight="500">Tipo de Garantía</Typography>
                      <Chip
                        label={formatCodeudorType(tokenInfo.codeudor_type)}
                        color="primary"
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Panel de acciones */}
            <Grid item xs={12} md={4}>
              <Card elevation={2} sx={{ position: 'sticky', top: 20, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Proceso de Autenticación
                  </Typography>

                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <CameraAlt color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Captura Facial"
                        secondary="Verificación biométrica de identidad"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <DocumentScanner color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Documento de Identidad"
                        secondary="Verificación de documento colombiano"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <RecordVoiceOver color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Grabación de Voz"
                        secondary="Verificación vocal y cultural"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Draw color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Firma Digital"
                        secondary="Firma biométrica del contrato"
                      />
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 2 }} />

                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Timer fontSize="small" />
                      <Typography variant="caption">
                        Enlace válido hasta: {formatDate(tokenInfo.expires_at)}
                      </Typography>
                    </Box>
                  </Alert>

                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="caption">
                      <strong>Importante:</strong> Como codeudor, aceptas ser responsable
                      solidario de las obligaciones del arrendatario según las condiciones
                      del contrato.
                    </Typography>
                  </Alert>

                  {currentStep === 1 && (
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      onClick={handleStartBiometric}
                      startIcon={<Security />}
                      disabled={loading}
                      sx={{
                        py: 1.5,
                        background: vh.gradients.primary,
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        'Iniciar Autenticación Biométrica'
                      )}
                    </Button>
                  )}

                  {currentStep === 2 && !showBiometricFlow && (
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      onClick={() => setShowBiometricFlow(true)}
                      startIcon={<Security />}
                    >
                      Continuar Autenticación
                    </Button>
                  )}

                  {currentStep === 3 && (
                    <Alert severity="success" icon={<CheckCircle />}>
                      <Typography variant="body2" fontWeight="500">
                        Autenticación completada exitosamente
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Dialog del flujo biométrico */}
      <Dialog
        open={showBiometricFlow}
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: 'grey.50',
          },
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <ProfessionalBiometricFlow
            contractId={tokenInfo.contract_id}
            onComplete={handleBiometricComplete}
            onCancel={() => setShowBiometricFlow(false)}
            userInfo={{
              fullName: tokenInfo.codeudor_name,
              documentNumber: tokenInfo.codeudor_document_number,
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de éxito */}
      <Dialog
        open={showSuccessModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <Fade in={showSuccessModal} timeout={500}>
            <Box>
              <Avatar
                sx={{
                  bgcolor: 'success.main',
                  width: 100,
                  height: 100,
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <Celebration sx={{ fontSize: 60 }} />
              </Avatar>

              <Typography variant="h4" gutterBottom fontWeight="bold" color="success.main">
                ¡Autenticación Exitosa!
              </Typography>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Has completado exitosamente tu autenticación biométrica como codeudor
                del contrato <strong>{tokenInfo.contract_info.contract_number}</strong>.
              </Typography>

              <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body2">
                  <strong>¿Qué sigue?</strong>
                  <br />
                  El arrendador será notificado automáticamente y el proceso de firma
                  del contrato continuará. Recibirás una copia del contrato firmado
                  una vez que todas las partes completen su autenticación.
                </Typography>
              </Alert>

              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2, mb: 3 }}>
                <Grid container spacing={2} textAlign="left">
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Tu Rol</Typography>
                    <Typography variant="body2" fontWeight="500">
                      {formatCodeudorType(tokenInfo.codeudor_type)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Estado</Typography>
                    <Chip
                      icon={<Verified />}
                      label="Verificado"
                      color="success"
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Fade>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => {
              setShowSuccessModal(false);
              navigate('/');
            }}
            sx={{ px: 4 }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CodeudorAuthPage;
