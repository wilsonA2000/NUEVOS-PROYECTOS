/**
 * User Status Selector - Simple status management without WebSocket
 * Allows users to select their visibility status
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Typography,
  Paper,
  SelectChangeEvent,
} from '@mui/material';
import {
  Circle as OnlineIcon,
  DoNotDisturb as BusyIcon,
  VisibilityOff as OfflineIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useOptimizedUserStatus } from '../../hooks/useOptimizedUserStatus';

type UserStatus = 'online' | 'offline' | 'busy';

interface UserStatusSelectorProps {
  compact?: boolean;
  showLabel?: boolean;
}

export const UserStatusSelector: React.FC<UserStatusSelectorProps> = ({
  compact = false,
  showLabel = true,
}) => {
  const { user } = useAuth();
  const { myStatus, setMyStatus, isConnected } = useOptimizedUserStatus();
  const [localStatus, setLocalStatus] = useState<UserStatus>('online');

  // Sync with optimized user status
  useEffect(() => {
    if (myStatus?.status) {
      setLocalStatus(myStatus.status);
    }
  }, [myStatus]);

  const handleStatusChange = (event: SelectChangeEvent<UserStatus>) => {
    const newStatus = event.target.value as UserStatus;
    setLocalStatus(newStatus);
    
    // Update through optimized user status system
    setMyStatus({ status: newStatus });
    
    console.log(`User status changed to: ${newStatus}${isConnected ? ' (synced via WebSocket)' : ' (local only)'}`);
  };

  const getStatusIcon = (status: UserStatus) => {
    switch (status) {
      case 'online':
        return <OnlineIcon sx={{ color: '#4caf50', fontSize: 16 }} />;
      case 'busy':
        return <BusyIcon sx={{ color: '#ff9800', fontSize: 16 }} />;
      case 'offline':
        return <OfflineIcon sx={{ color: '#9e9e9e', fontSize: 16 }} />;
    }
  };

  const getStatusLabel = (status: UserStatus) => {
    switch (status) {
      case 'online':
        return 'En línea';
      case 'busy':
        return 'Ocupado';
      case 'offline':
        return 'Desconectado';
    }
  };

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'busy':
        return 'warning';
      case 'offline':
        return 'default';
    }
  };

  if (compact) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <Chip
          icon={getStatusIcon(localStatus)}
          label={getStatusLabel(localStatus)}
          color={getStatusColor(localStatus) as any}
          size="small"
          variant="outlined"
        />
      </Box>
    );
  }

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Avatar src={user?.avatar} sx={{ width: 40, height: 40 }}>
          {user?.first_name?.charAt(0) || 'U'}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {user?.first_name} {user?.last_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.user_type === 'landlord' ? 'Arrendador' : 
             user?.user_type === 'tenant' ? 'Arrendatario' : 'Prestador de Servicios'}
          </Typography>
        </Box>
      </Box>

      <FormControl fullWidth size="small">
        {showLabel && (
          <InputLabel id="user-status-select-label">Estado de visibilidad</InputLabel>
        )}
        <Select
          labelId="user-status-select-label"
          value={localStatus}
          onChange={handleStatusChange}
          label={showLabel ? "Estado de visibilidad" : undefined}
          startAdornment={getStatusIcon(localStatus)}
        >
          <MenuItem value="online">
            <Box display="flex" alignItems="center" gap={1}>
              <OnlineIcon sx={{ color: '#4caf50', fontSize: 16 }} />
              En línea
            </Box>
          </MenuItem>
          <MenuItem value="busy">
            <Box display="flex" alignItems="center" gap={1}>
              <BusyIcon sx={{ color: '#ff9800', fontSize: 16 }} />
              Ocupado
            </Box>
          </MenuItem>
          <MenuItem value="offline">
            <Box display="flex" alignItems="center" gap={1}>
              <OfflineIcon sx={{ color: '#9e9e9e', fontSize: 16 }} />
              Desconectado
            </Box>
          </MenuItem>
        </Select>
      </FormControl>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Tu estado será visible para otros usuarios en la plataforma
      </Typography>
    </Paper>
  );
};

export default UserStatusSelector;