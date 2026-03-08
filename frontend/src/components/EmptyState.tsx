import React from 'react';
import { Box, Typography, Button } from '@mui/material';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * EmptyState Component
 * 
 * Displays helpful messages when no data is available.
 * Shows a centered icon, title, description, and optional action button.
 * 
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 8,
        px: 3,
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          mb: 3,
          color: 'text.secondary',
          '& > svg': {
            fontSize: '4rem',
          },
        }}
      >
        {icon}
      </Box>

      {/* Title */}
      <Typography
        variant="h5"
        component="h2"
        gutterBottom
        sx={{
          color: 'text.primary',
          fontWeight: 600,
          mb: 1,
        }}
      >
        {title}
      </Typography>

      {/* Description */}
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          mb: 3,
          maxWidth: 500,
        }}
      >
        {description}
      </Typography>

      {/* Optional Action Button */}
      {action && (
        <Button
          variant="contained"
          color="primary"
          onClick={action.onClick}
          sx={{
            mt: 1,
          }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
};
