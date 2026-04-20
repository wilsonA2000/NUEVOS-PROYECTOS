import React, { useState } from 'react';
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
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/');
      setUsers(response.data);
    } catch (error) {}
  };

  const fetchProperties = async () => {
    try {
      const response = await api.get('/properties/');
      setProperties(response.data);
    } catch (error) {}
  };

  const fetchContracts = async () => {
    try {
      const response = await api.get('/contracts/');
      setContracts(response.data);
    } catch (error) {}
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
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
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('content', content);
      formData.append('priority', 'medium');
      recipients.forEach(r => formData.append('recipients', r));
      if (selectedProperty)
        formData.append('related_property', selectedProperty);
      if (selectedContract)
        formData.append('related_contract', selectedContract);
      attachedFiles.forEach(file => formData.append('attachments', file));

      const response = await api.post('/messages/threads/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
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
        <Typography variant='h5'>Nuevo Mensaje</Typography>
      </Box>

      <Paper component='form' onSubmit={handleSubmit} sx={{ p: 2 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Tipo de Conversación</InputLabel>
          <Select
            value={conversationType}
            label='Tipo de Conversación'
            onChange={handleConversationTypeChange}
          >
            <MenuItem value='general'>General</MenuItem>
            <MenuItem value='property'>Propiedad</MenuItem>
            <MenuItem value='contract'>Contrato</MenuItem>
          </Select>
        </FormControl>

        {conversationType === 'property' && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Propiedad</InputLabel>
            <Select
              value={selectedProperty}
              label='Propiedad'
              onChange={e => setSelectedProperty(e.target.value)}
            >
              {properties?.map(property => (
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
              label='Contrato'
              onChange={e => setSelectedContract(e.target.value)}
            >
              {contracts?.map(contract => (
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
            label='Destinatarios'
            onChange={e => setRecipients(e.target.value as string[])}
          >
            {users?.map(user => (
              <MenuItem key={user.id} value={user.id.toString()}>
                {user.full_name} ({user.email})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label='Asunto'
          value={subject}
          onChange={e => setSubject(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          multiline
          rows={4}
          label='Mensaje'
          value={content}
          onChange={e => setContent(e.target.value)}
          sx={{ mb: 2 }}
        />

        {/* File attachments */}
        <Box sx={{ mb: 2 }}>
          <input
            type='file'
            multiple
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <Button
            variant='outlined'
            startIcon={<AttachFileIcon />}
            onClick={() => fileInputRef.current?.click()}
            size='small'
            sx={{ mb: 1 }}
          >
            Adjuntar Archivos
          </Button>
          {attachedFiles.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {attachedFiles.map((file, index) => (
                <Chip
                  key={index}
                  label={`${file.name} (${(file.size / 1024).toFixed(0)} KB)`}
                  onDelete={() => handleRemoveFile(index)}
                  size='small'
                />
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant='outlined' onClick={() => navigate('/messages')}>
            Cancelar
          </Button>
          <Button
            type='submit'
            variant='contained'
            disabled={createThreadMutation.isPending}
          >
            Enviar
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Compose;
