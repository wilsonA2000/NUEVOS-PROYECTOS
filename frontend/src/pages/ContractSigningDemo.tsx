import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip
} from '@mui/material';
import {
  Assignment as ContractIcon,
  Security as SecurityIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import DigitalSignatureFlow from '../components/contracts/DigitalSignatureFlow';

const ContractSigningDemo: React.FC = () => {
  const [showSignatureFlow, setShowSignatureFlow] = useState(false);
  const [signatureComplete, setSignatureComplete] = useState(false);
  const [signatureData, setSignatureData] = useState<any>(null);

  // Datos simulados del contrato para la demostración
  const mockContract = {
    id: 'demo-contract-001',
    title: 'Contrato de Arrendamiento - Apartamento 101',
    signerName: 'Usuario VeriHome',
    signerRole: 'tenant' as const
  };

  const handleSigningComplete = (data: any) => {

setSignatureData(data);
    setSignatureComplete(true);
    setShowSignatureFlow(false);
  };

  const handleStartSigning = () => {
    setSignatureComplete(false);
    setSignatureData(null);
    setShowSignatureFlow(true);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <ContractIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Sistema de Firma Digital VeriHome
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Demostración del sistema de firma digital avanzada conectado al backend
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body2">
            <strong>Funcionalidades Implementadas:</strong>
          </Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Firma digital conectada al backend Django real</li>
            <li>Hash criptográfico generado en servidor (seguro)</li>
            <li>Captura de geolocalización GPS real</li>
            <li>Verificación biométrica simulada (placeholder para APIs reales)</li>
            <li>Almacenamiento seguro de metadatos de firma</li>
            <li>Estados de contrato actualizados automáticamente</li>
            <li>Notificaciones automáticas a las partes</li>
            <li>Logging y auditoría completa</li>
          </ul>
        </Alert>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <ContractIcon sx={{ mr: 1 }} />
                  Contrato de Demostración
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>ID:</strong> {mockContract.id}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Título:</strong> {mockContract.title}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Firmante:</strong> {mockContract.signerName}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Rol:</strong> {mockContract.signerRole === 'tenant' ? 'Arrendatario' : 'Arrendador'}
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={signatureComplete ? 'Firmado' : 'Pendiente de Firma'}
                    color={signatureComplete ? 'success' : 'warning'}
                    icon={signatureComplete ? <CheckIcon /> : <SecurityIcon />}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <SecurityIcon sx={{ mr: 1 }} />
                  Características de Seguridad
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Chip
                    label="Hash SHA-256 (Servidor)"
                    color="primary"
                    size="small"
                  />
                  <Chip
                    label="Geolocalización GPS"
                    color="primary"
                    size="small"
                  />
                  <Chip
                    label="Timestamp del Servidor"
                    color="primary"
                    size="small"
                  />
                  <Chip
                    label="Verificación Biométrica"
                    color="secondary"
                    size="small"
                  />
                  <Chip
                    label="Auditoría Completa"
                    color="primary"
                    size="small"
                  />
                  <Chip
                    label="Base64 Signature Storage"
                    color="primary"
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {signatureComplete && signatureData && (
          <Alert severity="success" sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              ¡Contrato Firmado Exitosamente!
            </Typography>
            <Typography variant="body2">
              <strong>Nivel de verificación:</strong> {signatureData.verificationLevel}
            </Typography>
            <Typography variant="body2">
              <strong>Timestamp:</strong> {signatureData.timestamp.toLocaleString()}
            </Typography>
            <Typography variant="body2">
              <strong>ID de firma:</strong> {signatureData.signatureData?.id || 'generado-en-backend'}
            </Typography>
          </Alert>
        )}

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SecurityIcon />}
            onClick={handleStartSigning}
            disabled={showSignatureFlow}
          >
            {signatureComplete ? 'Firmar Nuevamente' : 'Iniciar Proceso de Firma Digital'}
          </Button>
        </Box>

        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Nota de Desarrollo:</strong> Este sistema está completamente conectado 
            al backend Django real. La verificación biométrica utiliza simulación segura 
            como placeholder para integración futura con APIs reales de reconocimiento facial y OCR.
          </Typography>
        </Alert>
      </Paper>

      {/* Digital Signature Flow Dialog */}
      <DigitalSignatureFlow
        isOpen={showSignatureFlow}
        contractId={mockContract.id}
        contractTitle={mockContract.title}
        signerName={mockContract.signerName}
        signerRole={mockContract.signerRole}
        onSigningComplete={handleSigningComplete}
        onCancel={() => setShowSignatureFlow(false)}
      />
    </Container>
  );
};

export default ContractSigningDemo;