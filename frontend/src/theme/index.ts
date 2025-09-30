import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb', // Professional Blue
      light: '#3b82f6',
      dark: '#1e40af',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#059669', // Professional Teal
      light: '#10b981',
      dark: '#047857',
      contrastText: '#ffffff',
    },
    success: {
      main: '#16a34a', // Professional Green
      light: '#22c55e',
      dark: '#15803d',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ca8a04', // Professional Amber
      light: '#eab308',
      dark: '#a16207',
      contrastText: '#ffffff',
    },
    error: {
      main: '#dc2626', // Professional Red
      light: '#ef4444',
      dark: '#b91c1c',
      contrastText: '#ffffff',
    },
    info: {
      main: '#0284c7', // Professional Sky Blue
      light: '#0ea5e9',
      dark: '#0369a1',
      contrastText: '#ffffff',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a', // Professional Dark
      secondary: '#475569', // Professional Gray
      disabled: '#94a3b8',
    },
    divider: '#e2e8f0', // Professional Light Gray
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.25rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 500,
      textTransform: 'uppercase',
      lineHeight: 1.5,
      letterSpacing: '0.1em',
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.12)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.16)',
            transition: 'box-shadow 0.2s ease-in-out',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
          },
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.12)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.16)',
            transform: 'translateY(-1px)',
            transition: 'all 0.2s ease-in-out',
          },
        },
        outlined: {
          borderColor: '#bdbdbd',
          background: '#ffffff',
          '&:hover': {
            borderColor: '#1976d2',
            background: '#f5f5f5',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.08)',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.25)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.35)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'rgba(37, 99, 235, 0.8)',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            '&.Mui-focused': {
              color: 'rgba(37, 99, 235, 0.8)',
            },
          },
          '& .MuiInputBase-input': {
            color: '#f3f4f6',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          background: 'rgba(255, 255, 255, 0.1)',
          color: '#f3f4f6',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.98)',
          color: '#1a1a1a',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.3)',
          color: '#e8eaed',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          color: '#e8eaed',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(79, 195, 247, 0.2)',
            color: '#4fc3f7',
            borderLeft: '3px solid #4fc3f7',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: 'rgba(79, 195, 247, 0.3)',
            },
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: '#f3f4f6',
        },
        h1: {
          color: '#f3f4f6',
        },
        h2: {
          color: '#f3f4f6',
        },
        h3: {
          color: '#f3f4f6',
        },
        h4: {
          color: '#f3f4f6',
        },
        h5: {
          color: '#f3f4f6',
        },
        h6: {
          color: '#f3f4f6',
        },
        body1: {
          color: '#d1d5db',
        },
        body2: {
          color: '#d1d5db',
        },
        caption: {
          color: '#9ca3af',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.1)',
          color: '#f3f4f6',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          color: '#f3f4f6',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        },
        head: {
          background: 'rgba(255, 255, 255, 0.1)',
          color: '#f3f4f6',
          fontWeight: 600,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: 'rgba(10, 10, 10, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: '#f3f4f6',
          '&:hover': {
            background: 'rgba(37, 99, 235, 0.2)',
          },
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          background: 'rgba(37, 99, 235, 0.8)',
          color: '#ffffff',
        },
      },
    },
  },
});

export default theme; 