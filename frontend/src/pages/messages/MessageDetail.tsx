import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Divider,
  TextField,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Send as SendIcon } from '@mui/icons-material';
import { useMessages } from '../../hooks/useMessages';
import { useAuth } from '../../hooks/useAuth';
import { formatDateTime } from '../../utils/formatters';

const MessageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, sendMessage, markAsRead } = useMessages();
  const [newMessage, setNewMessage] = useState('');

  const message = messages?.find((m) => m.id === Number(id));
  const conversation = messages?.filter(
    (m) =>
      (m.senderId === message?.senderId && m.receiverId === message?.receiverId) ||
      (m.senderId === message?.receiverId && m.receiverId === message?.senderId)
  );

  useEffect(() => {
    if (message && !message.read) {
      markAsRead(message.id);
    }
  }, [message, markAsRead]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !message) return;

    try {
      await sendMessage({
        receiverId: message.senderId,
        content: newMessage,
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!message) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Typography>Mensaje no encontrado</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/messages')}
            sx={{ mr: 2 }}
          >
            Volver
          </Button>
          <Typography variant="h5">
            Conversación con {message.senderId === user?.id ? message.receiverName : message.senderName}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <List sx={{ mb: 3 }}>
          {conversation?.map((msg) => (
            <ListItem
              key={msg.id}
              sx={{
                flexDirection: msg.senderId === user?.id ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
              }}
            >
              <ListItemAvatar>
                <Avatar
                  src={msg.senderId === user?.id ? user?.avatar : message.senderAvatar}
                  alt={msg.senderId === user?.id ? user?.firstName : message.senderName}
                />
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box
                    sx={{
                      bgcolor: msg.senderId === user?.id ? 'primary.main' : 'grey.100',
                      color: msg.senderId === user?.id ? 'white' : 'text.primary',
                      p: 2,
                      borderRadius: 2,
                      maxWidth: '70%',
                    }}
                  >
                    <Typography variant="body1">{msg.content}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {formatDateTime(msg.createdAt)}
                    </Typography>
                  </Box>
                }
                sx={{
                  textAlign: msg.senderId === user?.id ? 'right' : 'left',
                }}
              />
            </ListItem>
          ))}
        </List>

        <form onSubmit={handleSend}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              variant="outlined"
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              endIcon={<SendIcon />}
              disabled={!newMessage.trim()}
            >
              Enviar
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default MessageDetail; 