import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Stack,
  Avatar,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { messageService } from '../../services/messageService';
import { useAuth } from '../../hooks/useAuth';

/**
 * Detalle de un hilo de mensajes (lectura).
 *
 * Antes era un stub vacío, así que abrir cualquier conversación desde la
 * bandeja mostraba una pantalla en blanco. Ahora carga el hilo y sus mensajes
 * con los campos reales del backend (subject, participants.first_name/last_name,
 * content, sent_at). El envío de respuestas se mantiene en la pantalla de
 * "Nuevo mensaje" / respuesta existente.
 */
const participantName = (p: any): string =>
  [p?.first_name, p?.last_name].filter(Boolean).join(' ') ||
  p?.email ||
  'Usuario';

export const MessageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    data: thread,
    isLoading: threadLoading,
    error: threadError,
  } = useQuery({
    queryKey: ['message-thread', id],
    queryFn: () => messageService.getThread(id as string),
    enabled: !!id,
  });

  const { data: messagesPage, isLoading: messagesLoading } = useQuery({
    queryKey: ['message-thread-messages', id],
    queryFn: () => messageService.getMessages(id as string, 1, 100),
    enabled: !!id,
  });

  if (threadLoading || messagesLoading) {
    return (
      <Box display='flex' justifyContent='center' py={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (threadError || !thread) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error' sx={{ mb: 2 }}>
          No se pudo cargar la conversación.
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/app/messages')}>
          Volver a mensajes
        </Button>
      </Box>
    );
  }

  const t = thread as any;
  const messages: any[] = (messagesPage as any)?.results || [];
  const participants: any[] = Array.isArray(t.participants)
    ? t.participants
    : [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/app/messages')}
        sx={{ mb: 2 }}
      >
        Volver
      </Button>

      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant='h5' gutterBottom>
          {t.subject || '(Sin asunto)'}
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Participantes: {participants.map(participantName).join(', ') || '—'}
        </Typography>
      </Paper>

      <Stack spacing={1.5}>
        {messages.length === 0 ? (
          <Typography color='text.secondary' textAlign='center' py={4}>
            No hay mensajes en esta conversación.
          </Typography>
        ) : (
          messages.map((m: any) => {
            const mine =
              user && String(m?.sender?.id) === String((user as any).id);
            return (
              <Box
                key={m.id}
                display='flex'
                justifyContent={mine ? 'flex-end' : 'flex-start'}
              >
                <Paper
                  sx={{
                    p: 1.5,
                    maxWidth: '75%',
                    bgcolor: mine ? 'primary.light' : 'background.paper',
                  }}
                >
                  <Box display='flex' alignItems='center' gap={1} mb={0.5}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                      {participantName(m?.sender)?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                    <Typography variant='caption' fontWeight={600}>
                      {participantName(m?.sender)}
                    </Typography>
                  </Box>
                  <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
                    {m?.content}
                  </Typography>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant='caption' color='text.secondary'>
                    {m?.sent_at ? new Date(m.sent_at).toLocaleString() : ''}
                  </Typography>
                </Paper>
              </Box>
            );
          })
        )}
      </Stack>
    </Box>
  );
};

export default MessageDetail;
