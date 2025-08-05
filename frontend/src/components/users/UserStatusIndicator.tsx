/**
 * UserStatusIndicator - Real-time user status display
 * Shows online/offline status and last seen information
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Avatar,
  Badge,
  Typography,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  Circle as CircleIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useUserStatus } from '../../hooks/useWebSocketEnhanced';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserStatus {
  user_id: string;
  username: string;
  avatar?: string;
  online: boolean;
  last_seen?: string;
  status_message?: string;
}

interface UserStatusIndicatorProps {
  userId: string;
  username: string;
  avatar?: string;
  showUsername?: boolean;
  showLastSeen?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'badge' | 'chip' | 'inline';
}

export const UserStatusIndicator: React.FC<UserStatusIndicatorProps> = ({
  userId,
  username,
  avatar,
  showUsername = false,
  showLastSeen = false,
  size = 'medium',
  variant = 'badge',
}) => {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);

  const { isConnected, send, subscribe } = useUserStatus();

  // Handle status updates
  useEffect(() => {
    const unsubscribeStatusUpdate = subscribe('user_status_update', (message) => {
      const { user_id, online, last_seen, status_message } = message.data;
      
      if (user_id === userId) {
        setUserStatus(prev => ({
          user_id: userId,
          username,
          avatar,
          online,
          last_seen,
          status_message,
          ...prev,
        }));
      }
    });

    // Request current status
    if (isConnected) {
      send({
        type: 'get_user_status',
        data: { user_id: userId },
      });
    }

    return unsubscribeStatusUpdate;
  }, [subscribe, userId, username, avatar, isConnected, send]);

  const getAvatarSize = () => {
    switch (size) {
      case 'small': return { width: 24, height: 24 };
      case 'large': return { width: 48, height: 48 };
      default: return { width: 32, height: 32 };
    }
  };

  const getBadgeSize = () => {
    switch (size) {
      case 'small': return 8;
      case 'large': return 16;
      default: return 12;
    }
  };

  const getLastSeenText = () => {
    if (!userStatus?.last_seen) return '';
    
    try {
      const lastSeen = new Date(userStatus.last_seen);
      return `Visto ${formatDistanceToNow(lastSeen, { addSuffix: true, locale: es })}`;
    } catch {
      return '';
    }
  };

  const statusColor = userStatus?.online ? 'success.main' : 'grey.400';
  const statusText = userStatus?.online ? 'En línea' : 'Desconectado';

  if (variant === 'chip') {
    return (
      <Chip
        avatar={
          <Avatar src={avatar} sx={getAvatarSize()}>
            {username.charAt(0)}
          </Avatar>
        }
        label={
          <Box>
            <Typography variant="body2">
              {username}
            </Typography>
            {showLastSeen && !userStatus?.online && (
              <Typography variant="caption" color="text.secondary">
                {getLastSeenText()}
              </Typography>
            )}
          </Box>
        }
        icon={
          <CircleIcon 
            sx={{ 
              fontSize: getBadgeSize(), 
              color: statusColor,
            }} 
          />
        }
        variant="outlined"
        size={size}
      />
    );
  }

  if (variant === 'inline') {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            <CircleIcon 
              sx={{ 
                fontSize: getBadgeSize(), 
                color: statusColor,
              }} 
            />
          }
        >
          <Avatar src={avatar} sx={getAvatarSize()}>
            {username.charAt(0)}
          </Avatar>
        </Badge>
        
        {showUsername && (
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {username}
            </Typography>
            {showLastSeen && (
              <Typography variant="caption" color="text.secondary">
                {userStatus?.online ? statusText : getLastSeenText()}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    );
  }

  // Default badge variant
  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {username}
          </Typography>
          <Typography variant="caption">
            {userStatus?.online ? statusText : getLastSeenText()}
          </Typography>
          {userStatus?.status_message && (
            <Typography variant="caption" sx={{ fontStyle: 'italic', display: 'block' }}>
              "{userStatus.status_message}"
            </Typography>
          )}
        </Box>
      }
      placement="top"
    >
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        badgeContent={
          <CircleIcon 
            sx={{ 
              fontSize: getBadgeSize(), 
              color: statusColor,
              border: 2,
              borderColor: 'background.paper',
              borderRadius: '50%',
            }} 
          />
        }
      >
        <Avatar src={avatar} sx={getAvatarSize()}>
          {username.charAt(0)}
        </Avatar>
      </Badge>
    </Tooltip>
  );
};

// Component for displaying multiple users' status
interface UsersStatusListProps {
  users: Array<{
    id: string;
    username: string;
    avatar?: string;
  }>;
  title?: string;
  maxVisible?: number;
}

export const UsersStatusList: React.FC<UsersStatusListProps> = ({
  users,
  title = "Usuarios conectados",
  maxVisible = 10,
}) => {
  const [usersStatus, setUsersStatus] = useState<Map<string, UserStatus>>(new Map());

  const { isConnected, send, subscribe } = useUserStatus();

  // Handle status updates for all users
  useEffect(() => {
    const unsubscribeStatusUpdate = subscribe('user_status_update', (message) => {
      const { user_id, online, last_seen, status_message } = message.data;
      
      const user = users.find(u => u.id === user_id);
      if (user) {
        setUsersStatus(prev => {
          const newMap = new Map(prev);
          newMap.set(user_id, {
            user_id,
            username: user.username,
            avatar: user.avatar,
            online,
            last_seen,
            status_message,
          });
          return newMap;
        });
      }
    });

    const unsubscribeStatusList = subscribe('users_status_list', (message) => {
      const { users_status } = message.data;
      
      const statusMap = new Map<string, UserStatus>();
      users_status.forEach((status: UserStatus) => {
        statusMap.set(status.user_id, status);
      });
      
      setUsersStatus(statusMap);
    });

    // Request current status for all users
    if (isConnected && users.length > 0) {
      send({
        type: 'get_users_status',
        data: { user_ids: users.map(u => u.id) },
      });
    }

    return () => {
      unsubscribeStatusUpdate();
      unsubscribeStatusList();
    };
  }, [subscribe, users, isConnected, send]);

  const sortedUsers = users
    .map(user => ({
      ...user,
      status: usersStatus.get(user.id),
    }))
    .sort((a, b) => {
      // Online users first
      if (a.status?.online && !b.status?.online) return -1;
      if (!a.status?.online && b.status?.online) return 1;
      
      // Then by username
      return a.username.localeCompare(b.username);
    })
    .slice(0, maxVisible);

  return (
    <Box>
      {title && (
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
      )}
      
      <List dense>
        {sortedUsers.map((user) => (
          <ListItem key={user.id} sx={{ px: 0 }}>
            <ListItemAvatar>
              <UserStatusIndicator
                userId={user.id}
                username={user.username}
                avatar={user.avatar}
                variant="badge"
                size="medium"
              />
            </ListItemAvatar>
            
            <ListItemText
              primary={user.username}
              secondary={
                user.status?.online 
                  ? "En línea"
                  : user.status?.last_seen 
                    ? `Visto ${formatDistanceToNow(new Date(user.status.last_seen), { addSuffix: true, locale: es })}`
                    : "Desconectado"
              }
            />
            
            {user.status?.status_message && (
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontStyle: 'italic', maxWidth: 100, textAlign: 'right' }}
              >
                "{user.status.status_message}"
              </Typography>
            )}
          </ListItem>
        ))}
      </List>
      
      {users.length > maxVisible && (
        <Typography variant="caption" color="text.secondary">
          +{users.length - maxVisible} más
        </Typography>
      )}
    </Box>
  );
};

export default UserStatusIndicator;