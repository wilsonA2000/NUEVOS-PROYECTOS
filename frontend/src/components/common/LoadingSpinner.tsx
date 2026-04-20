import React from 'react';
import { CircularProgress, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  size?: number;
  color?: 'primary' | 'secondary' | 'inherit';
  fullScreen?: boolean;
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  color = 'primary',
  fullScreen = false,
  message,
}) => {
  const { t } = useTranslation('common');
  const displayMessage = message ?? t('common.loading');
  const content = (
    <Box
      display='flex'
      flexDirection='column'
      alignItems='center'
      justifyContent='center'
      gap={2}
    >
      <CircularProgress size={size} color={color} />
      {displayMessage && (
        <Box component='span' sx={{ color: 'text.secondary' }}>
          {displayMessage}
        </Box>
      )}
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 9999,
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
};

export default LoadingSpinner;
