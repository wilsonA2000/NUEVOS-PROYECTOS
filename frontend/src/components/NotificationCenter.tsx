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
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Payment as PaymentIcon,
  Warning as WarningIcon,
  Message as MessageIcon,
  Build as BuildIcon,
  Description as ContractIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useNotifications } from '../hooks/useNotifications';
import { Notification, NotificationType } from '../types/notification';
import { formatDateTime } from '../utils/formatters';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'payment_received':
    case 'payment_due':
      return <PaymentIcon color="success" />;
    case 'contract_expiring':
      return <ContractIcon color="warning" />;
    case 'maintenance_request':
      return <BuildIcon color="error" />;
    case 'message_received':
      return <MessageIcon color="info" />;
    case 'system_alert':
      return <WarningIcon color="error" />;
    default:
      return <InfoIcon />;
  }
};

const NotificationCenter: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isLoading } = useNotifications();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    handleClose();
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    handleClose();
  };

  const handleDeleteNotification = (event: React.MouseEvent, notificationId: number) => {
    event.stopPropagation();
    deleteNotification(notificationId);
  };

  // Asegurar que notifications sea un array
  const notificationsArray = Array.isArray(notifications) ? notifications : [];
  const safeUnreadCount = typeof unreadCount === 'number' ? unreadCount : 0;

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={safeUnreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 360, maxHeight: 480 },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notificaciones</Typography>
          {safeUnreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllAsRead}>
              Marcar todas como leídas
            </Button>
          )}
        </Box>
        <Divider />
        <List sx={{ p: 0 }}>
          {isLoading ? (
            <ListItem>
              <Box display="flex" justifyContent="center" width="100%" py={2}>
                <CircularProgress size={24} />
              </Box>
            </ListItem>
          ) : notificationsArray.length === 0 ? (
            <ListItem>
              <ListItemText primary="No hay notificaciones" />
            </ListItem>
          ) : (
            notificationsArray.map((notification) => (
              <ListItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  bgcolor: notification.read ? 'inherit' : 'action.hover',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.selected' },
                }}
              >
                <ListItemIcon>{getNotificationIcon(notification.type)}</ListItemIcon>
                <ListItemText
                  primary={notification.title}
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(notification.createdAt)}
                      </Typography>
                    </>
                  }
                />
                <IconButton
                  size="small"
                  onClick={(e) => handleDeleteNotification(e, notification.id)}
                >
                  <InfoIcon fontSize="small" />
                </IconButton>
              </ListItem>
            ))
          )}
        </List>
      </Menu>
    </>
  );
};

export default NotificationCenter; 