import React from 'react';
import { Box } from '@mui/material';
import { SchemeCard } from './SchemeCard';
import { SchemeRecommendation, Language } from '../types';

export interface SchemeCardGridProps {
  schemes: SchemeRecommendation[];
  onViewDetails: (scheme: SchemeRecommendation) => void;
  onApply: (schemeId: string) => void;
  language: Language;
}

/**
 * SchemeCardGrid Component
 * 
 * Displays schemes in a responsive grid layout:
 * - Single column on mobile (<600px)
 * - Two columns on tablet (600-960px)
 * - Three columns on desktop (>960px)
 * 
 * Uses CSS Grid for responsive layout with appropriate spacing.
 * 
 * Validates Requirements: 9.1, 9.2, 9.3, 9.6
 */
export const SchemeCardGrid: React.FC<SchemeCardGridProps> = ({
  schemes,
  onViewDetails,
  onApply,
  language,
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
        },
        gap: 3,
        mt: 0,
      }}
    >
      {schemes.map((scheme) => (
        <SchemeCard
          key={scheme.scheme.schemeId}
          scheme={scheme}
          onViewDetails={onViewDetails}
          onApply={onApply}
          language={language}
        />
      ))}
    </Box>
  );
};
