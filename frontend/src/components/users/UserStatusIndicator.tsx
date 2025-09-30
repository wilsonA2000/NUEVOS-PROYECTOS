import React, { useState, useEffect } from 'react';
import {
  Box,
  Avatar,
  Badge,
  Typography,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Circle as CircleIcon,
  Person as PersonIcon,
  Visibility as OnlineIcon,
  VisibilityOff as OfflineIcon,
  Schedule as IdleIcon,
  DoNotDisturb as DoNotDisturbIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { UserStatus, useUserStatus } from '../../hooks/useUserStatus';

// Interface for user information
interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  user_type: 'landlord' | 'tenant' | 'service_provider';
  is_verified?: boolean;
}

interface UserStatusIndicatorProps {
  /** User status data from useUserStatus hook */
  userStatus: UserStatus;
  /** Whether to show detailed information */
  showDetails?: boolean;
  /** Whether to show the avatar */
  showAvatar?: boolean;
  /** Whether to show last seen time */
  showLastSeen?: boolean;
  /** Whether to show status settings menu */
  showSettings?: boolean;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Click handler for the user */
  onClick?: (userStatus: UserStatus) => void;
  /** Status change handler */
  onStatusChange?: (newStatus: Partial<Pick<UserStatus, 'status' | 'customMessage'>>) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Whether the component is interactive */
  interactive?: boolean;
  /** Custom avatar source */
  avatarSrc?: string;
  /** Whether to show tooltip with details */
  showTooltip?: boolean;
}

