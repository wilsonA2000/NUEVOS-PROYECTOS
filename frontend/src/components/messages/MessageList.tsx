import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Avatar,
  Button,
  TextField,
  InputAdornment,
  Skeleton,
  Stack,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  ForumOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMessages } from '../../hooks/useMessages';
import { useAuth } from '../../hooks/useAuth';
import EmptyState from '../common/EmptyState';

/**
 * Bandeja de entrada: lista HILOS (MessageThread), no mensajes sueltos.
 *
 * Antes iteraba `messages` (modelo Message, que NO tiene `subject` ni
 * `createdAt`) → mostraba "Sin asunto / De: Usuario / Fecha desconocida"
 * (D18). Ahora usa los hilos, que sí traen subject, participantes,
 * last_message y last_message_at.
 */
export const MessageList: React.FC = () => {
  const navigate = useNavigate();
  const { threads, unreadCount, isLoading, error } = useMessages();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = React.useState('');

  const threadsArray: any[] = Array.isArray(threads)
    ? threads
    : (threads as any)?.results || [];

  const participantName = (p: any): string =>
    [p?.first_name, p?.last_name].filter(Boolean).join(' ') ||
    p?.email ||
    'Usuario';

  // Nombre(s) del/los participante(s) distinto(s) al usuario actual.
  const otherParticipants = (thread: any): string => {
    const parts: any[] = Array.isArray(thread?.participants)
      ? thread.participants
      : [];
    const others = parts.filter(
      (p: any) => !user || String(p?.id) !== String((user as any).id),
    );
    const list = (others.length ? others : parts).map(participantName);
    return list.length ? list.join(', ') : 'Sin participantes';
  };

  const threadDate = (thread: any): string => {
    const raw =
      thread?.last_message_at ||
      thread?.last_message?.sent_at ||
      thread?.created_at;
    return raw ? new Date(raw).toLocaleString() : 'Sin fecha';
  };

  const filteredThreads = threadsArray.filter((thread: any) => {
    const haystack = [
      thread?.subject,
      thread?.last_message?.content,
      otherParticipants(thread),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  if (isLoading) {
    // Skeletons en vez de spinner: mejor velocidad percibida y menos salto
    // de layout al cargar las conversaciones.
    return (
      <Box>
        <Skeleton
          variant='text'
          width={180}
          height={44}
          sx={{ mb: 3 }}
        />
        <Skeleton
          variant='rounded'
          height={48}
          sx={{ mb: 3, borderRadius: 2 }}
        />
        <Stack spacing={2}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                gap: 2,
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Skeleton variant='circular' width={40} height={40} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant='text' width='40%' height={24} />
                <Skeleton variant='text' width='25%' />
                <Skeleton variant='text' width='90%' />
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity='error' sx={{ mt: 2 }}>
        Error al cargar los mensajes: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Box
        display='flex'
        justifyContent='space-between'
        alignItems='center'
        mb={3}
      >
        <Typography variant='h4' component='h1'>
          Mensajes {unreadCount ? `(${unreadCount} nuevos)` : ''}
        </Typography>
        <Button
          variant='contained'
          startIcon={<AddIcon />}
          onClick={() => navigate('/app/messages/new')}
        >
          Nuevo Mensaje
        </Button>
      </Box>

      <Box mb={3}>
        <TextField
          fullWidth
          placeholder='Buscar conversaciones...'
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {filteredThreads.length === 0 ? (
        <EmptyState
          icon={<ForumOutlined />}
          title={
            searchTerm
              ? 'No se encontraron conversaciones'
              : 'Aún no tienes conversaciones'
          }
          message={
            searchTerm
              ? 'Prueba con otros términos de búsqueda.'
              : 'Cuando inicies o recibas un mensaje, aparecerá aquí.'
          }
          action={
            !searchTerm ? (
              <Button
                variant='contained'
                startIcon={<AddIcon />}
                onClick={() => navigate('/app/messages/new')}
              >
                Nuevo Mensaje
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Grid container spacing={2}>
          {filteredThreads.map((thread: any) => {
            const isUnread = thread?.last_message
              ? !thread.last_message.is_read
              : false;
            return (
              <Grid item xs={12} key={thread.id}>
                <Card
                  sx={{
                    bgcolor: isUnread ? 'action.hover' : 'background.paper',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => navigate(`/app/messages/${thread.id}`)}
                >
                  <CardContent>
                    <Box
                      display='flex'
                      justifyContent='space-between'
                      alignItems='flex-start'
                    >
                      <Box display='flex' alignItems='center' gap={2} flex={1}>
                        <Avatar>
                          {otherParticipants(thread)?.[0]?.toUpperCase() || 'U'}
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant='h6' component='div'>
                            {thread.subject || '(Sin asunto)'}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {otherParticipants(thread)}
                          </Typography>
                        </Box>
                      </Box>
                      {isUnread && (
                        <Chip label='Nuevo' color='primary' size='small' />
                      )}
                    </Box>
                    {thread.last_message?.content && (
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        sx={{
                          mt: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {thread.last_message.content}
                      </Typography>
                    )}
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{ mt: 1, display: 'block' }}
                    >
                      {threadDate(thread)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};
