/**
 * ConversationsList - Lista de conversaciones activas
 * Muestra conversaciones aprobadas con chat en tiempo real
 */

import React from 'react';
import {
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Home as HomeIcon,
  Build as BuildIcon,
  Circle as CircleIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';

export interface Conversation {
  id: string;
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    user_type: 'landlord' | 'tenant' | 'service_provider';
    is_online?: boolean;
  }>;
  last_message: {
    content: string;
    sent_at: string;
    sender_id: string;
  };
  unread_count: number;
  context?: {
    type: 'property' | 'service';
    property?: {
      id: string;
      title: string;
      address?: string;
    };
    service?: {
      id: string;
      title: string;
      description?: string;
    };
  };
}

interface ConversationsListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onlineUsers: Map<string, any>;
  typingUsers: Array<{ userId: string; userName: string; threadId: string }>;
  searchTerm: string;
  onConversationSelect: (conversation: Conversation) => void;
}

export const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations,
  selectedConversation,
  onlineUsers,
  typingUsers,
  searchTerm,
  onConversationSelect,
}) => {
  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'landlord': return <HomeIcon fontSize="small" />;
      case 'tenant': return <PersonIcon fontSize="small" />;
      case 'service_provider': return <BuildIcon fontSize="small" />;
      default: return <PersonIcon fontSize="small" />;
    }
  };

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'landlord': return 'Propietario';
      case 'tenant': return 'Inquilino';
      case 'service_provider': return 'Proveedor';
      default: return 'Usuario';
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const participant = conv.participants[0];
    return participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           conv.last_message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (conv.context?.property?.title && conv.context.property.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
           (conv.context?.service?.title && conv.context.service.title.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  if (filteredConversations.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <ChatIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          {searchTerm ? 'No se encontraron conversaciones' : 'No hay conversaciones activas'}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {!searchTerm && 'Las conversaciones aparecerán aquí cuando aceptes solicitudes'}
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ p: 0 }}>
      {filteredConversations.map((conversation) => {
        const participant = conversation.participants[0];
        const isOnline = onlineUsers.get(participant.id)?.isOnline || participant.is_online;
        const isSelected = selectedConversation?.id === conversation.id;
        const isTyping = typingUsers.some(user => user.userId === participant.id);
        
        return (
          <ListItemButton
            key={conversation.id}
            selected={isSelected}
            onClick={() => onConversationSelect(conversation)}
            sx={{ 
              px: 2, 
              py: 1.5,
              '&.Mui-selected': {
                bgcolor: 'primary.light',
                '&:hover': {
                  bgcolor: 'primary.light',
                }
              }
            }}
          >
            <ListItemAvatar>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  isOnline ? (
                    <CircleIcon sx={{ color: 'success.main', fontSize: 12 }} />
                  ) : null
                }
              >
                <Avatar>
                  {participant.avatar ? (
                    <img src={participant.avatar} alt={participant.name} />
                  ) : (
                    participant.name[0]
                  )}
                </Avatar>
              </Badge>
            </ListItemAvatar>
            
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: conversation.unread_count > 0 ? 600 : 400,
                      color: isSelected ? 'primary.contrastText' : 'inherit'
                    }}
                  >
                    {participant.name}
                  </Typography>
                  <Chip
                    icon={getUserTypeIcon(participant.user_type)}
                    label={getUserTypeLabel(participant.user_type)}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      height: 18, 
                      fontSize: '0.6rem',
                      opacity: isSelected ? 0.8 : 1
                    }}
                  />
                  {conversation.unread_count > 0 && (
                    <Badge 
                      badgeContent={conversation.unread_count} 
                      color="primary"
                      sx={{ ml: 'auto' }}
                    />
                  )}
                </Box>
              }
              secondary={
                <Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: conversation.unread_count > 0 ? 500 : 400,
                      color: isSelected ? 'primary.contrastText' : 'text.secondary',
                      opacity: isSelected ? 0.8 : 1,
                      mb: 0.5
                    }}
                  >
                    {isTyping ? (
                      <em>escribiendo...</em>
                    ) : (
                      conversation.last_message.content
                    )}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: isSelected ? 'primary.contrastText' : 'text.secondary',
                        opacity: isSelected ? 0.7 : 1
                      }}
                    >
                      {conversation.context?.type === 'property' ? '🏠' : '🔧'} {' '}
                      {conversation.context?.property?.title || conversation.context?.service?.title}
                    </Typography>
                    
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: isSelected ? 'primary.contrastText' : 'text.secondary',
                        opacity: isSelected ? 0.7 : 1
                      }}
                    >
                      {new Date(conversation.last_message.sent_at).toLocaleDateString('es-ES', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </ListItemButton>
        );
      })}
    </List>
  );
};