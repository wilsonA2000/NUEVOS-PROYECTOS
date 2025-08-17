/**
 * Página de aterrizaje para arrendatarios que reciben invitación por email
 * 
 * Esta página permite a los arrendatarios:
 * - Ver detalles del contrato
 * - Aceptar la invitación
 * - Iniciar el flujo biométrico
 * - Completar la autenticación y firma digital
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  DialogContent,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery
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
  Draw
} from '@mui/icons-material';

// Importar el flujo biométrico
import ProfessionalBiometricFlow from '../../components/contracts/ProfessionalBiometricFlow';

interface ContractInfo {
  id: string;
  contractNumber: string;
  title: string;
  property: {
    address: string;
    city: string;
    type: string;
  };
  landlord: {
    name: string;
    email: string;
    phone?: string;
  };
  financialDetails: {
    monthlyRent: number;
    securityDeposit: number;
    startDate: string;
    endDate: string;
  };
  status: string;
  biometricStatus: string;
}

interface InvitationInfo {
  id: string;
  token: string;
  tenantName: string;
  tenantEmail: string;
  expiresAt: string;
  personalMessage?: string;
  status: string;
}

const TenantInvitationLanding: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [showBiometricFlow, setShowBiometricFlow] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Pasos del proceso
  const steps = [
    'Revisar Invitación',
    'Aceptar Contrato', 
    'Autenticación Biométrica',
    'Firma Digital',
    'Contrato Activado'
  ];

  // Cargar información de la invitación
  useEffect(() => {
    const loadInvitationData = async () => {
      if (!token) {
        setError('Token de invitación no proporcionado');
        setLoading(false);
        return;
      }

      try {
        // TODO: Implementar llamada real a la API
        // const response = await fetch(`/api/v1/contracts/invitations/${token}/`);
        
        // Datos simulados por ahora
        const mockInvitation: InvitationInfo = {
          id: 'inv-123',
          token: token,
          tenantName: 'Juan Pérez',
          tenantEmail: 'juan.perez@email.com',
          expiresAt: '2025-02-01T23:59:59Z',
          personalMessage: 'El arrendador ha completado exitosamente su verificación biométrica.',
          status: 'sent'
        };

        const mockContract: ContractInfo = {
          id: 'contract-456',
          contractNumber: 'VH-2025-000123',
          title: 'Contrato de Arrendamiento - Apartamento Centro',
          property: {
            address: 'Calle 85 #12-34, Apto 501',
            city: 'Bogotá, Colombia',
            type: 'Apartamento'
          },
          landlord: {
            name: 'María García',
            email: 'maria.garcia@email.com',
            phone: '+57 300 123 4567'
          },
          financialDetails: {
            monthlyRent: 2500000,
            securityDeposit: 2500000,
            startDate: '2025-02-01',
            endDate: '2026-02-01'
          },
          status: 'pending_tenant_authentication',
          biometricStatus: 'pending'
        };

        setInvitation(mockInvitation);
        setContract(mockContract);
        setCurrentStep(1); // Paso "Aceptar Contrato"
        
      } catch (err) {
        setError('Error cargando información de la invitación');
        console.error('Error loading invitation:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInvitationData();
  }, [token]);

  // Manejar aceptación de invitación
  const handleAcceptInvitation = async () => {
    try {
      setLoading(true);
      
      // TODO: Implementar llamada real a la API
      // await fetch(`/api/v1/contracts/invitations/${token}/accept/`, { method: 'POST' });
      
      setCurrentStep(2); // Avanzar a "Autenticación Biométrica"
      setShowBiometricFlow(true);
      
    } catch (err) {
      setError('Error aceptando la invitación');
      console.error('Error accepting invitation:', err);
    } finally {
      setLoading(false);
    }
  };

  // Manejar completación del flujo biométrico
  const handleBiometricComplete = (data: any) => {
    console.log('🎉 Flujo biométrico completado:', data);
    setShowBiometricFlow(false);
    setCurrentStep(4); // "Contrato Activado"
    
    // TODO: Enviar datos a la API y activar contrato
  };

  // Formatear moneda colombiana
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <LinearProgress sx={{ width: 300 }} />
      </Box>
    );
  }

  if (error || !invitation || !contract) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'No se pudo cargar la información de la invitación'}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/')}>
          Volver al Inicio
        </Button>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header con información de la invitación */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
              <Security />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Invitación de Contrato VeriHome
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                Autenticación Biométrica Requerida
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="body1" sx={{ mb: 2, opacity: 0.95 }}>
            ¡Hola {invitation.tenantName}! Has sido invitado a completar la autenticación biométrica 
            para el contrato <strong>{contract.contractNumber}</strong>.
          </Typography>

          {invitation.personalMessage && (
            <Alert severity="info" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
              {invitation.personalMessage}
            </Alert>
          )}
        </Paper>

        {/* Stepper de progreso */}
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
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
            <Card elevation={2} sx={{ mb: 3 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Assignment color="primary" />
                  <Typography variant="h6" fontWeight="600">
                    Detalles del Contrato
                  </Typography>
                </Box>
                
                <Typography variant="h6" color="primary" gutterBottom>
                  {contract.title}
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
                      {contract.property.address}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {contract.property.city}
                    </Typography>
                    <Chip label={contract.property.type} size="small" sx={{ mt: 1 }} />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Person fontSize="small" color="action" />
                      <Typography variant="body2" fontWeight="500">
                        Arrendador
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {contract.landlord.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {contract.landlord.email}
                    </Typography>
                    {contract.landlord.phone && (
                      <Typography variant="body2" color="text.secondary">
                        {contract.landlord.phone}
                      </Typography>
                    )}
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>
                  Información Financiera
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="500">
                      Renta Mensual
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(contract.financialDetails.monthlyRent)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="500">
                      Depósito
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(contract.financialDetails.securityDeposit)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="500">
                      Fecha Inicio
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(contract.financialDetails.startDate)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="500">
                      Fecha Fin
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(contract.financialDetails.endDate)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Panel de acciones */}
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ position: 'sticky', top: 20 }}>
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
                      secondary="Verificación de cédula colombiana"
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
                  <Typography variant="caption">
                    La invitación expira el {formatDate(invitation.expiresAt)}
                  </Typography>
                </Alert>

                {currentStep === 1 && (
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleAcceptInvitation}
                    startIcon={<CheckCircle />}
                    disabled={loading}
                  >
                    Aceptar y Continuar
                  </Button>
                )}

                {currentStep === 2 && (
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={() => setShowBiometricFlow(true)}
                    startIcon={<Security />}
                  >
                    Iniciar Autenticación
                  </Button>
                )}

                {currentStep === 4 && (
                  <Alert severity="success">
                    <Typography variant="body2" fontWeight="500">
                      ¡Contrato completado exitosamente!
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Modal del flujo biométrico */}
      <Dialog
        open={showBiometricFlow}
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: 'grey.50'
          }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <ProfessionalBiometricFlow
            contractId={contract.id}
            onComplete={handleBiometricComplete}
            onCancel={() => setShowBiometricFlow(false)}
            userInfo={{
              fullName: invitation.tenantName,
              documentNumber: undefined, // Se capturará en el flujo
              documentIssueDate: undefined // Se capturará en el flujo
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TenantInvitationLanding;