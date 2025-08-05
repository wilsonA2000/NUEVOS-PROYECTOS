import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useMutation } from '@tanstack/react-query';
import { propertyService } from '../../services/propertyService';

interface ContactLandlordProps {
  property: {
    id: string;
    title: string;
    landlord: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone_number?: string;
    };
  };
  open: boolean;
  onClose: () => void;
}

const ContactLandlord: React.FC<ContactLandlordProps> = ({
  property,
  open,
  onClose,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    contact_preference: 'email',
  });

  const contactMutation = useMutation({
    mutationFn: (data: any) => propertyService.contactLandlord(property.id, data),
    onSuccess: () => {

setFormData({ subject: '', message: '', contact_preference: 'email' });
      onClose();
    },
    onError: (error) => {
      console.error('❌ ContactLandlord: Error enviando mensaje:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

contactMutation.mutate(formData);
  };

  const handleClose = () => {
    if (!contactMutation.isPending) {
      setFormData({ subject: '', message: '', contact_preference: 'email' });
      onClose();
    }
  };

  // Verificar si el usuario puede contactar al arrendador
  const canContact = user && (
    user.user_type === 'tenant' || 
    user.user_type === 'service_provider'
  );

  if (!canContact) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Acceso Denegado</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Solo los arrendatarios y prestadores de servicios pueden contactar a los arrendadores.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <MessageIcon color="primary" />
          <Typography variant="h6">
            Contactar al Arrendador
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Información de la propiedad */}
        <Box mb={3}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Propiedad: {property.title}
          </Typography>
        </Box>

        {/* Información del arrendador */}
        <Box mb={3} p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Información del Arrendador:
          </Typography>
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <Avatar>
              {property.landlord.first_name?.[0]}{property.landlord.last_name?.[0]}
            </Avatar>
            <Box>
              <Typography variant="body1">
                {property.landlord.first_name} {property.landlord.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Arrendador
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" flexDirection="column" gap={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <EmailIcon fontSize="small" color="action" />
              <Typography variant="body2">
                {property.landlord.email}
              </Typography>
            </Box>
            {property.landlord.phone_number && (
              <Box display="flex" alignItems="center" gap={1}>
                <PhoneIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  {property.landlord.phone_number}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Formulario de contacto */}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Asunto"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
            margin="normal"
            placeholder="Ej: Interés en rentar la propiedad"
          />

          <TextField
            fullWidth
            label="Mensaje"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            required
            multiline
            rows={4}
            margin="normal"
            placeholder={`Hola ${property.landlord.first_name}, me interesa tu propiedad "${property.title}". Por favor, ¿podrías proporcionarme más información sobre...`}
          />

          <Box mt={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Preferencia de contacto:
            </Typography>
            <Box display="flex" gap={1}>
              <Chip
                label="Email"
                color={formData.contact_preference === 'email' ? 'primary' : 'default'}
                onClick={() => setFormData({ ...formData, contact_preference: 'email' })}
                clickable
              />
              <Chip
                label="Teléfono"
                color={formData.contact_preference === 'phone' ? 'primary' : 'default'}
                onClick={() => setFormData({ ...formData, contact_preference: 'phone' })}
                clickable
              />
            </Box>
          </Box>

          {/* Mostrar errores */}
          {contactMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Error al enviar el mensaje: {contactMutation.error.message}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={handleClose}
          disabled={contactMutation.isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="contained"
          onClick={handleSubmit}
          disabled={contactMutation.isPending || !formData.subject || !formData.message}
          startIcon={
            contactMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              <MessageIcon />
            )
          }
        >
          {contactMutation.isPending ? 'Enviando...' : 'Enviar Mensaje'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContactLandlord; 