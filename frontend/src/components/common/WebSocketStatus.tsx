/**
 * WebSocket Status Component - Indicador de estado de conexión en tiempo real
 * Muestra el estado de la conexión WebSocket en la barra superior
 */

import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Badge,
  CircularProgress,
} from '@mui/material';
import {
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Refresh as RefreshIcon,
  Circle as CircleIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { useOptimizedWebSocketContext } from '../../contexts/OptimizedWebSocketContext';

interface WebSocketStatusProps {
  compact?: boolean;
  showRefresh?: boolean;
}

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ 
  compact = false, 
  showRefresh = true 
}) => {
  const {
    isConnected,
    connectionStatus,
    connectedEndpoints,
    unreadMessagesCount,
    onlineUsers,
  } = useOptimizedWebSocketContext();
  
  // Para compatibilidad - en el contexto optimizado no hay typingUsers
  const typingUsers = new Map();

  const handleRefresh = () => {
    window.location.reload();
  };

  const getStatusColor = () => {
    if (isConnected) return 'success';
    if (connectionStatus === 'Conectando...') return 'warning';
    return 'error';
  };

  const getStatusIcon = () => {
    if (isConnected) return <WifiIcon fontSize="small" />;
    if (connectionStatus === 'Conectando...') return <CircularProgress size={16} />;
    return <WifiOffIcon fontSize="small" />;
  };

  const onlineUsersCount = onlineUsers.size;
  const activeTypingCount = typingUsers.length;

  if (compact) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <Tooltip title={`${connectionStatus} - ${connectedEndpoints.length} servicios`}>
          <Badge 
            color={getStatusColor()} 
            variant="dot"
            sx={{ 
              '& .MuiBadge-badge': { 
                right: 2, 
                top: 2 
              } 
            }}
          >
            <IconButton size="small" disabled>
              {getStatusIcon()}
            </IconButton>
          </Badge>
        </Tooltip>

        {/* Contador de mensajes no leídos */}
        {unreadMessagesCount > 0 && (
          <Tooltip title={`${unreadMessagesCount} mensajes no leídos`}>
            <Badge badgeContent={unreadMessagesCount} color="primary">
              <MessageIcon fontSize="small" color="action" />
            </Badge>
          </Tooltip>
        )}

        {/* Indicador de usuarios escribiendo */}
        {activeTypingCount > 0 && (
          <Tooltip title={`${activeTypingCount} usuario${activeTypingCount > 1 ? 's' : ''} escribiendo`}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <CircleIcon sx={{ fontSize: 8, color: 'primary.main', animation: 'pulse 1.5s infinite' }} />
              <CircleIcon sx={{ fontSize: 8, color: 'primary.main', animation: 'pulse 1.5s infinite 0.5s' }} />
              <CircleIcon sx={{ fontSize: 8, color: 'primary.main', animation: 'pulse 1.5s infinite 1s' }} />
            </Box>
          </Tooltip>
        )}

        {showRefresh && !isConnected && (
          <Tooltip title="Reconectar">
            <IconButton size="small" onClick={handleRefresh}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  return (
    <Box display="flex" alignItems="center" gap={2}>
      <Chip
        icon={getStatusIcon()}
        label={connectionStatus}
        color={getStatusColor()}
        variant="outlined"
        size="small"
        sx={{
          fontWeight: 500,
          '& .MuiChip-icon': {
            fontSize: '1rem',
          },
        }}
      />

      {/* Información detallada */}
      <Box display="flex" alignItems="center" gap={1}>
        {/* Servicios conectados */}
        <Tooltip title={`Servicios conectados: ${connectedEndpoints.join(', ')}`}>
          <Chip
            label={`${connectedEndpoints.length} servicios`}
            size="small"
            color={isConnected ? 'success' : 'default'}
            variant="outlined"
          />
        </Tooltip>

        {/* Usuarios online */}
        {onlineUsersCount > 0 && (
          <Tooltip title={`${onlineUsersCount} usuarios en línea`}>
            <Chip
              icon={<CircleIcon />}
              label={`${onlineUsersCount} online`}
              size="small"
              color="success"
              variant="outlined"
            />
          </Tooltip>
        )}

        {/* Mensajes no leídos */}
        <Badge badgeContent={unreadMessagesCount} color="primary">
          <MessageIcon color={unreadMessagesCount > 0 ? 'primary' : 'action'} />
        </Badge>

        {/* Indicador de escritura */}
        {activeTypingCount > 0 && (
          <Tooltip title={`${activeTypingCount} usuario${activeTypingCount > 1 ? 's' : ''} escribiendo`}>
            <Box 
              display="flex" 
              alignItems="center" 
              gap={0.5}
              sx={{
                '@keyframes pulse': {
                  '0%': { opacity: 0.3 },
                  '50%': { opacity: 1 },
                  '100%': { opacity: 0.3 },
                }
              }}
            >
              <CircleIcon sx={{ fontSize: 8, color: 'primary.main', animation: 'pulse 1.5s infinite' }} />
              <CircleIcon sx={{ fontSize: 8, color: 'primary.main', animation: 'pulse 1.5s infinite 0.5s' }} />
              <CircleIcon sx={{ fontSize: 8, color: 'primary.main', animation: 'pulse 1.5s infinite 1s' }} />
            </Box>
          </Tooltip>
        )}
      </Box>

      {/* Botón de reconexión */}
      {showRefresh && !isConnected && (
        <Tooltip title="Reconectar servicios">
          <IconButton size="small" onClick={handleRefresh} color="error">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};