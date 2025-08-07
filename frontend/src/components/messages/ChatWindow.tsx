/**
 * ChatWindow - Ventana de chat en tiempo real con WebSocket
 * Maneja envío/recepción instantánea de mensajes, indicadores de escritura, y estado de lectura
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  List,
  ListItem,
  Avatar,
  Paper,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Chip,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  CheckCircle as CheckCircleIcon,
  Circle as CircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useBusinessNotifications } from '../../hooks/useBusinessNotifications';

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sent_at: string;
  is_read?: boolean;
  message_type?: 'text' | 'image' | 'file';
  isPending?: boolean;
  isError?: boolean;
}

interface ChatWindowProps {
  conversationId: string;
  recipientId: string;
  recipientName: string;
  contextInfo?: {
    type: 'property' | 'service';
    title: string;
    details?: string;
  };
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  recipientId,
  recipientName,
  contextInfo,
}) => {
  const { user } = useAuth();
  const { onMessageSent } = useBusinessNotifications();
  const {
    isConnected,
    send,
    subscribe,
    onlineUsers
  } = useOptimizedWebSocketContext();
  
  // Estado local para usuarios escribiendo
  const [typingUsers, setTypingUsers] = useState<any[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    // Mensajes iniciales de ejemplo - esto vendría del backend
    {
      id: '1',
      content: 'Hola, me interesa conocer más detalles sobre la propiedad',
      sender_id: recipientId,
      sender_name: recipientName,
      sent_at: '2024-01-15T10:30:00Z',
      is_read: true,
    },
    {
      id: '2',
      content: 'Por supuesto, estaré encantado de ayudarte. ¿Qué te gustaría saber específicamente?',
      sender_id: user?.id || '',
      sender_name: user?.first_name || 'Tú',
      sent_at: '2024-01-15T10:32:00Z',
      is_read: true,
    },
    {
      id: '3',
      content: '¿Podrías contarme sobre los servicios públicos incluidos y el estado del inmueble?',
      sender_id: recipientId,
      sender_name: recipientName,
      sent_at: '2024-01-15T10:35:00Z',
      is_read: false,
    },
  ]);

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Estado del destinatario
  const recipientStatus = onlineUsers.get(recipientId);
  const isRecipientOnline = recipientStatus?.isOnline || false;

  // Usuario escribiendo en esta conversación
  const recipientTyping = typingUsers.find(
    user => user.userId === recipientId && user.threadId === conversationId
  );

  // Auto-scroll a los mensajes más recientes
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Suscribirse a eventos WebSocket para esta conversación
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribers = [
      // Mensajes nuevos
      subscribe('new_thread_message', (message) => {
        if (message.message?.thread_id === conversationId) {
          const chatMessage: ChatMessage = {
            id: message.message.id,
            content: message.message.content,
            sender_id: message.message.sender_id,
            sender_name: message.message.sender_name,
            sent_at: message.message.sent_at,
            is_read: message.message.is_read,
          };
          
          setMessages(prev => {
            // Evitar duplicados
            if (prev.some(msg => msg.id === chatMessage.id)) {
              return prev;
            }
            return [...prev, chatMessage];
          });

          // Auto-marcar como leído si es de otro usuario
          if (message.message.sender_id !== user?.id) {
            setTimeout(() => {
              send('messaging', {
                type: 'mark_as_read',
                message_id: message.message.id,
                thread_id: conversationId,
              });
            }, 1000);
          }
        }
      }),

      // Confirmaciones de lectura
      subscribe('messages_read_update', (message) => {
        if (message.thread_id === conversationId) {
          setMessages(prev =>
            prev.map(msg =>
              message.message_ids.includes(msg.id)
                ? { ...msg, is_read: true }
                : msg
            )
          );
        }
      }),
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [isConnected, subscribe, conversationId, user, send]);

  // Unirse a la conversación WebSocket
  useEffect(() => {
    if (isConnected && conversationId) {
      send('messaging', {
        type: 'join_conversation',
        thread_id: conversationId,
      });

      return () => {
        send('messaging', {
          type: 'leave_conversation',
          thread_id: conversationId,
        });
      };
    }
  }, [isConnected, conversationId, send]);

  // Manejar indicador de escritura
  const handleTypingStart = useCallback(() => {
    if (!isTyping && isConnected) {
      setIsTyping(true);
      send('messaging', {
        type: 'typing_start',
        thread_id: conversationId,
      });
    }

    // Reiniciar timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (isConnected) {
        send('messaging', {
          type: 'typing_stop',
          thread_id: conversationId,
        });
      }
    }, 3000);
  }, [isTyping, isConnected, send, conversationId]);

  // Manejar envío de mensaje
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !isConnected || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    // Detener indicador de escritura
    if (isTyping) {
      setIsTyping(false);
      send('messaging', {
        type: 'typing_stop',
        thread_id: conversationId,
      });
    }

    // Crear mensaje temporal
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender_id: user?.id || '',
      sender_name: user?.first_name || user?.username || 'Tú',
      sent_at: new Date().toISOString(),
      is_read: false,
      isPending: true,
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      // Enviar por WebSocket
      const success = send('messaging', {
        type: 'send_message',
        thread_id: conversationId,
        content: messageContent,
      });

      if (!success) {
        throw new Error('Error enviando mensaje');
      }

      // 📧 NOTIFICACIONES AUTOMÁTICAS: Notificar al destinatario sobre el nuevo mensaje
      try {
        const recipientData = {
          id: recipientId,
          first_name: recipientName.split(' ')[0],
          last_name: recipientName.split(' ').slice(1).join(' ') || '',
          email: '', // Se obtendría del contexto o API
          user_type: 'tenant', // Se obtendría del contexto
        };
        
        await onMessageSent(recipientData, {
          id: tempMessage.id,
          content: messageContent,
          thread_id: conversationId,
        });
        console.log('📧 ChatWindow: Notificación automática enviada por nuevo mensaje');
      } catch (notificationError) {
        console.warn('⚠️ ChatWindow: Error enviando notificación automática:', notificationError);
        // No afectar el flujo principal si fallan las notificaciones
      }

      // Remover mensaje temporal después de un tiempo
      setTimeout(() => {
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      }, 5000);

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempMessage.id
            ? { ...msg, isPending: false, isError: true }
            : msg
        )
      );
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [newMessage, isConnected, isSending, isTyping, send, conversationId, user]);

  // Limpiar timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Información del contexto */}
      {contextInfo && (
        <Paper sx={{ m: 2, p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {contextInfo.type === 'property' ? '🏠' : '🔧'} {contextInfo.title}
          </Typography>
          {contextInfo.details && (
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {contextInfo.details}
            </Typography>
          )}
        </Paper>
      )}

      {/* Lista de mensajes */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
        <List>
          {messages.map((message, index) => {
            const isOwnMessage = message.sender_id === user?.id;
            const showAvatar = index === 0 || messages[index - 1]?.sender_id !== message.sender_id;
            const isLastInGroup = index === messages.length - 1 || 
              messages[index + 1]?.sender_id !== message.sender_id;

            return (
              <ListItem
                key={message.id}
                sx={{
                  flexDirection: isOwnMessage ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  mb: isLastInGroup ? 1 : 0.5,
                  px: 1,
                }}
              >
                <Box
                  sx={{
                    maxWidth: '70%',
                    display: 'flex',
                    flexDirection: isOwnMessage ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                    gap: 1,
                  }}
                >
                  {showAvatar && (
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {message.sender_name[0]}
                    </Avatar>
                  )}
                  
                  <Box sx={{ ml: showAvatar ? 0 : 5 }}>
                    <Paper
                      elevation={1}
                      sx={{
                        p: 1.5,
                        bgcolor: isOwnMessage ? 'primary.main' : 'grey.100',
                        color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
                        borderRadius: 2,
                        position: 'relative',
                        opacity: message.isPending ? 0.7 : message.isError ? 0.5 : 1,
                        border: message.isError ? '1px solid' : 'none',
                        borderColor: message.isError ? 'error.main' : 'transparent',
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
                            fontSize: '0.7rem',
                          }}
                        >
                          {new Date(message.sent_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                        
                        {isOwnMessage && (
                          <Box sx={{ ml: 1 }}>
                            {message.isPending ? (
                              <CircularProgress size={12} />
                            ) : message.isError ? (
                              <Tooltip title="Error al enviar">
                                <CircleIcon sx={{ fontSize: 12, color: 'error.main' }} />
                              </Tooltip>
                            ) : (
                              <CheckCircleIcon 
                                sx={{ 
                                  fontSize: 12, 
                                  color: message.is_read ? 'success.main' : 'grey.400' 
                                }} 
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Box>
                </Box>
              </ListItem>
            );
          })}
        </List>

        {/* Indicador de escritura */}
        {recipientTyping && (
          <Box sx={{ px: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 24, height: 24 }}>
              {recipientName[0]}
            </Avatar>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              {recipientName} está escribiendo...
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <CircleIcon sx={{ fontSize: 6, color: 'primary.main', animation: 'pulse 1.5s infinite' }} />
              <CircleIcon sx={{ fontSize: 6, color: 'primary.main', animation: 'pulse 1.5s infinite 0.5s' }} />
              <CircleIcon sx={{ fontSize: 6, color: 'primary.main', animation: 'pulse 1.5s infinite 1s' }} />
            </Box>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Estado de conexión */}
      {!isConnected && (
        <Box sx={{ px: 2, py: 1, bgcolor: 'warning.light' }}>
          <Typography variant="caption" color="warning.dark">
            ⚠️ Conexión perdida - Reconectando...
          </Typography>
        </Box>
      )}

      {/* Campo de entrada */}
      <Box sx={{ p: 2 }}>
        <TextField
          ref={inputRef}
          fullWidth
          size="small"
          placeholder={isConnected ? `Mensaje a ${recipientName}...` : "Reconectando..."}
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTypingStart();
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={!isConnected || isSending}
          multiline
          maxRows={3}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconButton size="small" disabled={!isConnected}>
                  <AttachFileIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" disabled={!isConnected}>
                  <EmojiIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={isConnected ? "Enviar mensaje (Enter)" : "Sin conexión"}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || !isConnected || isSending}
                      color="primary"
                    >
                      {isSending ? (
                        <CircularProgress size={20} />
                      ) : (
                        <SendIcon />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
        
        {isRecipientOnline && (
          <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
            {recipientName} está en línea
          </Typography>
        )}
      </Box>
    </Box>
  );
};