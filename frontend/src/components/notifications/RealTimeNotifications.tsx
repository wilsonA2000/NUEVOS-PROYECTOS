/**
 * RealTimeNotifications - Real-time notification system
 * Displays and manages live notifications via WebSocket
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Badge,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Button,
  Divider,
  Avatar,
  Chip,
  Alert,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Message as MessageIcon,
  Home as PropertyIcon,
  Payment as PaymentIcon,
  Assignment as ContractIcon,
  Star as RatingIcon,
  Person as UserIcon,
  Close as CloseIcon,
  MarkEmailRead as MarkReadIcon,
  DeleteSweep as ClearAllIcon,
} from '@mui/icons-material';
import { useNotifications } from '../../hooks/useWebSocketEnhanced';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-toastify';

interface Notification {
  id: string;
  type: 'message' | 'property' | 'payment' | 'contract' | 'rating' | 'user' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: {
    user_id?: string;
    property_id?: string;
    contract_id?: string;
    payment_id?: string;
    thread_id?: string;
    [key: string]: any;
  };
  actions?: {
    label: string;
    action: string;
    url?: string;
  }[];
}

interface RealTimeNotificationsProps {
  maxDisplayCount?: number;
  autoMarkReadDelay?: number;
}

const RealTimeNotifications: React.FC<RealTimeNotificationsProps> = ({
  maxDisplayCount = 50,
  autoMarkReadDelay = 5000,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // WebSocket connection for notifications
  const {
    isConnected,
    send,
    subscribe,
    connectionStatus,
  } = useNotifications({
    onConnectionChange: (status) => {
      if (status.connected) {
        // Request pending notifications on connect
        send({
          type: 'get_notifications',
          data: { limit: maxDisplayCount },
        });
      }
    },
  });

  // Handle incoming notifications
  useEffect(() => {
    const unsubscribeNewNotification = subscribe('new_notification', (message) => {
      const notification: Notification = {
        id: message.data.id,
        type: message.data.type,
        title: message.data.title,
        message: message.data.message,
        timestamp: message.data.timestamp,
        read: false,
        priority: message.data.priority || 'medium',
        data: message.data.data,
        actions: message.data.actions,
      };

      setNotifications(prev => {
        const updated = [notification, ...prev];
        return updated.slice(0, maxDisplayCount);
      });

      // Show toast for high priority notifications
      if (notification.priority === 'high' || notification.priority === 'urgent') {
        toast.info(notification.title, {
          onClick: () => setDrawerOpen(true),
        });
      }

      // Auto-mark as read after delay for low priority
      if (notification.priority === 'low' && autoMarkReadDelay > 0) {
        setTimeout(() => {
          markAsRead(notification.id);
        }, autoMarkReadDelay);
      }
    });

    const unsubscribeNotificationRead = subscribe('notification_read', (message) => {
      const { notification_id } = message.data;
      
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notification_id ? { ...notif, read: true } : notif
        )
      );
    });

    const unsubscribeNotificationsList = subscribe('notifications_list', (message) => {
      const { notifications: notificationsList } = message.data;
      
      setNotifications(notificationsList.slice(0, maxDisplayCount));
    });

    return () => {
      unsubscribeNewNotification();
      unsubscribeNotificationRead();
      unsubscribeNotificationsList();
    };
  }, [subscribe, maxDisplayCount, autoMarkReadDelay]);

  // Update unread count
  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    if (isConnected) {
      send({
        type: 'mark_notification_read',
        data: { notification_id: notificationId },
      });
    }
  }, [isConnected, send]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    if (isConnected) {
      send({
        type: 'mark_all_notifications_read',
        data: {},
      });
    }
  }, [isConnected, send]);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    if (isConnected) {
      send({
        type: 'clear_all_notifications',
        data: {},
      });
      setNotifications([]);
    }
  }, [isConnected, send]);

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Handle action based on notification type
    if (notification.data?.url) {
      window.open(notification.data.url, '_blank');
    } else {
      // Default navigation based on type
      switch (notification.type) {
        case 'message':
          if (notification.data?.thread_id) {
            window.location.href = `/app/messages/${notification.data.thread_id}`;
          }
          break;
        case 'property':
          if (notification.data?.property_id) {
            window.location.href = `/app/properties/${notification.data.property_id}`;
          }
          break;
        case 'contract':
          if (notification.data?.contract_id) {
            window.location.href = `/app/contracts/${notification.data.contract_id}`;
          }
          break;
        case 'payment':
          if (notification.data?.payment_id) {
            window.location.href = `/app/payments/${notification.data.payment_id}`;
          }
          break;
        default:
          // No specific action
          break;
      }
    }
  };

  // Get icon for notification type
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'message': return <MessageIcon />;
      case 'property': return <PropertyIcon />;
      case 'payment': return <PaymentIcon />;
      case 'contract': return <ContractIcon />;
      case 'rating': return <RatingIcon />;
      case 'user': return <UserIcon />;
      default: return <NotificationsIcon />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  return (
    <>
      {/* Notification Bell */}
      <IconButton
        onClick={() => setDrawerOpen(true)}
        color="inherit"
        sx={{ position: 'relative' }}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      {/* Notifications Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { width: 400, maxWidth: '90vw' },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Notificaciones
            </Typography>
            
            <Box display="flex" gap={1}>
              {unreadCount > 0 && (
                <Button
                  size="small"
                  startIcon={<MarkReadIcon />}
                  onClick={markAllAsRead}
                >
                  Marcar todo
                </Button>
              )}
              
              <IconButton
                size="small"
                onClick={clearAllNotifications}
                title="Limpiar todo"
              >
                <ClearAllIcon />
              </IconButton>
              
              <IconButton
                size="small"
                onClick={() => setDrawerOpen(false)}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Connection Status */}
          <Chip
            size="small"
            label={isConnected ? 'Conectado' : 'Desconectado'}
            color={isConnected ? 'success' : 'error'}
            variant="outlined"
            sx={{ mb: 2 }}
          />
        </Box>

        <Divider />

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No tienes notificaciones
            </Typography>
          </Box>
        ) : (
          <List sx={{ flexGrow: 1, overflow: 'auto' }}>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                button
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  backgroundColor: notification.read ? 'transparent' : 'action.hover',
                  borderLeft: 4,
                  borderLeftColor: notification.read 
                    ? 'transparent' 
                    : `${getPriorityColor(notification.priority)}.main`,
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                }}
              >
                <ListItemIcon>
                  <Avatar
                    sx={{
                      backgroundColor: `${getPriorityColor(notification.priority)}.main`,
                      width: 40,
                      height: 40,
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: notification.read ? 'normal' : 'bold',
                          lineHeight: 1.2,
                        }}
                      >
                        {notification.title}
                      </Typography>
                      
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1, flexShrink: 0 }}
                      >
                        {formatDistanceToNow(new Date(notification.timestamp), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mt: 0.5,
                      }}
                    >
                      {notification.message}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        {!isConnected && (
          <Alert severity="warning" sx={{ m: 2 }}>
            Sin conexión. Las notificaciones pueden no estar actualizadas.
          </Alert>
        )}
      </Drawer>
    </>
  );
};

export default RealTimeNotifications;