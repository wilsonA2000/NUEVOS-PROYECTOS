import React from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { vhColors } from '../../theme/tokens';

interface CustomNotificationProps {
  open: boolean;
  onClose: () => void;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  duration?: number;
  showCloseButton?: boolean;
}

const CustomNotification: React.FC<CustomNotificationProps> = ({
  open,
  onClose,
  message,
  type,
  title,
  duration = 6000,
  showCloseButton = true,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <SuccessIcon sx={{ fontSize: 24 }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 24 }} />;
      case 'warning':
        return <WarningIcon sx={{ fontSize: 24 }} />;
      case 'info':
        return <InfoIcon sx={{ fontSize: 24 }} />;
      default:
        return <InfoIcon sx={{ fontSize: 24 }} />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return vhColors.successBg;
      case 'error':
        return vhColors.errorBg;
      case 'warning':
        return vhColors.warningBg;
      case 'info':
        return vhColors.infoBg;
      default:
        return vhColors.infoBg;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return vhColors.success;
      case 'error':
        return vhColors.error;
      case 'warning':
        return vhColors.warning;
      case 'info':
        return vhColors.info;
      default:
        return vhColors.info;
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{
        '& .MuiSnackbar-root': {
          top: 24,
          right: 24,
        },
      }}
    >
      <Alert
        severity={type}
        onClose={showCloseButton ? onClose : undefined}
        sx={{
          width: '100%',
          maxWidth: 400,
          backgroundColor: getBackgroundColor(),
          border: `1px solid ${getBorderColor()}`,
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          '& .MuiAlert-icon': {
            color: getBorderColor(),
          },
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
        action={
          showCloseButton ? (
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={onClose}
              sx={{ color: getBorderColor() }}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          ) : undefined
        }
      >
        <Box>
          {title && (
            <AlertTitle sx={{ 
              fontWeight: 600, 
              mb: 1,
              color: getBorderColor(),
            }}>
              {title}
            </AlertTitle>
          )}
          <Typography
            variant="body2"
            sx={{
              color: vhColors.textPrimary,
              lineHeight: 1.5,
            }}
          >
            {message}
          </Typography>
        </Box>
      </Alert>
    </Snackbar>
  );
};

export default CustomNotification; 