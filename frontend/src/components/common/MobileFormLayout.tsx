/**
 * MobileFormLayout - Responsive layout component for forms
 * Optimizes form layouts for mobile devices with touch-friendly interactions
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  Fab,
  Slide,
  alpha,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

interface MobileFormLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onSave?: () => void;
  onClose?: () => void;
  isLoading?: boolean;
  showSaveButton?: boolean;
  saveButtonText?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
}

const MobileFormLayout: React.FC<MobileFormLayoutProps> = ({
  title,
  subtitle,
  children,
  onBack,
  onSave,
  onClose,
  isLoading = false,
  showSaveButton = true,
  saveButtonText = 'Guardar',
  collapsible = false,
  defaultExpanded = true,
  icon,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const [isScrolled, setIsScrolled] = React.useState(false);

  // Track scroll position for header styling
  React.useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  const handleToggleExpanded = () => {
    setExpanded(!expanded);
  };

  if (isMobile) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Mobile Header - Sticky */}
        <Paper
          elevation={isScrolled ? 2 : 0}
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1100,
            borderRadius: 0,
            borderBottom: isScrolled ? `1px solid ${theme.palette.divider}` : 'none',
            transition: 'all 0.2s ease-in-out',
            bgcolor: isScrolled 
              ? alpha(theme.palette.background.paper, 0.95) 
              : 'background.paper',
            backdropFilter: isScrolled ? 'blur(10px)' : 'none',
          }}
        >
          <Box
            display="flex"
            alignItems="center"
            p={2}
            gap={1}
          >
            {onBack && (
              <IconButton
                onClick={onBack}
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                  '&:active': { transform: 'scale(0.95)' },
                }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            )}

            {icon && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                }}
              >
                {icon}
              </Box>
            )}

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                fontWeight="bold"
                sx={{
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: '0.75rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>

            {collapsible && (
              <IconButton
                onClick={handleToggleExpanded}
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.action.active, 0.04),
                  '&:hover': { bgcolor: alpha(theme.palette.action.active, 0.08) },
                }}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}

            {onClose && (
              <IconButton
                onClick={onClose}
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) },
                  color: theme.palette.error.main,
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Paper>

        {/* Mobile Content */}
        <Slide direction="up" in={expanded} mountOnEnter unmountOnExit>
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              pb: showSaveButton ? { xs: 10, sm: 12 } : { xs: 2, sm: 3 },
              maxWidth: '100%',
              overflow: 'hidden',
            }}
          >
            {children}
          </Box>
        </Slide>

        {/* Mobile Floating Save Button */}
        {showSaveButton && expanded && (
          <Fab
            onClick={onSave}
            disabled={isLoading}
            size={isSmallMobile ? "medium" : "large"}
            sx={{
              position: 'fixed',
              bottom: { xs: 16, sm: 24 },
              right: { xs: 16, sm: 24 },
              zIndex: 1200,
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              boxShadow: theme.shadows[8],
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
                transform: 'scale(1.05)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
              '&.Mui-disabled': {
                bgcolor: alpha(theme.palette.action.disabled, 0.12),
                color: theme.palette.action.disabled,
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <SaveIcon />
          </Fab>
        )}

        {/* Loading Overlay for Mobile */}
        {isLoading && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: alpha(theme.palette.background.default, 0.8),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1300,
              backdropFilter: 'blur(2px)',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body1" fontWeight="medium">
                Guardando...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Por favor espera
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    );
  }

  // Desktop/Tablet Layout
  return (
    <Paper
      sx={{
        maxWidth: isTablet ? '100%' : 800,
        mx: 'auto',
        mt: { xs: 1, sm: 2, md: 3 },
        mb: { xs: 2, sm: 3, md: 4 },
        overflow: 'hidden',
        borderRadius: { xs: 1, sm: 2 },
      }}
    >
      {/* Desktop Header */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          bgcolor: alpha(theme.palette.primary.main, 0.04),
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          {onBack && (
            <IconButton
              onClick={onBack}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}

          {icon && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 1,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
              }}
            >
              {icon}
            </Box>
          )}

          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body1" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>

          {onClose && (
            <IconButton
              onClick={onClose}
              sx={{
                bgcolor: alpha(theme.palette.error.main, 0.1),
                '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) },
                color: theme.palette.error.main,
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      <Divider />

      {/* Desktop Content */}
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        {children}
      </Box>

      {/* Desktop Save Button */}
      {showSaveButton && (
        <>
          <Divider />
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 2,
              bgcolor: alpha(theme.palette.background.default, 0.5),
            }}
          >
            <IconButton
              onClick={onSave}
              disabled={isLoading}
              size="large"
              sx={{
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                '&:hover': {
                  bgcolor: theme.palette.primary.dark,
                },
                '&.Mui-disabled': {
                  bgcolor: alpha(theme.palette.action.disabled, 0.12),
                  color: theme.palette.action.disabled,
                },
                px: 3,
                borderRadius: 2,
              }}
            >
              <SaveIcon sx={{ mr: 1 }} />
              <Typography variant="button" fontWeight="medium">
                {saveButtonText}
              </Typography>
            </IconButton>
          </Box>
        </>
      )}
    </Paper>
  );
};

export default MobileFormLayout;