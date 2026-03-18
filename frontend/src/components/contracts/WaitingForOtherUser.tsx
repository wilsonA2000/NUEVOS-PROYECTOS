import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
  Button,
  Paper,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  SecurityOutlined as SecurityIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';

interface WaitingForOtherUserProps {
  currentTurn: 'tenant' | 'landlord';
  userType: 'tenant' | 'landlord';
  otherUserName?: string;
  contractId: string;
  onBack: () => void;
}

const WaitingForOtherUser: React.FC<WaitingForOtherUserProps> = ({
  currentTurn,
  userType,
  otherUserName,
  contractId,
  onBack,
}) => {
  const theme = useTheme();

  const isMyTurn = currentTurn === userType;
  const waitingFor = currentTurn === 'tenant' ? 'arrendatario' : 'arrendador';
  const waitingForIcon = currentTurn === 'tenant' ? '🏠' : '👔';

  if (isMyTurn) {
    // Caso especial: es su turno pero llegó a esta página por error
    return (
      <Box p={3} display="flex" flexDirection="column" alignItems="center">
        <Alert severity="info" sx={{ mb: 3, width: '100%', maxWidth: 600 }}>
          <AlertTitle>🎯 Es tu turno</AlertTitle>
          <Typography variant="body2">
            Puedes proceder con la autenticación biométrica ahora.
          </Typography>
        </Alert>
        <Button
          variant="contained"
          onClick={onBack}
          startIcon={<ArrowBackIcon />}
        >
          Continuar con autenticación
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 600,
          width: '100%',
          textAlign: 'center',
          borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.light}15, ${theme.palette.secondary.light}15)`,
        }}
      >
        {/* Icono de progreso */}
        <Box sx={{ mb: 3, position: 'relative', display: 'inline-flex' }}>
          <CircularProgress
            size={80}
            thickness={4}
            sx={{
              color: theme.palette.warning.main,
              animation: 'pulse 2s infinite ease-in-out',
            }}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
            }}
          >
            {waitingForIcon}
          </Box>
        </Box>

        {/* Título principal */}
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            fontWeight: 600,
            color: theme.palette.text.primary,
            mb: 2,
          }}
        >
          Esperando autenticación
        </Typography>

        {/* Estado actual */}
        <Chip
          icon={<SecurityIcon />}
          label={`Turno del ${waitingFor}`}
          color="warning"
          variant="outlined"
          sx={{ mb: 3, fontSize: '0.9rem', py: 2, px: 1 }}
        />

        {/* Mensaje explicativo */}
        <Alert
          severity="info"
          sx={{
            mb: 3,
            textAlign: 'left',
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <AlertTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <ScheduleIcon fontSize="small" />
              Flujo secuencial activo
            </Box>
          </AlertTitle>
          <Typography variant="body2" sx={{ mt: 1 }}>
            El proceso de autenticación biométrica sigue un orden específico:
          </Typography>
          <Box component="ol" sx={{ mt: 1, pl: 2, mb: 0 }}>
            <li>
              <Typography variant="body2">
                <strong>Arrendatario</strong> completa su autenticación primero
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Arrendador</strong> completa su autenticación después
              </Typography>
            </li>
          </Box>
          <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
            {currentTurn === 'tenant'
              ? 'El arrendatario debe completar su proceso antes de que puedas continuar.'
              : 'El arrendador debe completar su proceso antes de que puedas continuar.'
            }
          </Typography>
        </Alert>

        {/* Información adicional si hay nombre del otro usuario */}
        {otherUserName && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Esperando a:
            </Typography>
            <Box display="flex" alignItems="center" justifyContent="center" gap={1} sx={{ mt: 1 }}>
              <PersonIcon fontSize="small" color="primary" />
              <Typography variant="body1" fontWeight="500">
                {otherUserName}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Botones de acción */}
        <Box sx={{ mt: 4 }}>
          <Button
            variant="outlined"
            onClick={onBack}
            startIcon={<ArrowBackIcon />}
            sx={{ mr: 2 }}
          >
            Volver
          </Button>
          <Button
            variant="text"
            onClick={() => window.location.reload()}
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            Actualizar estado
          </Button>
        </Box>

        {/* Información técnica */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            mt: 3,
            display: 'block',
            opacity: 0.7,
          }}
        >
          Contrato ID: {contractId}
        </Typography>
      </Paper>

      {/* Animación CSS */}
      <style>{`
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </Box>
  );
};

export default WaitingForOtherUser;