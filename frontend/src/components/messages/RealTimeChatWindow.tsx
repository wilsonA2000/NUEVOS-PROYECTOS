/**
 * Ventana de chat en tiempo real con WebSocket
 * Permite mensajería instantánea con indicadores de estado
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Chip,
  Button,
  Divider,
  Tooltip,
  CircularProgress,
  Alert,
  Badge,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  InputAdornment,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Circle as CircleIcon,
  CheckCircle as CheckCircleIcon,
  DoubleArrow as DoubleArrowIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useRealTimeMessages } from '../../hooks/useRealTimeMessages';
import { useMessages } from '../../hooks/useMessages';
import { messageService } from '../../services/messageService';
import { Message, MessageThread } from '../../types/message';

interface RealTimeChatWindowProps {
  threadId: string;
  onClose?: () => void;
  height?: number;
}

export const RealTimeChatWindow: React.FC<RealTimeChatWindowProps> = ({
  threadId,
  onClose,
  height = 600,
}) => {
  const {
    isConnected,
    sendMessage,
    startTyping,
    stopTyping,
    markMessagesAsRead,
    joinThread,
    leaveThread,
    typingUsers,
    userStatuses,
    reconnect,
  } = useRealTimeMessages();

  const { messages, isLoading, error } = useMessages();
  
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [threadData, setThreadData] = useState<MessageThread | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos de la conversación
  useEffect(() => {
    const loadThreadData = async () => {
      try {
        const thread = await messageService.getThread(threadId);
        setThreadData(thread);
        
        const messagesData = await messageService.getMessages(threadId);
        setChatMessages(messagesData.results || []);
      } catch (error) {
        console.error('Error loading thread data:', error);
      }
    };

    if (threadId) {
      loadThreadData();
    }
  }, [threadId]);

  // Unirse a la conversación WebSocket
  useEffect(() => {
    if (threadId && isConnected) {
      joinThread(threadId);
      
      return () => {
        leaveThread(threadId);
      };
    }
  }, [threadId, isConnected, joinThread, leaveThread]);

  // Scroll automático al final
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  // Manejar cambios en el input
  const handleMessageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setMessageText(value);

    // Manejar indicador de escritura
    if (value.trim() && !isTyping && isConnected) {
      setIsTyping(true);
      startTyping(threadId);
    }

    // Limpiar timeout previo
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Detener indicador después de 2 segundos sin escribir
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && isConnected) {
        setIsTyping(false);
        stopTyping(threadId);
      }
    }, 2000);
  }, [isTyping, isConnected, startTyping, stopTyping, threadId]);

  // Enviar mensaje
  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || isSending) return;

    setIsSending(true);
    
    try {
      // Detener indicador de escritura
      if (isTyping && isConnected) {
        setIsTyping(false);
        stopTyping(threadId);
      }

      if (isConnected) {
        // Enviar por WebSocket
        sendMessage(threadId, messageText.trim());
      } else {
        // Fallback a API REST
        await messageService.createMessage({
          thread_id: threadId,
          content: messageText.trim(),
        });
      }

      setMessageText('');
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  }, [messageText, isSending, isTyping, isConnected, stopTyping, threadId, sendMessage]);

  // Manejar Enter para enviar
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Marcar mensajes como leídos cuando se abra la ventana
  useEffect(() => {
    if (chatMessages.length > 0 && isConnected) {
      const unreadMessages = chatMessages
        .filter(msg => !msg.is_read)
        .map(msg => msg.id);
      
      if (unreadMessages.length > 0) {
        markMessagesAsRead(threadId, unreadMessages);
      }
    }
  }, [chatMessages, isConnected, markMessagesAsRead, threadId]);

  // Obtener usuarios escribiendo en esta conversación
  const currentTypingUsers = typingUsers.filter(user => user.threadId === threadId);

  // Formatear tiempo de mensaje
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  // Obtener estado de usuario
  const getUserStatus = (userId: string) => {
    return userStatuses.get(userId);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={height}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error al cargar la conversación: {error.message}
      </Alert>
    );
  }

  return (
    <Paper sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* Header de la conversación */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar>
              {threadData?.participants?.[0]?.name?.[0] || 'C'}
            </Avatar>
            <Box>
              <Typography variant="h6">
                {threadData?.subject || 'Conversación'}
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Badge
                  color={isConnected ? 'success' : 'error'}
                  variant="dot"
                >
                  <Typography variant="caption" color="text.secondary">
                    {isConnected ? 'Conectado' : 'Desconectado'}
                  </Typography>
                </Badge>
                {!isConnected && (
                  <IconButton size="small" onClick={reconnect}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Box>
          </Box>
          
          {onClose && (
            <Button onClick={onClose} size="small">
              Cerrar
            </Button>
          )}
        </Box>
      </Box>

      {/* Área de mensajes */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        <List sx={{ pb: 0 }}>
          {chatMessages.map((message, index) => {
            const isOwn = message.sender_id === threadData?.current_user_id;
            const userStatus = getUserStatus(message.sender_id);
            
            return (
              <ListItem
                key={message.id}
                sx={{
                  display: 'flex',
                  flexDirection: isOwn ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  px: 1,
                }}
              >
                {!isOwn && (
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={
                        userStatus?.isOnline ? (
                          <CircleIcon sx={{ color: 'success.main', fontSize: 10 }} />
                        ) : null
                      }
                    >
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {message.sender_name?.[0] || 'U'}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                )}

                <Box
                  sx={{
                    maxWidth: '70%',
                    mx: 1,
                  }}
                >
                  <Paper
                    sx={{
                      p: 1.5,
                      bgcolor: isOwn ? 'primary.main' : 'grey.100',
                      color: isOwn ? 'primary.contrastText' : 'text.primary',
                      borderRadius: 2,
                      ...(message.isRealTime && {
                        animation: 'fadeIn 0.3s ease-in',
                      }),
                    }}
                  >
                    <Typography variant="body2">
                      {message.content}
                    </Typography>
                    
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mt={0.5}
                    >
                      <Typography
                        variant="caption"
                        sx={{ 
                          opacity: 0.7,
                          color: isOwn ? 'inherit' : 'text.secondary',
                        }}
                      >
                        {formatMessageTime(message.sent_at)}
                      </Typography>
                      
                      {isOwn && (
                        <Tooltip title={message.is_read ? 'Leído' : 'Enviado'}>
                          {message.is_read ? (
                            <DoubleArrowIcon sx={{ fontSize: 12, opacity: 0.7 }} />
                          ) : (
                            <CheckCircleIcon sx={{ fontSize: 12, opacity: 0.7 }} />
                          )}
                        </Tooltip>
                      )}
                    </Box>
                  </Paper>
                </Box>
              </ListItem>
            );
          })}
        </List>

        {/* Indicador de usuarios escribiendo */}
        {currentTypingUsers.length > 0 && (
          <Box sx={{ px: 2, py: 1 }}>
            <Chip
              icon={<EditIcon />}
              label={`${currentTypingUsers.map(u => u.userName).join(', ')} ${
                currentTypingUsers.length === 1 ? 'está' : 'están'
              } escribiendo...`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Input de mensaje */}
      <Box sx={{ p: 2 }}>
        <TextField
          ref={messageInputRef}
          fullWidth
          multiline
          maxRows={3}
          placeholder="Escribe un mensaje..."
          value={messageText}
          onChange={handleMessageChange}
          onKeyPress={handleKeyPress}
          disabled={!isConnected || isSending}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton disabled>
                  <AttachFileIcon />
                </IconButton>
                <IconButton
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || !isConnected || isSending}
                  color="primary"
                >
                  {isSending ? (
                    <CircularProgress size={20} />
                  ) : (
                    <SendIcon />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        
        {!isConnected && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            Sin conexión - Los mensajes se enviarán cuando se restablezca la conexión
          </Typography>
        )}
      </Box>
    </Paper>
  );
};