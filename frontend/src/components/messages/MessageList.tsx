import React from 'react';
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
} from '@mui/material';
import { 
  MoreVert as MoreVertIcon, 
  Add as AddIcon,
  Search as SearchIcon,
  Reply as ReplyIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMessages } from '../../hooks/useMessages';
import { ensureArray } from '../../utils/arrayUtils';

export const MessageList: React.FC = () => {
  const navigate = useNavigate();
  const { messages, threads, unreadCount, isLoading, error, deleteMessage, markAsRead } = useMessages();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = React.useState<any>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, message: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedMessage(message);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMessage(null);
  };

  const handleView = () => {
    if (selectedMessage) {
      navigate(`/app/messages/${selectedMessage.id}`);
      if (!selectedMessage.is_read) {
        markAsRead.mutate(selectedMessage.id);
      }
    }
    handleMenuClose();
  };

  const handleReply = () => {
    if (selectedMessage) {
      navigate(`/app/messages/reply?replyTo=${selectedMessage.id}`);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedMessage) {
      await deleteMessage.mutateAsync(selectedMessage.id);
    }
    handleMenuClose();
  };

  // Asegurar que messages sea un array
  const messagesArray = ensureArray(messages);
  const filteredMessages = messagesArray.filter(message =>
    message.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Mensajes {unreadCount ? `(${unreadCount} nuevos)` : ''}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/app/messages/new')}
        >
          Nuevo Mensaje
        </Button>
      </Box>

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

      {filteredMessages.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            {searchTerm ? 'No se encontraron mensajes' : 'No hay mensajes'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredMessages.map((message) => (
            <Grid item xs={12} key={message.id}>
              <Card
                sx={{
                  bgcolor: message.is_read ? 'background.paper' : 'action.hover',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={() => handleView()}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box display="flex" alignItems="center" gap={2} flex={1}>
                      <Avatar>{message.sender?.name?.[0] || message.sender_id?.[0] || 'U'}</Avatar>
                      <Box flex={1}>
                        <Typography variant="h6" component="div">
                          {message.subject || 'Sin asunto'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          De: {message.sender?.name || message.sender_id || 'Usuario'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Para: {message.recipient?.name || message.recipient_id || 'Usuario'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      {!message.is_read && (
                        <Chip
                          label="Nuevo"
                          color="primary"
                          size="small"
                        />
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
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {message.created_at ? new Date(message.created_at).toLocaleString() : 'Fecha desconocida'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>Ver Mensaje</MenuItem>
        <MenuItem onClick={handleReply}>Responder</MenuItem>
        <MenuItem onClick={handleDelete}>Eliminar</MenuItem>
      </Menu>
    </Box>
  );
}; 