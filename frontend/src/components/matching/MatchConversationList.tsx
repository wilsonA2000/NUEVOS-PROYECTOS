import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  Chip,
  Divider,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  Skeleton
} from '@mui/material';
import {
  Message as MessageIcon,
  Home as HomeIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon,
  Star as StarIcon,
  Archive as ArchiveIcon,
  VolumeOff as MuteIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface MatchConversation {
  id: string;
  subject: string;
  thread_type: string;
  status: string;
  is_priority: boolean;
  property?: {
    id: string;
    title: string;
    city: string;
    rent_price: number;
  };
  other_participant: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_type: string;
  };
  last_message?: {
    id: string;
    content: string;
    sent_at: string;
    sender: {
      first_name: string;
      last_name: string;
    };
  };
  unread_count: number;
  created_at: string;
  last_message_at: string;
  participant_data: {
    is_archived: boolean;
    is_muted: boolean;
    is_starred: boolean;
  };
}

interface MatchConversationListProps {
  onConversationSelect?: (conversation: MatchConversation) => void;
  onStartNewConversation?: () => void;
}

const MatchConversationList: React.FC<MatchConversationListProps> = ({
  onConversationSelect,
  onStartNewConversation
}) => {
  const [conversations, setConversations] = useState<MatchConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; conversationId: string } | null>(null);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/v1/messages/threads/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filtrar solo conversaciones relacionadas con matching/propiedades
        const matchConversations = (data.results || data).filter(
          (conv: MatchConversation) => conv.thread_type === 'inquiry' && conv.property
        );
        setConversations(matchConversations);
      } else {
        setError('Error al cargar las conversaciones');
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    
    // Actualizar cada minuto
    const interval = setInterval(fetchConversations, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleConversationClick = (conversation: MatchConversation) => {
    setSelectedConversation(conversation.id);
    onConversationSelect?.(conversation);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, conversationId: string) => {
    event.stopPropagation();
    setMenuAnchor({ element: event.currentTarget, conversationId });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleMenuAction = async (action: string, conversationId: string) => {
    try {
      const endpoint = `/api/v1/messages/threads/${conversationId}/${action}/`;
      
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      // Actualizar la lista
      fetchConversations();
    } catch (error) {
      console.error(`Error with action ${action}:`, error);
    } finally {
      handleMenuClose();
    }
  };

  const formatLastMessageTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: es
    });
  };

  const getParticipantTypeLabel = (userType: string) => {
    switch (userType) {
      case 'landlord':
        return 'Arrendador';
      case 'tenant':
        return 'Arrendatario';
      case 'service_provider':
        return 'Proveedor';
      default:
        return 'Usuario';
    }
  };

  const truncateMessage = (message: string, maxLength: number = 100) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Conversaciones de Matching
          </Typography>
          <List>
            {[...Array(3)].map((_, index) => (
              <ListItem key={index}>
                <ListItemAvatar>
                  <Skeleton variant="circular" width={40} height={40} />
                </ListItemAvatar>
                <ListItemText
                  primary={<Skeleton variant="text" width="60%" />}
                  secondary={<Skeleton variant="text" width="80%" />}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" action={
            <Button color="inherit" size="small" onClick={fetchConversations}>
              Reintentar
            </Button>
          }>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Conversaciones de Matching
          </Typography>
          <Button
            variant="outlined"
            startIcon={<MessageIcon />}
            onClick={onStartNewConversation}
            size="small"
          >
            Nueva conversación
          </Button>
        </Box>

        {conversations.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <MessageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No tienes conversaciones de matching activas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Las conversaciones aparecerán aquí cuando aceptes o envíes solicitudes de match
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {conversations.map((conversation) => (
              <React.Fragment key={conversation.id}>
                <ListItem
                  button
                  selected={selectedConversation === conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      '&:hover': {
                        backgroundColor: 'primary.light'
                      }
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={conversation.unread_count}
                      color="error"
                      invisible={conversation.unread_count === 0}
                    >
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {conversation.other_participant.user_type === 'landlord' ? (
                          <HomeIcon />
                        ) : (
                          <PersonIcon />
                        )}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: conversation.unread_count > 0 ? 'bold' : 'normal',
                            flex: 1
                          }}
                        >
                          {conversation.other_participant.first_name} {conversation.other_participant.last_name}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {conversation.participant_data.is_starred && (
                            <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                          )}
                          {conversation.participant_data.is_muted && (
                            <MuteIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          )}
                          {conversation.is_priority && (
                            <Chip
                              label="Prioridad"
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="primary" gutterBottom>
                          📍 {conversation.property?.title} - {conversation.property?.city}
                          <Chip
                            label={`$${conversation.property?.rent_price?.toLocaleString()}/mes`}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {getParticipantTypeLabel(conversation.other_participant.user_type)}
                        </Typography>

                        {conversation.last_message && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                fontWeight: conversation.unread_count > 0 ? 'medium' : 'normal',
                                fontSize: '0.85rem',
                                flex: 1
                              }}
                            >
                              {conversation.last_message.sender.first_name}: {truncateMessage(conversation.last_message.content)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              {formatLastMessageTime(conversation.last_message.sent_at)}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    }
                  />

                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, conversation.id)}
                    sx={{ ml: 1 }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>

      {/* Menu contextual */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleMenuAction('star', menuAnchor!.conversationId)}>
          <StarIcon sx={{ mr: 1 }} />
          Destacar
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('archive', menuAnchor!.conversationId)}>
          <ArchiveIcon sx={{ mr: 1 }} />
          Archivar
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('mute', menuAnchor!.conversationId)}>
          <MuteIcon sx={{ mr: 1 }} />
          Silenciar
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleMenuAction('delete', menuAnchor!.conversationId)}>
          <DeleteIcon sx={{ mr: 1, color: 'error.main' }} />
          Eliminar
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default MatchConversationList;