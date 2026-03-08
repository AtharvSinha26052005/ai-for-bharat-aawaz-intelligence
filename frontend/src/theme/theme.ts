import { createTheme } from '@mui/material/styles';

/**
 * Material-UI Theme Configuration for Rural Digital Rights AI Companion
 * 
 * "AI for Bharat" Theme - Inspired by Indian Flag Colors
 * - Primary: Saffron Orange (#FF9933) - Energy, courage, sacrifice
 * - Secondary: India Green (#138808) - Growth, prosperity, auspiciousness
 * - Accent: Navy Blue (#000080) - Truth, sky, ocean
 * - White (#FFFFFF) - Peace, purity, truth
 * 
 * This color scheme represents India's national identity and values
 */

export const theme = createTheme({
  palette: {
    primary: {
      main: '#FF9933', // Saffron Orange (Indian Flag)
      light: '#FFB366',
      dark: '#CC7A29',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#138808', // India Green (Indian Flag)
      light: '#4CAF50',
      dark: '#0D5E06',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#1565C0', // Navy Blue
      light: '#5E92F3',
      dark: '#003C8F',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#138808', // India Green
      light: '#4CAF50',
      dark: '#0D5E06',
    },
    warning: {
      main: '#FF9933', // Saffron Orange
      light: '#FFB366',
      dark: '#CC7A29',
    },
    error: {
      main: '#D32F2F',
      light: '#EF5350',
      dark: '#C62828',
    },
    background: {
      default: '#F8F9FA', // Very light gray
      paper: '#FFFFFF',
    },
    text: {
      primary: '#212121', // Almost black
      secondary: '#616161', // Medium gray
      disabled: '#9E9E9E',
    },
    divider: '#E0E0E0',
    action: {
      active: '#FF9933',
      hover: 'rgba(255, 153, 51, 0.08)',
      selected: 'rgba(255, 153, 51, 0.12)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", sans-serif',
    h1: {
      fontSize: '2.75rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.25,
      letterSpacing: '-0.00833em',
    },
    h3: {
      fontSize: '1.875rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '0em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.35,
      letterSpacing: '0.00735em',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0em',
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.45,
      letterSpacing: '0.0075em',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: '0.00938em',
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.57,
      letterSpacing: '0.00714em',
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: '0.00938em',
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: '0.01071em',
    },
    button: {
      fontSize: '0.9375rem',
      fontWeight: 500,
      lineHeight: 1.75,
      letterSpacing: '0.02857em',
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.66,
      letterSpacing: '0.03333em',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: 2.66,
      letterSpacing: '0.08333em',
      textTransform: 'uppercase',
    },
  },
  spacing: 8, // Base unit: 8px
  shape: {
    borderRadius: 12, // Modern rounded corners
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 4px 8px rgba(0, 0, 0, 0.08)',
    '0px 8px 16px rgba(0, 0, 0, 0.1)',
    '0px 12px 24px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.14)',
    '0px 20px 40px rgba(0, 0, 0, 0.16)',
    '0px 24px 48px rgba(0, 0, 0, 0.18)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#BDBDBD #F5F5F5',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#BDBDBD',
            minHeight: 24,
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#9E9E9E',
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            backgroundColor: '#F5F5F5',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0px 8px 24px rgba(255, 153, 51, 0.15)',
            borderColor: 'rgba(255, 153, 51, 0.2)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
        },
        elevation2: {
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
        },
        elevation3: {
          boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
          fontSize: '0.9375rem',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
          },
          '&:focus-visible': {
            outline: '3px solid rgba(255, 153, 51, 0.4)',
            outlineOffset: '2px',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.2)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #FF9933 0%, #FFB366 100%)',
          color: '#FFFFFF',
          fontWeight: 600,
          '&:hover': {
            background: 'linear-gradient(135deg, #CC7A29 0%, #FF9933 100%)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #138808 0%, #4CAF50 100%)',
          color: '#FFFFFF',
          fontWeight: 600,
          '&:hover': {
            background: 'linear-gradient(135deg, #0D5E06 0%, #138808 100%)',
          },
        },
        containedInfo: {
          background: 'linear-gradient(135deg, #1565C0 0%, #1976D2 100%)',
          color: '#FFFFFF',
          fontWeight: 600,
          '&:hover': {
            background: 'linear-gradient(135deg, #003C8F 0%, #1565C0 100%)',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
            backgroundColor: 'rgba(255, 153, 51, 0.04)',
          },
        },
        outlinedPrimary: {
          borderColor: '#FF9933',
          color: '#FF9933',
          '&:hover': {
            borderColor: '#CC7A29',
            backgroundColor: 'rgba(255, 153, 51, 0.08)',
          },
        },
        outlinedSecondary: {
          borderColor: '#138808',
          color: '#138808',
          '&:hover': {
            borderColor: '#0D5E06',
            backgroundColor: 'rgba(19, 136, 8, 0.08)',
          },
        },
        sizeSmall: {
          padding: '6px 16px',
          fontSize: '0.8125rem',
        },
        sizeLarge: {
          padding: '12px 32px',
          fontSize: '1rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#FFFFFF',
            transition: 'all 0.2s ease-in-out',
            '& fieldset': {
              borderColor: '#E0E0E0',
              borderWidth: 2,
            },
            '&:hover fieldset': {
              borderColor: '#BDBDBD',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#FF9933',
              borderWidth: 2,
            },
            '&.Mui-error fieldset': {
              borderColor: '#D32F2F',
            },
          },
          '& .MuiInputLabel-root': {
            fontWeight: 500,
            '&.Mui-focused': {
              color: '#FF9933',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          '&:focus-visible': {
            outline: '2px solid #FF9933',
            outlineOffset: '2px',
          },
        },
        filled: {
          backgroundColor: '#FFF3E0',
          color: '#CC7A29',
          '&:hover': {
            backgroundColor: '#FFE0B2',
          },
        },
        filledPrimary: {
          backgroundColor: '#FFF3E0',
          color: '#CC7A29',
        },
        filledSecondary: {
          backgroundColor: '#E8F5E9',
          color: '#0D5E06',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '12px 16px',
          fontSize: '0.9375rem',
        },
        standardInfo: {
          backgroundColor: '#E3F2FD',
          color: '#0D47A1',
          '& .MuiAlert-icon': {
            color: '#1565C0',
          },
        },
        standardSuccess: {
          backgroundColor: '#E8F5E9',
          color: '#1B5E20',
          '& .MuiAlert-icon': {
            color: '#138808',
          },
        },
        standardWarning: {
          backgroundColor: '#FFF3E0',
          color: '#E65100',
          '& .MuiAlert-icon': {
            color: '#FF9933',
          },
        },
        standardError: {
          backgroundColor: '#FFEBEE',
          color: '#B71C1C',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(255, 153, 51, 0.08)',
          },
          '&:focus-visible': {
            outline: '2px solid #FF9933',
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
          background: 'linear-gradient(135deg, #FF9933 0%, #FFB366 50%, #138808 100%)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          boxShadow: '4px 0px 12px rgba(0, 0, 0, 0.08)',
          background: '#FFFFFF',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          '&:hover': {
            backgroundColor: 'rgba(255, 153, 51, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 153, 51, 0.12)',
            '&:hover': {
              backgroundColor: 'rgba(255, 153, 51, 0.16)',
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.16)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.5rem',
          fontWeight: 600,
          padding: '24px 24px 16px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px 24px',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: '2px solid #E0E0E0',
        },
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
          background: 'linear-gradient(90deg, #FF9933 0%, #138808 100%)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.9375rem',
          minHeight: 48,
          '&.Mui-selected': {
            fontWeight: 600,
            color: '#FF9933',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 6,
        },
        bar: {
          borderRadius: 4,
          background: 'linear-gradient(90deg, #FF9933 0%, #138808 100%)',
        },
      },
    },
  },
});
