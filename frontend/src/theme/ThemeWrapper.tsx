import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, Alert, Box } from '@mui/material';
import { theme } from './theme';

interface ThemeWrapperProps {
  children: React.ReactNode;
}

/**
 * Theme Wrapper Component with Fallback Handling
 * 
 * Validates Requirement 13.5: Theme loading fallback to default Material-UI theme
 * 
 * This component wraps the application with a ThemeProvider and handles
 * theme loading failures by falling back to the default Material-UI theme.
 */
export const ThemeWrapper: React.FC<ThemeWrapperProps> = ({ children }) => {
  const [activeTheme, setActiveTheme] = useState(theme);
  const [themeError, setThemeError] = useState(false);

  useEffect(() => {
    try {
      // Validate theme configuration
      if (!theme || !theme.palette || !theme.typography) {
        throw new Error('Invalid theme configuration');
      }
      setActiveTheme(theme);
      setThemeError(false);
    } catch (error) {
      console.error('Theme loading failed, falling back to default theme:', error);
      // Fall back to default Material-UI theme
      setActiveTheme(createTheme());
      setThemeError(true);
    }
  }, []);

  return (
    <ThemeProvider theme={activeTheme}>
      {themeError && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
          <Alert severity="warning" onClose={() => setThemeError(false)}>
            Theme configuration failed to load. Using default theme.
          </Alert>
        </Box>
      )}
      {children}
    </ThemeProvider>
  );
};