const UserStatusIndicator: React.FC<UserStatusIndicatorProps> = ({
  userStatus,
  showDetails = true,
  showAvatar = true,
  showLastSeen = true,
  showSettings = false,
  size = 'medium',
  onClick,
  onStatusChange,
  isLoading = false,
  interactive = true,
  avatarSrc,
  showTooltip = true,
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { setMyStatus, myStatus } = useUserStatus();
  
  // Check if this is the current user
  const isCurrentUser = myStatus?.userId === userStatus.userId;

  const getStatusConfig = (status: UserStatus['status'], isOnline: boolean) => {
    if (!isOnline) {
      return {
        color: theme.palette.grey[400],
        label: 'Desconectado',
        icon: <OfflineIcon fontSize="small" />,
        description: 'No disponible',
      };
    }

    switch (status) {
      case 'online':
        return {
          color: theme.palette.success.main,
          label: 'En línea',
          icon: <OnlineIcon fontSize="small" />,
          description: 'Disponible ahora',
        };
      case 'away':
        return {
          color: theme.palette.warning.main,
          label: 'Ausente',
          icon: <IdleIcon fontSize="small" />,
          description: 'Inactivo temporalmente',
        };
      case 'busy':
        return {
          color: theme.palette.error.main,
          label: 'Ocupado',
          icon: <DoNotDisturbIcon fontSize="small" />,
          description: 'No molestar',
        };
      default:
        return {
          color: theme.palette.info.main,
          label: 'En línea',
          icon: <OnlineIcon fontSize="small" />,
          description: 'Disponible',
        };
    }
  };

  const getSizeConfig = (avatarSize: string) => {
    switch (avatarSize) {
      case 'small':
        return {
          avatar: { width: 32, height: 32 },
          badge: { width: 10, height: 10 },
          badgeAnchor: { vertical: 'bottom' as const, horizontal: 'right' as const },
          badgeOverlap: 'circular' as const,
        };
      case 'medium':
        return {
          avatar: { width: 40, height: 40 },
          badge: { width: 12, height: 12 },
          badgeAnchor: { vertical: 'bottom' as const, horizontal: 'right' as const },
          badgeOverlap: 'circular' as const,
        };
      case 'large':
        return {
          avatar: { width: 56, height: 56 },
          badge: { width: 16, height: 16 },
          badgeAnchor: { vertical: 'bottom' as const, horizontal: 'right' as const },
          badgeOverlap: 'circular' as const,
        };
      default:
        return {
          avatar: { width: 40, height: 40 },
          badge: { width: 12, height: 12 },
          badgeAnchor: { vertical: 'bottom' as const, horizontal: 'right' as const },
          badgeOverlap: 'circular' as const,
        };
    }
  };

  const formatLastSeen = (lastSeenString: string) => {
    if (!lastSeenString) return 'Nunca conectado';
    
    try {
      return formatDistanceToNow(new Date(lastSeenString), { 
        addSuffix: true, 
        locale: es 
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (interactive && showSettings) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStatusChange = (newStatus: UserStatus['status']) => {
    if (isCurrentUser && setMyStatus) {
      setMyStatus({ status: newStatus });
    }
    if (onStatusChange) {
      onStatusChange({ status: newStatus });
    }
    handleMenuClose();
  };

  const handleUserClick = () => {
    if (onClick && interactive) {
      onClick(userStatus);
    }
  };

  const statusConfig = getStatusConfig(userStatus.status, userStatus.isOnline);
  const sizeConfig = getSizeConfig(size);

  const StatusBadge = () => (
    <CircleIcon
      sx={{
        ...sizeConfig.badge,
        color: statusConfig.color,
        border: '2px solid white',
        borderRadius: '50%',
        backgroundColor: statusConfig.color,
      }}
    />
  );

  const renderUserInfo = () => {
    if (!showDetails) return null;

    return (
      <Box sx={{ ml: showAvatar ? 1.5 : 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant={size === 'small' ? 'body2' : 'body1'}
            sx={{
              fontWeight: 500,
              color: 'text.primary',
            }}
          >
            {userStatus.userName}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Typography
            variant="caption"
            sx={{
              color: statusConfig.color,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <CircleIcon sx={{ fontSize: 8 }} />
            {statusConfig.label}
          </Typography>
        </Box>

        {userStatus.customMessage && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              display: 'block',
              mt: 0.25,
              fontStyle: 'italic',
            }}
          >
            "{userStatus.customMessage}"
          </Typography>
        )}

        {showLastSeen && !userStatus.isOnline && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              display: 'block',
              mt: 0.25,
            }}
          >
            {formatLastSeen(userStatus.lastSeen)}
          </Typography>
        )}
      </Box>
    );
  };

  const content = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        cursor: interactive ? 'pointer' : 'default',
        p: interactive ? 0.5 : 0,
        borderRadius: 1,
        '&:hover': interactive ? {
          backgroundColor: 'action.hover',
        } : {},
      }}
      onClick={showSettings ? handleMenuOpen : handleUserClick}
    >
        {showAvatar && (
          <Badge
            overlap={sizeConfig.badgeOverlap}
            anchorOrigin={sizeConfig.badgeAnchor}
            badgeContent={isLoading ? <CircularProgress size={8} /> : <StatusBadge />}
          >
            <Avatar
              src={avatarSrc}
              sx={{
                ...sizeConfig.avatar,
                backgroundColor: userStatus.isOnline ? 'primary.main' : 'grey.400',
              }}
            >
              {userStatus.userName.charAt(0).toUpperCase()}
            </Avatar>
          </Badge>
        )}

        {renderUserInfo()}

        {showSettings && interactive && isCurrentUser && (
          <SettingsIcon
            sx={{
              ml: 'auto',
              fontSize: 16,
              color: 'text.secondary',
            }}
          />
        )}
    </Box>
  );

  // Tooltip content
  const tooltipContent = showTooltip ? (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
        {userStatus.userName}
      </Typography>
      <Typography variant="body2" color="inherit">
        Estado: {statusConfig.label}
      </Typography>
      {userStatus.customMessage && (
        <Typography variant="body2" color="inherit" sx={{ fontStyle: 'italic' }}>
          "{userStatus.customMessage}"
        </Typography>
      )}
      <Typography variant="caption" color="inherit">
        {userStatus.isOnline 
          ? 'Activo ahora' 
          : `Visto ${formatLastSeen(userStatus.lastSeen)}`
        }
      </Typography>
    </Box>
  ) : null;

  return (
    <>
      {showTooltip ? (
        <Tooltip
          title={tooltipContent}
          placement="top"
          arrow
          enterDelay={500}
          leaveDelay={200}
        >
          {content}
        </Tooltip>
      ) : (
        content
      )}

      {/* Status Settings Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            minWidth: 200,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
          },
        }}
      >
        {onClick && (
          <>
            <MenuItem onClick={() => handleUserClick()}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Ver perfil" />
            </MenuItem>
            <Divider />
          </>
        )}

        {isCurrentUser && (['online', 'away', 'busy'] as UserStatus['status'][]).map((statusOption) => {
          const config = getStatusConfig(statusOption, true);
          return (
            <MenuItem
              key={statusOption}
              onClick={() => handleStatusChange(statusOption)}
              selected={userStatus.status === statusOption}
            >
              <ListItemIcon>
                <CircleIcon sx={{ fontSize: 12, color: config.color }} />
              </ListItemIcon>
              <ListItemText
                primary={config.label}
                secondary={config.description}
                secondaryTypographyProps={{
                  sx: { fontSize: '0.75rem' }
                }}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

// Simplified status chip component
export const UserStatusChip: React.FC<{
  userStatus: UserStatus;
  size?: 'small' | 'medium';
}> = ({ userStatus, size = 'small' }) => {
  const theme = useTheme();
  
  const getStatusConfig = (status: UserStatus['status'], isOnline: boolean) => {
    if (!isOnline) {
      return { label: 'Offline', color: 'default' as const };
    }

    switch (status) {
      case 'online':
        return { label: 'Online', color: 'success' as const };
      case 'away':
        return { label: 'Away', color: 'warning' as const };
      case 'busy':
        return { label: 'Busy', color: 'error' as const };
      default:
        return { label: 'Online', color: 'info' as const };
    }
  };

  const statusConfig = getStatusConfig(userStatus.status, userStatus.isOnline);

  return (
    <Chip
      label={statusConfig.label}
      color={statusConfig.color}
      size={size}
      variant="outlined"
      sx={{
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        height: size === 'small' ? 20 : 24,
      }}
    />
  );
};

// Online users counter component
export const OnlineUsersCounter: React.FC<{
  onlineCount: number;
  totalCount: number;
  showIcon?: boolean;
}> = ({ onlineCount, totalCount, showIcon = true }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {showIcon && (
        <CircleIcon 
          sx={{ 
            fontSize: 12, 
            color: 'success.main',
            animation: onlineCount > 0 ? 'pulse 2s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.5 },
              '100%': { opacity: 1 },
            },
          }} 
        />
      )}
      <Typography variant="caption" color="success.main">
        {onlineCount} en línea
      </Typography>
      {totalCount > 0 && (
        <Typography variant="caption" color="text.secondary">
          de {totalCount}
        </Typography>
      )}
    </Box>
  );
};

export default UserStatusIndicator;