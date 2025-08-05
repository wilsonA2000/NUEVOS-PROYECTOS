/**
 * LoadingButton - Reusable button component with loading states
 * Provides consistent loading UX across the application
 */

import React from 'react';
import {
  Button,
  ButtonProps,
  CircularProgress,
  Box,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface LoadingButtonProps extends Omit<ButtonProps, 'disabled'> {
  loading?: boolean;
  loadingText?: string;
  loadingIndicator?: React.ReactNode;
  disableOnLoading?: boolean;
  fullWidth?: boolean;
}

const StyledButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'loading',
})<{ loading?: boolean }>(({ theme, loading }) => ({
  position: 'relative',
  transition: theme.transitions.create(['background-color', 'box-shadow', 'border-color'], {
    duration: theme.transitions.duration.short,
  }),
  
  // Prevent content jumping during loading
  minHeight: loading ? 'auto' : undefined,
  
  // Loading state styles
  ...(loading && {
    color: 'transparent',
    pointerEvents: 'none',
  }),
}));

const LoadingIndicator = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  color: 'inherit',
}));

const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  loadingIndicator,
  disableOnLoading = true,
  children,
  startIcon,
  endIcon,
  ...buttonProps
}) => {
  // Determine if button should be disabled
  const isDisabled = buttonProps.disabled || (disableOnLoading && loading);

  // Default loading indicator
  const defaultLoadingIndicator = (
    <>
      <CircularProgress
        size={16}
        thickness={4}
        color="inherit"
        sx={{ opacity: 0.8 }}
      />
      {loadingText && (
        <span style={{ fontSize: '0.875rem' }}>{loadingText}</span>
      )}
    </>
  );

  return (
    <StyledButton
      {...buttonProps}
      loading={loading}
      disabled={isDisabled}
      startIcon={loading ? null : startIcon}
      endIcon={loading ? null : endIcon}
    >
      {/* Original button content */}
      {children}
      
      {/* Loading overlay */}
      {loading && (
        <LoadingIndicator>
          {loadingIndicator || defaultLoadingIndicator}
        </LoadingIndicator>
      )}
    </StyledButton>
  );
};

// Predefined variants for common use cases
export const SaveButton: React.FC<Omit<LoadingButtonProps, 'variant' | 'color'>> = (props) => (
  <LoadingButton
    variant="contained"
    color="primary"
    loadingText="Guardando..."
    {...props}
  />
);

export const SubmitButton: React.FC<Omit<LoadingButtonProps, 'variant' | 'color' | 'type'>> = (props) => (
  <LoadingButton
    variant="contained"
    color="primary"
    type="submit"
    loadingText="Enviando..."
    {...props}
  />
);

export const DeleteButton: React.FC<Omit<LoadingButtonProps, 'variant' | 'color'>> = (props) => (
  <LoadingButton
    variant="outlined"
    color="error"
    loadingText="Eliminando..."
    {...props}
  />
);

export const CancelButton: React.FC<Omit<LoadingButtonProps, 'variant' | 'color'>> = (props) => (
  <LoadingButton
    variant="text"
    color="secondary"
    disableOnLoading={false}
    {...props}
  />
);

export const RefreshButton: React.FC<Omit<LoadingButtonProps, 'variant'>> = (props) => (
  <LoadingButton
    variant="outlined"
    loadingText="Actualizando..."
    {...props}
  />
);

// Hook for managing button loading states
export const useLoadingButton = (initialLoading = false) => {
  const [loading, setLoading] = React.useState(initialLoading);

  const startLoading = React.useCallback(() => setLoading(true), []);
  const stopLoading = React.useCallback(() => setLoading(false), []);
  
  const withLoading = React.useCallback(async (asyncFn: () => Promise<any>) => {
    try {
      setLoading(true);
      await asyncFn();
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    startLoading,
    stopLoading,
    withLoading,
  };
};

export default LoadingButton;