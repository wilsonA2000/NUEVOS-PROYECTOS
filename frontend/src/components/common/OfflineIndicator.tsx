import React from 'react';
import { Box, Typography } from '@mui/material';
import { WifiOff as WifiOffIcon } from '@mui/icons-material';
import { useServiceWorker } from '../../hooks/useServiceWorker';

const OfflineIndicator: React.FC = () => {
  const { isOffline } = useServiceWorker();

  if (!isOffline) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#f59e0b',
        color: '#78350f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        py: 0.75,
        px: 2,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <WifiOffIcon fontSize="small" />
      <Typography variant="body2" fontWeight={600}>
        Sin conexion - Modo offline
      </Typography>
    </Box>
  );
};

export default OfflineIndicator;
