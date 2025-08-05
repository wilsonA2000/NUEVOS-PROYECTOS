import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Badge,
  CircularProgress,
  Alert,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemSecondaryAction,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Send as SendIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  MarkEmailRead as MarkEmailReadIcon,
  MarkEmailUnread as MarkEmailUnreadIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
} from '@mui/icons-material';
import { useMessages } from '../../hooks/useMessages';
import { useAuth } from '../../hooks/useAuth';
import { formatDateTime } from '../../utils/formatters';
import { ensureArray } from '../../utils/arrayUtils';

const MessageList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    messages, 
    isLoading, 
    error,
    markAsRead,
    markAsUnread,
    starMessage,
    deleteMessage,
    archiveConversation
  } = useMessages();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, unread, starred, archived
  const [sortBy, setSortBy] = useState('date'); // date, sender, subject
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  // Asegurar que messages sea un array
  const messagesArray = ensureArray(messages);

  // Crear conversaciones de forma más simple
  const conversationsMap = new Map();
  
  messagesArray.forEach((message: any) => {
    const otherUserId = message.senderId === user?.id ? message.receiverId : message.senderId;
    const otherUserName = message.senderId === user?.id ? message.receiverName : message.senderName;
    const otherUserAvatar = message.senderId === user?.id ? message.receiverAvatar : message.senderAvatar;

    if (!conversationsMap.has(otherUserId)) {
      conversationsMap.set(otherUserId, {
        id: otherUserId,
        name: otherUserName || 'Usuario',
        avatar: otherUserAvatar || '',
        lastMessage: message.content || 'Sin mensaje',
        lastMessageTime: message.createdAt || '',
        unreadCount: message.senderId !== user?.id && !message.read ? 1 : 0,
        starred: message.starred || false,
        archived: message.archived || false,
        subject: message.subject || 'Sin asunto',
        messageId: message.id,
      });
    } else {
      const existing = conversationsMap.get(otherUserId);
      if (new Date(message.createdAt) > new Date(existing.lastMessageTime)) {
        existing.lastMessage = message.content || 'Sin mensaje';
        existing.lastMessageTime = message.createdAt || '';
        existing.subject = message.subject || 'Sin asunto';
        existing.messageId = message.id;
      }
      if (message.senderId !== user?.id && !message.read) {
        existing.unreadCount++;
      }
      if (message.starred) {
        existing.starred = true;
      }
      if (message.archived) {
        existing.archived = true;
      }
    }
  });

  const conversations = Array.from(conversationsMap.values());
  
  // Filtrar conversaciones
  let filteredConversations = conversations.filter((conv: any) => {
    const matchesSearch = (conv.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (conv.lastMessage || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (conv.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'unread' && conv.unreadCount > 0) ||
                         (filter === 'starred' && conv.starred) ||
                         (filter === 'archived' && conv.archived);
    
    return matchesSearch && matchesFilter;
  });

  // Ordenar conversaciones
  filteredConversations.sort((a: any, b: any) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      case 'sender':
        return (a.name || '').localeCompare(b.name || '');
      case 'subject':
        return (a.subject || '').localeCompare(b.subject || '');
      default:
        return 0;
    }
  });

  const handleConversationClick = (messageId: number) => {
    navigate(`/messages/${messageId}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, message: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedMessage(message);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMessage(null);
  };

  const handleMarkAsRead = () => {
    if (selectedMessage) {
      markAsRead(selectedMessage.messageId);
    }
    handleMenuClose();
  };

  const handleMarkAsUnread = () => {
    if (selectedMessage) {
      markAsUnread(selectedMessage.messageId);
    }
    handleMenuClose();
  };

  const handleStarMessage = () => {
    if (selectedMessage) {
      starMessage(selectedMessage.messageId);
    }
    handleMenuClose();
  };

  const handleArchive = () => {
    if (selectedMessage) {
      archiveConversation(selectedMessage.id);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedMessage && window.confirm('¿Estás seguro de que deseas eliminar este mensaje?')) {
      deleteMessage(selectedMessage.messageId);
    }
    handleMenuClose();
  };

  const handleReply = () => {
    if (selectedMessage) {
      navigate(`/messages/reply/${selectedMessage.messageId}`);
    }
    handleMenuClose();
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Error al cargar los mensajes: {error.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            Mensajes
          </Typography>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => navigate('/messages/new')}
          >
            Nuevo Mensaje
          </Button>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
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

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip
            label="Todos"
            onClick={() => setFilter('all')}
            color={filter === 'all' ? 'primary' : 'default'}
            variant={filter === 'all' ? 'filled' : 'outlined'}
          />
          <Chip
            label="No leídos"
            onClick={() => setFilter('unread')}
            color={filter === 'unread' ? 'primary' : 'default'}
            variant={filter === 'unread' ? 'filled' : 'outlined'}
          />
          <Chip
            label="Destacados"
            onClick={() => setFilter('starred')}
            color={filter === 'starred' ? 'primary' : 'default'}
            variant={filter === 'starred' ? 'filled' : 'outlined'}
          />
          <Chip
            label="Archivados"
            onClick={() => setFilter('archived')}
            color={filter === 'archived' ? 'primary' : 'default'}
            variant={filter === 'archived' ? 'filled' : 'outlined'}
          />
        </Box>

        <List>
          {filteredConversations.length === 0 ? (
            <ListItem>
              <ListItemText 
                primary="No hay mensajes" 
                secondary="No se encontraron mensajes con los filtros aplicados"
              />
            </ListItem>
          ) : (
            filteredConversations.map((conversation: any, index) => (
              <React.Fragment key={conversation.id}>
                <ListItem
                  button
                  onClick={() => handleConversationClick(conversation.messageId)}
                  sx={{
                    '&:hover': { bgcolor: 'action.hover' },
                    borderLeft: conversation.unreadCount > 0 ? '4px solid #1976d2' : 'none',
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={conversation.unreadCount}
                      color="error"
                      invisible={conversation.unreadCount === 0}
                    >
                      <Avatar src={conversation.avatar} alt={conversation.name} />
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: conversation.unreadCount > 0 ? 'bold' : 'normal',
                            flex: 1
                          }}
                        >
                          {conversation.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {conversation.starred && (
                            <StarIcon color="warning" fontSize="small" />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {conversation.lastMessageTime ? formatDateTime(conversation.lastMessageTime) : 'Fecha desconocida'}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontWeight: conversation.unreadCount > 0 ? 'bold' : 'normal',
                            mb: 0.5
                          }}
                        >
                          {conversation.subject}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {conversation.lastMessage}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Destacar">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            starMessage(conversation.messageId);
                          }}
                        >
                          {conversation.starred ? <StarIcon color="warning" /> : <StarBorderIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Más opciones">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, conversation)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < filteredConversations.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </List>

        {/* Menú de opciones */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleMarkAsRead}>
            <ListItemIcon>
              <MarkEmailReadIcon fontSize="small" />
            </ListItemIcon>
            Marcar como leído
          </MenuItem>
          <MenuItem onClick={handleMarkAsUnread}>
            <ListItemIcon>
              <MarkEmailUnreadIcon fontSize="small" />
            </ListItemIcon>
            Marcar como no leído
          </MenuItem>
          <MenuItem onClick={handleStarMessage}>
            <ListItemIcon>
              {selectedMessage?.starred ? <StarBorderIcon fontSize="small" /> : <StarIcon fontSize="small" />}
            </ListItemIcon>
            {selectedMessage?.starred ? 'Quitar destacado' : 'Destacar'}
          </MenuItem>
          <MenuItem onClick={handleReply}>
            <ListItemIcon>
              <ReplyIcon fontSize="small" />
            </ListItemIcon>
            Responder
          </MenuItem>
          <MenuItem onClick={handleArchive}>
            <ListItemIcon>
              <ArchiveIcon fontSize="small" />
            </ListItemIcon>
            {selectedMessage?.archived ? 'Desarchivar' : 'Archivar'}
          </MenuItem>
          <MenuItem onClick={handleDelete}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            Eliminar
          </MenuItem>
        </Menu>
      </Paper>
    </Container>
  );
};

export default MessageList; 