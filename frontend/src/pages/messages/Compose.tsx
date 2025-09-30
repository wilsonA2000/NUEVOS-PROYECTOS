import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  OutlinedInput,
  Grid,
  Card,
  CardContent,
  CardActions,
  Alert,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
} from '@mui/icons-material';
import { api } from '../../services/api';

interface User {
  id: number;
  full_name: string;
  email: string;
}

interface Property {
  id: number;
  title: string;
  address: string;
}

interface Contract {
  id: number;
  property: Property;
  tenant: User;
  owner: User;
}

const Compose: React.FC = () => {
  const navigate = useNavigate();
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [conversationType, setConversationType] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedContract, setSelectedContract] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await api.get('/properties/');
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await api.get('/contracts/');
      setContracts(response.data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const createThreadMutation = useMutation({
    mutationFn: async (data: {
      recipients: string[];
      subject: string;
      content: string;
      conversation_type: string;
      property?: string;
      contract?: string;
    }) => {
      const response = await api.post('/messages/threads/', {
        subject,
        recipients,
        content,
        related_property: selectedProperty,
        related_contract: selectedContract,
        priority: 'medium',
        attachments: [], // TODO: Implement file upload
      });
      if (!response.ok) {
        throw new Error('Error creating thread');
      }
      return response.json();
    },
    onSuccess: () => {
      navigate('/messages');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await createThreadMutation.mutate({
        recipients,
        subject,
        content,
        conversation_type: conversationType,
        property: selectedProperty,
        contract: selectedContract,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Error al enviar el mensaje');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConversationTypeChange = (event: SelectChangeEvent) => {
    setConversationType(event.target.value);
    setSelectedProperty('');
    setSelectedContract('');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate('/messages')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">Nuevo Mensaje</Typography>
      </Box>

      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Tipo de Conversación</InputLabel>
          <Select
            value={conversationType}
            label="Tipo de Conversación"
            onChange={handleConversationTypeChange}
          >
            <MenuItem value="general">General</MenuItem>
            <MenuItem value="property">Propiedad</MenuItem>
            <MenuItem value="contract">Contrato</MenuItem>
          </Select>
        </FormControl>

        {conversationType === 'property' && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Propiedad</InputLabel>
            <Select
              value={selectedProperty}
              label="Propiedad"
              onChange={(e) => setSelectedProperty(e.target.value)}
            >
              {properties?.map((property) => (
                <MenuItem key={property.id} value={property.id.toString()}>
                  {property.title} - {property.address}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {conversationType === 'contract' && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Contrato</InputLabel>
            <Select
              value={selectedContract}
              label="Contrato"
              onChange={(e) => setSelectedContract(e.target.value)}
            >
              {contracts?.map((contract) => (
                <MenuItem key={contract.id} value={contract.id.toString()}>
                  {contract.property.title} - {contract.tenant.full_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Destinatarios</InputLabel>
          <Select
            multiple
            value={recipients}
            label="Destinatarios"
            onChange={(e) => setRecipients(e.target.value as string[])}
          >
            {users?.map((user) => (
              <MenuItem key={user.id} value={user.id.toString()}>
                {user.full_name} ({user.email})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Asunto"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Mensaje"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/messages')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createThreadMutation.isLoading}
          >
            Enviar
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Compose; 