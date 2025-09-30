import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  IconButton,
  Badge,
  TextField,
  InputAdornment,
  CircularProgress,
  Button,
  Alert,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Message as MessageIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as AcceptedIcon,
  Cancel as RejectedIcon,
  Schedule as PendingIcon,
  Visibility as ViewedIcon,
  Star as StarIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

// Interfaces del backend
interface MatchConversation {
  id: string;
  match_code: string;
  status: 'pending' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  property: {
    id: string;
    title: string;
    city: string;
    rent_price: number;
    property_type: string;
    main_image?: string;
  };
  tenant: {
    id: string;
    name: string;
    email: string;
    user_type: string;
  };
  landlord: {
    id: string;
    name: string;
    email: string;
    user_type: string;
  };
  tenant_message: string;
  landlord_response?: string;
  compatibility_score?: number;
  last_message?: {
    content: string;
    timestamp: string;
    sender_type: 'tenant' | 'landlord';
  };
  unread_count: number;
  created_at: string;
  viewed_at?: string;
  responded_at?: string;
  expires_at?: string;
}

interface MatchConversationListProps {
  conversations: MatchConversation[];
  isLoading?: boolean;
  onConversationSelect: (conversation: MatchConversation) => void;
  onStatusChange?: (matchCode: string, newStatus: string) => void;
  selectedConversationId?: string;
}

