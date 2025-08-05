import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Avatar,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  MoreVert as MoreVertIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
} from '@mui/icons-material';
import { api } from '../../services/api';

interface Message {
  id: number;
  content: string;
  created_at: string;
  sender: {
    id: number;
    full_name: string;
    avatar: string | null;
  };
}

interface Thread {
  id: number;
  subject: string;
  participants: Array<{
    id: number;
    full_name: string;
    avatar: string | null;
  }>;
  messages: Message[];
  is_starred: boolean;
  is_archived: boolean;
}

const ThreadDetail: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThread = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/messages/threads/${threadId}/`);
      setThread(response.data);
    } catch (error) {
      console.error('Error fetching thread:', error);
      setError('Error al cargar el hilo de mensajes');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/messages/threads/${threadId}/messages/`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await api.post(`/messages/threads/${threadId}/messages/`, { content });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messageThread', threadId]);
      setNewMessage('');
    },
  });

  const handleStarThread = async () => {
    try {
      const response = await api.post(`/messages/threads/${threadId}/star/`);
      setThread(response.data);
    } catch (error) {
      console.error('Error starring thread:', error);
    }
  };

  const handleArchiveThread = async () => {
    try {
      const response = await api.post(`/messages/threads/${threadId}/archive/`);
      setThread(response.data);
      if (response.data.archived) {
        navigate('/messages/inbox');
      }
    } catch (error) {
      console.error('Error archiving thread:', error);
    }
  };

  const handleDeleteThread = async () => {
    try {
      await api.delete(`/messages/threads/${threadId}/delete/`);
      navigate('/messages/inbox');
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage);
    }
  };

  useEffect(() => {
    fetchThread();
    fetchMessages();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !thread) {
    return <Typography color="error">{error || 'Thread not found'}</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate('/messages')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          {thread.subject}
        </Typography>
        <IconButton onClick={handleStarThread}>
          {thread.is_starred ? <StarIcon /> : <StarBorderIcon />}
        </IconButton>
        <IconButton onClick={handleArchiveThread}>
          <ArchiveIcon />
        </IconButton>
        <IconButton onClick={handleDeleteThread}>
          <DeleteIcon />
        </IconButton>
      </Box>

      <Paper sx={{ mb: 2, maxHeight: '60vh', overflow: 'auto' }}>
        <List>
          {messages.map((message, index) => (
            <React.Fragment key={message.id}>
              <ListItem alignItems="flex-start">
                <ListItemAvatar>
                  <Avatar src={message.sender.avatar || undefined}>
                    {message.sender.full_name.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={message.sender.full_name}
                  secondary={
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                      >
                        {new Date(message.created_at).toLocaleString()}
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 1 }}>
                        {message.content}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              {index < messages.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      <Paper component="form" onSubmit={handleSendMessage} sx={{ p: 2 }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Escribe tu mensaje..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!newMessage.trim() || sendMessageMutation.isLoading}
        >
          Enviar
        </Button>
      </Paper>
    </Box>
  );
};

export default ThreadDetail; 