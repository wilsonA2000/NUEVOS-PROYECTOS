import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useMessages } from '../../hooks/useMessages';
import { CreateMessageDto } from '../../types/message';

export const MessageForm: React.FC = () => {
  const navigate = useNavigate();
  const { createMessage } = useMessages();
  const [formData, setFormData] = React.useState<CreateMessageDto>({
    recipientId: '',
    subject: '',
    content: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMessage.mutateAsync(formData);
      navigate('/app/messages');
    } catch (error) {
      console.error('Error al crear el mensaje:', error);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Nuevo Mensaje
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="recipientId"
            label="ID del Destinatario"
            name="recipientId"
            value={formData.recipientId}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="subject"
            label="Asunto"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="content"
            label="Contenido"
            name="content"
            multiline
            rows={4}
            value={formData.content}
            onChange={handleChange}
          />
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={() => navigate('/app/messages')}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMessage.isPending}
            >
              {createMessage.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}; 