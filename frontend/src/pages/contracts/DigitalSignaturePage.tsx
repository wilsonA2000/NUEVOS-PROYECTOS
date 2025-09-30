import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Alert, Button, Card, CardContent } from '@mui/material';
import { ArrowBack as ArrowBackIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import DigitalSignatureFlow from '../../components/contracts/DigitalSignatureFlow';
import { useContracts } from '../../hooks/useContracts';
import { useAuth } from '../../hooks/useAuth';

const DigitalSignaturePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { contracts } = useContracts();
  const [signatureCompleted, setSignatureCompleted] = useState(false);

  const contract = contracts?.find((c: any) => c.id === id);

  if (!contract) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Contrato no encontrado. Por favor, verifica el ID del contrato.
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/app/contracts')}
          sx={{ mt: 2 }}
        >
          Volver a Contratos
        </Button>
      </Box>
    );
  }

  const handleSignatureComplete = (signatureData: any) => {
    console.log('Firma digital completada:', signatureData);
    setSignatureCompleted(true);
    
    // Actualizar el estado del contrato
    // TODO: Llamar API para actualizar el estado del contrato
    
    setTimeout(() => {
      navigate('/app/contracts');
    }, 3000);
  };

  const handleSignatureError = (error: Error) => {
    console.error('Error en firma digital:', error);
  };

  if (signatureCompleted) {
    return (
      <Box p={3} display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
        <Card sx={{ maxWidth: 600, textAlign: 'center' }}>
          <CardContent>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom color="success.main">
              ¡Contrato Firmado Exitosamente!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              El contrato #{contract.id?.substring(0, 8)} ha sido firmado digitalmente y ahora está activo.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/app/contracts')}
              sx={{ mt: 2 }}
            >
              Ver Mis Contratos
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/app/contracts')}
        sx={{ mb: 3 }}
      >
        Volver a Contratos
      </Button>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Firma Digital del Contrato
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Contrato #{contract.id?.substring(0, 8) || contract.id}
        </Typography>
        {contract.property && (
          <Typography variant="body2" color="text.secondary">
            Propiedad: {contract.property.title || contract.property.address || 'No especificada'}
          </Typography>
        )}
      </Paper>

      <DigitalSignatureFlow
        contractId={id || ''}
        contractTitle={contract.property?.title || 'Contrato de Arrendamiento'}
        signerName={user?.full_name || user?.email || 'Usuario'}
        signerRole={user?.user_type === 'landlord' ? 'Arrendador' : 'Arrendatario'}
        onSignatureComplete={handleSignatureComplete}
        onError={handleSignatureError}
      />
    </Box>
  );
};

export default DigitalSignaturePage;