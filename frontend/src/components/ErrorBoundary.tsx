/**
 * ErrorBoundary - Base error boundary component
 * Catches JavaScript errors anywhere in the child component tree
 * Logs error details and displays fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Paper,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  BugReport as BugIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { Translation } from 'react-i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  module?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    // Performance monitoring integration
    if (window.performance && window.performance.mark) {
      window.performance.mark('error-boundary-triggered');
    }

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to monitoring service (if available)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Integration point for error monitoring services like Sentry
    const errorReport = {
      message: error.message,
      stack: error.stack,
      module: this.props.module || 'unknown',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      componentStack: errorInfo.componentStack,
    };

    // Send to Sentry if available
    try {
      const { captureException } = require('../services/sentryService');
      captureException(error, {
        module: this.props.module || 'unknown',
        componentStack: errorInfo.componentStack,
        url: window.location.href,
      });
    } catch {
      // sentryService not available - no-op
    }
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleGoHome = () => {
    window.location.href = '/app/dashboard';
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Translation ns="common">
          {(t) => (
            <Box
              sx={{
                p: 3,
                maxWidth: 800,
                mx: 'auto',
                mt: 4,
              }}
            >
              <Paper elevation={2} sx={{ p: 4 }}>
                <Alert severity="error" sx={{ mb: 3 }}>
                  <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BugIcon />
                    {t('errors.somethingWentWrong')}
                  </AlertTitle>
                  {this.props.module && (
                    <Typography variant="body2" sx={{ mt: 1 }}
                      dangerouslySetInnerHTML={{
                        __html: t('errors.errorInModule', { module: this.props.module }),
                      }}
                    />
                  )}
                </Alert>

                <Typography variant="h6" gutterBottom>
                  {t('errors.unexpectedError')}
                </Typography>

                <Typography variant="body1" color="text.secondary" paragraph>
                  {t('errors.tryReload')}
                </Typography>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      {t('errors.devDetails')}
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        backgroundColor: 'grey.100',
                        p: 2,
                        borderRadius: 1,
                        overflow: 'auto',
                        fontSize: '0.875rem',
                        maxHeight: 200,
                      }}
                    >
                      {this.state.error.message}
                      {this.state.error.stack && (
                        <>
                          {'\n\nStack Trace:\n'}
                          {this.state.error.stack}
                        </>
                      )}
                    </Box>
                  </>
                )}

                <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={this.handleRetry}
                  >
                    {t('actions.tryAgain')}
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<HomeIcon />}
                    onClick={this.handleGoHome}
                  >
                    {t('actions.goHome')}
                  </Button>

                  <Button
                    variant="text"
                    onClick={this.handleReload}
                  >
                    {t('actions.reloadPage')}
                  </Button>
                </Box>
              </Paper>
            </Box>
          )}
        </Translation>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;