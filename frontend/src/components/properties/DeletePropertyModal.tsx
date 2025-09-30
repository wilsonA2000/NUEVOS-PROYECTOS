import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { Property } from '../../types/property';

interface DeletePropertyModalProps {
  open: boolean;
  property: Property | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

const DeletePropertyModal: React.FC<DeletePropertyModalProps> = ({
  open,
  property,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  if (!property) return null;

  return (
    <Dialog
      open={open}
      onClose={!isDeleting ? onClose : undefined}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'linear-gradient(to bottom, #fff, #fafafa)',
        },
      }}
    >
      {/* Header con icono de cierre */}
      <Box sx={{ position: 'relative' }}>
        <IconButton
          onClick={onClose}
          disabled={isDeleting}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'grey.500',
            '&:hover': {
              color: 'grey.700',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Título con icono de advertencia */}
      <DialogTitle sx={{ pb: 1, pt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: 'error.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s infinite',
            }}
          >
            <WarningIcon sx={{ color: 'error.main', fontSize: 28 }} />
          </Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            Eliminar Propiedad
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Información de la propiedad */}
        <Box
          sx={{
            backgroundColor: 'grey.50',
            borderRadius: 2,
            p: 2,
            mb: 3,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <HomeIcon sx={{ color: 'primary.main', mt: 0.5 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {property.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {property.address}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {property.city}, {property.state}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  <strong>Tipo:</strong> {property.property_type}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  <strong>Estado:</strong> {property.status}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Mensaje de advertencia */}
        <Alert 
          severity="warning" 
          icon={false}
          sx={{ 
            mb: 2,
            backgroundColor: 'warning.light',
            '& .MuiAlert-message': {
              width: '100%',
            }
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            ⚠️ Esta acción no se puede deshacer
          </Typography>
          <Typography variant="body2">
            Al eliminar esta propiedad se perderán:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
            <li>Todas las imágenes y videos asociados</li>
            <li>El historial de visitas y favoritos</li>
            <li>Las consultas y mensajes relacionados</li>
            <li>Los contratos vinculados (si existen)</li>
          </Box>
        </Alert>

        {/* Confirmación */}
        <Typography variant="body1" sx={{ textAlign: 'center', fontWeight: 500 }}>
          ¿Está seguro de que desea eliminar permanentemente esta propiedad?
        </Typography>
      </DialogContent>

      <Divider />

      {/* Acciones */}
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          disabled={isDeleting}
          variant="outlined"
          sx={{ minWidth: 100 }}
        >
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isDeleting}
          variant="contained"
          color="error"
          startIcon={isDeleting ? null : <DeleteIcon />}
          sx={{ minWidth: 120 }}
        >
          {isDeleting ? 'Eliminando...' : 'Eliminar'}
        </Button>
      </DialogActions>

      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </Dialog>
  );
};

export default DeletePropertyModal;