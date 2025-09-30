/**
 * PushNotificationCenter - Advanced push notification system
 * Handles browser notifications, toast notifications, and notification center
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Badge,
  IconButton,
  Drawer,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Button,
  Chip,
  Avatar,
  Divider,
  Tab,
  Tabs,
  Alert,
  Switch,
  FormControlLabel,
  Snackbar,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Message as MessageIcon,
  Home as PropertyIcon,
  Payment as PaymentIcon,
  Assignment as ContractIcon,
  Star as RatingIcon,
  Person as UserIcon,
  Settings as SettingsIcon,
  MarkEmailRead as MarkReadIcon,
  DeleteSweep as ClearAllIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
// Removed WebSocket dependency
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-toastify';

interface Notification {
  id: string;
  type: 'message' | 'property' | 'payment' | 'contract' | 'rating' | 'user' | 'system';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: {
    user_id?: string;
    property_id?: string;
    thread_id?: string;
    payment_id?: string;
    contract_id?: string;
    rating_id?: string;
    url?: string;
  };
  actions?: Array<{
    label: string;
    action: string;
    data?: any;
  }>;
}

interface PushNotificationCenterProps {
  /** Maximum number of notifications to keep */
  maxNotifications?: number;
  /** Auto-clear notifications after this many ms */
  autoClearAfter?: number;
  /** Enable sound notifications */
  enableSound?: boolean;
}

