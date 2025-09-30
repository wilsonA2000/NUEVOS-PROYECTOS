/**
 * Optimized WebSocket Status - Smart connection management without spam
 * Provides user control over real-time features
 */

import React, { useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Button,
} from '@mui/material';
import {
  Wifi as ConnectedIcon,
  WifiOff as DisconnectedIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useOptimizedUserStatus } from '../../hooks/useOptimizedUserStatus';

interface OptimizedWebSocketStatusProps {
  compact?: boolean;
  showControls?: boolean;
}

export const OptimizedWebSocketStatus: React.FC<OptimizedWebSocketStatusProps> = ({
  compact = false,
  showControls = true,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const {
    isConnected,
    connectionHealth,
    enableRealTime,
    disableRealTime,
    onlineCount,
  } = useOptimizedUserStatus();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleToggleRealTime = async () => {
    try {
      if (isConnected) {
        disableRealTime();
      } else {
        await enableRealTime();
      }
    } catch (error) {
      console.error('Error toggling real-time connection:', error);
    }
    handleMenuClose();
  };

  const getStatusColor = () => {
    if (isConnected) return 'success';
    if (connectionHealth.failedConnections > 0) return 'error';
    return 'default';
  };

  const getStatusText = () => {
    if (isConnected) return 'Tiempo Real';
    if (connectionHealth.failedConnections > 0) return 'Error';
    return 'Desconectado';
  };

  const getStatusIcon = () => {
    if (isConnected) return <ConnectedIcon fontSize="small" />;
    if (connectionHealth.failedConnections > 0) return <WarningIcon fontSize="small" />;
    return <DisconnectedIcon fontSize="small" />;
  };

  if (compact) {
    return (
      <Tooltip title={`${getStatusText()} - ${onlineCount} usuarios en línea`}>
        <Chip
          icon={getStatusIcon()}
          label={isConnected ? onlineCount : '0'}
          color={getStatusColor() as any}
          size="small"
          variant="outlined"
          onClick={showControls ? handleMenuOpen : undefined}
          sx={{ 
            cursor: showControls ? 'pointer' : 'default',
            minWidth: 60,
          }}
        />
      </Tooltip>
    );
  }

  return (
    <>
      <Box display="flex" alignItems="center" gap={1}>
        <Chip
          icon={getStatusIcon()}
          label={`${getStatusText()} (${onlineCount})`}
          color={getStatusColor() as any}
          variant="outlined"
        />
        
        {showControls && (
          <Tooltip title="Configurar tiempo real">
            <IconButton size="small" onClick={handleMenuOpen}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Settings Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { width: 280, p: 1 },
        }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>
          Configuración Tiempo Real
        </Typography>
        
        <Divider sx={{ my: 1 }} />

        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                checked={isConnected}
                onChange={handleToggleRealTime}
                size="small"
              />
            }
            label="Activar tiempo real"
            sx={{ width: '100%' }}
          />
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Estado de Conexión
          </Typography>
          
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            {getStatusIcon()}
            <Typography variant="body2">
              {getStatusText()}
            </Typography>
          </Box>

          <Typography variant="caption" color="text.secondary">
            Usuarios en línea: {onlineCount}
          </Typography>
        </Box>

        {connectionHealth.failedConnections > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Alert severity="warning" sx={{ mx: 1 }}>
              <Typography variant="caption">
                {connectionHealth.failedConnections} conexión(es) fallida(s)
              </Typography>
            </Alert>
          </>
        )}

        <Divider sx={{ my: 1 }} />

        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            El tiempo real permite:
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            • Chat en vivo • Notificaciones instantáneas • Estado de usuarios
          </Typography>
        </Box>
      </Menu>
    </>
  );
};

export default OptimizedWebSocketStatus;