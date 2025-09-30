import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Divider,
  Alert,
  Fade,
  Chip,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Home as HomeIcon,
  Person as PersonIcon,
  CheckCircle as AcceptedIcon,
  Cancel as RejectedIcon,
  Schedule as PendingIcon,
  Visibility as ViewedIcon,
  Star as StarIcon,
  Clear as ClearIcon,
  MarkEmailRead as MarkReadIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

// Interfaces del backend MatchNotification
interface MatchNotification {
  id: string;
  notification_type: 'new_match_found' | 'match_request_received' | 'match_accepted' | 'match_rejected' | 'match_expired' | 'follow_up_reminder' | 'criteria_updated';
  title: string;
  message: string;
  is_read: boolean;
  is_sent: boolean;
  metadata: {
    match_code?: string;
    property_id?: string;
    property_title?: string;
    tenant_name?: string;
    landlord_name?: string;
    compatibility_score?: number;
    [key: string]: any;
  };
  match_request_code?: string;
  property_title?: string;
  time_since_created: string;
  created_at: string;
  read_at?: string;
  sent_at?: string;
}

interface MatchNotificationBellProps {
  notifications: MatchNotification[];
  isLoading?: boolean;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick?: (notification: MatchNotification) => void;
  onSettingsClick?: () => void;
  refreshNotifications?: () => void;
}

