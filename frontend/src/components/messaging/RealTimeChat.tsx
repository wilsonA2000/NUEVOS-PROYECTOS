/**
 * RealTimeChat - Real-time messaging component
 * Integrates with WebSocket service for live messaging experience
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Badge,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  Circle as CircleIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useMessaging, useThreadMessaging } from '../../hooks/useWebSocketEnhanced';
import { useAuth } from '../../hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-toastify';
import MessagingErrorBoundary from './MessagingErrorBoundary';

interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
  read: boolean;
  type: 'text' | 'system' | 'typing';
}

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  online: boolean;
  lastSeen?: string;
}

interface RealTimeChatProps {
  threadId: string | number;
  participants: Participant[];
  initialMessages?: Message[];
  onNewMessage?: (message: Message) => void;
  onTyping?: (userId: string, isTyping: boolean) => void;
  onMessageRead?: (messageId: string) => void;
}

const RealTimeChat: React.FC<RealTimeChatProps> = ({
  threadId,
  participants,
  initialMessages = [],
  onNewMessage,
  onTyping,
  onMessageRead,
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // WebSocket connection for this thread
  const {
    isConnected,
    send,
    subscribe,
    connectionStatus,
  } = useThreadMessaging(threadId, {
    onConnectionChange: (status) => {
      if (status.connected) {
        toast.success('Connected to chat');
      } else if (!status.connecting) {
        toast.error('Disconnected from chat');
      }
    },
  });

  // Handle incoming messages
  useEffect(() => {
    const unsubscribeNewMessage = subscribe('new_message', (message) => {
      const newMsg: Message = {
        id: message.data.id,
        content: message.data.content,
        sender: message.data.sender,
        timestamp: message.data.timestamp,
        read: false,
        type: 'text',
      };
      
      setMessages(prev => [...prev, newMsg]);
      onNewMessage?.(newMsg);
      
      // Mark as read if not from current user
      if (newMsg.sender.id !== user?.id) {
        markAsRead(newMsg.id);
      }
    });

    const unsubscribeTyping = subscribe('typing_notification', (message) => {
      const { user_id, is_typing } = message.data;
      
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (is_typing) {
          newSet.add(user_id);
        } else {
          newSet.delete(user_id);
        }
        return newSet;
      });

      onTyping?.(user_id, is_typing);
    });

    const unsubscribeMessageRead = subscribe('message_read', (message) => {
      const { message_id } = message.data;
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message_id ? { ...msg, read: true } : msg
        )
      );

      onMessageRead?.(message_id);
    });

    return () => {
      unsubscribeNewMessage();
      unsubscribeTyping();
      unsubscribeMessageRead();
    };
  }, [subscribe, user?.id, onNewMessage, onTyping, onMessageRead]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || sending || !isConnected) return;

    setSending(true);
    
    const success = send({
      type: 'send_message',
      data: {
        thread_id: threadId,
        content: newMessage.trim(),
        message_type: 'text',
      },
    });

    if (success) {
      setNewMessage('');
      
      // Stop typing indicator
      if (isTyping) {
        send({
          type: 'typing_stop',
          data: { thread_id: threadId },
        });
        setIsTyping(false);
      }
    } else {
      toast.error('Failed to send message. Please try again.');
    }
    
    setSending(false);
  }, [newMessage, sending, isConnected, send, threadId, isTyping]);

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (!isTyping && isConnected) {
      send({
        type: 'typing_start',
        data: { thread_id: threadId },
      });
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isConnected) {
        send({
          type: 'typing_stop',
          data: { thread_id: threadId },
        });
        setIsTyping(false);
      }
    }, 2000);
  }, [isTyping, isConnected, send, threadId]);

  // Mark message as read
  const markAsRead = useCallback((messageId: string) => {
    if (isConnected) {
      send({
        type: 'mark_as_read',
        data: { message_id: messageId },
      });
    }
  }, [isConnected, send]);

  // Handle Enter key
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Get typing users display
  const getTypingDisplay = () => {
    const typingUserNames = Array.from(typingUsers)
      .map(userId => participants.find(p => p.id === userId)?.name)
      .filter(Boolean);

    if (typingUserNames.length === 0) return null;
    if (typingUserNames.length === 1) return `${typingUserNames[0]} está escribiendo...`;
    if (typingUserNames.length === 2) return `${typingUserNames.join(' y ')} están escribiendo...`;
    return `${typingUserNames.slice(0, -1).join(', ')} y ${typingUserNames[typingUserNames.length - 1]} están escribiendo...`;
  };

  return (
    <MessagingErrorBoundary>
      <Paper elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              Chat en tiempo real
            </Typography>
            
            <Box display="flex" alignItems="center" gap={1}>
              {/* Connection status */}
              <Chip
                size="small"
                icon={<CircleIcon fontSize="small" />}
                label={isConnected ? 'Conectado' : 'Desconectado'}
                color={isConnected ? 'success' : 'error'}
                variant="outlined"
              />
              
              {/* Online participants */}
              <Box display="flex" alignItems="center" gap={0.5}>
                {participants.slice(0, 3).map((participant) => (
                  <Badge
                    key={participant.id}
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <CircleIcon 
                        sx={{ 
                          fontSize: 12, 
                          color: participant.online ? 'success.main' : 'grey.400' 
                        }} 
                      />
                    }
                  >
                    <Avatar
                      src={participant.avatar}
                      sx={{ width: 32, height: 32 }}
                    >
                      {participant.name.charAt(0)}
                    </Avatar>
                  </Badge>
                ))}
                {participants.length > 3 && (
                  <Typography variant="caption" color="text.secondary">
                    +{participants.length - 3}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Messages */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
          {!isConnected && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Conexión perdida. Los mensajes pueden no estar actualizados.
            </Alert>
          )}
          
          <List sx={{ pb: 0 }}>
            {messages.map((message) => (
              <ListItem
                key={message.id}
                alignItems="flex-start"
                sx={{
                  flexDirection: message.sender.id === user?.id ? 'row-reverse' : 'row',
                  px: 1,
                }}
              >
                <ListItemAvatar sx={{ 
                  minWidth: message.sender.id === user?.id ? 'auto' : 56,
                  ml: message.sender.id === user?.id ? 1 : 0,
                  mr: message.sender.id === user?.id ? 0 : 1,
                }}>
                  <Avatar src={message.sender.avatar}>
                    {message.sender.name.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Paper
                      elevation={1}
                      sx={{
                        p: 1.5,
                        maxWidth: '70%',
                        backgroundColor: message.sender.id === user?.id 
                          ? 'primary.main' 
                          : 'grey.100',
                        color: message.sender.id === user?.id 
                          ? 'primary.contrastText' 
                          : 'text.primary',
                        borderRadius: 2,
                        wordBreak: 'break-word',
                      }}
                    >
                      <Typography variant="body2">
                        {message.content}
                      </Typography>
                      
                      <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            opacity: 0.7,
                            color: 'inherit',
                          }}
                        >
                          {formatDistanceToNow(new Date(message.timestamp), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </Typography>
                        
                        {message.sender.id === user?.id && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              opacity: 0.7,
                              color: 'inherit',
                            }}
                          >
                            {message.read ? '✓✓' : '✓'}
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  }
                  sx={{
                    textAlign: message.sender.id === user?.id ? 'right' : 'left',
                    m: 0,
                  }}
                />
              </ListItem>
            ))}
          </List>
          
          {/* Typing indicator */}
          {typingUsers.size > 0 && (
            <Box sx={{ px: 2, pb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                {getTypingDisplay()}
              </Typography>
            </Box>
          )}
          
          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        {/* Message input */}
        <Box sx={{ p: 2 }}>
          <Box display="flex" gap={1} alignItems="flex-end">
            <TextField
              fullWidth
              multiline
              maxRows={3}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTypingStart();
              }}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Escribe un mensaje..." : "Conectando..."}
              disabled={!isConnected || sending}
              variant="outlined"
              size="small"
            />
            
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !isConnected || sending}
              sx={{ minWidth: 'auto', px: 2 }}
            >
              {sending ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SendIcon />
              )}
            </Button>
          </Box>
        </Box>
      </Paper>
    </MessagingErrorBoundary>
  );
};

export default RealTimeChat;