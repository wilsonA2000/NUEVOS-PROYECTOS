/**
 * Lista de mensajes con integración de WebSocket para tiempo real
 * Reemplaza MessageList.tsx con funcionalidades de mensajería en tiempo real
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Avatar,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Badge,
  Tooltip,
  Divider,
  Paper,
} from '@mui/material';
import { 
  MoreVert as MoreVertIcon, 
  Add as AddIcon,
  Search as SearchIcon,
  Reply as ReplyIcon,
  Circle as CircleIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMessages } from '../../hooks/useMessages';
import { useOptimizedWebSocketContext } from '../../contexts/OptimizedWebSocketContext';
import { ensureArray } from '../../utils/arrayUtils';
import { Message } from '../../types/message';

interface RealTimeMessageListProps {
  threadId?: string;
  showOnlyUnread?: boolean;
}

export const RealTimeMessageList: React.FC<RealTimeMessageListProps> = ({ 
  threadId, 
  showOnlyUnread = false, 
}) => {
  const navigate = useNavigate();
  const { messages, threads, isLoading, error, deleteMessage, markAsRead } = useMessages();
  const {
    isConnected,
    connectionStatus,
    unreadMessagesCount,
    onlineUsers,
    send,
    subscribe,
  } = useOptimizedWebSocketContext();
  
  // Estado local para usuarios escribiendo
  const [typingUsers, setTypingUsers] = useState<any[]>([]);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [realTimeMessages, setRealTimeMessages] = useState<Message[]>([]);

  // Manejar mensajes en tiempo real
  useEffect(() => {
    if (messages) {
      const messagesArray = Array.isArray(messages) ? messages : (messages as any)?.results || [];
      setRealTimeMessages(messagesArray);
    }
  }, [messages]);

  // Manejar conversación específica con WebSocket
  useEffect(() => {
    if (!threadId || !isConnected) return undefined;

    // Unirse a la conversación
    try {
      send(`messaging/thread/${threadId}`, {
        type: 'join_conversation',
        thread_id: threadId,
      });
      console.log(`Joined thread ${threadId}`);
    } catch (error) {
      console.error('Error joining thread:', error);
    }

    return () => {
      try {
        send(`messaging/thread/${threadId}`, {
          type: 'leave_conversation',
          thread_id: threadId,
        });
      } catch (error) {
        console.error('Error leaving thread:', error);
      }
    };
  }, [threadId, isConnected, send]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, message: Message) => {
    setAnchorEl(event.currentTarget);
    setSelectedMessage(message);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMessage(null);
  };

  const handleView = useCallback(() => {
    if (selectedMessage) {
      navigate(`/app/messages/${selectedMessage.id}`);

      // Marcar como leído usando WebSocket si está disponible
      if (isConnected && !selectedMessage.isRead) {
        send('messaging', {
          type: 'mark_as_read',
          message: selectedMessage.id,
          thread_id: (selectedMessage as any).thread_id,
        } as any);
      } else if (!selectedMessage.isRead) {
        markAsRead.mutate(selectedMessage.id as any);
      }
    }
    handleMenuClose();
  }, [selectedMessage, navigate, isConnected, send, markAsRead]);

  const handleReply = useCallback(() => {
    if (selectedMessage) {
      navigate(`/app/messages/reply?replyTo=${selectedMessage.id}&threadId=${(selectedMessage as any).thread_id}`);
    }
    handleMenuClose();
  }, [selectedMessage, navigate]);

  const handleDelete = useCallback(async () => {
    if (selectedMessage) {
      await deleteMessage.mutateAsync(selectedMessage.id);
    }
    handleMenuClose();
  }, [selectedMessage, deleteMessage]);

  const handleViewThread = useCallback((threadId: string) => {
    navigate(`/app/messages/thread/${threadId}`);
  }, [navigate]);

  // Filtrar mensajes
  const filteredMessages = realTimeMessages.filter(message => {
    const matchesSearch = message.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUnreadFilter = showOnlyUnread ? !message.isRead : true;
    const matchesThread = threadId ? (message as any).thread_id === threadId : true;

    return matchesSearch && matchesUnreadFilter && matchesThread;
  });

  // Verificar si usuario está escribiendo en una conversación
  const getTypingUsersForThread = (threadId: string) => {
    return typingUsers.filter(user => user.threadId === threadId);
  };

  // Obtener estado online de un usuario
  const getUserStatus = (userId: string) => {
    return onlineUsers.get(userId);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error al cargar los mensajes: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Estado de conexión */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: isConnected ? 'success.light' : 'warning.light' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Badge 
            color={isConnected ? 'success' : 'warning'} 
            variant="dot"
          >
            <CircleIcon fontSize="small" />
          </Badge>
          <Typography variant="body2" color={isConnected ? 'success.dark' : 'warning.dark'}>
            {connectionStatus}
          </Typography>
          {unreadMessagesCount > 0 && (
            <Chip 
              label={`${unreadMessagesCount} nuevos`} 
              color="primary" 
              size="small" 
              sx={{ ml: 2 }}
            />
          )}
        </Box>
      </Paper>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Mensajes {unreadMessagesCount > 0 ? `(${unreadMessagesCount} nuevos)` : ''}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/app/messages/new')}
        >
          Nuevo Mensaje
        </Button>
      </Box>

      {/* Búsqueda */}
      <Box mb={3}>
        <TextField
          fullWidth
          placeholder="Buscar mensajes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Lista de mensajes */}
      {filteredMessages.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            {searchTerm ? 'No se encontraron mensajes' : 'No hay mensajes'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredMessages.map((message) => {
            const typingInThread = getTypingUsersForThread((message as any).thread_id);
            const senderStatus = getUserStatus(message.senderId);

            return (
              <Grid item xs={12} key={message.id}>
                <Card
                  sx={{
                    bgcolor: message.isRead ? 'background.paper' : 'action.hover',
                    cursor: 'pointer',
                    position: 'relative',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                    },
                    transition: 'all 0.3s ease',
                    ...((message as any).isRealTime && {
                      borderLeft: '4px solid',
                      borderLeftColor: 'primary.main',
                    }),
                  }}
                  onClick={() => {
                    setSelectedMessage(message);
                    handleView();
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box display="flex" alignItems="center" gap={2} flex={1}>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={
                            senderStatus?.isOnline ? (
                              <CircleIcon sx={{ color: 'success.main', fontSize: 12 }} />
                            ) : null
                          }
                        >
                          <Avatar>
                            {(message as any).sender_name?.[0] || message.senderId?.[0] || 'U'}
                          </Avatar>
                        </Badge>

                        <Box flex={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="h6" component="div">
                              {message.subject || 'Sin asunto'}
                            </Typography>
                            {(message as any).isRealTime && (
                              <Chip
                                label="Tiempo real"
                                color="primary"
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>

                          <Typography variant="body2" color="text.secondary">
                            De: {(message as any).sender_name || message.senderId || 'Usuario'}
                            {senderStatus?.isOnline && (
                              <Chip
                                label="En línea"
                                color="success"
                                size="small"
                                sx={{ ml: 1, height: 16 }}
                              />
                            )}
                          </Typography>

                          <Typography variant="body2" color="text.secondary">
                            Para: {(message as any).recipient_name || message.recipientId || 'Usuario'}
                          </Typography>
                        </Box>
                      </Box>

                      <Box display="flex" alignItems="center" gap={1}>
                        {!message.isRead && (
                          <Tooltip title="Mensaje no leído">
                            <Chip
                              label="Nuevo"
                              color="primary"
                              size="small"
                            />
                          </Tooltip>
                        )}

                        {message.isRead && (
                          <Tooltip title="Mensaje leído">
                            <CheckCircleIcon color="success" fontSize="small" />
                          </Tooltip>
                        )}
                        
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMenuOpen(e, message);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Contenido del mensaje */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {message.content || 'Sin contenido'}
                    </Typography>

                    {/* Indicador de usuarios escribiendo */}
                    {typingInThread.length > 0 && (
                      <Box mt={1}>
                        <Typography variant="caption" color="primary" sx={{ fontStyle: 'italic' }}>
                          <EditIcon sx={{ fontSize: 12, mr: 0.5 }} />
                          {typingInThread.map(user => user.userName).join(', ')} 
                          {typingInThread.length === 1 ? ' está escribiendo...' : ' están escribiendo...'}
                        </Typography>
                      </Box>
                    )}

                    {/* Metadatos */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                      <Typography variant="caption" color="text.secondary">
                        {message.createdAt ? new Date(message.createdAt).toLocaleString() : 'Fecha desconocida'}
                      </Typography>

                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewThread((message as any).thread_id);
                        }}
                      >
                        Ver conversación
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Menú contextual */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <VisibilityIcon sx={{ mr: 1 }} />
          Ver Mensaje
        </MenuItem>
        <MenuItem onClick={handleReply}>
          <ReplyIcon sx={{ mr: 1 }} />
          Responder
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          Eliminar
        </MenuItem>
      </Menu>
    </Box>
  );
};