const MatchNotificationBell: React.FC<MatchNotificationBellProps> = ({
  notifications = [],
  isLoading = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  onSettingsClick,
  refreshNotifications,
}) => {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showAll, setShowAll] = useState(false);

  const isLandlord = user?.user_type === 'landlord';
  const isTenant = user?.user_type === 'tenant';

  // Filtrar notificaciones no leídas
  const unreadNotifications = notifications.filter(n => !n.is_read);
  const unreadCount = unreadNotifications.length;

  // Mostrar máximo 5 notificaciones en el dropdown
  const displayNotifications = showAll ? notifications : notifications.slice(0, 5);

  const getNotificationConfig = (type: string) => {
    switch (type) {
      case 'new_match_found':
        return {
          icon: <StarIcon fontSize="small" />,
          color: '#3b82f6',
          bgColor: '#dbeafe',
          title: 'Nuevo Match Encontrado',
        };
      case 'match_request_received':
        return {
          icon: <HomeIcon fontSize="small" />,
          color: '#f59e0b',
          bgColor: '#fef3c7',
          title: 'Nueva Solicitud',
        };
      case 'match_accepted':
        return {
          icon: <AcceptedIcon fontSize="small" />,
          color: '#10b981',
          bgColor: '#d1fae5',
          title: 'Solicitud Aceptada',
        };
      case 'match_rejected':
        return {
          icon: <RejectedIcon fontSize="small" />,
          color: '#ef4444',
          bgColor: '#fee2e2',
          title: 'Solicitud Rechazada',
        };
      case 'match_expired':
        return {
          icon: <PendingIcon fontSize="small" />,
          color: '#6b7280',
          bgColor: '#f3f4f6',
          title: 'Match Expirado',
        };
      case 'follow_up_reminder':
        return {
          icon: <ViewedIcon fontSize="small" />,
          color: '#8b5cf6',
          bgColor: '#ede9fe',
          title: 'Recordatorio',
        };
      case 'criteria_updated':
        return {
          icon: <SettingsIcon fontSize="small" />,
          color: '#059669',
          bgColor: '#ecfdf5',
          title: 'Criterios Actualizados',
        };
      default:
        return {
          icon: <NotificationsIcon fontSize="small" />,
          color: '#6b7280',
          bgColor: '#f3f4f6',
          title: 'Notificación',
        };
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    if (refreshNotifications) {
      refreshNotifications();
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setShowAll(false);
  };

  const handleNotificationClick = (notification: MatchNotification) => {
    // Marcar como leída si no lo está
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }

    // Ejecutar callback personalizado
    if (onNotificationClick) {
      onNotificationClick(notification);
    }

    handleMenuClose();
  };

  const handleMarkAllRead = () => {
    onMarkAllAsRead();
  };

  const formatTimeAgo = (timeString: string) => {
    return timeString; // Ya viene formateado del backend
  };

  const getNotificationPriority = (notification: MatchNotification) => {
    if (notification.notification_type === 'match_request_received' && isLandlord) {
      return 'high';
    }
    if (notification.notification_type === 'match_accepted' && isTenant) {
      return 'high';
    }
    if (notification.notification_type === 'new_match_found' && isTenant) {
      return 'medium';
    }
    return 'low';
  };

  // Auto-refresh cada 30 segundos si hay notificaciones no leídas
  useEffect(() => {
    if (unreadCount > 0 && refreshNotifications) {
      const interval = setInterval(refreshNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [unreadCount, refreshNotifications]);

  return (
    <>
      <Tooltip title={`${unreadCount} notificaciones no leídas`}>
        <IconButton
          color="inherit"
          onClick={handleMenuOpen}
          sx={{
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            invisible={unreadCount === 0}
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: '#ef4444',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.75rem',
              },
            }}
          >
            {unreadCount > 0 ? (
              <NotificationsIcon sx={{ color: '#f59e0b' }} />
            ) : (
              <NotificationsNoneIcon />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius-lg)',
            background: 'var(--color-surface)',
            boxShadow: 'var(--shadow-lg)',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid var(--color-border)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Notificaciones de Match
            </Typography>
            {isLoading && <CircularProgress size={16} />}
          </Box>
          
          {unreadCount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                {unreadCount} sin leer
              </Typography>
              <Button
                size="small"
                startIcon={<MarkReadIcon fontSize="small" />}
                onClick={handleMarkAllRead}
                sx={{
                  color: 'var(--color-primary)',
                  textTransform: 'none',
                  fontSize: '0.8rem',
                }}
              >
                Marcar todas como leídas
              </Button>
            </Box>
          )}
        </Box>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsNoneIcon
              sx={{
                fontSize: 48,
                color: 'var(--color-text-secondary)',
                mb: 1,
              }}
            />
            <Typography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 1 }}>
              No hay notificaciones
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
              Las notificaciones de match aparecerán aquí
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0, maxHeight: 300, overflow: 'auto' }}>
            {displayNotifications.map((notification, index) => {
              const config = getNotificationConfig(notification.notification_type);
              const priority = getNotificationPriority(notification);
              
              return (
                <Fade in={true} key={notification.id} timeout={300 + index * 100}>
                  <ListItem
                    button
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      borderBottom: index < displayNotifications.length - 1 ? '1px solid var(--color-border)' : 'none',
                      backgroundColor: !notification.is_read ? 'var(--color-primary-light)' : 'transparent',
                      '&:hover': {
                        backgroundColor: !notification.is_read ? 'var(--color-primary-light)' : 'var(--color-background)',
                      },
                      position: 'relative',
                    }}
                  >
                    {/* Priority Indicator */}
                    {priority === 'high' && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 4,
                          backgroundColor: '#ef4444',
                        }}
                      />
                    )}

                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          backgroundColor: config.bgColor,
                          color: config.color,
                          width: 36,
                          height: 36,
                        }}
                      >
                        {config.icon}
                      </Avatar>
                    </ListItemAvatar>

                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: !notification.is_read ? 600 : 500,
                              flex: 1,
                            }}
                          >
                            {notification.title}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                            {!notification.is_read && (
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--color-primary)',
                                }}
                              />
                            )}
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'var(--color-text-secondary)',
                                fontSize: '0.7rem',
                              }}
                            >
                              {formatTimeAgo(notification.time_since_created)}
                            </Typography>
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
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
                            {notification.message}
                          </Typography>
                          
                          {/* Match Code & Property Info */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            {notification.match_request_code && (
                              <Chip
                                label={notification.match_request_code}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  backgroundColor: 'var(--color-background)',
                                  border: '1px solid var(--color-border)',
                                }}
                              />
                            )}
                            
                            {notification.property_title && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'var(--color-text-secondary)',
                                  fontStyle: 'italic',
                                }}
                              >
                                {notification.property_title}
                              </Typography>
                            )}
                            
                            {notification.metadata.compatibility_score && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                <StarIcon sx={{ fontSize: 12, color: '#f59e0b' }} />
                                <Typography
                                  variant="caption"
                                  sx={{ color: 'var(--color-text-secondary)' }}
                                >
                                  {notification.metadata.compatibility_score}%
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      }
                    />

                    {/* Mark as Read Button */}
                    {!notification.is_read && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(notification.id);
                        }}
                        sx={{
                          color: 'var(--color-text-secondary)',
                          '&:hover': {
                            backgroundColor: 'var(--color-background)',
                          },
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    )}
                  </ListItem>
                </Fade>
              );
            })}
          </List>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <Box sx={{ p: 2, borderTop: '1px solid var(--color-border)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {notifications.length > 5 && !showAll && (
                <Button
                  size="small"
                  onClick={() => setShowAll(true)}
                  sx={{
                    color: 'var(--color-primary)',
                    textTransform: 'none',
                  }}
                >
                  Ver todas ({notifications.length})
                </Button>
              )}
              
              {onSettingsClick && (
                <Button
                  size="small"
                  startIcon={<SettingsIcon fontSize="small" />}
                  onClick={() => {
                    onSettingsClick();
                    handleMenuClose();
                  }}
                  sx={{
                    color: 'var(--color-text-secondary)',
                    textTransform: 'none',
                    ml: 'auto',
                  }}
                >
                  Configurar
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default MatchNotificationBell;