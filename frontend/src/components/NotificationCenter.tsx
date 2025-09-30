import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  CircularProgress,
  ListItemButton,
  Chip,
  IconButton as MuiIconButton,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Payment as PaymentIcon,
  Warning as WarningIcon,
  Message as MessageIcon,
  Home as PropertyIcon,
  Description as ContractIcon,
  Info as InfoIcon,
  Star as RatingIcon,
  HelpOutline as InquiryIcon,
  SystemUpdate as SystemIcon,
  NotificationImportant as ReminderIcon,
  Celebration as WelcomeIcon,
  VerifiedUser as VerificationIcon,
  Delete as DeleteIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { useNotifications, Notification } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'payment':
      return <PaymentIcon color="success" />;
    case 'contract':
      return <ContractIcon color="warning" />;
    case 'message':
      return <MessageIcon color="info" />;
    case 'property':
      return <PropertyIcon color="primary" />;
    case 'rating':
      return <RatingIcon sx={{ color: '#ffa726' }} />;
    case 'inquiry':
      return <InquiryIcon color="secondary" />;
    case 'system':
      return <SystemIcon color="error" />;
    case 'reminder':
      return <ReminderIcon sx={{ color: '#ff9800' }} />;
    case 'welcome':
      return <WelcomeIcon sx={{ color: '#4caf50' }} />;
    case 'verification':
      return <VerificationIcon sx={{ color: '#2196f3' }} />;
    default:
      return <InfoIcon />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'low':
      return 'default';
    case 'normal':
      return 'primary';
    case 'high':
      return 'warning';
    case 'urgent':
      return 'error';
    default:
      return 'default';
  }
};

const NotificationCenter: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { 
    notifications, 
    unreadCount, 
    loading, 
    isConnected,
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    handleNotificationClick 
  } = useNotifications();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const onNotificationClick = (notification: Notification) => {
    handleNotificationClick(notification);
    handleClose();
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleDeleteNotification = (event: React.MouseEvent, notificationId: string) => {
    event.stopPropagation();
    deleteNotification(notificationId);
  };

  // Formatear fecha relativa
  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: es 
      });
    } catch {
      return dateString;
    }
  };

  // Asegurar que notifications sea un array
  const notificationsArray = Array.isArray(notifications) ? notifications : [];
  const safeUnreadCount = typeof unreadCount === 'number' ? unreadCount : 0;

  return (
    <>
      <IconButton 
        color="inherit" 
        onClick={handleClick}
        sx={{ position: 'relative' }}
      >
        <Badge 
          badgeContent={safeUnreadCount} 
          color="error"
          max={99}
        >
          <NotificationsIcon />
        </Badge>
        {isConnected && (
          <CircleIcon 
            sx={{ 
              position: 'absolute', 
              bottom: 4, 
              right: 4, 
              fontSize: 8, 
              color: '#4caf50' 
            }} 
          />
        )}
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { 
            width: 420, 
            maxHeight: 600,
            '& .MuiList-root': {
              py: 0
            }
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Box>
            <Typography variant="h6">Notificaciones</Typography>
            {!isConnected && (
              <Typography variant="caption" color="text.secondary">
                Sin conexión en tiempo real
              </Typography>
            )}
          </Box>
          {safeUnreadCount > 0 && (
            <Button 
              size="small" 
              onClick={handleMarkAllAsRead}
              variant="text"
            >
              Marcar todas leídas
            </Button>
          )}
        </Box>
        
        <List sx={{ p: 0, maxHeight: 480, overflow: 'auto' }}>
          {loading ? (
            <ListItem>
              <Box display="flex" justifyContent="center" width="100%" py={4}>
                <CircularProgress size={32} />
              </Box>
            </ListItem>
          ) : notificationsArray.length === 0 ? (
            <ListItem>
              <Box textAlign="center" py={4} width="100%">
                <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">
                  No hay notificaciones
                </Typography>
              </Box>
            </ListItem>
          ) : (
            notificationsArray.slice(0, 20).map((notification) => (
              <ListItemButton
                key={notification.id}
                onClick={() => onNotificationClick(notification)}
                sx={{
                  bgcolor: notification.is_read ? 'inherit' : 'action.hover',
                  borderLeft: !notification.is_read ? 4 : 0,
                  borderLeftColor: !notification.is_read ? `${getPriorityColor(notification.priority)}.main` : 'transparent',
                  '&:hover': { 
                    bgcolor: 'action.selected' 
                  },
                  py: 2,
                  alignItems: 'flex-start'
                }}
              >
                <ListItemIcon sx={{ mt: 0.5, minWidth: 40 }}>
                  {getNotificationIcon(notification.notification_type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          fontWeight: notification.is_read ? 'normal' : 'bold',
                          flex: 1
                        }}
                      >
                        {notification.title}
                      </Typography>
                      {notification.priority !== 'normal' && (
                        <Chip 
                          label={notification.priority} 
                          size="small" 
                          color={getPriorityColor(notification.priority) as any}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          mb: 0.5
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatRelativeTime(notification.created_at)}
                      </Typography>
                    </>
                  }
                />
                <MuiIconButton
                  size="small"
                  onClick={(e) => handleDeleteNotification(e, notification.id)}
                  sx={{ mt: 0.5 }}
                >
                  <DeleteIcon fontSize="small" />
                </MuiIconButton>
              </ListItemButton>
            ))
          )}
        </List>
        
        {notificationsArray.length > 20 && (
          <Box sx={{ 
            p: 2, 
            textAlign: 'center', 
            borderTop: 1, 
            borderColor: 'divider' 
          }}>
            <Button 
              size="small" 
              onClick={() => {
                handleClose();
                // Navegar al centro de notificaciones completo
                window.location.href = '/app/notifications';
              }}
            >
              Ver todas las notificaciones
            </Button>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationCenter; 