/**
 * PendingRequestsList - Lista de solicitudes pendientes de aprobación
 * Maneja solicitudes de inquilinos y proveedores de servicios
 */

import React from 'react';
import {
  List,
  ListItem,
  Box,
  Avatar,
  Typography,
  Chip,
  Button,
  Badge,
  Divider,
} from '@mui/material';
import {
  Person as PersonIcon,
  Home as HomeIcon,
  Build as BuildIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';

export interface PendingRequest {
  id: string;
  type: 'property_interest' | 'service_request';
  sender: {
    id: string;
    name: string;
    avatar?: string;
    email: string;
    phone: string;
    user_type: 'tenant' | 'service_provider';
    [key: string]: any;
  };
  property?: {
    id: string;
    title: string;
    address: string;
    rent: number;
  };
  service?: {
    id: string;
    title: string;
    description: string;
    budget: number;
  };
  message: string;
  sent_at: string;
  is_read: boolean;
}

interface PendingRequestsListProps {
  requests: PendingRequest[];
  onlineUsers: Map<string, any>;
  searchTerm: string;
  onRequestAction: (requestId: string, action: 'accept' | 'reject') => void;
  onRequestView: (request: PendingRequest) => void;
}

export const PendingRequestsList: React.FC<PendingRequestsListProps> = ({
  requests,
  onlineUsers,
  searchTerm,
  onRequestAction,
  onRequestView,
}) => {
  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'tenant': return <PersonIcon fontSize="small" />;
      case 'service_provider': return <BuildIcon fontSize="small" />;
      default: return <PersonIcon fontSize="small" />;
    }
  };

  const getRequestTypeColor = (type: string) => {
    switch (type) {
      case 'property_interest': return 'primary';
      case 'service_request': return 'secondary';
      default: return 'default';
    }
  };

  const filteredRequests = requests.filter(request => 
    request.sender.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (request.property?.title && request.property.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (request.service?.title && request.service.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (filteredRequests.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <HomeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          {searchTerm ? 'No se encontraron solicitudes' : 'No hay solicitudes pendientes'}
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ p: 0 }}>
      {filteredRequests.map((request) => {
        const isOnline = onlineUsers.get(request.sender.id)?.isOnline;
        
        return (
          <React.Fragment key={request.id}>
            <ListItem sx={{ px: 2, py: 1.5, flexDirection: 'column', alignItems: 'stretch' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', mb: 1 }}>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    isOnline ? (
                      <CircleIcon sx={{ color: 'success.main', fontSize: 12 }} />
                    ) : null
                  }
                >
                  <Avatar sx={{ mr: 2, cursor: 'pointer' }} onClick={() => onRequestView(request)}>
                    {request.sender.avatar ? (
                      <img src={request.sender.avatar} alt={request.sender.name} />
                    ) : (
                      request.sender.name[0]
                    )}
                  </Avatar>
                </Badge>
                
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => onRequestView(request)}
                    >
                      {request.sender.name}
                    </Typography>
                    <Chip
                      icon={getUserTypeIcon(request.sender.user_type)}
                      label={request.sender.user_type === 'tenant' ? 'Inquilino' : 'Proveedor'}
                      size="small"
                      color={getRequestTypeColor(request.type)}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                    {!request.is_read && (
                      <Badge color="error" variant="dot" />
                    )}
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    {request.type === 'property_interest' ? (
                      <>📍 {request.property?.title}</>
                    ) : (
                      <>🔧 {request.service?.title}</>
                    )}
                  </Typography>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      mb: 1,
                      fontWeight: request.is_read ? 400 : 500
                    }}
                  >
                    {request.message}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(request.sent_at).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                    
                    {request.type === 'property_interest' && request.property && (
                      <Typography variant="caption" color="primary" sx={{ fontWeight: 500 }}>
                        ${request.property.rent.toLocaleString()}/mes
                      </Typography>
                    )}
                    
                    {request.type === 'service_request' && request.service && (
                      <Typography variant="caption" color="secondary" sx={{ fontWeight: 500 }}>
                        ${request.service.budget.toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() => onRequestAction(request.id, 'accept')}
                  sx={{ flex: 1 }}
                >
                  Aceptar
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onRequestView(request)}
                  sx={{ flex: 1 }}
                >
                  Ver Perfil
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => onRequestAction(request.id, 'reject')}
                >
                  ❌
                </Button>
              </Box>
            </ListItem>
            <Divider />
          </React.Fragment>
        );
      })}
    </List>
  );
};