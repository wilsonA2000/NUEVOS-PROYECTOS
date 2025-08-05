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
import { useRealTimeMessages } from '../../hooks/useRealTimeMessages';
import { ensureArray } from '../../utils/arrayUtils';
import { Message, MessageThread } from '../../types/message';

interface RealTimeMessageListProps {
  threadId?: string;
  showOnlyUnread?: boolean;
}

export const RealTimeMessageList: React.FC<RealTimeMessageListProps> = ({ 
  threadId, 
  showOnlyUnread = false 
}) => {
  const navigate = useNavigate();
  const { messages, threads, isLoading, error, deleteMessage, markAsRead } = useMessages();
  const {
    isConnected,
    unreadCount,
    hasNewMessages,
    typingUsers,
    userStatuses,
    markMessagesAsRead,
    joinThread,
    leaveThread,
    currentThreadId,
  } = useRealTimeMessages();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [realTimeMessages, setRealTimeMessages] = useState<Message[]>([]);

  // Estado de conexión y notificaciones
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('Conectado - Mensajes en tiempo real activos');
    } else {
      setConnectionStatus('Desconectado - Solo mensajes guardados');
    }
  }, [isConnected]);

  // Manejar mensajes en tiempo real
  useEffect(() => {
    if (messages) {
      setRealTimeMessages(ensureArray(messages));
    }
  }, [messages]);

  // Unirse/salir de la conversación específica
  useEffect(() => {
    if (threadId && isConnected) {
      joinThread(threadId);
      return () => {
        leaveThread(threadId);
      };
    }
  }, [threadId, isConnected, joinThread, leaveThread]);

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
      if (isConnected && !selectedMessage.is_read) {
        markMessagesAsRead(selectedMessage.thread_id, [selectedMessage.id]);
      } else if (!selectedMessage.is_read) {
        markAsRead.mutate(selectedMessage.id);
      }
    }
    handleMenuClose();
  }, [selectedMessage, navigate, isConnected, markMessagesAsRead, markAsRead]);

  const handleReply = useCallback(() => {
    if (selectedMessage) {
      navigate(`/app/messages/reply?replyTo=${selectedMessage.id}&threadId=${selectedMessage.thread_id}`);
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
    const matchesUnreadFilter = showOnlyUnread ? !message.is_read : true;
    const matchesThread = threadId ? message.thread_id === threadId : true;
    
    return matchesSearch && matchesUnreadFilter && matchesThread;
  });

  // Verificar si usuario está escribiendo en una conversación
  const getTypingUsersForThread = (threadId: string) => {
    return typingUsers.filter(user => user.threadId === threadId);
  };

  // Obtener estado online de un usuario
  const getUserStatus = (userId: string) => {
    return userStatuses.get(userId);
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
          {hasNewMessages && (
            <Chip 
              label={`${unreadCount} nuevos`} 
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
          Mensajes {unreadCount > 0 ? `(${unreadCount} nuevos)` : ''}
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
            const typingInThread = getTypingUsersForThread(message.thread_id);
            const senderStatus = getUserStatus(message.sender_id);
            
            return (
              <Grid item xs={12} key={message.id}>
                <Card
                  sx={{
                    bgcolor: message.is_read ? 'background.paper' : 'action.hover',
                    cursor: 'pointer',
                    position: 'relative',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                    },
                    transition: 'all 0.3s ease',
                    ...(message.isRealTime && {
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
                            {message.sender_name?.[0] || message.sender_id?.[0] || 'U'}
                          </Avatar>
                        </Badge>
                        
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="h6" component="div">
                              {message.subject || 'Sin asunto'}
                            </Typography>
                            {message.isRealTime && (
                              <Chip 
                                label="Tiempo real" 
                                color="primary" 
                                size="small" 
                                variant="outlined"
                              />
                            )}
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary">
                            De: {message.sender_name || message.sender_id || 'Usuario'}
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
                            Para: {message.recipient_name || message.recipient_id || 'Usuario'}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box display="flex" alignItems="center" gap={1}>
                        {!message.is_read && (
                          <Tooltip title="Mensaje no leído">
                            <Chip
                              label="Nuevo"
                              color="primary"
                              size="small"
                            />
                          </Tooltip>
                        )}
                        
                        {message.is_read && (
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
                        {message.sent_at ? new Date(message.sent_at).toLocaleString() : 'Fecha desconocida'}
                      </Typography>
                      
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewThread(message.thread_id);
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