const MatchConversationList: React.FC<MatchConversationListProps> = ({
  conversations = [],
  isLoading = false,
  onConversationSelect,
  onStatusChange,
  selectedConversationId,
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedConversation, setSelectedConversation] = useState<MatchConversation | null>(null);

  const isLandlord = user?.user_type === 'landlord';
  const isTenant = user?.user_type === 'tenant';

  const statusTabs = [
    { label: 'Todas', value: 'all', count: conversations.length },
    { label: 'Pendientes', value: 'pending', count: conversations.filter(c => c.status === 'pending').length },
    { label: 'Vistas', value: 'viewed', count: conversations.filter(c => c.status === 'viewed').length },
    { label: 'Aceptadas', value: 'accepted', count: conversations.filter(c => c.status === 'accepted').length },
    { label: 'Rechazadas', value: 'rejected', count: conversations.filter(c => c.status === 'rejected').length },
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: '#f59e0b',
          bgColor: '#fef3c7',
          label: 'Pendiente',
          icon: <PendingIcon fontSize="small" />,
        };
      case 'viewed':
        return {
          color: '#3b82f6',
          bgColor: '#dbeafe',
          label: 'Vista',
          icon: <ViewedIcon fontSize="small" />,
        };
      case 'accepted':
        return {
          color: '#10b981',
          bgColor: '#d1fae5',
          label: 'Aceptada',
          icon: <AcceptedIcon fontSize="small" />,
        };
      case 'rejected':
        return {
          color: '#ef4444',
          bgColor: '#fee2e2',
          label: 'Rechazada',
          icon: <RejectedIcon fontSize="small" />,
        };
      case 'expired':
        return {
          color: '#6b7280',
          bgColor: '#f3f4f6',
          label: 'Expirada',
          icon: <CalendarIcon fontSize="small" />,
        };
      default:
        return {
          color: '#6b7280',
          bgColor: '#f3f4f6',
          label: status,
          icon: <PendingIcon fontSize="small" />,
        };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#ca8a04';
      case 'low':
        return '#059669';
      default:
        return '#6b7280';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes <= 1 ? 'Ahora' : `${diffMinutes}m`;
      }
      return `${diffHours}h`;
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return `${diffDays}d`;
    } else {
      return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    }
  };

  const getPreviewMessage = (conversation: MatchConversation) => {
    if (conversation.last_message) {
      return conversation.last_message.content;
    }
    
    if (conversation.landlord_response && isLandlord) {
      return `Tú: ${conversation.landlord_response}`;
    }
    
    if (conversation.landlord_response && isTenant) {
      return conversation.landlord_response;
    }
    
    return conversation.tenant_message;
  };

  const filteredConversations = conversations.filter(conversation => {
    // Filtro por tab
    if (selectedTab > 0) {
      const tabValue = statusTabs[selectedTab].value;
      if (conversation.status !== tabValue) return false;
    }

    // Filtro por búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        conversation.property.title.toLowerCase().includes(searchLower) ||
        conversation.property.city.toLowerCase().includes(searchLower) ||
        conversation.tenant.name.toLowerCase().includes(searchLower) ||
        conversation.landlord.name.toLowerCase().includes(searchLower) ||
        conversation.match_code.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, conversation: MatchConversation) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedConversation(conversation);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedConversation(null);
  };

  const handleStatusChange = (newStatus: string) => {
    if (selectedConversation && onStatusChange) {
      onStatusChange(selectedConversation.match_code, newStatus);
    }
    handleMenuClose();
  };

  if (isLoading) {
    return (
      <Card
        elevation={0}
        sx={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius-lg)',
          height: '600px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Card>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card
        elevation={0}
        sx={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius-lg)',
          height: '600px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <MessageIcon
            sx={{
              fontSize: 64,
              color: 'var(--color-text-secondary)',
              mb: 2,
            }}
          />
          <Typography variant="h6" sx={{ color: 'var(--color-text-secondary)', mb: 1 }}>
            No hay conversaciones de match
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
            {isTenant
              ? 'Envía solicitudes de match para comenzar conversaciones'
              : 'Las solicitudes de match aparecerán aquí'
            }
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card
      elevation={0}
      sx={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius-lg)',
        height: '600px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid var(--color-border)' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Conversaciones de Match
          </Typography>

          {/* Search */}
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar conversaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'var(--color-text-secondary)' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 'var(--border-radius-md)',
                backgroundColor: 'var(--color-background)',
              },
            }}
          />

          {/* Status Tabs */}
          <Tabs
            value={selectedTab}
            onChange={(_, newValue) => setSelectedTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              mt: 2,
              '& .MuiTab-root': {
                minWidth: 'auto',
                textTransform: 'none',
              },
            }}
          >
            {statusTabs.map((tab, index) => (
              <Tab
                key={tab.value}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {tab.label}
                    {tab.count > 0 && (
                      <Chip
                        label={tab.count}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.75rem',
                          backgroundColor: 'var(--color-primary)',
                          color: 'white',
                        }}
                      />
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        {/* Conversations List */}
        <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
          {filteredConversations.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                No se encontraron conversaciones
              </Typography>
            </Box>
          ) : (
            filteredConversations.map((conversation) => {
              const statusConfig = getStatusConfig(conversation.status);
              const otherUser = isTenant ? conversation.landlord : conversation.tenant;
              const isSelected = conversation.id === selectedConversationId;

              return (
                <ListItem
                  key={conversation.id}
                  button
                  onClick={() => onConversationSelect(conversation)}
                  selected={isSelected}
                  sx={{
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: isSelected ? 'var(--color-primary-light)' : 'transparent',
                    '&:hover': {
                      backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-background)',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'var(--color-primary-light)',
                      '&:hover': {
                        backgroundColor: 'var(--color-primary-light)',
                      },
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={conversation.unread_count}
                      color="error"
                      invisible={conversation.unread_count === 0}
                    >
                      <Avatar
                        sx={{
                          bgcolor: 'var(--color-primary)',
                          width: 48,
                          height: 48,
                        }}
                      >
                        {isTenant ? <HomeIcon /> : <PersonIcon />}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: conversation.unread_count > 0 ? 600 : 500,
                            flex: 1,
                          }}
                        >
                          {isTenant ? conversation.property.title : otherUser.name}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {conversation.priority !== 'medium' && (
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: getPriorityColor(conversation.priority),
                              }}
                            />
                          )}
                          
                          <Chip
                            icon={statusConfig.icon}
                            label={statusConfig.label}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              backgroundColor: statusConfig.bgColor,
                              color: statusConfig.color,
                            }}
                          />
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'var(--color-text-secondary)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            mb: 0.5,
                          }}
                        >
                          {getPreviewMessage(conversation)}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isTenant && (
                              <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                                {conversation.property.city} • {formatCurrency(conversation.property.rent_price)}
                              </Typography>
                            )}
                            
                            {conversation.compatibility_score && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                <StarIcon sx={{ fontSize: 12, color: '#f59e0b' }} />
                                <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                                  {conversation.compatibility_score}%
                                </Typography>
                              </Box>
                            )}
                          </Box>
                          
                          <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                            {formatDate(conversation.last_message?.timestamp || conversation.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />

                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => handleMenuOpen(e, conversation)}
                      sx={{ color: 'var(--color-text-secondary)' }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })
          )}
        </List>

        {/* Status Summary */}
        <Box sx={{ p: 2, borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)' }}>
          <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
            {filteredConversations.length} de {conversations.length} conversaciones
          </Typography>
        </Box>
      </CardContent>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius-md)',
          },
        }}
      >
        {isLandlord && selectedConversation?.status === 'pending' && [
          <MenuItem key="mark-viewed" onClick={() => handleStatusChange('viewed')}>
            <ViewedIcon sx={{ mr: 1 }} fontSize="small" />
            Marcar como vista
          </MenuItem>,
          <MenuItem key="accept" onClick={() => handleStatusChange('accepted')}>
            <AcceptedIcon sx={{ mr: 1 }} fontSize="small" />
            Aceptar solicitud
          </MenuItem>,
          <MenuItem key="reject" onClick={() => handleStatusChange('rejected')}>
            <RejectedIcon sx={{ mr: 1 }} fontSize="small" />
            Rechazar solicitud
          </MenuItem>,
        ]}
        
        <MenuItem onClick={() => onConversationSelect(selectedConversation!)}>
          <MessageIcon sx={{ mr: 1 }} fontSize="small" />
          Abrir conversación
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default MatchConversationList;