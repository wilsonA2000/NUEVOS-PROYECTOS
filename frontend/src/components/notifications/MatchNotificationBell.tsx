import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Home as HomeIcon,
  Person as PersonIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Star as StarIcon,
  AccessTime as TimeIcon,
  MarkEmailRead as MarkReadIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface MatchNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  match_request?: {
    id: string;
    match_code: string;
    property: {
      title: string;
      city: string;
    };
    tenant: {
      first_name: string;
      last_name: string;
    };
    compatibility_score?: number;
  };
  metadata?: {
    thread_id?: string;
    property_id?: string;
    compatibility_score?: number;
  };
}

interface MatchNotificationBellProps {
  onNotificationClick?: (notification: MatchNotification) => void;
  onMarkAllRead?: () => void;
}

const MatchNotificationBell: React.FC<MatchNotificationBellProps> = ({
  onNotificationClick,
  onMarkAllRead
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<MatchNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/matching/api/notifications/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.results || data);
        setUnreadCount(data.results?.filter((n: MatchNotification) => !n.is_read).length || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Polling para actualizaciones en tiempo real
    const interval = setInterval(fetchNotifications, 30000); // Cada 30 segundos
    
    return () => clearInterval(interval);
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: MatchNotification) => {
    // Marcar como leída si no lo está
    if (!notification.is_read) {
      try {
        await fetch(`/api/v1/matching/api/notifications/${notification.id}/mark_as_read/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        // Actualizar estado local
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id 
              ? { ...n, is_read: true }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    onNotificationClick?.(notification);
    handleClose();
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/v1/matching/api/notifications/mark_all_read/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      onMarkAllRead?.();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'match_request_received':
        return <PersonIcon sx={{ color: 'primary.main' }} />;
      case 'match_accepted':
        return <CheckIcon sx={{ color: 'success.main' }} />;
      case 'match_rejected':
        return <CloseIcon sx={{ color: 'error.main' }} />;
      case 'new_match_found':
        return <StarIcon sx={{ color: 'warning.main' }} />;
      case 'match_expired':
        return <TimeIcon sx={{ color: 'grey.500' }} />;
      default:
        return <HomeIcon sx={{ color: 'info.main' }} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'match_request_received':
        return 'primary';
      case 'match_accepted':
        return 'success';
      case 'match_rejected':
        return 'error';
      case 'new_match_found':
        return 'warning';
      case 'match_expired':
        return 'default';
      default:
        return 'info';
    }
  };

  const formatNotificationTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: es
    });
  };

  return (
    <>
      <Tooltip title="Notificaciones de Matching">
        <IconButton
          color="inherit"
          onClick={handleClick}
          sx={{
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            overflow: 'auto'
          }
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Notificaciones de Matching
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                startIcon={<MarkReadIcon />}
                onClick={handleMarkAllRead}
              >
                Marcar todo como leído
              </Button>
            )}
          </Box>
          {unreadCount > 0 && (
            <Typography variant="body2" color="text.secondary">
              {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''} sin leer
            </Typography>
          )}
        </Box>

        {/* Lista de notificaciones */}
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">Cargando notificaciones...</Typography>
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">No hay notificaciones</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.slice(0, 10).map((notification) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  button
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    backgroundColor: notification.is_read ? 'transparent' : 'action.hover',
                    '&:hover': {
                      backgroundColor: 'action.selected'
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'background.paper' }}>
                      {getNotificationIcon(notification.notification_type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: notification.is_read ? 'normal' : 'bold',
                            flex: 1
                          }}
                        >
                          {notification.title}
                        </Typography>
                        <Chip
                          size="small"
                          label={getNotificationColor(notification.notification_type)}
                          color={getNotificationColor(notification.notification_type) as any}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: '0.85rem',
                            lineHeight: 1.3,
                            mb: 0.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {notification.message}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatNotificationTime(notification.created_at)}
                          </Typography>
                          {notification.metadata?.compatibility_score && (
                            <Chip
                              size="small"
                              label={`${notification.metadata.compatibility_score}% compatible`}
                              color="success"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}

        {/* Footer */}
        {notifications.length > 10 && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
            <Button size="small" color="primary">
              Ver todas las notificaciones
            </Button>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default MatchNotificationBell;