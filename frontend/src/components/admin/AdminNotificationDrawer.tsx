/**
 * Admin Notification Drawer - Slide-out panel showing admin notifications
 */

import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Description as ContractIcon,
  Fingerprint as BiometricIcon,
  Security as SecurityIcon,
  Monitor as SystemIcon,
  Report as ReportIcon,
  DoneAll as DoneAllIcon,
  Delete as DeleteIcon,
  Circle as UnreadIcon,
} from '@mui/icons-material';
import { AdminNotification } from '../../hooks/useAdminNotifications';

interface AdminNotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: AdminNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClear: (id: string) => void;
}

const getNotificationIcon = (type: AdminNotification['type']) => {
  switch (type) {
    case 'contract_pending':
      return <ContractIcon color='primary' />;
    case 'biometric_complete':
      return <BiometricIcon color='success' />;
    case 'security_alert':
      return <SecurityIcon color='error' />;
    case 'system_health':
      return <SystemIcon color='warning' />;
    case 'user_report':
      return <ReportIcon color='info' />;
    default:
      return <ContractIcon />;
  }
};

const getSeverityColor = (severity: AdminNotification['severity']) => {
  switch (severity) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'success':
      return 'success';
    default:
      return 'info';
  }
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin}m`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  return `Hace ${diffDays}d`;
};

const AdminNotificationDrawer: React.FC<AdminNotificationDrawerProps> = ({
  open,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClear,
}) => {
  const theme = useTheme();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 380 } }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant='h6' fontWeight='bold'>
            Notificaciones Admin
          </Typography>
          {unreadCount > 0 && (
            <Typography variant='caption' color='text.secondary'>
              {unreadCount} sin leer
            </Typography>
          )}
        </Box>
        <Box>
          {unreadCount > 0 && (
            <IconButton
              size='small'
              onClick={onMarkAllAsRead}
              title='Marcar todas como leidas'
            >
              <DoneAllIcon fontSize='small' />
            </IconButton>
          )}
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Divider />

      {notifications.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant='body2' color='text.secondary'>
            No hay notificaciones
          </Typography>
        </Box>
      ) : (
        <List sx={{ overflow: 'auto', flex: 1 }}>
          {notifications.map(notification => (
            <ListItem
              key={notification.id}
              sx={{
                bgcolor: notification.read
                  ? 'transparent'
                  : theme.palette.action.hover,
                borderLeft: notification.read
                  ? 'none'
                  : `3px solid ${theme.palette.primary.main}`,
                cursor: 'pointer',
                '&:hover': { bgcolor: theme.palette.action.selected },
              }}
              onClick={() => onMarkAsRead(notification.id)}
              secondaryAction={
                <IconButton
                  edge='end'
                  size='small'
                  onClick={e => {
                    e.stopPropagation();
                    onClear(notification.id);
                  }}
                >
                  <DeleteIcon fontSize='small' />
                </IconButton>
              }
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {getNotificationIcon(notification.type)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {!notification.read && (
                      <UnreadIcon sx={{ fontSize: 8, color: 'primary.main' }} />
                    )}
                    <Typography variant='subtitle2' noWrap>
                      {notification.title}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mb: 0.5 }}
                    >
                      {notification.message}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={notification.severity}
                        size='small'
                        color={getSeverityColor(notification.severity) as any}
                        variant='outlined'
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                      <Typography variant='caption' color='text.secondary'>
                        {formatTime(notification.timestamp)}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Drawer>
  );
};

export default AdminNotificationDrawer;
