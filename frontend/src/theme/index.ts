import { createTheme } from '@mui/material/styles';

// Fuente display para títulos (cargada en index.html). Da carácter a los
// encabezados sin alterar las métricas del cuerpo (Inter).
const displayFont = [
  '"Plus Jakarta Sans"',
  'Inter',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'sans-serif',
].join(',');

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4338ca', // Brand Indigo (premium)
      light: '#6366f1',
      dark: '#3730a3',
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
      fontSize: '2.5rem',
      fontWeight: 800,
      lineHeight: 1.15,
      letterSpacing: '-0.03em',
      fontFamily: displayFont,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.18,
      letterSpacing: '-0.03em',
      fontFamily: displayFont,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
      fontFamily: displayFont,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
      fontFamily: displayFont,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
      fontFamily: displayFont,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
      fontFamily: displayFont,
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
          border: '1px solid #e2e8f0',
          boxShadow:
            '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.12)',
          '&:hover': {
            boxShadow:
              '0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.16)',
            transition: 'box-shadow 0.2s ease-in-out',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow:
            '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 18px',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          transition:
            'transform .15s ease, box-shadow .2s ease, background-color .2s ease, border-color .2s ease',
          // Foco accesible (antes no había anillo de foco visible).
          '&.Mui-focusVisible': {
            outline: '2px solid rgba(67, 56, 202, 0.5)',
            outlineOffset: 2,
          },
        },
        // Las sombras/elevación SOLO en contained (antes un text button
        // también recibía drop-shadow en hover, lo cual se veía raro).
        contained: {
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.12)',
          '&:hover': {
            boxShadow: '0 6px 16px -4px rgba(67, 56, 202, 0.45)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.12)',
          },
        },
        outlined: {
          borderColor: '#cbd5e1',
          background: '#ffffff',
          '&:hover': {
            borderColor: '#4338ca',
            background: 'rgba(67, 56, 202, 0.04)',
          },
          '&:active': {
            background: 'rgba(67, 56, 202, 0.08)',
          },
        },
        text: {
          '&:hover': {
            background: 'rgba(67, 56, 202, 0.06)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
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
            // Acento de marca (índigo claro) sobre el sidebar navy.
            backgroundColor: 'rgba(99, 102, 241, 0.22)',
            color: '#a5b4fc',
            borderLeft: '3px solid #6366f1',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: 'rgba(99, 102, 241, 0.32)',
            },
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {},
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {},
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {},
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: '#f8fafc',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(67, 56, 202, 0.08)',
          },
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          background: 'rgba(67, 56, 202, 0.8)',
          color: '#ffffff',
        },
      },
    },
  },
});

export default theme;
