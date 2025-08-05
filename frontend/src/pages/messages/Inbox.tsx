import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Paper,
  Chip,
  Divider,
  TextField,
  InputAdornment,
  Button,
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
  Search as SearchIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { api } from '../../services/api';

interface MessageThread {
  id: number;
  subject: string;
  last_message: string;
  last_message_date: string;
  participants: Array<{
    id: number;
    full_name: string;
    avatar: string | null;
  }>;
  is_starred: boolean;
  is_archived: boolean;
}

const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const response = await api.get('/messages/threads/');
      setThreads(response.data);
    } catch (error) {
      console.error('Error fetching threads:', error);
      setError('Error al cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  const handleStarThread = async (threadId: number) => {
    try {
      const response = await api.post(`/messages/threads/${threadId}/star/`);
      setThreads(threads.map(thread => 
        thread.id === threadId ? response.data : thread
      ));
    } catch (error) {
      console.error('Error starring thread:', error);
    }
  };

  const handleArchiveThread = async (threadId: number) => {
    try {
      const response = await api.post(`/messages/threads/${threadId}/archive/`);
      setThreads(threads.filter(thread => thread.id !== threadId));
    } catch (error) {
      console.error('Error archiving thread:', error);
    }
  };

  const handleDeleteThread = async (threadId: number) => {
    try {
      await api.delete(`/messages/threads/${threadId}/delete/`);
      setThreads(threads.filter(thread => thread.id !== threadId));
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography color="error">Error loading messages</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Bandeja de Entrada</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/messages/new')}
        >
          Nuevo Mensaje
        </Button>
      </Box>

      <Paper>
        <List>
          {threads?.map((thread, index) => (
            <React.Fragment key={thread.id}>
              <ListItem
                secondaryAction={
                  <Box>
                    <IconButton
                      edge="end"
                      onClick={() => handleStarThread(thread.id)}
                    >
                      {thread.is_starred ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleArchiveThread(thread.id)}
                    >
                      <ArchiveIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteThread(thread.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/messages/${thread.id}`)}
              >
                <ListItemAvatar>
                  <Avatar src={thread.participants[0]?.avatar || undefined}>
                    {thread.participants[0]?.full_name.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={thread.subject}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        {thread.participants[0]?.full_name}
                      </Typography>
                      {' — '}
                      {thread.last_message}
                    </>
                  }
                />
              </ListItem>
              {index < threads.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default Inbox; 