/**
 * Admin Notification Bell - Badge with unread count
 * Shown in AdminLayout header, opens AdminNotificationDrawer on click
 */

import React from 'react';
import { IconButton, Badge, Tooltip } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';

interface AdminNotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

const AdminNotificationBell: React.FC<AdminNotificationBellProps> = ({
  unreadCount,
  onClick,
}) => {
  return (
    <Tooltip
      title={
        unreadCount > 0
          ? `${unreadCount} notificaciones sin leer`
          : 'Sin notificaciones nuevas'
      }
    >
      <IconButton color='inherit' onClick={onClick} size='large'>
        <Badge
          badgeContent={unreadCount}
          color='error'
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.1)' },
                '100%': { transform: 'scale(1)' },
              },
            },
          }}
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
};

export default AdminNotificationBell;