export const PushNotificationCenter: React.FC<PushNotificationCenterProps> = ({
  maxNotifications = 100,
  autoClearAfter = 24 * 60 * 60 * 1000, // 24 hours
  enableSound = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(enableSound);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');

  // No WebSocket dependency - static offline status
  const isConnected = false;
  const subscribe = () => () => {};

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionState(Notification.permission);
      setPushEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Auto-clear old notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNotifications(prev => 
        prev.filter(notif => 
          now - new Date(notif.timestamp).getTime() < autoClearAfter
        )
      );
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [autoClearAfter]);

  // WebSocket handlers removed - notifications work without WebSocket

  const handleIncomingNotification = useCallback((message: any) => {
    const notification: Notification = {
      id: message.data.id || Date.now().toString(),
      type: message.data.type || 'system',
      title: message.data.title || 'Nueva notificación',
      body: message.data.body || message.data.message || '',
      timestamp: message.data.timestamp || new Date().toISOString(),
      read: false,
      priority: message.data.priority || 'medium',
      data: message.data,
      actions: message.data.actions,
    };

    addNotification(notification);
  }, []);

  const handleMessageNotification = useCallback((message: any) => {
    const notification: Notification = {
      id: `msg-${message.data.id || Date.now()}`,
      type: 'message',
      title: `Nuevo mensaje de ${message.data.sender_name}`,
      body: message.data.content || 'Tienes un nuevo mensaje',
      timestamp: message.data.timestamp || new Date().toISOString(),
      read: false,
      priority: 'medium',
      data: {
        thread_id: message.data.thread_id,
        user_id: message.data.sender_id,
      },
    };

    addNotification(notification);
  }, []);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, maxNotifications);
      return updated;
    });

    // Show browser notification if enabled
    if (pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
        silent: !soundEnabled,
      });

      browserNotification.onclick = () => {
        window.focus();
        handleNotificationClick(notification);
        browserNotification.close();
      };

      // Auto-close after 5 seconds (except urgent)
      if (notification.priority !== 'urgent') {
        setTimeout(() => browserNotification.close(), 5000);
      }
    }

    // Show toast notification
    const toastOptions = {
      autoClose: notification.priority === 'urgent' ? false : 5000,
      onClick: () => handleNotificationClick(notification),
    };

    switch (notification.priority) {
      case 'urgent':
        toast.error(notification.body, toastOptions);
        break;
      case 'high':
        toast.warning(notification.body, toastOptions);
        break;
      case 'medium':
        toast.info(notification.body, toastOptions);
        break;
      default:
        toast.success(notification.body, toastOptions);
    }

    // Play sound if enabled
    if (soundEnabled && notification.priority !== 'low') {
      playNotificationSound(notification.priority);
    }
  }, [pushEnabled, soundEnabled, maxNotifications]);

  const playNotificationSound = (priority: string) => {
    try {
      const audio = new Audio();
      
      // Different sounds for different priorities
      switch (priority) {
        case 'urgent':
          audio.src = '/sounds/urgent.mp3';
          break;
        case 'high':
          audio.src = '/sounds/high.mp3';
          break;
        default:
          audio.src = '/sounds/notification.mp3';
      }
      
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore autoplay policy errors
      });
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    markAsRead(notification.id);

    // Navigate based on notification type
    const { data } = notification;
    
    if (data?.url) {
      window.location.href = data.url;
      return;
    }

    switch (notification.type) {
      case 'message':
        if (data?.thread_id) {
          window.location.href = `/app/messages/thread/${data.thread_id}`;
        } else {
          window.location.href = '/app/messages';
        }
        break;
      case 'property':
        if (data?.property_id) {
          window.location.href = `/app/properties/${data.property_id}`;
        } else {
          window.location.href = '/app/properties';
        }
        break;
      case 'payment':
        if (data?.payment_id) {
          window.location.href = `/app/payments/${data.payment_id}`;
        } else {
          window.location.href = '/app/payments';
        }
        break;
      case 'contract':
        if (data?.contract_id) {
          window.location.href = `/app/contracts/${data.contract_id}`;
        } else {
          window.location.href = '/app/contracts';
        }
        break;
      default:
        // Stay on current page or go to dashboard
        break;
    }

    setIsOpen(false);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      setPushEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        toast.success('Notificaciones push activadas');
      } else if (permission === 'denied') {
        toast.error('Notificaciones push denegadas');
      }
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const clearRead = () => {
    setNotifications(prev => prev.filter(notif => !notif.read));
  };

  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    const iconProps = { fontSize: 'small' as const };
    switch (type) {
      case 'message': return <MessageIcon {...iconProps} />;
      case 'property': return <PropertyIcon {...iconProps} />;
      case 'payment': return <PaymentIcon {...iconProps} />;
      case 'contract': return <ContractIcon {...iconProps} />;
      case 'rating': return <RatingIcon {...iconProps} />;
      case 'user': return <UserIcon {...iconProps} />;
      default: return <NotificationsIcon {...iconProps} />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };

  // Filter notifications by tab
  const filteredNotifications = notifications.filter((notif, index) => {
    switch (activeTab) {
      case 1: return !notif.read; // Unread
      case 2: return notif.read;   // Read
      default: return true;        // All
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Notification Bell Icon */}
      <IconButton
        onClick={() => setIsOpen(true)}
        sx={{
          color: 'inherit',
          transition: 'transform 0.2s',
          '&:hover': { transform: 'scale(1.1)' },
        }}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      {/* Notification Drawer */}
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        PaperProps={{
          sx: { width: { xs: '100vw', sm: 400 }, maxWidth: '100vw' },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">Notificaciones</Typography>
              <IconButton onClick={() => setIsOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Connection Status */}
            <Chip
              size="small"
              label={isConnected ? 'En línea' : 'Desconectado'}
              color={isConnected ? 'success' : 'error'}
              variant="outlined"
              sx={{ mt: 1 }}
            />
          </Box>

          {/* Settings */}
          <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={pushEnabled}
                  onChange={() => {
                    if (!pushEnabled) {
                      requestNotificationPermission();
                    } else {
                      setPushEnabled(false);
                    }
                  }}
                  size="small"
                />
              }
              label="Push notifications"
              sx={{ mr: 2 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  size="small"
                />
              }
              label="Sonido"
            />
          </Box>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={`Todas (${notifications.length})`} />
            <Tab label={`No leídas (${unreadCount})`} />
            <Tab label="Leídas" />
          </Tabs>

          {/* Actions */}
          <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Box display="flex" gap={1}>
              <Button
                size="small"
                startIcon={<MarkReadIcon />}
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                Marcar todas
              </Button>
              <Button
                size="small"
                startIcon={<ClearAllIcon />}
                onClick={clearRead}
                disabled={notifications.filter(n => n.read).length === 0}
              >
                Limpiar leídas
              </Button>
            </Box>
          </Box>

          {/* Notifications List */}
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            {filteredNotifications.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '200px',
                  p: 3,
                  textAlign: 'center',
                }}
              >
                <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography color="text.secondary">
                  {activeTab === 1 ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
                </Typography>
              </Box>
            ) : (
              <List sx={{ py: 0 }}>
                {filteredNotifications.map((notification, index) => (
                  <React.Fragment key={notification.id}>
                    <ListItem
                      sx={{
                        bgcolor: notification.read ? 'transparent' : 'action.hover',
                        '&:hover': { bgcolor: 'action.selected' },
                        cursor: 'pointer',
                      }}
                      onClick={() => handleNotificationClick(notification)}
                      component="div"
                    >
                      <ListItemIcon>
                        <Badge
                          variant="dot"
                          color={getPriorityColor(notification.priority) as any}
                          invisible={notification.read}
                        >
                          {getNotificationIcon(notification.type)}
                        </Badge>
                      </ListItemIcon>

                      <ListItemText
                        primary={
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: notification.read ? 'normal' : 'bold',
                              color: notification.read ? 'text.secondary' : 'text.primary',
                            }}
                          >
                            {notification.title}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 0.5 }}
                            >
                              {notification.body}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDistanceToNow(
                                new Date(notification.timestamp),
                                { addSuffix: true, locale: es }
                              )}
                            </Typography>
                          </Box>
                        }
                      />

                      <ListItemSecondaryAction>
                        {!notification.read && (
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < filteredNotifications.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default PushNotificationCenter;